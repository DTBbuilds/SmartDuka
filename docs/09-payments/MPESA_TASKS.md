# M-Pesa Implementation Tasks

## Quick Reference

**Priority Legend:**
- 🔴 Critical - Must complete for MVP
- 🟠 High - Important for reliability
- 🟡 Medium - Nice to have for MVP
- 🟢 Low - Post-MVP enhancement

---

## Phase 1: Backend Foundation

### 1.1 M-Pesa Transaction Schema
- [ ] 🔴 Create `mpesa-transaction.schema.ts` with all required fields
- [ ] 🔴 Add idempotencyKey unique index
- [ ] 🔴 Add status enum with state machine states
- [ ] 🔴 Add shopId for multi-tenant isolation
- [ ] 🟠 Add TTL index for auto-expiry
- [ ] 🟠 Add compound indexes for query performance

### 1.2 M-Pesa DTOs
- [ ] 🔴 Create `InitiateMpesaPaymentDto` with validation
- [ ] 🔴 Create `MpesaCallbackDto` for callback parsing
- [ ] 🔴 Create `MpesaStatusResponseDto`
- [ ] 🟠 Add phone number validation decorator

### 1.3 M-Pesa Service
- [ ] 🔴 Create `mpesa.service.ts` with idempotency logic
- [ ] 🔴 Implement `initiatePayment()` with idempotency check
- [ ] 🔴 Implement `processCallback()` with state transitions
- [ ] 🔴 Implement `getTransactionStatus()`
- [ ] 🟠 Implement `retryPayment()` with backoff
- [ ] 🟠 Implement `cancelPayment()`
- [ ] 🟡 Implement `reconcilePendingTransactions()`

### 1.4 Enhanced Daraja Service
- [ ] 🔴 Add callback signature validation
- [ ] 🔴 Add proper error code handling
- [ ] 🟠 Add connection timeout handling
- [ ] 🟠 Add retry logic for transient errors
- [ ] 🟡 Add request/response logging

### 1.5 M-Pesa Controller
- [ ] 🔴 Create `POST /payments/mpesa/initiate` endpoint
- [ ] 🔴 Create `POST /payments/mpesa/callback` endpoint (public)
- [ ] 🔴 Create `GET /payments/mpesa/status/:id` endpoint
- [ ] 🟠 Create `POST /payments/mpesa/retry/:id` endpoint
- [ ] 🟠 Create `POST /payments/mpesa/cancel/:id` endpoint
- [ ] 🟡 Create `GET /payments/mpesa/pending` endpoint

### 1.6 Integration with Orders
- [ ] 🔴 Update order payment status on callback
- [ ] 🔴 Create PaymentTransaction record on success
- [ ] 🟠 Handle partial payments
- [ ] 🟡 Support split payments (M-Pesa + Cash)

---

## Phase 2: Frontend Integration

### 2.1 M-Pesa Payment Hook
- [ ] 🔴 Create `use-mpesa-payment.ts` hook
- [ ] 🔴 Implement `initiatePayment()` function
- [ ] 🔴 Implement status polling with cleanup
- [ ] 🔴 Handle timeout and expiry
- [ ] 🟠 Add WebSocket support for real-time updates

### 2.2 M-Pesa Payment Flow Component
- [ ] 🔴 Create `mpesa-payment-flow.tsx` component
- [ ] 🔴 Phone number input with validation
- [ ] 🔴 STK push waiting screen with countdown
- [ ] 🔴 Success screen with receipt number
- [ ] 🔴 Error screen with retry option
- [ ] 🟠 Add phone number formatting (0712 → 254712)
- [ ] 🟡 Remember last used phone number

### 2.3 Payment Method Modal Updates
- [ ] 🔴 Add M-Pesa phone input step
- [ ] 🔴 Integrate MpesaPaymentFlow component
- [ ] 🔴 Handle M-Pesa payment completion
- [ ] 🟠 Add loading states and animations

### 2.4 POS Page Integration
- [ ] 🔴 Handle M-Pesa checkout flow
- [ ] 🔴 Update cart/order on payment success
- [ ] 🔴 Show receipt after M-Pesa payment
- [ ] 🟠 Handle payment timeout gracefully

