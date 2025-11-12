# Environment Variables Setup Guide

**Date**: November 12, 2025
**Purpose**: Configure environment variables for all deployment stages

---

## 📊 Environment Variables Overview

### Development (Local)
```
Frontend: apps/web/.env.local
Backend: apps/api/.env.local
Database: Local MongoDB
```

### Production (Deployed)
```
Frontend: Vercel environment variables
Backend: Render environment variables
Database: MongoDB Atlas
```

---

## 🔧 Backend Environment Variables

### File: `apps/api/.env.local` (Development)

```env
# Database
MONGODB_URI=mongodb://localhost:27017/smartduka

# Authentication
JWT_SECRET=your-development-secret-key-change-in-production
JWT_EXPIRES=7d

# Server
PORT=5000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000

# Optional: M-Pesa (if integrating)
MPESA_CONSUMER_KEY=your_key_here
MPESA_CONSUMER_SECRET=your_secret_here
MPESA_PASSKEY=your_passkey_here
MPESA_SHORTCODE=your_shortcode_here
```

### File: Render Environment Variables (Production)

**Location**: Render Dashboard → Service → Environment

```env
# Database - CRITICAL
MONGODB_URI=mongodb+srv://smartduka_admin:YOUR_PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority

# Authentication - CRITICAL
JWT_SECRET=generate-a-secure-random-string-minimum-32-characters-long-12345

# Server
PORT=5000
NODE_ENV=production

# CORS
CORS_ORIGIN=https://smartduka.vercel.app

# Optional: M-Pesa (if integrating)
MPESA_CONSUMER_KEY=your_production_key
MPESA_CONSUMER_SECRET=your_production_secret
MPESA_PASSKEY=your_production_passkey
MPESA_SHORTCODE=your_production_shortcode
```

---

## 🌐 Frontend Environment Variables

### File: `apps/web/.env.local` (Development)

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000

# Optional: Analytics
# NEXT_PUBLIC_GA_ID=your_ga_id

# Optional: Sentry
# NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

### File: Vercel Environment Variables (Production)

**Location**: Vercel Dashboard → Project → Settings → Environment Variables

```env
# API Configuration - CRITICAL
NEXT_PUBLIC_API_URL=https://smartduka-api.onrender.com

# Optional: Analytics
# NEXT_PUBLIC_GA_ID=your_ga_id

# Optional: Sentry
# NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

---

## 🔐 Generating Secure Secrets

### JWT_SECRET Generation

**Option 1: PowerShell (Windows)**
```powershell
# Generate random 32+ character string
$secret = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([guid]::NewGuid().ToString() + [guid]::NewGuid().ToString()))
Write-Host $secret
```

**Option 2: Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 3: OpenSSL**
```bash
openssl rand -base64 32
```

**Example Output**:
```
a7f8d9e2c1b4f6a9e3d7c2b5f8a1d4e6f9c2b5a8d1e4f7a0c3b6e9f2d5a8c1
```

---

## 📝 Environment Variable Descriptions

### Backend Variables

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `MONGODB_URI` | Database connection | `mongodb+srv://...` | ✅ Yes |
| `JWT_SECRET` | Token signing key | `a7f8d9e2c1b4...` | ✅ Yes |
| `JWT_EXPIRES` | Token expiration | `7d` | ✅ Yes |
| `PORT` | Server port | `5000` | ✅ Yes |
| `NODE_ENV` | Environment | `production` | ✅ Yes |
| `CORS_ORIGIN` | Frontend URL | `https://smartduka.vercel.app` | ✅ Yes |
| `MPESA_CONSUMER_KEY` | M-Pesa key | `xxxxx` | ❌ No |
| `MPESA_CONSUMER_SECRET` | M-Pesa secret | `xxxxx` | ❌ No |

### Frontend Variables

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `NEXT_PUBLIC_API_URL` | Backend URL | `https://smartduka-api.onrender.com` | ✅ Yes |
| `NEXT_PUBLIC_GA_ID` | Google Analytics | `G-XXXXXX` | ❌ No |
| `NEXT_PUBLIC_SENTRY_DSN` | Error tracking | `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx` | ❌ No |

---

## 🔄 How Environment Variables Are Used

### Backend (NestJS)

