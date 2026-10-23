# SMARTDUKA POS-CURRENCY-CHECKOUT-DEPLOY1 — Controlled Release Preparation

**Status:** `SMARTDUKA_POS_CURRENCY_CHECKOUT_DEPLOY1_READY`
**STOP honoured:** nothing pushed, nothing deployed, no production record modified.

---

## 1. Final candidate SHA

- **Implementation candidate:** `2886aa3` (checkout currency & quote integrity)
- **Deploy-order safety amendment:** `9640ab1` (API capability probe — see §4; REQUIRED for a safe combined push)
- **Supporting (docs + read-only inspection scripts):** `ee9cd69`, `3c0931b`, and the closeout commit containing this report
- **Ancestry:** `2886aa3` verified ancestor of local `main`; `origin/main` currently at `389ebc2` — the release push advances it by the commits above (fast-forward, no force)
- **Release tip at authorisation time:** local `main` HEAD (includes candidate + capability probe + docs)

## 2. Build and test results

| Check | Result |
| --- | --- |
| 30 new tests | **30/30** — server currency/quote integrity 13, remediation 6, client session validation 11 |
| Financial regression suites (sales/payments/shops/shop-settings/super-admin) | **314/314** |
| Security + tax + payment + tenant-isolation suites (auth oauth/session/recovery, stripe, order-payment-authority, mpesa convergence) | all pass — **342/344** with the only 2 failures being the pre-existing auth scaffolding specs |
| Full API suite failure set | **byte-identical to the pre-change baseline** (28 pre-existing scaffolding failures; 0 new) |
| API clean build (`rm -rf dist && nest build`) | ✅ |
| Web clean build (`rm -rf .next && next build`, 115 routes) | ✅ · web tsc 0 errors · web jest 21/21 |
| FREE_MODE | unchanged — 0 diff lines in auth/subscriptions/stripe across the release range; FREE_MODE code paths untouched |

## 3. Critical checkout gates — all verified

| Gate | Verification |
| --- | --- |
| Checkout cannot persist on quote/authoritative divergence | Server `expectedTotal` check → 409 BEFORE payment classification and stock reduction; tests assert `orderCtorArgs.length === 0` and `updateStock` not called (stale cart, mid-checkout pricing change, tampered quote) |
| Empty carts / zero-total fail safely | Server 400s (cart empty, subtotal > 0) + client `validateCheckoutSession` refuses before submission |
| Failed checkout preserves cart contents | 4xx path: modal closed, error surfaced, cart KEPT (catch no longer clears the cart for definitive rejections) |
| Offline queuing only for eligible transport failures | `isDefinitiveRejection` (4xx) gate; 5xx/network → offline queue with the SAME idempotency key |
| Payment confirmation cannot silently change | Bound to the FROZEN `checkoutQuote` (itemCount/total/currency captured at checkout start) — not live state |
| Consistent amounts & currency cart→order | One injected shop-currency formatter across cart/confirmation/M-Pesa flow/receipt preview; orders+payments pages display shop currency; `order.currency` snapshot server-side |
| Duplicate submissions idempotent | Tenant-scoped idempotency pre-check returns the canonical order (tests) |
| No stock movement on rejection | Quote/under-tender/over-tender guards all precede `updateStock`; asserted by tests |
| Existing valid offline orders recoverable | `expectedTotal` optional — legacy/offline payloads without it proceed unchanged (test); sync path unchanged |

## 4. Safe API-first release procedure (the race, closed)

**Hazard (verified):** Render (`autoDeploy: true`) and Vercel both deploy on a main push — a combined push does NOT guarantee API-first ordering. Worse, the OLD API's `forbidNonWhitelisted` ValidationPipe **rejects the new `expectedTotal` field**, so a web-first deploy would 400 every checkout until the API landed (Render's Nest build is slower than Vercel's Next build — the race was real).

**Resolution (implemented in `9640ab1`):** the POS probes `GET /shops/currency-policy` (an endpoint that exists ONLY in the new API) on load; `expectedTotal` is sent **only when the capability is advertised**. Consequences:
- **Web-first deploy:** new web degrades to legacy mode (no `expectedTotal`) against the old API — checkout keeps working; once the API lands, new sessions pick up the capability.
- **API-first deploy:** new web sends the field immediately; old clients (no field) unaffected.
- **Either order is safe.** API-first remains PREFERRED (full protection from the first minute).

**Recommended procedure at authorisation:**
1. Push `main` (fast-forward, no force).
2. Watch the API probe (`GET /api/v1/shops/currency-policy`: 404 → 401 marks the new API live; observed ~3 min in the previous release).
3. Verify `/health` (Mongo up) and the frontend probes (help search markup, official assets).
4. If Vercel lands first, no action needed — the capability probe covers the window; confirm checkout works after the API lands.

## 5. Production smoke-test plan (post-deploy, non-destructive)

1. **API:** `/health` → mongodb up · `GET /api/v1/shops/currency-policy` → 401 (route live) · OpenAPI `/api/docs-json` contains `ShopsController_getCurrencyPolicy`.
2. **Checkout shape (unauth):** `POST /api/v1/sales/checkout` → 401 (route exists, guarded).
3. **Frontend:** `/help` search present · `/images/payments/safaricom-official.png` 200 · old fake marks 404 · `/branding-gate` 404 (fixture excluded) · bundle origin = bare `api.smartduka.org`, no duplicated `/api/v1` prefix.
4. **Authenticated POS pass (requires a shop-admin session — reviewer-run):** add one item → cart, bottom bar, payment modal and confirmation all show the SAME amount and currency symbol → cash tender overpay → correct change → complete → receipt matches the order → Orders page total matches.
5. **No financial transactions created solely for acceptance** — the authenticated pass uses the shop's own live workflow at the reviewer's discretion.

## 6. Deployment & rollback readiness

- **Deployment readiness: HIGH.** Both builds clean; failure set identical to baseline; capability probe makes deploy order safe; no migrations (two additive optional fields: `expectedTotal` DTO, `order.currency`).
- **Rollback:** plain `git revert` of the release commits + fast-forward push (no force); or redeploy the previous build from dashboards. No schema/data blockers; orders created with `currency`/quote checks remain valid under the old code.
- **Previous release baseline:** production currently runs `fa5bffd` (app code) with docs-only follow-ups.

## 7. Remaining blocking risks

| Risk | Status |
| --- | --- |
| Load & Go legacy currency (AUD config vs KES history) | **NOT blocking this release** — remediation endpoint exists, is restricted (super-admin guard + evidence gate + idempotency + audit), and will NOT be executed in this release; the shop's records remain untouched (re-verified read-only: currency AUD, 6 orders, 6 transactions — unchanged) |
| 4 historical under-tendered partials (4,294.36 uncollected) | Business decision per order; no automatic action |
| 28 pre-existing test failures (stale scaffolding) | Registered (F-10); not financial |
| Real-device verification | Still outstanding (documented) |

## 8. Authorisation checkpoint

**STOPPING HERE per the mission.** The release is ready: push `main` (fast-forward) → verify per §5. On explicit authorisation, execute and report `SMARTDUKA_POS_CURRENCY_CHECKOUT_DEPLOY1_PASS`.
