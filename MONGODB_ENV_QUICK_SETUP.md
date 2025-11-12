# MongoDB Environment Variables - Quick Setup

**Date**: November 12, 2025
**Time**: 15 minutes
**Your Connection String**: `mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka`

---

## 🚀 Quick Setup (Copy & Paste)

### Part 1: Render Backend (5 minutes)

```
1. Go to: https://dashboard.render.com
2. Click: smartduka-api service
3. Click: Environment tab
4. Add/Update these variables:

MONGODB_URI
mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka

JWT_SECRET
your-secure-random-key-minimum-32-characters-long-12345

NODE_ENV
production

PORT
5000

CORS_ORIGIN
https://smartduka.vercel.app

5. Click: Save
6. Wait: 2-3 minutes for restart
7. Check: Logs for "MongoDB connected"
```

---

### Part 2: Local Development (3 minutes)

```
1. Open: apps/api/.env.local
2. Copy and paste:

MONGODB_URI=mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES=7d
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

3. Save: Ctrl+S
4. Restart: pnpm dev
5. Check: Console for "MongoDB connected"
```

---

## 📋 Copy-Paste Values

### For Render Backend

**MONGODB_URI** (Copy entire line):
```
mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
```

**JWT_SECRET** (Generate your own or use):
```
your-super-secret-key-minimum-32-characters-long-12345
```

**NODE_ENV**:
```
production
```

**PORT**:
```
5000
```

**CORS_ORIGIN**:
```
https://smartduka.vercel.app
```

---

### For Local .env.local

**Copy entire block**:
```env
MONGODB_URI=mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES=7d
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

---

## ✅ Verification

### Render Backend
```
1. Go to Render Dashboard
2. Click smartduka-api
3. Click Logs
4. Look for: "MongoDB connected"
5. If found → ✅ SUCCESS!
```

### Local Development
```
1. Run: pnpm dev
2. Look for: "MongoDB connected"
3. If found → ✅ SUCCESS!
```

---

## 🧪 Quick Test

### Test 1: MongoDB Shell
```bash
mongosh "mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka"
```

**Expected**: `smartduka>` prompt

### Test 2: Check Render Logs
```
Render Dashboard → smartduka-api → Logs
Look for: "MongoDB connected"
```

### Test 3: Check Local Console
```
Run: pnpm dev
Look for: "MongoDB connected"
```

---

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| "Connection refused" | Check MONGODB_URI is set in Render |
| "Authentication failed" | Check password: dontech@2025 (encoded: dontech%402025) |
| "Connection timeout" | Add 0.0.0.0/0 to MongoDB Atlas Network Access |
| "Invalid connection string" | Copy from MongoDB Atlas → Drivers |

---

## 📝 Checklist

- [ ] Render MONGODB_URI added
- [ ] Render JWT_SECRET added
- [ ] Render NODE_ENV = production
- [ ] Render PORT = 5000
- [ ] Render CORS_ORIGIN = https://smartduka.vercel.app
- [ ] Render service restarted
- [ ] Render logs show "MongoDB connected"
- [ ] Local .env.local created/updated
- [ ] Local MONGODB_URI added
- [ ] Local pnpm dev restarted
- [ ] Local console shows "MongoDB connected"

---

## 🎯 Next Steps

1. ✅ Configure Render (5 min)
2. ✅ Configure Local Dev (3 min)
3. ✅ Test Connection (5 min)
4. → Deploy Frontend to Vercel (10-15 min)
5. → Test End-to-End (10 min)

---

**Status**: Ready to configure
**Time**: 15 minutes
**Difficulty**: Easy

**Let's go! 🚀**
