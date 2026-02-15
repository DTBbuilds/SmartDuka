'use client';

/**
 * Comprehensive Browser Detection Utility
 * 
 * Detects browser type, version, and platform for optimizing
 * camera and barcode scanner behavior across different environments.
 * 
 * Key detection capabilities:
 * - iOS Safari (requires user gesture for camera)
 * - Android WebView (different from Chrome browser)
 * - Samsung Internet (has quirks with camera)
 * - PWA mode (installed web apps)
 * - In-app browsers (Facebook, Instagram, Twitter, etc.)
 */

export interface BrowserInfo {
  // Browser identification
  browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'samsung' | 'unknown';
  browserVersion: string;
  
  // Platform identification
  platform: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
  platformVersion: string;
  
  // Environment flags
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  
  // WebView detection (critical for camera handling)
  isWebView: boolean;
  isAndroidWebView: boolean;
  isIOSWebView: boolean;
  
  // In-app browser detection
  isInAppBrowser: boolean;
  inAppBrowserName: string | null;
  
  // PWA detection
  isPWA: boolean;
  isStandalone: boolean;
  
  // Camera capability indicators
  cameraSupport: {
    hasMediaDevices: boolean;
    hasGetUserMedia: boolean;
    hasEnumerateDevices: boolean;
    isSecureContext: boolean;
    requiresUserGesture: boolean;
    supportsBackCamera: boolean;
    supportsTorch: boolean;
  };
  
  // Recommended scanner configuration
  recommendedScanner: 'zxing' | 'html5-qrcode' | 'native' | 'manual-only';
  scannerNotes: string[];
}

/**
 * Detect comprehensive browser information
 */
export function detectBrowser(): BrowserInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return getServerSideFallback();
  }

  const ua = navigator.userAgent;
  const uaLower = ua.toLowerCase();
  
  // Platform detection
  const platform = detectPlatform(ua);
  const platformVersion = detectPlatformVersion(ua, platform);
  
  // Browser detection
  const browser = detectBrowserType(ua);
  const browserVersion = detectBrowserVersion(ua, browser);
  
  // Device type
  const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);
  const isDesktop = !isMobile && !isTablet;
  
  // WebView detection
  const webViewInfo = detectWebView(ua);
  
  // In-app browser detection
  const inAppInfo = detectInAppBrowser(ua);
  
  // PWA detection
  const isPWA = detectPWA();
  const isStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches || 
                       (window.navigator as any)?.standalone === true;
  
  // Camera capabilities
  const cameraSupport = detectCameraSupport(platform, browser, webViewInfo.isWebView);
  
  // Determine recommended scanner
  const { recommendedScanner, scannerNotes } = getRecommendedScanner({
    platform,
    browser,
    isWebView: webViewInfo.isWebView,
    isInAppBrowser: inAppInfo.isInAppBrowser,
    cameraSupport,
  });

  return {
    browser,
    browserVersion,
    platform,
    platformVersion,
    isMobile,
    isTablet,
    isDesktop,
    isWebView: webViewInfo.isWebView,
    isAndroidWebView: webViewInfo.isAndroidWebView,
    isIOSWebView: webViewInfo.isIOSWebView,
    isInAppBrowser: inAppInfo.isInAppBrowser,
    inAppBrowserName: inAppInfo.inAppBrowserName,
    isPWA,
    isStandalone,
    cameraSupport,
    recommendedScanner,
    scannerNotes,
  };
}

function detectPlatform(ua: string): BrowserInfo['platform'] {
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Windows/.test(ua)) return 'windows';
  if (/Mac OS X/.test(ua)) return 'macos';
  if (/Linux/.test(ua)) return 'linux';
  return 'unknown';
}

