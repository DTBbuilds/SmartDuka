# Missing Frontend Components - Complete Task List

**Date:** Nov 6, 2025  
**Status:** Comprehensive audit of all missing components  
**Total Tasks:** 87

---

## 📋 TASK CATEGORIES

1. [Authentication & User Management](#1-authentication--user-management) - 12 tasks
2. [Settings & Configuration](#2-settings--configuration) - 8 tasks
3. [Suppliers Management](#3-suppliers-management) - 6 tasks
4. [Purchase Orders](#4-purchase-orders) - 8 tasks
5. [Stock Management](#5-stock-management) - 7 tasks
6. [Customer Management](#6-customer-management) - 8 tasks
7. [Payment Management](#7-payment-management) - 6 tasks
8. [Enhanced Reporting](#8-enhanced-reporting) - 8 tasks
9. [User Management](#9-user-management) - 7 tasks
10. [Product Enhancements](#10-product-enhancements) - 6 tasks
11. [Shared Components](#11-shared-components) - 11 tasks

---

## 1. Authentication & User Management

### 1.1 Signup/Registration Page
- [ ] **Task 1.1.1:** Create `/signup/page.tsx`
- [ ] **Task 1.1.2:** Build registration form component
  - Name input
  - Email input
  - Phone input
  - Password input with strength indicator
  - Confirm password input
  - Role selection (if admin is creating)
  - Terms & conditions checkbox
- [ ] **Task 1.1.3:** Add form validation (Zod schema)
- [ ] **Task 1.1.4:** Implement signup API call
- [ ] **Task 1.1.5:** Add success/error handling
- [ ] **Task 1.1.6:** Add redirect to login after signup

### 1.2 Forgot Password Flow
- [ ] **Task 1.2.1:** Create `/forgot-password/page.tsx`
- [ ] **Task 1.2.2:** Build email input form
- [ ] **Task 1.2.3:** Create `/reset-password/[token]/page.tsx`
- [ ] **Task 1.2.4:** Build password reset form
- [ ] **Task 1.2.5:** Add password strength validation
- [ ] **Task 1.2.6:** Implement reset password API (backend + frontend)

---

## 2. Settings & Configuration

### 2.1 Settings Page Structure
- [ ] **Task 2.1.1:** Create `/settings/page.tsx`
- [ ] **Task 2.1.2:** Build settings layout with tabs component
  - Shop Settings tab
  - User Profile tab
  - Security tab
  - Preferences tab

### 2.2 Shop Settings Tab
- [ ] **Task 2.2.1:** Create shop settings form component
  - Shop name
  - Till number
  - Business address
  - Phone number
  - Email
  - Tax rate
  - Currency
- [ ] **Task 2.2.2:** Implement GET /shops/my-shop API call
- [ ] **Task 2.2.3:** Implement PUT /shops/:id API call
- [ ] **Task 2.2.4:** Add save button with loading state

### 2.3 User Profile Tab
- [ ] **Task 2.3.1:** Create user profile form component
  - Name
  - Email (read-only)
  - Phone
  - Avatar upload (optional)
- [ ] **Task 2.3.2:** Implement profile update API call

### 2.4 Security Tab
- [ ] **Task 2.4.1:** Create change password form
  - Current password
  - New password
  - Confirm new password
- [ ] **Task 2.4.2:** Implement change password API (backend + frontend)

---

## 3. Suppliers Management

### 3.1 Suppliers List Page
- [ ] **Task 3.1.1:** Create `/suppliers/page.tsx`
- [ ] **Task 3.1.2:** Build suppliers data table component
  - Name column
  - Phone column
  - Email column
  - Status column
  - Actions column (edit, delete)
- [ ] **Task 3.1.3:** Implement GET /suppliers API call
- [ ] **Task 3.1.4:** Add search/filter functionality
- [ ] **Task 3.1.5:** Add "Add Supplier" button

### 3.2 Add/Edit Supplier Form
- [ ] **Task 3.2.1:** Create supplier form modal/dialog component
  - Name input
  - Phone input
  - Email input
  - Address input
  - Notes textarea
  - Active/Inactive toggle
- [ ] **Task 3.2.2:** Implement POST /suppliers API call
- [ ] **Task 3.2.3:** Implement PUT /suppliers/:id API call
- [ ] **Task 3.2.4:** Add form validation
- [ ] **Task 3.2.5:** Implement DELETE /suppliers/:id with confirmation

---

## 4. Purchase Orders

### 4.1 Purchases List Page
- [ ] **Task 4.1.1:** Create `/purchases/page.tsx`
- [ ] **Task 4.1.2:** Build purchases data table component
  - Purchase number column
  - Supplier column
  - Date column
  - Total amount column
  - Status column (pending, received, cancelled)
  - Actions column
- [ ] **Task 4.1.3:** Implement GET /purchases API call
- [ ] **Task 4.1.4:** Add filter by status
- [ ] **Task 4.1.5:** Add filter by supplier
- [ ] **Task 4.1.6:** Add date range filter

### 4.2 Create Purchase Order
- [ ] **Task 4.2.1:** Create `/purchases/new/page.tsx`
- [ ] **Task 4.2.2:** Build purchase order form
  - Supplier selection dropdown
  - Purchase date picker
  - Expected delivery date
  - Notes textarea
- [ ] **Task 4.2.3:** Build line items table
  - Product selection
  - Quantity input
  - Unit cost input
  - Total calculation
  - Add/remove item buttons
- [ ] **Task 4.2.4:** Implement POST /purchases API call
- [ ] **Task 4.2.5:** Add total calculation logic
- [ ] **Task 4.2.6:** Add save as draft functionality

### 4.3 Receive Purchase Order
- [ ] **Task 4.3.1:** Create `/purchases/[id]/receive/page.tsx`
- [ ] **Task 4.3.2:** Build receive form
  - Show ordered items
  - Received quantity input per item
  - Damage/shortage notes
  - Actual cost input (if different)
- [ ] **Task 4.3.3:** Implement PUT /purchases/:id API call
- [ ] **Task 4.3.4:** Auto-update stock levels after receiving

---

## 5. Stock Management

### 5.1 Stock Adjustments Page
- [ ] **Task 5.1.1:** Create `/stock/adjustments/page.tsx`
- [ ] **Task 5.1.2:** Build adjustments data table
  - Date column
  - Product column
  - Quantity column (+ or -)
  - Reason column
  - User column
  - Actions column
- [ ] **Task 5.1.3:** Implement GET /stock/adjustments API call
- [ ] **Task 5.1.4:** Add filter by product
- [ ] **Task 5.1.5:** Add filter by reason

### 5.2 Create Stock Adjustment
- [ ] **Task 5.2.1:** Create adjustment form modal
  - Product selection
  - Adjustment type (increase/decrease)
  - Quantity input
  - Reason dropdown (damage, theft, correction, found, other)
  - Notes textarea
- [ ] **Task 5.2.2:** Implement POST /stock/adjustments API call
- [ ] **Task 5.2.3:** Add validation (prevent negative stock)

### 5.3 Stock Summary Report
- [ ] **Task 5.3.1:** Create `/stock/summary/page.tsx`
- [ ] **Task 5.3.2:** Build summary cards
  - Total products
  - Total stock value
  - Low stock items count
  - Out of stock items count
- [ ] **Task 5.3.3:** Implement GET /stock/adjustments/summary API call

---

## 6. Customer Management

### 6.1 Backend API (Needs to be built first)
- [ ] **Task 6.1.1:** Create customer schema (backend)
- [ ] **Task 6.1.2:** Create customer service (backend)
- [ ] **Task 6.1.3:** Create customer controller (backend)
- [ ] **Task 6.1.4:** Add customer CRUD endpoints (backend)

### 6.2 Customers List Page
- [ ] **Task 6.2.1:** Create `/customers/page.tsx`
- [ ] **Task 6.2.2:** Build customers data table
  - Name column
  - Phone column
  - Email column
  - Total purchases column
  - Last purchase date column
  - Actions column
- [ ] **Task 6.2.3:** Implement GET /customers API call
- [ ] **Task 6.2.4:** Add search functionality

### 6.3 Add/Edit Customer Form
- [ ] **Task 6.3.1:** Create customer form modal
  - Name input
  - Phone input
  - Email input
  - Address input
  - Notes textarea
- [ ] **Task 6.3.2:** Implement POST /customers API call
- [ ] **Task 6.3.3:** Implement PUT /customers/:id API call

### 6.4 Customer Details Page
- [ ] **Task 6.4.1:** Create `/customers/[id]/page.tsx`
- [ ] **Task 6.4.2:** Display customer information
- [ ] **Task 6.4.3:** Show purchase history table
- [ ] **Task 6.4.4:** Show total spent statistics

---

## 7. Payment Management

### 7.1 Payments List Page
- [ ] **Task 7.1.1:** Create `/payments/page.tsx`
- [ ] **Task 7.1.2:** Build payments data table
  - Date column
  - Order number column
  - Amount column
  - Payment method column
  - Status column (pending, completed, failed)
  - M-Pesa reference column
  - Actions column
- [ ] **Task 7.1.3:** Implement GET /payments API call (needs backend endpoint)
- [ ] **Task 7.1.4:** Add filter by status
- [ ] **Task 7.1.5:** Add filter by payment method
- [ ] **Task 7.1.6:** Add date range filter

### 7.2 Payment Reconciliation
- [ ] **Task 7.2.1:** Create `/payments/reconciliation/page.tsx`
- [ ] **Task 7.2.2:** Build reconciliation interface
  - Show pending M-Pesa payments
  - Manual match to orders
  - Bulk reconciliation
- [ ] **Task 7.2.3:** Implement reconciliation API calls

---

## 8. Enhanced Reporting

### 8.1 Weekly Sales Report
- [ ] **Task 8.1.1:** Create `/reports/weekly/page.tsx`
- [ ] **Task 8.1.2:** Build week selector component
- [ ] **Task 8.1.3:** Implement GET /reports/weekly-sales API call
- [ ] **Task 8.1.4:** Display weekly KPIs
- [ ] **Task 8.1.5:** Add weekly trend chart

### 8.2 Monthly Sales Report
- [ ] **Task 8.2.1:** Create `/reports/monthly/page.tsx`
- [ ] **Task 8.2.2:** Build month/year selector
- [ ] **Task 8.2.3:** Implement GET /reports/monthly-sales API call
- [ ] **Task 8.2.4:** Display monthly KPIs
- [ ] **Task 8.2.5:** Add monthly trend chart

### 8.3 Sales Trends
- [ ] **Task 8.3.1:** Create `/reports/trends/page.tsx`
- [ ] **Task 8.3.2:** Implement GET /reports/trends API call
- [ ] **Task 8.3.3:** Build interactive trend charts
  - Sales over time
  - Product performance
  - Category performance

### 8.4 Export Functionality
- [ ] **Task 8.4.1:** Add "Export to CSV" button to all reports
- [ ] **Task 8.4.2:** Implement CSV export logic
- [ ] **Task 8.4.3:** Add "Export to PDF" button (optional)
- [ ] **Task 8.4.4:** Implement PDF export logic (optional)

---

## 9. User Management

### 9.1 Users List Page
- [ ] **Task 9.1.1:** Create `/users/page.tsx` (admin only)
- [ ] **Task 9.1.2:** Build users data table
  - Name column
  - Email column
  - Phone column
  - Role column
  - Status column
  - Last login column
  - Actions column
- [ ] **Task 9.1.3:** Implement GET /users API call (needs backend endpoint)
- [ ] **Task 9.1.4:** Add filter by role
- [ ] **Task 9.1.5:** Add search functionality

### 9.2 Add/Edit User Form
- [ ] **Task 9.2.1:** Create user form modal (admin only)
  - Name input
  - Email input
  - Phone input
  - Role selection
  - Password input (for new users)
  - Active/Inactive toggle
- [ ] **Task 9.2.2:** Implement POST /users API call
- [ ] **Task 9.2.3:** Implement PUT /users/:id API call (needs backend endpoint)

### 9.3 User Details Page
- [ ] **Task 9.3.1:** Create `/users/[id]/page.tsx`
- [ ] **Task 9.3.2:** Display user information
- [ ] **Task 9.3.3:** Show activity log (if available)

---

## 10. Product Enhancements

### 10.1 Product Edit Page
- [ ] **Task 10.1.1:** Create `/inventory/[id]/edit/page.tsx`
- [ ] **Task 10.1.2:** Pre-fill form with product data
- [ ] **Task 10.1.3:** Implement PUT /inventory/products/:id API call

### 10.2 Product Images
- [ ] **Task 10.2.1:** Add image upload to product form
- [ ] **Task 10.2.2:** Implement image storage (backend)
- [ ] **Task 10.2.3:** Display product images in POS
- [ ] **Task 10.2.4:** Display product images in admin

### 10.3 Product Variants
- [ ] **Task 10.3.1:** Design variant schema (backend)
- [ ] **Task 10.3.2:** Add variant management UI
  - Size variants
  - Color variants
  - Custom variants

### 10.4 Barcode Generation
- [ ] **Task 10.4.1:** Add "Generate Barcode" button
- [ ] **Task 10.4.2:** Implement barcode generation logic
- [ ] **Task 10.4.3:** Add "Print Labels" functionality

---

## 11. Shared Components

### 11.1 Data Table Component
- [ ] **Task 11.1.1:** Create reusable `<DataTable>` component
  - Sortable columns
  - Pagination
  - Search
  - Filters
  - Row selection
  - Bulk actions

### 11.2 Form Components
- [ ] **Task 11.2.1:** Create `<FormModal>` component
- [ ] **Task 11.2.2:** Create `<FormDrawer>` component (mobile)
- [ ] **Task 11.2.3:** Create `<FormField>` wrapper component
- [ ] **Task 11.2.4:** Create `<DateRangePicker>` component
- [ ] **Task 11.2.5:** Create `<SearchableSelect>` component

### 11.3 Confirmation Dialogs
- [ ] **Task 11.3.1:** Create `<ConfirmDialog>` component
- [ ] **Task 11.3.2:** Create `<DeleteConfirmDialog>` component
- [ ] **Task 11.3.3:** Add to all delete actions

### 11.4 Loading States
- [ ] **Task 11.4.1:** Create `<TableSkeleton>` component
- [ ] **Task 11.4.2:** Create `<CardSkeleton>` component
- [ ] **Task 11.4.3:** Create `<FormSkeleton>` component
- [ ] **Task 11.4.4:** Add loading states to all data fetching

### 11.5 Empty States
- [ ] **Task 11.5.1:** Create `<EmptyState>` component
- [ ] **Task 11.5.2:** Add empty states to all lists
  - No products
  - No orders
  - No suppliers
  - No customers
  - No reports

### 11.6 Error Handling
- [ ] **Task 11.6.1:** Create error boundary component
- [ ] **Task 11.6.2:** Create `<ErrorState>` component
- [ ] **Task 11.6.3:** Add error boundaries to all routes
- [ ] **Task 11.6.4:** Improve error messages

---

## 📊 TASK SUMMARY BY PRIORITY

### 🔴 CRITICAL (Must have for MVP)
- Authentication: Signup page (6 tasks)
- Settings: Shop & user settings (8 tasks)
- Suppliers: Full CRUD (11 tasks)
- Purchases: Full CRUD (14 tasks)
- Stock: Adjustments (7 tasks)
- Shared: Data table, forms, dialogs (11 tasks)

**Total Critical:** 57 tasks

### 🟡 HIGH (Important for usability)
- User Management: Full CRUD (7 tasks)
- Payments: History & reconciliation (9 tasks)
- Customers: Full CRUD (8 tasks)
- Product: Edit page & images (6 tasks)

**Total High:** 30 tasks

### 🟢 MEDIUM (Nice to have)
- Enhanced Reporting: Weekly, monthly, trends (12 tasks)
- Product: Variants & barcode labels (6 tasks)
- Auth: Password reset (6 tasks)

**Total Medium:** 24 tasks

---

## 📅 ESTIMATED TIMELINE

### Week 1: Critical Foundation (40 hours)
- Shared components (data table, forms, dialogs)
- Signup page
- Settings page
- Basic error handling

### Week 2: Suppliers & Purchases (40 hours)
- Suppliers CRUD
- Purchase orders CRUD
- Stock adjustments

### Week 3: Users & Payments (40 hours)
- User management
- Payment history
- Customer management (backend + frontend)

### Week 4: Enhancements & Polish (40 hours)
- Enhanced reporting
- Product enhancements
- Loading states
- Empty states
- Bug fixes

**Total Estimated Effort:** 160 hours (~4 weeks for 1 developer)

---

## ✅ COMPLETION CHECKLIST

### Phase 1: Foundation (Week 1)
- [ ] All shared components created
- [ ] Signup page functional
- [ ] Settings page functional
- [ ] Error handling in place

### Phase 2: Core Features (Week 2)
- [ ] Suppliers management complete
- [ ] Purchase orders complete
- [ ] Stock adjustments complete

### Phase 3: Extended Features (Week 3)
- [ ] User management complete
- [ ] Payment management complete
- [ ] Customer management complete

### Phase 4: Polish (Week 4)
- [ ] All reports enhanced
- [ ] All loading states added
- [ ] All empty states added
- [ ] All error states handled
- [ ] Product enhancements complete

---

## 🎯 SUCCESS CRITERIA

Application is considered complete when:
- [ ] All 87 tasks are completed
- [ ] Every backend endpoint has a corresponding UI
- [ ] All CRUD operations are functional
- [ ] All forms have validation
- [ ] All actions have loading states
- [ ] All lists have empty states
- [ ] All errors are handled gracefully
- [ ] Application is fully usable without developer intervention

---

## 📝 NOTES

1. **Backend Dependencies:** Some tasks require backend endpoints to be created first (customers, enhanced user management)
2. **Testing:** Each component should be tested after creation
3. **Responsive:** All components must work on mobile, tablet, and desktop
4. **Accessibility:** All components must meet WCAG AA standards
5. **Offline:** Consider offline functionality for all forms
6. **i18n:** All text should be translatable (English/Kiswahili)

---

## 🚀 GETTING STARTED

### Recommended Order:
1. Start with shared components (foundation)
2. Build signup page (critical blocker)
3. Build settings page (critical blocker)
4. Build suppliers management (critical for inventory)
5. Build purchase orders (critical for restocking)
6. Continue with remaining features in priority order

### Development Workflow:
1. Create component file
2. Build UI with ShadCN components
3. Add form validation (Zod)
4. Implement API calls
5. Add loading/error/empty states
6. Test on all devices
7. Check accessibility
8. Mark task as complete

---

**Total Tasks: 87**  
**Estimated Effort: 160 hours**  
**Target Completion: 4 weeks**
