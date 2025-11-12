# Configure MongoDB Environment Variables - Step by Step

**Date**: November 12, 2025
**Your Connection String**: `mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka`

---

## 🎯 Overview

You need to configure environment variables in 2 places:
1. **Render Backend** (Production)
2. **Local Development** (apps/api/.env.local)

---

## 📝 Part 1: Configure Render Backend Environment

### Step 1.1: Go to Render Dashboard

1. Open https://dashboard.render.com
2. Login with your account
3. Click "Services" in left menu

### Step 1.2: Select Your Service

1. Look for service: **smartduka-api**
2. Click on it to open

### Step 1.3: Go to Environment Tab

1. Click "Environment" tab (in top menu)
2. You should see existing environment variables

### Step 1.4: Add MONGODB_URI Variable

**Option A: If MONGODB_URI already exists**
1. Find `MONGODB_URI` in the list
2. Click the edit icon (pencil)
3. Replace value with:
   ```
   mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
   ```
4. Click "Save"

**Option B: If MONGODB_URI doesn't exist**
1. Click "Add Environment Variable"
2. Fill in:
   - **Name**: `MONGODB_URI`
   - **Value**: `mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka`
3. Click "Save"

### Step 1.5: Verify Other Variables

Make sure these variables also exist:

```
JWT_SECRET=your-secret-key-here
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://smartduka.vercel.app
```

**If missing**, add them:
1. Click "Add Environment Variable"
2. Fill in name and value
3. Click "Save"

### Step 1.6: Wait for Service Restart

- Render automatically restarts the service
- Wait 2-3 minutes
- Service should show "Live" status

### Step 1.7: Check Logs

1. Click "Logs" tab
2. Look for message: `MongoDB connected`
3. If you see it → ✅ **SUCCESS!**
4. If you see error → Check troubleshooting below

---

## 📝 Part 2: Configure Local Development Environment

### Step 2.1: Open .env.local File

**File Location**: `apps/api/.env.local`

**How to open**:
1. Open your IDE (VS Code, etc.)
2. Open folder: `e:\BUILds\SmartDuka`
3. Navigate to: `apps/api/`
4. Open file: `.env.local`

**If file doesn't exist**:
1. Right-click on `apps/api/` folder
2. Select "New File"
3. Name it: `.env.local`
4. Press Enter

### Step 2.2: Add MongoDB Environment Variables

**Copy and paste into .env.local**:

