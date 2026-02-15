# Customer Loyalty & Rewards System - Research & Implementation Plan

## Executive Summary

SmartDuka already has a **foundational customer and loyalty system** in place. This document outlines the current state, gaps, and recommended enhancements to create a robust customer handling and loyalty rewards system.

---

## Current System Analysis

### ✅ What Already Exists

#### 1. Customer Management (Backend)
**Location:** `apps/api/src/customers/`

| Feature | Status | Details |
|---------|--------|---------|
| Customer Schema | ✅ Complete | Name, phone, email, address, notes |
| Purchase Tracking | ✅ Complete | `totalPurchases`, `totalSpent`, `lastPurchaseDate` |
| Customer Segmentation | ✅ Complete | VIP (>50K), Regular, Inactive segments |
| Customer Search | ✅ Complete | Search by phone, name, email |
| Pagination | ✅ Complete | Paginated customer list with filters |

**Customer Schema Fields:**
```typescript
- shopId: ObjectId (multi-tenant)
- name: string (required)
- phone: string (required, indexed)
- email?: string
- address?: string
- totalPurchases: number (auto-updated)
- totalSpent: number (auto-updated)
- lastPurchaseDate?: Date
- segment: 'vip' | 'regular' | 'inactive'
- preferences: { favoriteProducts, preferredPaymentMethod, notes }
- contactPreferences: { sms, email }
```

#### 2. Loyalty Program (Backend)
**Location:** `apps/api/src/loyalty/`

| Feature | Status | Details |
|---------|--------|---------|
| Loyalty Program Schema | ✅ Complete | Configurable per shop |
| Loyalty Account Schema | ✅ Complete | Per-customer accounts |
| Points Earning | ✅ Complete | Based on purchase amount |
| Points Redemption | ✅ Complete | Redeem for discounts |
| Tier System | ✅ Complete | Bronze, Silver, Gold, Platinum |
| Birthday Bonus | ✅ Complete | Annual birthday points |
| Referral System | ✅ Complete | Referral codes & bonuses |
| Transaction History | ✅ Complete | Full audit trail |

**Loyalty Program Configuration:**
```typescript
- pointsPerKsh: number (e.g., 1 point per 100 KES)
- pointsExpiryDays: number (e.g., 365 days)
- tiers: [{ name, minPoints, discountPercentage, bonusPointsMultiplier }]
- enableBirthdayBonus: boolean
- birthdayBonusPoints: number
- enableReferralBonus: boolean
- referralBonusPoints: number
```

#### 3. Frontend Components
**Location:** `apps/web/src/`

| Component | Status | Details |
|-----------|--------|---------|
| Customer Admin Page | ✅ Exists | `/admin/customers` |
| Loyalty Admin Page | ✅ Exists | `/admin/loyalty` |
| Loyalty Dashboard | ✅ Exists | Customer loyalty display |
| Customer Quick Lookup | ✅ Exists | Search component |
| Customer Profile Card | ✅ Exists | Display component |

---

## 🔴 Gaps & Missing Features

### 1. **Sales-Loyalty Integration** (Critical Gap)
The sales flow does NOT automatically:
- Award loyalty points after a sale
- Link sales to customer loyalty accounts
- Apply tier-based discounts at checkout

**Current State:** Sales track `customerName` and `customerPhone` but don't link to `Customer` or `LoyaltyAccount` documents.

### 2. **Customer Selection at POS** (Missing)
- No customer lookup/selection during checkout
- No way to associate a sale with a registered customer
- No loyalty points display during checkout

### 3. **Points Redemption at Checkout** (Missing)
- Cannot redeem points during a sale
- No discount application from loyalty tier
- No points balance display at POS

### 4. **Customer Sales History** (Partial)
- Customer has `totalPurchases` and `totalSpent`
- But no direct link to view individual orders/receipts

### 5. **Automated Points Awarding** (Missing)
- Points must be manually awarded via API
- No automatic awarding after successful payment

### 6. **Customer Notifications** (Missing)
- No SMS/email for points earned
- No birthday reminders
- No tier upgrade notifications

---

## Recommended Implementation Plan

### Phase 1: Sales-Customer Integration (Priority: HIGH)

#### 1.1 Add Customer ID to Orders
```typescript
// Update Order Schema
@Prop({ type: Types.ObjectId, ref: 'Customer' })
customerId?: Types.ObjectId;
```

#### 1.2 Customer Selection at POS
- Add customer search/select component to checkout
- Show customer loyalty info (points, tier, discount)
- Quick customer registration for new customers

