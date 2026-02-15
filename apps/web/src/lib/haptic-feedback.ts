/**
 * Haptic Feedback Utility
 * Provides haptic feedback for touch interactions
 * Falls back gracefully on devices without haptic support
 */

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

/**
 * Trigger haptic feedback
 * @param pattern - Type of haptic feedback
 */
export function triggerHaptic(pattern: HapticPattern = 'light'): void {
  // Check if device supports vibration API
  if (!navigator.vibrate) {
    return;
  }

  // Define vibration patterns (in milliseconds)
  const patterns: Record<HapticPattern, number | number[]> = {
    light: 10,           // Short, light vibration
    medium: 20,          // Medium vibration
    heavy: 30,           // Long, heavy vibration
    success: [10, 5, 10],    // Double tap pattern
    error: [30, 10, 30],     // Strong double tap
    warning: [20, 10, 20, 10, 20], // Triple tap
  };

  try {
    navigator.vibrate(patterns[pattern]);
  } catch (error) {
    // Silently fail if vibration is not supported
    console.debug('Haptic feedback not supported');
  }
}

/**
 * Trigger haptic feedback on button click
 * @param event - Click event
 * @param pattern - Type of haptic feedback
 */
export function onButtonClick(event: React.MouseEvent, pattern: HapticPattern = 'light'): void {
  triggerHaptic(pattern);
}

/**
 * Trigger haptic feedback on successful action
 */
export function hapticSuccess(): void {
  triggerHaptic('success');
}

/**
 * Trigger haptic feedback on error
 */
export function hapticError(): void {
  triggerHaptic('error');
}

/**
 * Trigger haptic feedback on warning
 */
export function hapticWarning(): void {
  triggerHaptic('warning');
}
