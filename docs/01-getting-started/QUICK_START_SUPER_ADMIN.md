# Quick Start - Super Admin Setup 🚀

**Date:** Nov 6, 2025  
**Status:** ✅ READY TO GO  

---

## ⚡ QUICK START (5 MINUTES)

### Prerequisites Check ✅
- ✅ Backend API installed
- ✅ Environment variables configured
- ✅ MongoDB running
- ✅ Setup script ready

---

## 🎯 RUN SETUP IN 3 STEPS

### Step 1: Open Terminal
```bash
# Navigate to the project root
cd e:\BUILds\SmartDuka
```

### Step 2: Go to API Directory
```bash
cd apps/api
```

### Step 3: Run Setup Script
```bash
pnpm setup:super-admin
```

---

## ✅ EXPECTED OUTPUT

```
🔐 Setting up Super Admin User...

📡 Connecting to MongoDB: mongodb://localhost:27017/smartduka
✅ Connected to MongoDB

🔒 Hashing password...
✅ Password hashed

💾 Creating super admin user...
✅ Super admin created successfully!

═══════════════════════════════════════════════════════
🎉 SUPER ADMIN SETUP COMPLETE
═══════════════════════════════════════════════════════

📧 Email:    smartduka@admin.auth
🔑 Password: duka-smart

🌐 Login URL: http://localhost:3000/login
📍 Access:   Click lock icon (bottom right corner)

═══════════════════════════════════════════════════════
```

---

## 🔑 CREDENTIALS

```
Email:    smartduka@admin.auth
Password: duka-smart
```

---

## 🌐 LOGIN

1. Go to `http://localhost:3000/login`
2. Click lock icon (bottom right corner)
3. Enter credentials
4. Click "Access"
5. Redirected to dashboard

---

## 📊 WHAT WAS CREATED

- ✅ Super admin user in MongoDB
- ✅ Password hashed securely
- ✅ Role set to super_admin
- ✅ Status set to active

---

## 🎉 YOU'RE DONE!

The super admin is now set up and ready to use.

---

**Status:** ✅ READY  
**Next:** Login and access the dashboard  

---

**Last Updated:** Nov 6, 2025, 8:25 PM UTC+03:00
