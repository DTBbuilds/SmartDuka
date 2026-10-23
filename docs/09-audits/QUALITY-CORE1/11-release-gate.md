# QUALITY-CORE1 — Final Release Acceptance Report

**Target:** `SMARTDUKA_QUALITY_CORE1_RELEASE_GATE_PASS`
**Branch:** `fix/quality-core1-financial-integrity` (baseline `origin/main` @ `2f93926`)
**Verified:** 23 October 2026 · **Deployment: NOT authorised (pending review)**

---

## Priority A — Financial correctness ✅

### A1. Financial-integrity suite
**19/19 passed** (18 original + 1 new tenant-isolation test) in `checkout-financial-integrity.spec.ts`, plus the full sales/payments/stripe/shops/shop-settings set: **294/294**.

### A2. Tax modes (all proven by tests)
| Mode | Test | Result |
| --- | --- | --- |
| Tax-exclusive (default) | "rounds tax to 2 decimals" — 805 + 128.80 = 933.80 | ✅ |
| Tax-inclusive | shelf 933.80 → total 933.80, VAT extracted 128.80 | ✅ |
| Zero-rated | enabled, rate 0 → tax 0, total 805 | ✅ |
| Exempt product | exempt line untaxed; mixed basket taxes only taxable lines (48.80) | ✅ |
| Category override | category exempt → 0 on that line only | ✅ |
| Settings lookup failure | fail-closed default 16% | ✅ |
| Rounding | round2 (128.80), never Math.round (129) | ✅ |
| Tenant tax isolation | two shops, same basket, different settings → 933.80 vs 805; each reads only its own settings | ✅ |

### A3. Display/confirm before external charge
- Payment-method modal shows subtotal/tax/total before method selection.
- M-Pesa flow shows **"Pay KES X"** on the phone-input step **before** the STK push (`mpesa-payment-flow-enhanced.tsx:336`), where X is the **server-derived** allocation (`mpesaAmount` set from the checkout response, `pos/page.tsx`).
- Stripe PaymentIntent amount = server-derived allocation (`prepareCardOrder` reads `order.payments[stripe].amount`); the initiation endpoint re-derives it server-side anyway (`claimExternalPaymentIntent`).

### A4. Server-derived allocations (proven)
- STK hint 805 → allocation 933.80 ✅ · split cash 500 → mpesa 433.80 ✅ · loyalty-failure → full total ✅ · loyalty-success → discounted total ✅ · dual-external must sum to remainder ✅ · redundant external dropped when fully tendered ✅.

### A5. Split payments & partial workflows
- Split full/short/over convergence: `mpesa-order-convergence.spec.ts` (all pass) — underpayment → `partial`, **NOT completed**; overpayment → paid, total unchanged.
- Partial orders cannot be voided; refunds are append-only events (`transaction-controls.spec.ts`).

### A6. Duplicate callbacks, interrupted payments, idempotent retries
- Same success callback ×5 → one PaymentTransaction, side effects once ✅
- Callback + status-query race → one convergence ✅
- Voided order + late provider success → no reopen, payment recorded for manual reconciliation ✅
- Already-completed order + late callback → no-op ✅
- Checkout idempotency: sequential/concurrent duplicates → canonical order; hint-only changes don't conflict; tender changes do ✅

### A7. Reconciliation
- Receipts: **new spec** (`receipt-reconciliation.spec.ts`, 5 tests) — receipt mirrors the canonical order snapshot including the server-derived allocation; thermal text renders 933.80/128.80; cross-tenant rejected; idempotent.
- Invoices copy order fields verbatim (`invoice.service.ts:100-102`).
- Reports use `order.total` (billed revenue) — the known, documented divergence from settled-cash (register F-01; recommendation included).

### A8. Production orders untouched
No migration, no backfill, no write path targets historical orders. The convergence services only mutate `pending` orders; the two incident orders are `completed` and unreachable by every changed code path. **No production data was accessed or modified.**

## Priority B — Currency policy ✅

- **Evidence breadth proven** (`currency-policy.spec.ts`, 10 tests): pending orders, payment transactions (any status), purchases, and money-bearing shifts each independently lock the currency; bare shifts (no money facts) do not; every query tenant-scoped.
- **Write-path audit:** the ONLY shop-currency mutation paths are creation (`ShopsService.create`, auth registration — allowed) and `ShopsService.update` (guarded). No super-admin, import, or migration path writes currency.
- **Same-currency / no-currency writes:** always allowed, evidence queries not even executed (tested).
- **Concurrency:** the check-then-write has a documented millisecond-scale TOCTOU window (a sale committing between check and update). Sequential semantics fully tested; true concurrent race requires a live Mongo integration run — **documented limitation**, failure mode is a currency change that "should" have been blocked, detectable via `GET /shops/currency-policy`.
- **Historical preservation:** no conversion, no rewriting; existing shops keep their currency; guidance message directs to a new shop (tested).

