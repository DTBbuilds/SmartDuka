# SmartDuka Subscription System Audit Report

**Date:** January 10, 2026  
**Status:** ✅ IMPLEMENTED  
**Purpose:** Comprehensive audit of subscription system to identify gaps and implement improvements including 14-day trial expiry, daily billing, and flexible payment options.

---

## Implementation Summary (Completed)

### Changes Made

#### Backend Changes

**1. Schema Updates:**
- `@e:\BUILds\SmartDuka\apps\api\src\subscriptions\schemas\subscription.schema.ts`
  - Added `DAILY` to `BillingCycle` enum
  - Added `numberOfDays` field for flexible day selection

- `@e:\BUILds\SmartDuka\apps\api\src\subscriptions\schemas\subscription-plan.schema.ts`
  - Added `dailyPrice` field (KES 99 for daily plan)

**2. DTO Updates:**
- `@e:\BUILds\SmartDuka\apps\api\src\subscriptions\dto\subscription.dto.ts`
  - Added `numberOfDays` to `CreateSubscriptionDto` (1-365 days)
  - Added `dailyPrice` to `SubscriptionPlanResponseDto`
  - Added `numberOfDays` and `isTrialExpired` to `SubscriptionResponseDto`

**3. Service Updates:**
- `@e:\BUILds\SmartDuka\apps\api\src\subscriptions\subscriptions.service.ts`
  - **Fixed trial expiry**: Changed from 100 years to actual 14 days
  - Added `calculateBillingDetails()` method for daily/monthly/annual pricing
  - Added `ensureDailyPlanExists()` method
  - Updated `createTrialSubscription()` to use `TRIAL_PERIOD_DAYS` (14)
  - Updated `createSubscription()` to handle daily billing with flexible days
  - Updated `processExpiringSubscriptions()` to handle trial expiry and daily renewals
  - Added daily plan to `seedPlans()` with Silver-level features

- `@e:\BUILds\SmartDuka\apps\api\src\subscriptions\subscription-enforcement.service.ts`
  - Updated `checkAccess()` to block expired trials
  - Updated `getWarnings()` with trial-specific countdown warnings

**4. Module Updates:**
- `@e:\BUILds\SmartDuka\apps\api\src\subscriptions\subscriptions.module.ts`
  - Added `ensureDailyPlanExists()` call on module init

#### Frontend Changes

**1. Type Updates:**
- `@e:\BUILds\SmartDuka\apps\web\src\hooks\use-subscription.ts`
  - Added `'daily'` to `BillingCycle` type
  - Added `dailyPrice` to `SubscriptionPlan` interface
  - Added `numberOfDays` and `isTrialExpired` to `Subscription` interface

**2. New Components:**
- `@e:\BUILds\SmartDuka\apps\web\src\components\daily-subscription-selector.tsx`
  - Day picker with quick options (1, 7, 14, 30 days)
  - Custom day input (1-365)
  - Price calculator showing total
  - Expiry date preview

**3. Updated Components:**
- `@e:\BUILds\SmartDuka\apps\web\src\components\subscription-blocked-overlay.tsx`
  - Added trial expiry handling with orange theme
  - Special messaging for expired trials

### New Daily Plan Details

| Property | Value |
|----------|-------|
| Code | `daily` |
| Price | KES 99/day |
| Max Shops | 5 |
| Max Employees | 15 |
| Max Products | 2,000 |
| Setup Fee | KES 0 |
| Color Theme | Orange |
| Badge | "Flexible" |

### Trial Period Changes

| Before | After |
|--------|-------|
| Trial expires in 100 years | Trial expires in 14 days |
| Status: ACTIVE | Status: TRIAL |
| No expiry enforcement | Blocked after 14 days |
| No countdown warnings | Warnings at 7, 3, 1 days |

---

---

## 1. Current System Overview

