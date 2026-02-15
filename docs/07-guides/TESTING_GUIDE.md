# SmartDuka Testing Guide

**Version:** 1.0  
**Date:** Nov 5, 2025  
**Status:** Ready for QA

---

## Testing Strategy

### Test Pyramid
```
        E2E Tests (10%)
       Integration Tests (30%)
         Unit Tests (60%)
```

### Test Coverage Goals
- Unit Tests: 80%+ coverage
- Integration Tests: 70%+ coverage
- E2E Tests: Critical user flows

---

## Unit Testing

### Backend Unit Tests

#### Auth Module Tests
```bash
npm run test -- auth.service.spec.ts
```

**Test Cases:**
- [ ] JWT token generation
- [ ] Password hashing and comparison
- [ ] Token validation
- [ ] User role verification
- [ ] Guard authorization

#### Inventory Module Tests
```bash
npm run test -- inventory.service.spec.ts
```

**Test Cases:**
- [ ] Product creation
- [ ] Product listing with filters
- [ ] Stock updates
- [ ] Low stock detection
- [ ] CSV import/export
- [ ] Barcode lookup

#### Sales Module Tests
```bash
npm run test -- sales.service.spec.ts
```

**Test Cases:**
- [ ] Order creation
- [ ] Order item calculation
- [ ] Total price calculation
- [ ] Order retrieval
- [ ] Daily sales aggregation

#### Payments Module Tests
```bash
npm run test -- payments.service.spec.ts
```

**Test Cases:**
- [ ] M-Pesa STK push initiation
- [ ] Callback processing
- [ ] Payment status querying
- [ ] Error handling

#### Suppliers Module Tests
```bash
npm run test -- suppliers.service.spec.ts
```

**Test Cases:**
- [ ] Supplier CRUD operations
- [ ] Active/inactive status
- [ ] Shop-scoped queries

#### Purchases Module Tests
```bash
npm run test -- purchases.service.spec.ts
```

**Test Cases:**
- [ ] Purchase order creation
- [ ] PO number generation
- [ ] Status transitions
- [ ] Cost calculations

#### Stock Adjustments Tests
```bash
npm run test -- adjustments.service.spec.ts
```

**Test Cases:**
- [ ] Adjustment recording
- [ ] Reason tracking
- [ ] Summary calculations
- [ ] Time-based filtering

#### Reports Module Tests
```bash
npm run test -- reports.service.spec.ts
```

**Test Cases:**
- [ ] Daily report generation
- [ ] Weekly aggregation
- [ ] Monthly aggregation
- [ ] Top products ranking
- [ ] Metrics calculation

### Frontend Unit Tests

#### Auth Context Tests
```bash
npm run test -- auth-context.test.ts
```

**Test Cases:**
- [ ] Token parsing
- [ ] User data extraction
- [ ] Login/logout flow
- [ ] Auto-hydration

#### POS Page Tests
```bash
npm run test -- pos.page.test.ts
```

**Test Cases:**
- [ ] Product loading
- [ ] Cart management
- [ ] Checkout flow
- [ ] Offline sync

#### Admin Dashboard Tests
```bash
npm run test -- admin.page.test.ts
```

**Test Cases:**
- [ ] Product CRUD
- [ ] CSV import/export
- [ ] Low stock alerts

#### Reports Page Tests
```bash
npm run test -- reports.page.test.ts
```

**Test Cases:**
- [ ] Report loading
- [ ] Date filtering
- [ ] KPI display

---

## Integration Testing

### API Integration Tests

#### Authentication Flow
```bash
npm run test:integration -- auth.integration.spec.ts
```

**Test Cases:**
- [ ] User signup
- [ ] User login
- [ ] Token refresh
- [ ] Protected endpoint access
- [ ] Role-based access

#### Inventory Flow
```bash
npm run test:integration -- inventory.integration.spec.ts
```

**Test Cases:**
- [ ] Create product → List products
- [ ] Update stock → Check low stock
- [ ] Import CSV → Verify products
- [ ] Export CSV → Verify format

#### Sales Flow
```bash
npm run test:integration -- sales.integration.spec.ts
```

**Test Cases:**
- [ ] Create order → Retrieve order
- [ ] Checkout → Generate receipt
- [ ] Daily sales → Verify totals

#### Payment Flow
```bash
npm run test:integration -- payments.integration.spec.ts
```

**Test Cases:**
- [ ] Initiate STK push
- [ ] Receive callback
- [ ] Update order status
- [ ] Generate receipt

#### Supplier Flow
```bash
npm run test:integration -- suppliers.integration.spec.ts
```

**Test Cases:**
- [ ] Create supplier
- [ ] Create purchase order
- [ ] Receive purchase order
- [ ] Update stock

