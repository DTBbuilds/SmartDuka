# Backend Connection Test 🔍

**Date:** Nov 6, 2025  
**Status:** ✅ TROUBLESHOOTING  

---

## 🚨 ISSUE

CORS error when trying to fetch from backend:
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading 
the remote resource at http://localhost:5000/shops. 
(Reason: CORS request did not succeed). Status code: (null).
```

---

## 🔧 DIAGNOSTIC STEPS

### Step 1: Verify Backend is Running

Check if backend is listening on port 5000:

**In PowerShell:**
```powershell
# Check if port 5000 is listening
netstat -ano | findstr :5000
```

**Expected Output:**
```
TCP    127.0.0.1:5000         0.0.0.0:0              LISTENING       [PID]
```

### Step 2: Test Backend Directly

**In PowerShell:**
```powershell
# Test if backend responds
Invoke-WebRequest -Uri "http://localhost:5000/health" -Method GET
```

**Expected Output:**
```
StatusCode        : 200
StatusDescription : OK
```

### Step 3: Check Backend Logs

Look in the backend terminal for:
```
🚀 Backend API running on http://localhost:5000
```

If you don't see this, the backend didn't start properly.

### Step 4: Check for Errors

Look for error messages like:
```
[SuperAdmin Login] ...
Error: ...
```

---

## ✅ SOLUTIONS

### Solution 1: Backend Not Running

**Problem:** Backend didn't start or crashed

**Solution:**
```bash
cd apps/api
pnpm dev
```

Watch for:
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

### Solution 3: MongoDB Not Connected

**Problem:** Backend can't connect to MongoDB

**Solution:**
1. Verify MongoDB is running
2. Check `MONGODB_URI` in `.env`
3. Restart backend

### Solution 4: CORS Configuration Issue

**Problem:** CORS headers not being sent

**Solution:**
1. Rebuild backend: `pnpm build`
2. Restart backend: `pnpm dev`
3. Clear browser cache
4. Hard refresh: `Ctrl+Shift+R`

---

## 🔍 QUICK CHECKLIST

- [ ] Backend running (`pnpm dev`)
- [ ] Port 5000 listening
- [ ] MongoDB connected
- [ ] No errors in backend logs
- [ ] CORS enabled in main.ts
- [ ] Browser cache cleared
- [ ] Hard refresh done

---

## 📝 BACKEND STARTUP CHECKLIST

When you run `pnpm dev`, you should see:

```
[Nest] 15748  - 06/11/2025, 18:23:31     LOG [NestFactory] Starting Nest application...
[Nest] 15748  - 06/11/2025, 18:23:31     LOG [InstanceLoader] MongooseModule dependencies initialized +57ms
[Nest] 15748  - 06/11/2025, 18:23:31     LOG [InstanceLoader] PassportModule dependencies initialized +0ms
[Nest] 15748  - 06/11/2025, 18:23:31     LOG [InstanceLoader] RealtimeModule dependencies initialized +0ms
[Nest] 15748  - 06/11/2025, 18:23:31     LOG [InstanceLoader] ConfigHostModule dependencies initialized +1ms
[Nest] 15748  - 06/11/2025, 18:23:31     LOG [InstanceLoader] JwtModule dependencies initialized +0ms
[Nest] 15748  - 06/11/2025, 18:23:31     LOG [InstanceLoader] AppModule dependencies initialized +3ms
[Nest] 15748  - 06/11/2025, 18:23:31     LOG [InstanceLoader] ConfigModule dependencies initialized +0ms
[Nest] 15748  - 06/11/2025, 18:23:31     LOG [InstanceLoader] AuthModule dependencies initialized +1ms
...
[Nest] 15748  - 06/11/2025, 18:23:31     LOG [InstanceLoader] ... dependencies initialized
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

---

**Status:** ✅ DIAGNOSTIC GUIDE READY  
**Next:** Run the diagnostic steps above  

---

**Last Updated:** Nov 6, 2025, 8:55 PM UTC+03:00
