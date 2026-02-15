# SmartDuka Navigation Guide

**Quick Reference for Finding Pages**

---

## 🌐 All Available Pages

### Authentication Pages
| Page | URL | Purpose | Access |
|------|-----|---------|--------|
| Login | `/login` | Sign in to account | Public |
| Signup | `/signup` | Create new account | Public |
| Onboarding | `/onboarding` | Shop setup wizard | After signup |

### Main Pages (After Login)
| Page | URL | Purpose | Access |
|------|-----|---------|--------|
| Dashboard | `/` | Home page with stats | Authenticated |
| POS | `/pos` | Point of Sale | Authenticated |
| Inventory | `/admin` | Product management | Admin only |
| Reports | `/reports` | Daily sales report | Admin only |

### Management Pages (User Menu Dropdown)
| Page | URL | Purpose | Access |
|------|-----|---------|--------|
| Customers | `/customers` | Customer database | Authenticated |
| Suppliers | `/suppliers` | Supplier management | Authenticated |
| Purchases | `/purchases` | Purchase orders | Authenticated |
| Stock Adjustments | `/stock/adjustments` | Inventory adjustments | Authenticated |
| Payments | `/payments` | Payment tracking | Admin only |
| Settings | `/settings` | Shop & profile settings | Authenticated |

### Report Pages
| Page | URL | Purpose | Access |
|------|-----|---------|--------|
| Daily Sales | `/reports` | Daily sales report | Admin only |
| Weekly Sales | `/reports/weekly` | Weekly sales report | Admin only |
| Monthly Sales | `/reports/monthly` | Monthly sales report | Admin only |
| Trends | `/reports/trends` | Sales trends & analysis | Admin only |

### Detail Pages
| Page | URL | Purpose | Access |
|------|-----|---------|--------|
| Customer Details | `/customers/[id]` | View customer info | Authenticated |
| Purchase Order Receive | `/purchases/[id]/receive` | Receive purchase order | Authenticated |
| Product Edit | `/inventory/[id]/edit` | Edit product details | Admin only |
| New Purchase Order | `/purchases/new` | Create purchase order | Authenticated |

---

## 🔍 How to Find Pages

### Method 1: Using Navbar (Top Navigation)

**Desktop:**
```
SmartDuka Logo | Dashboard | POS | Inventory | Reports | Language | User Menu
```

**Mobile:**
```
SmartDuka Logo | ☰ Menu | Language | User Menu
```

### Method 2: Using User Menu (Dropdown)

Click on your email/user icon in top-right corner to see:
- Customers
- Suppliers
- Purchases
- Stock Adjustments
- Payments
- Settings
- Logout

### Method 3: Direct URL

Type directly in browser:
- `http://localhost:3000/login` - Login page
- `http://localhost:3000/signup` - Signup page
- `http://localhost:3000/customers` - Customers page
- `http://localhost:3000/suppliers` - Suppliers page
- `http://localhost:3000/pos` - POS page
- `http://localhost:3000/reports` - Reports page

---

## 🚀 Getting Started

### First Time Users:

1. **Go to:** http://localhost:3000
2. **See:** Login page
3. **Click:** "Get started" link
4. **Fill:** Signup form (name, email, phone, password)
5. **Submit:** Create account
6. **Complete:** Onboarding wizard
7. **Access:** Dashboard

### Existing Users:

1. **Go to:** http://localhost:3000
2. **See:** Login page
3. **Enter:** Email & password
4. **Click:** Sign in
5. **Access:** Dashboard

---

## 📍 Page Locations in Navbar

### Desktop Navbar (Always Visible)

```
┌─────────────────────────────────────────────────────────┐
│ SmartDuka │ Dashboard │ POS │ Inventory │ Reports │ ... │
└─────────────────────────────────────────────────────────┘
```

**Click on each link to navigate:**
- **Dashboard** → Home page with stats
- **POS** → Point of Sale system
- **Inventory** → Product management
- **Reports** → Sales reports

### User Menu (Top Right)

```
┌─────────────────────┐
│ your@email.com ▼    │
├─────────────────────┤
│ Customers           │
│ Suppliers           │
│ Purchases           │
│ Stock Adjustments   │
│ Payments            │
│ Settings            │
│ Logout              │
└─────────────────────┘
```

---

## 📱 Mobile Navigation

### Hamburger Menu (☰)

Click the hamburger icon (three lines) in top-left to see:
- Dashboard
- POS
- Inventory
- Reports
- Customers
- Suppliers
- Purchases
- Stock Adjustments
- Payments
- Settings

---

## 🎯 Common Tasks & Where to Find Them

| Task | Where to Go | URL |
|------|-------------|-----|
| Make a sale | POS | `/pos` |
| Add a product | Inventory | `/admin` |
| Add a supplier | Suppliers | `/suppliers` |
| Create purchase order | Purchases | `/purchases` → New |
| Receive purchase order | Purchases | `/purchases` → [Select Order] → Receive |
| Adjust stock | Stock Adjustments | `/stock/adjustments` |
| Add customer | Customers | `/customers` |
| View sales report | Reports | `/reports` |
| Change password | Settings | `/settings` |
| View products | Inventory | `/admin` |

---

## 🔐 Login Credentials

### Admin Account (Full Access)
```
Email: admin@smartduka.com
Password: admin123
```

### Test Account (Cashier)
```
Email: cashier@smartduka.com
Password: cashier123
```

---

## 🆘 Can't Find a Page?

### If you can't see signup/registration:
1. Go to login page: `http://localhost:3000/login`
2. Click "Get started" link at bottom
3. Or go directly: `http://localhost:3000/signup`

### If you can't see a feature:
1. Check if you're logged in
2. Check your user role (admin vs cashier)
3. Use the navbar or user menu
4. Type URL directly in browser

### If navbar is missing:
1. Make sure you're logged in
2. Refresh page (Ctrl+R)
3. Check if you're on a public page (login/signup)

---

## 📊 Page Hierarchy

```
http://localhost:3000/
├── /login (Public)
├── /signup (Public)
├── /onboarding (After signup)
├── / (Dashboard - Protected)
├── /pos (POS)
├── /admin (Inventory)
├── /reports (Reports)
│   ├── /reports/weekly
│   ├── /reports/monthly
│   └── /reports/trends
├── /customers
│   └── /customers/[id]
├── /suppliers
├── /purchases
│   ├── /purchases/new
│   └── /purchases/[id]/receive
├── /stock/adjustments
├── /payments
├── /settings
└── /users (Admin only)
```

---

## ✅ Quick Checklist

- ✅ Can access login page
- ✅ Can signup for new account
- ✅ Can login with credentials
- ✅ Can see dashboard
- ✅ Can access navbar
- ✅ Can open user menu
- ✅ Can navigate to all pages
- ✅ Can access features

---

## 🎉 You're Ready!

Start exploring SmartDuka at: **http://localhost:3000**
