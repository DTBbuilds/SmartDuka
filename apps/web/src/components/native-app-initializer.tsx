'use client';

import { useEffect, useState } from 'react';
import { isNativePlatform } from '@/lib/capacitor/platform';
import { initializeAutoUpdate } from '@/lib/capacitor/app-update';
import { initializeNetworkMonitoring } from '@/lib/capacitor/network';
import { migrateFromLocalStorage } from '@/lib/capacitor/storage';
import { reportAppVersion, checkUpdateRequired } from '@/lib/capacitor/version-sync';
import { Button } from '@smartduka/ui';
import { AlertTriangle, Download, RefreshCw } from 'lucide-react';

interface NativeAppInitializerProps {
  children: React.ReactNode;
}

/**
 * Native App Initializer
 * 
 * Initializes native features when running as Android APK:
 * - OTA updates
 * - Network monitoring
 * - Storage migration
 * - Version reporting
 * 
 * Also handles mandatory update blocking.
 */
export function NativeAppInitializer({ children }: NativeAppInitializerProps) {
  const [updateRequired, setUpdateRequired] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    storeUrl?: string;
    message?: string;
  }>({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      if (!isNativePlatform()) {
        setInitialized(true);
        return;
      }

      try {
        // Check if update is required first
        const updateCheck = await checkUpdateRequired();
        if (updateCheck.required) {
          setUpdateRequired(true);
          setUpdateInfo({
            storeUrl: updateCheck.storeUrl,
            message: updateCheck.message,
          });
          return; // Don't initialize if update is required
        }

        // Initialize in parallel
        await Promise.all([
          initializeNetworkMonitoring(),
          migrateFromLocalStorage(),
          reportAppVersion(),
        ]);

        // Initialize auto-update (runs in background)
        initializeAutoUpdate();

        console.log('[NativeApp] Initialized successfully');
      } catch (err) {
        console.error('[NativeApp] Initialization error:', err);
      } finally {
        setInitialized(true);
      }
    };

    initialize();
  }, []);

  // Show update required screen
  if (updateRequired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="h-20 w-20 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-amber-600" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Update Required</h1>
            <p className="text-muted-foreground">
              {updateInfo.message || 'A new version of SmartDuka is available. Please update to continue.'}
            </p>
          </div>

          <div className="space-y-3">
            {updateInfo.storeUrl && (
              <Button
                className="w-full h-12"
                onClick={() => window.open(updateInfo.storeUrl, '_blank')}
              >
                <Download className="h-5 w-5 mr-2" />
                Update Now
              </Button>
            )}
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Again
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Keeping SmartDuka updated ensures you have the latest features and security fixes.
          </p>
        </div>
      </div>
    );
  }

  // Show loading while initializing
  if (!initialized && isNativePlatform()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-pulse">
            <div className="h-8 w-8 rounded-full bg-green-600" />
          </div>
          <p className="text-muted-foreground">Starting SmartDuka...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
