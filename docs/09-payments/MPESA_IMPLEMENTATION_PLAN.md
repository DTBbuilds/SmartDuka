# M-Pesa STK Push Implementation Plan for SmartDuka POS

## Executive Summary

This document outlines a comprehensive, production-ready M-Pesa STK Push implementation for SmartDuka's multi-tenant POS system. The implementation prioritizes **transaction safety**, **idempotency**, **multi-tenant isolation**, and **robust error handling**.

---

## Current State Analysis

### ✅ What's Already Implemented

| Component | Status | Location |
|-----------|--------|----------|
| DarajaService | ✅ Basic | `apps/api/src/payments/daraja.service.ts` |
| STK Push Initiation | ✅ Basic | `initiateStkPush()` method |
| Callback Handler | ⚠️ Incomplete | `handleCallback()` - TODOs present |
| STK Status Query | ✅ Basic | `queryStkStatus()` method |
| Payment Transaction Schema | ✅ Good | `payment-transaction.schema.ts` |
| Frontend Payment Modal | ✅ Good | `payment-method-modal.tsx` |
| Multi-tenant Isolation | ⚠️ Partial | shopId filtering exists |

### ❌ Critical Gaps Identified

1. **No Idempotency Keys** - Duplicate STK pushes possible
2. **No Transaction State Machine** - Payment states not enforced
3. **Callback Not Integrated** - Order/payment not updated on callback
4. **No Multi-Tenant M-Pesa Config** - Single shortcode for all tenants
5. **No Phone Number Validation** - Frontend doesn't prompt for phone
6. **No Retry/Reconciliation** - Failed callbacks not handled
7. **No Webhook Security** - Callback signature not validated
8. **No Payment Timeout Handling** - Pending payments can hang forever

---

## Architecture Design

### Multi-Tenant M-Pesa Strategy

For MVP, we'll use a **Single Shortcode with Account Reference** approach:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SmartDuka M-Pesa Architecture                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │  Shop A  │    │  Shop B  │    │  Shop C  │   (Tenants)      │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘                  │
│       │               │               │                         │
│       └───────────────┼───────────────┘                         │
│                       ▼                                         │
│              ┌────────────────┐                                 │
│              │ SmartDuka API  │                                 │
│              │ (Multi-tenant) │                                 │
│              └───────┬────────┘                                 │
│                      │                                          │
│                      ▼                                          │
│              ┌────────────────┐                                 │
│              │  Single M-Pesa │                                 │
│              │   Shortcode    │                                 │
│              │   (Platform)   │                                 │
│              └───────┬────────┘                                 │
│                      │                                          │
│                      ▼                                          │
│         AccountReference: "SHOP-{shopId}-ORD-{orderId}"         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why Single Shortcode?**
- Faster MVP deployment
- No per-tenant Safaricom registration
- Centralized callback handling
- Easy reconciliation
- Future: Support tenant-specific shortcodes for enterprise

### Payment State Machine

```
┌─────────────┐
│   CREATED   │ ──► Initial state when STK push initiated
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   PENDING   │ ──► STK push sent, waiting for user action
└──────┬──────┘
       │
       ├──────────────────┬──────────────────┐
       ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  COMPLETED  │    │   FAILED    │    │   EXPIRED   │
└─────────────┘    └─────────────┘    └─────────────┘
       │                  │
       ▼                  ▼
┌─────────────┐    ┌─────────────┐
│  REVERSED   │    │  RETRYABLE  │
└─────────────┘    └─────────────┘
```

---

## Implementation Checklist

### Phase 1: Backend Foundation (Priority: Critical)

#### 1.1 Enhanced M-Pesa Transaction Schema
- [ ] Add `idempotencyKey` field (unique, indexed)
- [ ] Add `status` enum with state machine states
- [ ] Add `checkoutRequestId` and `merchantRequestId`
- [ ] Add `expiresAt` for timeout handling
- [ ] Add `retryCount` and `maxRetries`
- [ ] Add `shopId` for multi-tenant isolation
- [ ] Add `orderId` reference
- [ ] Add `callbackReceivedAt` timestamp
- [ ] Add `mpesaResultCode` and `mpesaResultDesc`

#### 1.2 Idempotency Implementation
- [ ] Generate idempotency key: `{shopId}-{orderId}-{timestamp}`
- [ ] Check for existing pending transaction before STK push
- [ ] Return existing transaction if idempotency key matches
- [ ] Implement 24-hour idempotency window

