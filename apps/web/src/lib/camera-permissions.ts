/**
 * Camera permissions utilities
 */

export interface PermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
  error?: string;
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

    return {
      granted: false,
      denied: error?.name === "NotAllowedError",
      prompt: error?.name === "NotFoundError",
      error: error?.message,
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
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((device) => device.kind === "videoinput");
  } catch (error) {
    console.error("Failed to enumerate devices:", error);
    return false;
  }
}