### 1.1 Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SUBSCRIPTION SYSTEM                               │
├─────────────────────────────────────────────────────────────────────┤
│  Schemas:                                                            │
│  ├── subscription.schema.ts      - Main subscription record          │
│  ├── subscription-plan.schema.ts - Plan definitions (trial→gold)     │
│  ├── subscription-invoice.schema.ts - Billing invoices               │
│  ├── payment-attempt.schema.ts   - Payment tracking                  │
│  └── activity-log.schema.ts      - Audit trail                       │
├─────────────────────────────────────────────────────────────────────┤
│  Services:                                                           │
│  ├── subscriptions.service.ts         - Core subscription logic      │
│  ├── subscription-mpesa.service.ts    - M-Pesa STK Push payments     │
│  ├── subscription-enforcement.service - Access level checking        │
│  ├── subscription-guard.service.ts    - Resource limit enforcement   │
│  ├── subscription-dunning.service.ts  - Payment reminders            │
│  ├── subscription-scheduler.service   - Cron jobs                    │
│  └── subscription-migration.service   - Data migration               │
├─────────────────────────────────────────────────────────────────────┤
│  Guards:                                                             │
│  └── subscription-status.guard.ts     - Route protection             │
├─────────────────────────────────────────────────────────────────────┤
│  Payment Infrastructure:                                             │
│  ├── M-Pesa STK Push (subscription-mpesa.service.ts)                │
│  ├── M-Pesa Manual/Send Money (same service)                        │
│  └── Stripe (stripe-webhook.controller.ts, stripe-subscription.service)│
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Current Subscription Plans

| Plan | Monthly (KES) | Annual (KES) | Shops | Employees | Products |
|------|---------------|--------------|-------|-----------|----------|
| Trial | 0 | 0 | 1 | 1 | 25 |
| Starter | 1,000 | 10,000 | 1 | 2 | 250 |
| Basic | 1,500 | 15,000 | 2 | 5 | 750 |
| Silver | 2,500 | 25,000 | 5 | 15 | 2,000 |
| Gold | 4,500 | 45,000 | 10 | 25 | 4,000 |

### 1.3 Current Billing Cycles

```typescript
// From subscription.schema.ts
export enum BillingCycle {
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
}
```

**⚠️ GAP: No DAILY billing cycle exists**

### 1.4 Current Subscription Statuses

```typescript
export enum SubscriptionStatus {
  PENDING_PAYMENT = 'pending_payment',
  TRIAL = 'trial',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}
```

---

## 2. Critical Gaps Identified

### 2.1 ❌ Trial Period NOT Enforced (14 Days)

**Current Behavior:**
```typescript
// subscriptions.service.ts line 33
const TRIAL_PERIOD_DAYS = 14;

// BUT in createTrialSubscription() line 460-472:
const farFuture = new Date();
farFuture.setFullYear(farFuture.getFullYear() + 100);
// Trial uses far-future date - NEVER EXPIRES!
```

**Problem:** Trial subscriptions are set to expire in 100 years, effectively making them permanent free accounts.

**Required Fix:**
- Trial should expire after 14 days
- After expiry, user must upgrade to a paid plan
- Block access after trial ends (not just warn)

### 2.2 ❌ No Daily Billing Cycle

**Current State:** Only `monthly` and `annual` cycles supported.

**Required:**
- Add `DAILY` billing cycle
- Daily price: KES 99/day
- Allow flexible day selection (1-30 days)
- Calculate total: `99 × numberOfDays`

### 2.3 ❌ No Flexible Day Selection for Payments

**Current State:** Users can only choose monthly or annual.

**Required:**
- Allow users to select number of days (e.g., 7, 10, 20, 30 days)
- Pre-calculate total amount
- Support all payment methods for any duration

### 2.4 ⚠️ Trial-to-Paid Transition Not Enforced

**Current Behavior:**
- Trial users have FULL access (same as ACTIVE)
- No countdown warning specific to trial
- No forced upgrade flow after trial ends

**Required:**
- Show trial countdown prominently
- Block access after 14 days
- Redirect to payment/upgrade page

---

## 3. Existing Infrastructure (What We Have)

### 3.1 ✅ Payment Methods Available

| Method | Status | Service |
|--------|--------|---------|
| M-Pesa STK Push | ✅ Working | `subscription-mpesa.service.ts` |
| M-Pesa Send Money (Manual) | ✅ Working | Same service |
| Stripe (Card/Bank) | ✅ Working | `stripe-webhook.controller.ts` |

