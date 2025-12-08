# SmartDuka Windows Service Installation Script
# Run as Administrator: powershell -ExecutionPolicy Bypass -File scripts\windows-service-install.ps1

$ErrorActionPreference = "Stop"

Write-Host "🔧 SmartDuka Windows Service Setup" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ Please run this script as Administrator!" -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Check if pm2-windows-service is installed
Write-Host "📦 Installing pm2-windows-service..." -ForegroundColor Yellow
npm install -g pm2-windows-service

# Install the service
Write-Host "🔧 Installing PM2 as Windows Service..." -ForegroundColor Yellow
pm2-service-install -n "SmartDuka"

Write-Host ""
Write-Host "✅ PM2 Windows Service installed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Start your apps: pnpm pm2:start"
Write-Host "   2. Save the process list: pm2 save"
Write-Host "   3. The service will auto-start on Windows boot"
Write-Host ""
Write-Host "📊 Service commands:" -ForegroundColor Cyan
Write-Host "   net start pm2.exe       - Start the service"
Write-Host "   net stop pm2.exe        - Stop the service"
Write-Host "   pm2-service-uninstall   - Remove the service"
