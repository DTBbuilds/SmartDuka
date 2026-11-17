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
      backgroundColor: '#ffffff', // Premium SmartDuka splash uses a white canvas
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false, // Web startup displays the same branded progress indicator
      spinnerStyle: 'small',
      spinnerColor: '#f56a0b',
    },

    // Status bar configuration
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#f56a0b',
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
      iconColor: '#f56a0b',
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
