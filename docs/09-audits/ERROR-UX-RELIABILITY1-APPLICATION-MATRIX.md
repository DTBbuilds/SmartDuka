# ERROR-UX-RELIABILITY1 — Application Matrix (route-by-route audit)

**Repository:** DTBbuilds/SmartDuka · **Branch:** `fix/error-ux-reliability1` (baseline `origin/main` @ `c39cf8f`)
**Method:** automated route inventory (114 routes, `scripts/tmp-route-inventory.cjs` → `route-inventory.json`), defect-pattern scans across all pages, deep code inspection of the critical routes, live production probes. No route is marked PASS without examined behavior; routes not deeply inspected are marked INSPECTED-STRUCTURAL (structure verified, behavior not exercised end-to-end).

**Automated scan totals (all 114 routes):** 81/114 pages use direct `fetch(` (only 5 use the centralized client) · 67 bare `JSON.parse` call sites (SyntaxError on non-JSON) · 62 pages log errors to console only · 133 `if (res.ok)` sites without a visible else-branch · 24 pages use native `confirm()/alert()` · 13 `window.location.href` full reloads.

Severity: **P0** = safety/financial/data-loss · **P1** = broken/incorrect behavior · **P2** = UX/consistency.

---

## Group 1 — Registration, Google authentication, OTP, account recovery

| Route | Behavior examined | Verdict | Severity | Root cause / existing behavior | Correction (status) |
|---|---|---|---|---|---|
| `/login` | Google OTP ticket exchange on mount; error param rendered verbatim; OTP form → `verify-login-otp` | **FIXED (PR A)** | P0→P1 | Backend ticket write failed for `otp_verification` (fixed in AUTH-GOOGLE-OTP-HOTFIX1, merged); raw `error=` params from the old callback catch displayed DB text — the callback now redirects with a stable friendly message | Merged; frontend unchanged (already correct) |
| `/auth/callback` | Exchanges `admin_login` ticket once; nonce-bound | INSPECTED-STRUCTURAL | P2 | Ticket expired/nonce mismatch → generic message; acceptable | Covered by shared standard |
| `/auth/cashier-google-signup` | Exchanges `cashier_signup` ticket; PIN linking | INSPECTED-STRUCTURAL | P2 | Same ticket contract | — |
| `/forgot-password`, `/reset-password` | OTP/reset flow via `send-otp`/`reset-password` | INSPECTED-STRUCTURAL | P2 | Rate-limited backend (3/min, 5/min) | — |
| `/signup`, `/register-shop` | Shop registration + plan selection; `maxShops` display | INSPECTED-STRUCTURAL | P2 | See Group 2 | — |
| `/verification-pending`, `/verification-rejected` | Static status pages | INSPECTED-STRUCTURAL | — | — | — |

## Group 2 — Merchant onboarding, subscription plans, entitlements

| Route | Behavior examined | Verdict | Severity | Root cause | Correction |
|---|---|---|---|---|---|
| `/select-plan` | Plan cards render `maxShops` as "X Shops/Trucks" | INSPECTED | P2 | Does not explain main-shop-counts policy | Message standard applied via backend message (PR C) |
| `/settings` (billing/invoices tabs) | Plan limits, usage display | INSPECTED-STRUCTURAL | P2 | `usage.shops` vs `currentShopCount` dual accounting (backend) | PR C backend fix; display converges |
| `/register-shop` | Free-plan fallback `maxShops: 999` hardcoded client-side | INSPECTED | P2 | Client-side fake plan when plans fetch fails | Documented; PR D candidate |
| Backend `/subscriptions/limits/:resource` | `checkLimit` | **FIXED (PR C)** | P1 | Message "(1/1)" unexplained | Explains main-shop policy |
| Backend sync (`syncUsageCountsForShop`) | Weekly cron + on-fetch background sync | **FIXED (PR C)** | **P0** | Hardcoded `shops: 1` reset branch-incremented counts → quota over-provisioning | Counts 1 + actual branches |
| Backend branch creation | `enforceLimit` → create → `incrementUsage` | **FIXED (PR C)** | **P0** | Check-then-act race; negative decrements | Atomic claim/release, floor at 0 |

