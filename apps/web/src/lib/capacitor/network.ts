/**
 * Network Status Module
 * 
 * Monitors network connectivity and provides offline detection
 * for the SmartDuka APK. Essential for offline-first POS operations.
 */

import { isNativePlatform } from './platform';

export type NetworkStatus = 'online' | 'offline' | 'unknown';

export interface NetworkInfo {
  connected: boolean;
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown';
  isWifi: boolean;
  isCellular: boolean;
}

let networkListeners: ((info: NetworkInfo) => void)[] = [];
let currentNetworkInfo: NetworkInfo = {
  connected: true,
  connectionType: 'unknown',
  isWifi: false,
  isCellular: false,
};

/**
 * Get current network status
 */
export async function getNetworkStatus(): Promise<NetworkInfo> {
  if (!isNativePlatform()) {
    // Web fallback
    const online = navigator.onLine;
    return {
      connected: online,
      connectionType: online ? 'unknown' : 'none',
      isWifi: false,
      isCellular: false,
    };
  }

  try {
    const { Network } = await import('@capacitor/network');
    const status = await Network.getStatus();
    
    currentNetworkInfo = {
      connected: status.connected,
      connectionType: status.connectionType as any,
      isWifi: status.connectionType === 'wifi',
      isCellular: status.connectionType === 'cellular',
    };
    
    return currentNetworkInfo;
  } catch (err) {
    console.error('[Network] Failed to get status:', err);
    return {
      connected: navigator.onLine,
      connectionType: 'unknown',
      isWifi: false,
      isCellular: false,
    };
  }
}

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
  const status = await getNetworkStatus();
  return status.connected;
}

/**
 * Check if device is offline
 */
export async function isOffline(): Promise<boolean> {
  const status = await getNetworkStatus();
  return !status.connected;
}

/**
 * Add network status change listener
 */
export async function onNetworkChange(
  callback: (info: NetworkInfo) => void
): Promise<() => void> {
  networkListeners.push(callback);

  if (!isNativePlatform()) {
    // Web fallback using online/offline events
    const onlineHandler = () => {
      const info: NetworkInfo = {
        connected: true,
        connectionType: 'unknown',
        isWifi: false,
        isCellular: false,
      };
      currentNetworkInfo = info;
      callback(info);
    };
    
    const offlineHandler = () => {
      const info: NetworkInfo = {
        connected: false,
        connectionType: 'none',
        isWifi: false,
        isCellular: false,
      };
      currentNetworkInfo = info;
      callback(info);
    };

    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    return () => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
      networkListeners = networkListeners.filter(cb => cb !== callback);
    };
  }

  try {
    const { Network } = await import('@capacitor/network');
    const listener = await Network.addListener('networkStatusChange', status => {
      const info: NetworkInfo = {
        connected: status.connected,
        connectionType: status.connectionType as any,
        isWifi: status.connectionType === 'wifi',
        isCellular: status.connectionType === 'cellular',
      };
      currentNetworkInfo = info;
      callback(info);
    });

    return () => {
      listener.remove();
      networkListeners = networkListeners.filter(cb => cb !== callback);
    };
  } catch (err) {
    console.error('[Network] Failed to add listener:', err);
    return () => {
      networkListeners = networkListeners.filter(cb => cb !== callback);
    };
  }
}

/**
 * Get cached network info (sync, no await)
 */
export function getCachedNetworkInfo(): NetworkInfo {
  return currentNetworkInfo;
}

/**
 * Initialize network monitoring
 * Call this on app start
 */
export async function initializeNetworkMonitoring(): Promise<void> {
  // Get initial status
  await getNetworkStatus();

  // Set up change listener
  await onNetworkChange(info => {
    console.log('[Network] Status changed:', info);
    
    // Emit custom event for React components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('smartduka:network', { detail: info }));
    }
  });
}

/**
 * Wait for network to become available
 */
export function waitForNetwork(timeoutMs: number = 30000): Promise<boolean> {
  return new Promise(resolve => {
    // Check immediately
    if (currentNetworkInfo.connected) {
      resolve(true);
      return;
    }

    // Set up timeout
    const timeout = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    // Listen for network change
    let removeListener: (() => void) | null = null;
    
    const cleanup = () => {
      clearTimeout(timeout);
      if (removeListener) removeListener();
    };

    onNetworkChange(info => {
      if (info.connected) {
        cleanup();
        resolve(true);
      }
    }).then(remove => {
      removeListener = remove;
    });
  });
}

/**
 * Check if we can reach the API server
 */
export async function canReachServer(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://smarduka.onrender.com/health', {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}
