# SmartDuka Development Menu
# Interactive menu to manage development servers

function Show-Menu {
    Write-Host ""
    Write-Host "========================================"
    Write-Host "SmartDuka Development Menu"
    Write-Host "========================================"
    Write-Host ""
    Write-Host "1. Start both servers (concurrent)"
    Write-Host "2. Start backend only"
    Write-Host "3. Start frontend only"
    Write-Host "4. Install dependencies"
    Write-Host "5. Check server status"
    Write-Host "6. Open frontend in browser"
    Write-Host "7. Open backend in browser"
    Write-Host "8. Clear cache and restart"
    Write-Host "9. Exit"
    Write-Host ""
}

function Start-BothServers {
    Write-Host "Starting both servers..."
    Write-Host ""
    
    # Start backend
    Write-Host "Opening Backend (localhost:5000)..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\api'; pnpm dev"
    
    Start-Sleep -Seconds 2
    
    # Start frontend
    Write-Host "Opening Frontend (localhost:3000)..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\web'; pnpm dev"
    
    Write-Host ""
    Write-Host "Both servers started!"
    Write-Host "Backend:  http://localhost:5000"
    Write-Host "Frontend: http://localhost:3000"
}

function Start-BackendOnly {
    Write-Host "Starting backend server..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\api'; pnpm dev"
    Write-Host "Backend started at http://localhost:5000"
}

function Start-FrontendOnly {
    Write-Host "Starting frontend server..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\web'; pnpm dev"
    Write-Host "Frontend started at http://localhost:3000"
}

function Install-Dependencies {
    Write-Host "Installing dependencies..."
    pnpm install
    Write-Host "Dependencies installed!"
}

function Check-ServerStatus {
    Write-Host ""
    Write-Host "Checking server status..."
    Write-Host ""
    
    # Check backend
    try {
        $backend = Invoke-WebRequest -Uri "http://localhost:5000/health" -ErrorAction SilentlyContinue
        if ($backend.StatusCode -eq 200) {
            Write-Host "✅ Backend (localhost:5000): RUNNING"
        }
    } catch {
        Write-Host "❌ Backend (localhost:5000): NOT RUNNING"
    }
    
    # Check frontend
    try {
        $frontend = Invoke-WebRequest -Uri "http://localhost:3000" -ErrorAction SilentlyContinue
        if ($frontend.StatusCode -eq 200) {
            Write-Host "✅ Frontend (localhost:3000): RUNNING"
        }
    } catch {
        Write-Host "❌ Frontend (localhost:3000): NOT RUNNING"
    }
    
    Write-Host ""
}

function Open-Frontend {
    Write-Host "Opening frontend in browser..."
    Start-Process "http://localhost:3000"
}

function Open-Backend {
    Write-Host "Opening backend in browser..."
    Start-Process "http://localhost:5000"
}

function Clear-CacheAndRestart {
    Write-Host "Clearing cache..."
    
    # Clear Next.js cache
    if (Test-Path "apps/web/.next") {
        Remove-Item "apps/web/.next" -Recurse -Force
        Write-Host "✅ Cleared Next.js cache"
    }
    
    # Clear node_modules (optional)
    $response = Read-Host "Clear node_modules? (y/n)"
    if ($response -eq "y") {
        Remove-Item "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item "apps/api/node_modules" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item "apps/web/node_modules" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "✅ Cleared node_modules"
        
        Write-Host "Reinstalling dependencies..."
        pnpm install
        Write-Host "✅ Dependencies reinstalled"
    }
    
    Write-Host ""
    Write-Host "Cache cleared! Ready to start servers."
}

# Main loop
do {
    Show-Menu
    $choice = Read-Host "Enter your choice (1-9)"
    
    switch ($choice) {
        "1" { Start-BothServers }
        "2" { Start-BackendOnly }
        "3" { Start-FrontendOnly }
        "4" { Install-Dependencies }
        "5" { Check-ServerStatus }
        "6" { Open-Frontend }
        "7" { Open-Backend }
        "8" { Clear-CacheAndRestart }
        "9" { 
            Write-Host "Exiting..."
            exit
        }
        default { Write-Host "Invalid choice. Please try again." }
    }
    
    if ($choice -ne "9") {
        Read-Host "Press Enter to continue"
    }
} while ($true)
