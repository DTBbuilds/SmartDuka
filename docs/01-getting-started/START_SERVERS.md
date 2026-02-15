# How to Start Development Servers

**Quick Start Guide**

---

## Option 1: Using Batch Script (Recommended for Windows)

### Step 1: Run the batch file
```bash
# From project root, double-click:
start-dev.bat

# Or from command prompt:
start-dev.bat
```

### What happens:
- ✅ Opens new window for Backend API (localhost:5000)
- ✅ Opens new window for Frontend (localhost:3000)
- ✅ Both servers start automatically
- ✅ You can close either window to stop that server

---

## Option 2: Using PowerShell Script

### Step 1: Allow script execution (first time only)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Step 2: Run the script
```powershell
# From PowerShell in project root:
.\start-dev.ps1
```

### What happens:
- ✅ Opens new PowerShell window for Backend API
- ✅ Opens new PowerShell window for Frontend
- ✅ Both servers start automatically
- ✅ You can close either window to stop that server

---

## Option 3: Manual Start (Using Turbo)

### From project root:
```bash
pnpm dev
```

This uses Turbo to run both servers in parallel (may show warnings about lockfiles).

---

## Option 4: Manual Start (Separate Terminals)

### Terminal 1: Backend
```bash
cd apps/api
pnpm dev
```

### Terminal 2: Frontend
```bash
cd apps/web
pnpm dev
```

---

## Verify Both Servers Are Running

### Check Backend
```bash
curl http://localhost:5000/health
# Should return 200 OK
```

### Check Frontend
```bash
curl http://localhost:3000
# Should return HTML
```

### Or just open in browser:
- Backend: http://localhost:5000
- Frontend: http://localhost:3000

---

## Expected Output

### Backend (localhost:5000)
```
🚀 Backend API running on http://localhost:5000
```

### Frontend (localhost:3000)
```
▲ Next.js 16.0.1 (Turbopack)
- Local:        http://localhost:3000
- Network:      http://10.76.7.123:3000
```

---

## Troubleshooting

### Issue: Port already in use

**For Port 3000:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :3000
kill -9 <PID>
```

**For Port 5000:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5000
kill -9 <PID>
```

### Issue: Dependencies not installed

```bash
# Install dependencies
pnpm install

# Then try starting servers again
```

### Issue: MongoDB not running

```bash
# Make sure MongoDB is running
# For local MongoDB:
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env
```

---

## Quick Reference

| Command | What it does |
|---------|------------|
| `start-dev.bat` | Start both servers (Windows) |
| `.\start-dev.ps1` | Start both servers (PowerShell) |
| `pnpm dev` | Start both servers (Turbo) |
| `cd apps/api && pnpm dev` | Start backend only |
| `cd apps/web && pnpm dev` | Start frontend only |

---

## Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smartduka
JWT_SECRET=your-secret-key
JWT_EXPIRES=7d
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## Next Steps

After servers are running:

1. ✅ Open http://localhost:3000 in browser
2. ✅ Login with your credentials
3. ✅ Navigate to different pages
4. ✅ Check console for any errors
5. ✅ Verify CORS is working (no errors)

---

**Status:** ✅ Ready to start development!
