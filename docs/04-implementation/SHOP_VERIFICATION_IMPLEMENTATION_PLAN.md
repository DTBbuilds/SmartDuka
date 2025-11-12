# Shop Verification System - Detailed Implementation Plan 🚀

**Date:** Nov 6, 2025  
**Status:** 📋 PLANNING  
**Estimated Time:** 10-12 hours  
**Priority:** CRITICAL  

---

## 📊 QUICK OVERVIEW

```
Current State:
- Shops created with 'pending' status
- Basic verification endpoint exists
- No super admin role
- No audit trail
- No monitoring

Target State:
- Super admin dashboard
- Multi-step verification workflow
- Audit trail for all changes
- Shop activity monitoring
- Support ticket system
- Password reset feature
```

---

## 🏗️ IMPLEMENTATION PHASES

### PHASE 1: Database & Backend Setup (2-3 hours)

#### 1.1 Create Super Admin Role
**File:** `apps/api/src/auth/dto/register-super-admin.dto.ts` (NEW)

```typescript
export class RegisterSuperAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsEnum(['super_admin', 'support_staff'])
  role: string;
}
```

**Update User Schema:** Add super admin support
- Add `isSuperAdmin` flag
- Add `superAdminLevel` (1-3)
- Add `permissions` array

#### 1.2 Enhance Shop Schema
**File:** `apps/api/src/shops/shop.schema.ts` (MODIFY)

Add fields:
```typescript
// Verification
verificationBy?: Types.ObjectId;
verificationDate?: Date;
verificationNotes?: string;

// Rejection
rejectionReason?: string;
rejectionDate?: Date;

// Suspension
suspensionReason?: string;
suspensionDate?: Date;

// Compliance
complianceScore: number = 100;
chargebackRate: number = 0;
refundRate: number = 0;
violationCount: number = 0;

// Monitoring
lastActivityDate?: Date;
isMonitored: boolean = false;
isFlagged: boolean = false;
flagReason?: string;

// Support
openTickets: number = 0;
lastSupportTicketDate?: Date;
```

#### 1.3 Create Audit Log Schema
**File:** `apps/api/src/shops/schemas/shop-audit-log.schema.ts` (NEW)

```typescript
@Schema({ timestamps: true })
export class ShopAuditLog {
  @Prop({ type: Types.ObjectId, required: true })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  performedBy: Types.ObjectId;

  @Prop({ enum: ['verify', 'reject', 'suspend', 'reactivate', 'flag', 'update'] })
  action: string;

  @Prop()
  oldValue?: Record<string, any>;

  @Prop()
  newValue?: Record<string, any>;

  @Prop()
  reason?: string;

  @Prop()
  notes?: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}
```

#### 1.4 Create Support Ticket Schema
**File:** `apps/api/src/support/schemas/support-ticket.schema.ts` (NEW)

```typescript
@Schema({ timestamps: true })
export class SupportTicket {
  @Prop({ type: Types.ObjectId, required: true })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy: Types.ObjectId;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  description: string;

  @Prop({ enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open' })
  status: string;

  @Prop({ enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' })
  priority: string;

  @Prop()
  assignedTo?: Types.ObjectId;

  @Prop({ default: [] })
  messages: Array<{
    sender: Types.ObjectId;
    message: string;
    createdAt: Date;
  }>;

  @Prop()
  resolvedAt?: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}
```

#### 1.5 Create Super Admin Service
**File:** `apps/api/src/super-admin/super-admin.service.ts` (NEW)

Methods:
- `getPendingShops()` - Get all pending shops
- `getActiveShops()` - Get all active shops
- `getSuspendedShops()` - Get all suspended shops
- `verifyShop(shopId, notes)` - Verify a shop
- `rejectShop(shopId, reason)` - Reject a shop
- `suspendShop(shopId, reason)` - Suspend a shop
- `reactivateShop(shopId)` - Reactivate a shop
- `getShopDetails(shopId)` - Get full shop details
- `getShopAuditLog(shopId)` - Get audit trail
- `getShopActivity(shopId)` - Get activity log
- `createAuditLog(...)` - Log all changes

#### 1.6 Create Super Admin Controller
**File:** `apps/api/src/super-admin/super-admin.controller.ts` (NEW)

