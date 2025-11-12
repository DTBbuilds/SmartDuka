# MongoDB Atlas Connection Test - SmartDuka

**Date**: November 12, 2025
**Status**: Testing your connection string
**Connection String**: `mongodb+srv://dontech1914_db_user:<dontech@2025>@smartduka.0vkcqh5.mongodb.net/?appName=smartduka`

---

## ⚠️ IMPORTANT: Fix Your Connection String First

Your connection string has an issue:

### Current (WRONG)
```
mongodb+srv://dontech1914_db_user:<dontech@2025>@smartduka.0vkcqh5.mongodb.net/?appName=smartduka
```

### Problem
- `<dontech@2025>` contains special characters (`@` and `>`)
- These need to be URL-encoded
- `@` should be `%40`
- `>` should be `%3E`

### Corrected (RIGHT)
```
mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
```

### Changes Made
1. Replaced `<dontech@2025>` with `dontech%402025`
   - `@` → `%40`
   - Removed `<` and `>`
2. Added database name: `/smartduka`
3. Kept `?appName=smartduka` option

---

## ✅ Your Corrected Connection String

```
mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
```

**Save this!** This is what you'll use.

---

## 🧪 Test 1: Verify Connection String Format

**Command**:
```bash
echo "mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka"
```

**Expected Output**:
```
mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
```

**Status**: ✅ If no errors

---

## 🧪 Test 2: Connect with MongoDB Shell

### Installation (if not already installed)

**Windows (Chocolatey)**:
```powershell
choco install mongodb-shell
```

**Mac (Homebrew)**:
```bash
brew install mongodb-community-shell
```

**Or Download**:
https://www.mongodb.com/try/download/shell

### Connect

**Command**:
```bash
mongosh "mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka"
```

**Expected Output**:
```
Current Mongosh Log ID: xxxxxxxxxxxxx
Connecting to:          mongodb+srv://<credentials>@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
MongoServerError: authentication failed
```

**If you see**:
- ✅ `smartduka>` prompt → **CONNECTION SUCCESSFUL!**
- ❌ `authentication failed` → Password is wrong
- ❌ `connection timeout` → Network access not configured
- ❌ `command not found` → MongoDB Shell not installed

### Test Commands (if connected)

```javascript
// Show current database
db

// Show collections
show collections

// Count users
db.users.countDocuments()

// Show first user
db.users.findOne()

// Exit
exit
```

---

## 🧪 Test 3: Connect with MongoDB Compass

### Installation

1. Download from: https://www.mongodb.com/products/compass
2. Install on your machine
3. Launch Compass

### Connect

1. Click "New Connection"
2. Paste connection string:
   ```
   mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
   ```
3. Click "Connect"

**Expected**:
- ✅ Connects successfully
- ✅ Shows "smartduka" database
- ✅ Shows collections (users, products, orders, etc.)
- ❌ "Authentication failed" → Password wrong
- ❌ "Connection timeout" → Network access issue

---

## 🧪 Test 4: Connect with Application (Render Backend)

### Add to Render Environment Variables

1. Go to Render Dashboard
2. Click "smartduka-api" service
3. Click "Environment"
4. Add/Update variable:
   - **Name**: `MONGODB_URI`
   - **Value**: `mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka`
5. Click "Save"
6. Service restarts automatically

### Check Logs

1. Go to Render Dashboard
2. Click "smartduka-api" service
3. Click "Logs"
4. Look for:
   - ✅ `MongoDB connected` → **SUCCESS!**
   - ❌ `Connection refused` → MONGODB_URI not set
   - ❌ `Authentication failed` → Password wrong
   - ❌ `Connection timeout` → Network access issue

---

## 🧪 Test 5: Connect with Local Development

### Update .env.local

**File**: `apps/api/.env.local`

```env
MONGODB_URI=mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
JWT_SECRET=your-secret-key-here
NODE_ENV=development
PORT=5000
```

### Restart Backend

```bash
# Stop current dev server (Ctrl+C)
# Then restart
pnpm dev
```

### Check Console Output

