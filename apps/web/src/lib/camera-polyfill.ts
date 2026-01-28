'use client';

/**
 * Camera Polyfill and Cross-Browser Compatibility Layer
 * 
 * This module provides robust camera access across different browsers,
 * especially mobile browsers that may have inconsistent implementations.
 * 
 * Supported browsers:
 * - Chrome (Desktop & Mobile)
 * - Firefox (Desktop & Mobile)
 * - Safari (Desktop & iOS)
 * - Edge (Chromium-based)
 * - Samsung Internet
 * - Opera
 * 
 * Key features:
 * - Automatic polyfill initialization
 * - Legacy getUserMedia fallback
 * - Mobile-specific optimizations
 * - Detailed error reporting
 */

let polyfillInitialized = false;
let polyfillError: string | null = null;

/**
 * Initialize the WebRTC adapter polyfill
 * This should be called before any camera operations
 */
export async function initializeCameraPolyfill(): Promise<{ success: boolean; error?: string }> {
  if (polyfillInitialized) {
    return { success: true };
  }

  if (typeof window === 'undefined') {
    return { success: false, error: 'Cannot initialize on server' };
  }

  try {
    // Apply legacy getUserMedia polyfill (handles all browser compatibility)
    applyLegacyPolyfill();

    console.log('[CameraPolyfill] Initialized with legacy polyfill');
    polyfillInitialized = true;
    return { success: true };
  } catch (err: any) {
    console.error('[CameraPolyfill] Failed to initialize:', err);
    polyfillError = err?.message || 'Failed to load camera polyfill';
    polyfillInitialized = true; // Mark as initialized to prevent retry loops
    return { success: true }; // Still return success since basic functionality may work
  }
}

/**
 * Apply legacy getUserMedia polyfill for older browsers
 */
function applyLegacyPolyfill(): void {
  if (typeof navigator === 'undefined') return;

  // Polyfill navigator.mediaDevices if not present
  if (!navigator.mediaDevices) {
    (navigator as any).mediaDevices = {};
  }

  // Polyfill getUserMedia if not present
  if (!navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia = function(constraints: MediaStreamConstraints): Promise<MediaStream> {
      // Get the legacy getUserMedia function
      const getUserMedia = 
        (navigator as any).getUserMedia ||
        (navigator as any).webkitGetUserMedia ||
        (navigator as any).mozGetUserMedia ||
        (navigator as any).msGetUserMedia;

      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not supported in this browser'));
      }

      // Wrap the legacy callback-based API in a Promise
      return new Promise((resolve, reject) => {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }

  // Polyfill enumerateDevices if not present
  if (!navigator.mediaDevices.enumerateDevices) {
    navigator.mediaDevices.enumerateDevices = function(): Promise<MediaDeviceInfo[]> {
      // Return empty array if not supported - better than throwing
      return Promise.resolve([]);
    };
  }

  console.log('[CameraPolyfill] Legacy polyfill applied');
}

/**
 * Check if camera is supported with detailed diagnostics
 */
export function checkCameraSupport(): {
  supported: boolean;
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  hasLegacyGetUserMedia: boolean;
  isSecureContext: boolean;
  protocol: string;
  userAgent: string;
  browserInfo: { browser: string; version: string } | null;
  recommendations: string[];
} {
  const recommendations: string[] = [];
  
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      supported: false,
      hasMediaDevices: false,
      hasGetUserMedia: false,
      hasLegacyGetUserMedia: false,
      isSecureContext: false,
      protocol: 'unknown',
      userAgent: 'unknown',
      browserInfo: null,
      recommendations: ['Camera not available on server'],
    };
  }

  const hasMediaDevices = !!navigator.mediaDevices;
  const hasGetUserMedia = !!(navigator.mediaDevices?.getUserMedia);
  const hasLegacyGetUserMedia = !!(
    (navigator as any).getUserMedia ||
    (navigator as any).webkitGetUserMedia ||
    (navigator as any).mozGetUserMedia
  );
  
  const protocol = window.location?.protocol || 'unknown';
  const hostname = window.location?.hostname || 'unknown';
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  const isSecureContext = !!(window.isSecureContext || protocol === 'https:' || isLocalhost);
  
  // Detect browser
  const ua = navigator.userAgent;
  let browserInfo: { browser: string; version: string } | null = null;
  
  if (ua.includes('Chrome')) {
    const match = ua.match(/Chrome\/(\d+)/);
    browserInfo = { browser: 'Chrome', version: match?.[1] || 'unknown' };
  } else if (ua.includes('Firefox')) {
    const match = ua.match(/Firefox\/(\d+)/);
    browserInfo = { browser: 'Firefox', version: match?.[1] || 'unknown' };
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    const match = ua.match(/Version\/(\d+)/);
    browserInfo = { browser: 'Safari', version: match?.[1] || 'unknown' };
  } else if (ua.includes('Edge')) {
    const match = ua.match(/Edge\/(\d+)/);
    browserInfo = { browser: 'Edge', version: match?.[1] || 'unknown' };
  }

  // Generate recommendations
  if (!isSecureContext) {
    recommendations.push('Camera requires HTTPS. Please access this site via https://');
  }
  
  if (!hasMediaDevices && !hasLegacyGetUserMedia) {
    recommendations.push('Your browser does not support camera access. Please update to a modern browser.');
  }
  
  if (browserInfo?.browser === 'Safari' && parseInt(browserInfo.version) < 14) {
    recommendations.push('Safari 14+ is required for camera access. Please update Safari.');
  }

  const supported = (hasMediaDevices || hasLegacyGetUserMedia) && isSecureContext;

  return {
    supported,
    hasMediaDevices,
    hasGetUserMedia,
    hasLegacyGetUserMedia,
    isSecureContext,
    protocol,
    userAgent: ua,
    browserInfo,
    recommendations,
  };
}

