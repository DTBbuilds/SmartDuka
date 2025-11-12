# SmartDuka Signup & Registration Flow

**Complete Guide to Creating a New Account**

---

## 🎯 Overview

SmartDuka has **two ways to access the app:**

1. **Login** - For existing users
2. **Signup/Registration** - For new users

---

## 📍 Where to Find Signup

### Method 1: From Login Page (Recommended)

1. Go to: `http://localhost:3000/login`
2. You'll see the login form
3. At the bottom, you'll see: **"Don't have an account? Get started"**
4. Click the **"Get started"** link
5. You'll be taken to the signup page

### Method 2: Direct URL

Type directly in browser:
```
http://localhost:3000/signup
```

### Method 3: From Navbar (After Logout)

1. Click "Logout" in user menu
2. You'll be redirected to login page
3. Click "Get started" link

---

## 📝 Signup Form Fields

When you access `/signup`, you'll see a form with these fields:

### 1. **Name** (Required)
- Your full name
- Example: "John Doe"
- Used for shop owner identification

### 2. **Email** (Required)
- Your email address
- Must be valid format (example@domain.com)
- Used for login and notifications
- Example: "john@example.com"

### 3. **Phone** (Required)
- Your phone number
- Used for M-Pesa and contact
- Example: "+254712345678"

### 4. **Password** (Required)
- Minimum 6 characters
- Click eye icon to show/hide
- Example: "MySecurePass123"

### 5. **Confirm Password** (Required)
- Must match the password field
- Click eye icon to show/hide
- Validates that passwords match

---

## 🔄 Step-by-Step Signup Process

### Step 1: Access Signup Page
```
http://localhost:3000/signup
```

### Step 2: Fill in Your Information

**Example:**
```
Name:              John Doe
Email:             john@smartduka.com
Phone:             +254712345678
Password:          MyPassword123
Confirm Password:  MyPassword123
```

### Step 3: Validation

The form validates:
- ✅ Name is not empty
- ✅ Email is valid format
- ✅ Phone is not empty
- ✅ Password is at least 6 characters
- ✅ Passwords match

**If validation fails:**
- Error message appears in red
- Fix the issue
- Try again

### Step 4: Submit

Click the **"Create account"** button

### Step 5: Backend Processing

The backend:
1. Validates all fields
2. Checks if email already exists
3. Hashes password with bcrypt
4. Creates user in database
5. Generates JWT token
6. Auto-logs you in

### Step 6: Onboarding

After signup, you're redirected to:
```
http://localhost:3000/onboarding
```

**Onboarding wizard asks for:**
- Shop name
- Till number
- Address
- Tax rate
- Currency
- Other shop settings

### Step 7: Dashboard

After onboarding, you're redirected to:
```
http://localhost:3000/
```

**You can now:**
- ✅ Access all features
- ✅ Add products
- ✅ Make sales
- ✅ Manage inventory
- ✅ View reports

---

## 🔐 Validation Rules

### Name
- ✅ Required (cannot be empty)
- ✅ Any characters allowed
- ❌ Empty name will show error

### Email
- ✅ Required (cannot be empty)
- ✅ Must be valid email format (user@domain.com)
- ✅ Checked against existing users
- ❌ Invalid format will show error
- ❌ Email already exists will show error

### Phone
- ✅ Required (cannot be empty)
- ✅ Any format accepted
- ❌ Empty phone will show error

### Password
- ✅ Required (cannot be empty)
- ✅ Minimum 6 characters
- ✅ Can contain letters, numbers, symbols
- ❌ Less than 6 characters will show error
- ❌ Doesn't match confirm password will show error

### Confirm Password
- ✅ Required (cannot be empty)
- ✅ Must match password field exactly
- ❌ Doesn't match will show error

---

## 🎨 Signup Form Layout

