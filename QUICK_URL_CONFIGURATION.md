# Quick URL Configuration - Copy & Paste

**Date**: November 12, 2025
**Frontend**: https://smartduka.vercel.app
**Backend**: https://smartduka.onrender.com

---

## 🚀 3-Step Quick Setup (15 minutes)

### Step 1: Update Backend CORS (5 minutes)

**File**: `apps/api/src/main.ts`

**Find** (lines 8-14):
```typescript
app.enableCors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
  exposedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
});
```

**Replace With**:
```typescript
app.enableCors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://smartduka.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
  exposedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
});
```

**Then**:
```bash
git add apps/api/src/main.ts
git commit -m "Add Vercel frontend URL to CORS configuration"
git push origin main
```

**Wait**: 2-3 minutes for Render to rebuild

---

### Step 2: Add Frontend Environment Variable (5 minutes)

**Location**: https://vercel.com/dashboard

**Steps**:
1. Click "smartduka" project
2. Click "Settings" tab
3. Click "Environment Variables"
4. Click "Add New"
5. Fill in:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://smartduka.onrender.com`
   - **Environments**: Select all
6. Click "Save"
7. Redeploy or push to GitHub

**Wait**: 2-3 minutes for deployment

---

### Step 3: Update Local Development (3 minutes)

**File**: `apps/web/.env.local`

**Add/Update**:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Then**:
```bash
# Restart dev server
pnpm dev
```

---

## ✅ Verification (2 minutes)

### Check 1: Backend CORS Updated
```bash
# Verify file was updated
cat apps/api/src/main.ts | grep "smartduka.vercel.app"
# Should show: 'https://smartduka.vercel.app'
```

### Check 2: Render Rebuilt
1. Go to Render Dashboard
2. Click smartduka-api
3. Check status: Should be "Live" (green)
4. Check logs: Should show successful build

### Check 3: Vercel Environment Variable Set
1. Go to Vercel Dashboard
2. Click smartduka project
3. Click Settings → Environment Variables
4. Should see: NEXT_PUBLIC_API_URL = https://smartduka.onrender.com

### Check 4: Frontend Deployed
1. Go to Vercel Dashboard
2. Click smartduka project
3. Check latest deployment: Should be green (success)

---

## 🧪 Test It Works

### Test 1: Frontend to Backend Connection
```
1. Open: https://smartduka.vercel.app
2. Open browser console: F12
3. Go to Network tab
4. Try to login
5. Look for requests to: https://smartduka.onrender.com/auth/login
6. Should see 200 or 401 (not CORS error)
```

### Test 2: Local Development
```bash
pnpm dev
# Open: http://localhost:3000
# Try to login
# Should work without errors
```

---

## 📋 Checklist

- [ ] Updated `apps/api/src/main.ts` CORS
- [ ] Added `'https://smartduka.vercel.app'` to origin array
- [ ] Committed and pushed to GitHub
- [ ] Render rebuilt (2-3 minutes)
- [ ] Render service shows "Live"
- [ ] Added NEXT_PUBLIC_API_URL to Vercel
- [ ] Value: https://smartduka.onrender.com
- [ ] Vercel redeployed
- [ ] Vercel deployment shows green (success)
- [ ] Updated `apps/web/.env.local`
- [ ] Restarted pnpm dev
- [ ] Tested frontend: https://smartduka.vercel.app
- [ ] Tested local: http://localhost:3000
- [ ] No CORS errors in console

---

## 🔑 Key Values

### Frontend URL
```
https://smartduka.vercel.app
```

### Backend URL
```
https://smartduka.onrender.com
```

### Backend CORS Origin (Add to array)
```
'https://smartduka.vercel.app'
```

### Frontend Environment Variable
```
NEXT_PUBLIC_API_URL=https://smartduka.onrender.com
```

### Local Frontend Environment
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 🚨 If Something Goes Wrong

### CORS Error
```
Error: Access to XMLHttpRequest blocked by CORS
Fix: Check apps/api/src/main.ts has Vercel URL in origin array
```

### Frontend Can't Connect
```
Error: Network error or 404
Fix: Check Vercel environment variable is set correctly
```

### Local Dev Shows Wrong API
```
Error: Trying to connect to production
Fix: Check apps/web/.env.local has http://localhost:5000
```

---

## 📊 Summary

| Component | URL | Configuration |
|-----------|-----|----------------|
| Frontend | https://smartduka.vercel.app | Vercel environment variable |
| Backend | https://smartduka.onrender.com | Render service |
| Backend CORS | - | apps/api/src/main.ts |
| Frontend API URL | - | NEXT_PUBLIC_API_URL env var |
| Local Frontend | http://localhost:3000 | .env.local |
| Local Backend | http://localhost:5000 | main.ts (localhost URLs) |

---

## ⏱️ Timeline

| Step | Time |
|------|------|
| Update backend CORS | 5 min |
| Commit and push | 1 min |
| Render rebuild | 2-3 min |
| Add Vercel env var | 5 min |
| Vercel redeploy | 2-3 min |
| Update local .env | 2 min |
| Test | 5 min |
| **Total** | **20-25 min** |

---

## 🎯 Next Steps

1. ✅ Update backend CORS
2. ✅ Add frontend environment variable
3. ✅ Update local .env
4. → Test frontend: https://smartduka.vercel.app
5. → Test local: http://localhost:3000
6. → Deploy and monitor

---

**Status**: Ready to configure
**Time**: 15-20 minutes
**Difficulty**: Easy

**Let's get your URLs configured! 🚀**
