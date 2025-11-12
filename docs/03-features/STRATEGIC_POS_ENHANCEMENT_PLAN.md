# SmartDuka Strategic Enhancement Plan
## Multi-Tenant POS System for Kenyan Dukas

**Date:** Nov 6, 2025  
**Scope:** 20 shops (Nairobi MVP)  
**Target Market:** Kenyan Dukas, Small Retailers, Supermarkets

---

## 📊 EXECUTIVE SUMMARY

SmartDuka is transitioning from a **single-shop POS** to a **multi-tenant SaaS platform** serving multiple independent shops. Each shop operates independently with:
- **1 Admin** (Shop Owner/Manager)
- **2 Cashiers** (Staff)
- **Unique shop data** (products, sales, inventory)
- **Shop verification** before access

---

## 🔍 CURRENT STATE ANALYSIS

### What We Have ✅

**Backend (NestJS + MongoDB):**
- ✅ JWT authentication with Passport
- ✅ User schema with roles (admin/cashier)
- ✅ Role-based access control (RolesGuard)
- ✅ Product & inventory management
- ✅ Sales/orders module
- ✅ M-Pesa integration stub
- ✅ CORS configured

**Frontend (Next.js):**
- ✅ Login/signup pages
- ✅ POS interface with cart
- ✅ Admin inventory management
- ✅ Sales reports
- ✅ Offline support (Dexie + Service Worker)
- ✅ Mobile-responsive design
- ✅ Enhanced navbar & dashboard

**Architecture:**
- ✅ Monorepo (pnpm + Turbo)
- ✅ TypeScript throughout
- ✅ Modern UI (TailwindCSS + ShadCN)
- ✅ Offline-first PWA

---

### What's Missing ❌

**Multi-Tenancy:**
- ❌ Shop/Tenant model in database
- ❌ Shop registration/onboarding flow
- ❌ Shop verification process
- ❌ Tenant isolation (data segregation)
- ❌ Shop-specific dashboards
- ❌ Cashier limit enforcement (max 2)

**User Management:**
- ❌ Admin can create cashiers
- ❌ Cashier invitation/registration
- ❌ Cashier access restrictions
- ❌ Shop admin dashboard
- ❌ User management UI

**Onboarding:**
- ❌ Shop registration page
- ❌ Shop verification workflow
- ❌ Admin approval process
- ❌ Onboarding wizard
- ❌ Shop setup completion

**Navigation:**
- ❌ Redirect to signup for shop registration
- ❌ Redirect to onboarding after signup
- ❌ Redirect to dashboard after onboarding

---

## 🌍 MARKET RESEARCH FINDINGS

### Kenyan POS Systems Analysis

**LinearPOS (Competitor):**
- ✅ KRA eTIMS compliance
- ✅ M-Pesa & KopoKopo integration
- ✅ Real-time reporting
- ✅ Offline capabilities
- ✅ Multi-user support
- ✅ Inventory management
- ✅ Daily email reports

**DukaTrack (Competitor):**
- ✅ 500+ businesses using
- ✅ Business management focus
- ✅ Shop-specific features
- ✅ Multi-till support
- ✅ Staff management

**Duka Manager (Competitor):**
- ✅ Mobile-first
- ✅ Business record tracking
- ✅ Easy to use
- ✅ Smartphone accessible

### Best Practices Identified

**Multi-Tenant Architecture:**
1. **Shop/Organization Model** - Each shop is independent
2. **User Roles** - Admin (owner), Cashier (staff)
3. **Data Isolation** - Shop data never mixed
4. **Shop Verification** - KYC/KYB before activation
5. **Onboarding Wizard** - Guided setup process

**Merchant Onboarding (Industry Standard):**
1. **Pre-onboarding** - Information collection
2. **Application Review** - Validation
3. **Compliance Check** - Risk assessment
4. **Business Verification** - Document verification
5. **Account Setup** - System configuration
6. **Training** - User education
7. **Agreement Signing** - Terms acceptance
8. **Monitoring** - Ongoing compliance

