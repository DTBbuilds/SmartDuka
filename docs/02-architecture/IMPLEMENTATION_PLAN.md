# SmartDuka - Remaining Implementation Plan

## Overview
Complete MVP enhancement with 6 phases. Phases 1-3 can run in parallel with careful coordination.

---

## Phase 1: Core POS Enhancements (PRIORITY: HIGH)
**Timeline:** 2-3 days | **Parallel:** Yes (3 workstreams)

### 1.1 Barcode Scanning
**Frontend (apps/web):**
- Install: `html5-qrcode`
- Create `src/components/barcode-scanner.tsx` (camera modal)
- Add scanner button to POS page
- Integrate with product search (auto-add to cart on scan)
- Handle camera permissions gracefully

**Backend (apps/api):**
- Add barcode validation endpoint (optional, for verification)

**Files to create/modify:**
- `apps/web/src/components/barcode-scanner.tsx` (NEW)
- `apps/web/src/app/pos/page.tsx` (MODIFY - integrate scanner)
- `package.json` (ADD html5-qrcode dependency)

---

### 1.2 Receipt Generation & Sharing
**Frontend (apps/web):**
- Create `src/components/receipt-modal.tsx` (display receipt)
- Create `src/lib/receipt-generator.ts` (format receipt data)
- Add receipt print functionality (window.print())
- Add WhatsApp share button (generate WhatsApp message with order details)
- Store receipt in IndexedDB for offline access

**Backend (apps/api):**
- Add GET `/orders/:id/receipt` endpoint (return formatted receipt)
- Optional: Add PDF generation (pdfkit or similar)

**Files to create/modify:**
- `apps/web/src/components/receipt-modal.tsx` (NEW)
- `apps/web/src/lib/receipt-generator.ts` (NEW)
- `apps/web/src/app/pos/page.tsx` (MODIFY - add receipt button)
- `apps/api/src/sales/sales.controller.ts` (MODIFY - add receipt endpoint)

---

### 1.3 CSV Import/Export
**Frontend (apps/web):**
- Create `src/components/csv-import-modal.tsx` (file upload, validation)
- Create `src/lib/csv-parser.ts` (parse CSV to product format)
- Add export button in inventory list (download current products as CSV)
- Add import button in inventory (bulk upload products)

**Backend (apps/api):**
- Add POST `/products/import` endpoint (bulk insert with validation)
- Add GET `/products/export` endpoint (return CSV file)

**Files to create/modify:**
- `apps/web/src/components/csv-import-modal.tsx` (NEW)
- `apps/web/src/lib/csv-parser.ts` (NEW)
- `apps/web/src/app/admin/page.tsx` (MODIFY - add import/export buttons)
- `apps/api/src/inventory/products.controller.ts` (MODIFY - add import/export endpoints)

---

## Phase 2: Payment Integration (PRIORITY: HIGH)
**Timeline:** 2-3 days | **Parallel:** Yes (2 workstreams)

### 2.1 Real M-Pesa Daraja API Integration
**Backend (apps/api):**
- Create `src/payments/daraja.service.ts` (M-Pesa API client)
- Implement STK push with real Daraja credentials
- Implement callback handler with signature validation
- Add payment status polling endpoint
- Store M-Pesa transaction logs

**Frontend (apps/web):**
- Update checkout flow to trigger real M-Pesa STK
- Add payment status polling UI (waiting for M-Pesa confirmation)
- Handle M-Pesa errors gracefully

**Environment Setup:**
- Add to `.env`: `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`

**Files to create/modify:**
- `apps/api/src/payments/daraja.service.ts` (NEW)
- `apps/api/src/payments/payments.controller.ts` (MODIFY - integrate Daraja)
- `apps/web/src/app/pos/page.tsx` (MODIFY - real M-Pesa flow)

---

### 2.2 Flutterwave/Pesapal Card Payment Integration
**Backend (apps/api):**
- Create `src/payments/flutterwave.service.ts` (Flutterwave API client)
- Implement payment initialization and verification
- Add webhook handler for payment confirmation

**Frontend (apps/web):**
- Add card payment option in checkout
- Redirect to Flutterwave hosted payment page
- Handle payment confirmation callback

**Environment Setup:**
- Add to `.env`: `FLUTTERWAVE_PUBLIC_KEY`, `FLUTTERWAVE_SECRET_KEY`

**Files to create/modify:**
- `apps/api/src/payments/flutterwave.service.ts` (NEW)
- `apps/api/src/payments/payments.controller.ts` (MODIFY - integrate Flutterwave)
- `apps/web/src/app/pos/page.tsx` (MODIFY - card payment option)

