/**
 * Native Camera Module
 * 
 * Provides enhanced camera access for barcode scanning on native Android.
 * Falls back to web APIs when not running in native environment.
 */

import { isNativePlatform } from './platform';

export interface CameraPhoto {
  base64String?: string;
  dataUrl?: string;
  path?: string;
  webPath?: string;
  format: string;
}

export interface BarcodeScanResult {
  hasContent: boolean;
  content: string;
  format: string;
}

/**
 * Check if camera permission is granted
 */
export async function checkCameraPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!isNativePlatform()) {
    // Web fallback
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state as 'granted' | 'denied' | 'prompt';
    } catch {
      return 'prompt';
    }
  }

  try {
    const { Camera } = await import('@capacitor/camera');
    const result = await Camera.checkPermissions();
    return result.camera as 'granted' | 'denied' | 'prompt';
  } catch (err) {
    console.error('[Camera] Failed to check permission:', err);
    return 'prompt';
  }
}

/**
 * Request camera permission
 */
export async function requestCameraPermission(): Promise<'granted' | 'denied'> {
  if (!isNativePlatform()) {
    // Web: Request by accessing camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return 'granted';
    } catch {
      return 'denied';
    }
  }

  try {
    const { Camera } = await import('@capacitor/camera');
    const result = await Camera.requestPermissions({ permissions: ['camera'] });
    return result.camera as 'granted' | 'denied';
  } catch (err) {
    console.error('[Camera] Failed to request permission:', err);
    return 'denied';
  }
}

/**
 * Start native barcode scanner (Android)
 * Uses ML Kit for fast, accurate scanning
 */
export async function startNativeBarcodeScanner(): Promise<BarcodeScanResult | null> {
  if (!isNativePlatform()) {
    console.warn('[Camera] Native barcode scanner only available on Android APK');
    return null;
  }

  try {
    // Use BarcodeScanner plugin if available
    const { BarcodeScanner } = await import('@capacitor-community/barcode-scanner');
    
    // Check and request permission
    const status = await BarcodeScanner.checkPermission({ force: true });
    if (!status.granted) {
      return null;
    }

    // Hide WebView to show camera
    await BarcodeScanner.hideBackground();
    document.body.classList.add('scanner-active');

    const result = await BarcodeScanner.startScan();
    
    // Show WebView again
    await BarcodeScanner.showBackground();
    document.body.classList.remove('scanner-active');

    if (result.hasContent) {
      return {
        hasContent: true,
        content: result.content || '',
        format: result.format || 'unknown',
      };
    }
    return { hasContent: false, content: '', format: '' };
  } catch (err) {
    console.error('[Camera] Native scanner error:', err);
    // Show WebView in case of error
    try {
      const { BarcodeScanner } = await import('@capacitor-community/barcode-scanner');
      await BarcodeScanner.showBackground();
      document.body.classList.remove('scanner-active');
    } catch {}
    return null;
  }
}

/**
 * Stop native barcode scanner
 */
export async function stopNativeBarcodeScanner(): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    const { BarcodeScanner } = await import('@capacitor-community/barcode-scanner');
    await BarcodeScanner.stopScan();
    await BarcodeScanner.showBackground();
    document.body.classList.remove('scanner-active');
  } catch (err) {
    console.error('[Camera] Failed to stop scanner:', err);
  }
}

/**
 * Take a photo using native camera
 */
export async function takePhoto(): Promise<CameraPhoto | null> {
  if (!isNativePlatform()) {
    console.warn('[Camera] Native camera only available on Android APK');
    return null;
  }

  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    });

    return {
      dataUrl: image.dataUrl,
      base64String: image.base64String,
      path: image.path,
      webPath: image.webPath,
      format: image.format,
    };
  } catch (err) {
    console.error('[Camera] Failed to take photo:', err);
    return null;
  }
}

/**
 * Toggle flashlight/torch
 */
export async function toggleFlashlight(enabled: boolean): Promise<boolean> {
  if (!isNativePlatform()) {
    console.warn('[Camera] Flashlight only available on Android APK');
    return false;
  }

  try {
    const { BarcodeScanner } = await import('@capacitor-community/barcode-scanner');
    if (enabled) {
      await BarcodeScanner.enableTorch();
    } else {
      await BarcodeScanner.disableTorch();
    }
    return true;
  } catch (err) {
    console.error('[Camera] Failed to toggle flashlight:', err);
    return false;
  }
}
