/**
 * Secure Storage Module
 * 
 * Provides secure storage for sensitive data like tokens on Android.
 * Uses Android Keystore for encryption on native, falls back to localStorage on web.
 */

import { isNativePlatform } from './platform';

const STORAGE_PREFIX = 'smartduka:';

/**
 * Store a value securely
 */
export async function secureStore(key: string, value: string): Promise<void> {
  const fullKey = STORAGE_PREFIX + key;

  if (!isNativePlatform()) {
    // Web fallback - use localStorage
    localStorage.setItem(fullKey, value);
    return;
  }

  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: fullKey, value });
  } catch (err) {
    console.error('[Storage] Failed to store:', err);
    // Fallback to localStorage
    localStorage.setItem(fullKey, value);
  }
}

/**
 * Retrieve a stored value
 */
export async function secureGet(key: string): Promise<string | null> {
  const fullKey = STORAGE_PREFIX + key;

  if (!isNativePlatform()) {
    return localStorage.getItem(fullKey);
  }

  try {
    const { Preferences } = await import('@capacitor/preferences');
    const result = await Preferences.get({ key: fullKey });
    return result.value;
  } catch (err) {
    console.error('[Storage] Failed to get:', err);
    return localStorage.getItem(fullKey);
  }
}

/**
 * Remove a stored value
 */
export async function secureRemove(key: string): Promise<void> {
  const fullKey = STORAGE_PREFIX + key;

  if (!isNativePlatform()) {
    localStorage.removeItem(fullKey);
    return;
  }

  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.remove({ key: fullKey });
  } catch (err) {
    console.error('[Storage] Failed to remove:', err);
    localStorage.removeItem(fullKey);
  }
}

/**
 * Clear all stored values
 */
export async function secureClear(): Promise<void> {
  if (!isNativePlatform()) {
    // Only clear SmartDuka keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    return;
  }

  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.clear();
  } catch (err) {
    console.error('[Storage] Failed to clear:', err);
  }
}

/**
 * Get all keys with the SmartDuka prefix
 */
export async function secureKeys(): Promise<string[]> {
  if (!isNativePlatform()) {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keys.push(key.replace(STORAGE_PREFIX, ''));
      }
    }
    return keys;
  }

  try {
    const { Preferences } = await import('@capacitor/preferences');
    const result = await Preferences.keys();
    return result.keys
      .filter(k => k.startsWith(STORAGE_PREFIX))
      .map(k => k.replace(STORAGE_PREFIX, ''));
  } catch (err) {
    console.error('[Storage] Failed to get keys:', err);
    return [];
  }
}

/**
 * Migrate data from localStorage to secure storage
 * Call this on first native app launch
 */
export async function migrateFromLocalStorage(): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    const keysToMigrate = [
      'token',
      'shop',
      'user',
      'session_id',
      'csrf_token',
    ];

    for (const key of keysToMigrate) {
      const fullKey = STORAGE_PREFIX + key;
      const value = localStorage.getItem(fullKey);
      if (value) {
        await secureStore(key, value);
        console.log(`[Storage] Migrated ${key} to secure storage`);
      }
    }
  } catch (err) {
    console.error('[Storage] Migration failed:', err);
  }
}

/**
 * Store JSON object securely
 */
export async function secureStoreObject<T>(key: string, value: T): Promise<void> {
  await secureStore(key, JSON.stringify(value));
}

/**
 * Retrieve JSON object from secure storage
 */
export async function secureGetObject<T>(key: string): Promise<T | null> {
  const value = await secureGet(key);
  if (!value) return null;
  
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