#### 1.3 Enhanced DarajaService
- [ ] Add transaction creation before STK push
- [ ] Implement proper error handling with specific error codes
- [ ] Add callback signature validation
- [ ] Add transaction status polling fallback
- [ ] Implement exponential backoff for retries

#### 1.4 Callback Handler Enhancement
- [ ] Validate callback signature using passkey
- [ ] Update M-Pesa transaction status
- [ ] Update order payment status
- [ ] Create payment transaction record
- [ ] Emit WebSocket event for real-time UI update
- [ ] Handle duplicate callbacks idempotently

#### 1.5 Payment Reconciliation Service
- [ ] Scheduled job to check pending transactions
- [ ] Query M-Pesa for stuck transactions
- [ ] Auto-expire transactions after timeout (5 minutes)
- [ ] Generate reconciliation reports

### Phase 2: Frontend Integration (Priority: High)

#### 2.1 M-Pesa Payment Flow Component
- [ ] Phone number input with Kenyan format validation
- [ ] Real-time payment status display
- [ ] Countdown timer for STK push expiry
- [ ] Retry button for failed payments
- [ ] Cancel payment option

#### 2.2 Payment Method Modal Enhancement
- [ ] Add M-Pesa phone input step
- [ ] Show STK push sent confirmation
- [ ] Poll for payment status
- [ ] Handle timeout gracefully
- [ ] Success/failure animations

#### 2.3 WebSocket Integration
- [ ] Connect to payment status channel
- [ ] Real-time status updates
- [ ] Auto-complete checkout on success

### Phase 3: Security & Reliability (Priority: High)

#### 3.1 Security Measures
- [ ] Callback IP whitelist (Safaricom IPs)
- [ ] Callback signature validation
- [ ] Rate limiting on STK push endpoint
- [ ] Input sanitization for phone numbers
- [ ] Audit logging for all payment actions

#### 3.2 Error Handling
- [ ] Specific error codes for different failure modes
- [ ] User-friendly error messages
- [ ] Automatic retry for transient errors
- [ ] Manual retry option for permanent errors

#### 3.3 Monitoring & Alerts
- [ ] Payment success/failure metrics
- [ ] Callback latency monitoring
- [ ] Failed payment alerts
- [ ] Daily reconciliation reports

### Phase 4: Testing & Validation (Priority: Critical)

#### 4.1 Unit Tests
- [ ] DarajaService methods
- [ ] Idempotency logic
- [ ] State machine transitions
- [ ] Callback validation

#### 4.2 Integration Tests
- [ ] Full STK push flow (sandbox)
- [ ] Callback processing
- [ ] Multi-tenant isolation
- [ ] Concurrent payment handling

#### 4.3 E2E Tests
- [ ] Complete checkout with M-Pesa
- [ ] Payment timeout handling
- [ ] Retry flow
- [ ] Cancellation flow

---

## Database Schema Updates

### New: MpesaTransaction Schema

```typescript
@Schema({ timestamps: true })
export class MpesaTransaction {
  // Multi-tenant isolation
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop', index: true })
  shopId: Types.ObjectId;

  // Order reference
  @Prop({ required: true, type: Types.ObjectId, ref: 'Order' })
  orderId: Types.ObjectId;

  @Prop({ required: true })
  orderNumber: string;

  // Idempotency
  @Prop({ required: true, unique: true, index: true })
  idempotencyKey: string;

  // M-Pesa identifiers
  @Prop({ required: false, index: true })
  checkoutRequestId?: string;

  @Prop({ required: false })
  merchantRequestId?: string;

  @Prop({ required: false, index: true })
  mpesaReceiptNumber?: string;

  // Transaction details
  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  accountReference: string;

  // State machine
  @Prop({ 
    required: true, 
    enum: ['created', 'pending', 'completed', 'failed', 'expired', 'reversed'],
    default: 'created',
    index: true
  })
  status: string;

  // M-Pesa response
  @Prop({ required: false })
  mpesaResultCode?: number;

  @Prop({ required: false })
  mpesaResultDesc?: string;

  // Timing
  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ required: false })
  callbackReceivedAt?: Date;

  @Prop({ required: false })
  completedAt?: Date;

  // Retry handling
  @Prop({ default: 0 })
  retryCount: number;

  @Prop({ default: 3 })
  maxRetries: number;

  // Cashier info
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  cashierId: Types.ObjectId;

  @Prop({ required: true })
  cashierName: string;

  // Metadata
  @Prop({ type: Object })
  metadata?: Record<string, any>;
}
```