**In Code**:
```typescript
// apps/api/src/app.module.ts
MongooseModule.forRoot(process.env.MONGODB_URI)

// apps/api/src/auth/auth.module.ts
JwtModule.register({
  secret: process.env.JWT_SECRET,
  signOptions: { expiresIn: process.env.JWT_EXPIRES },
})

// apps/api/src/main.ts
const port = process.env.PORT || 5000;
```

**At Runtime**:
```
Node.js reads .env file
↓
process.env.VARIABLE_NAME
↓
Used in application
```

### Frontend (Next.js)

**In Code**:
```typescript
// apps/web/src/lib/auth-context.tsx
const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
fetch(`${base}/auth/login`)
```

**Build Time**:
```
Next.js reads environment variables
↓
Replaces NEXT_PUBLIC_* with actual values
↓
Embedded in JavaScript bundle
↓
Sent to browser
```

⚠️ **Important**: Only `NEXT_PUBLIC_*` variables are sent to browser. Others are server-only.

---

## 🚀 Setting Up for Deployment

### Step 1: Generate JWT_SECRET

```powershell
# Windows PowerShell
$secret = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([guid]::NewGuid().ToString() + [guid]::NewGuid().ToString()))
Write-Host "JWT_SECRET=$secret"
```

Save the output.

### Step 2: Get MongoDB Connection String

From MongoDB Atlas:
1. Clusters → Connect
2. Drivers → Node.js
3. Copy connection string
4. Replace `<password>` with actual password

Example:
```
mongodb+srv://smartduka_admin:MyPassword123@smartduka-prod.a1b2c3d4.mongodb.net/smartduka?retryWrites=true&w=majority
```

### Step 3: Set Render Environment Variables

1. Render Dashboard → Service → Environment
2. Add each variable:
   - `MONGODB_URI` = [from Step 2]
   - `JWT_SECRET` = [from Step 1]
   - `NODE_ENV` = `production`
   - `PORT` = `5000`
   - `CORS_ORIGIN` = `https://smartduka.vercel.app`

### Step 4: Set Vercel Environment Variables

1. Vercel Dashboard → Project → Settings → Environment Variables
2. Add variable:
   - `NEXT_PUBLIC_API_URL` = `https://smartduka-api.onrender.com`

### Step 5: Verify

1. Render: Check logs for "MongoDB connected"
2. Vercel: Check build logs for no errors
3. Test: Open frontend and try to login

---

## 🔒 Security Best Practices

### 1. Never Commit Secrets to Git

**File: `.gitignore`**
```
# Environment variables
.env
.env.local
.env.*.local
.env.production.local

# Dependencies
node_modules/
dist/
.next/

# IDE
.vscode/
.idea/
*.swp
```

**Verify**:
```bash
git status
# Should NOT show .env files
```

### 2. Use Different Secrets for Each Environment

```
Development:  JWT_SECRET=dev-secret-123
Staging:      JWT_SECRET=staging-secret-456
Production:   JWT_SECRET=prod-secret-789
```

### 3. Rotate Secrets Regularly

**Monthly**:
- Generate new JWT_SECRET
- Update in Render
- Restart service

**Quarterly**:
- Rotate MongoDB password
- Update connection string
- Restart backend

### 4. Restrict Access

**MongoDB Atlas**:
- Limit IP access (not 0.0.0.0/0 in production)
- Use VPC peering for enterprise

**Render**:
- Enable 2FA
- Restrict team access
- Audit logs

**Vercel**:
- Enable 2FA
- Restrict team access
- Use environment variable protection

### 5. Monitor Access

**Check Logs**:
```
Render: Dashboard → Logs
Vercel: Deployments → Logs
MongoDB Atlas: Activity Feed
```

---

## 🧪 Testing Environment Variables

### Test Backend

```bash
# Check if variables are loaded
curl https://smartduka-api.onrender.com/health

# Check logs
# Should see: "MongoDB connected"
# Should see: "Backend running on port 5000"
```

### Test Frontend

```bash
# Check if API URL is correct
# Open browser console (F12)
# Go to Network tab
# Make a request
# Should see: https://smartduka-api.onrender.com/...
```

### Test Database Connection

