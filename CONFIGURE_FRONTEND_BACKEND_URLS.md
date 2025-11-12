# Configure Frontend & Backend URLs - Complete Guide

**Date**: November 12, 2025
**Frontend URL**: https://smartduka.vercel.app
**Backend URL**: https://smartduka.onrender.com

---

## 🎯 Overview

You need to configure URLs in 3 places:
1. **Render Backend** - CORS configuration
2. **Vercel Frontend** - API URL environment variable
3. **Local Development** - For testing

---

## 📝 Part 1: Configure Render Backend (CORS)

### Step 1.1: Update Backend Code

**File**: `apps/api/src/main.ts`

**Current Code** (lines 8-14):
```typescript
app.enableCors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
  exposedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
});
```

**Update To** (add production URL):
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

**What Changed**: Added `'https://smartduka.vercel.app'` to origin array

### Step 1.2: Commit and Push to GitHub

```bash
git add apps/api/src/main.ts
git commit -m "Add Vercel frontend URL to CORS configuration"
git push origin main
```

### Step 1.3: Render Auto-Deploys

- Render automatically detects the push
- Rebuilds and deploys backend
- Wait 2-3 minutes for deployment
- Check logs for success

### Step 1.4: Verify Backend URL

**Check**:
1. Go to Render Dashboard
2. Click smartduka-api service
3. Look for URL at top: `https://smartduka.onrender.com`
4. Copy this URL

---

## 📝 Part 2: Configure Vercel Frontend

### Step 2.1: Add Environment Variable to Vercel

**Location**: Vercel Dashboard → Project Settings → Environment Variables

**Steps**:
1. Go to https://vercel.com/dashboard
2. Click "smartduka" project
3. Click "Settings" tab
4. Click "Environment Variables" in left menu
5. Click "Add New"

### Step 2.2: Add NEXT_PUBLIC_API_URL

**Fill in**:
- **Name**: `NEXT_PUBLIC_API_URL`
- **Value**: `https://smartduka.onrender.com`
- **Environments**: Select all (Production, Preview, Development)

**Click**: "Save"

### Step 2.3: Redeploy Frontend

**Option A: Manual Redeploy**
1. Go to Vercel Dashboard
2. Click smartduka project
3. Click "Deployments" tab
4. Find latest deployment
5. Click the three dots (...)
6. Click "Redeploy"

**Option B: Push to GitHub**
```bash
git add .
git commit -m "Update environment variables"
git push origin main
```
- Vercel automatically redeploys on push

### Step 2.4: Verify Frontend URL

**Check**:
1. Go to Vercel Dashboard
2. Click smartduka project
3. Look for URL at top: `https://smartduka.vercel.app`
4. Wait for deployment to complete (green checkmark)

---

## 📝 Part 3: Configure Local Development

### Step 3.1: Update Backend CORS (Local)

**File**: `apps/api/src/main.ts`

Already updated in Part 1 (includes localhost URLs)

### Step 3.2: Update Frontend .env.local

**File**: `apps/web/.env.local`

**Add/Update**:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Or for production testing**:
```env
NEXT_PUBLIC_API_URL=https://smartduka.onrender.com
```

### Step 3.3: Restart Dev Server

```bash
# Stop current dev server (Ctrl+C)
# Then restart
pnpm dev
```

---

## 📋 Configuration Checklist

### Backend (Render)

- [ ] Open `apps/api/src/main.ts`
- [ ] Update CORS origin array to include:
  - `'http://localhost:3000'`
  - `'http://localhost:3001'`
  - `'https://smartduka.vercel.app'`
- [ ] Save file
- [ ] Commit: `git add apps/api/src/main.ts`
- [ ] Commit: `git commit -m "Add Vercel URL to CORS"`
- [ ] Push: `git push origin main`
- [ ] Wait 2-3 minutes for Render to rebuild
- [ ] Check Render logs for success
- [ ] Verify backend URL: https://smartduka.onrender.com

### Frontend (Vercel)

- [ ] Go to Vercel Dashboard
- [ ] Click smartduka project
- [ ] Click Settings → Environment Variables
- [ ] Add NEXT_PUBLIC_API_URL = https://smartduka.onrender.com
- [ ] Select all environments
- [ ] Click Save
- [ ] Redeploy or push to GitHub
- [ ] Wait for deployment to complete
- [ ] Verify frontend URL: https://smartduka.vercel.app

### Local Development

- [ ] Update `apps/api/src/main.ts` (already done)
- [ ] Update `apps/web/.env.local`:
  ```
  NEXT_PUBLIC_API_URL=http://localhost:5000
  ```
- [ ] Restart: `pnpm dev`
- [ ] Test locally

---

## 🔍 Verify Configuration

### Test 1: Check Backend CORS

**Command**:
```bash
curl -H "Origin: https://smartduka.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS https://smartduka.onrender.com/auth/login -v
```

**Expected Headers**:
```
Access-Control-Allow-Origin: https://smartduka.vercel.app
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
```

### Test 2: Check Frontend Environment

1. Open https://smartduka.vercel.app
2. Open browser console (F12)
3. Run:
   ```javascript
   console.log(process.env.NEXT_PUBLIC_API_URL)
   ```
4. Should show: `https://smartduka.onrender.com`