### 3.2 ✅ Subscription Enforcement

- `SubscriptionStatusGuard` - Blocks routes based on status
- `SubscriptionEnforcementService` - Checks access levels
- `SubscriptionGuardService` - Enforces resource limits

### 3.3 ✅ Dunning System

- Expiry warnings at 7, 3, 1 days
- Grace period reminders
- Suspension notices
- Email notifications

### 3.4 ✅ Scheduled Jobs

```typescript
// subscription-scheduler.service.ts
@Cron('0 9 * * *')   // Daily at 9 AM - Process expiring subscriptions
@Cron('0 10 * * *')  // Daily at 10 AM - Send dunning notifications
@Cron('0 1 1 * *')   // Monthly 1st at 1 AM - Generate invoices
@Cron('0 2 * * 0')   // Weekly Sunday 2 AM - Sync usage counts
```

---

## 4. Implementation Plan

### Phase 1: Fix Trial Expiry (Critical)

#### 4.1.1 Update Trial Subscription Creation

```typescript
// subscriptions.service.ts - createTrialSubscription()
private async createTrialSubscription(shopId: string, trialPlan: SubscriptionPlanDocument) {
  const now = new Date();
  
  // Trial expires in 14 days (NOT 100 years!)
  const trialEndDate = new Date(now);
  trialEndDate.setDate(trialEndDate.getDate() + TRIAL_PERIOD_DAYS);
  
  const subscription = new this.subscriptionModel({
    shopId: new Types.ObjectId(shopId),
    planId: trialPlan._id,
    planCode: 'trial',
    billingCycle: BillingCycle.MONTHLY,
    status: SubscriptionStatus.TRIAL,  // Use TRIAL status, not ACTIVE
    startDate: now,
    currentPeriodStart: now,
    currentPeriodEnd: trialEndDate,    // 14 days from now
    trialEndDate: trialEndDate,
    isTrialUsed: true,
    currentPrice: 0,
    // ...
  });
}
```

#### 4.1.2 Update Enforcement for Trial Expiry

```typescript
// subscription-enforcement.service.ts - checkAccess()
case SubscriptionStatus.TRIAL:
  const now = new Date();
  const trialEnd = subscription.trialEndDate || subscription.currentPeriodEnd;
  
  if (now > trialEnd) {
    // Trial has expired - BLOCK access
    return {
      accessLevel: SubscriptionAccessLevel.BLOCKED,
      status: subscription.status,
      message: 'Your 14-day trial has ended. Please upgrade to continue using SmartDuka.',
      daysRemaining: 0,
      canMakePayment: true,
      requiresUpgrade: true,
    };
  }
  
  // Trial still active
  const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  return {
    accessLevel: SubscriptionAccessLevel.FULL,
    status: subscription.status,
    message: `Trial period - ${daysRemaining} days remaining`,
    daysRemaining,
    canMakePayment: false,
    isTrialExpiringSoon: daysRemaining <= 3,
  };
```

#### 4.1.3 Add Trial Expiry Processing to Scheduler

```typescript
// subscription-scheduler.service.ts
async processExpiringSubscriptions() {
  // ... existing code ...
  
  // Process expired trials
  const expiredTrials = await this.subscriptionModel.find({
    status: SubscriptionStatus.TRIAL,
    $or: [
      { trialEndDate: { $lte: now } },
      { currentPeriodEnd: { $lte: now } },
    ],
  });

  for (const subscription of expiredTrials) {
    subscription.status = SubscriptionStatus.EXPIRED;
    await subscription.save();
    this.logger.log(`Trial expired for shop ${subscription.shopId}`);
    // Send notification to upgrade
  }
}
```

### Phase 2: Add Daily Billing Cycle

#### 4.2.1 Update BillingCycle Enum

```typescript
// subscription.schema.ts
export enum BillingCycle {
  DAILY = 'daily',
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
}
```

#### 4.2.2 Add Daily Price to Plan Schema

```typescript
// subscription-plan.schema.ts
@Schema({ timestamps: true })
export class SubscriptionPlan {
  // ... existing fields ...
  
  @Prop({ required: true })
  dailyPrice: number; // Daily subscription price (e.g., 99 KES)
  
  @Prop({ required: true })
  monthlyPrice: number;
  
  @Prop({ required: true })
  annualPrice: number;
}
```

