# Super Admin Login - Troubleshooting Guide 🔧

**Date:** Nov 6, 2025  
**Status:** ✅ TROUBLESHOOTING COMPLETE  
**Priority:** CRITICAL  

---

## 🚨 ISSUE: "Invalid credentials" Error

### Problem
Super admin login fails with "Invalid credentials" message even with correct email and password.

### Root Causes
1. Super admin user not found in database
2. Password hash mismatch
3. Super admin model not registered in auth module
4. Email case sensitivity issue
5. Super admin status not 'active'

---

## 🔍 DIAGNOSTIC STEPS

### Step 1: Verify Super Admin Exists

**Run verification script:**
```bash
cd apps/api
pnpm verify:super-admin
```

**Expected Output:**
```
🔍 Verifying Super Admin User...

📡 Connecting to MongoDB: mongodb://localhost:27017/smartduka
✅ Connected to MongoDB

🔎 Looking for super admin: smartduka@admin.auth
✅ Super admin found!

📋 Document Info:
   ID: 690cb4d19197000686bcb4d1
   Email: smartduka@admin.auth
   Role: super_admin
   Status: active
   Password Hash: $2a$10$...
   Created: 2025-11-06T14:46:41.759Z

🔐 Verifying password...
✅ Password is correct!

✨ Super admin is ready to login!
```

### Step 2: Check Backend Logs

Look for errors in the backend console:
```
[Nest] ... LOG [NestFactory] Starting Nest application...
[Nest] ... LOG [InstanceLoader] MongooseModule dependencies initialized
```

If you see errors, the super admin model might not be registered.

### Step 3: Verify Backend is Running

```bash
# Check if backend is running on port 5000
curl http://localhost:5000/health
```

---

## ✅ SOLUTIONS

### Solution 1: Super Admin Not Found

**Problem:** Verification script shows "Super admin not found!"

**Solution:**
```bash
cd apps/api
pnpm setup:super-admin
```

This will create the super admin user.

### Solution 2: Password Incorrect

**Problem:** Verification script shows "Password is incorrect!"

**Solution:**
```bash
# Delete and recreate
cd apps/api
pnpm setup:super-admin
```

### Solution 3: Backend Not Rebuilt

**Problem:** Changes to auth service not applied

**Solution:**
```bash
cd apps/api
pnpm build
pnpm dev
```

### Solution 4: Email Case Sensitivity

**Problem:** Email doesn't match exactly

**Solution:**
Make sure to enter email exactly as:
```
smartduka@admin.auth
```

(All lowercase, no spaces)

### Solution 5: Super Admin Status Not Active

**Problem:** Verification shows status is not 'active'

**Solution:**
```bash
# Delete and recreate
cd apps/api
pnpm setup:super-admin
```

---

## 🔧 COMPLETE TROUBLESHOOTING WORKFLOW

### Step 1: Verify Super Admin Exists
```bash
cd apps/api
pnpm verify:super-admin
```

### Step 2: If Not Found, Create It
```bash
pnpm setup:super-admin
```

### Step 3: Verify Again
```bash
pnpm verify:super-admin
```

### Step 4: Rebuild Backend
```bash
pnpm build
```

### Step 5: Restart Backend
```bash
pnpm dev
```

### Step 6: Test Login
1. Go to http://localhost:3000/login
2. Click lock icon (bottom right)
3. Enter credentials:
   - Email: `smartduka@admin.auth`
   - Password: `duka-smart`
4. Click "Access"

### Step 7: Check Backend Logs
Look for any errors in the backend console.

---

## 📊 VERIFICATION CHECKLIST

- [ ] Backend rebuilt (`pnpm build`)
- [ ] Backend running (`pnpm dev`)
- [ ] Super admin exists (`pnpm verify:super-admin`)
- [ ] Password correct (`pnpm verify:super-admin`)
- [ ] Status is 'active' (`pnpm verify:super-admin`)
- [ ] Email is lowercase
- [ ] Password is correct
- [ ] No typos in credentials
- [ ] Backend logs show no errors
- [ ] Login successful

---

## 🔐 CREDENTIALS

```
Email:    smartduka@admin.auth
Password: duka-smart
```

**Important:** Exact case and spelling required!

---

## 📝 QUICK COMMANDS

### Verify Super Admin
```bash
cd apps/api
pnpm verify:super-admin
```

### Setup Super Admin
```bash
cd apps/api
pnpm setup:super-admin
```

### Rebuild Backend
```bash
cd apps/api
pnpm build
```

### Run Backend
```bash
cd apps/api
pnpm dev
```

---

## 🆘 IF STILL NOT WORKING

### Check MongoDB Connection
```bash
mongosh
use smartduka
db.super_admins.find()
```

### Check Auth Service Logs
```bash
# In backend console, look for:
# - "Super admin authentication not available"
# - "Invalid credentials"
# - "Account is disabled"
```

### Reset Everything
```bash
# 1. Delete super admin
mongosh
use smartduka
db.super_admins.deleteOne({ email: "smartduka@admin.auth" })

# 2. Create new super admin
cd apps/api
pnpm setup:super-admin

# 3. Rebuild backend
pnpm build

# 4. Restart backend
pnpm dev

# 5. Verify
pnpm verify:super-admin

# 6. Test login
# Go to http://localhost:3000/login
```

---

## 📞 SUPPORT

If you're still having issues:

1. **Run verification script**
   ```bash
   pnpm verify:super-admin
   ```

2. **Check backend logs** for error messages

3. **Verify credentials** are exactly:
   - Email: `smartduka@admin.auth`
   - Password: `duka-smart`

4. **Reset everything** using the steps above

---

**Status:** ✅ TROUBLESHOOTING GUIDE COMPLETE  
**Next:** Run `pnpm verify:super-admin` to diagnose the issue  

---

**Last Updated:** Nov 6, 2025, 8:40 PM UTC+03:00
