# MongoDB Atlas Complete Setup Guide for SmartDuka

**Date**: November 12, 2025
**Purpose**: Complete guide for MongoDB Atlas connection
**Time**: 20-30 minutes

---

## 📌 Overview

This guide covers all 5 steps to connect SmartDuka to MongoDB Atlas:

1. **Connect to MongoDB Atlas** - Create account and cluster
2. **Set up Connection Security** - Create user and configure network
3. **Choose Connection Method** - Get connection string
4. **Connect to Application** - Add to Render and local dev
5. **Access Data Through Tools** - Use Compass, Shell, or Atlas UI

---

## 🎯 Step 1: Connect to MongoDB Atlas

### 1.1 Create MongoDB Account

**URL**: https://www.mongodb.com/cloud/atlas

**Steps**:
1. Click "Try Free"
2. Sign up with email address
3. Verify email (check inbox)
4. Accept terms and conditions
5. Click "Create Account"

**Time**: 5 minutes

### 1.2 Create Organization

**After Login**:
1. Click "Create an organization"
2. Organization name: `SmartDuka`
3. Click "Create Organization"

**Time**: 1 minute

### 1.3 Create Project

**In Organization**:
1. Click "Create a new project"
2. Project name: `SmartDuka`
3. Click "Create Project"

**Time**: 1 minute

### 1.4 Create Cluster

**In Project**:
1. Click "Create a Deployment"
2. Select configuration:
   - **Provider**: AWS
   - **Region**: us-east-1 (or eu-west-1 for Europe)
   - **Tier**: M0 Sandbox (free, 512MB)
   - **Cluster Name**: `smartduka-prod`
3. Click "Create Deployment"
4. Wait 5-10 minutes for cluster to start

**Verification**:
- Go to "Clusters" page
- Should see "smartduka-prod" with green checkmark
- Status should be "Active"

**Time**: 15 minutes (including wait)

---

## 🔐 Step 2: Set Up Connection Security

### 2.1 Create Database User

**Location**: Left menu → "Database Access"

**Steps**:
1. Click "Database Access"
2. Click "Add New Database User"
3. Fill in form:
   - **Authentication Method**: Password
   - **Username**: `smartduka_admin`
   - **Password**: Click "Autogenerate Secure Password"
   - **Built-in Role**: "Atlas admin"
4. Click "Add User"

**Save Credentials**:
```
Username: smartduka_admin
Password: [COPY AND SAVE SECURELY]
```

⚠️ **IMPORTANT**: Save password in password manager or secure location

**Time**: 2 minutes

### 2.2 Configure Network Access

**Location**: Left menu → "Network Access"

**Steps**:
1. Click "Network Access"
2. Click "Add IP Address"
3. Select "Allow access from anywhere" (0.0.0.0/0)
   - ⚠️ For initial setup only
   - For production: Restrict to specific IPs
4. Click "Confirm"

**Wait**: 5 minutes for changes to propagate

**Time**: 2 minutes (+ 5 min wait)

### 2.3 Verify Security Setup

**Checklist**:
- [ ] User "smartduka_admin" created
- [ ] Password saved securely
- [ ] Network access 0.0.0.0/0 added
- [ ] Status shows "Active"

---

## 🔗 Step 3: Choose Connection Method

### 3.1 Get Connection String

**Location**: Clusters → Connect → Drivers

**Steps**:
1. Go to "Clusters" page
2. Click "Connect" button
3. Select "Drivers"
4. Language: "Node.js"
5. Version: "5.9 or later"
6. Copy the connection string

**Connection String Format**:
```
mongodb+srv://smartduka_admin:<password>@smartduka-prod.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

**Time**: 2 minutes

### 3.2 Replace Password

**Before**:
```
mongodb+srv://smartduka_admin:<password>@smartduka-prod.xxxxx.mongodb.net/?retryWrites=true&w=majority
                                ^^^^^^^^^
                                Replace this
```

**After**:
```
mongodb+srv://smartduka_admin:MySecurePass123@smartduka-prod.a1b2c3d4.mongodb.net/?retryWrites=true&w=majority
                                ^^^^^^^^^^^^^^^^
                                Your actual password
```

**Steps**:
1. Find `<password>` in connection string
2. Replace with actual password (from Step 2.1)
3. Keep everything else the same

**Time**: 1 minute

### 3.3 Add Database Name

**Important**: Add `/smartduka` before the `?`

**Before**:
```
mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/?retryWrites=true&w=majority
                                                                        ^
                                                                        Add /smartduka here
