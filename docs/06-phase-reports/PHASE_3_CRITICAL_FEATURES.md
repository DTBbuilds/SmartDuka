# Phase 3: Critical Features Implementation Roadmap

**Date**: Nov 8, 2025
**Status**: Ready for Implementation
**Scope**: 5 Critical Features (51 hours)
**Timeline**: 1-2 weeks

---

## PRIORITY 1: PAYMENT PROCESSING (10 hours) 🔴 CRITICAL

### Current State
- M-Pesa stub only
- No order updates on payment
- No reconciliation
- No error recovery

### What Needs to Be Done

#### 1.1 Complete M-Pesa Integration (4 hours)
```typescript
// apps/api/src/payments/payments.service.ts
// TODO: Implement handleCallback properly
async handleCallback(payload: CallbackPayload) {
  // 1. Validate callback signature
  // 2. Extract payment details
  // 3. Update order with payment
  // 4. Update payment status
  // 5. Send confirmation
  // 6. Log transaction
}
```

**Tasks**:
- [ ] Implement callback validation
- [ ] Update order with payment record
- [ ] Update payment status
- [ ] Send payment confirmation
- [ ] Log all transactions

#### 1.2 Payment Reconciliation (3 hours)
```typescript
// apps/api/src/payments/payment-reconciliation.service.ts
// NEW FILE
async reconcilePayments(shopId: string, date: Date) {
  // 1. Get all orders for date
  // 2. Get all M-Pesa transactions for date
  // 3. Match orders to transactions
  // 4. Identify discrepancies
  // 5. Generate reconciliation report
}
```

**Tasks**:
- [ ] Create reconciliation service
- [ ] Implement transaction matching
- [ ] Generate reconciliation reports
- [ ] Handle discrepancies
- [ ] Create audit trail

#### 1.3 Payment Reversal (2 hours)
```typescript
// apps/api/src/payments/payments.service.ts
async reversePayment(paymentId: string, reason: string) {
  // 1. Validate payment can be reversed
  // 2. Call M-Pesa reversal API
  // 3. Update order status
  // 4. Update payment status
  // 5. Log reversal
}
```

**Tasks**:
- [ ] Implement reversal logic
- [ ] Call M-Pesa reversal API
- [ ] Update order status
- [ ] Create reversal audit trail

#### 1.4 Multiple Payment Methods (1 hour)
```typescript
// apps/api/src/payments/payment-method.service.ts
// NEW FILE
async processPayment(method: 'cash' | 'mpesa' | 'card', amount: number) {
  switch(method) {
    case 'cash': return this.processCash(amount);
    case 'mpesa': return this.processMpesa(amount);
    case 'card': return this.processCard(amount);
  }
}
```

**Tasks**:
- [ ] Create payment method router
- [ ] Implement cash payment
- [ ] Implement M-Pesa payment
- [ ] Implement card payment (stub)

### Files to Create
- `apps/api/src/payments/payment-reconciliation.service.ts`
- `apps/api/src/payments/dto/payment-reconciliation.dto.ts`

### Files to Modify
- `apps/api/src/payments/payments.service.ts`
- `apps/api/src/payments/payments.controller.ts`
- `apps/api/src/sales/sales.service.ts`

### API Endpoints to Add
- POST `/payments/reconcile` - Reconcile payments
- POST `/payments/reverse/:id` - Reverse payment
- GET `/payments/reconciliation/report` - Get reconciliation report
- GET `/payments/transactions` - List transactions

---

## PRIORITY 2: BARCODE SCANNING (8 hours) 🔴 CRITICAL

### Current State
- No barcode support
- Manual product entry
- No QR code support

### What Needs to Be Done

#### 2.1 Barcode Scanning Service (3 hours)
```typescript
// apps/api/src/inventory/barcode.service.ts
// NEW FILE
async scanBarcode(barcode: string, shopId: string) {
  // 1. Validate barcode format
  // 2. Look up product
  // 3. Return product details
  // 4. Log scan
}

async generateBarcode(productId: string) {
  // 1. Generate barcode image
  // 2. Save barcode
  // 3. Return barcode URL
}
```

**Tasks**:
- [ ] Create barcode service
- [ ] Implement barcode lookup
- [ ] Implement barcode generation
- [ ] Add barcode validation

#### 2.2 Frontend Barcode Scanner (3 hours)
```typescript
// apps/web/src/components/barcode-scanner.tsx
// NEW FILE
export function BarcodeScanner({ onScan }) {
  // 1. Request camera permission
  // 2. Initialize barcode scanner
  // 3. Detect barcodes
  // 4. Call onScan callback
}
```

**Tasks**:
- [ ] Create barcode scanner component
- [ ] Integrate camera access
- [ ] Implement barcode detection
- [ ] Add to POS page

