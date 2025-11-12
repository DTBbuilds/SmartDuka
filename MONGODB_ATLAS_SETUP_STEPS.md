# MongoDB Atlas Setup for SmartDuka - Complete Steps

**Date**: November 12, 2025
**Goal**: Connect SmartDuka to MongoDB Atlas
**Time**: 20-30 minutes

---

## 📋 Overview of Steps

```
1. Connect to MongoDB Atlas
2. Set up Connection Security
3. Choose Connection Method
4. Connect to Application
5. Access Data Through Tools
```

---

## Step 1: Connect to MongoDB Atlas

### 1.1 Create Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Try Free"
3. Sign up with email
4. Verify email
5. Create organization (name: "SmartDuka")
6. Create project (name: "SmartDuka")

### 1.2 Create Cluster
1. Click "Create Deployment"
2. Select configuration:
   - **Provider**: AWS
   - **Region**: us-east-1 (or eu-west-1 for Europe)
   - **Tier**: M0 Sandbox (free, 512MB)
   - **Cluster Name**: smartduka-prod
3. Click "Create Deployment"
4. Wait 5-10 minutes for cluster to start

### 1.3 Verify Cluster Created
- Go to "Clusters" page
- Should see "smartduka-prod" cluster
- Status should be "Active" (green checkmark)

---

## Step 2: Set Up Connection Security

### 2.1 Create Database User

**Location**: Database Access → Add New Database User

**Steps**:
1. Click "Database Access" in left menu
2. Click "Add New Database User"
3. Fill in:
   - **Authentication Method**: Password
   - **Username**: `smartduka_admin`
   - **Password**: Generate secure password (click "Autogenerate Secure Password")
   - **Built-in Role**: "Atlas admin"
4. Click "Add User"

**Save These Credentials**:
```
Username: smartduka_admin
Password: [YOUR_GENERATED_PASSWORD]
```

⚠️ **IMPORTANT**: Save the password securely (password manager)

### 2.2 Configure Network Access

**Location**: Network Access → IP Whitelist

**Steps**:
1. Click "Network Access" in left menu
2. Click "Add IP Address"
3. Select "Allow access from anywhere" (0.0.0.0/0)
   - ⚠️ For initial setup only
   - For production: Restrict to specific IPs
4. Click "Confirm"

**Wait**: Changes take 5 minutes to propagate

### 2.3 Verify Security Setup
- Database Access: User "smartduka_admin" created ✓
- Network Access: 0.0.0.0/0 added ✓

---

## Step 3: Choose Connection Method

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

### 3.2 Replace Placeholder

**Before**:
```
mongodb+srv://smartduka_admin:<password>@smartduka-prod.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

**After** (replace `<password>` with actual password):
```
mongodb+srv://smartduka_admin:MySecurePass123@smartduka-prod.a1b2c3d4.mongodb.net/smartduka?retryWrites=true&w=majority
```

### 3.3 Add Database Name

**Important**: Add `/smartduka` before the `?`

**Correct Format**:
```
mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority
                                                                                    ^^^^^^^^^^
                                                                                    Database name
```

---

## Step 4: Connect to Application

### 4.1 For Render Backend (Production)

**Location**: Render Dashboard → Service → Environment

**Add Environment Variable**:
```
MONGODB_URI=mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority
```

**Steps**:
1. Go to Render Dashboard
2. Select "smartduka-api" service
3. Click "Environment"
4. Click "Add Environment Variable"
5. Name: `MONGODB_URI`
6. Value: [Your connection string from Step 3.2]
7. Click "Save"
8. Service automatically restarts

**Verify**:
- Check Render logs
- Should see: "MongoDB connected"
- Should NOT see: "Connection refused"

### 4.2 For Local Development (Testing)

**Location**: `apps/api/.env.local`

**Add Environment Variable**:
```env
MONGODB_URI=mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority
```

**Steps**:
1. Open `apps/api/.env.local`
2. Add the line above
3. Replace PASSWORD with actual password
4. Save file
5. Restart dev server: `pnpm dev`

**Verify**:
- Backend starts without errors
- Console shows: "MongoDB connected"

---

## Step 5: Access Data Through Tools

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

**What You Can Do**:
- View all collections
- View documents
- Create/edit/delete data
- Run queries
- Export data

### 5.2 MongoDB Shell (CLI - Command Line)

**Installation**:
```powershell
# Option 1: Download from https://www.mongodb.com/try/download/shell
# Option 2: Using Chocolatey (Windows)
choco install mongodb-shell

# Option 3: Using Homebrew (Mac)
brew install mongodb-community-shell
```

**Connection**:
```bash
mongosh "mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka"
```

**Common Commands**:
```javascript
// Show databases
show databases

// Use smartduka database
use smartduka

// Show collections
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

### 5.3 MongoDB Atlas Web Interface

**Location**: MongoDB Atlas → Clusters → Browse Collections

**Steps**:
1. Go to MongoDB Atlas
2. Click "Clusters"
3. Click "Browse Collections"
4. View all databases and collections
5. Click on collection to see documents

