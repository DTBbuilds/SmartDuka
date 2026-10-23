'use client';

import { useEffect, useState } from 'react';
import { detectBrowser, type BrowserInfo } from '@/lib/browser-detection';
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

    // Auto-select based on browser detection
    if (info.recommendedScanner === 'html5-qrcode') {
      setSelectedScanner('html5-qrcode');
    } else if (info.recommendedScanner === 'zxing') {
      setSelectedScanner('zxing');
    } else if (manualOnly) {
      // No camera API at all — manual entry is the primary mode.
      setSelectedScanner('html5-qrcode');
    } else {
      // Default to html5-qrcode for better mobile support
      setSelectedScanner('html5-qrcode');
    }

    console.log(`[UnifiedScanner] Selected: ${selectedScanner}`, {
      browser: info.browser,
      platform: info.platform,
      isWebView: info.isWebView,
      isInAppBrowser: info.isInAppBrowser,
      recommended: info.recommendedScanner,
    });
  }, [forceScanner]);

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
      />
    );
  }

  return (
    <BarcodeScannerZXing
      isOpen={isOpen}
      onClose={onClose}
      onScan={onScan}
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
