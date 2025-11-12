# SmartDuka Deployment - Quick Start Checklist

**Estimated Time**: 1-2 hours
**Difficulty**: Medium
**Status**: Ready to execute

---

## 🚀 Quick Start (TL;DR)

### Phase 1: MongoDB Atlas (15-20 min)
```
1. Create MongoDB Atlas account
2. Create cluster (smartduka-prod)
3. Create user (smartduka_admin)
4. Configure network access (0.0.0.0/0)
5. Get connection string
6. Save: mongodb+srv://smartduka_admin:PASSWORD@cluster.mongodb.net/smartduka
```

### Phase 2: Backend to Render (20-30 min)
```
1. Push code to GitHub
2. Create Render account
3. Deploy from GitHub
4. Add environment variables:
   - MONGODB_URI=<from Phase 1>
   - JWT_SECRET=<generate>
   - NODE_ENV=production
5. Get backend URL: https://smartduka-api.onrender.com
```

### Phase 3: Frontend to Vercel (10-15 min)
```
1. Create Vercel account
2. Import GitHub project
3. Set root directory: apps/web
4. Add environment variable:
   - NEXT_PUBLIC_API_URL=https://smartduka-api.onrender.com
5. Deploy
6. Get frontend URL: https://smartduka.vercel.app
```

### Phase 4: Test (10-15 min)
```
1. Open https://smartduka.vercel.app
2. Try to login
3. Create product
4. Make sale
5. Verify data in MongoDB Atlas
```

---

## 📋 Detailed Checklist

### ✅ Pre-Deployment (Local)

- [ ] Code committed to GitHub
- [ ] All tests passing
- [ ] No console errors
- [ ] `.env` files NOT in git
- [ ] `.gitignore` has `.env*`

**Commands**:
```powershell
git status  # Check what's staged
git log --oneline -5  # Verify commits
```

---

### ✅ Phase 1: MongoDB Atlas Setup

#### Create Account
- [ ] Go to https://www.mongodb.com/cloud/atlas
- [ ] Sign up with email
- [ ] Verify email
- [ ] Create organization
- [ ] Create project "SmartDuka"

#### Create Cluster
- [ ] Click "Create Deployment"
- [ ] Provider: AWS
- [ ] Region: us-east-1 (or eu-west-1)
- [ ] Tier: M0 Sandbox (free)
- [ ] Cluster name: smartduka-prod
- [ ] Click "Create Deployment"
- [ ] Wait 5-10 minutes

#### Configure Security
- [ ] Go to "Network Access"
- [ ] Click "Add IP Address"
- [ ] Select "Allow access from anywhere" (0.0.0.0/0)
- [ ] Click "Confirm"

#### Create Database User
- [ ] Go to "Database Access"
- [ ] Click "Add New Database User"
- [ ] Username: `smartduka_admin`
- [ ] Password: Generate secure password
- [ ] Role: "Atlas admin"
- [ ] Click "Add User"
- [ ] **SAVE PASSWORD SECURELY**

#### Get Connection String
- [ ] Go to "Clusters" → "Connect"
- [ ] Select "Drivers"
- [ ] Language: Node.js
- [ ] Copy connection string
- [ ] Replace `<password>` with actual password
- [ ] **SAVE CONNECTION STRING**

**Example**:
```
mongodb+srv://smartduka_admin:MyPassword123@smartduka-prod.a1b2c3d4.mongodb.net/smartduka?retryWrites=true&w=majority
```

---

### ✅ Phase 2: Backend Deployment (Render)

#### Prepare Code
- [ ] Update `apps/api/src/main.ts` CORS:
  ```typescript
  origin: [
    'http://localhost:3000',
    'https://smartduka.vercel.app',
    'https://*.vercel.app',
  ]
  ```
- [ ] Verify `apps/api/package.json` has build scripts
- [ ] Commit changes: `git add . && git commit -m "Prepare for production"`

#### Push to GitHub
- [ ] `git push origin main`
- [ ] Verify on GitHub.com

#### Create Render Service
- [ ] Go to https://render.com
- [ ] Sign up with GitHub
- [ ] Dashboard → "New +" → "Web Service"
- [ ] Connect GitHub repository
- [ ] Select `smartduka` repo
- [ ] Click "Connect"

#### Configure Render Service
- [ ] Name: `smartduka-api`
- [ ] Environment: Node
- [ ] Build Command: `pnpm install && pnpm build`
- [ ] Start Command: `cd apps/api && pnpm start:prod`
- [ ] Plan: Free (or Starter)

#### Add Environment Variables
- [ ] Click "Advanced"
- [ ] Add variables:
  ```
  MONGODB_URI=mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority
  JWT_SECRET=your-super-secret-key-min-32-chars-12345
  NODE_ENV=production
  PORT=5000
  ```

#### Deploy
- [ ] Click "Create Web Service"
- [ ] Wait for build (5-10 minutes)
- [ ] Check logs for errors
- [ ] Get URL: `https://smartduka-api.onrender.com`
- [ ] **SAVE BACKEND URL**

#### Verify Backend
- [ ] Open `https://smartduka-api.onrender.com/health`
- [ ] Should return 200 OK
- [ ] Check Render logs for errors

---

### ✅ Phase 3: Frontend Deployment (Vercel)

#### Create Vercel Account
- [ ] Go to https://vercel.com
- [ ] Sign up with GitHub
- [ ] Authorize Vercel