### Frontend Integration Tests

#### POS Checkout Flow
```bash
npm run test:integration -- pos-checkout.integration.spec.ts
```

**Test Cases:**
- [ ] Add products to cart
- [ ] Apply discounts
- [ ] Select payment method
- [ ] Complete checkout
- [ ] Generate receipt

#### Admin Inventory Flow
```bash
npm run test:integration -- admin-inventory.integration.spec.ts
```

**Test Cases:**
- [ ] Create product
- [ ] Update product
- [ ] Delete product
- [ ] Import CSV
- [ ] Export CSV

#### Offline Sync Flow
```bash
npm run test:integration -- offline-sync.integration.spec.ts
```

**Test Cases:**
- [ ] Create order offline
- [ ] Queue order
- [ ] Go online
- [ ] Sync order
- [ ] Verify completion

---

## E2E Testing (Playwright)

### Setup
```bash
npm install -D @playwright/test
npx playwright install
```

### Running E2E Tests
```bash
npm run test:e2e
```

### Critical User Flows

#### Flow 1: Complete Sale
```typescript
test('Complete sale from product selection to receipt', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.fill('[name=email]', 'cashier@test.com');
  await page.fill('[name=password]', 'password123');
  await page.click('button:has-text("Login")');
  
  // 2. Navigate to POS
  await page.goto('/pos');
  
  // 3. Search and add product
  await page.fill('[placeholder="Search products"]', 'Milk');
  await page.click('button:has-text("Add to cart")');
  
  // 4. Checkout
  await page.click('button:has-text("Checkout")');
  
  // 5. Select payment method
  await page.click('text=Cash');
  
  // 6. Complete checkout
  await page.click('button:has-text("Complete")');
  
  // 7. Verify receipt
  await expect(page).toHaveURL('/pos');
  await expect(page.locator('text=Receipt')).toBeVisible();
});
```

#### Flow 2: Inventory Management
```typescript
test('Create, update, and delete product', async ({ page }) => {
  // Login as admin
  await page.goto('/login');
  await page.fill('[name=email]', 'admin@test.com');
  await page.fill('[name=password]', 'admin123');
  await page.click('button:has-text("Login")');
  
  // Navigate to admin
  await page.goto('/admin');
  
  // Create product
  await page.fill('[placeholder="Product name"]', 'Test Product');
  await page.fill('[placeholder="Price"]', '1000');
  await page.click('button:has-text("Add Product")');
  
  // Verify product created
  await expect(page.locator('text=Test Product')).toBeVisible();
  
  // Delete product
  await page.click('button:has-text("Delete")');
  
  // Verify deletion
  await expect(page.locator('text=Test Product')).not.toBeVisible();
});
```

#### Flow 3: CSV Import/Export
```typescript
test('Import and export products via CSV', async ({ page }) => {
  // Login as admin
  await page.goto('/login');
  await page.fill('[name=email]', 'admin@test.com');
  await page.fill('[name=password]', 'admin123');
  await page.click('button:has-text("Login")');
  
  // Navigate to admin
  await page.goto('/admin');
  
  // Export CSV
  await page.click('button:has-text("Export CSV")');
  
  // Import CSV
  await page.click('button:has-text("Import CSV")');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('test-products.csv');
  await page.click('button:has-text("Import")');
  
  // Verify import
  await expect(page.locator('text=Import complete')).toBeVisible();
});
```

#### Flow 4: M-Pesa Payment
```typescript
test('Complete M-Pesa payment flow', async ({ page }) => {
  // Add product to cart
  await page.goto('/pos');
  await page.click('button:has-text("Add to cart")');
  
  // Checkout with M-Pesa
  await page.click('button:has-text("Checkout")');
  await page.click('text=M-Pesa');
  await page.fill('[placeholder="Phone"]', '254712345678');
  await page.click('button:has-text("Pay")');
  
  // Verify STK prompt
  await expect(page.locator('text=STK prompt sent')).toBeVisible();
});
```

#### Flow 5: Real-time Updates
```typescript
test('Real-time order notifications', async ({ browser }) => {
  // Open two browser contexts
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  
  const page1 = await context1.newPage(); // Cashier
  const page2 = await context2.newPage(); // Admin
  
  // Login both
  await page1.goto('/login');
  await page1.fill('[name=email]', 'cashier@test.com');
  await page1.fill('[name=password]', 'password123');
  await page1.click('button:has-text("Login")');
  
  await page2.goto('/login');
  await page2.fill('[name=email]', 'admin@test.com');
  await page2.fill('[name=password]', 'admin123');
  await page2.click('button:has-text("Login")');
  
  // Navigate to POS and Admin
  await page1.goto('/pos');
  await page2.goto('/admin');
  
  // Create order on page1
  await page1.click('button:has-text("Add to cart")');
  await page1.click('button:has-text("Checkout")');
  
  // Verify real-time update on page2
  await expect(page2.locator('text=New order')).toBeVisible();
});
```

