'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
} from '@smartduka/ui';
import { X, Camera, AlertCircle, CheckCircle, Zap, RefreshCw, Flashlight, RotateCcw, ExternalLink } from 'lucide-react';
import { playSuccessBeep, playErrorBeep } from '@/lib/audio-utils';
import { detectBrowser, getCameraIssueMessage, shouldShowOpenInBrowser, type BrowserInfo } from '@/lib/browser-detection';

interface BarcodeScannerHtml5Props {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

type ScanMode = 'camera' | 'hardware' | 'manual';
type ScanStatus = 'idle' | 'initializing' | 'ready' | 'detecting' | 'success' | 'error';

/**
 * Barcode Scanner using html5-qrcode library
 * 
 * This scanner is optimized for mobile devices, especially:
 * - Android WebView
 * - iOS Safari
 * - In-app browsers (Facebook, Instagram, etc.)
 * - Samsung Internet
 * 
 * Features:
 * - Better mobile compatibility than ZXing
 * - Built-in camera selection UI
 * - Automatic format detection
 * - Graceful degradation
 */
export function BarcodeScannerHtml5({
  isOpen,
  onClose,
  onScan,
}: BarcodeScannerHtml5Props) {
  // Refs
  const scannerRef = useRef<any>(null);
  const scannerContainerId = 'html5-qrcode-scanner';
  const barcodeBufferRef = useRef('');
  const hardwareTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  // State
  const [scanMode, setScanMode] = useState<ScanMode>('camera');
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [showOpenInBrowser, setShowOpenInBrowser] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  
  // Prevent duplicate scans
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const SCAN_DEBOUNCE_MS = 2000;

  /**
   * Initialize browser detection on mount
   */
  useEffect(() => {
    const info = detectBrowser();
    setBrowserInfo(info);
    setShowOpenInBrowser(shouldShowOpenInBrowser(info));
    
    console.log('[Scanner] Browser info:', info);
  }, []);

  /**
   * Initialize html5-qrcode scanner
   */
  const initScanner = useCallback(async () => {
    if (!browserInfo) return;
    
    try {
      setScanStatus('initializing');
      setError(null);
      setMessage('📷 Starting camera...');

      // MOBILE LOGGING: Log initialization start with device info
      console.log('[Scanner] Initializing...', {
        isMobile: browserInfo.isMobile,
        browser: browserInfo.browser,
        isSecureContext: window.isSecureContext,
        protocol: window.location.protocol,
        host: window.location.host,
        userAgent: navigator.userAgent,
      });

      // Check for secure context FIRST - camera requires HTTPS or localhost
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        const currentUrl = window.location.href;
        throw new Error(
          `INSECURE_CONTEXT: Camera access requires HTTPS. ` +
          `You're accessing via: ${window.location.protocol}//${window.location.host}. ` +
          `Please access this page via https:// or use localhost.`
        );
      }

      // MOBILE FIX: First test if we can get camera access at all
      // This helps identify permission issues before html5-qrcode tries to access
      console.log('[Scanner] Testing direct camera access...');
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ 
          video: browserInfo.isMobile ? { facingMode: { ideal: 'environment' } } : true 
        });
        console.log('[Scanner] ✅ Direct camera access successful');
        // Stop the test stream immediately
        testStream.getTracks().forEach(track => track.stop());
        // Wait for camera to be released
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (directErr: any) {
        console.error('[Scanner] ❌ Direct camera access failed:', directErr.name, directErr.message);
        // Re-throw with more context
        throw new Error(`CAMERA_ACCESS_FAILED: ${directErr.name} - ${directErr.message || 'Camera access denied or unavailable'}`);
      }

      // Dynamically import html5-qrcode
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

      // Get available cameras
      console.log('[Scanner] Requesting camera list...');
      const devices = await Html5Qrcode.getCameras();
      console.log('[Scanner] Cameras found:', devices.length, devices.map(d => ({ id: d.id, label: d.label })));
      
      if (devices.length === 0) {
        throw new Error('No cameras found on this device');
      }

      setCameras(devices.map(d => ({ id: d.id, label: d.label || `Camera ${d.id}` })));

      // Select back camera if available
      let cameraId = devices[0].id;
      const backCamera = devices.find(d => 
        d.label?.toLowerCase().includes('back') ||
        d.label?.toLowerCase().includes('rear') ||
        d.label?.toLowerCase().includes('environment')
      );
      if (backCamera) {
        cameraId = backCamera.id;
      } else if (devices.length > 1) {
        // On mobile, last camera is usually back camera
        cameraId = devices[devices.length - 1].id;
      }
      setSelectedCamera(cameraId);

      // Create scanner instance
      const scanner = new Html5Qrcode(scannerContainerId, {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ],
      });
      scannerRef.current = scanner;