## Group 3 — Admin dashboard, branch and cashier management

| Route | Behavior examined | Verdict | Severity | Root cause | Correction |
|---|---|---|---|---|---|
| `/admin/cashiers` | List + add/edit dialog + PIN dialog + status toggle + delete | **AUDITED — DEFERRED to `fix/cashier-admin-freeze1`** | P1 | (1) submit errors render at page level BEHIND the open dialog overlay → invisible "silent failure"; (2) Radix `DropdownMenuItem onClick` → Dialog open: menu focus-restore fights the dialog focus trap (freeze class); (3) no double-submit protection on create/edit; (4) native `confirm()` delete | **Preserved:** the parallel cashier-freeze investigation owns these files; fixes land there. Shared primitives (PR B) are available for adoption |
| `/admin/cashiers/[id]` | Detail load; permissions PATCH; PIN reset | **AUDITED — DEFERRED** | P1 | `detailsRes` non-OK → renders "Unknown Cashier" with empty fields (silent failure); server error messages discarded (`throw new Error('Failed to update permission')`) | Deferred with the freeze investigation |
| `/admin/branches` | List + create/edit dialog + delete | **FIXED (PR C)** | P1 | Submit errors rendered behind the dialog overlay; no double-submit; no usage indicator | In-dialog errors, `isSubmitting` guard, live X/Y location indicator |
| `/admin/branches/[id]`, `/[id]/settings` | Branch detail/settings | INSPECTED-STRUCTURAL | P2 | — | — |
| `/admin/dashboard`, `/admin/page` | Dashboard aggregates | INSPECTED-STRUCTURAL | P2 | Multiple parallel fetches, no cancellation on navigation | PR E harness covers |
| `/users`, `/users/cashiers` | Legacy user pages | INSPECTED-STRUCTURAL | P2 | Duplicate management surface vs `/admin/cashiers` | Consolidation candidate (documented) |

## Group 4 — Inventory, products, categories, stock movements

| Route | Behavior examined | Verdict | Severity | Root cause | Correction |
|---|---|---|---|---|---|
| `/admin/inventory` | Stats + expiring products dashboard | **FIXED (PR D)** | P1 | HTTP failures silent → zeros rendered as real data | Per-section failure detection + ErrorBanner with retry |
| `/inventory/[id]`, `/inventory/[id]/edit` | Product detail/edit | INSPECTED-STRUCTURAL | P2 | Direct fetch, bare JSON.parse | Shared standard adoption |
| `/admin/products`, `/admin/categories` | Management lists | INSPECTED-STRUCTURAL | P2 | — | — |
| `/stock/adjustments`, `/admin/stock-transfer`, `/admin/stock-transfers` | Stock movements | INSPECTED-STRUCTURAL | P2 | Financial-adjacent: server-authoritative mutation rules exist (P0 stock suites) | Regression suites preserved green |

## Group 5 — POS checkout, orders, receipts

| Route | Behavior examined | Verdict | Severity | Root cause | Correction |
|---|---|---|---|---|---|
| `/pos` (main POS) | Hardened checkout (quote integrity, retry payload, checkout session) | INSPECTED (deep) | — | QUALITY-CORE1/POS-CURRENCY hardening present | Preserved; PR E harness covers double-submit |
| `/cashier/pos` | Simple POS terminal | **AUDITED** | P1 | Product fetch failure → console only (no error/empty distinction); **hardcoded 16% client-side tax** inconsistent with server-authoritative tax settings | PR D candidate: use server quote path or remove duplicate surface |
| `/cashier/checkout` | **STUB** | **AUDITED** | **P0-adjacent** | Posts an EMPTY order (`items: []`, totals 0) to `/sales/checkout`; failures only `console.error`; success = full-page reload | Do not use; PR D: redirect to `/pos` or remove route (no links found pointing at it) |
| `/orders`, `/cashier/receipt` | Order lists/receipt | INSPECTED-STRUCTURAL | P2 | — | — |

## Group 6 — Payments, refunds, returns, reconciliation

