# SMARTDUKA POS-CURRENCY-CHECKOUT-DEPLOY1 — Release Decision Report

**Outcome:** `SMARTDUKA_POS_CURRENCY_CHECKOUT_DEPLOY1_PASS`
**Date:** 23 October 2026 (19:22–19:30 AEDT / 08:22–08:30 UTC)
**Deployed SHA:** `609041c` (fast-forward push `389ebc2..609041c`, no force)

---

## 1. The mandatory pre-push verification — the probe WAS a false positive

The reviewer's challenge was correct and material:

| Probe | Against the CURRENTLY DEPLOYED (previous-release) API | Old heuristic (`status !== 404`) |
| --- | --- | --- |
| `GET /shops/currency-policy` | **401** — the endpoint ALREADY EXISTS (shipped in the deployed QUALITY-CORE1 release) | → "capable" → sends `expectedTotal` → **old API 400s every checkout** |
| `GET /sales/checkout-capabilities` (new) | **404** — exists only in the candidate | → not capable → legacy mode ✅ |

**Proof by booting the actual pre-candidate API** (commit `389ebc2` sources, real build, real process):
- probe → **404** ✅
- checkout WITH `expectedTotal` → **400 "property expectedTotal should not exist"** (the forbidNonWhitelisted hazard, real) ✅
- checkout WITHOUT the field → passes validation (reaches business logic) ✅

**Correction shipped (`609041c`):**
- New dedicated endpoint `GET /api/v1/sales/checkout-capabilities` → `{ quoteIntegrity: true, expectedTotal: true }` — exists ONLY in releases accepting the field.
- `probeSupportsQuoteIntegrity(status)` — **only an affirmative 200 enables the field**; 404/401/403/5xx/network failure all degrade to legacy mode (unit-tested: 4 cases).

## 2. Both deployment orders + full enforcement — proven end-to-end

Real API processes + real local MongoDB (throwaway `deploy1_e2e` database, dropped afterwards; production untouched):

| Order | Evidence |
| --- | --- |
| **New frontend + old API** | Live production API (old): probe 404 → legacy mode → field never sent → checkout works (field-less payloads accepted by the old API — proven) |
| **Old frontend + new API** | E2E: field-less checkout → **order created** (`STK-2026-33DS6Q`, total 725, `currency: "KES"` snapshot, paid) |
| **New frontend + new API** | E2E: probe → 200 `{quoteIntegrity, expectedTotal}` → matching quote (725) → order created paid; **stale quote (625 vs 725) → 409** with no order created and **stock unchanged (9, only the successful sale deducted)**; empty cart → 400; duplicate submission → same order returned twice (idempotent) |

## 3. Re-run verification (post-correction)

- Financial/security/shops/settings/super-admin suites: **344/346** — the only 2 failures are the pre-existing auth scaffolding specs; full-suite failure set **byte-identical to the pre-change baseline** (0 new).
- New tests now total **36** (13 currency/quote + 6 remediation + 13 client session/probe + 4 probe-decision cases… precisely: 13 + 6 + 15 web + 2 endpoint-contract).
- API clean build ✅ (dist contains the capabilities route) · web clean build ✅ (115 routes) · web tsc 0 errors · web jest **25/25**.
- FREE_MODE: 0 diff lines in auth/subscriptions/stripe across the release range.

## 4. Deployment

- **`origin/main` confirmed unmoved** at `389ebc2` immediately before the push; push was a clean fast-forward `389ebc2..609041c` (no force).
- **Render:** new API live at **08:25:44 UTC** (probe 404 → 401 marks the new build), `/health/live` 200 on every poll — **no observable downtime**; `/health` → mongodb/heap/rss all up; checkout route guarded (401); public surfaces intact (shop discovery 200, ping 200).
- **Vercel:** fresh deployment serving at **08:26:28 UTC** (asset Last-Modified, seconds before verification) — matches the pushed SHA by construction; `/help` 200.
- **Production checkout/currency/cart behaviour:** the capability endpoint is live (401 unauth = route exists); the corrected probe + quote integrity + currency snapshot + cart-preservation code are all in the deployed build (verified in the built artifacts of the same SHA). An authenticated POS click-through requires a shop session (reviewer-run; no transactions were created for acceptance).

## 5. Preservation

- **Financial records:** read-only inspection re-confirmed — 6 orders / 6 payment transactions in the DB, **Load & Go untouched** (currency AUD, records unchanged). **No currency remediation was executed.**
- **FREE_MODE:** unchanged (0 diff lines).
- **No production financial transaction was created or modified** for acceptance.

## 6. Rollback readiness

- Plain `git revert` of `2886aa3`/`9640ab1` + fast-forward push, or dashboard redeploy of `389ebc2`. No migrations; two additive optional surfaces (`expectedTotal` DTO field, `order.currency`). Orders created with the new fields remain valid under the old code.
- The corrected probe makes ANY future deploy order safe by construction.

## 7. Remaining risks / deferred

- Load & Go legacy currency (AUD config vs KES history): remediation endpoint ready, restricted, audited — **awaiting separate authorisation**; 4 historical under-tendered partials (4,294.36) remain a business decision.
- 28 pre-existing test failures (stale scaffolding specs) — registered, not financial.
- Real-device verification still outstanding (documented).
- Authenticated POS runtime click-through on production not performed (no session credentials) — structural + E2E-local evidence stands in.

**Final: `SMARTDUKA_POS_CURRENCY_CHECKOUT_DEPLOY1_PASS`**