```env
# Database
MONGODB_URI=mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka

# Authentication
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES=7d

# Server
PORT=5000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Step 2.3: Save File

1. Press `Ctrl+S` (Windows) or `Cmd+S` (Mac)
2. File should be saved (no dot indicator)

### Step 2.4: Restart Development Server

**If dev server is running**:
1. Press `Ctrl+C` in terminal to stop
2. Wait 2 seconds
3. Run: `pnpm dev`

**If dev server is not running**:
1. Open terminal in `apps/api/` folder
2. Run: `pnpm dev`

### Step 2.5: Check Console Output

Look for:
- ✅ `MongoDB connected` → **SUCCESS!**
- ❌ `Connection refused` → MONGODB_URI wrong
- ❌ `Authentication failed` → Password wrong
- ❌ `Connection timeout` → Network access issue

---

## 📋 Environment Variables Checklist

### Render Backend (Production)

- [ ] Go to Render Dashboard
- [ ] Click smartduka-api service
- [ ] Click Environment tab
- [ ] Add/Update MONGODB_URI:
  ```
  mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
  ```
- [ ] Add/Update JWT_SECRET (secure key)
- [ ] Add/Update NODE_ENV = production
- [ ] Add/Update PORT = 5000
- [ ] Add/Update CORS_ORIGIN = https://smartduka.vercel.app
- [ ] Click Save
- [ ] Wait for service restart
- [ ] Check logs for "MongoDB connected"

### Local Development (apps/api/.env.local)

- [ ] Open apps/api/.env.local
- [ ] Add MONGODB_URI:
  ```
  mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
  ```
- [ ] Add JWT_SECRET
- [ ] Add JWT_EXPIRES = 7d
- [ ] Add PORT = 5000
- [ ] Add NODE_ENV = development
- [ ] Add CORS_ORIGIN = http://localhost:3000
- [ ] Save file
- [ ] Restart pnpm dev
- [ ] Check console for "MongoDB connected"

---

## 🔐 Environment Variables Explained

### MONGODB_URI (CRITICAL)
```
mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
```
- **What**: Connection string to MongoDB Atlas
- **Why**: Backend needs this to connect to database
- **Where**: Render + .env.local

### JWT_SECRET (CRITICAL)
```
your-super-secret-key-minimum-32-characters-long-12345
```
- **What**: Secret key for signing JWT tokens
- **Why**: Used for authentication
- **Where**: Render + .env.local
- **Note**: Use different values for dev/prod

### NODE_ENV
```
production (Render)
development (Local)
```
- **What**: Environment type
- **Why**: Determines behavior (logging, error handling, etc.)
- **Where**: Render + .env.local

### PORT
```
5000
```
- **What**: Server port
- **Why**: Backend listens on this port
- **Where**: Render + .env.local

### CORS_ORIGIN
```
https://smartduka.vercel.app (Render)
http://localhost:3000 (Local)
```
- **What**: Frontend URL allowed to connect
- **Why**: Security - prevents unauthorized access
- **Where**: Render + .env.local

---

## 🧪 Test Your Configuration

### Test 1: Check Render Logs

1. Go to Render Dashboard
2. Click smartduka-api service
3. Click Logs tab
4. Look for: `MongoDB connected`

**Expected**:
```
✅ MongoDB connected
✅ Backend running on port 5000
```

### Test 2: Check Local Dev Console

1. Run: `pnpm dev`
2. Look for console output:

**Expected**:
```
✅ MongoDB connected
✅ Backend running on port 5000
```

### Test 3: Test with MongoDB Shell

```bash
mongosh "mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka"
```

**Expected**:
```
smartduka>
```

### Test 4: Test with MongoDB Compass

1. Download MongoDB Compass
2. Paste connection string
3. Click Connect

**Expected**:
- Shows smartduka database
- Shows collections

---

## 🚨 Troubleshooting

### Issue: "Connection refused"

**Symptom**: Logs show `Connection refused`

**Cause**: MONGODB_URI not set or wrong

**Fix**:
1. Check Render environment variables
2. Verify MONGODB_URI is set
3. Verify value is correct (no typos)
4. Restart service

### Issue: "Authentication failed"

**Symptom**: Logs show `Authentication failed`

**Cause**: Wrong password or username

**Fix**:
1. Check password: `dontech@2025`
2. Check URL encoding: `dontech%402025`
3. Check username: `dontech1914_db_user`
4. Verify in MongoDB Atlas

### Issue: "Connection timeout"

**Symptom**: Logs show `Connection timeout`

**Cause**: Network access not configured

**Fix**:
1. Go to MongoDB Atlas
2. Click Network Access
3. Add 0.0.0.0/0
4. Wait 5 minutes
5. Try again

### Issue: "Invalid connection string"

**Symptom**: Logs show `Invalid connection string`

**Cause**: Malformed URI

**Fix**:
1. Check for typos
2. Verify password is URL-encoded
3. Verify database name: /smartduka
4. Copy from MongoDB Atlas if unsure

---

## 📊 Quick Reference

### Your Connection String
```
mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
```

### Render Environment Variables
```
MONGODB_URI=mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
JWT_SECRET=your-secure-key-here
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://smartduka.vercel.app
```

### Local .env.local
```
MONGODB_URI=mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
JWT_SECRET=dev-secret-key
JWT_EXPIRES=7d
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

---

## ✅ Success Indicators

- ✅ Render logs show "MongoDB connected"
- ✅ Local dev console shows "MongoDB connected"
- ✅ Can connect with MongoDB Shell
- ✅ Can connect with MongoDB Compass
- ✅ No errors in logs/console

---

## 🎯 Next Steps

1. **Configure Render** (Part 1 above) - 5 minutes
2. **Configure Local Dev** (Part 2 above) - 3 minutes
3. **Test Connection** (Testing section) - 5 minutes
4. **Deploy Frontend** to Vercel - 10-15 minutes
5. **Test End-to-End** - 10 minutes

---

## 📚 Related Documentation

- **YOUR_MONGODB_SETUP.md** - Your specific setup
- **MONGODB_CONNECTION_TEST.md** - Testing guide
- **ENVIRONMENT_VARIABLES_SETUP.md** - Detailed env vars
- **DEPLOYMENT_QUICK_START.md** - Full deployment

---

**Status**: Ready to configure
**Time**: 15-20 minutes
**Difficulty**: Easy (mostly copying and pasting)

**Let's get your MongoDB connected! 🚀**
