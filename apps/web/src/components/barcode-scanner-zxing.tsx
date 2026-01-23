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
import { useCameraPermission, getCameraPermissionInstructions } from "@/hooks/use-camera-permission";

interface BarcodeScannerZXingProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

type ScanMode = "camera" | "hardware" | "manual";
type ScanStatus = "idle" | "initializing" | "ready" | "detecting" | "success" | "error";

/**
 * Unified Barcode Scanner using ZXing-JS Browser
 * 
 * Three scanning modes with automatic fallbacks:
 * 1. Camera Scanning (ZXing-JS) - Primary method
 * 2. Hardware Scanner (Keyboard input) - Automatic fallback
 * 3. Manual Entry (Text input) - Final fallback
 * 
 * Features:
 * - Supports 1D barcodes (EAN-13, EAN-8, Code128, UPC, Code39, Code93)
 * - Supports 2D barcodes (QR Code, Data Matrix)
 * - Graceful error handling with user-friendly messages
 * - Automatic mode detection and switching
 * - Mobile-first responsive design
 * - Accessibility compliant (WCAG 2.1 AA)
 * - Audio and haptic feedback
 * 
 * Browser Requirements:
 * - Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
 * - iOS Safari 14+, Android Chrome 90+
 */
export function BarcodeScannerZXing({
  isOpen,
  onClose,
  onScan,
}: BarcodeScannerZXingProps) {
  // Camera permission hook
  const cameraPermission = useCameraPermission();
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<any>(null);
  const scanControlsRef = useRef<any>(null);
  const barcodeBufferRef = useRef("");
  const hardwareTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  // State
  const [scanMode, setScanMode] = useState<ScanMode>("camera");
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [manualBarcode, setManualBarcode] = useState("");
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPermissionRequest, setShowPermissionRequest] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  
  // Flag to prevent multiple detections after successful scan
  const scanCompletedRef = useRef(false);
  
  // Track if camera is being released to prevent race conditions
  const cameraReleasingRef = useRef(false);
  
  // CRITICAL FIX: Track if scanner is actively running to prevent cleanup on re-renders
  const scannerActiveRef = useRef(false);

  /**
   * Extract error message from various error types
   * ZXing and some mobile browsers return non-standard error objects
   */
  const extractErrorDetails = (err: any): { name: string; message: string } => {
    if (!err) return { name: 'Unknown', message: 'Unknown error' };
    
    // Handle string errors
    if (typeof err === 'string') {
      return { name: 'Error', message: err };
    }
    
    // Handle DOMException and standard Error objects
    const name = err.name || err.constructor?.name || 'Error';
    let message = err.message || '';
    
    // Some mobile browsers put details in different properties
    if (!message && err.constraintName) {
      message = `Constraint failed: ${err.constraintName}`;
    }
    if (!message && err.constraint) {
      message = `Constraint failed: ${err.constraint}`;
    }
    
    // Check for nested error
    if (!message && err.error) {
      const nested = extractErrorDetails(err.error);
      message = nested.message;
    }
    
    // Fallback to toString
    if (!message) {
      try {
        message = String(err);
      } catch {
        message = 'Unknown error occurred';
      }
    }
    
    return { name, message };
  };

  /**
   * Wait for camera to be fully released
   * Mobile browsers need time to release camera resources
   */
  const waitForCameraRelease = async (delayMs: number = 500): Promise<void> => {
    if (cameraReleasingRef.current) {
      // Wait for ongoing release to complete
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return new Promise(resolve => setTimeout(resolve, 100));
  };

  /**
   * Initialize ZXing-JS CodeReader
   */
  const initZXing = useCallback(async () => {
    try {
      setScanStatus("initializing");
      setError(null);
      setMessage("🔄 Initializing camera...");

      // MOBILE FIX: Ensure any previous camera stream is fully released
      // This prevents "camera in use" errors on mobile browsers
      await waitForCameraRelease(300);
      
      // Also clean up any existing ZXing instance
      if (codeReaderRef.current || scanControlsRef.current) {
        cleanupZXing();
        await waitForCameraRelease(200);
      }

      // Check for secure context (HTTPS or localhost required for camera access)
      if (typeof window !== "undefined" && !window.isSecureContext) {
        throw new Error(
          "INSECURE_CONTEXT: Camera access requires HTTPS. Please access this page via https:// or localhost."
        );
      }

      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "MEDIA_DEVICES_UNAVAILABLE: Your browser does not support camera access. Please use a modern browser like Chrome, Firefox, Safari, or Edge."
        );
      }

      // Detect mobile platforms for special handling
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      const isMobile = isIOS || isAndroid;
      
      // Log platform detection for debugging
      console.log(`[Scanner] Platform detection:`, {
        iOS: isIOS,
        Android: isAndroid,
        Mobile: isMobile,
        userAgent: navigator.userAgent,
        isSecureContext: window.isSecureContext,
        protocol: window.location.protocol,
        host: window.location.host,
      });

      // Dynamically import ZXing-JS
      // NOTE: We removed the direct camera test as it was causing issues on mobile
      // The test would acquire and release the camera, then ZXing would try to acquire it again
      // This caused race conditions on mobile browsers where the camera wasn't fully released
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      
      // Create code reader instance
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      // List available video devices (static method)
      console.log('[Scanner] Requesting camera list...');
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      console.log('[Scanner] Cameras found:', devices.length, devices.map(d => ({ id: d.deviceId, label: d.label })));
      
      if (devices.length === 0) {
        throw new Error("No camera found on this device");
      }

      setCameraDevices(devices);
      
      // Select back camera if available (mobile), otherwise first camera
      // Try multiple detection methods for back camera
      let backCamera = devices.find((device: MediaDeviceInfo) =>
        device.label.toLowerCase().includes("back") ||
        device.label.toLowerCase().includes("rear") ||
        device.label.toLowerCase().includes("environment")
      );
      
      // On mobile, if no label match, prefer the last camera (usually back camera)
      if (!backCamera && (isIOS || isAndroid) && devices.length > 1) {
        backCamera = devices[devices.length - 1];
      }
      
      const deviceId = backCamera?.deviceId || devices[0].deviceId;
      setSelectedDeviceId(deviceId);
      console.log('[Scanner] Selected camera:', deviceId, backCamera?.label || devices[0].label);

      // Ensure video element exists
      if (!videoRef.current) {
        throw new Error("Video element not available");
      }

      setScanStatus("ready");
      setMessage("✓ Scanner ready - Point at barcode");
      console.log('[Scanner] ✅ Camera ready, starting decode...');

      // Use decodeFromConstraints for mobile-optimized camera settings
      // This gives us more control over camera selection and resolution
      // IMPORTANT: On mobile, avoid 'exact' constraints - use 'ideal' instead
      // 'exact' can fail if device is busy or constraints can't be satisfied
      const videoConstraints: MediaTrackConstraints = {
        deviceId: deviceId ? { ideal: deviceId } : undefined,
        facingMode: deviceId ? undefined : { ideal: 'environment' },
        // Use lower resolution for better performance on mobile
        // iOS specifically works better with lower resolutions
        width: { ideal: isIOS ? 640 : 1280, max: 1920 },
        height: { ideal: isIOS ? 480 : 720, max: 1080 },
      };

      // Wrap in timeout to prevent hanging on mobile
      console.log('[Scanner] Starting ZXing decode with constraints:', JSON.stringify(videoConstraints));
      
      let controls: any = null;
      try {
        const decodePromise = codeReader.decodeFromConstraints(
          { video: videoConstraints },
          videoRef.current,
          (result, error) => {
            // CRITICAL: Stop processing if scan already completed
            if (scanCompletedRef.current) {
              return;
            }
            
            if (result) {
              const barcode = result.getText();
              console.log('[Scanner] Barcode detected:', barcode);
              // Debounce: prevent duplicate scans of same barcode within 2 seconds
              if (barcode !== lastScannedBarcode) {
                // Mark as completed BEFORE processing to prevent race conditions
                scanCompletedRef.current = true;
                setLastScannedBarcode(barcode);
                handleBarcodeDetected(barcode);
              }
            }
            // Ignore errors during scanning (continuous process)
          }
        );

        // Add timeout for mobile - 15 seconds should be enough
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('TIMEOUT: Camera initialization took too long')), 15000);
        });

        controls = await Promise.race([decodePromise, timeoutPromise]);
        console.log('[Scanner] ✅ ZXing decodeFromConstraints succeeded');
      } catch (decodeErr: any) {
        console.error('[Scanner] ❌ ZXing decodeFromConstraints failed:', decodeErr);
        throw new Error(`ZXING_DECODE_FAILED: ${decodeErr.name || 'Unknown'} - ${decodeErr.message || 'Failed to start barcode scanning'}`);
      }

      scanControlsRef.current = controls;

      // MOBILE FIX: Explicitly call play() on video element
      // Mobile browsers often require explicit play() after stream is attached
      if (videoRef.current && videoRef.current.paused) {
        try {
          await videoRef.current.play();
          console.log('✅ Video play() called successfully');
        } catch (playErr: any) {
          // NotAllowedError is expected if autoplay is blocked
          // The video will still work when user interacts
          if (playErr.name !== 'NotAllowedError') {
            console.warn('Video play() warning:', playErr.message);
          }
        }
      }
      
      // Check if torch/flash is supported
      try {
        const videoTrack = videoRef.current?.srcObject instanceof MediaStream 
          ? videoRef.current.srcObject.getVideoTracks()[0] 
          : null;
        if (videoTrack) {
          const capabilities = videoTrack.getCapabilities?.() as any;
          if (capabilities?.torch) {
            setTorchSupported(true);
          }
        }
      } catch (e) {
        // Torch detection failed, not critical
      }
      
      setRetryCount(0); // Reset retry count on success
      scannerActiveRef.current = true; // Mark scanner as active
      console.log("✅ ZXing-JS initialized successfully");

    } catch (err: any) {
      // Extract error details using our robust error extractor
      const errorDetails = extractErrorDetails(err);
      console.error("Camera initialization error:", errorDetails.name, errorDetails.message, err);
      
      // For OverconstrainedError, try fallback with simpler constraints
      if (errorDetails.name === "OverconstrainedError" && retryCount === 0) {
        console.log("OverconstrainedError - retrying with basic constraints...");
        setRetryCount(1);
        // Try again with minimal constraints
        try {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const fallbackReader = new BrowserMultiFormatReader();
          codeReaderRef.current = fallbackReader;
          
          const fallbackControls = await fallbackReader.decodeFromConstraints(
            { video: { facingMode: 'environment' } }, // Minimal constraints
            videoRef.current!,
            (result) => {
              // CRITICAL: Stop processing if scan already completed
              if (scanCompletedRef.current) {
                return;
              }
              
              if (result) {
                const barcode = result.getText();
                if (barcode !== lastScannedBarcode) {
                  // Mark as completed BEFORE processing to prevent race conditions
                  scanCompletedRef.current = true;
                  setLastScannedBarcode(barcode);
                  handleBarcodeDetected(barcode);
                }
              }
            }
          );
          scanControlsRef.current = fallbackControls;
          setRetryCount(0);
          console.log("✅ ZXing-JS initialized with fallback constraints");
          return;
        } catch (fallbackErr) {
          console.error("Fallback also failed:", fallbackErr);
          // Continue to error handling below
        }
      }
      
      // Retry logic for transient failures (including unknown errors on mobile)
      // Mobile browsers often have transient camera errors that resolve on retry
      const isTransientError = 
        errorDetails.name === "NotReadableError" || 
        errorDetails.name === "AbortError" ||
        errorDetails.name === "Unknown" ||
        errorDetails.message.includes("Unknown");
        
      if (retryCount < MAX_RETRIES && isTransientError) {
        console.log(`[Scanner] Retrying camera initialization (${retryCount + 1}/${MAX_RETRIES})...`);
        setRetryCount(prev => prev + 1);
        // Use longer delay for mobile - camera needs time to fully release
        const retryDelay = 1000 + (retryCount * 500); // Exponential backoff
        setMessage(`📷 Camera busy, retrying in ${retryDelay/1000}s...`);
        setTimeout(() => initZXing(), retryDelay);
        return;
      }
      
      setScanStatus("error");

      // User-friendly error messages based on extracted error details
      if (errorDetails.message.includes("INSECURE_CONTEXT")) {
        setError(
          "Camera requires HTTPS. Please access this page via https:// or use localhost for development."
        );
      } else if (errorDetails.message.includes("MEDIA_DEVICES_UNAVAILABLE")) {
        setError(
          "Camera API not available. Please use a modern browser (Chrome, Firefox, Safari, Edge)."
        );
      } else if (errorDetails.name === "NotAllowedError" || errorDetails.name === "PermissionDeniedError") {
        // NotAllowedError can occur due to:
        // 1. User denied permission
        // 2. Permission policy blocks camera
        // 3. No user gesture (autoplay policy)
        setError(
          "Camera permission denied. Please click 'Allow' when prompted, or enable camera access in your browser settings (Site Settings > Camera)."
        );
      } else if (errorDetails.name === "NotFoundError" || errorDetails.message.includes("No camera found")) {
        setError("No camera found on this device. Use hardware scanner or manual entry.");
      } else if (errorDetails.name === "NotReadableError" || errorDetails.name === "TrackStartError") {
        setError("Camera is already in use by another application. Please close other apps and try again.");
      } else if (errorDetails.name === "AbortError") {
        setError("Camera initialization was canceled. Please try again.");
      } else if (errorDetails.message.includes("timeout") || errorDetails.message.includes("Camera initialization timeout")) {
        setError("Camera took too long to start. Please try again or use manual entry.");
      } else if (errorDetails.name === "OverconstrainedError") {
        setError("Camera constraints could not be satisfied. Try switching cameras or use manual entry.");
      } else if (errorDetails.name === "SecurityError") {
        setError("Camera access blocked by security policy. Check browser permissions.");
      } else if (errorDetails.message.includes('ZXING_DECODE_FAILED')) {
        // ZXing library failed to start scanning
        const actualError = errorDetails.message.replace('ZXING_DECODE_FAILED: ', '');
        setError(`Scanner failed to start: ${actualError}. Try refreshing the page.`);
      } else {
        // MOBILE FIX: Provide more helpful message for unknown errors
        // These are often transient mobile browser issues
        setError(`Camera error: ${errorDetails.message}. Try closing other apps using the camera, or use manual entry.`);
      }

      // Fallback to hardware scanner mode
      scannerActiveRef.current = false; // Mark scanner as inactive on error
      setScanMode("hardware");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount, lastScannedBarcode]);

  /**
   * Cleanup ZXing-JS on unmount or mode change
   * MOBILE FIX: Track camera release state to prevent race conditions
   */
  const cleanupZXing = useCallback(() => {
    // Mark scanner as inactive
    scannerActiveRef.current = false;
    // Mark camera as releasing to prevent race conditions
    cameraReleasingRef.current = true;
    
    // Stop the scanner controls
    if (scanControlsRef.current) {
      try {
        scanControlsRef.current.stop();
        console.log("✅ ZXing scanner stopped");
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      scanControlsRef.current = null;
    }

    // Also stop any active video stream to release camera
    if (videoRef.current?.srcObject instanceof MediaStream) {
      try {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach(track => {
          track.stop();
          console.log(`✅ Stopped track: ${track.kind}`);
        });
        videoRef.current.srcObject = null;
      } catch (err) {
        console.error("Error stopping video stream:", err);
      }
    }

    // Clear the code reader reference
    codeReaderRef.current = null;
    
    // MOBILE FIX: Mark camera as released after a short delay
    // Mobile browsers need time to fully release camera resources
    setTimeout(() => {
      cameraReleasingRef.current = false;
    }, 300);
  }, []);

  /**
   * Handle barcode detected from camera
   */
  const handleBarcodeDetected = useCallback(
    async (barcode: string) => {
      if (isProcessing) return; // Prevent double processing

      setIsProcessing(true);
      setScanStatus("detecting");
      setMessage(`✅ Barcode detected: ${barcode}`);

      try {
        // Play success beep and haptic
        await playSuccessBeep();
        if (navigator.vibrate) {
          navigator.vibrate(100);
        }

        // Stop scanning
        cleanupZXing();

        setScanStatus("success");
        setMessage("✓ Barcode scanned successfully!");

        // Notify parent
        setTimeout(() => {
          onScan(barcode);
          onClose();
        }, 500);
      } catch (err) {
        console.error("Barcode processing error:", err);
        await playErrorBeep();
        setError("Error processing barcode. Please try again.");
        setScanStatus("error");
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, cleanupZXing, onScan, onClose]
  );

  /**
   * Handle hardware scanner (keyboard input)
   */
  useEffect(() => {
    if (!isOpen || scanMode !== "hardware") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input field
      if (e.target === manualInputRef.current) return;

      // Check for Enter key (end of barcode)
      if (e.key === "Enter" && barcodeBufferRef.current.length > 0) {
        e.preventDefault();
        const barcode = barcodeBufferRef.current.trim();
        barcodeBufferRef.current = "";

        if (barcode.length >= 5) {
          handleBarcodeDetected(barcode);
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Add character to buffer
        barcodeBufferRef.current += e.key;

        // Clear timeout
        if (hardwareTimeoutRef.current) {
          clearTimeout(hardwareTimeoutRef.current);
        }

        // Clear buffer if no Enter within 100ms
        hardwareTimeoutRef.current = setTimeout(() => {
          barcodeBufferRef.current = "";
        }, 100);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (hardwareTimeoutRef.current) {
        clearTimeout(hardwareTimeoutRef.current);
      }
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
   * Initialize camera when dialog opens in camera mode
   * On mobile, proactively request permission first
   * 
   * IMPORTANT: Mobile browsers require explicit user gesture for camera access.
   * We show a "Start Camera" button if permission state is uncertain.
   */
  useEffect(() => {
    // CRITICAL FIX: Only initialize if dialog is open, mode is camera, and scanner is not already active
    if (isOpen && scanMode === "camera" && !scannerActiveRef.current) {
      // Reset scan completed flag when opening scanner
      scanCompletedRef.current = false;
      
      // Check if we need to request permission first (mobile-friendly approach)
      const initCamera = async () => {
        // Wait for permission check to complete
        if (cameraPermission.isChecking) {
          setMessage("📷 Checking camera availability...");
          setScanStatus("initializing");
          // Don't proceed until checking is complete - the effect will re-run
          return;
        }
        
        // If permission is already granted, initialize camera directly
        if (cameraPermission.isGranted) {
          // Mark scanner as active BEFORE initializing to prevent re-entry
          scannerActiveRef.current = true;
          initZXing();
          return;
        }
        
        // If permission is denied, show error
        if (cameraPermission.isDenied) {
          setScanStatus("error");
          setError("Camera permission denied. Please enable camera access in your browser settings.");
          return;
        }
        
        // If permission is unavailable (no camera, insecure context, etc.)
        if (cameraPermission.isUnavailable) {
          setScanStatus("error");
          setError(cameraPermission.error || "Camera not available on this device.");
          return;
        }
        
        // Permission is 'prompt' - on mobile, we need user gesture
        // Show permission request UI instead of auto-requesting
        // This is more reliable across different mobile browsers
        setShowPermissionRequest(true);
        setScanStatus("idle");
        setMessage("");
      };
      
      initCamera();
    }

    // CRITICAL FIX: Only cleanup when dialog closes or mode changes away from camera
    // NOT on every re-render!
    return () => {
      if (!isOpen || scanMode !== "camera") {
        scannerActiveRef.current = false;
        cleanupZXing();
      }
    };
  // CRITICAL FIX: Remove initZXing from dependencies to prevent re-running on state changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, scanMode, cameraPermission.isPrompt, cameraPermission.isGranted, cameraPermission.isDenied, cameraPermission.isChecking, cameraPermission.isUnavailable, cameraPermission.error]);

  /**
   * Focus manual input when in manual mode
   */
  useEffect(() => {
    if (isOpen && scanMode === "manual" && manualInputRef.current) {
      setTimeout(() => {
        manualInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, scanMode]);

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    scannerActiveRef.current = false; // Ensure scanner is marked inactive
    cleanupZXing();
    setScanMode("camera");
    setScanStatus("idle");
    setError(null);
    setMessage("");
    setManualBarcode("");
    setIsProcessing(false);
    setTorchEnabled(false);
    setTorchSupported(false);
    setLastScannedBarcode(null);
    setRetryCount(0);
    setShowPermissionRequest(false); // Reset permission request state
    scanCompletedRef.current = false; // Reset for next scan session
    onClose();
  };

  /**
   * Switch scan mode
   */
  const switchMode = (mode: ScanMode) => {
    scannerActiveRef.current = false; // Ensure scanner is marked inactive
    cleanupZXing();
    setScanMode(mode);
    setScanStatus("idle");
    setError(null);
    setMessage("");
    setShowPermissionRequest(false); // Reset permission request state
    scanCompletedRef.current = false; // Reset for new scan mode
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
              {cameraPermission.isUnavailable ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 p-6 text-center">
                  <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">Camera Not Available</h3>
                  <p className="text-gray-300 text-sm mb-4 max-w-xs">
                    {cameraPermission.error || 'Camera access is not available on this device or browser.'}
                  </p>
                  
                  <div className="space-y-3 w-full max-w-xs">
                    {/* Diagnostics info for debugging */}
                    {cameraPermission.diagnostics && (
                      <div className="bg-gray-800 rounded-lg p-3 text-left text-xs">
                        <p className="text-gray-400 mb-2 font-medium">Diagnostics:</p>
                        <div className="space-y-1 text-gray-500">
                          <p>• HTTPS: {cameraPermission.diagnostics.protocol === 'https:' ? '✓' : '✗'} ({cameraPermission.diagnostics.protocol})</p>
                          <p>• MediaDevices API: {cameraPermission.diagnostics.hasMediaDevices ? '✓' : '✗'}</p>
                          <p>• getUserMedia: {cameraPermission.diagnostics.hasGetUserMedia ? '✓' : '✗'}</p>
                          <p>• Legacy getUserMedia: {cameraPermission.diagnostics.hasLegacyGetUserMedia ? '✓' : '✗'}</p>
                          <p>• Secure Context: {cameraPermission.diagnostics.isSecureContext ? '✓' : '✗'}</p>
                          <p>• Platform: {cameraPermission.diagnostics.isIOS ? 'iOS' : cameraPermission.diagnostics.isAndroid ? 'Android' : 'Desktop'}</p>
                          <p>• Browser: {cameraPermission.diagnostics.browserInfo?.browser || 'Unknown'} {cameraPermission.diagnostics.browserInfo?.version || ''}</p>
                        </div>
                        {cameraPermission.diagnostics.recommendations && cameraPermission.diagnostics.recommendations.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-700">
                            <p className="text-yellow-400 font-medium mb-1">Recommendations:</p>
                            {cameraPermission.diagnostics.recommendations.map((rec, i) => (
                              <p key={i} className="text-yellow-300/80">• {rec}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <Button
                      className="w-full"
                      onClick={async () => {
                        // Force retry - some browsers need user interaction first
                        setError(null);
                        setScanStatus("initializing");
                        setMessage("📷 Checking camera access...");
                        await cameraPermission.checkPermission();
                        if (cameraPermission.isGranted || cameraPermission.isPrompt) {
                          const granted = await cameraPermission.requestPermission();
                          if (granted) {
                            // MOBILE FIX: Longer delay for mobile browsers to release camera
                            await new Promise(resolve => setTimeout(resolve, 500));
                            initZXing();
                          }
                        }
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
              ) : (showPermissionRequest || cameraPermission.isDenied || (cameraPermission.isPrompt && scanStatus !== "ready")) && scanStatus !== "initializing" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 p-6 text-center">
                  <div className="h-16 w-16 rounded-full bg-orange-500/20 flex items-center justify-center mb-4">
                    <Camera className="h-8 w-8 text-orange-500" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">
                    {cameraPermission.isDenied ? 'Camera Access Denied' : 'Camera Permission Required'}
                  </h3>
                  <p className="text-gray-300 text-sm mb-4 max-w-xs">
                    {cameraPermission.isDenied 
                      ? 'Please enable camera access in your browser settings to scan barcodes.'
                      : 'Allow camera access to scan barcodes with your device camera.'}
                  </p>
                  
                  {cameraPermission.isDenied ? (
                    <div className="space-y-3 w-full max-w-xs">
                      <div className="bg-gray-800 rounded-lg p-3 text-left">
                        <p className="text-xs text-gray-400 mb-1">How to enable:</p>
                        <p className="text-xs text-gray-300">{getCameraPermissionInstructions()}</p>
                      </div>
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
                          onClick={async () => {
                            setScanStatus("initializing");
                            setMessage("📷 Requesting camera access...");
                            setError(null);
                            const granted = await cameraPermission.requestPermission();
                            if (granted) {
                              // MOBILE FIX: Longer delay for mobile browsers to release camera
                              await new Promise(resolve => setTimeout(resolve, 500));
                              initZXing();
                            }
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
                        onClick={async () => {
                          setShowPermissionRequest(false);
                          setScanStatus("initializing");
                          setMessage("📷 Requesting camera access...");
                          setError(null);
                          
                          try {
                            const granted = await cameraPermission.requestPermission();
                            if (granted) {
                              // MOBILE FIX: Longer delay (500ms) for mobile browsers
                              // Camera needs time to be fully released after permission request
                              await new Promise(resolve => setTimeout(resolve, 500));
                              initZXing();
                            } else {
                              setScanStatus("error");
                              setError("Camera permission was not granted. Please try again or use manual entry.");
                            }
                          } catch (err: any) {
                            console.error("Permission request failed:", err);
                            setScanStatus("error");
                            setError(err?.message || "Failed to request camera permission.");
                          }
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
                    // iOS Safari specific - these are set as DOM attributes after render
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
                        
                        {/* Camera switch button if multiple cameras */}
                        {cameraDevices.length > 1 && (
                          <button
                            onClick={() => {
                              const currentIndex = cameraDevices.findIndex(d => d.deviceId === selectedDeviceId);
                              const nextIndex = (currentIndex + 1) % cameraDevices.length;
                              setSelectedDeviceId(cameraDevices[nextIndex].deviceId);
                              setTorchEnabled(false); // Reset torch when switching cameras
                              // Reinitialize with new camera
                              cleanupZXing();
                              setTimeout(() => initZXing(), 100);
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
                onClick={() => initZXing()}
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
