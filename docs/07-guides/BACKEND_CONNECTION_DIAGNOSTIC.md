# Backend Connection Diagnostic 🔍

**Date:** Nov 6, 2025  
**Status:** ✅ TROUBLESHOOTING  
**Issue:** CORS request did not succeed  

---

## 🚨 ISSUE

Frontend can't reach backend:
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading 
the remote resource at http://localhost:5000/super-admin/dashboard/stats. 
(Reason: CORS request did not succeed). Status code: (null).
```

**Status code: (null)** means the backend isn't responding at all.

---

## 🔧 DIAGNOSTIC STEPS

### Step 1: Verify Backend Process is Running

**In PowerShell:**
```powershell
# Check if port 5000 is listening
netstat -ano | findstr :5000
```

**Expected Output:**
```
TCP    127.0.0.1:5000         0.0.0.0:0              LISTENING       [PID]
```

**If no output:** Backend is not listening on port 5000

### Step 2: Test Backend Directly

**In PowerShell:**
```powershell
# Test if backend responds to root endpoint
Invoke-WebRequest -Uri "http://localhost:5000/" -Method GET
```

**Expected Output:**
```
StatusCode        : 200
StatusDescription : OK
Content           : Hello World!
```

**If error:** Backend is not responding

### Step 3: Check Backend Logs

Look in the backend terminal for:
```
🚀 Backend API running on http://localhost:5000
```

If you don't see this, the backend didn't start properly.

### Step 4: Check for Errors After Startup

Look for any error messages after:
```
[Nest] ... LOG [InstanceLoader] ... dependencies initialized
```

---

## ✅ SOLUTIONS

### Solution 1: Backend Not Running

**Problem:** Backend process crashed or didn't start

**Solution:**
```bash
# Kill all node processes
taskkill /F /IM node.exe

# Go to backend directory
cd apps/api

# Start backend
pnpm dev
```

**Watch for:**
```
[Nest] ... LOG [NestFactory] Starting Nest application...
[Nest] ... LOG [InstanceLoader] MongooseModule dependencies initialized
🚀 Backend API running on http://localhost:5000
```

### Solution 2: Port Already in Use

**Problem:** Another process using port 5000

**Solution:**
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (replace PID with actual process ID)
taskkill /PID [PID] /F

# Restart backend
cd apps/api
pnpm dev
```

### Solution 3: MongoDB Connection Failed

**Problem:** Backend can't connect to MongoDB

**Solution:**
1. Verify MongoDB is running
2. Check `MONGODB_URI` in `.env`
3. Verify connection string is correct
4. Restart backend

### Solution 4: Module Initialization Error

**Problem:** One of the modules failed to initialize

**Solution:**
1. Check backend logs for errors
2. Look for error messages after "InstanceLoader"
3. If you see errors, report them
4. Rebuild: `pnpm build`
5. Restart: `pnpm dev`

---

## 🔍 QUICK CHECKLIST

- [ ] Backend running (`pnpm dev`)
- [ ] Port 5000 listening
- [ ] MongoDB connected
- [ ] No errors in backend logs
- [ ] Backend responds to http://localhost:5000/
- [ ] CORS enabled in main.ts
- [ ] Browser cache cleared
- [ ] Hard refresh done: `Ctrl+Shift+R`

---

## 📝 BACKEND STARTUP CHECKLIST

When you run `pnpm dev`, you should see:

```
[18:39:17] File change detected. Starting incremental compilation...
[18:39:18] Found 0 errors. Watching for file changes.

[Nest] 18516  - 06/11/2025, 18:39:21     LOG [NestFactory] Starting Nest application...
[Nest] 18516  - 06/11/2025, 18:39:21     LOG [InstanceLoader] MongooseModule dependencies initialized +88ms
[Nest] 18516  - 06/11/2025, 18:39:21     LOG [InstanceLoader] PassportModule dependencies initialized +1ms
[Nest] 18516  - 06/11/2025, 18:39:21     LOG [InstanceLoader] RealtimeModule dependencies initialized +0ms
[Nest] 18516  - 06/11/2025, 18:39:21     LOG [InstanceLoader] ConfigHostModule dependencies initialized +0ms
[Nest] 18516  - 06/11/2025, 18:39:21     LOG [InstanceLoader] JwtModule dependencies initialized +0ms
[Nest] 18516  - 06/11/2025, 18:39:21     LOG [InstanceLoader] AppModule dependencies initialized +3ms
[Nest] 18516  - 06/11/2025, 18:39:21     LOG [InstanceLoader] ConfigModule dependencies initialized +0ms
[Nest] 18516  - 06/11/2025, 18:39:21     LOG [InstanceLoader] AuthModule dependencies initialized
🚀 Backend API running on http://localhost:5000
```

If you don't see the last line, the backend didn't start properly.

---

## 🆘 IF STILL NOT WORKING

1. **Kill all Node processes:**
   ```powershell
   taskkill /F /IM node.exe
   ```

2. **Clear node_modules and reinstall:**
   ```bash
   cd apps/api
   rm -r node_modules
   pnpm install
   ```

3. **Rebuild:**
   ```bash
   pnpm build
   ```

4. **Start fresh:**
   ```bash
   pnpm dev
   ```

5. **Test connection:**
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:5000/" -Method GET
   ```

---

**Status:** ✅ DIAGNOSTIC GUIDE READY  
**Next:** Run the diagnostic steps above  

---

**Last Updated:** Nov 6, 2025, 9:30 PM UTC+03:00