---

## Manual Testing Checklist

### Phase 1: Barcode Scanning
- [ ] Open barcode scanner
- [ ] Scan valid barcode
- [ ] Product added to cart
- [ ] Scan invalid barcode (error handling)
- [ ] Close scanner

### Phase 2: Receipt Generation
- [ ] Complete checkout
- [ ] Receipt modal opens
- [ ] Print receipt (opens print dialog)
- [ ] Share via WhatsApp (opens WhatsApp)
- [ ] Download receipt (saves file)

### Phase 3: CSV Operations
- [ ] Download template
- [ ] Add products to template
- [ ] Import CSV (verify success)
- [ ] Export CSV (verify format)
- [ ] Verify imported products in list

### Phase 4: M-Pesa Payment
- [ ] Enter phone number
- [ ] Initiate STK push
- [ ] Verify success message
- [ ] Query payment status
- [ ] Verify order created

### Phase 5: Supplier Management
- [ ] Create supplier
- [ ] Update supplier
- [ ] List suppliers
- [ ] Delete supplier
- [ ] Create purchase order

### Phase 6: Stock Adjustments
- [ ] Record adjustment (damage)
- [ ] Record adjustment (loss)
- [ ] Record adjustment (recount)
- [ ] View adjustment history
- [ ] View summary

### Phase 7: Multi-language
- [ ] Switch to Kiswahili
- [ ] Verify all UI in Kiswahili
- [ ] Switch back to English
- [ ] Verify persistence

### Phase 8: Onboarding
- [ ] Start onboarding
- [ ] Complete all steps
- [ ] Verify shop created
- [ ] Verify language set
- [ ] Redirect to POS

### Phase 9: Real-time Updates
- [ ] Create order
- [ ] Verify admin sees update
- [ ] Update inventory
- [ ] Verify POS sees update
- [ ] Test low stock alert

### Phase 10: Reports
- [ ] Generate daily report
- [ ] Generate weekly report
- [ ] Generate monthly report
- [ ] View metrics
- [ ] View trends

---

## Performance Testing

### Load Testing
```bash
npm run test:load
```

**Scenarios:**
- [ ] 100 concurrent users
- [ ] 1000 orders per minute
- [ ] 10MB CSV import
- [ ] Real-time event broadcasting

### Metrics to Monitor
- Response time (target: <200ms)
- Throughput (target: >1000 req/s)
- Error rate (target: <0.1%)
- Memory usage (target: <500MB)
- CPU usage (target: <80%)

---

## Security Testing

### OWASP Top 10
- [ ] SQL Injection (input validation)
- [ ] Broken Authentication (JWT validation)
- [ ] Sensitive Data Exposure (HTTPS)
- [ ] XML External Entities (N/A)
- [ ] Broken Access Control (role-based)
- [ ] Security Misconfiguration (env vars)
- [ ] XSS (input sanitization)
- [ ] Insecure Deserialization (N/A)
- [ ] Using Components with Known Vulnerabilities (npm audit)
- [ ] Insufficient Logging (audit trail)

### Security Checklist
- [ ] No hardcoded secrets
- [ ] HTTPS enabled
- [ ] CORS configured
- [ ] Rate limiting enabled
- [ ] Input validation
- [ ] Output encoding
- [ ] Authentication required
- [ ] Authorization enforced
- [ ] Audit logging
- [ ] Error handling

---

## Test Execution Plan

### Day 1: Unit Tests
```bash
npm run test
```

### Day 2: Integration Tests
```bash
npm run test:integration
```

### Day 3: E2E Tests
```bash
npm run test:e2e
```

### Day 4: Manual Testing
- Follow manual checklist
- Document issues
- Create bug reports

### Day 5: Performance & Security
- Load testing
- Security scanning
- Vulnerability assessment

---

## Bug Reporting Template

```
Title: [Component] Brief description

Severity: Critical/High/Medium/Low

Steps to Reproduce:
1. 
2. 
3. 

Expected Result:

Actual Result:

Screenshots/Logs:

Environment:
- OS: 
- Browser: 
- Version: 
```

---

## Test Results Template

```
Test Suite: [Name]
Date: [Date]
Tester: [Name]

Total Tests: 
Passed: 
Failed: 
Skipped: 

Pass Rate: %

Issues Found:
1. 
2. 

Recommendations:
```

---

## Sign-off Criteria

- [ ] All unit tests pass (80%+ coverage)
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Manual testing complete
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Security scan passed
- [ ] Documentation complete

