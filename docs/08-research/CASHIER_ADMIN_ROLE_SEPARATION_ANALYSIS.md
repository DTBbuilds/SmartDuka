# SmartDuka Cashier vs Admin Role Separation - Comprehensive Analysis

**Date:** Nov 6, 2025  
**Status:** Analysis & Planning Phase  
**Priority:** CRITICAL - Core Business Logic  

---

## 🔍 INDUSTRY BEST PRACTICES RESEARCH

### From Final POS & Industry Leaders

**Role-Based Access Model:**
```
CASHIER:
- Handle sales transactions
- Check ongoing orders
- View their own sales
- Cannot modify inventory
- Cannot access reports
- Cannot manage employees
- Cannot delete transactions

SUPERVISOR/MANAGER:
- Approve refunds
- Apply discounts
- View reports
- Manage cashiers
- Cannot delete data
- Cannot modify system settings

ADMIN:
- Manage employees
- Adjust product settings
- View all reports
- Delete data
- System configuration
- Full access
```

**Key Principles:**
1. **Least Privilege:** Users get minimum access needed for their role
2. **Separation of Duties:** Cashiers cannot approve their own transactions
3. **Audit Trail:** All actions tracked to specific user
4. **Real-Time Monitoring:** Admin sees cashier activity live
5. **Status Tracking:** Online/offline status visible to admin
6. **Performance Metrics:** Individual cashier sales tracked

---

## 📊 CURRENT CODEBASE ANALYSIS

### What We Have ✅

**Backend:**
- ✅ User schema with role (admin/cashier)
- ✅ User status (active/disabled)
- ✅ RolesGuard for authorization
- ✅ Multi-tenancy (shopId)
- ✅ Cashier creation by admin
- ✅ Max 2 cashiers per shop

**Frontend:**
- ✅ Login page (basic)
- ✅ Cashier management page (admin only)
- ✅ Auth context with role checking
- ✅ AuthGuard for route protection

### What We're Missing ❌

**Backend:**
- ❌ Cashier-specific endpoints (read-only inventory)
- ❌ Cashier activity tracking
- ❌ Online/offline status tracking
- ❌ Cashier sales metrics
- ❌ Permission matrix enforcement
- ❌ Audit logging

**Frontend:**
- ❌ Role selection at login (admin vs cashier)
- ❌ Cashier-specific dashboard
- ❌ Admin activity monitoring dashboard
- ❌ Cashier online/offline indicator
- ❌ Cashier sales performance view
- ❌ Cashier activity log

---

## 🎯 PERMISSION MATRIX

### Detailed Access Control

| Feature | Cashier | Admin |
|---------|---------|-------|
| **POS/Checkout** | ✅ Full | ✅ Full |
| **View Products** | ✅ Read | ✅ Read/Write |
| **Add Products** | ❌ No | ✅ Yes |
| **Edit Products** | ❌ No | ✅ Yes |
| **Delete Products** | ❌ No | ✅ Yes |
| **View Inventory** | ✅ Read | ✅ Read/Write |
| **Update Stock** | ❌ No | ✅ Yes |
| **Import/Export** | ❌ No | ✅ Yes |
| **View Own Sales** | ✅ Yes | ✅ Yes |
| **View All Sales** | ❌ No | ✅ Yes |
| **View Reports** | ❌ No | ✅ Yes |
| **Manage Cashiers** | ❌ No | ✅ Yes |
| **View Cashier Activity** | ❌ No | ✅ Yes |
| **System Settings** | ❌ No | ✅ Yes |

---

## 🔐 LOGIN FLOW IMPROVEMENTS

### Current Flow ❌
```
User enters email/password
    ↓
Login endpoint returns user with role
    ↓
App redirects based on role
    ↓
User sees appropriate dashboard
```

**Problem:** No way to distinguish if email belongs to admin or cashier

### Improved Flow ✅
```
User enters email/password
    ↓
Show role selection (Admin or Cashier)
    ↓
User selects their role
    ↓
Validate: email + password + role combination
    ↓
Return JWT with role
    ↓
Redirect to appropriate dashboard
```

