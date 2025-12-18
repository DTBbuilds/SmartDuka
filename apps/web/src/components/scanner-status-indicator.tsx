'use client';

import { useState, useEffect } from 'react';
import { Scan, Camera, Keyboard, Check, AlertCircle } from 'lucide-react';

interface ScannerStatusIndicatorProps {
  isHardwareScannerConnected?: boolean;
  isCameraAvailable?: boolean;
  isScanning?: boolean;
  lastScanTime?: number;
  onOpenScanner?: () => void;
  compact?: boolean;
}

/**
 * Visual indicator showing scanner status and last scan
 * 
 * Shows:
 * - Hardware scanner connection status
 * - Camera availability
 * - Active scanning indicator
 * - Last scan timestamp
 */
export function ScannerStatusIndicator({
  isHardwareScannerConnected = false,
  isCameraAvailable = true,
  isScanning = false,
  lastScanTime,
  onOpenScanner,
  compact = false,
}: ScannerStatusIndicatorProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  // Show success animation when a scan happens
  useEffect(() => {
    if (lastScanTime) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastScanTime]);

  if (compact) {
    return (
      <button
        onClick={onOpenScanner}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all ${
          isScanning
            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 animate-pulse'
            : showSuccess
            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
            : isHardwareScannerConnected
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        }`}
        title={isHardwareScannerConnected ? 'Hardware scanner connected' : 'Click to open scanner'}
      >
        {isScanning ? (
          <>
            <Scan className="h-3.5 w-3.5 animate-pulse" />
            <span>Scanning...</span>
          </>
        ) : showSuccess ? (
          <>
            <Check className="h-3.5 w-3.5" />
            <span>Scanned!</span>
          </>
        ) : isHardwareScannerConnected ? (
          <>
            <Keyboard className="h-3.5 w-3.5" />
            <span>Scanner Ready</span>
          </>
        ) : (
          <>
            <Scan className="h-3.5 w-3.5" />
            <span>Scan</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      {/* Scanner Icon */}
      <div
        className={`h-10 w-10 rounded-full flex items-center justify-center ${
          isScanning
            ? 'bg-green-100 dark:bg-green-900/50'
            : isHardwareScannerConnected
            ? 'bg-blue-100 dark:bg-blue-900/50'
            : 'bg-muted'
        }`}
      >
        {isScanning ? (
          <Scan className="h-5 w-5 text-green-600 dark:text-green-400 animate-pulse" />
        ) : isHardwareScannerConnected ? (
          <Keyboard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        ) : (
          <Scan className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* Status Text */}
      <div className="flex-1">
        <p className="text-sm font-medium">
          {isScanning
            ? 'Scanning...'
            : isHardwareScannerConnected
            ? 'Hardware Scanner Connected'
            : 'Scanner Ready'}
        </p>
        <p className="text-xs text-muted-foreground">
          {isScanning
            ? 'Reading barcode'
            : isHardwareScannerConnected
            ? 'Scan any barcode to add to cart'
            : 'Use hardware scanner or camera'}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {isCameraAvailable && (
          <button
            onClick={onOpenScanner}
            className="p-2 rounded-md hover:bg-muted transition-colors"
            title="Open camera scanner"
          >
            <Camera className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        
        {/* Connection Status Dot */}
        <div
          className={`h-2 w-2 rounded-full ${
            isHardwareScannerConnected
              ? 'bg-green-500'
              : 'bg-gray-300 dark:bg-gray-600'
          }`}
          title={isHardwareScannerConnected ? 'Connected' : 'Not connected'}
        />
      </div>
    </div>
  );
}
