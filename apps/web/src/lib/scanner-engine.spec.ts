import { alternateCameraEngine, preferredCameraEngine } from './scanner-engine';

const info = (browser: 'chrome' | 'firefox' | 'safari', platform: 'android' | 'ios' | 'windows', recommendedScanner: 'zxing' | 'html5-qrcode', isWebView = false) => ({
  browser, platform, recommendedScanner, isWebView, isInAppBrowser: false,
});

describe('cross-browser camera engine selection', () => {
  it('prefers direct-stream ZXing for Chrome and Brave Android Chromium UA', () => {
    expect(preferredCameraEngine(info('chrome', 'android', 'html5-qrcode'))).toBe('zxing');
  });
  it('preserves working Firefox/Safari and Android WebView paths', () => {
    expect(preferredCameraEngine(info('firefox', 'android', 'html5-qrcode'))).toBe('html5-qrcode');
    expect(preferredCameraEngine(info('safari', 'ios', 'html5-qrcode'))).toBe('html5-qrcode');
    expect(preferredCameraEngine(info('chrome', 'android', 'html5-qrcode', true))).toBe('html5-qrcode');
  });
  it('allows user-controlled alternate decoder without infinite auto-retry', () => {
    expect(alternateCameraEngine('zxing')).toBe('html5-qrcode');
    expect(alternateCameraEngine('html5-qrcode')).toBe('zxing');
  });
});
