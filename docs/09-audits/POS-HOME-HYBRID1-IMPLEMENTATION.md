# SMARTDUKA-POS-HOME-HYBRID1 — Implementation and release review

**Status:** Implemented on isolated feature branch; draft PR #5. **Not merged or deployed to production.**

**Repository:** DTBbuilds/SmartDuka  
**Baseline:** `c39cf8fcdfe2ca5305b4ec65708c55c8c25652f1`  
**Design:** PR #4 (`design/pos-home-role-adaptive1`)  
**Implementation:** PR #5 (`feat/pos-home-hybrid1`)

## Implementation

### Admin home (`apps/web/src/app/admin/page.tsx`)

- Retained `AuthGuard requiredRole="admin"` and existing merchant/branch contexts.
- Replaced the secondary outline Open POS link with the prominent `/pos` hero. An account with **confirmed zero products** instead receives Add First Product.
- Showed two immediately scannable mobile metrics (sales/orders) and four desktop metrics, plus two-column mobile quick actions.
- Added shop-wide low-stock, branch management, and payment-availability notices.
- Uses `GET /inventory/stats` for the **actual shop product total**, instead of counting a `limit=200` list. This endpoint's aggregation is shop-wide, not branch-specific, and the UI discloses it.
- Uses `GET /sales/stats?branchId=...` for authorized branch-context sales.
- Loads sales, inventory, and the **public, read-only** `GET /payments/mpesa/pause-status` independently; aborts older in-flight requests on branch selection change.
- Explicitly distinguishes zero, loading, request failure, and unknown payment availability; never assumes a failed read returned zero.
- Keeps the existing `BranchSelectionModal`; no forced selection popup.

### Cashier home (`apps/web/src/app/cashier/dashboard/page.tsx`)

- Retained authenticated cashier-specific sales endpoint `GET /sales/cashier-stats` and `GET /shifts/current`.
- The shift status is fetched independently, and failures are **not** equated to "no shift".
- `resolveCashierHomeAction()` resolves:
  - no shift → Start Shift;
  - active shift, not on break → Open POS;
  - active shift on break → End Break, with POS navigation disabled;
  - closed/reconciliation pending → View Shift Close;
  - loading/error → Check/Retry Shift Status without POS navigation.
- Preserved existing `shiftActivityTracker` initialization, subscription, and break start/end methods.
- Displays own daily sales/transactions and only the authenticated cashier's receipt feed.
- Includes shift summary, end-shift navigation, branch-agnostic cashier role shell, and operational errors.
- Does not introduce new shift-opening, reconciliation, or payment-authority logic.

### Shared UI and tests

- `apps/web/src/components/pos-home-ui.tsx`: `POSHomeHero`, `POSHomeMetric`, `POSHomeQuickActions`, `POSHomeNotice`, `POSHomeBottomNav`.
- The mobile nav appears **only on home pages**, never inside POS checkout where it could overlap cart/payment controls.
- Links and buttons are semantically actionable, touch targets are at least 44 CSS px, and keyboard focus styles are explicit.
- `apps/web/src/lib/pos-home-logic.ts` holds pure readiness rules.
- `apps/web/src/lib/pos-home-logic.spec.ts` tests zero-vs-unknown, active-shift POS eligibility, break restriction, shift initialization, reconciliation pending, and unavailable/invalid metrics.

## Safety boundaries

No API, payment controller, subscription, database schema, cashier-role guard, Stripe or M-Pesa configuration changes. M-Pesa status is displayed for awareness only and **cannot activate a payment method**.

No production merchant data or real payment interactions.

The existing `/admin/dashboard` legacy page remains unchanged; redirect/removal requires a separately scoped navigation compatibility review. The `feat/cashier-journey1`, `fix/cashier-admin-freeze1`, and `fix/error-ux-reliability1` parallel branches were not modified.

## Verification

- Vercel non-production Git-preview build at the latest commit was reported **READY**.
- Hosted GitHub Actions CI is triggered on draft PR #5. **Do not claim PASS unless the exact final commit completes all required checks.**
- Authenticated browser/device interaction testing remains to be performed using authorized test accounts. The initial UX wireframes had Chromium rendering coverage; that is not equivalent to testing the integrated application.
- Unit tests: the new pure helper suite contains six scenarios; final actual test counts must be recorded from hosted CI or a verified local environment.

### Manual acceptance matrix

1. Admin with products: Open POS visible on first screen at 320/360/390/430 widths, navigates to `/pos` in one tap.
2. Admin with zero products: Add First Product is primary; operations remain reachable.
3. Admin with failed/stale API response: shows `—` and retry, not `0`.
4. Switch branches mid-request: prior-branch metrics must not reappear.
5. Admin payment status: `paused:true` displays paused warning; unknown is not treated as enabled.
6. Cashier without shift: Start Shift, no direct checkout action.
7. Cashier active: Open POS and own shift metrics, no company-wide analytics.
8. Cashier on break: End Break, POS navigation disabled.
9. Cashier unknown/pending shift: safe retry/resolve, no fabricated ready state.
10. Keyboard, focus, reduced-motion, screen reader, mobile navigation and checkout-overlay checks.

## Release plan

1. Finish hosted CI and confirm exact head revision.
2. Exercise authenticated preview on representative mobile/desktop viewports; check the ten cases above.
3. Reconcile the unpublished cashier and error UX branches before merging.
4. Retain current `/admin/dashboard` route until an explicit redirect plan is tested.
5. Recheck production payment pause/allowlist before *any later* deployment.
6. Merge only after owner review and authorization. Production deployment is not authorized by this design implementation task.

**Verdict:** IMPLEMENTED / DRAFT REVIEW, not production GO until CI and authenticated acceptance complete.
