import type { BrowserInfo } from './browser-detection';

export type CameraDecodeEngine = 'zxing' | 'html5-qrcode';

/**
 * On Android Chromium (including Brave's Chrome-compatible UA) prefer the
 * scanner that owns exactly one getUserMedia stream and passes it to ZXing.
 * Embedded WebViews / Safari / Firefox retain the existing HTML5 implementation.
 * Both engines remain available via an explicit user-controlled fallback.
 */
export function preferredCameraEngine(info: Pick<BrowserInfo, 'platform' | 'browser' | 'isWebView' | 'isInAppBrowser' | 'recommendedScanner'>): CameraDecodeEngine {
  if (info.platform === 'android' && info.browser === 'chrome' && !info.isWebView && !info.isInAppBrowser) {
    return 'zxing';
  }
  return info.recommendedScanner === 'zxing' ? 'zxing' : 'html5-qrcode';
}

export function alternateCameraEngine(engine: CameraDecodeEngine): CameraDecodeEngine {
  return engine === 'zxing' ? 'html5-qrcode' : 'zxing';
}