#### 2.3 QR Code Support (2 hours)
```typescript
// apps/api/src/inventory/qr-code.service.ts
// NEW FILE
async generateQRCode(productId: string) {
  // 1. Generate QR code
  // 2. Save QR code
  // 3. Return QR code URL
}
```

**Tasks**:
- [ ] Create QR code service
- [ ] Implement QR code generation
- [ ] Add QR code to products
- [ ] Add QR code scanning

### Files to Create
- `apps/api/src/inventory/barcode.service.ts`
- `apps/api/src/inventory/qr-code.service.ts`
- `apps/web/src/components/barcode-scanner.tsx`

### Files to Modify
- `apps/api/src/inventory/inventory.controller.ts`
- `apps/web/src/app/pos/page.tsx`

### API Endpoints to Add
- POST `/inventory/barcode/scan` - Scan barcode
- POST `/inventory/barcode/generate/:id` - Generate barcode
- POST `/inventory/qrcode/generate/:id` - Generate QR code

---

## PRIORITY 3: MULTI-LOCATION SUPPORT (15 hours) 🔴 CRITICAL

### Current State
- Single location only
- shopId used for multi-tenancy
- No location management

### What Needs to Be Done

#### 3.1 Location Management (5 hours)
```typescript
// apps/api/src/locations/location.schema.ts
// NEW FILE
@Schema()
export class Location {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  address: string;

  @Prop()
  phone: string;

  @Prop()
  email: string;

  @Prop({ enum: ['active', 'inactive'], default: 'active' })
  status: string;
}
```

**Tasks**:
- [ ] Create Location schema
- [ ] Create Location service
- [ ] Create Location controller
- [ ] Add location CRUD endpoints

#### 3.2 Stock Transfer (5 hours)
```typescript
// apps/api/src/inventory/stock-transfer.service.ts
// NEW FILE
async transferStock(
  fromLocationId: string,
  toLocationId: string,
  productId: string,
  quantity: number
) {
  // 1. Validate stock availability
  // 2. Deduct from source location
  // 3. Add to destination location
  // 4. Create transfer record
  // 5. Log transfer
}
```

**Tasks**:
- [ ] Create StockTransfer schema
- [ ] Create transfer service
- [ ] Implement transfer logic
- [ ] Add transfer endpoints

#### 3.3 Centralized Reporting (5 hours)
```typescript
// apps/api/src/reports/consolidated-reports.service.ts
// NEW FILE
async getConsolidatedSales(shopId: string, startDate: Date, endDate: Date) {
  // 1. Get sales from all locations
  // 2. Aggregate by location
  // 3. Calculate totals
  // 4. Return consolidated report
}
```

**Tasks**:
- [ ] Create consolidated reports service
- [ ] Implement location-wise reporting
- [ ] Add consolidated dashboard
- [ ] Add reporting endpoints

### Files to Create
- `apps/api/src/locations/location.schema.ts`
- `apps/api/src/locations/locations.service.ts`
- `apps/api/src/locations/locations.controller.ts`
- `apps/api/src/inventory/stock-transfer.service.ts`
- `apps/api/src/reports/consolidated-reports.service.ts`

### API Endpoints to Add
- POST `/locations` - Create location
- GET `/locations` - List locations
- PUT `/locations/:id` - Update location
- POST `/inventory/transfer` - Transfer stock
- GET `/reports/consolidated` - Consolidated report

---

## PRIORITY 4: FINANCIAL RECONCILIATION (12 hours) 🔴 CRITICAL

### Current State
- No reconciliation features
- No variance tracking
- No financial audit trail

### What Needs to Be Done

#### 4.1 Daily Reconciliation (5 hours)
```typescript
// apps/api/src/financial/reconciliation.service.ts
// NEW FILE
async createDailyReconciliation(shopId: string, date: Date) {
  // 1. Get all orders for date
  // 2. Get all payments for date
  // 3. Calculate totals
  // 4. Get expected cash
  // 5. Get actual cash
  // 6. Calculate variance
  // 7. Create reconciliation record
}
```

**Tasks**:
- [ ] Create Reconciliation schema
- [ ] Create reconciliation service
- [ ] Implement reconciliation logic
- [ ] Add reconciliation endpoints

#### 4.2 Variance Tracking (4 hours)
```typescript
// apps/api/src/financial/variance.service.ts
// NEW FILE
async trackVariance(reconciliationId: string, variance: number, reason: string) {
  // 1. Log variance
  // 2. Categorize variance
  // 3. Create investigation record
  // 4. Notify admin
}
```

**Tasks**:
- [ ] Create Variance schema
- [ ] Create variance service
- [ ] Implement variance tracking
- [ ] Add variance endpoints