```bash
# In Render logs
# Should see: "Connected to MongoDB"
# Should NOT see: "Connection refused"
```

---

## 🔄 Updating Environment Variables

### Update Backend Variables (Render)

1. Render Dashboard → Service → Environment
2. Click variable to edit
3. Update value
4. Click "Save"
5. Service automatically restarts
6. Check logs for success

### Update Frontend Variables (Vercel)

1. Vercel Dashboard → Project → Settings → Environment Variables
2. Click variable to edit
3. Update value
4. Click "Save"
5. Redeploy project (or auto-redeploy on git push)
6. Check build logs

### Update Local Variables

1. Edit `.env.local` file
2. Save file
3. Restart dev server: `pnpm dev`
4. Changes take effect immediately

---

## 📋 Environment Variable Checklist

### Development Setup
- [ ] Created `.env.local` in `apps/api`
- [ ] Created `.env.local` in `apps/web`
- [ ] `MONGODB_URI` points to local MongoDB
- [ ] `NEXT_PUBLIC_API_URL` points to `http://localhost:5000`
- [ ] `.env.local` files in `.gitignore`
- [ ] Dev server starts without errors

### Production Setup (Render Backend)
- [ ] Generated secure `JWT_SECRET`
- [ ] Got MongoDB Atlas connection string
- [ ] Added `MONGODB_URI` to Render
- [ ] Added `JWT_SECRET` to Render
- [ ] Added `NODE_ENV=production` to Render
- [ ] Added `PORT=5000` to Render
- [ ] Added `CORS_ORIGIN=https://smartduka.vercel.app` to Render
- [ ] Backend deployed successfully
- [ ] Logs show "MongoDB connected"

### Production Setup (Vercel Frontend)
- [ ] Added `NEXT_PUBLIC_API_URL=https://smartduka-api.onrender.com`
- [ ] Frontend deployed successfully
- [ ] Build logs show no errors
- [ ] Frontend can connect to backend

### Security
- [ ] No secrets in git history
- [ ] `.gitignore` includes `.env*`
- [ ] Different secrets for dev/prod
- [ ] Secrets stored securely (password manager)
- [ ] Access restricted to team members
- [ ] Monitoring enabled

---

## 🚨 Troubleshooting

### Issue: "Cannot find module" in Render logs
```
Cause: Missing environment variable
Solution:
1. Check Render environment variables
2. Ensure all required variables are set
3. Restart service
```

### Issue: "CORS error" in browser console
```
Cause: CORS_ORIGIN not set correctly
Solution:
1. Check CORS_ORIGIN in Render
2. Should be: https://smartduka.vercel.app
3. Restart backend
```

### Issue: "MongoDB connection refused" in logs
```
Cause: Wrong MONGODB_URI
Solution:
1. Check MONGODB_URI in Render
2. Verify password is correct
3. Verify cluster is running
4. Restart service
```

### Issue: Frontend can't connect to backend
```
Cause: NEXT_PUBLIC_API_URL incorrect
Solution:
1. Check NEXT_PUBLIC_API_URL in Vercel
2. Should be: https://smartduka-api.onrender.com
3. Redeploy frontend
```

---

## 📚 Reference

### Environment Variable Files Location

```
SmartDuka/
├── apps/
│   ├── api/
│   │   └── .env.local (development)
│   └── web/
│       └── .env.local (development)
├── .gitignore (includes .env*)
└── DEPLOYMENT_PLAN_VERCEL_RENDER_ATLAS.md
```

### Render Environment Variables Location

```
Render Dashboard
→ Services
→ smartduka-api
→ Environment
→ [Add/Edit variables here]
```

### Vercel Environment Variables Location

```
Vercel Dashboard
→ Projects
→ smartduka
→ Settings
→ Environment Variables
→ [Add/Edit variables here]
```

---

## ✅ Summary

**For Development**:
- Use `.env.local` files
- Point to local MongoDB
- Point frontend to `http://localhost:5000`

**For Production**:
- Use Render environment variables for backend
- Use Vercel environment variables for frontend
- Point to MongoDB Atlas
- Use secure, generated secrets
- Never commit secrets to git

**Security**:
- Rotate secrets regularly
- Restrict access
- Monitor logs
- Use different secrets per environment
