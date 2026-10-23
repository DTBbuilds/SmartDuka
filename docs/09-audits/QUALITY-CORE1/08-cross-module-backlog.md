# QUALITY-CORE1 — Cross-Module Consistency Backlog (P1-F)

Reproducible issue register. Each item: evidence → impact → recommended action. Items marked **fixed** are on this branch; the rest are the backlog.

| ID | Pri | Module | Defect | Evidence (file:line) | Status |
| --- | --- | --- | --- | --- | --- |
| F-01 | P1 | Analytics/Dashboard | "Recognised sales" = billed `order.total` on completed orders, while the Payments page counts settled transactions — partial orders inflate revenue vs cash received | `sales.service.ts:1209-1218` (cashier stats), `payment-transaction.service.ts` (stats) | **Registered** — recommend adding a `recognisedSales` metric = Σ completed payments on completed orders, shown beside billed revenue |
| F-02 | P1 | POS (cashier role) | `/cashier/pos` hardcodes 16% tax and ignores shop settings; its "Proceed to Checkout" button is dead (no onClick) | `app/cashier/pos/page.tsx:102-104, 239-241` | **Registered** — wire settings-driven tax + real checkout, or retire the page in favor of `/pos` |
| F-03 | P1 | Cashier checkout | `/cashier/checkout` is an orphaned broken stub: sends `items: []` with fields the CheckoutDto rejects (`subtotal`, `discount`, `total`, `paymentMethod`, `paymentAmount`); nothing links to it | `app/cashier/checkout/page.tsx:19-42` | **Registered** — delete or rebuild |
| F-04 | P1 | POS/Discounts | Per-item cart discounts (`ItemDiscountModal`) are display-only — checkout ignores them: cash → under-tender rejection (post-R2), external → customer charged the undiscounted total | `pos/page.tsx:1854-1866`, `sales.service.ts` (no discount input) | **Registered** — route ad-hoc discounts through the discounts engine / transaction-controls approval; do NOT trust client-sent discounts (reopens the undercharge hole) |
| F-05 | P2 | POS | Offline fallback payload previously fabricated `taxRate: 0.02` (server ignores dto.taxRate) | `pos/page.tsx` (removed) | **Fixed** (07ad353) |
| F-06 | P2 | Currency formatting | POS cart components hardcode "Ksh" prefix regardless of shop currency | `pos-cart-compact.tsx:9`, `pos-cart-sidebar.tsx`, `pos-checkout-bar.tsx`, `pos-mobile-cart-sheet.tsx` | **Registered** — thread shop currency through `formatCurrencyIntl` |
| F-07 | P2 | Inventory UI | Product detail shows "Tax Rate: N%" reading `product.taxRate`, a field the API product does not expose (schema field is `tax`, unused by checkout) | `inventory/[id]/page.tsx:53,362`, `product.schema.ts:33` | **Registered** — either expose per-product taxRate end-to-end or remove the display |
| F-08 | P2 | Stats rounding | Cashier/analytics averages `Math.round` to integers (loses cents) | `sales.service.ts:1235`, `payment-transaction.service.ts:432,556` | **Registered** — use 2-decimal rounding for money |
| F-09 | P2 | Branding | Visa/Mastercard/Stripe marks are generic text approximations (same class as the old fake Safaricom marks) | `apps/web/public/images/payments/{visa,mastercard,stripe}.svg` | **Registered** — replace with official artwork under the P1-C policy |
| F-10 | P2 | Test debt | 28 pre-existing failing API tests in 8 stale suites (users/inventory/auth/app scaffolding: missing providers, stale method names); 19 were previously hidden behind an ESM `nanoid` parse error that the new moduleNameMapper unmasked | `src/users/**`, `src/inventory/{barcode,inventory}.{service,controller}.spec.ts`, `src/auth/{auth.service,auth.controller}.spec.ts`, `src/app.controller.spec.ts` | **Registered** — refresh scaffolding specs; not financial |
| F-11 | P2 | Mobile (Flutter) | `smartduka_mobile` cannot compile: imports `providers/checkout_provider.dart` which does not exist; hardcodes `taxRate: 0.16` and "Tax (16%)" | `smartduka_mobile/lib/screens/checkout/checkout_screen.dart:4,531` | **Registered** — the production mobile path is the Capacitor-wrapped web app; decide Flutter app's fate |
| F-12 | P3 | Marketing | "PCI Compliant / Verified" trust badges are unverified self-claims (not Safaricom-related) | `payment-trust-badges.tsx:101-109` | **Registered** — replace with factual statements or certification evidence |

## Explicitly audited, found sound

- Tenant isolation on orders/payments/settings/shops (JWT-shop scoping, deny-closed cross-tenant tests exist and pass).
- Refund/void interlocks (append-only events, partial orders not voidable, external refunds `manual_required`).
- Checkout idempotency (tenant-scoped unique index + intent fingerprint).
- Stock mutation exactly-once evidence (`sale:<orderId>:<productId>` mutation ids).
- Stripe/M-Pesa initiation authority (allocation-claimed, void-interlocked, no double-push).
