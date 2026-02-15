# Cashier & Admin Roles - Comprehensive Definition

**Date**: Nov 7, 2025
**Status**: ✅ ROLES DEFINED
**Scope**: Complete role separation, workflows, and responsibilities

---

## 👨‍💼 ADMIN ROLE - COMPLETE DEFINITION

### Admin Responsibilities

**1. Product Management**
```
✅ Add new products
✅ Edit product details (name, price, cost, SKU, barcode)
✅ Delete products
✅ Bulk import products (CSV)
✅ Bulk price updates
✅ Bulk stock adjustments
✅ Set product categories
✅ Set reorder points
✅ Track product costs
✅ Generate barcodes
✅ Upload product images
✅ Create product variants
✅ Define modifiers/add-ons
```

**2. Inventory Management**
```
✅ View all stock levels
✅ Adjust stock quantities
✅ Track stock history
✅ Set low-stock alerts
✅ Receive stock transfers
✅ Manage supplier information
✅ Track expiry dates
✅ Manage batch/lot numbers
✅ Set reorder automation
✅ View stock movements
```

**3. Cashier Management**
```
✅ Create cashier accounts
✅ Generate cashier PINs
✅ Reset cashier PINs
✅ View cashier list
✅ Disable/enable cashiers
✅ Assign cashiers to shifts
✅ View cashier performance
✅ Track cashier activity
```

**4. Sales & Reporting**
```
✅ View all sales
✅ View sales by cashier
✅ View sales by date/period
✅ View sales by product
✅ View sales by category
✅ Generate reports
✅ Export sales data
✅ View revenue metrics
✅ View transaction history
✅ View voided/refunded transactions
```

**5. Settings & Configuration**
```
✅ Configure shop settings
✅ Set tax rates
✅ Set currency
✅ Configure payment methods
✅ Set receipt format
✅ Configure notifications
✅ Manage user roles
✅ Set system preferences
```

**6. Monitoring & Analytics**
```
✅ View cashier online/offline status
✅ View real-time sales
✅ View performance metrics
✅ View activity logs
✅ Track employee performance
✅ View system health
✅ Monitor API usage
```

---

### Admin Workflow - Product Management

**Quick Add Product** (< 30 seconds):
```
1. Click "Quick Add Product"
2. Enter: Name, SKU, Price, Cost, Stock, Category
3. Click "Add"
4. Product appears in inventory
5. Done!
```

**Detailed Product Edit** (< 2 minutes):
```
1. Click "Edit" on product
2. Add: Description, Images, Variants, Modifiers
3. Set: Reorder point, Supplier, Expiry date
4. Click "Save"
5. Product updated
6. Done!
```

**Bulk Import** (< 2 minutes for 100 products):
```
1. Click "Bulk Import"
2. Upload CSV file
3. Map columns
4. Click "Import"
5. Products added
6. View import report
7. Done!
```

**Stock Adjustment** (< 10 seconds):
```
1. Find product
2. Click "Adjust Stock"
3. Enter new quantity
4. Add reason (received, damaged, etc.)
5. Click "Save"
6. Stock updated
7. Done!
```

---

### Admin Pages & Access

**Pages Admin Can Access**:
```
✅ Dashboard (/)
✅ POS (/pos)
✅ Inventory (/admin)
✅ Reports (/reports)
✅ Cashier Management (/users/cashiers)
✅ Settings (/settings)
✅ Activity Log (/activity)
```

**Pages Admin CANNOT Access**:
```
❌ Cashier Dashboard (/cashier/dashboard)
❌ Super Admin (/super-admin)
```

---

## 💰 CASHIER ROLE - COMPLETE DEFINITION

### Cashier Responsibilities

**1. Point of Sale (POS)**
```
✅ Scan products
✅ Search for products
✅ Add items to cart
✅ Adjust quantities
✅ Apply discounts (if authorized)
✅ View cart total
✅ Process payments
✅ Handle multiple payment methods
✅ Print receipts
✅ Email receipts
✅ Handle returns/refunds (if authorized)
```

**2. Transaction Processing**
```
✅ Complete sales transactions
✅ Handle cash payments
✅ Process card payments
✅ Process M-Pesa payments
✅ Process QR code payments
✅ Handle split payments
✅ Issue receipts
✅ Track transactions
```

