# SmartDuka APK Build Script
# Builds both debug and release APKs

param(
    [switch]$Debug,
    [switch]$Release,
    [switch]$Both,
    [switch]$Clean,
    [switch]$Install
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SmartDuka APK Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Default to debug if no option specified
if (-not $Debug -and -not $Release -and -not $Both) {
    $Debug = $true
}

# Check if we're in the right directory
if (-not (Test-Path "apps/web/package.json")) {
    Write-Host "Error: Please run this script from the SmartDuka root directory" -ForegroundColor Red
    exit 1
}

Set-Location apps/web

# Get version from package.json
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$version = $packageJson.version
Write-Host "Building version: $version" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build web app
Write-Host "[1/4] Building web application..." -ForegroundColor Yellow
pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Web build failed" -ForegroundColor Red
    Set-Location ../..
    exit 1
}

# Step 2: Sync with Android
Write-Host "[2/4] Syncing with Android..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Capacitor sync failed" -ForegroundColor Red
    Set-Location ../..
    exit 1
}

# Step 3: Build APK(s)
Set-Location android

if ($Clean) {
    Write-Host "[3/4] Cleaning build directory..." -ForegroundColor Yellow
    ./gradlew clean
}

if ($Debug -or $Both) {
    Write-Host "[3/4] Building Debug APK..." -ForegroundColor Yellow
    ./gradlew assembleDebug
    if ($LASTEXITCODE -eq 0) {
        $debugApk = "app/build/outputs/apk/debug/app-debug.apk"
        if (Test-Path $debugApk) {
            $size = (Get-Item $debugApk).Length / 1MB
            Write-Host "Debug APK built: $debugApk (${size:N2} MB)" -ForegroundColor Green
        }
    } else {
        Write-Host "Error: Debug build failed" -ForegroundColor Red
    }
}

if ($Release -or $Both) {
    Write-Host "[3/4] Building Release APK..." -ForegroundColor Yellow
    ./gradlew assembleRelease
    if ($LASTEXITCODE -eq 0) {
        $releaseApk = "app/build/outputs/apk/release/app-release-unsigned.apk"
        if (Test-Path $releaseApk) {
            $size = (Get-Item $releaseApk).Length / 1MB
            Write-Host "Release APK built: $releaseApk (${size:N2} MB)" -ForegroundColor Green
            Write-Host "Note: Release APK needs to be signed before distribution" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Error: Release build failed" -ForegroundColor Red
    }
}

# Step 4: Install on device (optional)
if ($Install) {
    Write-Host "[4/4] Installing on connected device..." -ForegroundColor Yellow
    $apkToInstall = if ($Release) { 
        "app/build/outputs/apk/release/app-release-unsigned.apk" 
    } else { 
        "app/build/outputs/apk/debug/app-debug.apk" 
    }
    
    if (Test-Path $apkToInstall) {
        adb install -r $apkToInstall
        if ($LASTEXITCODE -eq 0) {
            Write-Host "APK installed successfully!" -ForegroundColor Green
        } else {
            Write-Host "Error: Installation failed. Is device connected?" -ForegroundColor Red
        }
    }
}

Set-Location ../../..

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "APK locations:" -ForegroundColor Cyan
Write-Host "  Debug:   apps/web/android/app/build/outputs/apk/debug/app-debug.apk" -ForegroundColor White
Write-Host "  Release: apps/web/android/app/build/outputs/apk/release/app-release-unsigned.apk" -ForegroundColor White
Write-Host ""