function detectPlatformVersion(ua: string, platform: string): string {
  try {
    switch (platform) {
      case 'ios': {
        const match = ua.match(/OS (\d+[._]\d+[._]?\d*)/);
        return match ? match[1].replace(/_/g, '.') : 'unknown';
      }
      case 'android': {
        const match = ua.match(/Android (\d+\.?\d*\.?\d*)/);
        return match ? match[1] : 'unknown';
      }
      case 'windows': {
        const match = ua.match(/Windows NT (\d+\.?\d*)/);
        return match ? match[1] : 'unknown';
      }
      case 'macos': {
        const match = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
        return match ? match[1].replace(/_/g, '.') : 'unknown';
      }
      default:
        return 'unknown';
    }
  } catch {
    return 'unknown';
  }
}

function detectBrowserType(ua: string): BrowserInfo['browser'] {
  const uaLower = ua.toLowerCase();
  
  // Order matters - check more specific browsers first
  if (uaLower.includes('samsungbrowser')) return 'samsung';
  if (uaLower.includes('edg/') || uaLower.includes('edge/')) return 'edge';
  if (uaLower.includes('opr/') || uaLower.includes('opera')) return 'opera';
  if (uaLower.includes('firefox') || uaLower.includes('fxios')) return 'firefox';
  if (uaLower.includes('crios') || (uaLower.includes('chrome') && !uaLower.includes('edg'))) return 'chrome';
  if (uaLower.includes('safari') && !uaLower.includes('chrome') && !uaLower.includes('crios')) return 'safari';
  
  return 'unknown';
}

function detectBrowserVersion(ua: string, browser: string): string {
  try {
    let match: RegExpMatchArray | null = null;
    
    switch (browser) {
      case 'chrome':
        match = ua.match(/(?:Chrome|CriOS)\/(\d+\.?\d*\.?\d*\.?\d*)/);
        break;
      case 'firefox':
        match = ua.match(/(?:Firefox|FxiOS)\/(\d+\.?\d*)/);
        break;
      case 'safari':
        match = ua.match(/Version\/(\d+\.?\d*\.?\d*)/);
        break;
      case 'edge':
        match = ua.match(/(?:Edg|Edge)\/(\d+\.?\d*\.?\d*)/);
        break;
      case 'opera':
        match = ua.match(/(?:OPR|Opera)\/(\d+\.?\d*\.?\d*)/);
        break;
      case 'samsung':
        match = ua.match(/SamsungBrowser\/(\d+\.?\d*)/);
        break;
    }
    
    return match ? match[1] : 'unknown';
  } catch {
    return 'unknown';
  }
}

function detectWebView(ua: string): { isWebView: boolean; isAndroidWebView: boolean; isIOSWebView: boolean } {
  const uaLower = ua.toLowerCase();
  
  // Android WebView detection
  // WebView has "wv" in user agent, or lacks "Chrome" but has "Android"
  const isAndroidWebView = 
    (uaLower.includes('android') && uaLower.includes('wv')) ||
    (uaLower.includes('android') && !uaLower.includes('chrome') && uaLower.includes('version/')) ||
    // Facebook, Instagram, etc. in-app browsers on Android
    (uaLower.includes('android') && (uaLower.includes('fbav') || uaLower.includes('instagram')));
  
  // iOS WebView detection
  // WKWebView doesn't have "Safari" in UA, UIWebView has specific patterns
  const isIOSWebView = 
    (/iPad|iPhone|iPod/.test(ua) && !uaLower.includes('safari')) ||
    (uaLower.includes('iphone') && uaLower.includes('applewebkit') && !uaLower.includes('safari'));
  
  return {
    isWebView: isAndroidWebView || isIOSWebView,
    isAndroidWebView,
    isIOSWebView,
  };
}