**Benefits:**
- Clear user intent
- Prevents accidental role selection
- Better UX
- Matches industry standards

---

## 📱 CASHIER DASHBOARD REQUIREMENTS

### What Cashier Should See

**Header:**
- Shop name
- Cashier name (their name)
- Online/Offline status
- Current time
- Logout button

**Main Content:**
- POS system (full access)
- My Sales Today (quick stats)
  - Total sales
  - Number of transactions
  - Average transaction
- Recent Transactions (last 10)
  - Time
  - Amount
  - Items
  - Payment method

**Restrictions:**
- ❌ Cannot see other cashiers' sales
- ❌ Cannot access inventory management
- ❌ Cannot access reports
- ❌ Cannot manage products
- ❌ Cannot access admin settings

---

## 👨‍💼 ADMIN DASHBOARD ENHANCEMENTS

### What Admin Should See

**Header:**
- Shop name
- Admin name
- Shop status
- Logout button

**Tabs:**

1. **Dashboard**
   - Shop overview
   - Today's sales
   - Active cashiers
   - Quick actions

2. **Cashier Management**
   - List of all cashiers
   - Status (active/disabled/online/offline)
   - Today's sales per cashier
   - Actions (edit, disable, delete)

3. **Cashier Activity Monitor**
   - Real-time activity log
   - Who logged in/out
   - Current active cashiers
   - Transactions per cashier
   - Performance metrics

4. **Inventory** (existing)
   - Product management
   - Stock management
   - Low stock alerts

5. **Reports** (existing)
   - Sales analytics
   - Top products
   - Daily/weekly/monthly reports

6. **Settings**
   - Shop settings
   - User management
   - System configuration

---

## 🔄 CASHIER ACTIVITY TRACKING

### What to Track

**Session Events:**
- Login time
- Logout time
- Duration
- Device/IP

**Transaction Events:**
- Transaction ID
- Amount
- Items
- Payment method
- Time
- Customer name (if provided)

**Performance Metrics:**
- Total sales (daily/weekly/monthly)
- Number of transactions
- Average transaction value
- Most common payment method
- Peak hours

---

## 🟢 ONLINE/OFFLINE STATUS

### Implementation Strategy

**Client-Side:**
- Track when user logs in → Online
- Track when user logs out → Offline
- Track inactivity (5 min) → Idle
- Track network status → Offline

**Server-Side:**
- Store last activity timestamp
- Calculate status based on:
  - Last activity time
  - Current time
  - Timeout threshold (5 minutes)

**Status States:**
- 🟢 Online (active in last 5 minutes)
- 🟡 Idle (no activity for 5-15 minutes)
- 🔴 Offline (no activity for 15+ minutes or logged out)

---

## 📋 IMPLEMENTATION PLAN

### Phase 1: Login Page Enhancement (1 hour)
1. Add role selection radio buttons
2. Validate role matches user
3. Update login endpoint to accept role
4. Show appropriate error messages

### Phase 2: Backend Permissions (2 hours)
1. Create permission matrix
2. Add permission checking middleware
3. Restrict cashier endpoints
4. Add activity logging

### Phase 3: Cashier Dashboard (2 hours)
1. Create cashier-specific dashboard
2. Show only cashier-relevant data
3. Display today's sales
4. Show recent transactions

### Phase 4: Admin Monitoring (3 hours)
1. Create cashier activity monitor
2. Display cashier list with status
3. Show real-time activity
4. Add performance metrics

### Phase 5: Activity Tracking (2 hours)
1. Track login/logout events
2. Track transactions
3. Calculate performance metrics
4. Store activity log

### Phase 6: Testing & Refinement (2 hours)
1. Test all flows
2. Verify permissions
3. Check activity tracking
4. Performance testing

---

## 🛠️ TECHNICAL IMPLEMENTATION

### Backend Changes

