# SmartDuka Application Flow Guide

**Date:** Nov 6, 2025  
**Purpose:** Understand how the app works and navigate through it

---

## 🎯 Application Overview

SmartDuka is a **POS (Point of Sale) and Inventory Management System** for Kenyan small businesses.

**Key Features:**
- ✅ User authentication (login/signup)
- ✅ Point of Sale (POS) system
- ✅ Inventory management
- ✅ Supplier management
- ✅ Purchase orders
- ✅ Stock adjustments
- ✅ Customer management
- ✅ Sales reporting
- ✅ Offline support

---

## 🔐 Authentication Flow

### Entry Point: http://localhost:3000

When you first visit the app, you're redirected to the **Login Page**.

### Step 1: Login Page (`/login`)

**What you see:**
- SmartDuka logo
- Email input field
- Password input field
- "Sign in" button
- Demo credentials displayed
- "Get started" link for new users

**Demo Credentials:**
```
Email: admin@smartduka.com
Password: admin123
```

**What happens:**
1. Enter email and password
2. Click "Sign in"
3. Backend validates credentials
4. JWT token generated and stored
5. Redirected to Dashboard (`/`)

### Step 2: Signup/Registration (`/signup`)

**Access:** Click "Get started" link on login page

**What you see:**
- Name field
- Email field
- Phone number field
- Password field (with show/hide toggle)
- Confirm password field
- "Create account" button
- Link back to login

**What happens:**
1. Fill in all fields
2. Click "Create account"
3. Backend creates new user
4. Auto-login with new account
5. Redirected to Onboarding (`/onboarding`)

### Step 3: Onboarding (`/onboarding`)

**Access:** After signup, or manually at `/onboarding`

**What you see:**
- Shop setup wizard
- Step-by-step configuration
- Shop name, till number, address, etc.

**What happens:**
1. Complete shop setup
2. Configure basic settings
3. Redirected to Dashboard

---

## 📊 Main Application Flow

### Dashboard (`/`)

**After Login/Signup:**
- Welcome message
- Quick stats (revenue, orders, items)
- Navigation to main features
- User menu in navbar

---

## 🛒 Main Features Access

### From Navbar (Top Navigation):

| Link | URL | Purpose |
|------|-----|---------|
| **Dashboard** | `/` | Home page with stats |
| **POS** | `/pos` | Point of Sale system |
| **Inventory** | `/admin` | Product management |
| **Reports** | `/reports` | Sales analytics |
| **User Menu** | Dropdown | Settings, Logout |

### From User Menu (Dropdown):

| Link | URL | Purpose |
|------|-----|---------|
| **Customers** | `/customers` | Customer database |
| **Suppliers** | `/suppliers` | Supplier management |
| **Purchases** | `/purchases` | Purchase orders |
| **Stock Adjustments** | `/stock/adjustments` | Inventory adjustments |
| **Payments** | `/payments` | Payment tracking |
| **Settings** | `/settings` | Shop & profile settings |
| **Logout** | - | Sign out |

---

## 🏪 Feature Workflows

### 1. POS (Point of Sale) - `/pos`

**Workflow:**
1. Browse products by category
2. Search for products
3. Add items to cart
4. Adjust quantities
5. Proceed to checkout
6. Select payment method (Cash, M-Pesa, Card)
7. Complete transaction
8. View receipt
9. Share receipt (WhatsApp, Email, Print)

**Features:**
- ✅ Barcode scanning
- ✅ Product search
- ✅ Category filtering
- ✅ Offline support
- ✅ Receipt generation

---

### 2. Inventory Management - `/admin`

**Workflow:**
1. View all products
2. Add new product (form modal)
3. Edit product details
4. Delete product
5. Import products (CSV)
6. Export products (CSV)
7. View low-stock alerts

**Features:**
- ✅ Product CRUD
- ✅ CSV import/export
- ✅ Low-stock warnings
- ✅ Category management

---

### 3. Suppliers - `/suppliers`

**Workflow:**
1. View all suppliers
2. Add new supplier (form modal)
3. Edit supplier details
4. Delete supplier
5. Mark as active/inactive

**Features:**
- ✅ Supplier CRUD
- ✅ Contact management
- ✅ Status tracking

---

### 4. Purchase Orders - `/purchases`

**Workflow:**
1. View all purchase orders
2. Create new purchase order (`/purchases/new`)
   - Select supplier
   - Add line items
   - Set quantities and costs
   - Submit order
3. View pending orders
4. Receive purchase order (`/purchases/[id]/receive`)
   - Confirm received quantities
   - Add receiving notes
   - Complete receipt