function detectInAppBrowser(ua: string): { isInAppBrowser: boolean; inAppBrowserName: string | null } {
  const uaLower = ua.toLowerCase();
  
  // Common in-app browser patterns
  const inAppPatterns: [RegExp, string][] = [
    [/fbav|fban|fb_iab/i, 'Facebook'],
    [/instagram/i, 'Instagram'],
    [/twitter/i, 'Twitter'],
    [/linkedin/i, 'LinkedIn'],
    [/snapchat/i, 'Snapchat'],
    [/line\//i, 'LINE'],
    [/kakaotalk/i, 'KakaoTalk'],
    [/wechat|micromessenger/i, 'WeChat'],
    [/whatsapp/i, 'WhatsApp'],
    [/telegram/i, 'Telegram'],
    [/tiktok/i, 'TikTok'],
    [/pinterest/i, 'Pinterest'],
  ];
  
  for (const [pattern, name] of inAppPatterns) {
    if (pattern.test(ua)) {
      return { isInAppBrowser: true, inAppBrowserName: name };
    }
  }
  
  return { isInAppBrowser: false, inAppBrowserName: null };
}

function detectPWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check various PWA indicators
  const isStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const isIOSStandalone = (window.navigator as any)?.standalone === true;
  const isFullscreen = window.matchMedia?.('(display-mode: fullscreen)')?.matches;
  
  return isStandalone || isIOSStandalone || isFullscreen;
}

function detectCameraSupport(
  platform: string,
  browser: string,
  isWebView: boolean
): BrowserInfo['cameraSupport'] {
  const hasMediaDevices = typeof navigator !== 'undefined' && !!navigator.mediaDevices;
  const hasGetUserMedia = hasMediaDevices && !!navigator.mediaDevices.getUserMedia;
  const hasEnumerateDevices = hasMediaDevices && !!navigator.mediaDevices.enumerateDevices;
  const isSecureContext = typeof window !== 'undefined' && !!window.isSecureContext;
  
  // iOS Safari always requires user gesture
  // Android WebView may require user gesture depending on version
  const requiresUserGesture = 
    platform === 'ios' || 
    isWebView ||
    (platform === 'android' && browser !== 'chrome');
  
  // Back camera support - most modern browsers support facingMode: 'environment'
  const supportsBackCamera = hasGetUserMedia && (platform === 'ios' || platform === 'android');
  
  // Torch support - only available on some Android devices via ImageCapture API
  const supportsTorch = 
    platform === 'android' && 
    browser === 'chrome' && 
    !isWebView &&
    typeof (window as any).ImageCapture !== 'undefined';

  return {
    hasMediaDevices,
    hasGetUserMedia,
    hasEnumerateDevices,
    isSecureContext,
    requiresUserGesture,
    supportsBackCamera,
    supportsTorch,
  };
}

function getRecommendedScanner(info: {
  platform: string;
  browser: string;
  isWebView: boolean;
  isInAppBrowser: boolean;
  cameraSupport: BrowserInfo['cameraSupport'];
}): { recommendedScanner: BrowserInfo['recommendedScanner']; scannerNotes: string[] } {
  const notes: string[] = [];
  
  // No camera support at all
  if (!info.cameraSupport.hasGetUserMedia) {
    notes.push('Camera API not available - manual entry only');
    return { recommendedScanner: 'manual-only', scannerNotes: notes };
  }
  
  // Insecure context
  if (!info.cameraSupport.isSecureContext) {
    notes.push('HTTPS required for camera access');
    return { recommendedScanner: 'manual-only', scannerNotes: notes };
  }
  
  // Check for native BarcodeDetector API (Chrome 83+, Edge 83+)
  if (typeof (window as any).BarcodeDetector !== 'undefined') {
    notes.push('Native BarcodeDetector API available');
    // Still prefer html5-qrcode as it has better format support
  }
  
  // In-app browsers often have camera issues
  if (info.isInAppBrowser) {
    notes.push('In-app browser detected - camera may be restricted');
    notes.push('Consider opening in system browser for best experience');
    return { recommendedScanner: 'html5-qrcode', scannerNotes: notes };
  }
  
  // Android WebView needs special handling
  if (info.isWebView && info.platform === 'android') {
    notes.push('Android WebView detected - using html5-qrcode for better compatibility');
    notes.push('Camera permissions must be granted in app settings');
    return { recommendedScanner: 'html5-qrcode', scannerNotes: notes };
  }
  
  // iOS WebView (WKWebView)
  if (info.isWebView && info.platform === 'ios') {
    notes.push('iOS WebView detected - camera access may be limited');
    notes.push('Best experience in Safari browser');
    return { recommendedScanner: 'html5-qrcode', scannerNotes: notes };
  }
  
  // iOS Safari - works well with both, but html5-qrcode has better UX
  if (info.platform === 'ios' && info.browser === 'safari') {
    notes.push('iOS Safari - requires tap to start camera');
    return { recommendedScanner: 'html5-qrcode', scannerNotes: notes };
  }
  
  // Samsung Internet has some quirks
  if (info.browser === 'samsung') {
    notes.push('Samsung Internet detected - using html5-qrcode');
    return { recommendedScanner: 'html5-qrcode', scannerNotes: notes };
  }
  
  // Desktop browsers - ZXing works well
  if (info.platform === 'windows' || info.platform === 'macos' || info.platform === 'linux') {
    notes.push('Desktop browser - optimal scanning experience');
    return { recommendedScanner: 'zxing', scannerNotes: notes };
  }
  
  // Default to html5-qrcode for better mobile compatibility
  notes.push('Mobile browser - using html5-qrcode for best compatibility');
  return { recommendedScanner: 'html5-qrcode', scannerNotes: notes };
}

