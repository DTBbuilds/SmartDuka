# 🔧 Fix Gmail SMTP Authentication Error

## Problem
Gmail is rejecting the app password: `plllqnneupnzegsr`

Error: `Invalid login: 535-5.7.8 Username and Password not accepted`

## Solution: Generate New Gmail App Password

### Step 1: Go to Google Account Security
1. Open: https://myaccount.google.com/security
2. Look for "2-Step Verification" - it should be **ON**
   - If OFF, enable it first

### Step 2: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. You'll see a dropdown with two options:
   - Select "Mail"
   - Select "Windows Computer" (or your device type)
3. Click "Generate"
4. Google will show you a 16-character password like: `abcd efgh ijkl mnop`

### Step 3: Copy the Password
⚠️ **IMPORTANT:** Copy the password **WITHOUT SPACES**

Example:
- Google shows: `abcd efgh ijkl mnop`
- Copy as: `abcdefghijklmnop`

### Step 4: Update `.env.local`
Edit `e:\BUILds\SmartDuka\.env.local` and update:

```bash
SMTP_USER=dontech1914@gmail.com
SMTP_PASS=YOUR_NEW_16_CHAR_PASSWORD_NO_SPACES
```

Example:
```bash
SMTP_USER=dontech1914@gmail.com
SMTP_PASS=abcdefghijklmnop
```

### Step 5: Restart Backend
```bash
# Stop current process (Ctrl+C)
# Then run:
pnpm dev
```

### Step 6: Check Logs
Look for:
```
✅ SMTP connection established successfully
   Connected to: smtp.gmail.com:587
```

## Troubleshooting

### Still Getting "Username and Password not accepted"?

**Check 1: 2-Step Verification is ON**
- Go to: https://myaccount.google.com/security
- Verify "2-Step Verification" is enabled
- If not, enable it and regenerate app password

**Check 2: App Password Format**
- Make sure you copied it WITHOUT spaces
- Should be exactly 16 characters
- No hyphens, no spaces

**Check 3: Recent Password Change**
- If you recently changed your Google password, old app passwords may be invalidated
- Generate a new one

**Check 4: Account Recovery**
- If account was recently recovered, app passwords may be reset
- Generate a new one

## Current Configuration

**File:** `e:\BUILds\SmartDuka\.env.local`

**Current Settings:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=dontech1914@gmail.com
SMTP_PASS=plllqnneupnzegsr  # ⚠️ This is being rejected
SMTP_FROM=SmartDuka <dontech1914@gmail.com>
```

## Quick Links

- **Google Account Security:** https://myaccount.google.com/security
- **App Passwords:** https://myaccount.google.com/apppasswords
- **Gmail Help:** https://support.google.com/mail/?p=BadCredentials

## What to Do Right Now

1. ✅ Go to https://myaccount.google.com/apppasswords
2. ✅ Generate a NEW app password
3. ✅ Copy it WITHOUT spaces
4. ✅ Update `.env.local` with the new password
5. ✅ Restart backend with `pnpm dev`
6. ✅ Check logs for success message

---

**Status:** SMTP authentication failing - needs new Gmail App Password
