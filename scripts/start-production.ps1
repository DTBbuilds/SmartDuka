# SmartDuka Production Startup Script (Windows PowerShell)
# Usage: .\scripts\start-production.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting SmartDuka in production mode..." -ForegroundColor Cyan

# Create logs directory if it doesn't exist
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

# Check if PM2 is installed
$pm2Installed = $null
try {
    $pm2Installed = Get-Command pm2 -ErrorAction SilentlyContinue
} catch {}

if (-not $pm2Installed) {
    Write-Host "❌ PM2 is not installed. Installing globally..." -ForegroundColor Yellow
    npm install -g pm2
}

# Build the API
Write-Host "📦 Building API..." -ForegroundColor Yellow
Push-Location apps/api
pnpm build
Pop-Location

# Start with PM2
Write-Host "🔄 Starting services with PM2..." -ForegroundColor Yellow
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Display status
Write-Host ""
Write-Host "✅ SmartDuka is now running!" -ForegroundColor Green
Write-Host ""
pm2 status

Write-Host ""
Write-Host "📊 Useful commands:" -ForegroundColor Cyan
Write-Host "   pm2 logs          - View logs"
Write-Host "   pm2 monit         - Monitor dashboard"
Write-Host "   pm2 restart all   - Restart all services"
Write-Host "   pm2 stop all      - Stop all services"
