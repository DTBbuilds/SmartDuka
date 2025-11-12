# MongoDB Atlas Quick Reference Card

**Date**: November 12, 2025
**Purpose**: Quick lookup for MongoDB Atlas setup

---

## 🎯 5-Step Setup Process

```
Step 1: Connect to MongoDB Atlas
   └─ Create account → Create cluster → Verify

Step 2: Set Up Connection Security
   └─ Create user → Configure network access

Step 3: Choose Connection Method
   └─ Get connection string → Replace password → Add database name

Step 4: Connect to Application
   └─ Add to Render → Add to .env.local → Verify

Step 5: Access Data Through Tools
   └─ MongoDB Compass → MongoDB Shell → Atlas Web UI
```

---

## 📋 Quick Checklist

### Step 1: Connect to MongoDB Atlas
- [ ] Go to https://www.mongodb.com/cloud/atlas
- [ ] Create account
- [ ] Create organization: "SmartDuka"
- [ ] Create project: "SmartDuka"
- [ ] Create cluster: "smartduka-prod"
- [ ] Provider: AWS
- [ ] Region: us-east-1
- [ ] Tier: M0 Sandbox (free)
- [ ] Wait for cluster to be Active (5-10 min)

### Step 2: Set Up Connection Security
- [ ] Create user: `smartduka_admin`
- [ ] Generate secure password
- [ ] Save password securely
- [ ] Add network access: 0.0.0.0/0
- [ ] Wait 5 minutes for changes

### Step 3: Choose Connection Method
- [ ] Go to Clusters → Connect
- [ ] Select "Drivers"
- [ ] Language: Node.js
- [ ] Copy connection string
- [ ] Replace `<password>` with actual password
- [ ] Add `/smartduka` before `?`

### Step 4: Connect to Application
- [ ] Add MONGODB_URI to Render environment
- [ ] Add MONGODB_URI to .env.local
- [ ] Restart backend
- [ ] Verify logs show "MongoDB connected"

### Step 5: Access Data Through Tools
- [ ] Download MongoDB Compass
- [ ] Connect with Compass
- [ ] Or use MongoDB Shell
- [ ] Or use Atlas Web UI

---

## 🔑 Key Information

### Cluster Details
```
Name:     smartduka-prod
Provider: AWS
Region:   us-east-1
Tier:     M0 Sandbox (free)
```

### User Credentials
```
Username: smartduka_admin
Password: [YOUR_SECURE_PASSWORD]
```

### Connection String Template
```
mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority
```

### Connection String Example
```
mongodb+srv://smartduka_admin:MySecurePass123@smartduka-prod.a1b2c3d4.mongodb.net/smartduka?retryWrites=true&w=majority
```

---

## 🔗 MongoDB Atlas Links

| Page | URL | Purpose |
|------|-----|---------|
| Home | https://www.mongodb.com/cloud/atlas | Sign up |
| Dashboard | https://cloud.mongodb.com | Manage clusters |
| Clusters | Dashboard → Clusters | View clusters |
| Connect | Clusters → Connect | Get connection string |
| Database Access | Dashboard → Database Access | Manage users |
| Network Access | Dashboard → Network Access | Configure IP whitelist |
| Browse Collections | Clusters → Browse Collections | View data |

---

## 📝 Environment Variables

### Render Backend
```env
MONGODB_URI=mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority
```

### Local Development
```env
# File: apps/api/.env.local
MONGODB_URI=mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority
```

---

## 🛠️ Tools for Accessing Data

### MongoDB Compass (GUI)
```
Download: https://www.mongodb.com/products/compass
Connection: Paste connection string → Click Connect
```

### MongoDB Shell (CLI)
```bash
# Install
choco install mongodb-shell  # Windows
brew install mongodb-community-shell  # Mac

# Connect
mongosh "mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka"

# Commands
show databases
use smartduka
show collections
db.users.find()
db.products.find()
db.orders.find()
```

### Atlas Web UI
```
Location: MongoDB Atlas → Clusters → Browse Collections
```

---

## ⚡ Quick Commands

### Get Connection String
```
MongoDB Atlas → Clusters → Connect → Drivers → Node.js → Copy
```

### Create User
```
MongoDB Atlas → Database Access → Add New Database User
```

### Configure Network Access
```
MongoDB Atlas → Network Access → Add IP Address → 0.0.0.0/0
```

### View Collections
```
MongoDB Atlas → Clusters → Browse Collections
```

### Connect Locally
```bash
mongosh "mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka"
```

---

## 🔐 Security Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| Protocol | `mongodb+srv://` | TLS/SSL encrypted |
| Username | `smartduka_admin` | Database user |
| Password | Secure (auto-generated) | User authentication |
| IP Whitelist | 0.0.0.0/0 | Network access |
| Role | Atlas admin | User permissions |

---

## ✅ Verification Steps

### 1. Cluster Created
```
MongoDB Atlas → Clusters
Should see: smartduka-prod (Active)
```

### 2. User Created
```
MongoDB Atlas → Database Access
Should see: smartduka_admin
```

### 3. Network Access Configured
```
MongoDB Atlas → Network Access
Should see: 0.0.0.0/0
```

### 4. Connection String Obtained
```
Format: mongodb+srv://smartduka_admin:PASSWORD@...
```

### 5. Backend Connected
```
Render logs should show: "MongoDB connected"
```

---

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| Authentication failed | Check username/password in Atlas |
| Connection timeout | Add 0.0.0.0/0 to Network Access |
| Invalid connection string | Copy from Atlas → Drivers |
| ECONNREFUSED | Use mongodb+srv:// not localhost |
| SSL/TLS error | Update Node.js, use mongodb+srv:// |

---

## 📊 Connection String Components

```
mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority
│              │                 │                                        │          │                        │
│              │                 │                                        │          │                        └─ Connection options
│              │                 │                                        │          └─ Database name
│              │                 │                                        └─ Cluster hostname
│              │                 └─ Password
│              └─ Username
└─ Protocol (secure)
```

---

## 🎯 Next Steps

1. **Create Account** - https://www.mongodb.com/cloud/atlas
2. **Create Cluster** - smartduka-prod
3. **Create User** - smartduka_admin
4. **Configure Security** - 0.0.0.0/0
5. **Get Connection String** - Copy from Drivers
6. **Add to Render** - MONGODB_URI environment variable
7. **Test Connection** - Check logs
8. **Access Data** - Use Compass or Shell

---

## 📚 Full Documentation

- **MONGODB_ATLAS_SETUP_STEPS.md** - Complete step-by-step guide
- **MONGODB_ATLAS_CONNECTION_METHODS.md** - Connection methods deep dive
- **ENVIRONMENT_VARIABLES_SETUP.md** - Environment configuration
- **DEPLOYMENT_QUICK_START.md** - Full deployment checklist

---

## ⏱️ Timeline

| Step | Time |
|------|------|
| Create account | 5 min |
| Create cluster | 10 min |
| Create user | 2 min |
| Configure security | 2 min |
| Get connection string | 2 min |
| Add to Render | 5 min |
| Test connection | 5 min |
| **Total** | **30 min** |

---

**Status**: Ready to implement
**Difficulty**: Easy
**Time**: 20-30 minutes
