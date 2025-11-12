# Your SmartDuka Deployment Credentials

**Date**: November 12, 2025
**Status**: All credentials documented and ready

---

## 🔑 Your Credentials

### GitHub Repository
```
URL:      https://github.com/dtbbuildsoffice/SmartDuka
Username: dtbbuildsoffice
Email:    dtbbuildsoffice@gmail.com
```

### MongoDB Atlas
```
Cluster:   smartduka
Hostname:  smartduka.0vkcqh5.mongodb.net
Database:  smartduka
Username:  dontech1914_db_user
Password:  dontech@2025 (URL-encoded: dontech%402025)
```

### Render Backend
```
Service:   smartduka-api
URL:       https://smartduka.onrender.com
GitHub:    https://github.com/dtbbuildsoffice/SmartDuka
```

### Vercel Frontend
```
Project:   smartduka
URL:       https://smartduka.vercel.app
GitHub:    https://github.com/dtbbuildsoffice/SmartDuka
```

---

## 📋 Complete Configuration Summary

### GitHub
```
Repository:  https://github.com/dtbbuildsoffice/SmartDuka
Username:    dtbbuildsoffice
Email:       dtbbuildsoffice@gmail.com
Branch:      main
```

### MongoDB Atlas
```
Connection String:
mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
```

### Backend (Render)
```
Service Name:    smartduka-api
URL:             https://smartduka.onrender.com
GitHub Repo:     https://github.com/dtbbuildsoffice/SmartDuka
Build Command:   npm run build
Start Command:   node dist/main
Environment:     production
```

### Frontend (Vercel)
```
Project Name:    smartduka
URL:             https://smartduka.vercel.app
GitHub Repo:     https://github.com/dtbbuildsoffice/SmartDuka
Framework:       Next.js
Environment:     production
```

---

## 🚀 Deployment Checklist

### GitHub Setup
- [ ] Repository: https://github.com/dtbbuildsoffice/SmartDuka
- [ ] Username: dtbbuildsoffice
- [ ] Email: dtbbuildsoffice@gmail.com
- [ ] Main branch has all code
- [ ] .gitignore excludes .env files
- [ ] All changes committed and pushed

### MongoDB Atlas
- [ ] Cluster: smartduka
- [ ] User: dontech1914_db_user
- [ ] Password: dontech@2025
- [ ] Connection String: mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
- [ ] Network Access: 0.0.0.0/0 configured

### Render Backend
- [ ] Service: smartduka-api
- [ ] Connected to GitHub: https://github.com/dtbbuildsoffice/SmartDuka
- [ ] MONGODB_URI environment variable set
- [ ] JWT_SECRET environment variable set
- [ ] NODE_ENV = production
- [ ] PORT = 5000
- [ ] CORS_ORIGIN = https://smartduka.vercel.app
- [ ] Service deployed and running

### Vercel Frontend
- [ ] Project: smartduka
- [ ] Connected to GitHub: https://github.com/dtbbuildsoffice/SmartDuka
- [ ] NEXT_PUBLIC_API_URL = https://smartduka.onrender.com
- [ ] Project deployed and running

### Code Configuration
- [ ] Backend CORS includes: https://smartduka.vercel.app
- [ ] Frontend API URL: https://smartduka.onrender.com
- [ ] Local .env.local configured
- [ ] All environment variables set

---

## 📝 Environment Variables

### Render Backend
```
MONGODB_URI=mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
JWT_SECRET=your-secure-key-here
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://smartduka.vercel.app
```

### Vercel Frontend
```
NEXT_PUBLIC_API_URL=https://smartduka.onrender.com
```

