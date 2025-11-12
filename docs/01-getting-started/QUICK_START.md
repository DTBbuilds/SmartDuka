# SmartDuka - Quick Start Guide

**Last Updated:** Nov 6, 2025  
**Status:** ✅ Ready to Run

---

## 🚀 Start Development Servers

### Easiest Method: Batch Script (Windows)

```bash
# Double-click this file:
start-dev.bat

# Or run from command prompt:
start-dev.bat
```

**Result:**
- ✅ Backend opens in new window (localhost:5000)
- ✅ Frontend opens in new window (localhost:3000)
- ✅ Both run concurrently

---

### Alternative: PowerShell Menu

```powershell
# Run interactive menu:
.\dev-menu.ps1

# Choose option 1 to start both servers
```

**Features:**
- ✅ Start both servers
- ✅ Start individual servers
- ✅ Check server status
- ✅ Install dependencies
- ✅ Clear cache
- ✅ Open in browser

---

### Alternative: Turbo (from project root)

```bash
pnpm dev
```

**Note:** May show warnings about multiple lockfiles (harmless)

---

## 🌐 Access the Application

After servers start:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | Main application |
| **Backend** | http://localhost:5000 | API endpoints |
| **API Docs** | http://localhost:5000/api | Swagger docs (if enabled) |

---

## 📋 What Gets Started

### Backend (Port 5000)
- NestJS REST API
- MongoDB integration
- JWT authentication
- CORS enabled
- All endpoints ready

### Frontend (Port 3000)
- Next.js application
- React components
- Service Worker
- Offline support
- All pages ready

---

## ✅ Verify Everything Works

### 1. Check Backend
```bash
curl http://localhost:5000/health
# Should return 200 OK
```

### 2. Check Frontend
```bash
curl http://localhost:3000
# Should return HTML
```

### 3. Open in Browser
- Go to http://localhost:3000
- Login with test credentials
- Navigate around
- Check console for errors

---

## 🔧 Troubleshooting

### Port Already in Use

**Windows:**
```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
lsof -i :3000
kill -9 <PID>
```

### Dependencies Missing

```bash
pnpm install
```

### MongoDB Not Running

```bash
# Local MongoDB:
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env
```

### CORS Errors

1. Clear service worker:
   ```javascript
   // In browser console:
   navigator.serviceWorker.getRegistrations().then(r => 
     r.forEach(reg => reg.unregister())
   );
   ```

2. Hard refresh: `Ctrl+Shift+R`

3. Restart both servers

---

## 📁 Project Structure

```
SmartDuka/
├── apps/
│   ├── api/          # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── inventory/
│   │   │   ├── sales/
│   │   │   ├── payments/
│   │   │   └── main.ts
│   │   └── package.json
│   │
│   └── web/          # Next.js frontend
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── lib/
│       │   └── pages/
│       ├── public/
│       │   └── sw.js (Service Worker)
│       └── package.json
│
├── packages/
│   └── ui/           # Shared UI components
│
├── start-dev.bat     # Windows batch script
├── start-dev.ps1     # PowerShell script
├── dev-menu.ps1      # Interactive menu
└── package.json      # Root package.json
```

---

## 🎯 Common Tasks

### Start Both Servers
```bash
start-dev.bat
# or
.\dev-menu.ps1
```

### Start Backend Only
```bash
cd apps/api
pnpm dev
```

### Start Frontend Only
```bash
cd apps/web
pnpm dev
```

### Install Dependencies
```bash
pnpm install
```

### Build for Production
```bash
pnpm build
```

### Run Tests
```bash
pnpm test
```

---

## 🔑 Default Credentials

### Test User
- **Email:** test@example.com
- **Password:** Test@123

### Admin User
- **Email:** admin@example.com
- **Password:** Admin@123

---

## 📚 Documentation

- `CORS_FIX_GUIDE.md` - CORS configuration details
- `CORS_TROUBLESHOOTING.md` - CORS troubleshooting
- `START_SERVERS.md` - Detailed server startup guide
- `COMPREHENSIVE_AUDIT_REPORT.md` - Feature audit
- `IMPLEMENTATION_COMPLETE.md` - Implementation summary

---

## 🎉 You're Ready!

Everything is set up and ready to go. Just run:

```bash
start-dev.bat
```

Then open http://localhost:3000 in your browser!

---

## 📞 Need Help?

1. Check the documentation files
2. Review console errors
3. Check browser DevTools (F12)
4. Verify both servers are running
5. Clear cache and restart

---

**Happy coding! 🚀**