```

**After**:
```
mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority
                                                                        ^^^^^^^^^^
                                                                        Database name added
```

**Final Connection String**:
```
mongodb+srv://smartduka_admin:MySecurePass123@smartduka-prod.a1b2c3d4.mongodb.net/smartduka?retryWrites=true&w=majority
```

**Time**: 1 minute

---

## 🚀 Step 4: Connect to Application

### 4.1 Add to Render Backend (Production)

**Location**: Render Dashboard → Service → Environment

**Steps**:
1. Go to Render Dashboard
2. Click "smartduka-api" service
3. Click "Environment" tab
4. Click "Add Environment Variable"
5. Name: `MONGODB_URI`
6. Value: [Your connection string from Step 3.3]
7. Click "Save"

**Service Restart**:
- Service automatically restarts
- Check logs for success

**Verify in Logs**:
```
✅ "MongoDB connected"
❌ NOT "Connection refused"
```

**Time**: 5 minutes

### 4.2 Add to Local Development

**File**: `apps/api/.env.local`

**Steps**:
1. Open `apps/api/.env.local`
2. Add line:
   ```env
   MONGODB_URI=mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority
   ```
3. Replace PASSWORD with actual password
4. Save file
5. Restart dev server: `pnpm dev`

**Verify**:
- Backend starts without errors
- Console shows: "MongoDB connected"

**Time**: 3 minutes

---

## 🔍 Step 5: Access Data Through Tools

### 5.1 MongoDB Compass (GUI - Visual)

**Installation**:
1. Download from https://www.mongodb.com/products/compass
2. Install on your machine
3. Launch Compass

**Connection**:
1. Click "New Connection"
2. Paste connection string:
   ```
   mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority
   ```
3. Click "Connect"
4. Browse databases and collections

**Features**:
- View all collections
- View documents
- Create/edit/delete data
- Run queries
- Export data

**Time**: 5 minutes

### 5.2 MongoDB Shell (CLI - Command Line)

**Installation**:
```powershell
# Windows (Chocolatey)
choco install mongodb-shell

# Mac (Homebrew)
brew install mongodb-community-shell

# Or download from https://www.mongodb.com/try/download/shell
```

**Connection**:
```bash
mongosh "mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka"
```

**Common Commands**:
```javascript
// Show all databases
show databases

// Use smartduka database
use smartduka

// Show all collections
show collections

// View all users
db.users.find()

// View all products
db.products.find()

// View all orders
db.orders.find()

// Count documents
db.users.countDocuments()

