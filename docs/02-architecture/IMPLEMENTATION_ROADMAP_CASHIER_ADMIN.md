# SmartDuka Cashier vs Admin Implementation Roadmap

**Date:** Nov 6, 2025  
**Status:** Ready for Implementation  
**Total Estimated Time:** 12-14 hours  
**Priority:** CRITICAL  

---

## 📋 PHASE 1: LOGIN PAGE ENHANCEMENT (1 hour)

### Objective
Add role selection to login page so users can identify themselves as admin or cashier.

### Tasks

#### 1.1 Update Login Page UI
**File:** `apps/web/src/app/login/page.tsx`

**Changes:**
- Add radio button group for role selection (Admin / Cashier)
- Show role selection prominently
- Update form to include role
- Add helpful descriptions

**UI Layout:**
```
┌─────────────────────────────────────┐
│  Welcome to SmartDuka              │
│                                     │
│  Email: [_________________]         │
│  Password: [_________________]      │
│                                     │
│  Login as:                          │
│  ○ Admin (Shop Owner)              │
│  ○ Cashier (Staff Member)          │
│                                     │
│  [Sign In]                          │
│                                     │
│  Don't have a shop? Register        │
└─────────────────────────────────────┘
```

#### 1.2 Update Auth Context
**File:** `apps/web/src/lib/auth-context.tsx`

**Changes:**
- Add role parameter to login function
- Pass role to backend login endpoint
- Store role in JWT

#### 1.3 Update Backend Login Endpoint
**File:** `apps/api/src/auth/auth.controller.ts`

**Changes:**
- Accept role in login request
- Validate role matches user
- Return error if mismatch

### Deliverables
- ✅ Login page with role selection
- ✅ Role validation
- ✅ Updated auth flow
- ✅ Error handling

---

## 📋 PHASE 2: BACKEND PERMISSIONS & ACTIVITY LOGGING (2 hours)

### Objective
Implement permission checking and activity logging on backend.

### Tasks

#### 2.1 Create Permission Middleware
**File:** `apps/api/src/auth/middleware/permission.middleware.ts` (NEW)

**Features:**
- Check user role against endpoint requirements
- Log permission checks
- Return appropriate errors

#### 2.2 Create Activity Logger Service
**File:** `apps/api/src/activity/activity.service.ts` (NEW)

**Features:**
- Log all user actions
- Store activity in database
- Track login/logout
- Track transactions
- Track data access

#### 2.3 Create Activity Schema
**File:** `apps/api/src/activity/schemas/activity.schema.ts` (NEW)

**Fields:**
- shopId
- userId
- userName
- userRole
- action (login, logout, transaction, etc.)
- details (transaction ID, amount, etc.)
- timestamp
- ipAddress
- userAgent

#### 2.4 Create Cashier Status Schema
**File:** `apps/api/src/cashier/schemas/cashier-status.schema.ts` (NEW)

**Fields:**
- shopId
- cashierId
- status (online, idle, offline)
- lastActivity
- loginTime
- logoutTime
- sessionDuration
- todaySales
- transactionCount

#### 2.5 Restrict Cashier Endpoints
**File:** `apps/api/src/inventory/inventory.controller.ts`

**Changes:**
- Add `@Roles('admin')` to POST/PUT/DELETE endpoints
- Keep GET endpoints accessible to cashiers
- Add permission checking

#### 2.6 Create Cashier-Only Endpoints
**File:** `apps/api/src/cashier/cashier.controller.ts` (NEW)

**Endpoints:**
- GET /cashier/dashboard - Cashier stats
- GET /cashier/sales/today - Today's sales
- GET /cashier/transactions - Recent transactions
- GET /cashier/performance - Performance metrics

### Deliverables
- ✅ Permission middleware
- ✅ Activity logging
- ✅ Restricted endpoints
- ✅ Cashier-specific endpoints

---

## 📋 PHASE 3: CASHIER DASHBOARD (2 hours)

### Objective
Create cashier-specific dashboard showing only relevant information.

### Tasks

#### 3.1 Create Cashier Dashboard Page
**File:** `apps/web/src/app/cashier/dashboard/page.tsx` (NEW)

**Components:**
- Header with cashier name and status
- Today's sales summary
- Recent transactions list
- Quick stats

**Features:**
- Show only cashier's own data
- No access to other cashiers
- No inventory management
- No reports

#### 3.2 Create Cashier Layout
**File:** `apps/web/src/app/cashier/layout.tsx` (NEW)

**Features:**
- Navigation limited to POS and Dashboard
- Hide admin features
- Show cashier-specific menu

#### 3.3 Update POS Page for Cashier
**File:** `apps/web/src/app/pos/page.tsx`

