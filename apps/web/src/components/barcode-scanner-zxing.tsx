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
import { X, Camera, AlertCircle, CheckCircle, Zap, Settings, RefreshCw } from "lucide-react";
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

  /**
   * Initialize ZXing-JS CodeReader
   */
  const initZXing = useCallback(async () => {
    try {
      setScanStatus("initializing");
      setError(null);
      setMessage("🔄 Initializing camera...");

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

      // Dynamically import ZXing-JS
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      
      // Create code reader instance
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      // List available video devices (static method)
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      
      if (devices.length === 0) {
        throw new Error("No camera found on this device");
      }

      setCameraDevices(devices);
      
      // Select back camera if available (mobile), otherwise first camera
      const backCamera = devices.find((device: MediaDeviceInfo) =>
        device.label.toLowerCase().includes("back")
      );
      const deviceId = backCamera?.deviceId || devices[0].deviceId;
      setSelectedDeviceId(deviceId);

      // Ensure video element exists
      if (!videoRef.current) {
        throw new Error("Video element not available");
      }

      setScanStatus("ready");
      setMessage("✓ Scanner ready - Point at barcode");

      // Start continuous scanning
      const controls = await codeReader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            handleBarcodeDetected(result.getText());
          }
          // Ignore errors during scanning (continuous process)
        }
      );

      scanControlsRef.current = controls;
      console.log("✅ ZXing-JS initialized successfully");

    } catch (err: any) {
      console.error("Camera initialization error:", err);
      setScanStatus("error");

      // User-friendly error messages
      if (err.message?.includes("INSECURE_CONTEXT")) {
        setError(
          "Camera requires HTTPS. Please access this page via https:// or use localhost for development."
        );
      } else if (err.message?.includes("MEDIA_DEVICES_UNAVAILABLE")) {
        setError(
          "Camera API not available. Please use a modern browser (Chrome, Firefox, Safari, Edge)."
        );
      } else if (err.name === "NotAllowedError") {
        // NotAllowedError can occur due to:
        // 1. User denied permission
        // 2. Permission policy blocks camera
        // 3. No user gesture (autoplay policy)
        setError(
          "Camera permission denied. Please click 'Allow' when prompted, or enable camera access in your browser settings (Site Settings > Camera)."
        );
      } else if (err.name === "NotFoundError" || err.message?.includes("No camera found")) {
        setError("No camera found on this device. Use hardware scanner or manual entry.");
      } else if (err.name === "NotReadableError") {
        setError("Camera is already in use by another application. Please close other apps and try again.");
      } else if (err.name === "AbortError") {
        setError("Camera initialization was canceled. Please try again.");
      } else if (err.name === "OverconstrainedError") {
        setError("Camera constraints could not be satisfied. Try a different camera.");
      } else if (err.name === "SecurityError") {
        setError("Camera access blocked by security policy. Check browser permissions.");
      } else {
        setError(`Camera error: ${err.message || "Unknown error"}. Falling back to manual entry.`);
      }

      // Fallback to hardware scanner mode
      setScanMode("hardware");
    }
  }, []);

  /**
   * Cleanup ZXing-JS on unmount or mode change
   */
  const cleanupZXing = useCallback(() => {
    if (scanControlsRef.current) {
      try {
        scanControlsRef.current.stop();
        console.log("✅ ZXing scanner stopped");
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      scanControlsRef.current = null;
    }

    // Note: BrowserMultiFormatReader doesn't have a reset() method
    // Just clear the reference
    codeReaderRef.current = null;
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
   */
  useEffect(() => {
    if (isOpen && scanMode === "camera") {
      initZXing();
    }

    return () => {
      cleanupZXing();
    };
  }, [isOpen, scanMode, initZXing, cleanupZXing]);

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
    cleanupZXing();
    setScanMode("camera");
    setScanStatus("idle");
    setError(null);
    setMessage("");
    setManualBarcode("");
    setIsProcessing(false);
    onClose();
  };

  /**
   * Switch scan mode
   */
  const switchMode = (mode: ScanMode) => {
    cleanupZXing();
    setScanMode(mode);
    setScanStatus("idle");
    setError(null);
    setMessage("");
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
              {/* Permission Request UI */}
              {(cameraPermission.isDenied || cameraPermission.isPrompt) && scanStatus === "error" ? (
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
                            const granted = await cameraPermission.requestPermission();
                            if (granted) {
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
                          const granted = await cameraPermission.requestPermission();
                          if (granted) {
                            initZXing();
                          }
                        }}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Allow Camera Access
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-gray-300 border-gray-600"
                        onClick={() => switchMode("hardware")}
                      >
                        Use Hardware Scanner Instead
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-auto aspect-[4/3] sm:aspect-video object-cover"
                    playsInline
                    autoPlay
                    muted
                    style={{ display: "block", width: "100%" }}
                  />

                  {scanStatus === "ready" && (
                    <>
                      {/* Green scanning box */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                          className="w-48 h-32 sm:w-56 sm:h-40 border-3 border-green-500 rounded-md shadow-lg"
                          style={{
                            boxShadow:
                              "0 0 0 9999px rgba(0, 0, 0, 0.4), 0 0 15px rgba(34, 197, 94, 0.6)",
                            borderWidth: "3px",
                          }}
                        />
                      </div>

                      {/* Status indicator */}
                      <div className="absolute top-2 left-2 right-2 bg-green-500/90 text-white text-xs px-2 py-1 rounded text-center font-medium">
                        ✓ Scanner ready - Point at barcode
                      </div>
                      
                      {/* Camera switch button if multiple cameras */}
                      {cameraDevices.length > 1 && (
                        <button
                          onClick={() => {
                            const currentIndex = cameraDevices.findIndex(d => d.deviceId === selectedDeviceId);
                            const nextIndex = (currentIndex + 1) % cameraDevices.length;
                            setSelectedDeviceId(cameraDevices[nextIndex].deviceId);
                            // Reinitialize with new camera
                            cleanupZXing();
                            setTimeout(() => initZXing(), 100);
                          }}
                          className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1 hover:bg-black/80"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Switch Camera
                        </button>
                      )}
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
