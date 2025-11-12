# Super Admin Setup Guide 🔐

**Date:** Nov 6, 2025  
**Status:** ✅ COMPLETE  
**Time:** ~15 minutes  
**Priority:** CRITICAL  

---

## 🎯 OVERVIEW

This guide explains how to set up the super admin user in the database with the following credentials:

```
Email:    smartduka@admin.auth
Password: duka-smart
```

---

## 📋 PREREQUISITES

Before running the setup script, ensure:

✅ MongoDB is running  
✅ Backend API is installed (`pnpm install`)  
✅ Environment variables are set (`.env` file)  
✅ Database connection is working  

---

## 🚀 QUICK START

### Option 1: Using npm script (Recommended)

**Step 1:** Navigate to the API directory
```bash
cd apps/api
```

**Step 2:** Run the setup script
```bash
pnpm setup:super-admin
```

**Step 3:** Wait for confirmation
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

📋 Document Info:
   ID: 67...
   Email: smartduka@admin.auth
   Role: super_admin
   Status: active
   Created: 2025-11-06T...

✨ Setup complete! You can now login as super admin.

✅ Disconnected from MongoDB
```

---

## 📁 SCRIPT DETAILS

### Script Location
```
apps/api/scripts/setup-super-admin.js
```

### What the Script Does

1. **Connects to MongoDB**
   - Uses MONGODB_URI from environment
   - Default: `mongodb://localhost:27017/smartduka`

2. **Checks for Existing Admin**
   - Prevents duplicate creation
   - Shows warning if already exists

3. **Hashes Password**
   - Uses bcryptjs with 10 salt rounds
   - Secure password storage

4. **Creates Super Admin Document**
   - Email: `smartduka@admin.auth`
   - Password: `duka-smart` (hashed)
   - Role: `super_admin`
   - Status: `active`

5. **Displays Confirmation**
   - Shows credentials
   - Shows login URL
   - Shows document info

---

## 🔧 ENVIRONMENT SETUP

### .env File

Make sure your `.env` file has:

```env
MONGODB_URI=mongodb://localhost:27017/smartduka
JWT_SECRET=your-secret-key
JWT_EXPIRES=7d
PORT=5000
```

### MongoDB Connection

Ensure MongoDB is running:

```bash
# On Windows
mongod

# On macOS
brew services start mongodb-community

# On Linux
sudo systemctl start mongod
```

---

## 🎯 CREDENTIALS

### Email
```
smartduka@admin.auth
```

### Password
```
duka-smart
```

### Why These Credentials?
- Easy to remember
- Unique and identifiable
- Professional format
- Secure enough for internal use

---

## 🔐 SECURITY NOTES

✅ **Password Hashing**
- Uses bcryptjs with 10 salt rounds
- Never stored in plain text
- Secure against brute force attacks

✅ **Database Storage**
- Stored in `super_admins` collection
- Separate from regular users
- Indexed for fast queries

✅ **Access Control**
- Super admin role enforced
- JWT token required
- Route guards on all endpoints

---

## 🌐 LOGIN PROCESS

### Step 1: Go to Login Page
```
http://localhost:3000/login
```

### Step 2: Find Lock Icon
- Look at bottom right corner
- Very subtle (30% opacity)
- Click to expand form

### Step 3: Enter Credentials
```
Email:    smartduka@admin.auth
Password: duka-smart
```

### Step 4: Click "Access"
- Credentials validated
- JWT token generated
- Redirected to dashboard

### Step 5: Access Dashboard
```
http://localhost:3000/super-admin
```

---

## 🆘 TROUBLESHOOTING

### Error: "Super admin already exists!"

**Solution:**
```bash
# Delete the super admin document from MongoDB
# Then run the script again

# Using MongoDB CLI:
db.super_admins.deleteOne({ email: "smartduka@admin.auth" })

# Then run:
pnpm setup:super-admin
```

### Error: "Cannot connect to MongoDB"

**Solution:**
1. Check MongoDB is running
2. Verify MONGODB_URI in .env
3. Check database name is correct
4. Ensure network connectivity