**Changes:**
- Show cashier name in header
- Track cashier sales
- Show today's total
- Restrict to POS only

#### 3.4 Create Cashier Stats Component
**File:** `apps/web/src/components/cashier-stats.tsx` (NEW)

**Displays:**
- Total sales today
- Transaction count
- Average transaction
- Payment methods breakdown

### Deliverables
- ✅ Cashier dashboard page
- ✅ Cashier layout
- ✅ Stats component
- ✅ Transaction list

---

## 📋 PHASE 4: ADMIN MONITORING DASHBOARD (3 hours)

### Objective
Create admin dashboard with cashier monitoring and activity tracking.

### Tasks

#### 4.1 Create Admin Dashboard Enhancement
**File:** `apps/web/src/app/admin/dashboard/page.tsx` (NEW)

**Sections:**
- Shop overview
- Today's sales
- Active cashiers
- Quick actions

#### 4.2 Create Cashier Monitoring Tab
**File:** `apps/web/src/app/admin/cashiers/monitoring/page.tsx` (NEW)

**Features:**
- List all cashiers
- Show online/offline status
- Display today's sales per cashier
- Show activity timeline
- Performance metrics

**Display:**
```
Cashier Name | Status | Today's Sales | Transactions | Actions
─────────────────────────────────────────────────────────────
John Doe     | 🟢 Online | Ksh 15,000  | 12          | View
Jane Smith   | 🔴 Offline| Ksh 8,500   | 7           | View
```

#### 4.3 Create Activity Log Component
**File:** `apps/web/src/components/activity-log.tsx` (NEW)

**Features:**
- Show recent activities
- Filter by cashier
- Filter by action type
- Real-time updates
- Pagination

#### 4.4 Create Performance Metrics Component
**File:** `apps/web/src/components/performance-metrics.tsx` (NEW)

**Metrics:**
- Total sales per cashier
- Transaction count
- Average transaction value
- Payment method breakdown
- Peak hours
- Trends

#### 4.5 Create Online Status Indicator
**File:** `apps/web/src/components/cashier-status-badge.tsx` (NEW)

**Status Display:**
- 🟢 Online (active in last 5 min)
- 🟡 Idle (no activity 5-15 min)
- 🔴 Offline (no activity 15+ min)

#### 4.6 Create Cashier Detail View
**File:** `apps/web/src/app/admin/cashiers/:id/page.tsx` (NEW)

**Shows:**
- Cashier profile
- Today's sales detail
- Recent transactions
- Performance chart
- Activity log
- Status history

### Deliverables
- ✅ Admin dashboard enhancement
- ✅ Cashier monitoring tab
- ✅ Activity log component
- ✅ Performance metrics
- ✅ Status indicators
- ✅ Cashier detail view

---

## 📋 PHASE 5: ACTIVITY TRACKING & STATUS MANAGEMENT (2 hours)

### Objective
Implement real-time activity tracking and online/offline status.

### Tasks

#### 5.1 Create Activity Tracking Service
**File:** `apps/web/src/lib/activity-tracker.ts` (NEW)

**Features:**
- Track user actions
- Send to backend
- Handle offline mode
- Batch updates

#### 5.2 Create Status Manager
**File:** `apps/web/src/lib/status-manager.ts` (NEW)

**Features:**
- Track online/offline status
- Send heartbeat to server
- Update last activity
- Handle network changes

#### 5.3 Update Auth Context
**File:** `apps/web/src/lib/auth-context.tsx`

**Changes:**
- Add activity tracking on login
- Add activity tracking on logout
- Add heartbeat mechanism
- Track inactivity

#### 5.4 Create Backend Activity Endpoints
**File:** `apps/api/src/activity/activity.controller.ts` (NEW)

**Endpoints:**
- POST /activity/log - Log activity
- GET /activity/logs - Get activity log
- GET /activity/cashier/:id - Get cashier activity
- POST /activity/heartbeat - Update last activity

#### 5.5 Create Backend Status Service
**File:** `apps/api/src/cashier/cashier-status.service.ts` (NEW)

**Features:**
- Update cashier status
- Calculate online/offline
- Track session duration
- Calculate metrics

### Deliverables
- ✅ Activity tracking service
- ✅ Status manager
- ✅ Activity endpoints
- ✅ Status service
- ✅ Real-time updates

---

## 📋 PHASE 6: TESTING & REFINEMENT (2 hours)

### Objective
Test all features and ensure everything works correctly.

### Tasks

#### 6.1 Unit Tests
- Test permission middleware
- Test activity logging
- Test status calculation
- Test role validation

#### 6.2 Integration Tests
- Test login with role selection
- Test cashier dashboard access
- Test admin monitoring
- Test activity tracking

#### 6.3 E2E Tests
- Test complete cashier flow
- Test complete admin flow
- Test role separation
- Test permission enforcement