**What You Can Do**:
- View documents
- Search documents
- Filter documents
- View document details

---

## 🔍 Verification Checklist

### Cluster Setup
- [ ] Cluster "smartduka-prod" created
- [ ] Cluster status is "Active" (green)
- [ ] Cluster is M0 Sandbox (free tier)

### Security Setup
- [ ] User "smartduka_admin" created
- [ ] Password saved securely
- [ ] Network access 0.0.0.0/0 added
- [ ] Changes propagated (5 minutes)

### Connection String
- [ ] Connection string obtained
- [ ] Password replaced in string
- [ ] Database name added (/smartduka)
- [ ] Format verified

### Application Connection
- [ ] MONGODB_URI set in Render
- [ ] MONGODB_URI set in .env.local (dev)
- [ ] Backend starts without errors
- [ ] Logs show "MongoDB connected"

### Data Access
- [ ] Can connect with Compass
- [ ] Can connect with Shell
- [ ] Can view collections in Atlas
- [ ] Can see data

---

## 📊 Connection String Breakdown

### Full Connection String
```
mongodb+srv://smartduka_admin:MyPassword123@smartduka-prod.a1b2c3d4.mongodb.net/smartduka?retryWrites=true&w=majority
```

### Component Breakdown

| Component | Value | Purpose |
|-----------|-------|---------|
| Protocol | `mongodb+srv://` | Secure connection |
| Username | `smartduka_admin` | Database user |
| Password | `MyPassword123` | User password |
| Host | `smartduka-prod.a1b2c3d4.mongodb.net` | Cluster hostname |
| Database | `smartduka` | Database name |
| Options | `retryWrites=true&w=majority` | Connection options |

### Connection Options Explained

| Option | Value | Meaning |
|--------|-------|---------|
| `retryWrites` | `true` | Automatically retry failed writes |
| `w` | `majority` | Wait for majority of replicas |
| `maxPoolSize` | `10` | Max connection pool size |
| `minPoolSize` | `5` | Min connection pool size |

---

## 🔐 Security Configuration Summary

### What We Set Up

**User Authentication**:
- ✅ Username: `smartduka_admin`
- ✅ Password: Secure (auto-generated)
- ✅ Role: Atlas admin

**Network Security**:
- ✅ IP Whitelist: 0.0.0.0/0 (initial setup)
- ⚠️ For production: Restrict to specific IPs

**Connection Security**:
- ✅ Protocol: `mongodb+srv://` (TLS/SSL encrypted)
- ✅ Password: In environment variable (not hardcoded)
- ✅ Connection pooling: Automatic

---

## 🧪 Testing Connection

### Test 1: Verify Connection String Format
```bash
# Check if connection string is valid
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
# Render logs should show:
# ✅ "MongoDB connected"
# ❌ NOT "Connection refused"
```

### Test 5: Verify Data
1. Open MongoDB Compass
2. Browse Collections
3. Should see collections: users, products, orders, etc.
4. Should see documents in collections

---

## 🚨 Troubleshooting

### Issue: "Authentication failed"
```
Error: Authentication failed
Cause: Wrong password or username
Solution:
1. Check MongoDB Atlas → Database Access
2. Verify username: smartduka_admin
3. Verify password is correct
4. Regenerate password if needed
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

## 📝 Configuration Summary for SmartDuka

### MongoDB Atlas Cluster
```
Cluster Name: smartduka-prod
Provider: AWS
Region: us-east-1
Tier: M0 Sandbox (free)
Status: Active
```

### Database User
```
Username: smartduka_admin
Password: [SECURE_PASSWORD]
Role: Atlas admin
```

### Network Access
```
IP Whitelist: 0.0.0.0/0
Protocol: TLS/SSL (mongodb+srv://)
```

### Connection String
```
mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority
```

### Environment Variable (Render)
```
MONGODB_URI=mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority
```

### Environment Variable (Local Dev)
```
MONGODB_URI=mongodb+srv://smartduka_admin:PASSWORD@smartduka-prod.xxxxx.mongodb.net/smartduka?retryWrites=true&w=majority
```

---

## ✅ Next Steps

1. **Complete Step 1**: Create MongoDB Atlas account and cluster
2. **Complete Step 2**: Set up security (user + network access)
3. **Complete Step 3**: Get connection string
4. **Complete Step 4**: Connect to application (Render + local)
5. **Complete Step 5**: Access data through tools

**After Completion**:
- Backend can connect to MongoDB Atlas
- Frontend can make API calls
- Data persists in cloud
- Ready for production deployment

---

## 📚 Related Documentation

- **MONGODB_ATLAS_CONNECTION_METHODS.md** - Connection methods deep dive
- **ENVIRONMENT_VARIABLES_SETUP.md** - Environment configuration
- **DEPLOYMENT_QUICK_START.md** - Full deployment checklist
- **DEPLOYMENT_PLAN_VERCEL_RENDER_ATLAS.md** - Complete deployment guide

---

**Status**: Ready to implement
**Time**: 20-30 minutes
**Difficulty**: Easy (mostly clicking and copying)
