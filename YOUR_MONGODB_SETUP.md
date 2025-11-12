# Your SmartDuka MongoDB Setup - Action Guide

**Date**: November 12, 2025
**Your Cluster**: smartduka
**Your Username**: dontech1914_db_user
**Your Password**: dontech@2025 (URL-encoded: dontech%402025)

---

## 🎯 Your Connection Details

### Cluster Information
```
Cluster Name: smartduka
Hostname: smartduka.0vkcqh5.mongodb.net
Database: smartduka
```

### User Information
```
Username: dontech1914_db_user
Password: dontech@2025
```

### Connection String (CORRECTED)
```
mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
```

---

## ⚠️ IMPORTANT FIX

Your original connection string had issues:

### ❌ WRONG
```
mongodb+srv://dontech1914_db_user:<dontech@2025>@smartduka.0vkcqh5.mongodb.net/?appName=smartduka
```

### ✅ CORRECT
```
mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
```

### What Changed
1. Removed `<` and `>` around password
2. URL-encoded `@` as `%40` in password
3. Added database name: `/smartduka`

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Add to Render Backend (5 minutes)

**Location**: Render Dashboard → smartduka-api → Environment

**Add Variable**:
```
Name:  MONGODB_URI
Value: mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
```

**Click**: Save

**Verify**: Check logs for "MongoDB connected"

---

### Step 2: Add to Local Development (3 minutes)

**File**: `apps/api/.env.local`

**Add Line**:
```env
MONGODB_URI=mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
```

**Restart**: `pnpm dev`

**Verify**: Console shows "MongoDB connected"

---

### Step 3: Test Connection (5 minutes)

**Option A: MongoDB Shell**
```bash
mongosh "mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka"
```

**Option B: MongoDB Compass**
1. Download from mongodb.com/products/compass
2. Paste connection string
3. Click Connect

**Expected**: ✅ Connects successfully

---

## 📋 Complete Setup Checklist

### Pre-Setup
- [ ] MongoDB Atlas account created
- [ ] Cluster "smartduka" created
- [ ] User "dontech1914_db_user" created
- [ ] Password: dontech@2025
- [ ] Network access configured (0.0.0.0/0)

### Render Backend Setup
- [ ] Go to Render Dashboard
- [ ] Click "smartduka-api" service
- [ ] Click "Environment"
- [ ] Add MONGODB_URI variable
- [ ] Paste corrected connection string
- [ ] Click "Save"
- [ ] Wait for service to restart
- [ ] Check logs for "MongoDB connected"

### Local Development Setup
- [ ] Open `apps/api/.env.local`
- [ ] Add MONGODB_URI line
- [ ] Paste corrected connection string
- [ ] Save file
- [ ] Run `pnpm dev`
- [ ] Check console for "MongoDB connected"

### Testing
- [ ] Test with MongoDB Shell (if installed)
- [ ] Test with MongoDB Compass (if installed)
- [ ] Test Render backend (check logs)
- [ ] Test local dev (check console)

### Frontend Setup
- [ ] Add NEXT_PUBLIC_API_URL to Vercel
- [ ] Value: https://smartduka-api.onrender.com
- [ ] Deploy frontend
- [ ] Test login

---

## 🧪 Testing Your Connection

### Test 1: MongoDB Shell (Recommended)

**Install** (if not already installed):
```powershell
# Windows
choco install mongodb-shell

# Mac
brew install mongodb-community-shell
```

**Connect**:
```bash
mongosh "mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka"
```

**Expected Output**:
```
smartduka>
```

**Test Commands**:
```javascript
// Show collections
show collections

// Count users
db.users.countDocuments()

// Show first user
db.users.findOne()

// Exit
exit
```

---

### Test 2: MongoDB Compass (GUI)

**Install**:
1. Download from https://www.mongodb.com/products/compass
2. Install on your machine
3. Launch Compass

**Connect**:
1. Click "New Connection"
2. Paste: `mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka`
3. Click "Connect"

