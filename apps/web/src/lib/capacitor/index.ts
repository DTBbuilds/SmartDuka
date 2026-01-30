/**
 * Capacitor Native Bridge
 * 
 * This module provides a unified interface for native functionality
 * that works both on web (PWA) and native Android (APK).
 * 
 * Features:
 * - Platform detection
 * - Native camera access
 * - Haptic feedback
 * - App updates
 * - Deep linking
 * - Push notifications
 */

export * from './platform';
export * from './camera';
export * from './haptics';
export * from './app-update';
export * from './storage';
export * from './network';
export * from './version-sync';
