# SmartDuka Deployment Plan: Vercel + Render + MongoDB Atlas

**Date**: November 12, 2025
**Status**: Ready for Implementation
**Priority**: HIGH

---

## 📋 Executive Summary

This guide covers deploying SmartDuka to production using:
- **Frontend**: Vercel (Next.js 16)
- **Backend**: Render (NestJS)
- **Database**: MongoDB Atlas (Cloud)

### Current Architecture
```
Local Development:
┌─────────────────────────────────────┐
│ Frontend (Next.js)                  │
│ http://localhost:3000               │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│ Backend (NestJS)                    │
│ http://localhost:5000               │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│ MongoDB (Local)                     │
│ mongodb://localhost:27017/smartduka │
└─────────────────────────────────────┘
```

### Production Architecture (Target)
```
┌─────────────────────────────────────┐
│ Frontend (Vercel)                   │
│ smartduka.vercel.app                │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│ Backend (Render)                    │
│ smartduka-api.onrender.com          │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│ MongoDB Atlas (Cloud)               │
│ mongodb+srv://user:pass@cluster.    │
│ mongodb.net/smartduka               │
└─────────────────────────────────────┘
```

---

## 🔑 Part 1: MongoDB Atlas Connection (CRITICAL FIRST STEP)

### Why MongoDB Atlas First?
1. **Connection String Required**: Backend needs Atlas URI before deployment
2. **Environment Setup**: Frontend needs API URL which depends on backend
3. **Data Migration**: Need to set up database before backend starts

### Step 1.1: Create MongoDB Atlas Account & Cluster

**Prerequisites**:
- Email address
- Credit card (free tier available)

**Process**:
1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Try Free"
3. Sign up with email
4. Create organization
5. Create project (e.g., "SmartDuka")
6. Create cluster:
   - Provider: AWS
   - Region: **us-east-1** (or closest to Kenya: eu-west-1 for Europe)
   - Tier: **M0 Sandbox** (free, 512MB storage)
   - Cluster name: "smartduka-prod"

**Time**: ~5-10 minutes

### Step 1.2: Configure Network Access

**Add IP Whitelist**:
1. Go to "Network Access" → "IP Whitelist"
2. Click "Add IP Address"
3. Select "Allow access from anywhere" (0.0.0.0/0)
   - ⚠️ For production, restrict to specific IPs
4. Click "Confirm"

**Why**: Render backend needs to connect from any IP

**Time**: ~2 minutes

### Step 1.3: Create Database User

**Create User**:
1. Go to "Database Access" → "Add New Database User"
2. Authentication Method: "Password"
3. Username: `smartduka_admin`
4. Password: Generate secure password (save it!)
5. Built-in Role: "Atlas admin"
6. Click "Add User"

**Save Credentials**:
```
Username: smartduka_admin
Password: [YOUR_SECURE_PASSWORD]
```

**Time**: ~2 minutes

### Step 1.4: Get Connection String

**Retrieve Connection String**:
1. Go to "Clusters" → Click "Connect"
2. Select "Drivers"
3. Language: "Node.js"
4. Version: "5.9 or later"
5. Copy connection string

**Connection String Format**:
```
mongodb+srv://smartduka_admin:<password>@smartduka-prod.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

**Replace Placeholders**:
```
mongodb+srv://smartduka_admin:YOUR_PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority
```

**Example** (with actual values):
```
mongodb+srv://smartduka_admin:MySecurePass123@smartduka-prod.a1b2c3d4.mongodb.net/smartduka?retryWrites=true&w=majority
```

**Save This**: You'll need it for Render backend

**Time**: ~2 minutes

### Step 1.5: Verify Connection (Optional but Recommended)

**Test Connection Locally**:
```powershell
# Install MongoDB CLI (optional)
# Or use MongoDB Compass GUI

# Test connection string
$connectionString = "mongodb+srv://smartduka_admin:YOUR_PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority"