---

## Phase 3: Inventory Extensions (PRIORITY: MEDIUM)
**Timeline:** 2-3 days | **Parallel:** Yes (3 workstreams)

### 3.1 Supplier Management
**Backend (apps/api):**
- Create `src/suppliers/supplier.schema.ts` (name, phone, email, address, shopId)
- Create `src/suppliers/suppliers.controller.ts` (CRUD endpoints)
- Create `src/suppliers/suppliers.service.ts`

**Frontend (apps/web):**
- Create `src/app/admin/suppliers/page.tsx` (list, add, edit, delete)
- Create `src/components/supplier-form.tsx`

**Files to create/modify:**
- `apps/api/src/suppliers/supplier.schema.ts` (NEW)
- `apps/api/src/suppliers/suppliers.controller.ts` (NEW)
- `apps/api/src/suppliers/suppliers.service.ts` (NEW)
- `apps/api/src/app.module.ts` (MODIFY - register SuppliersModule)
- `apps/web/src/app/admin/suppliers/page.tsx` (NEW)
- `apps/web/src/components/supplier-form.tsx` (NEW)

---

### 3.2 Purchase Orders
**Backend (apps/api):**
- Create `src/purchases/purchase.schema.ts` (supplierId, items[], totalCost, status, shopId)
- Create `src/purchases/purchases.controller.ts` (CRUD endpoints)
- Create `src/purchases/purchases.service.ts`

**Frontend (apps/web):**
- Create `src/app/admin/purchases/page.tsx` (list, create, view)
- Create `src/components/purchase-form.tsx`

**Files to create/modify:**
- `apps/api/src/purchases/purchase.schema.ts` (NEW)
- `apps/api/src/purchases/purchases.controller.ts` (NEW)
- `apps/api/src/purchases/purchases.service.ts` (NEW)
- `apps/api/src/app.module.ts` (MODIFY - register PurchasesModule)
- `apps/web/src/app/admin/purchases/page.tsx` (NEW)
- `apps/web/src/components/purchase-form.tsx` (NEW)

---

### 3.3 Stock Adjustments
**Backend (apps/api):**
- Create `src/stock/adjustment.schema.ts` (productId, delta, reason, shopId, timestamp)
- Create `src/stock/adjustments.controller.ts` (CRUD endpoints)
- Create `src/stock/adjustments.service.ts`
- Add adjustment history endpoint

**Frontend (apps/web):**
- Create `src/app/admin/stock-adjustments/page.tsx` (list, create)
- Create `src/components/adjustment-form.tsx`

**Files to create/modify:**
- `apps/api/src/stock/adjustment.schema.ts` (NEW)
- `apps/api/src/stock/adjustments.controller.ts` (NEW)
- `apps/api/src/stock/adjustments.service.ts` (NEW)
- `apps/api/src/app.module.ts` (MODIFY - register AdjustmentsModule)
- `apps/web/src/app/admin/stock-adjustments/page.tsx` (NEW)
- `apps/web/src/components/adjustment-form.tsx` (NEW)

---

## Phase 4: Localization & UX (PRIORITY: MEDIUM)
**Timeline:** 1-2 days | **Parallel:** Yes (2 workstreams)

### 4.1 Multi-Language Support (English/Kiswahili)
**Frontend (apps/web):**
- Install: `next-i18next` or `i18next`
- Create `public/locales/en/common.json` (English translations)
- Create `public/locales/sw/common.json` (Kiswahili translations)
- Create `src/lib/i18n.ts` (i18n configuration)
- Create `src/components/language-switcher.tsx`
- Update all UI text to use translation keys

**Files to create/modify:**
- `public/locales/en/common.json` (NEW)
- `public/locales/sw/common.json` (NEW)
- `src/lib/i18n.ts` (NEW)
- `src/components/language-switcher.tsx` (NEW)
- `next.config.js` (MODIFY - i18n config)
- All page and component files (MODIFY - use translations)

---

### 4.2 Onboarding Wizard
**Frontend (apps/web):**
- Create `src/app/onboarding/page.tsx` (multi-step wizard)
- Create `src/components/onboarding-steps.tsx` (steps: shop info, till number, first user, language)
- Store shop settings in backend

**Backend (apps/api):**
- Add POST `/shops` endpoint (create shop during onboarding)
- Add PUT `/shops/:id` endpoint (update shop settings)

**Files to create/modify:**
- `apps/web/src/app/onboarding/page.tsx` (NEW)
- `apps/web/src/components/onboarding-steps.tsx` (NEW)
- `apps/api/src/shops/shop.schema.ts` (NEW)
- `apps/api/src/shops/shops.controller.ts` (NEW)
- `apps/api/src/shops/shops.service.ts` (NEW)
- `apps/api/src/app.module.ts` (MODIFY - register ShopsModule)