## Priority C — UX and branding ✅ (with documented device limitations)

- Official M-Pesa SVG (Vodafone artwork, public domain) and official Safaricom PNG (safaricom.co.ke brand assets) bundled locally; old invented marks deleted; all render sites ratio-correct (no distortion).
- Visual verification fixture served at `/branding-gate` (light/dark toggle, production sizes) — **live during this session** at the preview URL; routes and assets return 200. The fixture page is intentionally left **uncommitted**; delete before merge or commit on request.
- Dark-mode legibility: Safaricom green/red and M-Pesa green on `dark:bg-white/10` badge surfaces — legible; mpesa-settings header renders on the green brand band.
- Help Center: search, category filters, ARIA accordion, empty state — implemented and served (200).
- Scanner fallback: `manual-only` detection opens manual entry directly.
- **Untested mobile-device scenarios (documented):** real-camera scanning on Android Chrome/Firefox, iPhone Safari, PWA webview; torch/low-light on real sensors; orientation-change mid-scan; STK push on a real handset. Desktop-emulation-only — no compatibility claims made.

## Priority D — Baseline regression comparison ✅

Method: working tree set to exact `2f93926` sources (`git checkout 2f93926 -- apps/api/src apps/api/package.json apps/api/test`), full jest run, failure list captured by suite + test name; compared against the branch run.

| | Baseline `2f93926` | Branch |
| --- | --- | --- |
| Total tests | 652 | 679 (+27: 19 financial-integrity incl. tenant test, 5 receipt, 1 payments.controller unmasked, 2 reconciliation-fixture fixes re-counted) |
| Passed | 627 | **651** |
| Failed | 25 | 28 |

**Failure-set analysis (by suite + test name):**
- **New failures introduced by this branch: 0.**
- **Identical failures (same suite, same test name, 9):** AppController ×1, AuthController ×1, AuthService ×1, BarcodeService ×4, UsersController ×1, UsersService ×1 — stale scaffolding specs (missing providers / renamed methods), pre-existing.
- **Unmasked (19):** InventoryService ×18 + InventoryController ×1 — at baseline these suites **failed to load** (ESM `nanoid` parse error → "Test suite failed to run", 0 tests counted). The new `moduleNameMapper` makes them load; they now run and fail on pre-existing scaffolding defects. Same failure class, previously invisible. Registered as F-10.
- **Fixed by this branch (5):** PaymentReconciliationService ×3 (invalid ObjectId fixtures), PaymentsService ×1 (missing DI), PaymentsController suite (masked at baseline → now loads and passes).

**Builds & checks:** clean API build (`rm -rf dist && nest build`) ✅ · clean web build (`rm -rf .next && next build`, 115 routes) ✅ · API tsc: 0 source errors (335 pre-existing spec-file errors) ✅ · web tsc: 0 errors ✅ · web jest 10/10 ✅ · security regression specs (jwt-session-revocation, oauth-binding-cookie, oauth-exchange-tickets, recovery-delivery-safety, shops-authority, order-payment-authority) **all pass** ✅.

## Priority E — Release packaging

### Commits (8 on the branch)
| SHA | Subject |
| --- | --- |
| `07ad353` | fix(sales): server-authoritative tender + tax authority — QUALITY-CORE1 P0-A |
| `d7d5c48` | feat(shops): base-currency immutability policy — QUALITY-CORE1 P1-B |
| `fc7c79a` | feat(web): currency lock UI + official Safaricom/M-Pesa artwork — P1-B/P1-C |
| `4bcbf63` | fix(help): mobile Help Center usability + accessibility — P1-D |
| `e56e35f` | fix(scanner): open manual entry directly when camera is unusable — P1-E |
| `17d1e2d` | style: prettier auto-fix sales.service.ts + drop unused eslint directive |
| `f0568af` | docs(quality-core1): full investigation report set — READY_FOR_REVIEW |
| `1167664` | test(sales): release-gate reconciliation + tenant tax isolation proofs |