**3. Shift Management**
```
✅ Clock in at start of shift
✅ Clock out at end of shift
✅ View current shift status
✅ View shift duration
✅ View shift sales
✅ Reconcile shift (if required)
```

**4. Personal Dashboard**
```
✅ View own sales
✅ View own transactions
✅ View shift history
✅ View performance metrics
✅ View activity log
```

**5. Limitations**
```
❌ Cannot add/edit/delete products
❌ Cannot adjust inventory
❌ Cannot view other cashier sales
❌ Cannot access reports
❌ Cannot manage settings
❌ Cannot manage other cashiers
❌ Cannot access admin features
❌ Cannot void transactions (without authorization)
❌ Cannot refund transactions (without authorization)
```

---

### Cashier Workflow - POS Checkout

**Standard Checkout** (30-60 seconds):
```
1. Scan/search first product
2. Adjust quantity if needed
3. Scan/search next product
4. Repeat until all items added
5. Review cart
6. Select payment method
7. Process payment
8. Confirm payment
9. Print/email receipt
10. Done!
```

**With Customer Info** (< 2 minutes):
```
1. Enter customer name (optional)
2. Add items to cart
3. Add order notes (optional)
4. Review cart
5. Select payment method
6. Process payment
7. Confirm payment
8. Print/email receipt
9. Done!
```

**Offline Mode** (Same as online):
```
1. Add items to cart (uses cached products)
2. Process payment
3. Order queued for sync
4. Show offline indicator
5. When online, sync automatically
6. Done!
```

---

### Cashier Pages & Access

**Pages Cashier Can Access**:
```
✅ Dashboard (/cashier/dashboard)
✅ POS (/pos)
✅ Settings (/settings)
✅ Shift Management (/cashier/shift-*)
```

**Pages Cashier CANNOT Access**:
```
❌ Inventory (/admin)
❌ Reports (/reports)
❌ Cashier Management (/users/cashiers)
❌ Admin Dashboard (/)
❌ Super Admin (/super-admin)
```

---

### Cashier Navbar Display

**What Cashier Sees**:
```
SmartDuka | Dashboard | POS | [User Menu]
```

**What Cashier Does NOT See**:
```
❌ Inventory button
❌ Reports button
❌ Settings button (admin)
❌ Cashier Management button
❌ Quick Access menu
```

---

## 🔐 ROLE-BASED ACCESS CONTROL MATRIX

| Feature | Admin | Cashier | Super Admin |
|---------|-------|---------|------------|
| **POS/Checkout** | ✅ | ✅ | ❌ |
| **View Products** | ✅ | ✅ | ❌ |
| **Add Products** | ✅ | ❌ | ❌ |
| **Edit Products** | ✅ | ❌ | ❌ |
| **Delete Products** | ✅ | ❌ | ❌ |
| **Bulk Import** | ✅ | ❌ | ❌ |
| **View Stock** | ✅ | ✅ | ❌ |
| **Adjust Stock** | ✅ | ❌ | ❌ |
| **View Own Sales** | ✅ | ✅ | ❌ |
| **View All Sales** | ✅ | ❌ | ❌ |
| **View Reports** | ✅ | ❌ | ❌ |
| **Create Cashiers** | ✅ | ❌ | ❌ |
| **Manage Cashiers** | ✅ | ❌ | ❌ |
| **View Cashier Activity** | ✅ | ❌ | ❌ |
| **System Settings** | ✅ | ❌ | ❌ |
| **View Dashboard** | ✅ | ✅ | ❌ |
| **Manage Shops** | ❌ | ❌ | ✅ |
| **Manage Admins** | ❌ | ❌ | ✅ |

---

## 🔄 WORKFLOW COMPARISON

### Admin Daily Workflow

**Morning**:
```
1. Login as admin
2. Check dashboard
3. View overnight sales
4. Check low-stock alerts
5. Add new products (if needed)
6. Adjust stock (if needed)
```

**Throughout Day**:
```
1. Monitor sales
2. View cashier performance
3. Handle customer issues
4. Manage inventory
5. Process bulk operations
```

**End of Day**:
```
1. View daily sales report
2. Check cashier reconciliation
3. Review transactions
4. Export data
5. Logout
```

---

### Cashier Daily Workflow