```
┌─────────────────────────────────────┐
│         SmartDuka Logo              │
│                                     │
│    Create Your SmartDuka Account    │
│    Get started with your POS system │
├─────────────────────────────────────┤
│                                     │
│ Name                                │
│ [________________________]           │
│                                     │
│ Email                               │
│ [________________________]           │
│                                     │
│ Phone                               │
│ [________________________]           │
│                                     │
│ Password                            │
│ [________________________] [👁]      │
│                                     │
│ Confirm Password                    │
│ [________________________] [👁]      │
│                                     │
│ [Create account button]             │
│                                     │
│ Already have an account?            │
│ [Sign in]                           │
│                                     │
└─────────────────────────────────────┘
```

---

## ✅ Successful Signup Flow

```
1. Visit /signup
   ↓
2. Fill form with valid data
   ↓
3. Click "Create account"
   ↓
4. Backend validates & creates user
   ↓
5. Auto-login with new account
   ↓
6. Redirected to /onboarding
   ↓
7. Complete shop setup
   ↓
8. Redirected to Dashboard /
   ↓
9. Start using SmartDuka!
```

---

## ❌ Failed Signup Scenarios

### Scenario 1: Email Already Exists
```
Error: "Email already registered"
Action: Use different email or login
```

### Scenario 2: Invalid Email Format
```
Error: "Valid email is required"
Action: Enter valid email (user@domain.com)
```

### Scenario 3: Passwords Don't Match
```
Error: "Passwords do not match"
Action: Ensure both password fields are identical
```

### Scenario 4: Password Too Short
```
Error: "Password must be at least 6 characters"
Action: Enter password with 6+ characters
```

### Scenario 5: Missing Required Field
```
Error: "[Field name] is required"
Action: Fill in all required fields
```

---

## 🔑 After Signup - Your Credentials

After successful signup, you can login with:

```
Email:    [The email you entered]
Password: [The password you entered]
```

**Example:**
```
Email:    john@smartduka.com
Password: MyPassword123
```

---

## 🔄 Signup vs Login

| Feature | Signup | Login |
|---------|--------|-------|
| URL | `/signup` | `/login` |
| Purpose | Create new account | Access existing account |
| Fields | Name, Email, Phone, Password | Email, Password |
| After Submit | Onboarding wizard | Dashboard |
| New User? | Yes | No |
| Existing User? | No | Yes |

---

## 📱 Mobile Signup

The signup form is fully responsive:
- ✅ Works on mobile phones
- ✅ Touch-friendly inputs
- ✅ Show/hide password toggles
- ✅ Mobile-optimized layout

---

## 🆘 Troubleshooting

### Can't find signup page?
**Solution:** Click "Get started" link on login page, or go to `/signup`

### Form won't submit?
**Solution:** Check for red error messages, fix validation errors

### Email already exists?
**Solution:** Use different email or login with existing account

### Forgot password?
**Solution:** Currently no password reset. Contact admin or create new account.

### Can't see password field?
**Solution:** Scroll down on mobile, or resize browser window

### Form keeps showing errors?
**Solution:** 
1. Clear all fields
2. Fill one by one
3. Check each field for errors
4. Submit again

---

## ✅ Signup Checklist

Before submitting signup form:
- ✅ Name is filled in
- ✅ Email is valid format
- ✅ Phone is filled in
- ✅ Password is 6+ characters
- ✅ Confirm password matches
- ✅ No red error messages

---

## 🎉 Ready to Signup?

1. Go to: `http://localhost:3000/signup`
2. Fill in your information
3. Click "Create account"
4. Complete onboarding
5. Start using SmartDuka!

---

## 📚 Related Pages

- **Login Guide:** See `LOGIN_GUIDE.md`
- **Navigation Guide:** See `NAVIGATION_GUIDE.md`
- **App Flow Guide:** See `APP_FLOW_GUIDE.md`
- **Onboarding Guide:** See `ONBOARDING_GUIDE.md`

---

**Status:** ✅ Signup system fully functional and ready to use!