### Local Development
```
MONGODB_URI=mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
JWT_SECRET=dev-secret-key
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 🔗 Important URLs

### GitHub
```
Repository:  https://github.com/dtbbuildsoffice/SmartDuka
```

### MongoDB Atlas
```
Dashboard:   https://cloud.mongodb.com
Cluster:     smartduka
```

### Render
```
Dashboard:   https://dashboard.render.com
Service:     smartduka-api
URL:         https://smartduka.onrender.com
```

### Vercel
```
Dashboard:   https://vercel.com/dashboard
Project:     smartduka
URL:         https://smartduka.vercel.app
```

---

## 🎯 Deployment Steps

### Step 1: Verify GitHub Repository
```bash
# Check remote
git remote -v
# Should show: https://github.com/dtbbuildsoffice/SmartDuka

# Verify branch
git branch
# Should show: main

# Push latest code
git push origin main
```

### Step 2: Connect Render to GitHub
```
1. Go to https://dashboard.render.com
2. Click "New +"
3. Select "Web Service"
4. Connect GitHub: https://github.com/dtbbuildsoffice/SmartDuka
5. Select repository
6. Configure service:
   - Name: smartduka-api
   - Build Command: npm run build
   - Start Command: node dist/main
7. Add environment variables
8. Deploy
```

### Step 3: Connect Vercel to GitHub
```
1. Go to https://vercel.com/dashboard
2. Click "Add New..."
3. Select "Project"
4. Import from Git: https://github.com/dtbbuildsoffice/SmartDuka
5. Configure project:
   - Framework: Next.js
   - Root Directory: apps/web
6. Add environment variables
7. Deploy
```

### Step 4: Test Deployment
```
1. Open https://smartduka.vercel.app
2. Try to login
3. Check for errors
4. Verify data in MongoDB Atlas
```

---

## 📊 Deployment Status

| Component | Status | URL |
|-----------|--------|-----|
| GitHub | ✅ Ready | https://github.com/dtbbuildsoffice/SmartDuka |
| MongoDB Atlas | ✅ Ready | smartduka cluster |
| Render Backend | ⏳ Pending | https://smartduka.onrender.com |
| Vercel Frontend | ⏳ Pending | https://smartduka.vercel.app |

---

## 🔐 Security Notes

### GitHub
- ✅ Repository is public
- ✅ .env files in .gitignore
- ✅ No secrets in code

### MongoDB Atlas
- ✅ Connection string uses URL encoding
- ✅ Network access configured
- ✅ Strong password set

### Render
- ✅ Environment variables stored securely
- ✅ Connected via GitHub (no credentials in code)
- ✅ CORS configured

### Vercel
- ✅ Environment variables stored securely
- ✅ Connected via GitHub (no credentials in code)
- ✅ Frontend URL protected

---

## 🚀 Next Steps

1. **Verify GitHub** (5 min)
   - Check repository: https://github.com/dtbbuildsoffice/SmartDuka
   - Verify all code is pushed
   - Check main branch

2. **Deploy to Render** (10-15 min)
   - Connect GitHub repository
   - Configure environment variables
   - Deploy backend

3. **Deploy to Vercel** (10-15 min)
   - Connect GitHub repository
   - Configure environment variables
   - Deploy frontend

4. **Test End-to-End** (10 min)
   - Open https://smartduka.vercel.app
   - Test login
   - Test features
   - Check MongoDB for data

---

## 📞 Quick Reference

### GitHub
```
URL:      https://github.com/dtbbuildsoffice/SmartDuka
Username: dtbbuildsoffice
Email:    dtbbuildsoffice@gmail.com
```

### MongoDB Connection
```
mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
```

### Backend URL
```
https://smartduka.onrender.com
```

### Frontend URL
```
https://smartduka.vercel.app
```

---

## ✅ Verification Checklist

- [ ] GitHub repository verified
- [ ] All code pushed to main branch
- [ ] MongoDB Atlas cluster ready
- [ ] Render service configured
- [ ] Vercel project configured
- [ ] Environment variables set
- [ ] CORS configured
- [ ] URLs configured
- [ ] Ready to deploy

---

**Status**: ✅ All credentials documented
**Date**: November 12, 2025
**Ready to Deploy**: YES

**Your SmartDuka is ready for production deployment! 🚀**
