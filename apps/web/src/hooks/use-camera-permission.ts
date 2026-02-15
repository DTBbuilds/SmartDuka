'use client';

import { useState, useEffect, useCallback } from 'react';
import { initializeCameraPolyfill, checkCameraSupport, requestCameraAccess, stopMediaStream } from '@/lib/camera-polyfill';

export type CameraPermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable' | 'checking';

export interface CameraPermissionResult {
  state: CameraPermissionState;
  isGranted: boolean;
  isDenied: boolean;
  isPrompt: boolean;
  isUnavailable: boolean;
  isChecking: boolean;
  error: string | null;
  diagnostics: CameraDiagnostics | null;
  requestPermission: () => Promise<boolean>;
  checkPermission: () => Promise<CameraPermissionState>;
}

export interface CameraDiagnostics {
  hasWindow: boolean;
  hasNavigator: boolean;
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  hasLegacyGetUserMedia: boolean;
  isSecureContext: boolean;
  protocol: string;
  userAgent: string;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  browserInfo: { browser: string; version: string } | null;
  recommendations: string[];
}

/**
 * Perform comprehensive browser capability diagnostics
 */
function getDiagnostics(): CameraDiagnostics {
  const support = checkCameraSupport();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const uaLower = ua.toLowerCase();
  
  return {
    hasWindow: typeof window !== 'undefined',
    hasNavigator: typeof navigator !== 'undefined',
    hasMediaDevices: support.hasMediaDevices,
    hasGetUserMedia: support.hasGetUserMedia,
    hasLegacyGetUserMedia: support.hasLegacyGetUserMedia,
    isSecureContext: support.isSecureContext,
    protocol: support.protocol,
    userAgent: support.userAgent,
    isIOS: /iPad|iPhone|iPod/.test(ua),
    isAndroid: /Android/.test(ua),
    isSafari: uaLower.includes('safari') && !uaLower.includes('chrome') && !uaLower.includes('crios'),
    isChrome: uaLower.includes('chrome') || uaLower.includes('crios'),
    isFirefox: uaLower.includes('firefox') || uaLower.includes('fxios'),
    browserInfo: support.browserInfo,
    recommendations: support.recommendations,
  };
}

/**
 * Hook to manage camera permissions for barcode scanning
 * 
 * Features:
 * - Check current permission state
 * - Request camera permission
 * - Handle all permission states gracefully
 * - Provide user-friendly error messages
 * - Comprehensive browser compatibility
 */
export function useCameraPermission(): CameraPermissionResult {
  const [state, setState] = useState<CameraPermissionState>('checking');
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<CameraDiagnostics | null>(null);

  /**
   * Check current camera permission state
   * Uses the camera polyfill for cross-browser compatibility
   */
  const checkPermission = useCallback(async (): Promise<CameraPermissionState> => {
    // Initialize polyfill first
    await initializeCameraPolyfill();
    
    // Update diagnostics
    const diag = getDiagnostics();
    setDiagnostics(diag);
    
    // Check if camera is supported using polyfill
    const support = checkCameraSupport();
    
    if (!support.supported) {
      setState('unavailable');
      const reason = support.recommendations[0] || 'Camera not available. Ensure you are using HTTPS and a modern browser.';
      setError(reason);
      console.warn('[Camera] Not available:', reason, diag);
      return 'unavailable';
    }

    try {
      // Use Permissions API if available (not supported in Safari)
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
          // Safari doesn't support camera permission query - fall through
          console.log('[Camera] Permissions API not supported for camera, using fallback');
        }
      }
      
      // Fallback: try to enumerate devices (after polyfill is applied)
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(d => d.kind === 'videoinput');
          
          // On iOS Safari and some Android browsers, enumerateDevices returns empty
          // until permission is granted. Don't treat this as "no camera".
          if (videoDevices.length === 0) {
            console.log('[Camera] No video devices enumerated - assuming permission needed');
            setState('prompt');
            return 'prompt';
          }
          
          // If we can see device labels, permission was granted before
          const hasLabels = videoDevices.some(d => d.label && d.label.length > 0);
          if (hasLabels) {
            setState('granted');
            return 'granted';
          }
        }
      } catch (enumErr) {
        console.log('[Camera] enumerateDevices failed:', enumErr);
      }
      
      // Default to prompt - let user try to request permission
      setState('prompt');
      return 'prompt';
    } catch (err) {
      console.error('[Camera] Error checking permission:', err);
      // Be optimistic - let user try anyway
      setState('prompt');
      return 'prompt';
    }
  }, []);

  /**
   * Request camera permission using the polyfill
   * 
   * IMPORTANT: On mobile browsers (especially iOS Safari and some Android browsers),
   * camera permission must be requested in response to a user gesture (tap/click).
   * This function should be called from a button click handler, not automatically.
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    // Initialize polyfill first
    await initializeCameraPolyfill();
    
    // Check if camera is supported
    const support = checkCameraSupport();
    if (!support.supported) {
      const reason = support.recommendations[0] || 'Camera not available. Ensure you are using HTTPS and a modern browser.';
      setError(reason);
      setState('unavailable');
      return false;
    }

    try {
      setError(null);
      setState('checking');
      
      // Use the polyfill's requestCameraAccess which handles all the complexity
      const result = await requestCameraAccess({ preferBackCamera: true });
      
      if (result.stream) {
        // Permission granted - stop the stream
        stopMediaStream(result.stream);
        
        // MOBILE FIX: Wait for camera to be fully released
        // Mobile browsers need time to release camera resources
        await new Promise(resolve => setTimeout(resolve, 200));
        
        setState('granted');
        return true;
      } else {
        // Handle error from polyfill
        setError(result.error || 'Failed to access camera');
        
        // Determine state based on error message
        if (result.error?.includes('denied')) {
          setState('denied');
        } else if (result.error?.includes('not found') || result.error?.includes('not supported')) {
          setState('unavailable');
        } else {
          setState('denied');
        }
        return false;
      }
    } catch (err: any) {
      console.error('Camera permission error:', err);
      setState('denied');
      setError(`Camera error: ${err.message || 'Unknown error'}. Please try again.`);
      return false;
    }
  }, []);

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
    diagnostics,
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