| Route | Behavior examined | Verdict | Severity | Root cause | Correction |
|---|---|---|---|---|---|
| `/payments` | Payment history | INSPECTED-STRUCTURAL | P2 | Direct fetch | — |
| `/admin/payments`, `/admin/reconciliation`, `/admin/returns` | Financial ops | INSPECTED-STRUCTURAL | P2 | M-Pesa globally paused (verified on production); convergence suites green | No changes (payment safety boundary) |
| Backend payments module | Callback + reconciliation | **PRESERVED** | — | MPESA-P0-CONVERGENCE1 chain (deployed, paused) | Untouched by this task — verified zero payment files in diff |

## Group 7 — Cashier shifts and operational reporting

| Route | Behavior examined | Verdict | Severity | Root cause | Correction |
|---|---|---|---|---|---|
| `/cashier/shift-start`, `/cashier/shift-end` | Shift lifecycle | INSPECTED-STRUCTURAL | P2 | — | — |
| `/cashier/void-refund` | Void/refund with permissions | INSPECTED-STRUCTURAL | P2 | Server-side authority enforced (cashier-P0 suites) | Suites green |
| `/admin/staff-monitoring`, `/admin/staff-assignment`, `/branch-manager/dashboard` | Monitoring | INSPECTED-STRUCTURAL | P2 | — | — |

## Group 8 — Analytics, settings, notifications, support

| Route | Behavior examined | Verdict | Severity | Root cause | Correction |
|---|---|---|---|---|---|
| `/admin/analytics/*` (7 routes) | Aggregates | INSPECTED-STRUCTURAL | P2 | Read-only; failures → empty charts | Shared standard adoption (PR D backlog) |
| `/admin/reports`, `/reports/*` (4) | Reports | INSPECTED-STRUCTURAL | P2 | — | — |
| `/admin/settings/tax`, `/settings` | Settings | INSPECTED-STRUCTURAL | P2 | — | — |
| `/inbox`, `/help`, `/support` | Notices/help | INSPECTED-STRUCTURAL | — | — | — |

## Group 9 — Super-admin and public pages

| Route | Behavior examined | Verdict | Severity | Root cause | Correction |
|---|---|---|---|---|---|
| `/super-admin/*` (13 routes) | Platform ops | INSPECTED-STRUCTURAL | P2 | Role-gated server-side | — |
| `/(marketing)/*` (16 routes) | Static marketing | PASS (no API) | — | — | — |

---

## Cross-cutting findings (apply to ALL routes)

| # | Finding | Severity | Correction | Status |
|---|---|---|---|---|
| X1 | Backend filter leaked raw internal error messages to clients | **P0** | Canonical sanitized filter | **FIXED (PR A)** |
| X2 | Frontend auto-retried POST/PATCH/PUT/DELETE on timeout/network error (duplicate financial submissions) | **P0** | Idempotent-method-only retries + explicit opt-in | **FIXED (PR A)** |
| X3 | 401 returned a fake successful empty response | **P0** | Typed auth error thrown | **FIXED (PR A)** |
| X4 | Non-JSON/HTML gateway bodies crashed with SyntaxError | P1 | Safe parse + canonical ApiError | **FIXED (PR A)** |
| X5 | No correlation ID anywhere | P1 | RequestIdMiddleware + canonical response | **FIXED (PR A)** |
| X6 | Two competing frontend error shapes; `api-error-handler.ts` has ZERO callers (dead) | P2 | Canonical client normalization; dead module documented | FIXED (PR A/B); dead module removal deferred |
| X7 | Three notification systems (page Alerts, `useToast`+ToastContainer, dialog-embedded) | P2 | Shared primitives (PR B) + adoption | PARTIAL (PR D) |
| X8 | 24 pages use native `confirm()`/`alert()` | P2 | ConfirmDialog primitive | PARTIAL (PR B/D) |
| X9 | 13 full-page reloads (`window.location.href`) | P2 | Router-based navigation standard | Documented; adoption backlog |
| X10 | No request cancellation on navigation (caller signals discarded) | P1 | Signal combining in resilientFetch | **FIXED (PR A)** |