---

## Phase 5: Real-time & Advanced Features (PRIORITY: LOW)
**Timeline:** 2-3 days | **Parallel:** Yes (2 workstreams)

### 5.1 Socket.io Integration
**Backend (apps/api):**
- Install: `@nestjs/websockets`, `socket.io`
- Create `src/websockets/websockets.gateway.ts` (real-time events)
- Emit events: new order, stock update, payment confirmation

**Frontend (apps/web):**
- Install: `socket.io-client`
- Create `src/lib/socket.ts` (Socket.io client)
- Listen for real-time updates in admin dashboard

**Files to create/modify:**
- `apps/api/src/websockets/websockets.gateway.ts` (NEW)
- `apps/web/src/lib/socket.ts` (NEW)
- `apps/web/src/app/admin/page.tsx` (MODIFY - listen for real-time updates)

---

### 5.2 Advanced Reporting (Weekly/Monthly)
**Backend (apps/api):**
- Add GET `/reports/weekly/:date` endpoint
- Add GET `/reports/monthly/:date` endpoint
- Add GET `/reports/trends` endpoint (sales trends over time)

**Frontend (apps/web):**
- Create `src/app/reports/weekly/page.tsx`
- Create `src/app/reports/monthly/page.tsx`
- Create `src/app/reports/trends/page.tsx`
- Add charts for trends visualization

**Files to create/modify:**
- `apps/api/src/sales/sales.controller.ts` (MODIFY - add weekly/monthly endpoints)
- `apps/web/src/app/reports/weekly/page.tsx` (NEW)
- `apps/web/src/app/reports/monthly/page.tsx` (NEW)
- `apps/web/src/app/reports/trends/page.tsx` (NEW)

---

## Phase 6: Testing & Deployment (PRIORITY: HIGH)
**Timeline:** 2-3 days

### 6.1 QA & Testing
- Unit tests for critical services (auth, payments, inventory)
- Integration tests for API endpoints
- E2E tests for POS flow (Playwright)
- Manual testing on mobile, tablet, desktop

### 6.2 Staging Deployment
- Deploy to staging environment
- Test all features end-to-end
- Performance testing and optimization

### 6.3 Production Deployment
- Deploy to production
- Monitor logs and errors (Sentry)
- Prepare pilot rollout documentation

---

## Dependency Graph

```
Phase 1 (Barcode, Receipt, CSV)
  ↓
Phase 2 (M-Pesa, Flutterwave) ← depends on Phase 1 (checkout flow)
  ↓
Phase 3 (Suppliers, Purchases, Stock) ← independent
  ↓
Phase 4 (Localization, Onboarding) ← depends on Phase 1-3 (all UI)
  ↓
Phase 5 (Socket.io, Advanced Reports) ← independent
  ↓
Phase 6 (Testing & Deployment)
```

---

## Parallel Execution Strategy

**Week 1:**
- **Workstream A:** Phase 1.1 (Barcode) + Phase 1.2 (Receipt)
- **Workstream B:** Phase 1.3 (CSV Import/Export)
- **Workstream C:** Phase 3.1 (Suppliers) + Phase 3.2 (Purchases)

**Week 2:**
- **Workstream A:** Phase 2.1 (M-Pesa Daraja)
- **Workstream B:** Phase 2.2 (Flutterwave)
- **Workstream C:** Phase 3.3 (Stock Adjustments)

**Week 3:**
- **Workstream A:** Phase 4.1 (Localization)
- **Workstream B:** Phase 4.2 (Onboarding)
- **Workstream C:** Phase 5.1 (Socket.io)

**Week 4:**
- **Workstream A:** Phase 5.2 (Advanced Reports)
- **Workstream B:** Phase 6 (Testing & Deployment)

---

## Success Criteria

✅ All features implemented and tested
✅ Barcode scanning works on mobile/tablet
✅ Receipts can be printed and shared via WhatsApp
✅ CSV import/export handles 1000+ products
✅ M-Pesa STK push works in sandbox/production
✅ Flutterwave card payments functional
✅ Suppliers, purchases, stock adjustments fully CRUD
✅ UI supports English and Kiswahili
✅ Onboarding wizard completes shop setup
✅ Real-time updates visible in admin dashboard
✅ Advanced reports show trends and patterns
✅ All tests pass (unit, integration, E2E)
✅ Staging deployment successful
✅ Production deployment ready for pilot