#### Import Project
- [ ] Dashboard → "Add New..." → "Project"
- [ ] Select `smartduka` repository
- [ ] Click "Import"

#### Configure Project
- [ ] Project Name: `smartduka`
- [ ] Framework: Next.js
- [ ] Root Directory: `apps/web`
- [ ] Build Command: `pnpm build`
- [ ] Install Command: `pnpm install`

#### Add Environment Variables
- [ ] Add variable:
  ```
  NEXT_PUBLIC_API_URL=https://smartduka-api.onrender.com
  ```

#### Deploy
- [ ] Click "Deploy"
- [ ] Wait for build (3-5 minutes)
- [ ] Check build logs
- [ ] Get URL: `https://smartduka.vercel.app`
- [ ] **SAVE FRONTEND URL**

#### Verify Frontend
- [ ] Open `https://smartduka.vercel.app`
- [ ] Page should load
- [ ] Check browser console (F12) for errors
- [ ] Should show login page

---

### ✅ Phase 4: End-to-End Testing

#### Test Login
- [ ] Open https://smartduka.vercel.app
- [ ] Try to register new shop
- [ ] Fill in shop details
- [ ] Fill in admin details
- [ ] Click "Register"
- [ ] Should redirect to login
- [ ] Login with admin email/password
- [ ] Should see dashboard

#### Test Product Creation
- [ ] Click "Inventory" or "Products"
- [ ] Click "Add Product"
- [ ] Fill in product details
- [ ] Click "Save"
- [ ] Product should appear in list

#### Test Sales
- [ ] Go to POS page
- [ ] Add product to cart
- [ ] Click "Checkout"
- [ ] Select payment method
- [ ] Complete sale
- [ ] Receipt should show

#### Verify Data in MongoDB
- [ ] Open MongoDB Atlas
- [ ] Go to Clusters → Browse Collections
- [ ] Check `products` collection
- [ ] Check `orders` collection
- [ ] Data should be there

#### Check Logs
- [ ] Render: Dashboard → Logs
- [ ] Vercel: Deployments → Logs
- [ ] No errors should appear

---

### ✅ Post-Deployment

#### Monitor Services
- [ ] Set up Render alerts
- [ ] Set up Vercel alerts
- [ ] Set up MongoDB Atlas alerts

#### Document URLs
- [ ] Frontend: `https://smartduka.vercel.app`
- [ ] Backend: `https://smartduka-api.onrender.com`
- [ ] Database: MongoDB Atlas cluster

#### Backup Strategy
- [ ] Enable MongoDB Atlas automated backups
- [ ] Document backup location
- [ ] Test restore procedure

#### Security Hardening
- [ ] Change MongoDB password monthly
- [ ] Rotate JWT_SECRET quarterly
- [ ] Enable 2FA on all accounts
- [ ] Review CORS settings

#### Performance Optimization
- [ ] Enable Vercel caching
- [ ] Optimize images
- [ ] Monitor Core Web Vitals
- [ ] Check API response times

---

## 🔑 Important Credentials to Save

```
MongoDB Atlas:
- Username: smartduka_admin
- Password: [SECURE PASSWORD]
- Connection String: mongodb+srv://...

Render:
- Service URL: https://smartduka-api.onrender.com
- Environment Variables: [See above]

Vercel:
- Project URL: https://smartduka.vercel.app
- Environment Variables: [See above]

GitHub:
- Repository: https://github.com/YOUR_USERNAME/smartduka
```

**⚠️ IMPORTANT**: Store these securely (password manager, not in code)

---

## 🚨 Common Issues & Solutions

### Issue: Backend won't start
```
Error in Render logs: ECONNREFUSED
Solution: Check MONGODB_URI in Render environment variables
```

### Issue: Frontend can't connect to backend
```
Error in browser console: CORS error
Solution: 
1. Check NEXT_PUBLIC_API_URL in Vercel
2. Verify backend CORS includes Vercel domain
3. Restart backend service
```

### Issue: MongoDB connection timeout
```
Error: Connection timeout
Solution:
1. Go to MongoDB Atlas → Network Access
2. Verify 0.0.0.0/0 is added
3. Wait 5 minutes for changes
4. Try again
```

### Issue: Build fails on Render
```
Error: pnpm: command not found
Solution:
1. Render → Environment → Node Version: 20.x
2. Rebuild service
```

### Issue: Vercel build fails
```
Error: Module not found
Solution:
1. Ensure root directory is apps/web
2. Check build command: pnpm build
3. Clear cache and redeploy
```

---

## ⏱️ Timeline

| Phase | Task | Time |
|-------|------|------|
| 1 | MongoDB Atlas setup | 15-20 min |
| 2 | Backend deployment | 20-30 min |
| 3 | Frontend deployment | 10-15 min |
| 4 | Testing & verification | 10-15 min |
| **Total** | | **1-2 hours** |

---

## 📞 Support

- **Render Support**: https://render.com/support
- **Vercel Support**: https://vercel.com/support
- **MongoDB Support**: https://support.mongodb.com
- **GitHub Issues**: Create issue in repository

---

## ✅ Final Checklist

- [ ] MongoDB Atlas cluster running
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] All environment variables set
- [ ] Login works
- [ ] Products can be created
- [ ] Sales can be completed
- [ ] Data persists in MongoDB
- [ ] No console errors
- [ ] Monitoring set up
- [ ] Credentials saved securely

**Status**: Ready to deploy! 🚀