### Indexes for Performance

```typescript
MpesaTransactionSchema.index({ shopId: 1, status: 1 });
MpesaTransactionSchema.index({ shopId: 1, createdAt: -1 });
MpesaTransactionSchema.index({ checkoutRequestId: 1 });
MpesaTransactionSchema.index({ mpesaReceiptNumber: 1 });
MpesaTransactionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
```

---

## API Endpoints

### Enhanced Payment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments/mpesa/initiate` | Initiate STK push with idempotency |
| GET | `/payments/mpesa/status/:id` | Get transaction status |
| POST | `/payments/mpesa/callback` | M-Pesa callback (public) |
| POST | `/payments/mpesa/retry/:id` | Retry failed transaction |
| POST | `/payments/mpesa/cancel/:id` | Cancel pending transaction |
| GET | `/payments/mpesa/pending` | List pending transactions |

### Request/Response Examples

#### Initiate STK Push

**Request:**
```json
POST /payments/mpesa/initiate
{
  "orderId": "order_123",
  "phoneNumber": "0712345678",
  "amount": 1500,
  "idempotencyKey": "shop123-order123-1701234567890"
}
```

**Response (Success):**
```json
{
  "success": true,
  "transactionId": "mpesa_txn_abc123",
  "checkoutRequestId": "ws_CO_123456789",
  "status": "pending",
  "expiresAt": "2024-01-15T10:05:00Z",
  "message": "STK push sent to 254712345678"
}
```

**Response (Idempotent - Existing Transaction):**
```json
{
  "success": true,
  "transactionId": "mpesa_txn_abc123",
  "checkoutRequestId": "ws_CO_123456789",
  "status": "pending",
  "isIdempotent": true,
  "message": "Existing transaction found"
}
```

---

## Frontend Flow

### M-Pesa Payment User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                    M-Pesa Payment Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User clicks "Checkout" → Payment Method Modal opens         │
│                                                                 │
│  2. User selects "M-Pesa" → Phone Input Screen                  │
│     ┌─────────────────────────────────────┐                     │
│     │  Enter M-Pesa Phone Number          │                     │
│     │  ┌─────────────────────────────┐    │                     │
│     │  │ 0712 345 678                │    │                     │
│     │  └─────────────────────────────┘    │                     │
│     │  Total: Ksh 1,500                   │                     │
│     │  [Send STK Push]                    │                     │
│     └─────────────────────────────────────┘                     │
│                                                                 │
│  3. STK Push Sent → Waiting Screen                              │
│     ┌─────────────────────────────────────┐                     │
│     │  📱 Check your phone                │                     │
│     │                                     │                     │
│     │  STK push sent to 0712***678        │                     │
│     │  Enter your M-Pesa PIN to complete  │                     │
│     │                                     │                     │
│     │  ⏱️ Expires in: 4:32                │                     │
│     │                                     │                     │
│     │  [Cancel] [Resend]                  │                     │
│     └─────────────────────────────────────┘                     │
│                                                                 │
│  4a. Payment Success → Success Screen                           │
│     ┌─────────────────────────────────────┐                     │
│     │  ✅ Payment Successful!             │                     │
│     │                                     │                     │
│     │  Receipt: LHG31AA5TX4               │                     │
│     │  Amount: Ksh 1,500                  │                     │
│     │                                     │                     │
│     │  [Print Receipt] [New Sale]         │                     │
│     └─────────────────────────────────────┘                     │
│                                                                 │
│  4b. Payment Failed → Error Screen                              │
│     ┌─────────────────────────────────────┐                     │
│     │  ❌ Payment Failed                  │                     │
│     │                                     │                     │
│     │  Reason: Insufficient balance       │                     │
│     │                                     │                     │
│     │  [Try Again] [Use Cash]             │                     │
│     └─────────────────────────────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Error Codes & Handling

### M-Pesa Result Codes