#### 1.3 Automatic Points Awarding
```typescript
// In SalesService.createOrder() - after successful payment
if (order.customerId && order.paymentStatus === 'paid') {
  await this.loyaltyService.earnPoints(
    shopId,
    order.customerId,
    order.totalAmount,
    `Purchase: Order #${order.orderNumber}`
  );
  await this.customersService.updatePurchaseStats(order.customerId, order.totalAmount);
}
```

### Phase 2: Points Redemption (Priority: HIGH)

#### 2.1 Redemption at Checkout
- Show available points and KES value
- Allow partial/full redemption
- Apply as discount to order

#### 2.2 Redemption Rules
```typescript
interface RedemptionRules {
  minPointsToRedeem: number;      // e.g., 100 points minimum
  pointsToKshRatio: number;       // e.g., 1 point = 1 KES
  maxRedemptionPercentage: number; // e.g., max 50% of order
}
```

### Phase 3: Enhanced Customer Experience (Priority: MEDIUM)

#### 3.1 Customer Portal (Optional)
- View points balance
- Transaction history
- Tier progress
- Referral link sharing

#### 3.2 Notifications
- SMS on points earned
- Birthday bonus reminder
- Tier upgrade celebration
- Points expiry warning

### Phase 4: Analytics & Reporting (Priority: MEDIUM)

#### 4.1 Customer Analytics
- Customer lifetime value (CLV)
- Purchase frequency
- Average order value by customer
- Churn prediction

#### 4.2 Loyalty Program Analytics
- Points liability (outstanding points)
- Redemption rate
- Tier distribution
- ROI of loyalty program

---

## Technical Implementation Details

### Database Changes Required

```typescript
// 1. Add customerId to Order schema
// File: apps/api/src/sales/schemas/order.schema.ts
@Prop({ type: Types.ObjectId, ref: 'Customer' })
customerId?: Types.ObjectId;

// 2. Add customerId to Receipt schema  
// File: apps/api/src/sales/schemas/receipt.schema.ts
@Prop({ type: Types.ObjectId, ref: 'Customer' })
customerId?: Types.ObjectId;

// 3. Add orderId reference to LoyaltyAccount transactions
// File: apps/api/src/loyalty/schemas/loyalty-account.schema.ts
@Prop({ type: Types.ObjectId, ref: 'Order' })
orderId?: Types.ObjectId;
```

### API Endpoints to Add/Modify

```typescript
// 1. Get customer with loyalty info
GET /customers/:id/loyalty

// 2. Apply loyalty discount to order
POST /sales/checkout/apply-loyalty
{
  orderId: string,
  customerId: string,
  pointsToRedeem: number
}

// 3. Quick customer registration at POS
POST /customers/quick-register
{
  name: string,
  phone: string,
  enrollInLoyalty: boolean
}
```

### Frontend Components to Add

```typescript
// 1. CustomerSelectModal - for POS checkout
// 2. LoyaltyPointsDisplay - show points at checkout
// 3. RedeemPointsModal - redeem points during checkout
// 4. CustomerQuickRegister - inline registration
```

---

## Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Customer selection at POS | High | Medium | P1 |
| Auto points awarding | High | Low | P1 |
| Points redemption at checkout | High | Medium | P1 |
| Customer-order linking | High | Low | P1 |
| SMS notifications | Medium | Medium | P2 |
| Customer portal | Medium | High | P3 |
| Advanced analytics | Low | High | P3 |

---

## Estimated Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1 | 1-2 weeks | Customer-sales integration, auto points |
| Phase 2 | 1 week | Points redemption at checkout |
| Phase 3 | 2-3 weeks | Notifications, customer portal |
| Phase 4 | 2 weeks | Analytics dashboard |

**Total Estimated Time:** 6-8 weeks for full implementation

---

## Next Steps

1. **Immediate:** Fix the order schema to include `customerId`
2. **Short-term:** Add customer selection to POS checkout flow
3. **Short-term:** Implement automatic points awarding after sale
4. **Medium-term:** Add points redemption at checkout
5. **Long-term:** Customer portal and advanced analytics

---

## Files to Modify

### Backend
- `apps/api/src/sales/schemas/order.schema.ts` - Add customerId
- `apps/api/src/sales/sales.service.ts` - Integrate loyalty points
- `apps/api/src/sales/dto/checkout.dto.ts` - Add customerId field
- `apps/api/src/loyalty/loyalty.service.ts` - Add order-based earning
- `apps/api/src/customers/customers.service.ts` - Quick registration

### Frontend
- `apps/web/src/app/pos/page.tsx` - Add customer selection
- `apps/web/src/components/checkout/` - New checkout components
- `apps/web/src/hooks/use-customers.ts` - Customer hooks (create if missing)
- `apps/web/src/hooks/use-loyalty.ts` - Loyalty API hooks (create if missing)

---

*Document created: Research phase complete. Ready for implementation.*