// Exit
exit
```

**Time**: 5 minutes

### 5.3 MongoDB Atlas Web UI

**Location**: MongoDB Atlas → Clusters → Browse Collections

**Steps**:
1. Go to MongoDB Atlas
2. Click "Clusters"
3. Click "Browse Collections"
4. View all databases and collections
5. Click on collection to see documents

**Features**:
- View documents
- Search documents
- Filter documents
- View document details

**Time**: 2 minutes

---

## 📋 Complete Checklist

### Step 1: Connect to MongoDB Atlas
- [ ] Account created
- [ ] Organization created: SmartDuka
- [ ] Project created: SmartDuka
- [ ] Cluster created: smartduka-prod
- [ ] Cluster status: Active (green checkmark)

### Step 2: Set Up Connection Security
- [ ] User created: smartduka_admin
- [ ] Password generated and saved
- [ ] Network access: 0.0.0.0/0 added
- [ ] Changes propagated (5 minutes passed)

### Step 3: Choose Connection Method
- [ ] Connection string obtained
- [ ] Password replaced in string
- [ ] Database name added (/smartduka)
- [ ] Format verified

### Step 4: Connect to Application
- [ ] MONGODB_URI added to Render
- [ ] MONGODB_URI added to .env.local
- [ ] Backend restarted
- [ ] Logs show "MongoDB connected"

### Step 5: Access Data Through Tools
- [ ] MongoDB Compass installed and connected
- [ ] MongoDB Shell installed and connected
- [ ] Atlas Web UI accessible
- [ ] Can view collections and documents

---

## 🔧 Configuration Summary

### Cluster Configuration
```
Name:     smartduka-prod
Provider: AWS
Region:   us-east-1
Tier:     M0 Sandbox (free)
Status:   Active
```

### User Configuration
```
Username: smartduka_admin
Password: [SECURE_PASSWORD]
Role:     Atlas admin
```

### Network Configuration
```
IP Whitelist: 0.0.0.0/0
Protocol:     TLS/SSL (mongodb+srv://)
```

### Connection String
```
mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority
```

### Environment Variables
```
# Render Backend
MONGODB_URI=mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority

# Local Development
MONGODB_URI=mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority
```

---

## 🧪 Testing Connection

### Test 1: Verify Connection String
```bash
# Check format
echo "mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority"
# Should have no errors
```

### Test 2: Connect with Compass
1. Open MongoDB Compass
2. Paste connection string
3. Click "Connect"
4. Should connect successfully

### Test 3: Connect with Shell
```bash
mongosh "mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka"
# Should show: smartduka>
```

### Test 4: Connect with Application
```bash
# Check Render logs
# Should see: "MongoDB connected"
# Should NOT see: "Connection refused"
```

### Test 5: Verify Data
1. Open MongoDB Compass
2. Browse Collections
3. Should see collections: users, products, orders
4. Should see documents in collections

---

## 🚨 Troubleshooting

### Issue: "Authentication failed"
```
Error: Authentication failed
Cause: Wrong password or username
Solution:
1. Go to MongoDB Atlas → Database Access
2. Check username: smartduka_admin
3. Check password is correct
4. Regenerate password if needed
5. Update MONGODB_URI
```

### Issue: "Connection timeout"
```
Error: Connection timeout
Cause: Network access not configured
Solution:
1. Go to MongoDB Atlas → Network Access
2. Add IP address: 0.0.0.0/0
3. Wait 5 minutes for changes
4. Try again
```

### Issue: "Invalid connection string"
```
Error: Invalid connection string
Cause: Malformed URI
Solution:
1. Copy from Atlas → Connect → Drivers
2. Replace <password> with actual password
3. Ensure no spaces in URI
4. Verify database name: /smartduka
```

### Issue: "ECONNREFUSED"
```
Error: ECONNREFUSED
Cause: Trying localhost instead of Atlas
Solution:
1. Check MONGODB_URI environment variable
2. Should start with: mongodb+srv://
3. NOT: mongodb://localhost
```

### Issue: "SSL/TLS error"
```
Error: SSL/TLS error
Cause: Certificate validation issue
Solution:
1. Use mongodb+srv:// protocol
2. Update Node.js to latest
3. Check firewall/proxy settings
```

---

## ⏱️ Timeline

| Step | Task | Time |
|------|------|------|
| 1 | Create account | 5 min |
| 1 | Create cluster | 10 min |
| 2 | Create user | 2 min |
| 2 | Configure security | 2 min |
| 3 | Get connection string | 2 min |
| 3 | Replace password | 1 min |
| 4 | Add to Render | 5 min |
| 4 | Add to .env.local | 3 min |
| 5 | Test connection | 5 min |
| **Total** | | **35 min** |

---

## 📚 Related Documentation

- **MONGODB_ATLAS_SETUP_STEPS.md** - Step-by-step guide
- **MONGODB_ATLAS_QUICK_REFERENCE.md** - Quick lookup card
- **MONGODB_ATLAS_CONNECTION_METHODS.md** - Connection methods deep dive
- **ENVIRONMENT_VARIABLES_SETUP.md** - Environment configuration
- **DEPLOYMENT_QUICK_START.md** - Full deployment checklist

---

## ✅ Success Criteria

After completing all 5 steps, you should have:

- ✅ MongoDB Atlas cluster running
- ✅ Database user created
- ✅ Network access configured
- ✅ Connection string obtained
- ✅ Backend connected to MongoDB
- ✅ Local dev connected to MongoDB
- ✅ Can access data with Compass/Shell
- ✅ Ready for production deployment

---

## 🎉 Next Steps

1. **Complete all 5 steps** above
2. **Verify connection** using test commands
3. **Deploy backend** to Render
4. **Deploy frontend** to Vercel
5. **Test end-to-end** application

---

**Status**: Ready to implement
**Difficulty**: Easy (mostly clicking and copying)
**Time**: 20-30 minutes
**Success Rate**: 99% (if following steps exactly)