Endpoints:
```
GET    /super-admin/shops/pending
GET    /super-admin/shops/active
GET    /super-admin/shops/suspended
GET    /super-admin/shops/:id
PUT    /super-admin/shops/:id/verify
PUT    /super-admin/shops/:id/reject
PUT    /super-admin/shops/:id/suspend
PUT    /super-admin/shops/:id/reactivate
GET    /super-admin/shops/:id/audit-log
GET    /super-admin/shops/:id/activity
```

#### 1.7 Create Support Service
**File:** `apps/api/src/support/support.service.ts` (NEW)

Methods:
- `createTicket(shopId, subject, description)` - Create support ticket
- `getTickets(filters)` - Get support tickets
- `getTicketById(ticketId)` - Get ticket details
- `addMessage(ticketId, message)` - Add message to ticket
- `updateStatus(ticketId, status)` - Update ticket status
- `assignTicket(ticketId, assignedTo)` - Assign ticket

#### 1.8 Create Support Controller
**File:** `apps/api/src/support/support.controller.ts` (NEW)

Endpoints:
```
POST   /support/tickets
GET    /support/tickets
GET    /support/tickets/:id
POST   /support/tickets/:id/messages
PUT    /support/tickets/:id/status
```

---

### PHASE 2: Frontend - Super Admin Dashboard (3-4 hours)

#### 2.1 Create Super Admin Layout
**File:** `apps/web/src/app/super-admin/layout.tsx` (NEW)

- Sidebar navigation
- Top bar with notifications
- Main content area
- Super admin guard

#### 2.2 Create Pending Shops Page
**File:** `apps/web/src/app/super-admin/shops/pending/page.tsx` (NEW)

Features:
- List all pending shops
- Shop cards with details
- Approve button
- Reject button
- View details button

#### 2.3 Create Active Shops Page
**File:** `apps/web/src/app/super-admin/shops/active/page.tsx` (NEW)

Features:
- List all active shops
- Show activity metrics
- Show compliance score
- Suspend button
- View details button

#### 2.4 Create Shop Details Modal
**File:** `apps/web/src/components/shop-details-modal.tsx` (NEW)

Features:
- Full shop information
- Admin information
- Verification history
- Activity log
- Audit trail
- Action buttons

#### 2.5 Create Verification Forms
**File:** `apps/web/src/components/shop-verification-form.tsx` (NEW)

Forms:
- Approve form (notes)
- Reject form (reason)
- Suspend form (reason)
- Reactivate form

#### 2.6 Create Support Tickets Page
**File:** `apps/web/src/app/super-admin/support/page.tsx` (NEW)

Features:
- List all support tickets
- Filter by status
- Filter by priority
- Ticket details modal
- Message input
- Status dropdown

#### 2.7 Create Audit Log Viewer
**File:** `apps/web/src/components/audit-log-viewer.tsx` (NEW)

Features:
- Timeline view
- Show all changes
- Show who made changes
- Show when changes were made
- Show reason for changes

---

### PHASE 3: Support Features (2-3 hours)

#### 3.1 Password Reset Feature
**File:** `apps/api/src/auth/auth.service.ts` (MODIFY)

Add method:
```typescript
async resetAdminPassword(shopId: string, newPassword: string) {
  // Find shop admin
  // Reset password
  // Send email notification
  // Log action
}
```

**File:** `apps/web/src/app/super-admin/admins/page.tsx` (NEW)

Features:
- List all shop admins
- Search by shop name
- Reset password button
- Confirm dialog
- Success notification

#### 3.2 Support Ticket System
**File:** `apps/api/src/support/support.service.ts` (MODIFY)

Already created in Phase 1

#### 3.3 Messaging System
**File:** `apps/web/src/components/ticket-messages.tsx` (NEW)

Features:
- Display all messages
- Message input
- Send button
- Timestamp
- Sender name

---

### PHASE 4: Monitoring & Reporting (2-3 hours)

#### 4.1 Activity Monitoring
**File:** `apps/api/src/super-admin/super-admin.service.ts` (MODIFY)

Add methods:
- `getShopActivity(shopId)` - Get shop activity
- `getShopMetrics(shopId)` - Get shop metrics
- `getComplianceScore(shopId)` - Calculate compliance

#### 4.2 Reporting Dashboard
**File:** `apps/web/src/app/super-admin/reports/page.tsx` (NEW)

Features:
- Verification stats
- Activity stats
- Compliance stats
- Charts and graphs

#### 4.3 Alerts System
**File:** `apps/api/src/super-admin/alerts.service.ts` (NEW)

Features:
- Alert on suspicious activity
- Alert on policy violations
- Alert on high chargeback rate
- Email notifications

---