#### 6.4 Manual Testing
- Test on different devices
- Test on different browsers
- Test offline mode
- Test performance

#### 6.5 Security Testing
- Test unauthorized access
- Test role spoofing
- Test data leakage
- Test SQL injection

### Deliverables
- ✅ All tests passing
- ✅ No security issues
- ✅ Good performance
- ✅ Smooth UX

---

## 🎯 IMPLEMENTATION SEQUENCE

### Day 1 (4 hours)
1. Phase 1: Login page enhancement (1 hour)
2. Phase 2: Backend permissions (2 hours)
3. Phase 3: Cashier dashboard start (1 hour)

### Day 2 (4 hours)
1. Phase 3: Cashier dashboard complete (1 hour)
2. Phase 4: Admin monitoring (3 hours)

### Day 3 (4 hours)
1. Phase 5: Activity tracking (2 hours)
2. Phase 6: Testing & refinement (2 hours)

---

## 📊 FILE STRUCTURE

### New Files to Create (15 files)

**Backend:**
1. `apps/api/src/auth/middleware/permission.middleware.ts`
2. `apps/api/src/activity/activity.service.ts`
3. `apps/api/src/activity/activity.controller.ts`
4. `apps/api/src/activity/schemas/activity.schema.ts`
5. `apps/api/src/cashier/cashier-status.service.ts`
6. `apps/api/src/cashier/schemas/cashier-status.schema.ts`
7. `apps/api/src/cashier/cashier.controller.ts`

**Frontend:**
8. `apps/web/src/app/cashier/dashboard/page.tsx`
9. `apps/web/src/app/cashier/layout.tsx`
10. `apps/web/src/app/admin/dashboard/page.tsx`
11. `apps/web/src/app/admin/cashiers/monitoring/page.tsx`
12. `apps/web/src/app/admin/cashiers/:id/page.tsx`
13. `apps/web/src/components/cashier-stats.tsx`
14. `apps/web/src/components/activity-log.tsx`
15. `apps/web/src/components/performance-metrics.tsx`

**Utilities:**
16. `apps/web/src/lib/activity-tracker.ts`
17. `apps/web/src/lib/status-manager.ts`

### Files to Modify (8 files)

**Backend:**
1. `apps/api/src/auth/auth.controller.ts` - Add role to login
2. `apps/api/src/inventory/inventory.controller.ts` - Add permission checks
3. `apps/api/src/sales/sales.controller.ts` - Add permission checks
4. `apps/api/src/auth/auth.module.ts` - Register new services

**Frontend:**
5. `apps/web/src/app/login/page.tsx` - Add role selection
6. `apps/web/src/lib/auth-context.tsx` - Add activity tracking
7. `apps/web/src/app/pos/page.tsx` - Show cashier name
8. `apps/web/src/app/admin/page.tsx` - Link to monitoring

---

## ✅ SUCCESS CRITERIA

### Login Flow
- [ ] Role selection visible
- [ ] Admin and Cashier options
- [ ] Role validation working
- [ ] Appropriate redirects

### Permissions
- [ ] Cashier cannot access admin features
- [ ] Cashier cannot modify inventory
- [ ] Cashier cannot view other cashiers
- [ ] Admin can see everything

### Activity Tracking
- [ ] Login/logout logged
- [ ] Transactions tracked
- [ ] Performance metrics calculated
- [ ] Activity log accessible

### Dashboards
- [ ] Cashier sees only relevant data
- [ ] Admin sees all data
- [ ] Online/offline status visible
- [ ] Performance metrics displayed

### Performance
- [ ] Page load < 2 seconds
- [ ] Activity tracking < 100ms
- [ ] No memory leaks
- [ ] Smooth animations

---

## 🚀 DEPLOYMENT STRATEGY

### Pre-Deployment
1. All tests passing
2. Code review completed
3. Security audit passed
4. Performance tested
5. Documentation updated

### Deployment
1. Deploy backend first
2. Deploy frontend
3. Monitor for errors
4. Rollback plan ready

### Post-Deployment
1. Monitor error logs
2. Check user feedback
3. Verify all features working
4. Performance monitoring

---

## 📝 NOTES

### Important Considerations
- Maintain backward compatibility
- Don't break existing functionality
- Ensure data security
- Test thoroughly before deployment
- Document all changes
- Update API documentation

### Future Enhancements
- Advanced analytics
- Predictive metrics
- Mobile app
- Real-time notifications
- Advanced reporting
- Custom dashboards

---

**Status:** ✅ Ready for Implementation  
**Next Step:** Start Phase 1 - Login Page Enhancement  
**Estimated Completion:** 12-14 hours  
**Priority:** CRITICAL  