---

## Phase 3: Security & Reliability

### 3.1 Input Validation
- [ ] 🔴 Validate Kenyan phone format (07XX, 01XX, 254XX)
- [ ] 🔴 Validate amount range (1 - 150,000 KES)
- [ ] 🔴 Sanitize all user inputs
- [ ] 🟠 Rate limit STK push requests

### 3.2 Callback Security
- [ ] 🔴 Validate callback signature
- [ ] 🟠 Whitelist Safaricom callback IPs
- [ ] 🟠 Log all callback attempts
- [ ] 🟡 Alert on suspicious callback patterns

### 3.3 Error Handling
- [ ] 🔴 Map M-Pesa error codes to user messages
- [ ] 🔴 Handle network timeouts gracefully
- [ ] 🟠 Implement circuit breaker for Daraja API
- [ ] 🟡 Add fallback to manual payment entry

### 3.4 Audit & Logging
- [ ] 🔴 Log all payment initiations
- [ ] 🔴 Log all callbacks received
- [ ] 🔴 Log all status changes
- [ ] 🟠 Create audit trail for compliance

---

## Phase 4: Testing

### 4.1 Unit Tests
- [ ] 🔴 Test idempotency logic
- [ ] 🔴 Test phone number validation
- [ ] 🔴 Test state machine transitions
- [ ] 🔴 Test callback parsing
- [ ] 🟠 Test error handling

### 4.2 Integration Tests
- [ ] 🔴 Test full STK push flow (sandbox)
- [ ] 🔴 Test callback processing
- [ ] 🔴 Test multi-tenant isolation
- [ ] 🟠 Test concurrent payments
- [ ] 🟠 Test timeout handling

### 4.3 E2E Tests
- [ ] 🟠 Test complete checkout with M-Pesa
- [ ] 🟠 Test payment retry flow
- [ ] 🟡 Test cancellation flow

---

## Phase 5: Deployment & Monitoring

### 5.1 Environment Setup
- [ ] 🔴 Configure sandbox credentials
- [ ] 🔴 Set up callback URL (ngrok for dev)
- [ ] 🟠 Configure production credentials
- [ ] 🟠 Set up production callback URL

### 5.2 Monitoring
- [ ] 🟠 Add payment success/failure metrics
- [ ] 🟠 Add callback latency monitoring
- [ ] 🟡 Set up alerts for failed payments
- [ ] 🟡 Create payment dashboard

---

## Current Progress

### Completed
- [x] Research M-Pesa best practices
- [x] Design multi-tenant architecture
- [x] Create implementation plan
- [x] Define database schema
- [x] Define API endpoints
- [x] Create `mpesa-transaction.schema.ts` with all required fields
- [x] Create `mpesa.dto.ts` with validation and helpers
- [x] Create `mpesa.service.ts` with idempotency logic
- [x] Create `mpesa.controller.ts` with all endpoints
- [x] Update `payments.module.ts` to include M-Pesa components
- [x] Create `use-mpesa-payment.ts` hook for frontend
- [x] Create `mpesa-payment-flow.tsx` component

### In Progress
- [ ] Integration testing with sandbox
- [ ] Update POS page to use M-Pesa flow

### Blocked
- None

---

## Notes

### Safaricom Sandbox Credentials
```
Shortcode: 174379
Passkey: bfb279f9aa9bdbcf158e97dd71a503b6e
Consumer Key: (from Daraja portal)
Consumer Secret: (from Daraja portal)
```

### Test Phone Numbers
- Any number starting with 254 works in sandbox
- Example: 254712345678

### Callback URL Setup (Development)
```bash
# Using ngrok
ngrok http 5000
# Set MPESA_CALLBACK_URL=https://xxxx.ngrok.io/payments/mpesa/callback
```

---

## Quick Start Commands

```bash
# Start API in development
cd apps/api && pnpm dev

# Start web in development
cd apps/web && pnpm dev

# Run tests
pnpm test

# Test M-Pesa sandbox
curl -X POST http://localhost:5000/payments/mpesa/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"orderId": "test123", "phoneNumber": "0712345678", "amount": 100}'
```
