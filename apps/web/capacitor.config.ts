import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartduka.pos',
  appName: 'SmartDuka POS',
  webDir: 'public', // Minimal webDir - APK loads from server URL
  
  // Server configuration - APK loads web app from hosted URL
  // This ensures APK always stays in sync with web version
  server: {
    url: 'https://smartduka.vercel.app',
    cleartext: true,
    androidScheme: 'https',
  },

  // Android-specific configuration
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV !== 'production',
  },

  // Plugins configuration
  plugins: {
    // Splash screen configuration
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: '#16a34a', // SmartDuka green
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerStyle: 'small',
      spinnerColor: '#ffffff',
    },

    // Status bar configuration
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#16a34a',
    },

    // Keyboard configuration for POS input
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },

    // Camera configuration for barcode scanning
    Camera: {
      // Prefer back camera for scanning
      promptLabelHeader: 'Camera Permission',
      promptLabelCancel: 'Cancel',
      promptLabelPhoto: 'From Photos',
      promptLabelPicture: 'Take Picture',
    },

    // Local notifications for offline sync
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#16a34a',
      sound: 'beep.wav',
    },

    // App updates configuration (Capgo)
    CapacitorUpdater: {
      autoUpdate: true,
    },

    // Push notifications
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

  },
};

export default config;