**Start of Shift**:
```
1. Login with PIN
2. Clock in
3. View shift status
4. Ready for sales
```

**During Shift**:
```
1. Process sales transactions
2. Handle customer payments
3. Issue receipts
4. Handle returns (if authorized)
5. Monitor cart
```

**End of Shift**:
```
1. View shift sales
2. Clock out
3. Reconcile (if required)
4. Logout
```

---

## 🎯 ROLE SEPARATION PRINCIPLES

### Principle 1: Least Privilege
- Users get minimum access needed for their role
- Admin has full access
- Cashier has POS-only access
- Separation prevents accidental/intentional damage

### Principle 2: Clear Responsibilities
- Admin: Product management, inventory, reporting
- Cashier: Sales transactions, checkout
- No overlap or confusion

### Principle 3: Audit Trail
- All actions logged
- Admin can see cashier activity
- Cashier can see own activity
- Enables accountability

### Principle 4: Security
- Role-based access enforced at backend
- Frontend hides unauthorized options
- Prevents unauthorized access
- Protects sensitive data

### Principle 5: Efficiency
- Each role optimized for their workflow
- Admin can manage products quickly
- Cashier can process sales quickly
- Minimal unnecessary features

---

## 📊 IMPLEMENTATION STATUS

### Current Implementation ✅
```
✅ Role field in User schema (admin/cashier)
✅ RolesGuard on backend endpoints
✅ JWT token includes role
✅ AuthGuard on frontend pages
✅ Navbar shows role-specific options
✅ Layout enforces role restrictions
```

### Recently Fixed ✅
```
✅ Navbar shows only cashier options for cashiers
✅ Admin-only menu items hidden from cashiers
✅ Cashier layout enforces role='cashier'
✅ Admin layout enforces role='admin'
✅ Cashier management page restricted to admin
```

### Still Needed ❌
```
❌ Real-time stock sync between admin and cashier
❌ Cashier activity monitoring on admin dashboard
❌ Advanced permission system (granular permissions)
❌ Role-based API rate limiting
❌ Audit logging for all actions
```

---

## 🔗 RELATED DOCUMENTATION

- **CASHIER_ROLE_BASED_ACCESS_CONTROL.md** - Access control implementation
- **POS_SYSTEM_AUDIT_AND_RESEARCH.md** - POS best practices
- **POS_IMPLEMENTATION_STRATEGY.md** - Implementation roadmap

---

## ✅ VERIFICATION CHECKLIST

### Admin Access Verification
- [ ] Admin can add products
- [ ] Admin can edit products
- [ ] Admin can delete products
- [ ] Admin can view inventory
- [ ] Admin can adjust stock
- [ ] Admin can view reports
- [ ] Admin can manage cashiers
- [ ] Admin can access settings
- [ ] Admin can view all sales
- [ ] Admin can view cashier activity

### Cashier Access Verification
- [ ] Cashier can access POS
- [ ] Cashier can add items to cart
- [ ] Cashier can process payments
- [ ] Cashier can print receipts
- [ ] Cashier can view own sales
- [ ] Cashier can clock in/out
- [ ] Cashier CANNOT add products
- [ ] Cashier CANNOT view reports
- [ ] Cashier CANNOT manage inventory
- [ ] Cashier CANNOT access admin features

### Navbar Verification
- [ ] Admin sees: Dashboard, POS, Inventory, Reports
- [ ] Cashier sees: Dashboard, POS
- [ ] Super Admin sees: Dashboard, Shops
- [ ] No admin buttons visible to cashiers
- [ ] No cashier-specific buttons visible to admin

---

## 🎓 CONCLUSION

SmartDuka now has **clear role separation** with:

**Admin**:
- ✅ Full product management
- ✅ Inventory control
- ✅ Sales reporting
- ✅ Cashier management
- ✅ System settings

**Cashier**:
- ✅ POS checkout
- ✅ Payment processing
- ✅ Receipt generation
- ✅ Own sales view
- ✅ Shift management

**Security**:
- ✅ Role-based access control
- ✅ Frontend + Backend enforcement
- ✅ Clear navigation separation
- ✅ Audit trail ready

---

**Status**: ✅ ROLES DEFINED & IMPLEMENTED

Next: Implement Phase 1 (Mobile-First POS) with role-specific optimizations