/**
 * Request camera access with mobile-optimized constraints
 * This function handles the complexity of different mobile browsers
 */
export async function requestCameraAccess(options?: {
  preferBackCamera?: boolean;
  lowResolution?: boolean;
}): Promise<{ stream: MediaStream | null; error?: string }> {
  // Ensure polyfill is initialized
  await initializeCameraPolyfill();

  const support = checkCameraSupport();
  
  if (!support.supported) {
    return {
      stream: null,
      error: support.recommendations[0] || 'Camera not supported',
    };
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isMobile = isIOS || isAndroid;

  // Build constraints based on device type
  const constraints: MediaStreamConstraints[] = [];

  if (isMobile) {
    // Mobile: Start with back camera + continuous focus for barcode scanning
    // FOCUS FIX: focusMode: 'continuous' is CRITICAL for auto-focusing on barcodes
    // NOTE: Order matters - iOS Safari works better with 'ideal' facingMode
    // Note: focusMode is supported by mobile browsers but not in TS MediaTrackConstraints type
    const focusConstraints = { 
      facingMode: { ideal: 'environment' }, 
      width: { ideal: 1280 }, 
      height: { ideal: 720 } 
    } as MediaTrackConstraints;
    (focusConstraints as any).focusMode = 'continuous'; // Critical for barcode scanning
    
    const focusOnlyConstraints = { facingMode: { ideal: 'environment' } } as MediaTrackConstraints;
    (focusOnlyConstraints as any).focusMode = 'continuous';
    
    constraints.push(
      // 1. Back camera with continuous focus and good resolution (optimal for barcodes)
      { video: focusConstraints },
      // 2. Back camera with focus only (fallback if resolution fails)
      { video: focusOnlyConstraints },
      // 3. Back camera with ideal constraint only (fallback if focus not supported)
      { video: { facingMode: { ideal: 'environment' } } },
      // 4. Back camera preference (may fail on some devices)
      { video: { facingMode: 'environment' } },
      // 5. Simplest - just video (final fallback)
      { video: true },
    );
  } else {
    // Desktop: Can use more specific constraints
    constraints.push(
      { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: { width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: true },
    );
  }

  // Try each constraint set until one works
  let lastError: any = null;
  
  for (const constraint of constraints) {
    try {
      console.log('[CameraPolyfill] Trying constraints:', JSON.stringify(constraint));
      const stream = await navigator.mediaDevices.getUserMedia(constraint);
      console.log('[CameraPolyfill] Success with constraints:', JSON.stringify(constraint));
      return { stream };
    } catch (err: any) {
      console.log('[CameraPolyfill] Failed with constraints:', constraint, err.name);
      lastError = err;
      
      // If permission denied, don't try other constraints
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        break;
      }
    }
  }

  // All constraints failed
  const errorMessage = getErrorMessage(lastError);
  return { stream: null, error: errorMessage };
}

/**
 * Get user-friendly error message from camera error
 */
function getErrorMessage(err: any): string {
  if (!err) return 'Unknown camera error';

  // Handle string errors
  if (typeof err === 'string') {
    return err;
  }

  // Get error name, handling various error object shapes
  const errorName = err.name || err.constructor?.name || 'Unknown';
  
  switch (errorName) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Camera permission denied. Please allow camera access in your browser settings.';
    
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera found on this device.';
    
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Camera is in use by another application. Please close other apps using the camera.';
    
    case 'OverconstrainedError':
      return 'Camera does not support the requested settings.';
    
    case 'SecurityError':
      return 'Camera access blocked by security policy. Please use HTTPS.';
    
    case 'AbortError':
      return 'Camera access was interrupted. Please try again.';
    
    case 'TypeError':
      return 'Invalid camera configuration. Please try again.';
    
    default:
      // MOBILE FIX: Try to extract message from various properties
      const message = err.message || err.error?.message || '';
      if (message) {
        return message;
      }
      // Try toString as last resort
      try {
        const str = String(err);
        if (str && str !== '[object Object]') {
          return str;
        }
      } catch {
        // Ignore toString errors
      }
      return `Camera error: ${errorName}`;
  }
}

/**
 * Stop all tracks in a media stream
 */
export function stopMediaStream(stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
    });
  }
}