      // Configure scanner settings based on device
      const config = {
        fps: browserInfo.isMobile ? 10 : 15,
        qrbox: browserInfo.isMobile ? { width: 250, height: 150 } : { width: 300, height: 200 },
        aspectRatio: browserInfo.isMobile ? 1.333 : 1.777,
        disableFlip: false,
        // Use environment facing camera on mobile
        ...(browserInfo.isMobile && { facingMode: 'environment' }),
      };

      // Start scanning
      console.log('[Scanner] Starting camera with config:', { cameraId, config });
      await scanner.start(
        cameraId,
        config,
        (decodedText) => {
          // Debounce duplicate scans
          const now = Date.now();
          if (decodedText === lastScannedRef.current && now - lastScanTimeRef.current < SCAN_DEBOUNCE_MS) {
            return;
          }
          lastScannedRef.current = decodedText;
          lastScanTimeRef.current = now;
          
          handleBarcodeDetected(decodedText);
        },
        (errorMessage) => {
          // Ignore scanning errors (no barcode found) - this is normal during continuous scanning
        }
      );

      setScanStatus('ready');
      setMessage('✓ Scanner ready - Point at barcode');
      console.log('[Scanner] ✅ Camera started successfully');
      
      // Check torch support
      try {
        const capabilities = scanner.getRunningTrackCapabilities?.() as any;
        if (capabilities?.torch) {
          setTorchSupported(true);
        }
      } catch (e) {
        // Torch not supported
      }

