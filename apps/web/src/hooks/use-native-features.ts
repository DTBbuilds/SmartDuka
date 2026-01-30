/**
 * Native Features Hook
 * 
 * Provides access to native Android features with automatic
 * fallback to web APIs when running in browser.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  isNativePlatform,
  getPlatformInfo,
  onAppStateChange,
  onBackButton,
  type PlatformInfo,
} from '@/lib/capacitor/platform';
import {
  getNetworkStatus,
  onNetworkChange,
  type NetworkInfo,
} from '@/lib/capacitor/network';
import {
  hapticImpact,
  hapticNotification,
  playScanFeedback,
} from '@/lib/capacitor/haptics';
import {
  checkForUpdate,
  downloadAndApplyUpdate,
  type UpdateInfo,
} from '@/lib/capacitor/app-update';
import {
  getVersionInfo,
  checkUpdateRequired,
  type VersionInfo,
} from '@/lib/capacitor/version-sync';

export interface NativeFeaturesState {
  platform: PlatformInfo | null;
  network: NetworkInfo | null;
  isNative: boolean;
  isOnline: boolean;
  updateInfo: UpdateInfo | null;
  versionInfo: VersionInfo | null;
  isLoading: boolean;
}

export interface NativeFeaturesActions {
  checkUpdate: () => Promise<UpdateInfo>;
  downloadUpdate: () => Promise<boolean>;
  triggerHaptic: (style?: 'light' | 'medium' | 'heavy') => Promise<void>;
  triggerScanFeedback: () => Promise<void>;
  triggerNotification: (type: 'success' | 'warning' | 'error') => Promise<void>;
}

/**
 * Hook for accessing native features
 */
export function useNativeFeatures(): NativeFeaturesState & NativeFeaturesActions {
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);
  const [network, setNetwork] = useState<NetworkInfo | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize platform and network info
  useEffect(() => {
    const init = async () => {
      try {
        const [platformData, networkData, versionData] = await Promise.all([
          getPlatformInfo(),
          getNetworkStatus(),
          getVersionInfo(),
        ]);
        
        setPlatform(platformData);
        setNetwork(networkData);
        setVersionInfo(versionData);
      } catch (err) {
        console.error('[NativeFeatures] Init error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Listen for network changes
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    onNetworkChange((info) => {
      setNetwork(info);
    }).then((remove) => {
      cleanup = remove;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Listen for app state changes (foreground/background)
  useEffect(() => {
    if (!isNativePlatform()) return;

    let cleanup: (() => void) | null = null;

    onAppStateChange((isActive) => {
      if (isActive) {
        // App came to foreground - refresh network status
        getNetworkStatus().then(setNetwork);
      }
    }).then((remove) => {
      cleanup = remove;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Check for updates
  const checkUpdate = useCallback(async (): Promise<UpdateInfo> => {
    const info = await checkForUpdate();
    setUpdateInfo(info);
    return info;
  }, []);

  // Download and apply update
  const downloadUpdate = useCallback(async (): Promise<boolean> => {
    return downloadAndApplyUpdate();
  }, []);

  // Haptic feedback
  const triggerHaptic = useCallback(async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    await hapticImpact(style);
  }, []);

  // Scan feedback (haptic + sound ready)
  const triggerScanFeedback = useCallback(async () => {
    await playScanFeedback();
  }, []);

  // Notification haptic
  const triggerNotification = useCallback(async (type: 'success' | 'warning' | 'error') => {
    await hapticNotification(type);
  }, []);

  return {
    platform,
    network,
    isNative: platform?.isNative || false,
    isOnline: network?.connected ?? true,
    updateInfo,
    versionInfo,
    isLoading,
    checkUpdate,
    downloadUpdate,
    triggerHaptic,
    triggerScanFeedback,
    triggerNotification,
  };
}

/**
 * Hook for handling Android back button
 */
export function useBackButton(callback: () => void): void {
  useEffect(() => {
    if (!isNativePlatform()) return;

    let cleanup: (() => void) | null = null;

    onBackButton(callback).then((remove) => {
      cleanup = remove;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [callback]);
}

/**
 * Hook for checking if update is required
 */
export function useUpdateRequired(): {
  required: boolean;
  storeUrl?: string;
  message?: string;
  isChecking: boolean;
} {
  const [state, setState] = useState({
    required: false,
    storeUrl: undefined as string | undefined,
    message: undefined as string | undefined,
    isChecking: true,
  });

  useEffect(() => {
    checkUpdateRequired().then((result) => {
      setState({
        required: result.required,
        storeUrl: result.storeUrl,
        message: result.message,
        isChecking: false,
      });
    });
  }, []);

  return state;
}