#### 4.3 Financial Reporting (3 hours)
```typescript
// apps/api/src/financial/financial-reports.service.ts
// NEW FILE
async getFinancialReport(shopId: string, startDate: Date, endDate: Date) {
  // 1. Get all transactions
  // 2. Calculate revenue
  // 3. Calculate expenses
  // 4. Calculate profit
  // 5. Generate report
}
```

**Tasks**:
- [ ] Create financial reports service
- [ ] Implement report generation
- [ ] Add report endpoints

### Files to Create
- `apps/api/src/financial/reconciliation.schema.ts`
- `apps/api/src/financial/reconciliation.service.ts`
- `apps/api/src/financial/variance.service.ts`
- `apps/api/src/financial/financial-reports.service.ts`

### API Endpoints to Add
- POST `/financial/reconciliation` - Create reconciliation
- GET `/financial/reconciliation` - List reconciliations
- POST `/financial/variance` - Track variance
- GET `/financial/report` - Get financial report

---

## PRIORITY 5: RECEIPT PRINTING (6 hours) 🔴 CRITICAL

### Current State
- HTML generation only
- No printer integration
- No print queue

### What Needs to Be Done

#### 5.1 Printer Integration (3 hours)
```typescript
// apps/api/src/receipts/printer.service.ts
// NEW FILE
async printReceipt(receiptId: string, printerName: string) {
  // 1. Get receipt HTML
  // 2. Convert to printer format
  // 3. Send to printer
  // 4. Log print job
  // 5. Handle errors
}
```

**Tasks**:
- [ ] Create printer service
- [ ] Implement printer detection
- [ ] Implement print job submission
- [ ] Add error handling

#### 5.2 Print Queue Management (2 hours)
```typescript
// apps/api/src/receipts/print-queue.service.ts
// NEW FILE
async addToPrintQueue(receiptId: string) {
  // 1. Add to queue
  // 2. Process queue
  // 3. Handle failures
  // 4. Retry failed jobs
}
```

**Tasks**:
- [ ] Create print queue service
- [ ] Implement queue management
- [ ] Implement retry logic

#### 5.3 Digital Receipts (1 hour)
```typescript
// apps/api/src/receipts/digital-receipt.service.ts
// NEW FILE
async sendDigitalReceipt(orderId: string, email: string) {
  // 1. Generate receipt
  // 2. Send email
  // 3. Log send
}
```

**Tasks**:
- [ ] Create digital receipt service
- [ ] Implement email sending
- [ ] Add SMS support

### Files to Create
- `apps/api/src/receipts/printer.service.ts`
- `apps/api/src/receipts/print-queue.service.ts`
- `apps/api/src/receipts/digital-receipt.service.ts`

### API Endpoints to Add
- POST `/receipts/print` - Print receipt
- POST `/receipts/email` - Email receipt
- POST `/receipts/sms` - SMS receipt
- GET `/receipts/queue` - Get print queue

---

## IMPLEMENTATION TIMELINE

### Week 1
- **Day 1-2**: Payment Processing (10 hours)
- **Day 3-4**: Barcode Scanning (8 hours)
- **Day 5**: Multi-Location (5 hours)

### Week 2
- **Day 1-2**: Multi-Location (10 hours)
- **Day 3-4**: Financial Reconciliation (12 hours)
- **Day 5**: Receipt Printing (6 hours)

**Total**: 51 hours (1-2 weeks)

---

## TESTING STRATEGY

### Unit Tests
- Payment processing logic
- Barcode scanning
- Location management
- Reconciliation logic
- Receipt printing

### Integration Tests
- Payment flow (order → payment → reconciliation)
- Barcode scanning (scan → product → cart)
- Multi-location (transfer → reporting)
- Reconciliation (daily → variance → report)

### E2E Tests
- Complete payment flow
- Complete barcode scanning flow
- Complete multi-location flow
- Complete reconciliation flow

---

## SUCCESS CRITERIA

- ✅ All 5 features implemented
- ✅ All tests passing
- ✅ No critical bugs
- ✅ Performance acceptable
- ✅ Documentation complete
- ✅ Ready for production

---

## ESTIMATED EFFORT

| Feature | Hours | Days | Difficulty |
|---------|-------|------|------------|
| Payment Processing | 10 | 1.5 | High |
| Barcode Scanning | 8 | 1 | Medium |
| Multi-Location | 15 | 2 | High |
| Financial Reconciliation | 12 | 1.5 | High |
| Receipt Printing | 6 | 1 | Medium |
| **Total** | **51** | **7** | **High** |

---

**Status**: Ready for Implementation
**Recommendation**: Start immediately after Phase 2 deployment
