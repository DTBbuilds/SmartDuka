# QUALITY-CORE1-DEPLOY1 — Controlled Production Release Report

**Outcome:** `SMARTDUKA_QUALITY_CORE1_DEPLOY1_PASS`
**Date:** 23 October 2026 (18:26–18:35 AEDT / 07:26–07:35 UTC)
**Production:** https://www.smartduka.org (web) · https://api.smartduka.org + https://smartduka-91q6.onrender.com (API)

---

## Phase 1 — Release authentication ✅

| Check | Result |
| --- | --- |
| Release commits verified | 9 on the branch (8 implementation + 1 gate report); HEAD `fa5bffd` |
| `origin/main` unmoved | Confirmed `2f93926` before merge (fetch + merge-base) |
| 45-file diff reviewed | No unrelated changes; auth/subscriptions/stripe diffs are **0 lines** (FREE_MODE and payment security untouched) |
| Fixtures excluded | `/branding-gate` page left uncommitted (verified 404 in production); `.oldworker_tmp/` and pre-existing untracked docs never entered the release |
| Mandatory builds re-run | API `nest build` ✅ · Web `next build` (115 routes) ✅ |
| Mandatory tests re-run | Financial/security/shops/settings suites **323/325** — the only 2 failures are the pre-existing auth scaffolding specs, byte-identical to baseline |

## Phase 2 — API-first deployment ✅

- **Integration:** fast-forward merge `2f93926..fa5bffd` into `main`; pushed `origin main` (no force). Push confirmed: `2f93926..fa5bffd main -> main`.
- **Render autoDeploy** (`autoDeploy: true`, health path `/health/live`) triggered by the push.
- **Deployment confirmation (behavioral SHA probe):** `GET /api/v1/shops/currency-policy` returned **404 (old build) → 401 (new build) at 07:29:34 UTC** — the new code is serving. `/health/live` remained 200 throughout every poll (no observable downtime during the swap).
- **Health:** `/health` → `mongodb: up`, `memory_heap: up`, `memory_rss: up` (re-checked 3× post-deploy: stable). `/health/ready` → Mongo up.
- **OAuth compatibility:** `GET /api/v1/auth/google` → **302** to accounts.google.com with the configured client and `redirect_uri=https://api.smartduka.org/...` — OAuth flow intact; the custom API domain serves the new build (401 probe on the new endpoint).
- **Non-destructive financial smoke tests:** checkout route guarded (401 unauth, route exists) ✅ · tax-settings PUT guarded (401, route exists) ✅ · new currency-policy endpoint registered and live (401 + present in `/api/docs-json` as `ShopsController_getCurrencyPolicy`) ✅. No data created or altered.

## Phase 3 — Frontend deployment ✅

- **Vercel deployment live** (auto-deploy on main push). Deployment-shape probes:
  - `/help` serves the new Help Center (search markup present) ✅
  - `/images/payments/safaricom-official.png` → 200, `/images/payments/mpesa-official.svg` → 200 (official artwork deployed) ✅
  - Old invented marks `/images/payments/safaricom.svg` → 404 (removed) ✅
  - `/features/mpesa` shows "Integrated with M-Pesa (Daraja API)" (claim fix live) ✅
  - `/branding-gate` → 404 (fixture correctly NOT deployed) ✅
- **API origin wiring:** deployed JS bundle contains exactly `https://api.smartduka.org` (×2, the bare origin) — **no** onrender fallback leak, **no** duplicated `/api/v1/api/v1` prefixes (0 hits) ✅
- POS/settings pages are server-side auth-gated (307 unauth) — their bundles ship in the same commit build; runtime verification requires an authenticated session (see limitations).

## Phase 4 — Production acceptance

| Item | Verdict | Evidence |
| --- | --- | --- |
| Tax-inclusive / tax-exclusive / zero-rated / exempt calculations | ✅ verified by tests | 19/19 financial-integrity suite; production data untouched by design (no synthetic transactions created on live tills) |
| Server-derived payable amounts | ✅ deployed + test-proven | Allocation authority in the live build; behavioral probe confirms release code |
| Payment reconciliation | ✅ deployed + test-proven | Convergence suites (duplicate callbacks ×5, races, monotonic lifecycle) all pass |
| Partial-payment / outstanding balance | ✅ deployed + test-proven | Under-tender rejection + partial toast; split-payment convergence tests |
| Currency-change restrictions | ✅ live | `GET /api/v1/shops/currency-policy` registered (401 unauth, OpenAPI-listed); enforcement test-proven |
| Orders/payments/receipts/dashboard consistency | ✅ test-proven; live-view check requires auth | Receipt-reconciliation spec; F-01 (billed-vs-settled revenue) remains a registered, documented divergence |
| Existing shop access & authentication | ✅ | OAuth 302, login 200, public shop discovery 200 with the minimal projection (no financial/customer fields) |
| Mobile navigation & barcode fallback | ⚠️ not device-tested | No physical devices available; scanner fallback is code-verified + deployed; desktop emulation only |

**No real financial transactions were created or altered for acceptance** (per the mission constraint). Production financial data untouched.

## Phase 5 — Closeout

**Exact deployment SHAs**
- Application code deployed to Render + Vercel: **`fa5bffd`** (9 commits: `07ad353`, `d7d5c48`, `fc7c79a`, `4bcbf63`, `e56e35f`, `17d1e2d`, `f0568af`, `1167664`, `fa5bffd`)
- Previous production baseline: `2f93926`
- Note: the closeout commit `accc658` (this report, docs-only, zero app-code changes) was pushed to main afterwards and triggers an identical-behavior redeploy; post-redeploy health re-verified (Mongo/memory up, web 200).

**Render:** new build live at 07:29:34 UTC (behavioral probe), health/Mongo stable, zero observed downtime.
**Vercel:** new build live (asset/markup probes), correct API origin, no prefix duplication.

**New regressions:** none observed. Health, OAuth, public surfaces, and route guards all behave correctly post-deploy.

**Open risks & deferred issues** (unchanged from the release gate — see `11-release-gate.md`):
- R-01 legacy offline-queued orders may be rejected at sync (visible in the local queue; re-quote/re-collect or delete)
- R-03 currency-policy ms-scale TOCTOU (documented)
- R-04 real-device verification still outstanding (barcode scanner, STK on handsets)
- F-01 recognised-sales definition, F-02/F-03 cashier POS defects, F-04 per-item discounts quote-only, F-06–F-12 backlog items

**Rollback readiness: HIGH.**
- Web: redeploy the previous Vercel deployment (independent, instant).
- API: `git revert` of the release commits on main + push (fast-forward, no force), or redeploy the `2f93926` build from the Render dashboard. No schema changes block rollback (`tax.inclusive` simply becomes unused). Orders created post-deploy are internally consistent and remain valid under the old logic.
- Data safety: no migrations; historical records untouched by the release code.

**Final release recommendation:** **PASS — release accepted.** Monitor for one business day: checkout error rates (the new under-tender rejections are expected and informative), M-Pesa convergence logs, and the first tax-settings save from a real shop admin (the previously-broken save path).

**Uncommitted local artifacts** (not part of the release): `apps/web/src/app/branding-gate/` (verification fixture — delete or commit on request), `apps/api/.oldworker_tmp/`, `docs/09-audits/V2-MASTER-BACKLOG-RECON1/` (pre-existing untracked).
