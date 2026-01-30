/**
 * Haptic Feedback Module
 * 
 * Provides native haptic feedback for better UX on Android.
 * Falls back to vibration API on web.
 */

import { isNativePlatform } from './platform';

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export type HapticNotificationType = 'success' | 'warning' | 'error';

/**
 * Trigger impact haptic feedback
 */
export async function hapticImpact(style: HapticStyle = 'medium'): Promise<void> {
  if (!isNativePlatform()) {
    // Web fallback using Vibration API
    if ('vibrate' in navigator) {
      const duration = style === 'light' ? 10 : style === 'heavy' ? 50 : 25;
      navigator.vibrate(duration);
    }
    return;
  }

  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    
    const styleMap: Record<HapticStyle, any> = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
      success: ImpactStyle.Light,
      warning: ImpactStyle.Medium,
      error: ImpactStyle.Heavy,
    };

    await Haptics.impact({ style: styleMap[style] || ImpactStyle.Medium });
  } catch (err) {
    console.warn('[Haptics] Failed to trigger impact:', err);
    // Fallback to vibration
    if ('vibrate' in navigator) {
      navigator.vibrate(25);
    }
  }
}

/**
 * Trigger notification haptic feedback
 */
export async function hapticNotification(type: HapticNotificationType = 'success'): Promise<void> {
  if (!isNativePlatform()) {
    // Web fallback
    if ('vibrate' in navigator) {
      const patterns: Record<HapticNotificationType, number[]> = {
        success: [10, 50, 10],
        warning: [25, 50, 25],
        error: [50, 100, 50],
      };
      navigator.vibrate(patterns[type] || [25]);
    }
    return;
  }

  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    
    const typeMap: Record<HapticNotificationType, any> = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error,
    };

    await Haptics.notification({ type: typeMap[type] || NotificationType.Success });
  } catch (err) {
    console.warn('[Haptics] Failed to trigger notification:', err);
  }
}

/**
 * Trigger selection changed haptic feedback
 */
export async function hapticSelection(): Promise<void> {
  if (!isNativePlatform()) {
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
    return;
  }

  try {
    const { Haptics } = await import('@capacitor/haptics');
    await Haptics.selectionStart();
    await Haptics.selectionChanged();
    await Haptics.selectionEnd();
  } catch (err) {
    console.warn('[Haptics] Failed to trigger selection:', err);
  }
}

/**
 * Trigger vibration with custom pattern
 */
export async function vibrate(duration: number = 100): Promise<void> {
  if (!isNativePlatform()) {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
    return;
  }

  try {
    const { Haptics } = await import('@capacitor/haptics');
    await Haptics.vibrate({ duration });
  } catch (err) {
    console.warn('[Haptics] Failed to vibrate:', err);
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  }
}

/**
 * Play success feedback (haptic + optional sound)
 */
export async function playSuccessFeedback(): Promise<void> {
  await hapticNotification('success');
}

/**
 * Play error feedback (haptic + optional sound)
 */
export async function playErrorFeedback(): Promise<void> {
  await hapticNotification('error');
}

/**
 * Play scan success feedback (for barcode scanning)
 */
export async function playScanFeedback(): Promise<void> {
  await hapticImpact('medium');
}
