/**
 * App Update Module
 * 
 * Handles over-the-air (OTA) updates for the Android APK.
 * Ensures the APK stays in sync with the web version.
 * 
 * Update Strategy:
 * 1. On app start, check for updates
 * 2. Download update in background
 * 3. Apply update on next app restart
 * 4. Support for mandatory updates for critical fixes
 */

import { isNativePlatform, getAppVersion } from './platform';

export interface UpdateInfo {
  available: boolean;
  version: string;
  buildNumber: string;
  mandatory: boolean;
  releaseNotes?: string;
  downloadUrl?: string;
  size?: number;
}

export interface UpdateProgress {
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
}

export type UpdateStatus = 
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'installing'
  | 'error';

let updateStatus: UpdateStatus = 'idle';
let updateListeners: ((status: UpdateStatus, info?: UpdateInfo) => void)[] = [];

/**
 * Add update status listener
 */
export function onUpdateStatus(
  callback: (status: UpdateStatus, info?: UpdateInfo) => void
): () => void {
  updateListeners.push(callback);
  return () => {
    updateListeners = updateListeners.filter(cb => cb !== callback);
  };
}

/**
 * Notify listeners of status change
 */
function notifyStatusChange(status: UpdateStatus, info?: UpdateInfo): void {
  updateStatus = status;
  updateListeners.forEach(cb => cb(status, info));
}

/**
 * Check for app updates
 */
export async function checkForUpdate(): Promise<UpdateInfo> {
  if (!isNativePlatform()) {
    // Web version - no OTA updates needed
    return {
      available: false,
      version: '0.0.0',
      buildNumber: '0',
      mandatory: false,
    };
  }

  notifyStatusChange('checking');

  try {
    const currentVersion = await getAppVersion();
    
    // Check update server for new version
    const response = await fetch(
      'https://smarduka.onrender.com/api/v1/app-updates/check',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: 'android',
          currentVersion,
          channel: 'stable', // or 'beta'
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to check for updates');
    }

    const data = await response.json();
    
    const updateInfo: UpdateInfo = {
      available: data.updateAvailable || false,
      version: data.version || currentVersion,
      buildNumber: data.buildNumber || '0',
      mandatory: data.mandatory || false,
      releaseNotes: data.releaseNotes,
      downloadUrl: data.downloadUrl,
      size: data.size,
    };

    notifyStatusChange(updateInfo.available ? 'available' : 'idle', updateInfo);
    return updateInfo;
  } catch (err) {
    console.error('[Update] Failed to check for updates:', err);
    notifyStatusChange('error');
    return {
      available: false,
      version: '0.0.0',
      buildNumber: '0',
      mandatory: false,
    };
  }
}

/**
 * Download and apply update
 */
export async function downloadAndApplyUpdate(
  onProgress?: (progress: UpdateProgress) => void
): Promise<boolean> {
  if (!isNativePlatform()) {
    console.warn('[Update] OTA updates only available on native APK');
    return false;
  }

  notifyStatusChange('downloading');

  try {
    // Use Capacitor Updater plugin for live updates
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    
    // Download the update bundle
    const bundle = await CapacitorUpdater.download({
      url: 'https://smarduka.onrender.com/api/v1/app-updates/bundle',
      version: 'latest',
    });

    if (!bundle || !bundle.id) {
      throw new Error('Failed to download update');
    }

    notifyStatusChange('ready');

    // Set the bundle to be used on next restart
    await CapacitorUpdater.set({ id: bundle.id });

    return true;
  } catch (err) {
    console.error('[Update] Failed to download update:', err);
    notifyStatusChange('error');
    return false;
  }
}

/**
 * Apply pending update (restarts app)
 */
export async function applyPendingUpdate(): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    
    // Reload the app with the new bundle
    await CapacitorUpdater.reload();
  } catch (err) {
    console.error('[Update] Failed to apply update:', err);
  }
}

/**
 * Get current update status
 */
export function getUpdateStatus(): UpdateStatus {
  return updateStatus;
}

/**
 * Initialize auto-update checking
 * Call this on app start
 */
export async function initializeAutoUpdate(): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    
    // Notify the update server that the app started successfully
    await CapacitorUpdater.notifyAppReady();

    // Check for updates in background
    setTimeout(async () => {
      const updateInfo = await checkForUpdate();
      
      if (updateInfo.available && updateInfo.mandatory) {
        // Auto-download mandatory updates
        await downloadAndApplyUpdate();
      }
    }, 5000); // Wait 5 seconds after app start
  } catch (err) {
    console.error('[Update] Failed to initialize auto-update:', err);
  }
}

/**
 * Rollback to previous version (if update caused issues)
 */
export async function rollbackUpdate(): Promise<boolean> {
  if (!isNativePlatform()) return false;

  try {
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    await CapacitorUpdater.reset();
    return true;
  } catch (err) {
    console.error('[Update] Failed to rollback:', err);
    return false;
  }
}

/**
 * Get information about installed bundles
 */
export async function getInstalledBundles(): Promise<{ current: string; bundles: string[] }> {
  if (!isNativePlatform()) {
    return { current: 'web', bundles: [] };
  }

  try {
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    const current = await CapacitorUpdater.current();
    const bundles = await CapacitorUpdater.list();
    
    return {
      current: current.bundle?.id || 'builtin',
      bundles: bundles.bundles?.map(b => b.id) || [],
    };
  } catch (err) {
    console.error('[Update] Failed to get bundles:', err);
    return { current: 'unknown', bundles: [] };
  }
}
