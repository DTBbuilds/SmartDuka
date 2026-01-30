/**
 * Platform Detection and Utilities
 * 
 * Detects whether the app is running as:
 * - Native Android APK (Capacitor)
 * - Progressive Web App (PWA)
 * - Regular Web Browser
 */

export interface PlatformInfo {
  isNative: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isWeb: boolean;
  isPWA: boolean;
  platform: 'android' | 'ios' | 'web';
  appVersion: string;
  buildNumber: string;
}

let platformInfo: PlatformInfo | null = null;

/**
 * Check if running in Capacitor native environment
 */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

/**
 * Check if running as installed PWA
 */
export function isPWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Get comprehensive platform information
 */
export async function getPlatformInfo(): Promise<PlatformInfo> {
  if (platformInfo) return platformInfo;

  if (typeof window === 'undefined') {
    return {
      isNative: false,
      isAndroid: false,
      isIOS: false,
      isWeb: true,
      isPWA: false,
      platform: 'web',
      appVersion: '0.0.0',
      buildNumber: '0',
    };
  }

  const Capacitor = (window as any).Capacitor;
  const isNative = Capacitor?.isNativePlatform?.() || false;
  
  let appVersion = '0.0.0';
  let buildNumber = '0';

  if (isNative) {
    try {
      // Dynamically import Capacitor App plugin
      const { App } = await import('@capacitor/app');
      const info = await App.getInfo();
      appVersion = info.version;
      buildNumber = info.build;
    } catch (err) {
      console.warn('[Platform] Failed to get app info:', err);
    }
  }

  const platform = Capacitor?.getPlatform?.() || 'web';

  platformInfo = {
    isNative,
    isAndroid: platform === 'android',
    isIOS: platform === 'ios',
    isWeb: platform === 'web',
    isPWA: isPWA(),
    platform,
    appVersion,
    buildNumber,
  };

  return platformInfo;
}

/**
 * Get current app version
 */
export async function getAppVersion(): Promise<string> {
  const info = await getPlatformInfo();
  return info.appVersion;
}

/**
 * Open app settings (for permissions)
 */
export async function openAppSettings(): Promise<void> {
  if (!isNativePlatform()) {
    console.warn('[Platform] openAppSettings only works on native');
    return;
  }

  try {
    const { App } = await import('@capacitor/app');
    // Note: This opens the app's settings page in system settings
    await (App as any).openUrl({ url: 'app-settings:' });
  } catch (err) {
    console.error('[Platform] Failed to open app settings:', err);
  }
}

/**
 * Exit the app (Android only)
 */
export async function exitApp(): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    const { App } = await import('@capacitor/app');
    await App.exitApp();
  } catch (err) {
    console.error('[Platform] Failed to exit app:', err);
  }
}

/**
 * Get device unique identifier
 */
export async function getDeviceId(): Promise<string> {
  if (!isNativePlatform()) {
    // Fall back to localStorage-based ID for web
    let id = localStorage.getItem('smartduka:device_id');
    if (!id) {
      id = 'web_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('smartduka:device_id', id);
    }
    return id;
  }

  try {
    const { Device } = await import('@capacitor/device');
    const info = await Device.getId();
    return info.identifier;
  } catch (err) {
    console.error('[Platform] Failed to get device ID:', err);
    return 'unknown';
  }
}

/**
 * Listen for app state changes (foreground/background)
 */
export async function onAppStateChange(
  callback: (isActive: boolean) => void
): Promise<() => void> {
  if (!isNativePlatform()) {
    // Web fallback using visibility API
    const handler = () => callback(!document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }

  try {
    const { App } = await import('@capacitor/app');
    const listener = await App.addListener('appStateChange', ({ isActive }) => {
      callback(isActive);
    });
    return () => listener.remove();
  } catch (err) {
    console.error('[Platform] Failed to add app state listener:', err);
    return () => {};
  }
}

/**
 * Handle back button (Android)
 */
export async function onBackButton(
  callback: () => void
): Promise<() => void> {
  if (!isNativePlatform()) {
    return () => {};
  }

  try {
    const { App } = await import('@capacitor/app');
    const listener = await App.addListener('backButton', () => {
      callback();
    });
    return () => listener.remove();
  } catch (err) {
    console.error('[Platform] Failed to add back button listener:', err);
    return () => {};
  }
}