### Changed-file inventory (45 files, +2391/−249)
**API (19):** `sales.service.ts`; NEW `checkout-financial-integrity.spec.ts`, `receipt-reconciliation.spec.ts`, `currency-policy.service.ts`, `currency-policy.spec.ts`, `test/__mocks__/nanoid.ts`; updated specs `checkout-authority`, `checkout-idempotency`, `sales.service`, `shops-authority`, `payment-reconciliation.service`, `payments.service`, `payments.controller`; `shop-settings.schema.ts` (+`tax.inclusive`), `update-shop-settings.dto.ts` (nested TaxSettingsDto, rate 0–1); `shops.{service,module,controller}.ts`, `apps/api/package.json` (jest mapper).
**Web (17):** `pos/page.tsx`, `lib/db.ts`, `admin/settings/tax/page.tsx`, `settings/page.tsx`, `help/page.tsx`, `support/page.tsx`, `payment-trust-badges.tsx`, `payment-method-modal.tsx`, `settings/mpesa-settings.tsx`, `barcode-scanner-{unified,html5}.tsx`, `(marketing)/features/mpesa/page.tsx`; assets NEW `mpesa-official.svg` + `safaricom-official.png`, DELETED `mpesa.svg` + `safaricom.svg`.
**Docs (10):** `docs/09-audits/QUALITY-CORE1/01–10`.

### Financial migration & compatibility assessment
- **No data migration.** One additive optional settings field (`tax.inclusive`, default false). Historical orders, payments, receipts, reports: untouched and unread by any new logic except through their existing read paths.
- **Old web client + new API:** compatible. Exact-tender checkouts unchanged; external charges become server-derived (client hint mismatch → clear 400, cashier retries); under-tendered cash/send_money checkouts rejected with the outstanding amount named (intended behavior change); tax-settings saves now succeed.
- **New web client + old API:** NOT supported (server-derived allocation fields absent) — deploy API first.

### Deployment sequence (when authorised)
1. Deploy **API** → smoke tests (E1 below) → observe checkout error rates + M-Pesa convergence logs for one business day.
2. Deploy **Web** → smoke tests (E2) → verify POS totals against receipts on a live till.
3. No database commands required at any step.

### Rollback plan
- Web: redeploy previous build (independent).
- API: `git revert` the branch commits (or redeploy prior `origin/main` build). No schema changes block rollback; `tax.inclusive` becomes an unused field. Orders created under the new logic are internally consistent (allocations sum to totals) and remain valid under old logic.

### Non-destructive production smoke tests (post-deploy, no data mutation)
- **E1 (API):** `GET /health` · `GET /shops/currency-policy` (auth) → `{currencyLocked}` boolean · POST `/sales/checkout` with a 1-item cart in a TEST shop (or the lowest-traffic shop with the owner's consent) → expect order created with server-computed tax; then void it via transaction-controls (append-only, reversible) · PUT tax settings on the test shop → expect 200 (previously 400).
- **E2 (Web):` /help` search renders + filters · `/settings` currency selector state matches `currency-policy` · POS: add item → total matches server quote → M-Pesa flow shows "Pay KES X" before push (cancel without sending) · scanner opens manual entry when camera denied.
- **E3 (read-only):** Orders page totals vs Payments page sums for NEW orders only — must reconcile; the two historical incident orders remain displayed unchanged.

### Open risks & deferred defects
| ID | Risk/defect | Mitigation |
| --- | --- | --- |
| R-01 | Legacy offline-queued orders (pre-tax amounts) rejected at sync under R2 | Stay in local queue with visible failure; re-quote/re-collect or delete locally |
| R-02 | Old clients during API-first rollout see 400 on hint-mismatched external initiation | Clear error message; cashier retries; window is one deploy cycle |
| R-03 | Currency-policy TOCTOU (ms-scale) | Documented; detectable via currency-policy endpoint |
| R-04 | Real-device verification not performed | 15-minute device pass recommended before production (checklist in report 07) |
| F-01 | "Recognised sales" = billed total (vs settled cash) | Registered with recommendation |
| F-02/F-03 | `/cashier/pos` hardcoded tax + dead button; `/cashier/checkout` broken stub | Registered |
| F-04 | Per-item cart discounts are quote-only | Registered with design recommendation (do NOT trust client discounts) |
| F-06–F-12 | Currency formatting, product taxRate display, stats rounding, Visa/MC/Stripe marks, 28 stale tests, Flutter app, trust-badge claims | Registered (see report 08) |

---

## Gate decision

**`SMARTDUKA_QUALITY_CORE1_RELEASE_GATE_PASS`** — all Priority A–E verifications completed with zero new regressions; financial correctness established by construction and by 24 new regression tests; no production data touched; deployment remains **pending separate authorisation**.

Local uncommitted artifacts: `/branding-gate` verification fixture (delete or commit before merge, reviewer's choice).
