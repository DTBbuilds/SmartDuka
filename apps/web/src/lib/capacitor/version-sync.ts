/**
 * Version Sync System
 * 
 * Ensures the APK and web app versions stay synchronized.
 * Handles version checking, update prompts, and compatibility validation.
 */

import { isNativePlatform, getAppVersion } from './platform';

export interface VersionInfo {
  web: string;
  apk: string;
  apiMinVersion: string;
  isCompatible: boolean;
  updateRequired: boolean;
  updateRecommended: boolean;
}

export interface AppVersionConfig {
  version: string;
  buildNumber: number;
  releaseDate: string;
  minApiVersion: string;
  features: string[];
  changelog: string[];
}

// Current app version (updated during build)
export const APP_VERSION = '1.0.0';
export const BUILD_NUMBER = 1;
export const RELEASE_DATE = '2026-01-30';

/**
 * Get current version info
 */
export async function getVersionInfo(): Promise<VersionInfo> {
  const apkVersion = isNativePlatform() ? await getAppVersion() : APP_VERSION;
  
  try {
    // Fetch latest version info from server
    const response = await fetch('https://smarduka.onrender.com/api/v1/app-version', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch version info');
    }

    const data = await response.json();
    
    const isCompatible = compareVersions(apkVersion, data.minAppVersion || '1.0.0') >= 0;
    const updateRequired = !isCompatible;
    const updateRecommended = compareVersions(apkVersion, data.latestVersion || '1.0.0') < 0;

    return {
      web: data.webVersion || APP_VERSION,
      apk: apkVersion,
      apiMinVersion: data.minAppVersion || '1.0.0',
      isCompatible,
      updateRequired,
      updateRecommended,
    };
  } catch (err) {
    console.warn('[Version] Failed to fetch version info:', err);
    return {
      web: APP_VERSION,
      apk: apkVersion,
      apiMinVersion: '1.0.0',
      isCompatible: true,
      updateRequired: false,
      updateRecommended: false,
    };
  }
}

/**
 * Compare two semantic versions
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }
  
  return 0;
}

/**
 * Check if update is required before allowing app use
 */
export async function checkUpdateRequired(): Promise<{
  required: boolean;
  storeUrl?: string;
  message?: string;
}> {
  const versionInfo = await getVersionInfo();
  
  if (versionInfo.updateRequired) {
    return {
      required: true,
      storeUrl: 'https://play.google.com/store/apps/details?id=com.smartduka.pos',
      message: `Please update SmartDuka to version ${versionInfo.apiMinVersion} or later to continue using the app.`,
    };
  }
  
  return { required: false };
}

/**
 * Get release notes for current version
 */
export async function getReleaseNotes(): Promise<string[]> {
  try {
    const response = await fetch(
      `https://smarduka.onrender.com/api/v1/app-version/changelog/${APP_VERSION}`,
      { method: 'GET' }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.changelog || [];
  } catch {
    return [];
  }
}

/**
 * Report current app version to server (for analytics)
 */
export async function reportAppVersion(): Promise<void> {
  if (!isNativePlatform()) return;
  
  try {
    const apkVersion = await getAppVersion();
    
    await fetch('https://smarduka.onrender.com/api/v1/app-version/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'android',
        version: apkVersion,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.warn('[Version] Failed to report version:', err);
  }
}

/**
 * Get version display string
 */
export function getVersionDisplayString(): string {
  return `v${APP_VERSION} (${BUILD_NUMBER})`;
}

/**
 * Check if a specific feature is available in current version
 */
export function isFeatureAvailable(feature: string, minVersion: string): boolean {
  return compareVersions(APP_VERSION, minVersion) >= 0;
}
