# SmartDuka Android Setup Script
# This script sets up the Android development environment for SmartDuka

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SmartDuka Android Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "apps/web/package.json")) {
    Write-Host "Error: Please run this script from the SmartDuka root directory" -ForegroundColor Red
    exit 1
}

# Step 1: Install Capacitor dependencies
Write-Host "[1/6] Installing Capacitor dependencies..." -ForegroundColor Yellow
Set-Location apps/web

pnpm add -D @capacitor/cli @capacitor/core @capacitor/android

# Step 2: Install Capacitor plugins
Write-Host "[2/6] Installing Capacitor plugins..." -ForegroundColor Yellow
pnpm add @capacitor/app @capacitor/camera @capacitor/device @capacitor/haptics @capacitor/network @capacitor/preferences @capacitor/splash-screen @capacitor/status-bar

# Step 3: Install community plugins
Write-Host "[3/6] Installing community plugins..." -ForegroundColor Yellow
pnpm add @capacitor-community/barcode-scanner @capgo/capacitor-updater

# Step 4: Build web app
Write-Host "[4/6] Building web application..." -ForegroundColor Yellow
pnpm build

# Step 5: Export static files
Write-Host "[5/6] Exporting static files for Capacitor..." -ForegroundColor Yellow
# Note: Next.js 13+ uses output: 'export' in next.config.ts instead of next export
# If using older Next.js, uncomment the line below:
# pnpm next export -o out

# For Next.js 13+, add output: 'export' to next.config.ts
Write-Host "Note: Ensure 'output: export' is set in next.config.ts for static export" -ForegroundColor Cyan

# Step 6: Sync with Android
Write-Host "[6/6] Syncing with Android project..." -ForegroundColor Yellow
npx cap sync android

Set-Location ../..

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open Android Studio: npx cap open android" -ForegroundColor White
Write-Host "  2. Build debug APK: cd apps/web/android && ./gradlew assembleDebug" -ForegroundColor White
Write-Host "  3. Run on device: npx cap run android" -ForegroundColor White
Write-Host ""
Write-Host "For more information, see: docs/04-implementation/ANDROID_APK_SETUP.md" -ForegroundColor Gray
