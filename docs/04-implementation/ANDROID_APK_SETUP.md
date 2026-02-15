# SmartDuka Android APK Setup Guide

This guide covers building, deploying, and maintaining the SmartDuka Android APK.

## Overview

The SmartDuka APK is built using **Capacitor**, which wraps our Next.js web app into a native Android application. This approach ensures:

- **Code Reusability**: Same codebase for web and mobile
- **Seamless Sync**: APK and web versions stay in sync
- **Native Features**: Camera, haptics, offline storage, push notifications
- **OTA Updates**: Update the app without requiring new APK downloads

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SmartDuka APK                        │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  Capacitor  │  │   Native    │  │   OTA Updates   │  │
│  │   Bridge    │  │   Plugins   │  │   (Capgo)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                   Next.js Web App                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │    React    │  │   Dexie     │  │    M-Pesa       │  │
│  │ Components  │  │  (Offline)  │  │  Integration    │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

### Development Machine
- Node.js 20+
- pnpm 9+
- Java JDK 17
- Android Studio (for Android SDK)
- Android SDK (API 34)

### For Signing APKs
- Keystore file (for release builds)
- Keystore password and key alias

## Quick Start

### 1. Install Dependencies

```bash
cd apps/web

# Install Capacitor and plugins
pnpm add @capacitor/cli @capacitor/core @capacitor/android

# Install native plugins
pnpm add @capacitor/app @capacitor/camera @capacitor/device \
         @capacitor/haptics @capacitor/network @capacitor/preferences \
         @capacitor/splash-screen @capacitor/status-bar

# Install community plugins
pnpm add @capacitor-community/barcode-scanner @capgo/capacitor-updater
```

### 2. Build Web Assets

```bash
# Build the Next.js app
pnpm build

# Export static files (required for Capacitor)
pnpm next export -o out
```

### 3. Sync with Android

```bash
# Sync web assets to Android project
npx cap sync android
```

### 4. Build Debug APK

```bash
cd android
./gradlew assembleDebug
```

The debug APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### 5. Build Release APK

```bash
cd android
./gradlew assembleRelease
```

## Configuration

### Capacitor Config (`capacitor.config.ts`)

```typescript
const config: CapacitorConfig = {
  appId: 'com.smartduka.pos',
  appName: 'SmartDuka POS',
  webDir: 'out',
  server: {
    // Live updates - APK loads from web URL
    url: 'https://smartduka.vercel.app',
    androidScheme: 'https',
  },
};
```

### Android Configuration

Key files:
- `android/app/build.gradle` - Version code, SDK versions
- `android/variables.gradle` - SDK version variables
- `android/app/src/main/res/values/strings.xml` - App name

### Version Management

Version is synced from `apps/web/package.json`:

```json
{
  "version": "1.0.0"
}
```

## Native Features

### Camera/Barcode Scanning

The APK uses native barcode scanning via `@capacitor-community/barcode-scanner`:

```typescript
import { startNativeBarcodeScanner } from '@/lib/capacitor/camera';

const result = await startNativeBarcodeScanner();
if (result?.hasContent) {
  console.log('Scanned:', result.content);
}
```

### Offline Support

Same Dexie-based offline storage works in APK:
- Products cached locally
- Orders created offline
- Auto-sync when online

### M-Pesa STK Push

M-Pesa works identically in APK as it calls the backend API:
- STK push sent via API
- Callback received by server
- Client polls for status

### Haptic Feedback

Native haptics for better UX:

```typescript
import { hapticImpact, hapticNotification } from '@/lib/capacitor/haptics';

await hapticImpact('medium');
await hapticNotification('success');
```

## OTA Updates

The APK supports over-the-air updates using Capgo:

### How It Works

1. On app start, check for updates
2. Download new bundle in background
3. Apply update on next restart
4. Mandatory updates block app until updated

### Configuration

Updates are configured in `capacitor.config.ts`:

```typescript
plugins: {
  CapacitorUpdater: {
    autoUpdate: true,
    updateUrl: 'https://smarduka.onrender.com/api/v1/app-updates',
  },
}
```

### Version Sync Strategy

| Component | Update Method |
|-----------|---------------|
| Web App | Automatic (Vercel deploys) |
| APK Content | OTA via Capgo |
| APK Shell | Manual APK release |
| API | Automatic (Render deploys) |

## CI/CD Pipeline

### GitHub Actions Workflow

The `.github/workflows/build-android.yml` workflow:

1. **Triggers**: Push to `main`, changes in `apps/web/`
2. **Builds**: Web assets, then Android APK
3. **Signs**: Release APK with keystore
4. **Releases**: Creates GitHub release with APK
5. **Notifies**: Update server of new version

### Required Secrets

Set these in GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded keystore file |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias in keystore |
| `ANDROID_KEY_PASSWORD` | Key password |
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `ADMIN_API_KEY` | API key for update notifications |

### Creating a Keystore

```bash
keytool -genkey -v -keystore smartduka.keystore \
  -alias smartduka -keyalg RSA -keysize 2048 -validity 10000
```

Then base64 encode for GitHub:

```bash
base64 -i smartduka.keystore > keystore.base64
```

## Testing

### Test on Emulator

```bash
# Open in Android Studio
npx cap open android

# Or run directly
npx cap run android
```

### Test on Physical Device

1. Enable Developer Options on Android device
2. Enable USB Debugging
3. Connect device via USB
4. Run: `npx cap run android --target=<device-id>`

### Test APK Installation

```bash
# Install APK on connected device
adb install -r app-debug.apk
```

## Troubleshooting

### Build Errors

**Gradle sync failed:**
```bash
cd android
./gradlew clean
./gradlew --refresh-dependencies
```

**SDK not found:**
- Install Android SDK via Android Studio
- Set `ANDROID_SDK_ROOT` environment variable

### Runtime Errors

**Camera not working:**
- Check `AndroidManifest.xml` has camera permission
- Ensure app has camera permission granted

**Network issues:**
- Check `AndroidManifest.xml` has internet permission
- Verify `cleartext` traffic is allowed for dev

### Update Issues

**OTA update not applying:**
```typescript
import { rollbackUpdate } from '@/lib/capacitor/app-update';
await rollbackUpdate(); // Rollback to previous version
```

## Distribution

### Google Play Store

1. Build signed release APK or AAB
2. Create app listing on Google Play Console
3. Upload APK/AAB
4. Submit for review

### Direct APK Distribution

1. Build signed release APK
2. Host on your server or GitHub releases
3. Users download and install manually
4. Enable "Install from unknown sources"

## Support

For issues with the Android APK:
- Check this documentation first
- Review GitHub issues
- Contact support@smartduka.co.ke