#### 4.2.3 Update Plan Seeding

```typescript
// subscriptions.service.ts - seedPlans()
const plans = [
  {
    code: 'starter',
    name: 'Starter',
    dailyPrice: 99,      // KES 99/day
    monthlyPrice: 1000,  // KES 1,000/month (~33/day)
    annualPrice: 10000,  // KES 10,000/year (~27/day)
    // ...
  },
  // ... other plans with dailyPrice
];
```

#### 4.2.4 Add Flexible Day Selection DTO

```typescript
// subscription.dto.ts
export class CreateSubscriptionDto {
  @IsString()
  planCode: string;

  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle = BillingCycle.MONTHLY;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(365)
  numberOfDays?: number; // For daily billing - how many days to pay for

  // ... existing fields
}
```

#### 4.2.5 Calculate Daily Subscription Price

```typescript
// subscriptions.service.ts
private calculateSubscriptionPrice(
  plan: SubscriptionPlanDocument,
  billingCycle: BillingCycle,
  numberOfDays?: number,
): { price: number; periodEnd: Date } {
  const now = new Date();
  const periodEnd = new Date(now);
  let price: number;

  switch (billingCycle) {
    case BillingCycle.DAILY:
      const days = numberOfDays || 1;
      price = plan.dailyPrice * days;
      periodEnd.setDate(periodEnd.getDate() + days);
      break;
    case BillingCycle.MONTHLY:
      price = plan.monthlyPrice;
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      break;
    case BillingCycle.ANNUAL:
      price = plan.annualPrice;
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      break;
  }

  return { price, periodEnd };
}
```

### Phase 3: Update Payment Flow

#### 4.3.1 Update Invoice Creation for Daily Billing

```typescript
// subscriptions.service.ts
async createSubscription(shopId: string, dto: CreateSubscriptionDto) {
  const plan = await this.planModel.findOne({ code: dto.planCode });
  
  const { price, periodEnd } = this.calculateSubscriptionPrice(
    plan,
    dto.billingCycle,
    dto.numberOfDays,
  );
  
  // Create subscription with calculated values
  const subscription = new this.subscriptionModel({
    // ...
    billingCycle: dto.billingCycle,
    currentPeriodEnd: periodEnd,
    currentPrice: price,
    metadata: {
      numberOfDays: dto.numberOfDays, // Store for reference
    },
  });
  
  // Create invoice
  await this.createInvoice(
    shopId,
    subscription._id.toString(),
    InvoiceType.SUBSCRIPTION,
    `${plan.name} Plan - ${dto.numberOfDays || (dto.billingCycle === 'monthly' ? 30 : 365)} days`,
    price,
    now,
    periodEnd,
  );
}
```

#### 4.3.2 Frontend Payment Selection UI

```typescript
// New component: DailySubscriptionSelector.tsx
interface DailySubscriptionSelectorProps {
  plan: SubscriptionPlan;
  onSelect: (days: number, total: number) => void;
}

// Quick select options
const QUICK_OPTIONS = [
  { days: 1, label: '1 Day' },
  { days: 7, label: '1 Week' },
  { days: 14, label: '2 Weeks' },
  { days: 30, label: '1 Month' },
];

// Allow custom day input
// Show calculated total: KES 99 × {days} = KES {total}
```

---

## 5. Database Migration Required

### 5.1 Update Existing Trial Subscriptions

```typescript
// Migration script
async function migrateTrialSubscriptions() {
  const now = new Date();
  
  // Find all trial subscriptions with far-future dates
  const trials = await subscriptionModel.find({
    planCode: 'trial',
    currentPeriodEnd: { $gt: new Date('2100-01-01') },
  });
  
  for (const trial of trials) {
    // Calculate proper trial end date from creation
    const createdAt = trial.createdAt || trial.startDate;
    const trialEndDate = new Date(createdAt);
    trialEndDate.setDate(trialEndDate.getDate() + 14);
    
    // If trial should have already expired
    if (trialEndDate < now) {
      trial.status = SubscriptionStatus.EXPIRED;
      trial.currentPeriodEnd = trialEndDate;
    } else {
      trial.currentPeriodEnd = trialEndDate;
    }
    
    trial.trialEndDate = trialEndDate;
    await trial.save();
  }
}
```