## 🔑 KEY IMPLEMENTATION DETAILS

### 1. Verification Workflow

```typescript
// Current status
pending → verified → active

// Enhanced status
pending → verified → active
   ↓         ↓         ↓
rejected  flagged   suspended
```

### 2. Audit Trail

Every action must be logged:
```typescript
await this.auditLogService.log({
  shopId: shop._id,
  performedBy: superAdmin._id,
  action: 'verify',
  oldValue: { status: 'pending' },
  newValue: { status: 'verified' },
  reason: 'Business verified',
  notes: 'Documents checked and approved'
});
```

### 3. Notifications

Send notifications on:
- Shop verified
- Shop rejected
- Shop suspended
- Shop reactivated
- Support ticket created
- Support ticket resolved

### 4. Security

- Super admin endpoints require super admin role
- All changes logged
- Audit trail immutable
- Sensitive data encrypted
- IP logging (optional)

---

## 📊 DATABASE CHANGES SUMMARY

### New Collections
1. `shop_audit_logs` - Audit trail
2. `support_tickets` - Support tickets

### Modified Collections
1. `shops` - Add verification fields
2. `users` - Add super admin fields

### Indexes to Create
```typescript
// shops
db.shops.createIndex({ status: 1 });
db.shops.createIndex({ createdAt: -1 });
db.shops.createIndex({ verificationBy: 1 });

// shop_audit_logs
db.shop_audit_logs.createIndex({ shopId: 1 });
db.shop_audit_logs.createIndex({ performedBy: 1 });
db.shop_audit_logs.createIndex({ createdAt: -1 });

// support_tickets
db.support_tickets.createIndex({ shopId: 1 });
db.support_tickets.createIndex({ status: 1 });
db.support_tickets.createIndex({ createdAt: -1 });
```

---

## 🧪 TESTING CHECKLIST

### Backend Testing
- [ ] Create super admin user
- [ ] Verify shop (pending → verified)
- [ ] Reject shop (pending → rejected)
- [ ] Suspend shop (active → suspended)
- [ ] Reactivate shop (suspended → active)
- [ ] Get pending shops
- [ ] Get audit log
- [ ] Create support ticket
- [ ] Add message to ticket

### Frontend Testing
- [ ] Super admin can login
- [ ] See pending shops
- [ ] See active shops
- [ ] See suspended shops
- [ ] Verify shop
- [ ] Reject shop
- [ ] Suspend shop
- [ ] View shop details
- [ ] View audit log
- [ ] Create support ticket

### Security Testing
- [ ] Shop admin cannot access super admin endpoints
- [ ] Cashier cannot access super admin endpoints
- [ ] Super admin cannot access shop admin endpoints
- [ ] All changes are logged
- [ ] Audit trail is immutable

---

## 📈 PERFORMANCE CONSIDERATIONS

### Optimization
- Index on `status` field
- Index on `createdAt` field
- Pagination for large lists
- Caching for frequently accessed data

### Monitoring
- Track response times
- Monitor database queries
- Alert on slow queries
- Optimize as needed

---

## 🎯 SUCCESS CRITERIA

✅ Super admin can see all pending shops  
✅ Super admin can verify/reject shops  
✅ Super admin can suspend/reactivate shops  
✅ All changes are audited  
✅ Shop admins receive notifications  
✅ Support ticket system works  
✅ Password reset works  
✅ Security is maintained  
✅ Performance is acceptable  
✅ UI is user-friendly  

---

## 📅 TIMELINE

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Backend | 2-3h | 📋 Planning |
| Phase 2: Frontend | 3-4h | 📋 Planning |
| Phase 3: Support | 2-3h | 📋 Planning |
| Phase 4: Monitoring | 2-3h | 📋 Planning |
| Phase 5: Testing | 2h | 📋 Planning |
| **TOTAL** | **10-12h** | **📋 Planning** |

---

## 🚀 NEXT STEPS

1. **Review this plan** - Understand the approach
2. **Start Phase 1** - Create database schemas
3. **Create backend services** - Implement verification logic
4. **Create API endpoints** - Test with Postman
5. **Create frontend** - Build super admin dashboard
6. **Test thoroughly** - Security and functionality
7. **Deploy** - Release to production

---

**Status:** 📋 PLANNING COMPLETE  
**Quality:** ✅ COMPREHENSIVE  
**Ready to Implement:** ✅ YES  

**Last Updated:** Nov 6, 2025, 6:15 PM UTC+03:00