function getServerSideFallback(): BrowserInfo {
  return {
    browser: 'unknown',
    browserVersion: 'unknown',
    platform: 'unknown',
    platformVersion: 'unknown',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isWebView: false,
    isAndroidWebView: false,
    isIOSWebView: false,
    isInAppBrowser: false,
    inAppBrowserName: null,
    isPWA: false,
    isStandalone: false,
    cameraSupport: {
      hasMediaDevices: false,
      hasGetUserMedia: false,
      hasEnumerateDevices: false,
      isSecureContext: false,
      requiresUserGesture: true,
      supportsBackCamera: false,
      supportsTorch: false,
    },
    recommendedScanner: 'manual-only',
    scannerNotes: ['Server-side rendering - browser detection unavailable'],
  };
}

/**
 * Get user-friendly message for camera issues based on browser
 */
export function getCameraIssueMessage(browserInfo: BrowserInfo): string {
  if (browserInfo.isInAppBrowser) {
    return `Camera access may be limited in ${browserInfo.inAppBrowserName || 'this app'}. For best results, open this page in ${browserInfo.platform === 'ios' ? 'Safari' : 'Chrome'}.`;
  }
  
  if (browserInfo.isAndroidWebView) {
    return 'Camera access requires permission from the app. Check app settings to enable camera.';
  }
  
  if (browserInfo.isIOSWebView) {
    return 'Camera access may be limited. For best results, open this page in Safari.';
  }
  
  if (!browserInfo.cameraSupport.isSecureContext) {
    return 'Camera requires a secure connection (HTTPS). Please access this site via https://';
  }
  
  if (!browserInfo.cameraSupport.hasGetUserMedia) {
    return `Your browser (${browserInfo.browser}) does not support camera access. Please update to a modern browser.`;
  }
  
  return 'Unable to access camera. Please check your browser settings and permissions.';
}

/**
 * Check if we should show "Open in Browser" prompt
 */
export function shouldShowOpenInBrowser(browserInfo: BrowserInfo): boolean {
  return browserInfo.isInAppBrowser || browserInfo.isWebView;
}

/**
 * Get the deep link to open current page in system browser
 */
export function getOpenInBrowserLink(browserInfo: BrowserInfo): string | null {
  if (typeof window === 'undefined') return null;
  
  const currentUrl = window.location.href;
  
  // For Android, we can try intent:// scheme
  if (browserInfo.platform === 'android') {
    // This opens the URL in Chrome
    return `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
  }
  
  // For iOS, there's no reliable way to force Safari
  // Just return the current URL
  return currentUrl;
}
