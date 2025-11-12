# Clear cache and restart dev server
Write-Host "Clearing Next.js cache..." -ForegroundColor Green
Remove-Item -Path "apps/web/.next" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "apps/web/.turbo" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Clearing browser cache..." -ForegroundColor Green
# Clear pnpm cache
pnpm store prune

Write-Host "Starting dev server..." -ForegroundColor Green
pnpm dev