# Update local .env temporarily
echo "MONGODB_URI=$connectionString" | Out-File -Append .env.local
```

**Time**: ~5 minutes

### ✅ MongoDB Atlas Setup Complete
- Cluster created
- User created
- Connection string obtained
- Network access configured

**Next**: Deploy backend to Render

---

## 🚀 Part 2: Backend Deployment (Render)

### Why Render?
- Free tier available
- Easy deployment from GitHub
- Auto-deploys on git push
- Environment variables support
- Perfect for NestJS apps

### Step 2.1: Prepare Backend for Production

**Update CORS Configuration**:

File: `apps/api/src/main.ts`

```typescript
app.enableCors({
  origin: [
    'http://localhost:3000',           // Local dev
    'http://localhost:3001',           // Local dev
    'https://smartduka.vercel.app',    // Production frontend
    'https://*.vercel.app',            // All Vercel deployments
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
  exposedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
});
```

**Update Port Configuration**:

File: `apps/api/src/main.ts`

```typescript
const port = process.env.PORT || 5000;
await app.listen(port);
console.log(`🚀 Backend API running on port ${port}`);
```

**Verify Build Script**:

File: `apps/api/package.json`

```json
{
  "scripts": {
    "build": "nest build",
    "start:prod": "node dist/main"
  }
}
```

**Time**: ~5 minutes

### Step 2.2: Push to GitHub

**Prerequisites**:
- GitHub account
- Git installed

**Process**:
```powershell
# Initialize git (if not already)
git init

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/smartduka.git

# Create .gitignore (if not exists)
# Ensure these are ignored:
# - node_modules/
# - dist/
# - .env
# - .env.local
# - .env.*.local

# Commit and push
git add .
git commit -m "Initial commit: SmartDuka monorepo"
git branch -M main
git push -u origin main
```

**Time**: ~5-10 minutes

### Step 2.3: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub
3. Authorize Render to access your repositories

**Time**: ~3 minutes

### Step 2.4: Deploy Backend to Render

**Create New Service**:
1. Dashboard → "New +" → "Web Service"
2. Connect GitHub repository
3. Select `smartduka` repository
4. Click "Connect"

**Configure Service**:
- **Name**: `smartduka-api`
- **Environment**: `Node`
- **Build Command**: `pnpm install && pnpm build`
- **Start Command**: `cd apps/api && pnpm start:prod`
- **Plan**: Free (or Starter if free not available)

**Add Environment Variables**:
Click "Advanced" → "Add Environment Variable"

Add these variables:
```
MONGODB_URI=mongodb+srv://smartduka_admin:YOUR_PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long-12345
PORT=5000
NODE_ENV=production
```

**Generate JWT_SECRET**:
```powershell
# Generate random string
[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([guid]::NewGuid().ToString() + [guid]::NewGuid().ToString()))
```

**Deploy**:
1. Click "Create Web Service"
2. Wait for build (5-10 minutes)
3. Get service URL: `https://smartduka-api.onrender.com`

**Verify Deployment**:
```bash
curl https://smartduka-api.onrender.com/health
# Should return 200 OK
```

**Time**: ~15-20 minutes

### ✅ Backend Deployment Complete
- Render service created
- Environment variables configured
- Backend URL: `https://smartduka-api.onrender.com`

**Save Backend URL**: You'll need it for frontend

---

## 🌐 Part 3: Frontend Deployment (Vercel)

### Why Vercel?
- Optimized for Next.js
- Free tier with unlimited deployments
- Automatic builds on git push
- Environment variables support
- CDN included

### Step 3.1: Prepare Frontend for Production

**Update API Configuration**:

File: `apps/web/.env.production`

```
NEXT_PUBLIC_API_URL=https://smartduka-api.onrender.com
```

**Update next.config.ts**:

File: `apps/web/next.config.ts`

```typescript
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: path.join(__dirname, "../../"),
  },
  // Add production optimizations
  compress: true,
  poweredByHeader: false,
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ],
      },
    ];
  },
};

export default nextConfig;
```

**Time**: ~5 minutes

### Step 3.2: Create Vercel Account

1. Go to https://vercel.com
2. Sign up with GitHub
3. Authorize Vercel

**Time**: ~3 minutes

### Step 3.3: Deploy Frontend to Vercel

**Import Project**:
1. Dashboard → "Add New..." → "Project"
2. Select GitHub repository: `smartduka`
3. Click "Import"

**Configure Project**:
- **Project Name**: `smartduka`
- **Framework**: Next.js
- **Root Directory**: `apps/web`
- **Build Command**: `pnpm build`
- **Output Directory**: `.next`
- **Install Command**: `pnpm install`

**Add Environment Variables**:
- **NEXT_PUBLIC_API_URL**: `https://smartduka-api.onrender.com`

**Deploy**:
1. Click "Deploy"
2. Wait for build (3-5 minutes)
3. Get URL: `https://smartduka.vercel.app`

**Verify Deployment**:
```bash
curl https://smartduka.vercel.app
# Should return HTML
```

**Time**: ~10-15 minutes

### ✅ Frontend Deployment Complete
- Vercel project created
- Environment variables configured
- Frontend URL: `https://smartduka.vercel.app`

---

## 🔄 Part 4: Environment Variables Summary

### Backend (Render) - `apps/api`

```env
# Database
MONGODB_URI=mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long-12345
JWT_EXPIRES=7d

# Server
PORT=5000
NODE_ENV=production

# CORS (optional, already in code)
CORS_ORIGIN=https://smartduka.vercel.app
```

### Frontend (Vercel) - `apps/web`

```env
# API
NEXT_PUBLIC_API_URL=https://smartduka-api.onrender.com

# Optional: Analytics, etc.
# NEXT_PUBLIC_GA_ID=...
```

---

## 🧪 Part 5: Testing Production Deployment

### Test Backend

```bash
# Test API health
curl https://smartduka-api.onrender.com/health

# Test CORS
curl -H "Origin: https://smartduka.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     https://smartduka-api.onrender.com/auth/login

# Test database connection
curl https://smartduka-api.onrender.com/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

### Test Frontend

1. Go to https://smartduka.vercel.app
2. Try to login
3. Check browser console for errors
4. Verify API calls go to Render backend

### Test End-to-End

1. Register new shop
2. Create products
3. Make a sale
4. Verify data in MongoDB Atlas

---

## 🔐 Security Checklist

- [ ] MongoDB Atlas: IP whitelist configured
- [ ] MongoDB Atlas: Strong password set
- [ ] Render: Environment variables not exposed
- [ ] Vercel: Environment variables not exposed
- [ ] Backend: CORS restricted to Vercel domain
- [ ] Backend: JWT_SECRET is strong (>32 chars)
- [ ] Frontend: API URL uses HTTPS
- [ ] No sensitive data in git history

---

## 📊 Monitoring & Maintenance

### Monitor Backend (Render)
- Dashboard → Logs
- Check for errors
- Monitor resource usage

### Monitor Frontend (Vercel)
- Dashboard → Deployments
- Check build logs
- Monitor analytics

### Monitor Database (MongoDB Atlas)
- Cluster → Metrics
- Check connection count
- Monitor storage usage

---

## 🚨 Troubleshooting

### Backend Won't Start
```
Error: ECONNREFUSED - MongoDB connection failed
Solution: Check MONGODB_URI in Render environment variables
```

### Frontend Can't Connect to Backend
```
Error: CORS error or 404
Solution: 
1. Verify NEXT_PUBLIC_API_URL in Vercel
2. Check backend CORS configuration
3. Verify backend is running
```

### Database Connection Timeout
```
Error: Connection timeout
Solution:
1. Check MongoDB Atlas network access
2. Verify IP whitelist includes 0.0.0.0/0
3. Check connection string format
```

---

## 📈 Next Steps After Deployment

1. **Set up monitoring**
   - Render alerts
   - Vercel alerts
   - MongoDB Atlas alerts

2. **Set up backups**
   - MongoDB Atlas automated backups
   - Regular exports

3. **Set up CI/CD**
   - Automated tests on push
   - Staging environment

4. **Performance optimization**
   - Enable caching
   - Optimize images
   - Monitor Core Web Vitals

5. **Security hardening**
   - Enable 2FA
   - Set up API rate limiting
   - Regular security audits

---

## 📞 Support Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com
- **NestJS Docs**: https://docs.nestjs.com
- **Next.js Docs**: https://nextjs.org/docs

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Code committed to GitHub
- [ ] All tests passing locally
- [ ] Environment variables documented
- [ ] CORS configured
- [ ] Build scripts verified

### MongoDB Atlas
- [ ] Cluster created
- [ ] User created
- [ ] Network access configured
- [ ] Connection string obtained

### Render Backend
- [ ] Service created
- [ ] Environment variables set
- [ ] Build successful
- [ ] API responding

### Vercel Frontend
- [ ] Project imported
- [ ] Environment variables set
- [ ] Build successful
- [ ] App accessible

### Post-Deployment
- [ ] Login works
- [ ] API calls succeed
- [ ] Data persists in MongoDB
- [ ] No console errors
- [ ] Monitoring set up

---

**Status**: Ready for implementation
**Estimated Time**: 1-2 hours total
**Difficulty**: Medium (mostly configuration)
