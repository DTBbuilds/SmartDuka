'use client';

import { useState, useEffect, useCallback } from 'react';

export type CameraPermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable' | 'checking';

export interface CameraPermissionResult {
  state: CameraPermissionState;
  isGranted: boolean;
  isDenied: boolean;
  isPrompt: boolean;
  isUnavailable: boolean;
  isChecking: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  checkPermission: () => Promise<CameraPermissionState>;
}

/**
 * Hook to manage camera permissions for barcode scanning
 * 
 * Features:
 * - Check current permission state
 * - Request camera permission
 * - Handle all permission states gracefully
 * - Provide user-friendly error messages
 */
export function useCameraPermission(): CameraPermissionResult {
  const [state, setState] = useState<CameraPermissionState>('checking');
  const [error, setError] = useState<string | null>(null);

  /**
   * Check if camera API is available
   */
  const isCameraAvailable = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
    if (!window.isSecureContext) return false;
    return true;
  }, []);

  /**
   * Check current camera permission state
   */
  const checkPermission = useCallback(async (): Promise<CameraPermissionState> => {
    if (!isCameraAvailable()) {
      setState('unavailable');
      setError('Camera not available. Ensure you are using HTTPS and a modern browser.');
      return 'unavailable';
    }

    try {
      // Use Permissions API if available (not supported in Safari)
      // Safari throws a TypeError when querying 'camera' permission
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
          const permState = result.state as CameraPermissionState;
          setState(permState);
          
          // Listen for permission changes
          result.onchange = () => {
            setState(result.state as CameraPermissionState);
          };
          
          return permState;
        } catch (permError) {
          // Safari doesn't support camera permission query - fall through to device enumeration
          console.log('Permissions API not supported for camera, using fallback');
        }
      }
      
      // Fallback: try to enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        setState('unavailable');
        setError('No camera found on this device.');
        return 'unavailable';
      }
      
      // If we can see device labels, permission was granted before
      // Note: On iOS Safari, labels are only available after permission is granted
      const hasLabels = videoDevices.some(d => d.label && d.label.length > 0);
      if (hasLabels) {
        setState('granted');
        return 'granted';
      }
      
      // Otherwise, permission hasn't been requested yet
      setState('prompt');
      return 'prompt';
    } catch (err) {
      console.error('Error checking camera permission:', err);
      setState('prompt');
      return 'prompt';
    }
  }, [isCameraAvailable]);

  /**
   * Request camera permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isCameraAvailable()) {
      setError('Camera not available. Ensure you are using HTTPS and a modern browser.');
      setState('unavailable');
      return false;
    }

    try {
      setError(null);
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      
      // Permission granted - stop the stream immediately
      stream.getTracks().forEach(track => track.stop());
      
      setState('granted');
      return true;
    } catch (err: any) {
      console.error('Camera permission error:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setState('denied');
        setError('Camera permission denied. Please enable camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setState('unavailable');
        setError('No camera found on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setState('denied');
        setError('Camera is in use by another application. Please close other apps using the camera.');
      } else if (err.name === 'OverconstrainedError') {
        setState('denied');
        setError('Camera does not meet the required constraints.');
      } else if (err.name === 'SecurityError') {
        setState('unavailable');
        setError('Camera access blocked by security policy. Use HTTPS.');
      } else {
        setState('denied');
        setError(`Camera error: ${err.message || 'Unknown error'}`);
      }
      
      return false;
    }
  }, [isCameraAvailable]);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    state,
    isGranted: state === 'granted',
    isDenied: state === 'denied',
    isPrompt: state === 'prompt',
    isUnavailable: state === 'unavailable',
    isChecking: state === 'checking',
    error,
    requestPermission,
    checkPermission,
  };
}

/**
 * Get instructions for enabling camera in different browsers
 */
export function getCameraPermissionInstructions(browser?: string): string {
  const detectedBrowser = browser || detectBrowser();
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);
  
  // iOS-specific instructions
  if (isIOS) {
    if (detectedBrowser === 'safari') {
      return 'Go to Settings > Safari > Camera, or tap the "aA" button in the address bar > Website Settings > Camera > Allow';
    }
    // Chrome/Firefox on iOS use Safari's WebView
    return 'Go to Settings > Safari > Camera and enable access. All browsers on iOS use Safari\'s camera permissions.';
  }
  
  // Android-specific instructions
  if (isAndroid) {
    if (detectedBrowser === 'chrome') {
      return 'Tap the lock icon in the address bar > Permissions > Camera > Allow, or go to Settings > Site Settings > Camera';
    }
    return 'Tap the lock/info icon in the address bar and enable Camera permission';
  }
  
  // Desktop instructions
  switch (detectedBrowser) {
    case 'chrome':
      return 'Click the camera icon in the address bar, or go to Settings > Privacy and Security > Site Settings > Camera';
    case 'firefox':
      return 'Click the camera icon in the address bar, or go to Settings > Privacy & Security > Permissions > Camera';
    case 'safari':
      return 'Go to Safari > Settings for This Website > Camera, or System Preferences > Security & Privacy > Camera';
    case 'edge':
      return 'Click the lock icon in the address bar > Site permissions > Camera';
    default:
      return 'Check your browser settings to enable camera access for this site.';
  }
}

function detectBrowser(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  const ua = navigator.userAgent.toLowerCase();
  
  if (ua.includes('chrome') && !ua.includes('edg')) return 'chrome';
  if (ua.includes('firefox')) return 'firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
  if (ua.includes('edg')) return 'edge';
  
  return 'unknown';
}
