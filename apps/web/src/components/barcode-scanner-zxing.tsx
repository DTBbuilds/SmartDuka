"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
} from "@smartduka/ui";
import { X, Camera, AlertCircle, CheckCircle, Zap, RefreshCw, Flashlight, RotateCcw } from "lucide-react";
import { playSuccessBeep, playErrorBeep } from "@/lib/audio-utils";
import { getCameraPermissionInstructions } from "@/hooks/use-camera-permission";
import { checkCameraSupport } from "@/lib/camera-polyfill";

interface BarcodeScannerZXingProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

type ScanMode = "camera" | "hardware" | "manual";
type ScanStatus = "idle" | "initializing" | "ready" | "detecting" | "success" | "error";

// ── Stable helpers (outside component, no re-creation) ────────────────

/** Detect platform once (stable across renders) */
function detectPlatform() {
  if (typeof navigator === "undefined") return { isIOS: false, isAndroid: false, isMobile: false };
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  return { isIOS, isAndroid, isMobile: isIOS || isAndroid };
}

/** Check camera prerequisites WITHOUT calling getUserMedia */
function checkCameraPrereqs(): { ok: boolean; error?: string } {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return { ok: false, error: "INSECURE_CONTEXT: Camera requires HTTPS. Please access via https:// or localhost." };
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, error: "MEDIA_DEVICES_UNAVAILABLE: Camera API not available. Use a modern browser (Chrome, Firefox, Safari, Edge)." };
  }
  return { ok: true };
}

/** Extract error details from various error types */
function extractErrorDetails(err: any): { name: string; message: string } {
  if (!err) return { name: "Unknown", message: "Unknown error" };
  if (typeof err === "string") return { name: "Error", message: err };

  const name = err.name || err.constructor?.name || "Error";
  let message = err.message || "";
  if (!message && err.constraintName) message = `Constraint failed: ${err.constraintName}`;
  if (!message && err.constraint) message = `Constraint failed: ${err.constraint}`;
  if (!message && err.error) {
    const nested = extractErrorDetails(err.error);
    message = nested.message;
  }
  if (!message) {
    try { message = String(err); } catch { message = "Unknown error occurred"; }
  }
  return { name, message };
}

/** Map error details to a user-friendly message */
function getUserFriendlyError(details: { name: string; message: string }): string {
  if (details.message.includes("INSECURE_CONTEXT")) {
    return "Camera requires HTTPS. Please access via https:// or localhost for development.";
  }
  if (details.message.includes("MEDIA_DEVICES_UNAVAILABLE")) {
    return "Camera API not available. Use a modern browser (Chrome, Firefox, Safari, Edge).";
  }
  if (details.name === "NotAllowedError" || details.name === "PermissionDeniedError") {
    return "Camera permission denied. Enable camera in your browser's site settings, then reload the page and try again.";
  }
  if (details.name === "NotFoundError") return "No camera found. Use hardware scanner or manual entry.";
  if (details.name === "NotReadableError" || details.name === "TrackStartError") {
    return "Camera is in use by another app. Close other apps and try again.";
  }
  if (details.name === "OverconstrainedError") return "Camera constraints not satisfied. Try switching cameras.";
  if (details.name === "AbortError") return "Camera initialization canceled. Please try again.";
  if (details.name === "SecurityError") return "Camera blocked by security policy. Check browser permissions.";
  if (details.message.includes("TIMEOUT")) return "Camera took too long to start. Try again or use manual entry.";
  if (details.message.includes("ZXING_DECODE_FAILED")) {
    const actual = details.message.replace("ZXING_DECODE_FAILED: ", "");
    return `Scanner failed to start: ${actual}. Try refreshing the page.`;
  }
  return `Camera error: ${details.message}. Try closing other apps or use manual entry.`;
}

/** Get diagnostics info for the camera unavailable UI */
function getCameraDiagnostics() {
  const support = checkCameraSupport();
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return {
    protocol: support.protocol,
    hasMediaDevices: support.hasMediaDevices,
    hasGetUserMedia: support.hasGetUserMedia,
    hasLegacyGetUserMedia: support.hasLegacyGetUserMedia,
    isSecureContext: support.isSecureContext,
    isIOS: /iPad|iPhone|iPod/.test(ua),
    isAndroid: /Android/.test(ua),
    browserInfo: support.browserInfo,
    recommendations: support.recommendations,
  };
}

