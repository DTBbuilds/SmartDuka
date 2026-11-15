'use client';

import { useEffect, useState } from 'react';
import { detectBrowser, type BrowserInfo } from '@/lib/browser-detection';
import { alternateCameraEngine, preferredCameraEngine } from '@/lib/scanner-engine';
import { BarcodeScannerZXing } from './barcode-scanner-zxing';
import { BarcodeScannerHtml5 } from './barcode-scanner-html5';

interface BarcodeScannerUnifiedProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  /** Force a specific scanner implementation */
  forceScanner?: 'zxing' | 'html5-qrcode' | 'auto';
}

/**
 * Unified Barcode Scanner Component
 *
 * Automatically selects the best barcode scanning implementation based on:
 * - Browser type (Chrome, Safari, Firefox, etc.)
 * - Platform (iOS, Android, Desktop)
 * - Environment (WebView, In-app browser, PWA)
 *
 * Scanner Selection Logic:
 * - Desktop browsers: ZXing (better performance)
 * - iOS Safari: html5-qrcode (better user gesture handling)
 * - Android Chrome: ZXing (good support)
 * - Android WebView: html5-qrcode (more compatible)
 * - In-app browsers: html5-qrcode (graceful degradation)
 * - Samsung Internet: html5-qrcode (quirk handling)
 * - No camera API / insecure context: manual entry first (QUALITY-CORE1 P1-E)
 */
export function BarcodeScannerUnified({
  isOpen,
  onClose,
  onScan,
  forceScanner = 'auto',
}: BarcodeScannerUnifiedProps) {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [selectedScanner, setSelectedScanner] = useState<'zxing' | 'html5-qrcode'>('zxing');
  const [startInManualMode, setStartInManualMode] = useState(false);

  // Detect browser and select appropriate scanner
  useEffect(() => {
    const info = detectBrowser();
    setBrowserInfo(info);

    const manualOnly = info.recommendedScanner === 'manual-only';
    setStartInManualMode(manualOnly);

    if (forceScanner !== 'auto') {
      setSelectedScanner(forceScanner);
      return;
    }

    // Chrome/Brave on Android need the single-stream camera path. Keep the
    // HTML5 decoder for the browsers where it already works, and expose a
    // deliberate alternate-engine control if camera startup fails.
    setSelectedScanner(preferredCameraEngine(info));
    }, [forceScanner]);

  const tryAlternate = () => {
    setSelectedScanner((current) => alternateCameraEngine(current));
  };

  // Don't render until browser detection is complete
  if (!browserInfo) {
    return null;
  }

  // Render the appropriate scanner
  if (selectedScanner === 'html5-qrcode') {
    return (
      <BarcodeScannerHtml5
        isOpen={isOpen}
        onClose={onClose}
        onScan={onScan}
        startInManualMode={startInManualMode}
        onTryAlternateEngine={tryAlternate}
      />
    );
  }

  return (
    <BarcodeScannerZXing
      isOpen={isOpen}
      onClose={onClose}
      onScan={onScan}
      onTryAlternateEngine={tryAlternate}
    />
  );
}

/**
 * Hook to get browser info for scanner decisions
 */
export function useScannerBrowserInfo(): BrowserInfo | null {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);

  useEffect(() => {
    setBrowserInfo(detectBrowser());
  }, []);

  return browserInfo;
}

/**
 * Check if camera scanning is likely to work
 */
export function canUseCameraScanner(browserInfo: BrowserInfo | null): boolean {
  if (!browserInfo) return false;
  
  return (
    browserInfo.cameraSupport.hasGetUserMedia &&
    browserInfo.cameraSupport.isSecureContext &&
    browserInfo.recommendedScanner !== 'manual-only'
  );
}

// Re-export for convenience
export { BarcodeScannerZXing } from './barcode-scanner-zxing';
export { BarcodeScannerHtml5 } from './barcode-scanner-html5';