**Kenyan Market Specifics:**
- ✅ KRA eTIMS compliance required
- ✅ M-Pesa integration essential
- ✅ Offline capability critical (poor connectivity)
- ✅ Simple, intuitive UI (non-technical users)
- ✅ Mobile-first approach
- ✅ Multi-user support (cashiers)
- ✅ Real-time reporting

---

## 🎯 STRATEGIC REQUIREMENTS

### 1. Multi-Tenancy Architecture

**Shop Model:**
```
Shop {
  id: UUID
  name: string (e.g., "Mama Jane's Duka")
  phone: string
  email: string
  address: string
  city: string
  businessType: string (e.g., "General Store", "Supermarket")
  kraPin: string (optional)
  status: "pending" | "verified" | "active" | "suspended"
  verificationDate: Date
  createdAt: Date
  updatedAt: Date
}
```

**User Model (Enhanced):**
```
User {
  id: UUID
  shopId: UUID (foreign key)
  email: string
  phone: string
  name: string
  role: "admin" | "cashier"
  status: "active" | "disabled"
  passwordHash: string
  createdAt: Date
  updatedAt: Date
}
```

**Key Changes:**
- Add `shopId` to User schema
- Create Shop schema
- Add shop verification status
- Enforce data isolation by shopId

### 2. Onboarding Flow

**Step 1: Signup (Admin Registration)**
```
User fills:
- Shop name
- Owner name
- Email
- Phone
- Password
→ Creates shop with status "pending"
→ Creates admin user
→ Redirects to onboarding
```

**Step 2: Onboarding (Shop Setup)**
```
Admin fills:
- Business type
- Address
- City
- KRA PIN (optional)
- Till number
- Tax rate
→ Updates shop details
→ Redirects to verification
```

**Step 3: Verification (Admin Review)**
```
Status: "pending" → "verified" → "active"
- Manual review by SmartDuka admin
- Email notification to shop owner
- Access to POS system
```

**Step 4: Dashboard Access**
```
After verification:
- Admin sees shop dashboard
- Can create cashiers (max 2)
- Can manage inventory
- Can view reports
```

### 3. Cashier Management

**Admin Creates Cashier:**
```
Admin goes to: /users/create-cashier
Fills:
- Cashier name
- Email
- Phone
- Password (or auto-generate)
→ Creates cashier user with shopId
→ Cashier can login
→ Cashier sees only POS interface
```

**Cashier Restrictions:**
```
Cashier can:
- Use POS (process sales)
- View own sales
- Print receipts

Cashier cannot:
- Access inventory management
- View reports
- Create other users
- Access settings
- View other cashiers' sales
```

### 4. Shop-Specific Dashboards

**Admin Dashboard:**
```
/dashboard
- Shop overview
- Total sales (today/week/month)
- Top products
- Low stock alerts
- Cashier activity
- Quick actions (manage cashiers, inventory)
```

**Cashier Dashboard:**
```
/pos
- POS interface only
- Process sales
- View cart
- Checkout
- Print receipt
```

### 5. Data Isolation

**Every API call must verify shopId:**
```
GET /products → Only shop's products
GET /orders → Only shop's orders
POST /checkout → Creates order for shop
GET /reports → Only shop's reports
```

**Middleware:**
```typescript
// Extract shopId from JWT token
// Verify user belongs to shop
// Attach shopId to request
// All queries filtered by shopId
```

---

## 📋 IMPLEMENTATION ROADMAP

### Phase 1: Database Schema Updates (Week 1)
- [ ] Create Shop schema
- [ ] Update User schema with shopId
- [ ] Add shop verification status
- [ ] Create migrations
- [ ] Add indexes for shopId

### Phase 2: Backend API Updates (Week 1-2)
- [ ] Create Shop controller/service
- [ ] Update Auth for shop registration
- [ ] Add shop verification endpoints
- [ ] Update all endpoints for multi-tenancy
- [ ] Add shopId middleware
- [ ] Create cashier management endpoints
- [ ] Update role-based guards

### Phase 3: Frontend Onboarding (Week 2-3)
- [ ] Create shop registration page
- [ ] Create onboarding wizard
- [ ] Create verification status page
- [ ] Update signup flow
- [ ] Add redirects (signup → onboarding → dashboard)
- [ ] Create cashier management UI

