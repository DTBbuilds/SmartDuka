/**
 * Camera permissions utilities
 */

export interface PermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
  error?: string;
  errorCode?: "INSECURE_CONTEXT" | "MEDIA_DEVICES_UNAVAILABLE" | "NOT_ALLOWED" | "NOT_FOUND" | "NOT_READABLE" | "SECURITY" | "UNKNOWN";
}

/**
 * Check if the current context supports camera access
 * Camera requires HTTPS (secure context) except for localhost
 */
export function isSecureContextForCamera(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext;
}

/**
 * Check if mediaDevices API is available
 */
export function isMediaDevicesAvailable(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Check camera permission status
 */
export async function checkCameraPermission(): Promise<PermissionStatus> {
  try {
    // Check if permissions API is available
    if (!navigator.permissions) {
      return {
        granted: false,
        denied: false,
        prompt: true,
        error: "Permissions API not available",
      };
    }

    const result = await navigator.permissions.query({ name: "camera" as any });

    return {
      granted: result.state === "granted",
      denied: result.state === "denied",
      prompt: result.state === "prompt",
    };
  } catch (error: any) {
    console.error("Failed to check camera permission:", error);
    return {
      granted: false,
      denied: false,
      prompt: true,
      error: error?.message,
    };
  }
}

/**
 * Request camera permission
 */
export async function requestCameraPermission(): Promise<PermissionStatus> {
  // Pre-flight checks
  if (!isSecureContextForCamera()) {
    return {
      granted: false,
      denied: true,
      prompt: false,
      error: "Camera access requires HTTPS. Please access this page via https:// or localhost.",
      errorCode: "INSECURE_CONTEXT",
    };
  }

  if (!isMediaDevicesAvailable()) {
    return {
      granted: false,
      denied: true,
      prompt: false,
      error: "Camera API not available. Please use a modern browser.",
      errorCode: "MEDIA_DEVICES_UNAVAILABLE",
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });

    // Stop the stream immediately - we just needed to request permission
    stream.getTracks().forEach((track) => track.stop());

    return {
      granted: true,
      denied: false,
      prompt: false,
    };
  } catch (error: any) {
    console.error("Camera permission denied:", error);

    let errorCode: PermissionStatus["errorCode"] = "UNKNOWN";
    if (error?.name === "NotAllowedError") errorCode = "NOT_ALLOWED";
    else if (error?.name === "NotFoundError") errorCode = "NOT_FOUND";
    else if (error?.name === "NotReadableError") errorCode = "NOT_READABLE";
    else if (error?.name === "SecurityError") errorCode = "SECURITY";

    return {
      granted: false,
      denied: error?.name === "NotAllowedError" || error?.name === "SecurityError",
      prompt: error?.name === "NotFoundError",
      error: error?.message,
      errorCode,
    };
  }
}

/**
 * Get user-friendly permission error message
 */
export function getPermissionErrorMessage(status: PermissionStatus): string {
  if (status.granted) {
    return "Camera access granted";
  }

  // Use errorCode for more precise messages
  switch (status.errorCode) {
    case "INSECURE_CONTEXT":
      return "Camera requires HTTPS. Please access this page via https:// or use localhost for development.";
    case "MEDIA_DEVICES_UNAVAILABLE":
      return "Camera API not available. Please use a modern browser (Chrome, Firefox, Safari, Edge).";
    case "NOT_ALLOWED":
      return "Camera permission denied. Please click 'Allow' when prompted, or enable camera in browser settings (Site Settings > Camera).";
    case "NOT_FOUND":
      return "No camera found on this device.";
    case "NOT_READABLE":
      return "Camera is already in use by another application.";
    case "SECURITY":
      return "Camera access blocked by security policy. Check browser permissions.";
  }

  // Fallback to error message parsing
  if (status.denied) {
    return "Camera access denied. Please enable camera permissions in your browser settings.";
  }

  if (status.error?.includes("NotFoundError")) {
    return "No camera found on this device.";
  }

  if (status.error?.includes("NotAllowedError")) {
    return "Camera access was denied. Please try again and allow camera access.";
  }

  if (status.error?.includes("NotReadableError")) {
    return "Camera is already in use by another application.";
  }

  return "Unable to access camera. Please check your browser permissions.";
}

/**
 * Check if camera is available
 */
export async function isCameraAvailable(): Promise<boolean> {
  // Pre-flight checks
  if (!isSecureContextForCamera() || !isMediaDevicesAvailable()) {
    return false;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((device) => device.kind === "videoinput");
  } catch (error) {
    console.error("Failed to enumerate devices:", error);
    return false;
  }
}

/**
 * Get detailed camera availability status for debugging
 */
export function getCameraAvailabilityStatus(): {
  secureContext: boolean;
  mediaDevicesAvailable: boolean;
  canAttemptCamera: boolean;
  reason?: string;
} {
  const secureContext = isSecureContextForCamera();
  const mediaDevicesAvailable = isMediaDevicesAvailable();
  const canAttemptCamera = secureContext && mediaDevicesAvailable;

  let reason: string | undefined;
  if (!secureContext) {
    reason = "Page must be served over HTTPS (or localhost) to access camera";
  } else if (!mediaDevicesAvailable) {
    reason = "Browser does not support mediaDevices API";
  }

  return {
    secureContext,
    mediaDevicesAvailable,
    canAttemptCamera,
    reason,
  };
}