**Expected**:
- ✅ Shows "smartduka" database
- ✅ Shows collections (users, products, orders, etc.)
- ✅ Can browse data visually

---

### Test 3: Render Backend

**Check Logs**:
1. Go to Render Dashboard
2. Click "smartduka-api" service
3. Click "Logs"
4. Look for: `MongoDB connected`

**Expected**:
- ✅ `MongoDB connected` → SUCCESS!
- ❌ `Connection refused` → MONGODB_URI not set
- ❌ `Authentication failed` → Password wrong
- ❌ `Connection timeout` → Network access issue

---

### Test 4: Local Development

**Check Console**:
```bash
pnpm dev
```

**Look for**:
- ✅ `MongoDB connected` → SUCCESS!
- ❌ `Connection refused` → MONGODB_URI not set
- ❌ `Authentication failed` → Password wrong

---

## 🔐 Security Notes

### Your Password
- Original: `dontech@2025`
- Contains: `@` (special character)
- URL-encoded: `dontech%402025`

### URL Encoding Rules
- `@` → `%40`
- `:` → `%3A`
- `/` → `%2F`
- `?` → `%3F`
- `#` → `%23`

### Best Practices
- ✅ Never commit connection string to git
- ✅ Store in environment variables
- ✅ Use strong passwords
- ✅ Rotate passwords quarterly
- ✅ Restrict IP access (production)

---

## 📊 Your Setup Summary

```
┌─────────────────────────────────────────────────────────┐
│              YOUR SMARTDUKA SETUP                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Cluster:     smartduka                                │
│  Hostname:    smartduka.0vkcqh5.mongodb.net            │
│  Database:    smartduka                                │
│  Username:    dontech1914_db_user                      │
│  Password:    dontech@2025 (encoded: dontech%402025)   │
│                                                         │
│  Connection String:                                     │
│  mongodb+srv://dontech1914_db_user:dontech%402025@     │
│  smartduka.0vkcqh5.mongodb.net/smartduka?              │
│  appName=smartduka                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Next Steps

### Immediate (Now)
1. ✅ Fix connection string (URL-encode password)
2. ✅ Test with MongoDB Shell or Compass
3. ✅ Add to Render environment
4. ✅ Add to .env.local

### Short-term (Today)
1. Verify Render backend connects
2. Verify local dev connects
3. Deploy frontend to Vercel
4. Test end-to-end

### Long-term (This Week)
1. Monitor logs
2. Test all features
3. Gather feedback
4. Optimize performance

---

## ✅ Success Criteria

- ✅ MongoDB Shell connects successfully
- ✅ MongoDB Compass shows collections
- ✅ Render logs show "MongoDB connected"
- ✅ Local dev console shows "MongoDB connected"
- ✅ Frontend can login
- ✅ Can create products
- ✅ Can make sales
- ✅ Data persists in MongoDB

---

## 📞 If Something Goes Wrong

### "Authentication failed"
```
Cause: Wrong password
Fix: Check password is dontech@2025
     Verify URL encoding: dontech%402025
```

### "Connection timeout"
```
Cause: Network access not configured
Fix: Go to MongoDB Atlas → Network Access
     Add 0.0.0.0/0
     Wait 5 minutes
```

### "Connection refused"
```
Cause: MONGODB_URI not set
Fix: Add MONGODB_URI to Render environment
     Add MONGODB_URI to .env.local
     Restart services
```

---

## 📚 Related Documentation

- **MONGODB_CONNECTION_TEST.md** - Detailed testing guide
- **MONGODB_ATLAS_SETUP_STEPS.md** - Complete setup steps
- **DEPLOYMENT_QUICK_START.md** - Full deployment guide
- **ENVIRONMENT_VARIABLES_SETUP.md** - Environment configuration

---

**Status**: Ready to implement
**Time**: 15-20 minutes
**Difficulty**: Easy

**Your SmartDuka is almost ready to go live! 🚀**