const PLATFORM = typeof navigator !== "undefined" ? detectPlatform() : { isIOS: false, isAndroid: false, isMobile: false };

/**
 * Unified Barcode Scanner using ZXing-JS Browser
 *
 * Architecture (rebuilt for reliability):
 * - ZXing library is PRE-LOADED on mount so dynamic import never consumes user gesture time
 * - All callback-captured values use REFS to eliminate stale closure bugs
 * - Single init/cleanup effect with minimal deps [isOpen, scanMode]
 * - Camera init (initCamera) is called synchronously from button click handlers
 *   to preserve the user gesture context that mobile browsers require
 * - Proper cancellation via initCancelledRef prevents race conditions
 */
export function BarcodeScannerZXing({
  isOpen,
  onClose,
  onScan,
}: BarcodeScannerZXingProps) {
  // ── Refs (no re-renders, no stale closures) ─────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<any>(null);
  const scanControlsRef = useRef<any>(null);
  const zxingModuleRef = useRef<any>(null);       // Pre-loaded ZXing module
  const streamRef = useRef<MediaStream | null>(null); // We own the stream (not ZXing)
  const barcodeBufferRef = useRef("");
  const hardwareTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Guard refs — used inside callbacks to avoid stale closure on state
  const isInitializingRef = useRef(false);
  const scanCompletedRef = useRef(false);
  const cameraReleasingRef = useRef(false);
  const initCancelledRef = useRef(false);          // Cancel in-flight async init
  const lastScannedBarcodeRef = useRef<string>(""); // REF not state — avoids initCamera re-creation
  const isProcessingRef = useRef(false);            // REF not state — avoids stale closure
  const retryCountRef = useRef(0);                  // REF not state — avoids initCamera re-creation

  // ── State (for UI rendering only) ───────────────────────────────────
  const [scanMode, setScanMode] = useState<ScanMode>("camera");
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [manualBarcode, setManualBarcode] = useState("");
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPermissionRequest, setShowPermissionRequest] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const MAX_RETRIES = 2;

  // ── Pre-load ZXing library on mount ─────────────────────────────────
  // This ensures the dynamic import is cached BEFORE the user taps "Start Camera",
  // so getUserMedia is reached while the user gesture is still valid.
  useEffect(() => {
    let cancelled = false;
    import("@zxing/browser").then(mod => {
      if (!cancelled) {
        zxingModuleRef.current = mod;
        console.log("[Scanner] ZXing library pre-loaded");
      }
    }).catch(err => {
      console.warn("[Scanner] ZXing pre-load failed (will retry on init):", err);
    });
    return () => { cancelled = true; };
  }, []);

  // ── Cleanup camera ──────────────────────────────────────────────────
  const cleanupCamera = useCallback(() => {
    console.log("[Scanner] cleanupCamera called");
    isInitializingRef.current = false;
    initCancelledRef.current = true; // Cancel any in-flight init

    cameraReleasingRef.current = true;

    // Stop ZXing scanner controls
    if (scanControlsRef.current) {
      try {
        scanControlsRef.current.stop();
        console.log("[Scanner] ✅ ZXing scanner stopped");
      } catch (err) {
        console.warn("[Scanner] Error stopping scanner:", err);
      }
      scanControlsRef.current = null;
    }

    // Stop the stream we own via streamRef (primary)
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`[Scanner] ✅ Stopped track: ${track.kind}`);
        });
        streamRef.current = null;
      } catch (err) {
        console.warn("[Scanner] Error stopping streamRef:", err);
      }
    }

    // Also stop video element srcObject as fallback
    if (videoRef.current?.srcObject instanceof MediaStream) {
      try {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach(track => {
          track.stop();
        });
        videoRef.current.srcObject = null;
      } catch (err) {
        console.warn("[Scanner] Error stopping video stream:", err);
      }
    }

    codeReaderRef.current = null;

    // Mobile browsers need extra time to fully release camera hardware
    setTimeout(() => {
      cameraReleasingRef.current = false;
    }, 500);
  }, []);

  // ── Handle barcode detected ─────────────────────────────────────────
  const handleBarcodeDetected = useCallback(
    async (barcode: string) => {
      // Use REFS for guards — immune to stale closures
      if (isProcessingRef.current || scanCompletedRef.current) return;

      isProcessingRef.current = true;
      scanCompletedRef.current = true;
      setIsProcessing(true);
      setScanStatus("detecting");
      setMessage(`✅ Barcode detected: ${barcode}`);

      try {
        await playSuccessBeep();
        if (navigator.vibrate) navigator.vibrate(100);

        cleanupCamera();

        setScanStatus("success");
        setMessage("✓ Barcode scanned successfully!");

        setTimeout(() => {
          onScan(barcode);
          onClose();
        }, 500);
      } catch (err) {
        console.error("[Scanner] Barcode processing error:", err);
        await playErrorBeep();
        setError("Error processing barcode. Please try again.");
        setScanStatus("error");
        scanCompletedRef.current = false; // Allow retry
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    },
    [cleanupCamera, onScan, onClose]
  );

  // ── Core camera init ────────────────────────────────────────────────
  // ARCHITECTURE: We call getUserMedia() DIRECTLY — not through ZXing.
  // Then pass the stream to ZXing's decodeFromStream().
  // This ensures getUserMedia is the FIRST async call (preserves user gesture on mobile)
  // and gives us full control over error handling.
  //
  // isAutoInit: true when called from the useEffect (desktop auto-init, no user gesture).
  //   On NotAllowedError, silently shows "Start Camera" button instead of error.
  const initCamera = useCallback(async (deviceIdOverride?: string, isAutoInit: boolean = false) => {
    if (isInitializingRef.current) {
      console.log("[Scanner] initCamera: Already initializing, skipping");
      return;
    }

    isInitializingRef.current = true;
    initCancelledRef.current = false;
    console.log("[Scanner] initCamera: Starting...", { deviceIdOverride, isAutoInit });

    try {
      setScanStatus("initializing");
      setError(null);
      setPermissionDenied(false);
      setCameraUnavailable(false);
      setMessage("🔄 Initializing camera...");

      // Wait for any previous camera release
      if (cameraReleasingRef.current) {
        console.log("[Scanner] Waiting for previous camera release...");
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Check prerequisites (no getUserMedia call — instant)
      const prereqs = checkCameraPrereqs();
      if (!prereqs.ok) throw new Error(prereqs.error!);

      if (initCancelledRef.current) { isInitializingRef.current = false; return; }

      // ── STEP 1: Call getUserMedia DIRECTLY ──────────────────────────
      // This is the FIRST async call — preserves user gesture context.
      // We own the stream; ZXing only does barcode decoding.
      let videoConstraints: MediaTrackConstraints;
      const deviceId = deviceIdOverride || undefined;

      if (PLATFORM.isMobile) {
        videoConstraints = {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        } as MediaTrackConstraints;
        (videoConstraints as any).focusMode = "continuous";
        console.log("[Scanner] Mobile constraints with continuous focus");
      } else {
        videoConstraints = {
          deviceId: deviceId ? { ideal: deviceId } : undefined,
          facingMode: deviceId ? undefined : { ideal: "environment" },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        };
      }

      console.log("[Scanner] Calling getUserMedia directly:", JSON.stringify(videoConstraints));
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
        console.log("[Scanner] ✅ getUserMedia succeeded —", stream.getVideoTracks().length, "video track(s)");
      } catch (mediaErr: any) {
        // OverconstrainedError: retry with minimal constraints
        if (mediaErr.name === "OverconstrainedError") {
          console.warn("[Scanner] OverconstrainedError — retrying with minimal constraints");
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            console.log("[Scanner] ✅ Fallback getUserMedia succeeded");
          } catch (fallbackErr: any) {
            // If fallback also fails, try bare minimum
            try {
              stream = await navigator.mediaDevices.getUserMedia({ video: true });
              console.log("[Scanner] ✅ Bare minimum getUserMedia succeeded");
            } catch (bareErr) {
              throw fallbackErr; // throw the more specific error
            }
          }
        } else if (isAutoInit && (mediaErr.name === "NotAllowedError" || mediaErr.name === "PermissionDeniedError")) {
          // Auto-init (no user gesture): permission not granted → silently show button
          console.log("[Scanner] Auto-init: getUserMedia denied (no user gesture) — showing Start Camera button");
          setShowPermissionRequest(true);
          setScanStatus("idle");
          setMessage("");
          isInitializingRef.current = false;
          return;
        } else {
          throw mediaErr; // will be caught by outer catch
        }
      }

      // Store stream ref so cleanup can stop it
      streamRef.current = stream;

      if (initCancelledRef.current) {
        // Dialog closed while we were getting the stream — stop it
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        isInitializingRef.current = false;
        return;
      }

      // ── STEP 2: Attach stream to video element ─────────────────────
      if (!videoRef.current) {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        throw new Error("Video element not available");
      }

      videoRef.current.srcObject = stream;
      // Explicitly play (some mobile browsers need this)
      try { await videoRef.current.play(); } catch (playErr: any) {
        if (playErr.name !== "AbortError") console.warn("[Scanner] Video play() warning:", playErr.message);
      }

      if (initCancelledRef.current) {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        isInitializingRef.current = false;
        return;
      }

      // ── STEP 3: Get ZXing module (pre-loaded, so instant) ──────────
      let zxingModule = zxingModuleRef.current;
      if (!zxingModule) {
        console.log("[Scanner] ZXing not pre-loaded, importing now...");
        zxingModule = await import("@zxing/browser");
        zxingModuleRef.current = zxingModule;
      }

      if (initCancelledRef.current) {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        isInitializingRef.current = false;
        return;
      }

      const { BrowserMultiFormatReader } = zxingModule;
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      // Desktop: enumerate devices for camera switch UI (stream already obtained)
      if (!PLATFORM.isMobile && !deviceIdOverride) {
        try {
          const devices = await BrowserMultiFormatReader.listVideoInputDevices();
          if (devices.length > 0) {
            setCameraDevices(devices);
            const currentTrack = stream.getVideoTracks()[0];
            const currentDeviceId = currentTrack?.getSettings()?.deviceId;
            if (currentDeviceId) setSelectedDeviceId(currentDeviceId);
          }
        } catch (enumErr) {
          console.warn("[Scanner] Device enumeration failed:", enumErr);
        }
      }

      // ── STEP 4: Pass stream to ZXing for barcode decoding ──────────
      // decodeFromStream does NOT call getUserMedia — it uses our stream.
      let controls: any = null;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      try {
        const decodePromise = codeReader.decodeFromStream(
          stream,
          videoRef.current,
          (result: any, _decodeError: any) => {
            // Use REFS — immune to stale closures
            if (scanCompletedRef.current || initCancelledRef.current) return;
            if (result) {
              const barcode = result.getText();
              console.log("[Scanner] Barcode detected:", barcode);
              if (barcode !== lastScannedBarcodeRef.current) {
                lastScannedBarcodeRef.current = barcode;
                handleBarcodeDetected(barcode);
              }
            }
          }
        );

        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error("TIMEOUT: ZXing decode setup took too long"));
          }, 10000);
        });

        controls = await Promise.race([decodePromise, timeoutPromise]);
        if (timeoutId) clearTimeout(timeoutId);
        console.log("[Scanner] ✅ ZXing decodeFromStream started");

      } catch (decodeErr: any) {
        if (timeoutId) clearTimeout(timeoutId);

        if (decodeErr.message?.includes("TIMEOUT")) {
          console.error("[Scanner] ZXing decode setup timed out, cleaning up...");
          try { codeReader.stopContinuousDecode?.(); } catch {}
        }

        // Stream is still running — stop it on decode failure
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;

        throw new Error(`ZXING_DECODE_FAILED: ${decodeErr.name || "Unknown"} - ${decodeErr.message || "Failed to start"}`);
      }

      if (initCancelledRef.current) {
        try { controls?.stop(); } catch {}
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        isInitializingRef.current = false;
        return;
      }

      scanControlsRef.current = controls;

      // Check torch support
      try {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities = videoTrack.getCapabilities?.() as any;
          if (capabilities?.torch) setTorchSupported(true);
        }
      } catch {}

      setScanStatus("ready");
      setMessage("✓ Scanner ready - Point at barcode");
      retryCountRef.current = 0;
      isInitializingRef.current = false;
      console.log("[Scanner] ✅ Camera initialized successfully");

    } catch (err: any) {
      isInitializingRef.current = false;
      if (initCancelledRef.current) return;

      const details = extractErrorDetails(err);

      // NotAllowedError from user-initiated action → show denied UI (not a console.error)
      if (details.name === "NotAllowedError" || details.name === "PermissionDeniedError") {
        console.warn("[Scanner] Camera permission denied:", details.message);
        setScanStatus("error");
        setError(getUserFriendlyError(details));
        setPermissionDenied(true);
        return;
      }

      console.error("[Scanner] Camera init error:", details.name, details.message, err);

      // Transient error retry (NotReadableError, AbortError)
      const isTransient = details.name === "NotReadableError" || details.name === "AbortError";
      if (isTransient && retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        const delay = 1000 + (retryCountRef.current * 500);
        console.log(`[Scanner] Retrying in ${delay}ms (${retryCountRef.current}/${MAX_RETRIES})...`);
        setMessage(`📷 Camera busy, retrying in ${delay / 1000}s...`);
        setTimeout(() => initCamera(deviceIdOverride, false), delay);
        return;
      }

      // Final error state
      setScanStatus("error");
      setError(getUserFriendlyError(details));

      // Don't auto-switch to hardware on permission denied — let user retry
      if (details.name !== "NotAllowedError" && details.name !== "PermissionDeniedError") {
        setScanMode("hardware");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleBarcodeDetected, cleanupCamera]);
  // Deps: only stable callbacks. No state deps → no re-creation → no effect re-triggers.

  /**
   * Handle hardware scanner (keyboard input)
   */
  useEffect(() => {
    if (!isOpen || scanMode !== "hardware") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target === manualInputRef.current) return;

      if (e.key === "Enter" && barcodeBufferRef.current.length > 0) {
        e.preventDefault();
        const barcode = barcodeBufferRef.current.trim();
        barcodeBufferRef.current = "";
        if (barcode.length >= 5) handleBarcodeDetected(barcode);
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        barcodeBufferRef.current += e.key;
        if (hardwareTimeoutRef.current) clearTimeout(hardwareTimeoutRef.current);
        hardwareTimeoutRef.current = setTimeout(() => { barcodeBufferRef.current = ""; }, 100);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (hardwareTimeoutRef.current) clearTimeout(hardwareTimeoutRef.current);
    };
  }, [isOpen, scanMode, handleBarcodeDetected]);

  /**
   * Handle manual barcode entry
   */
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    await handleBarcodeDetected(manualBarcode.trim());
    setManualBarcode("");
  };

  /**
   * SINGLE init/cleanup effect — depends ONLY on [isOpen, scanMode].
   * No permission-state dependencies → no cascading re-runs.
   * On mobile: always shows "Start Camera" button (user gesture required).
   * On desktop: checks Permissions API (no getUserMedia!) then auto-inits if granted.
   */
  useEffect(() => {
    if (!isOpen || scanMode !== "camera") return;

    // Reset for new session
    scanCompletedRef.current = false;
    lastScannedBarcodeRef.current = "";
    retryCountRef.current = 0;
    initCancelledRef.current = false;

    // Check basic prerequisites first (no getUserMedia, instant)
    const prereqs = checkCameraPrereqs();
    if (!prereqs.ok) {
      setCameraUnavailable(true);
      setUnavailableReason(prereqs.error || "Camera not available.");
      setScanStatus("error");
      setError(prereqs.error || "Camera not available.");
      return;
    }

    if (PLATFORM.isMobile) {
      // MOBILE: Always require user gesture — show "Start Camera" button.
      // This is the ONLY reliable way to get camera access on mobile browsers.
      console.log("[Scanner] Mobile detected — requiring user gesture");
      setShowPermissionRequest(true);
      setScanStatus("idle");
      setMessage("");
    } else {
      // DESKTOP: Check permission via Permissions API (no getUserMedia call).
      // If already granted → auto-init. Otherwise → show "Start Camera" button.
      // IMPORTANT: Never trust "denied" alone — the user may have changed site settings.
      // Only getUserMedia can definitively determine if camera access is allowed.
      const autoInit = async () => {
        try {
          if (navigator.permissions?.query) {
            const result = await navigator.permissions.query({ name: "camera" as PermissionName });
            console.log("[Scanner] Desktop: Permissions API state:", result.state);
            if (result.state === "granted") {
              console.log("[Scanner] Desktop: Permission granted, auto-initializing");
              initCamera(undefined, true); // isAutoInit=true: no user gesture
              return;
            }
            // For "denied" AND "prompt": show "Start Camera" button.
            // Don't preemptively show "Camera Access Denied" — let getUserMedia
            // determine the real state. The user may have just changed site settings.
          }
        } catch {
          // Permissions API not available (Safari) — show button
        }
        // Always show start button — let user trigger getUserMedia with their click
        setShowPermissionRequest(true);
        setScanStatus("idle");
      };
      autoInit();
    }

    // Cleanup when dialog closes or mode changes away from camera
    return () => {
      console.log("[Scanner] Effect cleanup — stopping camera");
      cleanupCamera();
      setShowPermissionRequest(false);
      setPermissionDenied(false);
      setCameraUnavailable(false);
    };
  // initCamera and cleanupCamera are stable useCallbacks — safe to include.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, scanMode]);

  /**
   * Focus manual input when in manual mode
   */
  useEffect(() => {
    if (isOpen && scanMode === "manual" && manualInputRef.current) {
      setTimeout(() => manualInputRef.current?.focus(), 100);
    }
  }, [isOpen, scanMode]);

  // ── Handlers ────────────────────────────────────────────────────────

  const handleClose = () => {
    console.log("[Scanner] handleClose called");
    cleanupCamera();
    setScanMode("camera");
    setScanStatus("idle");
    setError(null);
    setMessage("");
    setManualBarcode("");
    setIsProcessing(false);
    isProcessingRef.current = false;
    setTorchEnabled(false);
    setTorchSupported(false);
    setShowPermissionRequest(false);
    setPermissionDenied(false);
    setCameraUnavailable(false);
    scanCompletedRef.current = false;
    lastScannedBarcodeRef.current = "";
    retryCountRef.current = 0;
    onClose();
  };

  const switchMode = (mode: ScanMode) => {
    console.log("[Scanner] switchMode:", mode);
    cleanupCamera();
    setScanMode(mode);
    setScanStatus("idle");
    setError(null);
    setMessage("");
    setShowPermissionRequest(false);
    setPermissionDenied(false);
    setCameraUnavailable(false);
    scanCompletedRef.current = false;
    lastScannedBarcodeRef.current = "";
    retryCountRef.current = 0;
  };

  /** Called from "Start Camera" button — has user gesture, NO async delays before init */
  const handleStartCamera = () => {
    setShowPermissionRequest(false);
    setError(null);
    setPermissionDenied(false);
    // CRITICAL: Call initCamera synchronously from user gesture — no await, no setTimeout.
    // This preserves the user gesture context that mobile browsers require for getUserMedia.
    initCamera();
  };

  /** Called from "Retry" button — has user gesture */
  const handleRetryCamera = () => {
    setError(null);
    setPermissionDenied(false);
    retryCountRef.current = 0;
    initCamera();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md sm:max-w-lg p-4">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-4 w-4" />
            <span>Scan Barcode</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {scanMode === "camera" && "Point camera at barcode to scan automatically"}
            {scanMode === "hardware" && "Use your barcode scanner or switch to camera/manual"}
            {scanMode === "manual" && "Type or paste barcode below"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Selector */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => switchMode("camera")}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                scanMode === "camera"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              📷 Camera
            </button>
            <button
              onClick={() => switchMode("hardware")}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                scanMode === "hardware"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              🔌 Hardware
            </button>
            <button
              onClick={() => switchMode("manual")}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                scanMode === "manual"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              ✏️ Manual
            </button>
          </div>

          {/* Status Messages */}
          {scanStatus === "initializing" && (
            <div className="text-center text-sm text-blue-600 dark:text-blue-400 py-2 flex items-center justify-center gap-2">
              <Zap className="h-4 w-4 animate-pulse" />
              <span>Initializing camera...</span>
            </div>
          )}

          {message && scanStatus !== "error" && (
            <div className="rounded-md border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400 flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Camera View */}
          {scanMode === "camera" && (
            <div
              className="relative w-full bg-black rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
              style={{ minHeight: "300px" }}
            >
              {/* Camera Unavailable UI */}
              {cameraUnavailable ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 p-6 text-center">
                  <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">Camera Not Available</h3>
                  <p className="text-gray-300 text-sm mb-4 max-w-xs">
                    {unavailableReason || 'Camera access is not available on this device or browser.'}
                  </p>
                  
                  <div className="space-y-3 w-full max-w-xs">
                    {/* Diagnostics info for debugging */}
                    {(() => {
                      const diag = getCameraDiagnostics();
                      return (
                        <div className="bg-gray-800 rounded-lg p-3 text-left text-xs">
                          <p className="text-gray-400 mb-2 font-medium">Diagnostics:</p>
                          <div className="space-y-1 text-gray-500">
                            <p>• HTTPS: {diag.protocol === 'https:' ? '✓' : '✗'} ({diag.protocol})</p>
                            <p>• MediaDevices API: {diag.hasMediaDevices ? '✓' : '✗'}</p>
                            <p>• getUserMedia: {diag.hasGetUserMedia ? '✓' : '✗'}</p>
                            <p>• Legacy getUserMedia: {diag.hasLegacyGetUserMedia ? '✓' : '✗'}</p>
                            <p>• Secure Context: {diag.isSecureContext ? '✓' : '✗'}</p>
                            <p>• Platform: {diag.isIOS ? 'iOS' : diag.isAndroid ? 'Android' : 'Desktop'}</p>
                            <p>• Browser: {diag.browserInfo?.browser || 'Unknown'} {diag.browserInfo?.version || ''}</p>
                          </div>
                          {diag.recommendations && diag.recommendations.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-700">
                              <p className="text-yellow-400 font-medium mb-1">Recommendations:</p>
                              {diag.recommendations.map((rec: string, i: number) => (
                                <p key={i} className="text-yellow-300/80">• {rec}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    
                    <Button
                      className="w-full"
                      onClick={() => {
                        // Retry camera — user gesture preserved (no async before initCamera)
                        handleRetryCamera();
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry Camera Access
                    </Button>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-gray-300 border-gray-600"
                        onClick={() => switchMode("hardware")}
                      >
                        Hardware Scanner
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-gray-300 border-gray-600"
                        onClick={() => switchMode("manual")}
                      >
                        Manual Entry
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (showPermissionRequest || permissionDenied) && scanStatus !== "initializing" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 p-6 text-center">
                  <div className="h-16 w-16 rounded-full bg-orange-500/20 flex items-center justify-center mb-4">
                    <Camera className="h-8 w-8 text-orange-500" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">
                    {permissionDenied ? 'Camera Access Denied' : 'Camera Permission Required'}
                  </h3>
                  <p className="text-gray-300 text-sm mb-4 max-w-xs">
                    {permissionDenied 
                      ? 'Please enable camera access in your browser settings to scan barcodes.'
                      : 'Allow camera access to scan barcodes with your device camera.'}
                  </p>
                  
                  {permissionDenied ? (
                    <div className="space-y-3 w-full max-w-xs">
                      <div className="bg-gray-800 rounded-lg p-3 text-left">
                        <p className="text-xs text-gray-400 mb-1">How to enable:</p>
                        <p className="text-xs text-gray-300">{getCameraPermissionInstructions()}</p>
                        <p className="text-xs text-yellow-400 mt-2">After changing settings, reload the page and try again.</p>
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => window.location.reload()}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Reload Page
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-white border-gray-600"
                          onClick={() => switchMode("hardware")}
                        >
                          Use Hardware Scanner
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            // CRITICAL: No async delays — preserves user gesture for getUserMedia
                            handleRetryCamera();
                          }}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retry
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 w-full max-w-xs">
                      <Button
                        className="w-full"
                        onClick={() => {
                          // CRITICAL: No async delays — preserves user gesture for getUserMedia
                          // handleStartCamera calls initCamera synchronously
                          handleStartCamera();
                        }}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Start Camera
                      </Button>
                      <p className="text-xs text-gray-400 text-center">
                        Your browser will ask for camera permission
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-gray-300 border-gray-600"
                        onClick={() => switchMode("hardware")}
                      >
                        Use Hardware Scanner Instead
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-gray-400"
                        onClick={() => switchMode("manual")}
                      >
                        Enter Barcode Manually
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Video element with iOS-specific attributes for inline playback */}
                  {/* MOBILE FIX: Use proper React camelCase attributes for webkit */}
                  <video
                    ref={videoRef}
                    className="w-full h-auto aspect-[4/3] sm:aspect-video object-cover bg-black"
                    playsInline={true}
                    autoPlay={true}
                    muted={true}
                    controls={false}
                    style={{ display: "block", width: "100%", minHeight: "200px" }}
                    onLoadedMetadata={(e) => {
                      // Ensure video plays on iOS after metadata loads
                      const video = e.currentTarget;
                      if (video.paused) {
                        video.play().catch(() => {});
                      }
                    }}
                  />

                  {scanStatus === "ready" && (
                    <>
                      {/* Green scanning box - larger on mobile for easier targeting */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                          className="w-[70%] max-w-[280px] h-24 sm:h-32 md:h-40 border-3 border-green-500 rounded-md shadow-lg"
                          style={{
                            boxShadow:
                              "0 0 0 9999px rgba(0, 0, 0, 0.4), 0 0 15px rgba(34, 197, 94, 0.6)",
                            borderWidth: "3px",
                          }}
                        />
                      </div>

                      {/* Status indicator with mobile tips */}
                      <div className="absolute top-2 left-2 right-2 bg-green-500/90 text-white text-xs px-2 py-1 rounded text-center font-medium">
                        ✓ Point at barcode • Hold steady • Good lighting helps
                      </div>
                      
                      {/* Bottom controls: torch and camera switch */}
                      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                        {/* Torch/Flash toggle */}
                        {torchSupported && (
                          <button
                            onClick={async () => {
                              try {
                                const videoTrack = videoRef.current?.srcObject instanceof MediaStream 
                                  ? videoRef.current.srcObject.getVideoTracks()[0] 
                                  : null;
                                if (videoTrack) {
                                  await videoTrack.applyConstraints({
                                    advanced: [{ torch: !torchEnabled } as any]
                                  });
                                  setTorchEnabled(!torchEnabled);
                                }
                              } catch (e) {
                                console.error('Failed to toggle torch:', e);
                              }
                            }}
                            className={`bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1 hover:bg-black/80 ${torchEnabled ? 'bg-yellow-500/80' : ''}`}
                          >
                            <Flashlight className={`h-3 w-3 ${torchEnabled ? 'text-yellow-300' : ''}`} />
                            {torchEnabled ? 'Flash On' : 'Flash'}
                          </button>
                        )}
                        
                        {/* Camera switch button if multiple cameras — passes deviceId directly */}
                        {cameraDevices.length > 1 && (
                          <button
                            onClick={() => {
                              const currentIndex = cameraDevices.findIndex(d => d.deviceId === selectedDeviceId);
                              const nextIndex = (currentIndex + 1) % cameraDevices.length;
                              const nextDeviceId = cameraDevices[nextIndex].deviceId;
                              setSelectedDeviceId(nextDeviceId);
                              setTorchEnabled(false);
                              // Cleanup then re-init with the specific device ID
                              cleanupCamera();
                              setTimeout(() => initCamera(nextDeviceId, false), 300);
                            }}
                            className="bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1 hover:bg-black/80 ml-auto"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Switch Camera
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {scanStatus === "initializing" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <div className="text-white text-sm flex items-center gap-2">
                        <Zap className="h-4 w-4 animate-pulse" />
                        <span>Starting camera...</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Hardware Scanner Info */}
          {scanMode === "hardware" && (
            <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-4 text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-2">🔌 Hardware Scanner Mode</p>
              <p className="text-xs">
                Scan with your hardware barcode scanner. The barcode will be
                detected automatically when you scan.
              </p>
            </div>
          )}

          {/* Manual Entry Form */}
          {scanMode === "manual" && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium">Barcode</label>
                <Input
                  ref={manualInputRef}
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="Type or paste barcode..."
                  autoComplete="off"
                  className="text-lg mt-1"
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supports: EAN-13, EAN-8, Code128, UPC, Code39, Code93, QR codes
                </p>
              </div>
            </form>
          )}

          {/* Info Box */}
          <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-2 text-xs text-blue-900 dark:text-blue-100">
            {scanMode === "camera" && (
              <span>
                📷 <strong>Camera:</strong> Point at barcode (0.5-2 seconds detection time)
              </span>
            )}
            {scanMode === "hardware" && (
              <span>
                🔌 <strong>Hardware:</strong> Scan with your barcode scanner device
              </span>
            )}
            {scanMode === "manual" && (
              <span>
                ✏️ <strong>Manual:</strong> Type barcode and press Enter or Scan button
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleClose}
              disabled={isProcessing}
            >
              <X className="h-3 w-3 mr-1" />
              Close
            </Button>

            {scanMode === "manual" && (
              <Button
                size="sm"
                onClick={handleManualSubmit}
                disabled={isProcessing || !manualBarcode.trim()}
                className="flex-1"
              >
                {isProcessing ? "Processing..." : "Scan"}
              </Button>
            )}

            {scanMode === "camera" && error && (
              <Button
                size="sm"
                onClick={() => handleRetryCamera()}
                disabled={isProcessing}
                className="flex-1"
              >
                🔄 Retry Camera
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