Look for:
- ✅ `MongoDB connected` → **SUCCESS!**
- ❌ `Connection refused` → MONGODB_URI wrong
- ❌ `Authentication failed` → Password wrong
- ❌ `Connection timeout` → Network access issue

---

## 📊 Connection String Breakdown

Your connection string:
```
mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
```

### Components

| Part | Value | Purpose |
|------|-------|---------|
| Protocol | `mongodb+srv://` | Secure connection |
| Username | `dontech1914_db_user` | Database user |
| Password | `dontech%402025` | User password (URL-encoded) |
| Host | `smartduka.0vkcqh5.mongodb.net` | Cluster hostname |
| Database | `smartduka` | Database name |
| Options | `?appName=smartduka` | Connection options |

---

## 🔐 Security Note

⚠️ **Your password contains special characters**:
- Original: `dontech@2025`
- URL-encoded: `dontech%402025`
- `@` → `%40` (required for URL encoding)

**Always URL-encode special characters in connection strings!**

---

## ✅ Testing Checklist

### Test 1: Format Check
- [ ] Connection string has no syntax errors
- [ ] Password is URL-encoded
- [ ] Database name is included (/smartduka)

### Test 2: MongoDB Shell
- [ ] MongoDB Shell installed
- [ ] Can connect with shell
- [ ] Can run commands (show collections, etc.)

### Test 3: MongoDB Compass
- [ ] Compass installed
- [ ] Can connect with Compass
- [ ] Can see collections

### Test 4: Render Backend
- [ ] MONGODB_URI added to environment
- [ ] Service restarted
- [ ] Logs show "MongoDB connected"

### Test 5: Local Development
- [ ] MONGODB_URI added to .env.local
- [ ] Backend restarted
- [ ] Console shows "MongoDB connected"

---

## 🚨 Troubleshooting

### Issue: "Authentication failed"
```
Error: authentication failed
Cause: Wrong password
Solution:
1. Check password: dontech@2025
2. Verify URL encoding: dontech%402025
3. Check MongoDB Atlas → Database Access
4. Verify username: dontech1914_db_user
```

### Issue: "Connection timeout"
```
Error: connection timeout
Cause: Network access not configured
Solution:
1. Go to MongoDB Atlas → Network Access
2. Add IP address: 0.0.0.0/0 (or specific IP)
3. Wait 5 minutes for changes
4. Try again
```

### Issue: "Invalid connection string"
```
Error: invalid connection string
Cause: Malformed URI
Solution:
1. Check for special characters
2. Ensure password is URL-encoded
3. Verify database name: /smartduka
4. Copy from MongoDB Atlas if unsure
```

### Issue: "command not found: mongosh"
```
Error: command not found: mongosh
Cause: MongoDB Shell not installed
Solution:
1. Install MongoDB Shell
2. Windows: choco install mongodb-shell
3. Mac: brew install mongodb-community-shell
4. Or download from mongodb.com
```

---

## 📝 Quick Reference

### Corrected Connection String
```
mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
```

### For Render Environment
```
MONGODB_URI=mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
```

### For Local .env.local
```
MONGODB_URI=mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka
```

### MongoDB Shell Command
```bash
mongosh "mongodb+srv://dontech1914_db_user:dontech%402025@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka"
```

---

## ✅ Success Indicators

- ✅ MongoDB Shell connects and shows `smartduka>` prompt
- ✅ MongoDB Compass shows collections
- ✅ Render logs show "MongoDB connected"
- ✅ Local dev console shows "MongoDB connected"
- ✅ Can query data with shell commands

---

## 🎯 Next Steps

1. **Fix connection string** (URL-encode password)
2. **Test with MongoDB Shell** (verify connection works)
3. **Test with Compass** (verify can see data)
4. **Add to Render** (update environment variable)
5. **Add to .env.local** (update local development)
6. **Restart services** (backend should connect)
7. **Deploy frontend** (to Vercel)
8. **Test end-to-end** (login and use app)

---

**Status**: Ready to test
**Connection String**: ✅ Corrected
**Next**: Run Test 2 (MongoDB Shell)