| Code | Description | Action |
|------|-------------|--------|
| 0 | Success | Complete transaction |
| 1 | Insufficient balance | Show error, suggest cash |
| 1032 | Request cancelled by user | Allow retry |
| 1037 | DS timeout | Auto-retry once |
| 2001 | Wrong PIN | Allow retry (max 3) |
| 17 | System busy | Auto-retry with backoff |

### SmartDuka Error Codes

| Code | Description | User Message |
|------|-------------|--------------|
| MPESA_001 | Invalid phone number | Please enter a valid Kenyan phone number |
| MPESA_002 | Amount too low | Minimum amount is Ksh 1 |
| MPESA_003 | Amount too high | Maximum amount is Ksh 150,000 |
| MPESA_004 | STK push failed | Unable to send payment request. Please try again |
| MPESA_005 | Transaction expired | Payment request expired. Please try again |
| MPESA_006 | Duplicate transaction | A payment is already in progress |
| MPESA_007 | Callback validation failed | Payment verification failed |

---

## Security Checklist

### ✅ Must Have (MVP)

- [ ] Phone number format validation (254XXXXXXXXX)
- [ ] Amount validation (1 - 150,000 KES)
- [ ] Idempotency key enforcement
- [ ] Callback signature validation
- [ ] Multi-tenant data isolation
- [ ] Audit logging

### 🔒 Should Have (Post-MVP)

- [ ] Callback IP whitelist
- [ ] Rate limiting (10 STK pushes per minute per shop)
- [ ] Fraud detection (unusual patterns)
- [ ] PCI-DSS compliance review

---

## Performance Considerations

### Expected Latencies

| Operation | Expected | Max Acceptable |
|-----------|----------|----------------|
| STK Push Initiation | 1-3s | 5s |
| Callback Processing | 100ms | 500ms |
| Status Query | 500ms | 2s |
| Database Write | 50ms | 200ms |

### Scaling Strategy

1. **Callback Queue**: Use Redis/Bull for callback processing
2. **Database**: Index optimization for high-volume queries
3. **Caching**: Cache shop M-Pesa config in Redis
4. **Connection Pooling**: Reuse HTTP connections to Safaricom

---

## Implementation Timeline

### Week 1: Backend Foundation
- Day 1-2: Schema updates, idempotency implementation
- Day 3-4: Enhanced DarajaService, callback handler
- Day 5: Reconciliation service, testing

### Week 2: Frontend & Integration
- Day 1-2: M-Pesa payment flow component
- Day 3: WebSocket integration
- Day 4-5: E2E testing, bug fixes

### Week 3: Polish & Deploy
- Day 1-2: Security hardening
- Day 3: Performance optimization
- Day 4-5: Production deployment, monitoring setup

---

## Files to Create/Modify

### New Files
1. `apps/api/src/payments/schemas/mpesa-transaction.schema.ts`
2. `apps/api/src/payments/services/mpesa.service.ts`
3. `apps/api/src/payments/dto/mpesa.dto.ts`
4. `apps/api/src/payments/mpesa.controller.ts`
5. `apps/web/src/components/mpesa-payment-flow.tsx`
6. `apps/web/src/hooks/use-mpesa-payment.ts`

### Files to Modify
1. `apps/api/src/payments/payments.module.ts` - Add new services
2. `apps/api/src/payments/daraja.service.ts` - Enhance with idempotency
3. `apps/api/src/payments/payments.service.ts` - Integrate with orders
4. `apps/web/src/components/payment-method-modal.tsx` - Add M-Pesa flow
5. `apps/web/src/app/pos/page.tsx` - Handle M-Pesa checkout

---

## Success Metrics

### MVP Success Criteria
- [ ] 95%+ STK push success rate
- [ ] <5s average payment completion time
- [ ] Zero duplicate payments
- [ ] 100% callback processing rate
- [ ] Multi-tenant isolation verified

### Post-MVP Goals
- [ ] Support tenant-specific shortcodes
- [ ] Real-time dashboard for payment monitoring
- [ ] Automated reconciliation reports
- [ ] Mobile app deep linking for M-Pesa

---

## References

- [Safaricom Daraja API Documentation](https://developer.safaricom.co.ke/)
- [M-Pesa STK Push Guide](https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate)
- [Idempotency Best Practices](https://www.moderntreasury.com/journal/why-idempotency-matters-in-payments)
- [Payment State Machines](https://www.cockroachlabs.com/blog/idempotency-in-finance/)
