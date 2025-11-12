# SmartDuka Complete Testing Plan

**Date:** Nov 6, 2025  
**Status:** Ready for Testing  
**Backend:** ✅ Running on port 5000  
**Frontend:** ✅ Ready on port 3000  

---

## 🧪 TESTING CHECKLIST

### Phase 1: Authentication & Registration (15 min)

#### 1.1 Shop Registration Flow
```
URL: http://localhost:3000/register-shop

Test Steps:
1. Fill Shop Info (Step 1)
   - Shop Name: "Test Duka 1"
   - Shop Email: "testduka1@example.com"
   - Shop Phone: "+254712345678"
   - City: "Nairobi"
   - Business Type: "General Store"
   
2. Fill Admin Account (Step 2)
   - Admin Name: "John Doe"
   - Admin Email: "admin@testduka1.com"
   - Password: "SecurePass123!"
   - Confirm Password: "SecurePass123!"

3. Click "Create Account"

Expected Result:
✅ Shop created with status "pending"
✅ Admin user created
✅ JWT token generated
✅ Redirected to /onboarding
```

#### 1.2 Onboarding Page
```
URL: http://localhost:3000/onboarding

Test Steps:
1. Fill shop details
   - Address: "123 Main Street"
   - Till Number: "001"
   - KRA PIN: "A000000000X"

2. Click "Submit for Verification"

Expected Result:
✅ Shop details updated
✅ Status shows "Verification Pending"
✅ Email confirmation message displayed
```

#### 1.3 Login Flow
```
URL: http://localhost:3000/login

Test Steps:
1. Enter credentials
   - Email: "admin@testduka1.com"
   - Password: "SecurePass123!"

2. Click "Sign in"

Expected Result:
✅ Login successful
✅ Redirected to dashboard
✅ Shop name displayed in header
✅ User info shown
```

---

### Phase 2: Admin Dashboard (10 min)

#### 2.1 Dashboard Access
```
URL: http://localhost:3000/admin

Test Steps:
1. Verify admin-only access
2. Check shop context displayed
3. Verify low-stock alerts (if any)

Expected Result:
✅ Admin dashboard loads
✅ Shop name and status shown
✅ Products tab accessible
✅ Categories tab accessible
```

#### 2.2 Product Management
```
Test Steps:
1. Add Product
   - Name: "Milk 1L"
   - SKU: "MLK001"
   - Price: "150"
   - Stock: "50"
   - Click "Add Product"

2. Verify product appears in list

3. Delete product (click trash icon)

Expected Result:
✅ Product created successfully
✅ Product appears in list
✅ Product deleted successfully
✅ All products filtered by shop
```

#### 2.3 CSV Import/Export
```
Test Steps:
1. Click "Export CSV"
2. Verify CSV downloads
3. Click "Import CSV"
4. Select CSV file
5. Click "Import"

Expected Result:
✅ CSV exports with all products
✅ CSV imports successfully
✅ Products added to inventory
```

---

### Phase 3: POS System (15 min)

#### 3.1 POS Page Access
```
URL: http://localhost:3000/pos

Test Steps:
1. Verify POS page loads
2. Check shop name in header
3. Check user info displayed
4. Verify products load

Expected Result:
✅ POS page loads
✅ Shop context displayed
✅ Products fetched from API
✅ Categories displayed as tabs
```

#### 3.2 Add to Cart
```
Test Steps:
1. Click on a product
2. Verify product added to cart
3. Increase quantity
4. Add another product
5. Verify cart total updates

Expected Result:
✅ Products add to cart
✅ Quantity increases
✅ Cart total calculates correctly
✅ Tax calculated (2%)
```

#### 3.3 Checkout
```
Test Steps:
1. Click "Checkout"
2. Enter Customer Name: "John Customer"
3. Enter Notes: "Test order"
4. Select Payment Method: "Cash"
5. Click "Complete Sale"

Expected Result:
✅ Order created successfully
✅ Cart clears
✅ Success message displayed
✅ Order saved to database
```

---

### Phase 4: Reports (10 min)

