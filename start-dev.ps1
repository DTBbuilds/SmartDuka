# SmartDuka Development Server Starter
# Starts both backend and frontend servers concurrently in PowerShell

Write-Host ""
Write-Host "========================================"
Write-Host "SmartDuka Development Environment"
Write-Host "========================================"
Write-Host ""

# Start backend in new PowerShell window
Write-Host "Starting Backend API (localhost:5000)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\api'; pnpm dev"

# Wait for backend to start
Start-Sleep -Seconds 2

# Start frontend in new PowerShell window
Write-Host "Starting Frontend (localhost:3000)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\web'; pnpm dev"

Write-Host ""
Write-Host "========================================"
Write-Host "Both servers starting..."
Write-Host ""
Write-Host "Backend:  http://localhost:5000"
Write-Host "Frontend: http://localhost:3000"
Write-Host ""
Write-Host "Close either window to stop that server"
Write-Host "========================================"
Write-Host ""

Read-Host "Press Enter to exit this window"