      console.log('✅ html5-qrcode scanner initialized');

    } catch (err: any) {
      console.error('Scanner initialization error:', err);
      setScanStatus('error');
      
      // User-friendly error messages
      if (err.message?.includes('INSECURE_CONTEXT')) {
        // Provide clear instructions for HTTPS requirement
        setError(
          `Camera requires HTTPS connection. You're on HTTP (${window.location.host}). ` +
          `Options: 1) Access via https:// 2) Use localhost:3000 on this device 3) Use hardware scanner or manual entry.`
        );
      } else if (err.message?.includes('CAMERA_ACCESS_FAILED')) {
        // Direct camera access failed - extract the actual error
        const actualError = err.message.replace('CAMERA_ACCESS_FAILED: ', '');
        console.error('[Scanner] Camera access failed with:', actualError);
        if (actualError.includes('NotAllowedError')) {
          setError('Camera permission denied. Please allow camera access in your browser settings.');
        } else if (actualError.includes('NotFoundError')) {
          setError('No camera found on this device.');
        } else if (actualError.includes('NotReadableError')) {
          setError('Camera is in use by another app. Please close other apps and try again.');
        } else {
          setError(`Camera access failed: ${actualError}. Please check camera permissions.`);
        }
      } else if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        setError(browserInfo ? getCameraIssueMessage(browserInfo) : 'Camera permission denied');
      } else if (err.name === 'NotFoundError' || err.message?.includes('No cameras')) {
        setError('No camera found. Use manual entry or hardware scanner.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is in use by another app. Please close other apps and try again.');
      } else if (err.message?.includes('HTTPS') || err.message?.includes('secure context')) {
        setError('Camera requires HTTPS. Please use a secure connection or localhost.');
      } else {
        setError(`Camera error: ${err.message || 'Unknown error'}`);
      }
      
      // Fallback to hardware scanner
      setScanMode('hardware');
    }
  }, [browserInfo]);

  /**
   * Cleanup scanner
   */
  const cleanupScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState?.();
        if (state === 2) { // Html5QrcodeScannerState.SCANNING
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
        console.log('✅ Scanner stopped and cleared');
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
  }, []);

  /**
   * Handle barcode detected
   */
  const handleBarcodeDetected = useCallback(async (barcode: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setScanStatus('detecting');
    setMessage(`✅ Barcode detected: ${barcode}`);

    try {
      // Play success sound
      await playSuccessBeep();
      
      // Vibrate on mobile
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }

      // Stop scanner before callback
      await cleanupScanner();
      
      // Show success briefly
      setScanStatus('success');
      
      // Call the onScan callback
      setTimeout(() => {
        onScan(barcode);
        handleClose();
      }, 500);

    } catch (err: any) {
      console.error('Error processing barcode:', err);
      await playErrorBeep();
      setError(`Error: ${err.message}`);
      setScanStatus('error');
      setIsProcessing(false);
    }
  }, [isProcessing, cleanupScanner, onScan]);

  /**
   * Handle hardware scanner input
   */
  useEffect(() => {
    if (!isOpen || scanMode !== 'hardware') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target === manualInputRef.current) return;

      if (e.key === 'Enter' && barcodeBufferRef.current.length > 0) {
        e.preventDefault();
        const barcode = barcodeBufferRef.current.trim();
        barcodeBufferRef.current = '';

        if (barcode.length >= 5) {
          handleBarcodeDetected(barcode);
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        barcodeBufferRef.current += e.key;

        if (hardwareTimeoutRef.current) {
          clearTimeout(hardwareTimeoutRef.current);
        }

        hardwareTimeoutRef.current = setTimeout(() => {
          barcodeBufferRef.current = '';
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (hardwareTimeoutRef.current) {
        clearTimeout(hardwareTimeoutRef.current);
      }
    };
  }, [isOpen, scanMode, handleBarcodeDetected]);

  /**
   * Initialize camera when dialog opens
   */
  useEffect(() => {
    if (isOpen && scanMode === 'camera' && browserInfo) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        initScanner();
      }, 100);
      
      return () => {
        clearTimeout(timer);
        cleanupScanner();
      };
    }
    
    return () => {
      cleanupScanner();
    };
  }, [isOpen, scanMode, browserInfo, initScanner, cleanupScanner]);

  /**
   * Handle manual entry
   */
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    await handleBarcodeDetected(manualBarcode.trim());
    setManualBarcode('');
  };

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    cleanupScanner();
    setScanMode('camera');
    setScanStatus('idle');
    setError(null);
    setMessage('');
    setManualBarcode('');
    setIsProcessing(false);
    setTorchEnabled(false);
    lastScannedRef.current = '';
    onClose();
  };

  /**
   * Switch scan mode
   */
  const switchMode = (mode: ScanMode) => {
    cleanupScanner();
    setScanMode(mode);
    setScanStatus('idle');
    setError(null);
    setMessage('');
  };

  /**
   * Toggle torch/flashlight
   */
  const toggleTorch = async () => {
    if (!scannerRef.current || !torchSupported) return;
    
    try {
      if (torchEnabled) {
        await scannerRef.current.applyVideoConstraints({ advanced: [{ torch: false }] });
      } else {
        await scannerRef.current.applyVideoConstraints({ advanced: [{ torch: true }] });
      }
      setTorchEnabled(!torchEnabled);
    } catch (err) {
      console.error('Failed to toggle torch:', err);
    }
  };

  /**
   * Switch camera
   */
  const switchCamera = async () => {
    if (!scannerRef.current || cameras.length <= 1) return;
    
    const currentIndex = cameras.findIndex(c => c.id === selectedCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    
    try {
      await cleanupScanner();
      setSelectedCamera(nextCamera.id);
      // Re-initialize will happen via useEffect
    } catch (err) {
      console.error('Failed to switch camera:', err);
    }
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
            {scanMode === 'camera' && 'Point camera at barcode to scan automatically'}
            {scanMode === 'hardware' && 'Use your barcode scanner or switch to camera/manual'}
            {scanMode === 'manual' && 'Type or paste barcode below'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Selector */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => switchMode('camera')}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                scanMode === 'camera'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              📷 Camera
            </button>
            <button
              onClick={() => switchMode('hardware')}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                scanMode === 'hardware'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              🔌 Hardware
            </button>
            <button
              onClick={() => switchMode('manual')}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                scanMode === 'manual'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              ✏️ Manual
            </button>
          </div>

          {/* Browser Warning for WebView/In-App */}
          {showOpenInBrowser && browserInfo && scanMode === 'camera' && (
            <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">
                    {browserInfo.isInAppBrowser 
                      ? `Opening in ${browserInfo.inAppBrowserName || 'app'} browser`
                      : 'WebView detected'}
                  </p>
                  <p className="text-xs mt-1">
                    Camera may work better in {browserInfo.platform === 'ios' ? 'Safari' : 'Chrome'}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status Messages */}
          {scanStatus === 'initializing' && (
            <div className="text-center text-sm text-blue-600 dark:text-blue-400 py-2 flex items-center justify-center gap-2">
              <Zap className="h-4 w-4 animate-pulse" />
              <span>Starting camera...</span>
            </div>
          )}

          {message && scanStatus !== 'error' && (
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
          {scanMode === 'camera' && (
            <div className="relative">
              {/* Scanner container - html5-qrcode will render here */}
              <div 
                id={scannerContainerId}
                className="w-full rounded-lg overflow-hidden bg-black"
                style={{ minHeight: '280px' }}
              />
              
              {/* Controls overlay when scanning */}
              {scanStatus === 'ready' && (
                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                  {/* Torch toggle */}
                  {torchSupported && (
                    <button
                      onClick={toggleTorch}
                      className={`bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1 hover:bg-black/80 ${torchEnabled ? 'bg-yellow-500/80' : ''}`}
                    >
                      <Flashlight className={`h-3 w-3 ${torchEnabled ? 'text-yellow-300' : ''}`} />
                      {torchEnabled ? 'Flash On' : 'Flash'}
                    </button>
                  )}
                  
                  {/* Camera switch */}
                  {cameras.length > 1 && (
                    <button
                      onClick={switchCamera}
                      className="bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1 hover:bg-black/80 ml-auto"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Switch
                    </button>
                  )}
                </div>
              )}

              {/* Error state with retry */}
              {scanStatus === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 p-4">
                  <Button
                    onClick={() => {
                      setError(null);
                      setScanStatus('idle');
                      initScanner();
                    }}
                    className="mb-2"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Camera
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => switchMode('hardware')}>
                      Hardware Scanner
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => switchMode('manual')}>
                      Manual Entry
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hardware Scanner Info */}
          {scanMode === 'hardware' && (
            <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-4 text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-2">🔌 Hardware Scanner Mode</p>
              <p className="text-xs">
                Scan with your hardware barcode scanner. The barcode will be
                detected automatically when you scan.
              </p>
            </div>
          )}

          {/* Manual Entry */}
          {scanMode === 'manual' && (
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
                  autoFocus
                />
              </div>
            </form>
          )}

          {/* Browser/Scanner Info */}
          {browserInfo && (
            <div className="rounded-md bg-gray-50 dark:bg-gray-900 p-2 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center justify-between">
                <span>
                  {browserInfo.browser} on {browserInfo.platform}
                  {browserInfo.isWebView && ' (WebView)'}
                  {browserInfo.isInAppBrowser && ` (${browserInfo.inAppBrowserName})`}
                </span>
                {browserInfo.scannerNotes.length > 0 && (
                  <span className="text-blue-500">
                    {browserInfo.recommendedScanner === 'html5-qrcode' ? '✓ Optimized' : ''}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            {scanMode === 'manual' && (
              <Button
                onClick={handleManualSubmit}
                disabled={isProcessing || !manualBarcode.trim()}
                className="flex-1"
              >
                {isProcessing ? 'Processing...' : 'Scan'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