### 5.2 Add dailyPrice to Existing Plans

```typescript
// Migration script
async function addDailyPriceToPlans() {
  const updates = [
    { code: 'trial', dailyPrice: 0 },
    { code: 'starter', dailyPrice: 99 },
    { code: 'basic', dailyPrice: 149 },
    { code: 'silver', dailyPrice: 199 },
    { code: 'gold', dailyPrice: 299 },
  ];
  
  for (const update of updates) {
    await planModel.updateOne(
      { code: update.code },
      { $set: { dailyPrice: update.dailyPrice } },
    );
  }
}
```

---

## 6. Frontend Changes Required

### 6.1 Subscription Page Updates

| Component | Change Required |
|-----------|-----------------|
| `use-subscription.ts` | Add `numberOfDays` to types |
| Plan selection UI | Add daily option with day selector |
| Payment modal | Show daily/weekly/monthly/annual options |
| Trial banner | Show countdown with upgrade CTA |
| Blocked overlay | Handle trial expiry differently |

### 6.2 New Components Needed

1. **DailySubscriptionSelector** - Day picker with price calculator
2. **TrialCountdownBanner** - Prominent trial days remaining
3. **TrialExpiredOverlay** - Block access, show upgrade options

---

## 7. API Endpoints to Update

| Endpoint | Change |
|----------|--------|
| `POST /subscriptions` | Accept `numberOfDays` parameter |
| `GET /subscriptions/plans` | Return `dailyPrice` |
| `POST /subscriptions/payments/mpesa/initiate` | Handle daily billing |
| `GET /subscriptions/current` | Return trial expiry info |

---

## 8. Testing Checklist

- [ ] Trial expires after exactly 14 days
- [ ] Expired trial blocks access
- [ ] Daily billing calculates correctly (99 × days)
- [ ] M-Pesa STK works for daily payments
- [ ] Manual payment works for daily payments
- [ ] Stripe works for daily payments
- [ ] Invoice shows correct period (e.g., "7 days")
- [ ] Subscription extends by correct number of days
- [ ] Renewal works for daily subscriptions
- [ ] Dunning notifications work for daily subscriptions

---

## 9. Recommended Daily Pricing Structure

| Plan | Daily (KES) | Weekly (×7) | Bi-Weekly (×14) | Monthly |
|------|-------------|-------------|-----------------|---------|
| Starter | 99 | 693 | 1,386 | 1,000* |
| Basic | 149 | 1,043 | 2,086 | 1,500* |
| Silver | 199 | 1,393 | 2,786 | 2,500* |
| Gold | 299 | 2,093 | 4,186 | 4,500* |

*Monthly is cheaper than 30 daily payments - incentivizes longer commitments

---

## 10. Implementation Priority

### High Priority (Do First)
1. ✅ Fix trial expiry (14 days, not 100 years)
2. ✅ Block access after trial expires
3. ✅ Add trial countdown UI

### Medium Priority (Do Second)
4. Add `DAILY` billing cycle to enum
5. Add `dailyPrice` to plan schema
6. Update subscription creation for daily billing
7. Update payment flow for flexible days

### Lower Priority (Do Third)
8. Frontend day selector component
9. Daily billing renewal logic
10. Daily-specific dunning notifications

---

## 11. Summary

### What Works Well ✅
- M-Pesa STK Push integration
- Manual payment verification
- Stripe webhook handling
- Subscription status guards
- Resource limit enforcement
- Dunning/reminder system

### What Needs Fixing ❌
- Trial subscriptions never expire (100-year bug)
- No daily billing option
- No flexible day selection
- Trial-to-paid transition not enforced

### Estimated Implementation Time
- Phase 1 (Trial Fix): 2-3 hours
- Phase 2 (Daily Billing): 4-6 hours
- Phase 3 (Payment Flow): 3-4 hours
- Testing: 2-3 hours

**Total: ~12-16 hours of development**

---

*Report generated by SmartDuka Development Team*