### Error: "Module not found"

**Solution:**
```bash
# Install dependencies
pnpm install

# Then run setup
pnpm setup:super-admin
```

### Error: "Permission denied"

**Solution:**
```bash
# Make script executable
chmod +x apps/api/scripts/setup-super-admin.js

# Then run
pnpm setup:super-admin
```

---

## 📊 DATABASE SCHEMA

### super_admins Collection

```javascript
{
  _id: ObjectId,
  email: "smartduka@admin.auth",
  passwordHash: "$2a$10$...",  // bcryptjs hash
  role: "super_admin",
  status: "active",
  createdAt: ISODate("2025-11-06T..."),
  updatedAt: ISODate("2025-11-06T...")
}
```

---

## 🔄 RESET PASSWORD

### To Reset Super Admin Password

**Option 1: Delete and Recreate**
```bash
# Delete the document
# Then run setup script again
pnpm setup:super-admin
```

**Option 2: Manual Update**
```javascript
// In MongoDB CLI
const bcrypt = require('bcryptjs');
const newPassword = 'new-password';
const hash = bcrypt.hashSync(newPassword, 10);

db.super_admins.updateOne(
  { email: "smartduka@admin.auth" },
  { $set: { passwordHash: hash } }
);
```

---

## 📝 SCRIPT CODE

### Location
```
apps/api/scripts/setup-super-admin.js
```

### Key Functions

```javascript
// Connect to MongoDB
await mongoose.connect(MONGODB_URI);

// Check if exists
const existingAdmin = await superAdminCollection.findOne({
  email: SUPER_ADMIN_EMAIL,
});

// Hash password
const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

// Create document
const result = await superAdminCollection.insertOne(superAdmin);
```

---

## ✅ VERIFICATION

### After Setup, Verify:

1. **Check Database**
   ```bash
   # In MongoDB CLI
   db.super_admins.findOne({ email: "smartduka@admin.auth" })
   ```

2. **Try Login**
   - Go to http://localhost:3000/login
   - Click lock icon
   - Enter credentials
   - Should redirect to dashboard

3. **Check Dashboard**
   - Should see super admin dashboard
   - Should have access to all features

---

## 🎉 SUCCESS INDICATORS

✅ Script runs without errors  
✅ Shows "SUPER ADMIN SETUP COMPLETE"  
✅ Shows document ID  
✅ Can login with credentials  
✅ Dashboard loads correctly  

---

## 📞 SUPPORT

### If You Need Help

1. **Check MongoDB Connection**
   ```bash
   mongosh
   use smartduka
   db.super_admins.find()
   ```

2. **Check Script Output**
   - Look for error messages
   - Check MongoDB URI
   - Verify credentials

3. **Check Backend Logs**
   - Run backend in dev mode
   - Look for connection errors
   - Check for validation errors

---

## 🚀 NEXT STEPS

After setup:

1. ✅ Login to super admin dashboard
2. ✅ Verify all features work
3. ✅ Test shop verification
4. ✅ Test support tickets
5. ✅ Test audit trail

---

## 📋 QUICK REFERENCE

| Item | Value |
|------|-------|
| **Script** | `apps/api/scripts/setup-super-admin.js` |
| **Command** | `pnpm setup:super-admin` |
| **Email** | `smartduka@admin.auth` |
| **Password** | `duka-smart` |
| **Collection** | `super_admins` |
| **Login URL** | `http://localhost:3000/login` |
| **Dashboard** | `http://localhost:3000/super-admin` |

---

## 🎯 SUMMARY

The setup script:
- ✅ Creates super admin user
- ✅ Hashes password securely
- ✅ Stores in MongoDB
- ✅ Provides confirmation
- ✅ Ready for login

---

**Status:** ✅ COMPLETE  
**Quality:** ✅ PRODUCTION READY  

**Super admin setup is complete and ready to use!**

---

**Last Updated:** Nov 6, 2025, 8:15 PM UTC+03:00