#### 4.1 Daily Sales Report
```
URL: http://localhost:3000/reports

Test Steps:
1. Select today's date
2. Verify sales data loads
3. Check KPI cards:
   - Total Revenue
   - Total Orders
   - Items Sold
   - Average Order

4. Verify Top Products list

Expected Result:
✅ Reports load
✅ Sales data displayed
✅ KPI cards show correct values
✅ Top products listed
✅ Data filtered by shop
```

---

### Phase 5: Cashier Management (10 min)

#### 5.1 Add Cashier
```
URL: http://localhost:3000/users/cashiers

Test Steps:
1. Click "Add Cashier"
2. Fill form:
   - Name: "Jane Cashier"
   - Email: "jane@testduka1.com"
   - Password: "CashierPass123!"
   - Confirm: "CashierPass123!"

3. Click "Create Cashier"

Expected Result:
✅ Cashier created
✅ Appears in cashier list
✅ Status shows "Active"
```

#### 5.2 Cashier Login
```
Test Steps:
1. Logout (if needed)
2. Go to /login
3. Login as cashier:
   - Email: "jane@testduka1.com"
   - Password: "CashierPass123!"

4. Verify cashier access

Expected Result:
✅ Cashier can login
✅ Can access POS
✅ Cannot access admin
✅ Can see same shop data
```

#### 5.3 Disable/Enable Cashier
```
Test Steps:
1. Go back to /users/cashiers (as admin)
2. Click "Disable" on cashier
3. Verify status changes to "Disabled"
4. Click "Enable"
5. Verify status changes to "Active"

Expected Result:
✅ Cashier status toggles
✅ Disabled cashier cannot login
✅ Enabled cashier can login
```

#### 5.4 Max Cashiers Limit
```
Test Steps:
1. Try to add 3rd cashier
2. Verify error message

Expected Result:
✅ Cannot add more than 2 cashiers
✅ "Add Cashier" button disabled
✅ Error message shown
```

---

### Phase 6: Multi-Tenancy Verification (15 min)

#### 6.1 Create Second Shop
```
Test Steps:
1. Logout
2. Go to /register-shop
3. Register second shop:
   - Shop Name: "Test Duka 2"
   - Shop Email: "testduka2@example.com"
   - Admin Email: "admin@testduka2.com"
   - Password: "SecurePass456!"

4. Complete registration

Expected Result:
✅ Second shop created
✅ Separate admin user
✅ Separate JWT token
```

#### 6.2 Data Isolation
```
Test Steps:
1. Login to Shop 1
2. Add products to Shop 1
3. Logout
4. Login to Shop 2
5. Verify Shop 2 has NO products from Shop 1
6. Add products to Shop 2
7. Logout
8. Login to Shop 1
9. Verify Shop 1 still has only its products

Expected Result:
✅ Each shop has isolated data
✅ Products don't cross shops
✅ Orders don't cross shops
✅ Users can't see other shops' data
```

#### 6.3 API Filtering
```
Test Steps:
1. Open browser DevTools (F12)
2. Go to Network tab
3. Login to Shop 1
4. Go to /admin
5. Check API calls:
   - GET /inventory/products
   - GET /inventory/stock/low-stock
   - GET /sales/daily-sales/:date

6. Verify shopId in JWT token
7. Verify responses filtered by shopId

Expected Result:
✅ All API calls include Authorization header
✅ JWT token contains shopId
✅ API responses filtered by shopId
✅ No cross-shop data leakage
```

---

### Phase 7: Error Handling (10 min)

#### 7.1 Invalid Credentials
```
Test Steps:
1. Go to /login
2. Enter wrong password
3. Click Sign in

Expected Result:
✅ Error message displayed
✅ Not logged in
✅ Redirected to login
```

#### 7.2 Unauthorized Access
```
Test Steps:
1. Login as cashier
2. Try to access /admin
3. Try to access /users/cashiers

Expected Result:
✅ Access denied
✅ Error message shown
✅ Redirected to home or login
```

#### 7.3 Missing Fields
```
Test Steps:
1. Go to /register-shop
2. Try to submit without filling fields
3. Try to submit Step 2 without passwords

Expected Result:
✅ Validation errors shown
✅ Cannot submit incomplete form
✅ Clear error messages
```

