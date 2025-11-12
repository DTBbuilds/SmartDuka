# SmartDuka Project Scope (Full Cascade Build Plan)

## 1. Overview
SmartDuka is a multi-device (mobile, tablet, desktop) PWA POS and Inventory Management System tailored for Kenyan small businesses and dukas. It integrates M-Pesa, supports offline functionality, and offers real-time inventory management, sales tracking, and reporting.

**Goal:** Create an MVP-ready, offline-first POS + Inventory platform that scales to thousands of Kenyan retailers and supports local payment methods (M-Pesa, bank, cash).

---

## 2. Objectives
- Enable dukas to record sales, manage inventory, and receive payments.
- Function seamlessly across devices (mobile, tablet, desktop).
- Operate offline with automatic sync when online.
- Integrate with M-Pesa for STK push payments.
- Provide intuitive, fast, and localized (English/Kiswahili) UI.

---

## 3. Core Features (MVP)
### POS Module
- Product selection and quick search
- Barcode scanning (camera or hardware scanner)
- Cart management and checkout flow
- Payment methods: M-Pesa, cash, bank/card
- Receipt generation and sharing (WhatsApp, print)

### Inventory Management
- Add/edit/delete products
- Stock management and auto-adjustment
- Low-stock alerts
- Supplier and purchase records
- CSV product import/export

### Offline Functionality
- IndexedDB local caching
- Queue for pending sales and purchases
- Sync engine for online reconciliation

### Payments Integration
- M-Pesa Daraja STK Push and webhook confirmation
- Flutterwave/Pesapal gateway integration for cards
- Payment reconciliation and logs

### Reporting & Analytics
- Daily/weekly/monthly sales summaries
- Top products and sales trends
- Low-stock and profitability reports

### Multi-Device Experience
- Responsive layout for phones, tablets, desktops
- PWA installable on all major browsers
- Optimized for touch and keyboard input

### User & Access Control
- User roles (cashier, owner, admin)
- Secure JWT-based authentication
- Role-based feature access

### Onboarding & Localization
- Simple shop setup wizard
- English and Kiswahili language support
- Tutorials and guided setup screens

---

## 4. Technology Stack
### Frontend
- **Framework:** Next.js (App Router)
- **UI:** React + TailwindCSS + ShadCN UI
- **State:** Zustand
- **Offline:** Workbox + localForage
- **Barcode:** html5-qrcode
- **Charts:** Recharts

### Backend
- **Framework:** NestJS (TypeScript)
- **API Type:** REST
- **Realtime:** Socket.io
- **Jobs/Queue:** BullMQ (Redis)
- **Auth:** JWT + bcrypt

### Database
- **DB:** MongoDB Atlas (Mongoose ODM)
- **Offline Cache:** IndexedDB
- **Sync:** Custom batch sync endpoint with conflict resolution

### Payments
- **M-Pesa:** Safaricom Daraja API
- **Card/Bank:** Flutterwave or Pesapal SDKs
- **SMS:** Africa’s Talking / Twilio

### Hosting & DevOps
- **Frontend:** Vercel / Cloudflare Pages
- **Backend:** Railway / Render / DigitalOcean App Platform
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry + Winston logs

---

## 5. Architecture Overview
```
[PWA Client] ⇄ [NestJS API] ⇄ [MongoDB Atlas]
     ↓                     ↓
[IndexedDB + Sync]     [Daraja / Flutterwave APIs]
```

**Offline-first logic:**
- When offline, all transactions are saved in IndexedDB.
- When reconnecting, the sync module batches updates to the backend.
- Conflict resolution ensures data consistency.

---

## 6. Database Schema Summary
| Collection | Key Fields |
|-------------|------------|
| User | _id, name, phone, passwordHash, role, shopId |
| Shop | _id, name, tillNumber, ownerId, settings |
| Product | _id, shopId, name, barcode, sellPrice, quantityOnHand, reorderLevel |
| Sale | _id, shopId, items[{productId, qty, price}], totalAmount, paymentStatus, offlineId |
| Purchase | _id, shopId, supplierId, items[], totalCost |
| Supplier | _id, name, phone, shopId |
| MpesaTransaction | _id, mpesaRef, amount, saleId, status |
| StockAdjustment | _id, productId, delta, reason, shopId |

---

## 7. UI Wireframe Scope
**Screens to design:**
1. Login & Onboarding
2. POS screen (cart, barcode scan, payment)
3. Inventory list & product form
4. Reports dashboard
5. Settings (shop info, till number, language)
6. Sync status modal
7. Receipts view/share modal

**Responsive layouts:**
- Mobile: compact vertical layout
- Tablet: two-column layout
- Desktop: expanded dashboard grid

---

## 8. Offline & Sync Strategy
- All sales/purchases stored locally during offline periods.
- Periodic sync (background or manual trigger) to upload to server.
- Conflict handling based on timestamps and offlineId deduplication.
- Notifications for sync errors or stock discrepancies.

---

## 9. Security & Compliance
- HTTPS enforced for all connections.
- Passwords hashed (bcrypt, salt ≥ 10).
- JWT tokens with short expiry + refresh tokens.
- Validate and sanitize all inputs.
- No sensitive payment info stored.

---

## 10. Deployment & CI/CD
- Automatic builds via GitHub Actions.
- Staging and production environments.
- Continuous deployment to Vercel (frontend) and Railway (backend).
- Nightly database backups (MongoDB Atlas automation).

---

## 11. Pilot Plan
**Pilot Goals:**
- 10–20 shops using live version.
- Validate performance, offline sync, and M-Pesa reliability.

**Activities:**
- Field testing, bug logging, feature feedback.
- Collect testimonials and improve onboarding.

---

## 12. Future Roadmap (Post-MVP)
- Multi-branch dashboard
- Accounting integration (QuickBooks, Xero)
- Supplier ordering portal
- Loyalty program
- Expense tracking & employee shifts
- Reseller white-label version

---

## 13. Developer Guidelines
- Use TypeScript strict mode.
- Follow ESLint + Prettier conventions.
- Conventional commits for PRs.
- Include test coverage and documentation in every feature branch.

---

## 14. Deliverables Checklist
- ✅ Multi-device responsive PWA
- ✅ Offline-first POS and Inventory modules
- ✅ M-Pesa payment integration
- ✅ MongoDB-based backend API
- ✅ Sync engine with conflict resolution
- ✅ Pilot-ready deployment on staging
- ✅ Developer documentation and runbook

---

## 15. Next Steps for Cascade
- Initialize monorepo (Next.js + NestJS)
- Generate base models and endpoints
- Build responsive UI components
- Connect M-Pesa sandbox integration
- Implement offline sync engine
- QA testing and pilot rollout