**Features:**
- ✅ Order creation
- ✅ Supplier selection
- ✅ Line item management
- ✅ Receipt workflow

---

### 5. Stock Adjustments - `/stock/adjustments`

**Workflow:**
1. View all adjustments
2. Create new adjustment
   - Select product
   - Choose increase/decrease
   - Enter quantity
   - Select reason (damage, theft, correction, etc.)
   - Add notes
3. Submit adjustment

**Features:**
- ✅ Inventory adjustments
- ✅ Reason tracking
- ✅ Audit trail

---

### 6. Customers - `/customers`

**Workflow:**
1. View all customers
2. Add new customer
   - Name, phone, email, address
3. Edit customer details
4. View customer details (`/customers/[id]`)
   - Contact info
   - Purchase history
   - Total spent
5. Delete customer

**Features:**
- ✅ Customer database
- ✅ Purchase tracking
- ✅ Contact management

---

### 7. Reports - `/reports`

**Workflow:**
1. Daily Sales (`/reports`)
   - Select date
   - View KPIs
   - See top products
2. Weekly Sales (`/reports/weekly`)
   - Navigate weeks
   - View weekly metrics
3. Monthly Sales (`/reports/monthly`)
   - Navigate months
   - View monthly metrics
4. Trends (`/reports/trends`)
   - Select period (7d, 30d, 90d)
   - View revenue trends
   - See product performance

**Features:**
- ✅ Daily/weekly/monthly reports
- ✅ Trend analysis
- ✅ Top products
- ✅ Growth indicators

---

### 8. Settings - `/settings`

**Tabs:**
1. **Shop Settings**
   - Shop name
   - Till number
   - Address
   - Tax rate
   - Currency

2. **Profile**
   - User name
   - Email
   - Phone

3. **Security**
   - Change password

**Features:**
- ✅ Shop configuration
- ✅ User profile
- ✅ Password management

---

## 🔄 Complete User Journey

### New User:
```
1. Visit http://localhost:3000
2. Click "Get started" → /signup
3. Fill signup form
4. Auto-login
5. Complete onboarding → /onboarding
6. Configure shop settings
7. Redirected to Dashboard → /
8. Start using features
```

### Returning User:
```
1. Visit http://localhost:3000
2. Login with credentials → /login
3. Redirected to Dashboard → /
4. Access features from navbar
```

---

## 📱 Responsive Design

The app works on:
- ✅ Desktop (1920x1080+)
- ✅ Tablet (768px+)
- ✅ Mobile (320px+)

**Mobile Navigation:**
- Hamburger menu in navbar
- Touch-friendly buttons
- Responsive layouts

---

## 🔐 User Roles

### Admin Role:
- ✅ Full access to all features
- ✅ User management
- ✅ Settings access
- ✅ All reports

### Cashier Role:
- ✅ POS access only
- ✅ Limited to sales transactions
- ✅ No admin features

---

## 💾 Offline Support

**Features:**
- ✅ Works without internet
- ✅ Pending orders queued locally
- ✅ Auto-sync when online
- ✅ IndexedDB caching

**How it works:**
1. Make sales offline
2. Orders stored locally
3. When online, auto-sync to server
4. Manual sync button available

---

## 🎯 Quick Start

### To Test the App:

1. **Login:**
   - Email: `admin@smartduka.com`
   - Password: `admin123`

2. **Navigate:**
   - Use navbar links
   - Or user menu dropdown

3. **Try Features:**
   - Add products in `/admin`
   - Create POS transaction in `/pos`
   - Add customers in `/customers`
   - View reports in `/reports`

---

## 🆘 Troubleshooting

### Can't see signup page?
- Click "Get started" link on login page
- Or go to `/signup` directly

### Can't see registration?
- Same as signup
- New user registration happens at `/signup`

### Lost navigation?
- Use navbar at top
- Click hamburger menu on mobile
- Use user menu dropdown

### Can't access features?
- Make sure you're logged in
- Check user role (admin vs cashier)
- Verify JWT token is valid

---

## 📚 API Endpoints

**Backend runs on:** `http://localhost:5000`

**Key Endpoints:**
- `POST /auth/login` - User login
- `POST /users` - User signup
- `GET /inventory/products` - Get products
- `POST /sales/checkout` - POS checkout
- `GET /reports/daily-sales` - Daily reports
- `GET /customers` - Get customers
- `GET /suppliers` - Get suppliers

---

## ✅ Status

**Application Status:** ✅ FULLY FUNCTIONAL

All features are working and ready to use!

**Start here:** http://localhost:3000