### Test 3: Test API Call

1. Open https://smartduka.vercel.app
2. Open browser console (F12)
3. Go to Network tab
4. Try to login
5. Look for requests to: `https://smartduka.onrender.com/auth/login`
6. Should see 200 or 401 (not CORS error)

### Test 4: Local Development

1. Run: `pnpm dev`
2. Open http://localhost:3000
3. Open browser console (F12)
4. Try to login
5. Should work without CORS errors

---

## 📊 Configuration Summary

### Backend (Render)

**File**: `apps/api/src/main.ts`

```typescript
app.enableCors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://smartduka.vercel.app'  // ← Added
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
  exposedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
});
```

**URL**: https://smartduka.onrender.com

### Frontend (Vercel)

**Environment Variable**:
```
NEXT_PUBLIC_API_URL=https://smartduka.onrender.com
```

**URL**: https://smartduka.vercel.app

### Local Development

**Backend CORS**: Includes localhost URLs

**Frontend .env.local**:
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 🧪 Testing Workflow

### Step 1: Update Backend CORS
```bash
# Edit apps/api/src/main.ts
# Add https://smartduka.vercel.app to CORS origin
git add apps/api/src/main.ts
git commit -m "Add Vercel URL to CORS"
git push origin main
# Wait 2-3 minutes for Render to rebuild
```

### Step 2: Add Frontend Environment Variable
```
Vercel Dashboard → Settings → Environment Variables
Add: NEXT_PUBLIC_API_URL = https://smartduka.onrender.com
Redeploy or push to GitHub
Wait for deployment
```

### Step 3: Test Frontend
```
1. Open https://smartduka.vercel.app
2. Try to login
3. Should work without CORS errors
```

### Step 4: Test Local Development
```bash
pnpm dev
# Open http://localhost:3000
# Try to login
# Should work
```

---

## 🚨 Troubleshooting

### Issue: CORS Error in Browser

**Error**: `Access to XMLHttpRequest at 'https://smartduka.onrender.com/...' from origin 'https://smartduka.vercel.app' has been blocked by CORS policy`

**Cause**: Frontend URL not in backend CORS origin array

**Fix**:
1. Edit `apps/api/src/main.ts`
2. Add `'https://smartduka.vercel.app'` to origin array
3. Commit and push
4. Wait for Render to rebuild

### Issue: Frontend Can't Connect to Backend

**Error**: Network error or 404

**Cause**: NEXT_PUBLIC_API_URL not set correctly

**Fix**:
1. Go to Vercel Dashboard
2. Check Environment Variables
3. Verify NEXT_PUBLIC_API_URL = https://smartduka.onrender.com
4. Redeploy

### Issue: Local Development Shows Wrong API URL

**Error**: Trying to connect to production instead of localhost

**Cause**: NEXT_PUBLIC_API_URL not set in .env.local

**Fix**:
1. Create/update `apps/web/.env.local`
2. Add: `NEXT_PUBLIC_API_URL=http://localhost:5000`
3. Restart: `pnpm dev`

### Issue: Backend Returns 404

**Error**: API endpoints return 404

**Cause**: Backend not deployed or wrong URL

**Fix**:
1. Check Render Dashboard
2. Verify smartduka-api service is "Live"
3. Check logs for errors
4. Verify backend URL: https://smartduka.onrender.com

---

## 📝 Files to Modify

### 1. Backend CORS Configuration
**File**: `apps/api/src/main.ts`
- Add production frontend URL to CORS origin array
- Commit and push to GitHub
- Render auto-deploys

### 2. Frontend Environment Variable
**Location**: Vercel Dashboard → Environment Variables
- Add NEXT_PUBLIC_API_URL = https://smartduka.onrender.com
- Redeploy or push to GitHub

### 3. Local Development Frontend
**File**: `apps/web/.env.local`
- Add NEXT_PUBLIC_API_URL = http://localhost:5000
- Restart dev server

---

## ✅ Success Criteria

- ✅ Backend CORS includes https://smartduka.vercel.app
- ✅ Frontend environment variable set to https://smartduka.onrender.com
- ✅ Frontend can connect to backend without CORS errors
- ✅ Login works on https://smartduka.vercel.app
- ✅ Local development works on http://localhost:3000
- ✅ No console errors related to CORS or API URLs

---

## 🎯 Next Steps

1. **Update Backend CORS** (5 min)
   - Edit `apps/api/src/main.ts`
   - Add Vercel URL to CORS origin
   - Commit and push

2. **Configure Vercel Environment** (5 min)
   - Add NEXT_PUBLIC_API_URL
   - Redeploy

3. **Test Frontend** (5 min)
   - Open https://smartduka.vercel.app
   - Try to login
   - Check for CORS errors

4. **Test Local Development** (5 min)
   - Run pnpm dev
   - Open http://localhost:3000
   - Try to login

---

## 📚 Related Documentation

- **CONFIGURE_MONGODB_ENVS.md** - MongoDB configuration
- **DEPLOYMENT_QUICK_START.md** - Full deployment guide
- **ENVIRONMENT_VARIABLES_SETUP.md** - All environment variables

---

**Status**: Ready to configure
**Time**: 20 minutes
**Difficulty**: Easy (mostly configuration)

**Your SmartDuka is almost live! 🚀**