**1. Permission Middleware**
```typescript
// Create permission checking middleware
// Verify user role against endpoint requirements
// Log all access attempts
```

**2. Activity Logger**
```typescript
// Log all user actions
// Store in activity collection
// Include: userId, action, timestamp, details
```

**3. Cashier-Only Endpoints**
```typescript
// GET /cashier/dashboard - Cashier stats
// GET /cashier/sales/today - Today's sales
// GET /cashier/transactions - Recent transactions
// GET /cashier/performance - Performance metrics
```

**4. Admin Monitoring Endpoints**
```typescript
// GET /admin/cashiers/activity - Activity log
// GET /admin/cashiers/status - Online/offline status
// GET /admin/cashiers/:id/performance - Individual metrics
// GET /admin/dashboard - Admin overview
```

### Frontend Changes

**1. Login Page**
```typescript
// Add role selection (radio buttons)
// Admin / Cashier options
// Validate selection
// Pass role to login endpoint
```

**2. Cashier Dashboard**
```typescript
// Create new page: /cashier/dashboard
// Show POS + today's stats
// Show recent transactions
// Restrict access to other features
```

**3. Admin Dashboard**
```typescript
// Enhance existing /admin
// Add cashier monitoring tab
// Show activity log
// Display performance metrics
```

**4. Activity Tracking**
```typescript
// Track login/logout
// Track transactions
// Update online/offline status
// Store activity log
```

---

## 📊 DATA MODELS

### Activity Log Schema
```typescript
{
  _id: ObjectId,
  shopId: ObjectId,
  userId: ObjectId,
  userName: string,
  userRole: 'admin' | 'cashier',
  action: 'login' | 'logout' | 'transaction' | 'product_view' | ...,
  details: {
    transactionId?: string,
    amount?: number,
    items?: number,
    ...
  },
  timestamp: Date,
  ipAddress?: string,
  userAgent?: string,
}
```

### Cashier Status Schema
```typescript
{
  _id: ObjectId,
  shopId: ObjectId,
  cashierId: ObjectId,
  status: 'online' | 'idle' | 'offline',
  lastActivity: Date,
  loginTime: Date,
  logoutTime?: Date,
  sessionDuration?: number,
  todaySales: number,
  transactionCount: number,
}
```

---

## 🎯 SUCCESS CRITERIA

### Login Flow
✅ Role selection visible at login  
✅ Admin and Cashier options  
✅ Role validation on backend  
✅ Appropriate error messages  

### Permissions
✅ Cashier cannot access admin features  
✅ Cashier cannot modify inventory  
✅ Cashier cannot view other cashiers  
✅ Admin can see everything  

### Activity Tracking
✅ Login/logout logged  
✅ Transactions tracked  
✅ Performance metrics calculated  
✅ Activity log accessible to admin  

### Dashboards
✅ Cashier sees only relevant data  
✅ Admin sees all data  
✅ Online/offline status visible  
✅ Performance metrics displayed  

### UX
✅ Clear role identification  
✅ Appropriate redirects  
✅ Loading states  
✅ Error handling  

---

## 📚 REFERENCE DOCUMENTATION

### Industry Standards
- OWASP Role-Based Access Control
- PCI DSS for POS systems
- Retail best practices

### Similar Systems
- Final POS
- Square for Retail
- Toast POS
- Lightspeed Retail

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Backend permission middleware implemented
- [ ] Activity logging implemented
- [ ] Login page updated with role selection
- [ ] Cashier dashboard created
- [ ] Admin monitoring dashboard created
- [ ] All endpoints tested
- [ ] Permissions verified
- [ ] Activity tracking working
- [ ] Performance metrics calculated
- [ ] UI/UX reviewed
- [ ] Security audit passed
- [ ] Load testing completed
- [ ] Documentation updated
- [ ] Ready for production

---

**Status:** ✅ Analysis Complete  
**Next Step:** Implementation Phase 1 - Login Page Enhancement  
**Estimated Total Time:** 12 hours  
**Priority:** CRITICAL  

