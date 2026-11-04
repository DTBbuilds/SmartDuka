# ERROR-UX-RELIABILITY1 — Release Plan

**Repository:** DTBbuilds/SmartDuka · **Branch:** `fix/error-ux-reliability1` (baseline `origin/main` @ `c39cf8f`)
**Status:** Implemented and verified locally — **STOPPED before any production merge or deployment** (per task constraints; production deployment NOT AUTHORIZED).

## 1. Deliverable PRs (independently reviewable, stacked)

| PR | Commit | Scope | Regression evidence | Rollback | Deployment impact |
|---|---|---|---|---|---|
| **A — P0 safety** | `04e707b` | Backend canonical error filter (no internal disclosure, stable codes, correlation IDs, retryability) + request-ID middleware; frontend retry/idempotency safety (no non-idempotent auto-retries, signal combining, honest timeouts), safe non-JSON handling, honest 401 | 10 filter/middleware tests + 12 web tests; full batteries green | Single-commit revert; additive response fields only — old clients unaffected | API + web; no migrations; no behavior change for successful requests |
| **B — Core contract + shared components** | `76cc337` | Shared feedback primitives (ErrorBanner, SuccessNotice, InfoNotice, EmptyState, LoadingState, ConfirmDialog, FieldError) — the Phase 5 standard | Typecheck clean; adopted by PR D fixes | Revert removes components (no callers outside PR D adoption) | Web only |
| **C — Entitlements** | `d80afbd` | Shops/branches quota accounting corrected (sync counts main+branches), atomic claim/release, floor-at-0 decrements, explanatory limit message; branches-page in-dialog errors + usage indicator + double-submit guard | 9 DB-backed tests (disposable MongoDB) incl. 6-way concurrency exactness; subscriptions battery 8/8, 92/92 | Single-commit revert; **no production subscription records/billing/allowances modified**; policy (maxShops = main+branches) unchanged | API + web; accounting self-corrects on next sync — no data migration |
| **D — Application UX** | `13f7fa0` | Route-by-route error-state fixes (inventory dashboard: failed loads distinguished from empty data, retry affordance); shared-standard adoption | Typecheck clean; battery green | Single-commit revert | Web only |
| **E — Reliability** | `426bf3f` | Fault-injected canonical contract suite (13 real-HTTP tests) + Playwright browser harness (desktop/mobile/keyboard/offline/double-submit) | 13/13 green; harness ready to run (`npx playwright install chromium`) | Test-only — no runtime impact | None (tests only) |

Stack order A → B → C → D → E (each builds on the previous; every PR diff is independently reviewable and revertible).

## 2. Safety boundaries honored

- **`feat/cashier-journey1` (unpublished) and the `fix/cashier-admin-freeze1` investigation preserved** — the cashier-management pages (list + detail) were audited and documented but NOT modified; their fixes belong to the parallel branch. Shared primitives are available for adoption there.
- **M-Pesa globally paused, canary allowlist empty** — verified on production during this task: `pause-status` → `{"paused":true,"mode":"paused","canaryAllowlistSize":0,"rawValue":null}`. Zero payment files in any PR diff (scanned).
- **No production data mutations, no live payment initiation, no billing activation, no production deployment.**
- Separate security-fix commits: the P0 disclosure/retry/auth-response fixes are isolated in PR A (`04e707b`) for independent security review.

## 3. Remaining work (documented, not silently dropped)

1. **Browser-run Playwright evidence** — harness committed; Playwright browsers not installed in this environment. Run: `npx playwright install chromium && npx playwright test apps/web/tests/e2e/error-ux.spec.ts` against local web+API.
2. **Cashier-management fixes** (edit freeze, Radix dropdown/dialog focus fight, in-dialog errors, double-submit) — deferred to `fix/cashier-admin-freeze1` (see APPLICATION-MATRIX Group 3 + ROOT-CAUSES RC-11).
3. **Adoption backlog** — 81 direct-fetch pages migrate to the central client opportunistically; 67 bare `JSON.parse` sites; 24 native `confirm()` sites; 13 full-page reloads; three notification systems consolidate onto the shared primitives.
4. **Owner policy decisions (flagged, unchanged):** frontend `FREE_MODE=true` vs backend enforcement inconsistency; `/cashier/checkout` stub removal; `/cashier/pos` hardcoded 16% tax; `/register-shop` client-side fake plan; `/users` vs `/admin/cashiers` surface consolidation.
5. **`api-error-handler.ts` removal** (zero callers) after adoption completes.

## 4. Verification summary (see TEST-RESULTS.md for detail)

- API: **63/63 suites, 902/902** (baseline 61/61, 870/870 → +32 tests, zero regressions)
- Web: **3/3 suites, 37/37** (baseline 25 → +12 tests)
- API build ✅ · Web build ✅
- Pre-existing Google OAuth/OTP, cashier-P0 and payment-convergence suites: all green
- Production read-only probes: health 200 · M-Pesa paused:true · canary 0 · auth endpoints fail-closed

## 5. Deployment procedure (when authorized)

1. Review the 5 PRs in stack order; merge A first (P0 security), then B–E.
2. Render autoDeploys API on main; Vercel autoDeploys web. API-first verification: `/health` 200 → probe `x-request-id` header present on any response → force a known 4xx and confirm the canonical body (`code`, `requestId`).
3. Post-deploy smoke: the §4 production probes + one real Google OTP sign-in (operator) + one checkout on a test shop.
4. Rollback: per-PR single-commit reverts; PR A rollback restores the previous filter behavior (known state; the request-ID middleware is additive and harmless).