---

### Phase 8: Offline Functionality (10 min)

#### 8.1 Offline Checkout
```
Test Steps:
1. Open DevTools (F12)
2. Go to Network tab
3. Throttle to "Offline"
4. Go to /pos
5. Add products to cart
6. Click "Checkout"
7. Complete sale

Expected Result:
✅ Order saved offline
✅ Appears in pending orders
✅ Can retry sync when online
```

#### 8.2 Sync Pending Orders
```
Test Steps:
1. Go back online (remove throttle)
2. Click "Sync Pending Orders"
3. Verify orders sync to server

Expected Result:
✅ Pending orders sync
✅ Success message shown
✅ Orders appear in reports
```

---

## 📊 TEST RESULTS TEMPLATE

```
Date: ___________
Tester: ___________
Build: ___________

PHASE 1: Authentication & Registration
[ ] 1.1 Shop Registration - PASS/FAIL
[ ] 1.2 Onboarding Page - PASS/FAIL
[ ] 1.3 Login Flow - PASS/FAIL

PHASE 2: Admin Dashboard
[ ] 2.1 Dashboard Access - PASS/FAIL
[ ] 2.2 Product Management - PASS/FAIL
[ ] 2.3 CSV Import/Export - PASS/FAIL

PHASE 3: POS System
[ ] 3.1 POS Page Access - PASS/FAIL
[ ] 3.2 Add to Cart - PASS/FAIL
[ ] 3.3 Checkout - PASS/FAIL

PHASE 4: Reports
[ ] 4.1 Daily Sales Report - PASS/FAIL

PHASE 5: Cashier Management
[ ] 5.1 Add Cashier - PASS/FAIL
[ ] 5.2 Cashier Login - PASS/FAIL
[ ] 5.3 Disable/Enable - PASS/FAIL
[ ] 5.4 Max Cashiers - PASS/FAIL

PHASE 6: Multi-Tenancy
[ ] 6.1 Create Second Shop - PASS/FAIL
[ ] 6.2 Data Isolation - PASS/FAIL
[ ] 6.3 API Filtering - PASS/FAIL

PHASE 7: Error Handling
[ ] 7.1 Invalid Credentials - PASS/FAIL
[ ] 7.2 Unauthorized Access - PASS/FAIL
[ ] 7.3 Missing Fields - PASS/FAIL

PHASE 8: Offline
[ ] 8.1 Offline Checkout - PASS/FAIL
[ ] 8.2 Sync Pending Orders - PASS/FAIL

OVERALL: PASS/FAIL
ISSUES FOUND: ___________
NOTES: ___________
```

---

## 🚀 QUICK START COMMANDS

```bash
# Start development servers
pnpm dev

# Backend only
cd apps/api && pnpm dev

# Frontend only
cd apps/web && pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Deploy
pnpm deploy
```

---

## 🔗 IMPORTANT URLS

**Frontend:**
- Home: http://localhost:3000
- Register: http://localhost:3000/register-shop
- Login: http://localhost:3000/login
- Onboarding: http://localhost:3000/onboarding
- POS: http://localhost:3000/pos
- Admin: http://localhost:3000/admin
- Reports: http://localhost:3000/reports
- Cashiers: http://localhost:3000/users/cashiers

**Backend:**
- API: http://localhost:5000
- Health: http://localhost:5000/health
- Auth: http://localhost:5000/auth
- Shops: http://localhost:5000/shops
- Users: http://localhost:5000/users
- Inventory: http://localhost:5000/inventory
- Sales: http://localhost:5000/sales

---

## 📝 TEST CREDENTIALS

**Shop 1:**
- Shop Email: testduka1@example.com
- Admin Email: admin@testduka1.com
- Admin Password: SecurePass123!
- Cashier Email: jane@testduka1.com
- Cashier Password: CashierPass123!

**Shop 2:**
- Shop Email: testduka2@example.com
- Admin Email: admin@testduka2.com
- Admin Password: SecurePass456!

---

**Status:** ✅ Ready for Testing  
**Last Updated:** Nov 6, 2025  
**Next Step:** Execute test plan and document results
