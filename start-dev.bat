@echo off
REM SmartDuka Development Server Starter
REM Starts both backend and frontend servers concurrently

echo.
echo ========================================
echo SmartDuka Development Environment
echo ========================================
echo.

REM Start backend in new window
echo Starting Backend API (localhost:5000)...
start "SmartDuka Backend" cmd /k "cd apps\api && pnpm dev"

REM Wait a moment for backend to start
timeout /t 2 /nobreak

REM Start frontend in new window
echo Starting Frontend (localhost:3000)...
start "SmartDuka Frontend" cmd /k "cd apps\web && pnpm dev"

echo.
echo ========================================
echo Both servers starting...
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Close either window to stop that server
echo ========================================
echo.

pause