### Phase 4: Testing & Deployment (Week 3-4)
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Manual testing with 5 test shops
- [ ] Performance testing
- [ ] Security audit
- [ ] Deployment

---

## 🔐 Security Considerations

### Data Isolation
- ✅ Every query filtered by shopId
- ✅ Users can only access their shop
- ✅ JWT token includes shopId
- ✅ Middleware validates shopId

### Verification Process
- ✅ Shop status: pending → verified → active
- ✅ Manual admin review
- ✅ Email notifications
- ✅ Audit trail of changes

### Cashier Limits
- ✅ Enforce max 2 cashiers per shop
- ✅ Admin can disable cashiers
- ✅ Audit log of cashier creation

### Password Security
- ✅ Bcrypt hashing
- ✅ Minimum 6 characters
- ✅ Password strength indicator
- ✅ Optional password reset

---

## 📊 Database Schema Changes

### New Collections

**shops**
```javascript
{
  _id: ObjectId,
  name: String, // "Mama Jane's Duka"
  phone: String,
  email: String,
  address: String,
  city: String,
  businessType: String, // "General Store", "Supermarket", etc.
  kraPin: String, // Optional
  status: String, // "pending", "verified", "active", "suspended"
  verificationDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Updated Collections

**users** (add shopId)
```javascript
{
  _id: ObjectId,
  shopId: ObjectId, // Foreign key to shops
  email: String,
  phone: String,
  name: String,
  role: String, // "admin", "cashier"
  status: String, // "active", "disabled"
  passwordHash: String,
  createdAt: Date,
  updatedAt: Date
}
```

**products** (add shopId)
```javascript
{
  _id: ObjectId,
  shopId: ObjectId, // Foreign key to shops
  name: String,
  sku: String,
  barcode: String,
  price: Number,
  cost: Number,
  stock: Number,
  category: String,
  tax: Number,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

**orders** (add shopId)
```javascript
{
  _id: ObjectId,
  shopId: ObjectId, // Foreign key to shops
  orderNumber: String,
  userId: ObjectId,
  items: Array,
  total: Number,
  paymentMethod: String,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🛠️ Technical Implementation Details

### Backend Changes

**1. Shop Service**
```typescript
// apps/api/src/shops/shops.service.ts
- createShop(dto)
- findById(id)
- findByEmail(email)
- updateStatus(id, status)
- getShopStats(shopId)
```

**2. Shop Controller**
```typescript
// apps/api/src/shops/shops.controller.ts
- POST /shops (create)
- GET /shops/:id (get)
- PUT /shops/:id (update)
- GET /shops/:id/stats (stats)
```

**3. Auth Updates**
```typescript
// apps/api/src/auth/auth.service.ts
- registerShop(shopData) // New
- loginShop(email, password) // Updated
- JWT payload includes shopId
```

**4. Middleware**
```typescript
// apps/api/src/common/middleware/shop.middleware.ts
- Extract shopId from JWT
- Attach to request
- All queries filtered by shopId
```

**5. Update All Endpoints**
```
GET /products → GET /products?shopId=xxx
GET /orders → GET /orders?shopId=xxx
POST /checkout → shopId from JWT
GET /reports → shopId from JWT
```

### Frontend Changes

**1. New Pages**
```
/register-shop - Shop registration
/onboarding - Shop setup wizard
/verification - Verification status
/users/create-cashier - Create cashier
/users/manage - Manage cashiers
```

**2. Updated Pages**
```
/signup → Redirect to /register-shop
/login → Check shop status
/ → Redirect to /onboarding if not verified
/dashboard → Show shop-specific data
```

**3. New Components**
```
ShopRegistrationForm
OnboardingWizard
VerificationStatus
CashierManagement
ShopStats
```

---

## 📈 Competitive Advantages

### vs LinearPOS
- ✅ Offline-first (better for poor connectivity)
- ✅ Modern, intuitive UI
- ✅ Progressive Web App (no installation)
- ✅ Faster onboarding
- ✅ Lower cost

### vs DukaTrack
- ✅ Offline capability
- ✅ Simpler interface
- ✅ Better mobile experience
- ✅ Real-time sync

### vs Duka Manager
- ✅ Full POS system (not just tracking)
- ✅ Inventory management
- ✅ Multi-user support
- ✅ Reports & analytics
- ✅ Offline capability

---

## 🎯 Success Metrics

**Phase 1 (MVP - 5 shops):**
- ✅ 5 shops onboarded
- ✅ 100% data isolation
- ✅ Zero data breaches
- ✅ 99% uptime

**Phase 2 (Growth - 20 shops):**
- ✅ 20 shops active
- ✅ 50+ cashiers
- ✅ 1000+ transactions/day
- ✅ < 2s response time

**Phase 3 (Scale - 100+ shops):**
- ✅ 100+ shops
- ✅ 200+ cashiers
- ✅ 10,000+ transactions/day
- ✅ Multi-region deployment

---

## 🚀 Go-to-Market Strategy

### Target Customers
- Small dukas (1-2 staff)
- Supermarkets (3-5 staff)
- Retail shops
- Convenience stores

### Pricing Model
- **Free tier:** 1 shop, 1 admin, 1 cashier
- **Pro tier:** 1 shop, 1 admin, 2 cashiers, reports
- **Business tier:** Multiple shops (future)

### Marketing Channels
- Direct sales (Nairobi dukas)
- WhatsApp groups
- Facebook ads
- Google ads
- Referral program

### Onboarding Support
- Video tutorials
- Phone support
- WhatsApp support
- In-person training (for first 20 shops)

---

## 📝 Documentation Needed

1. **User Guide** - How to use SmartDuka
2. **Admin Guide** - How to manage shop
3. **Cashier Guide** - How to use POS
4. **API Documentation** - For integrations
5. **Deployment Guide** - For hosting
6. **Security Guide** - Best practices

---

## ✅ Checklist

### Database
- [ ] Shop schema created
- [ ] User schema updated with shopId
- [ ] Product schema updated with shopId
- [ ] Order schema updated with shopId
- [ ] Indexes created
- [ ] Migrations written

### Backend
- [ ] Shop controller created
- [ ] Shop service created
- [ ] Auth updated for shop registration
- [ ] Middleware for shop isolation
- [ ] All endpoints updated for shopId
- [ ] Cashier management endpoints
- [ ] Tests written

### Frontend
- [ ] Shop registration page
- [ ] Onboarding wizard
- [ ] Verification status page
- [ ] Cashier management UI
- [ ] Updated redirects
- [ ] Updated auth context
- [ ] Tests written

### Testing
- [ ] Unit tests (backend)
- [ ] Unit tests (frontend)
- [ ] Integration tests
- [ ] E2E tests
- [ ] Security tests
- [ ] Performance tests

### Deployment
- [ ] Staging environment
- [ ] Production environment
- [ ] Monitoring setup
- [ ] Backup strategy
- [ ] Disaster recovery

---

## 🎉 Expected Outcomes

**After Implementation:**
- ✅ Multi-tenant SaaS platform
- ✅ 20 independent shops
- ✅ 50+ cashiers
- ✅ Scalable architecture
- ✅ Professional POS system
- ✅ Market-ready product
- ✅ Competitive advantage

---

## 📞 Next Steps

1. **Review this plan** - Get stakeholder approval
2. **Create detailed specs** - For each component
3. **Start Phase 1** - Database schema updates
4. **Parallel work** - Backend and frontend
5. **Test thoroughly** - Before deployment
6. **Deploy to staging** - For user testing
7. **Deploy to production** - Launch MVP

---

**Status:** ✅ STRATEGIC PLAN COMPLETE

**Estimated Timeline:** 4 weeks (MVP with 5 shops)

**Complexity:** Medium (well-defined requirements)

**Risk Level:** Low (proven patterns)

This plan balances **innovation** (multi-tenant, offline-first) with **pragmatism** (minimal changes, proven architecture).

Let's build the future of Kenyan retail! 🚀
