# ERROR-UX-RELEASE-GATE1 — Release Gate

**Repository:** DTBbuilds/SmartDuka · **Candidate:** `fix/error-ux-reliability1` @ `cc2da30` · **Baseline:** `origin/main` @ `c39cf8f` (refreshed during this gate — no intervening changes)
**Mode:** Release verification, policy resolution and preparation. **No production merge or deployment performed.**

---

## 1. Release integrity (Phase 1)

### Commits verified (12, in order) with exact file changes
| # | Commit | Files | Scope |
|---|---|---|---|
| 1 | `04e707b` | all-exceptions.filter(+spec), request-id.middleware, main.ts, api-client.ts, api-resilience(+spec) | **PR A — P0 safety** |
| 2 | `d80afbd` | branches.service, subscription-guard.service, subscriptions.{module,service}, subscription-guard-limits.spec, admin/branches/page | **PR C — entitlements accounting** |
| 3 | `76cc337` | components/feedback/index.tsx (new) | **PR B — shared primitives** |
| 4 | `13f7fa0` | admin/inventory/page.tsx | **PR D — failed-vs-empty** |
| 5 | `426bf3f` | fault-injection.spec, tests/e2e/error-ux.spec | **PR E — fault injection + browser harness** |
| 6 | `889c4c6` | 5 ERROR-UX-RELIABILITY1 reports + route-inventory.json | docs |
| 7 | `3ee1a6a` | branches.service.ts, tests/e2e/error-ux.spec.ts | verification pass (build fix + harness) |
| 8 | `15322de` | subscription-guard.service, subscription-plan.schema, subscription-guard-limits.spec, admin/branches/page, fault-injection.spec, request-id.middleware | **GATE Phase 2 — null=unlimited + CI lint fixes** |
| 9 | `11ef02f` | pos/page.tsx | **GATE Phase 3 — checkout timeout + ambiguity honesty** |
| 10 | `5037d07` | subscription-guard.service, events.gateway.ts | **GATE — type fixes (null limits) + socket JWT claim validation** |
| 11 | `cc2da30` | tests/e2e/error-ux.spec.ts | **GATE Phase 5 — branches-dialog browser proof** |

### Published non-production review branches (origin)
`review/error-ux-pr-a` (`04e707b`) · `review/error-ux-pr-b` (`76cc337`) · `review/error-ux-pr-c-d80afbd-plus-3ee1a6a` (`3ee1a6a`) · `review/error-ux-pr-d` (`13f7fa0`) · `review/error-ux-pr-e` (`426bf3f`) · candidate `fix/error-ux-reliability1` (`cc2da30`).

### Actual PR dependency graph (verified by file overlap — NOT assumed)
- **PR A — independent** (no later commit touches its files). Revertible alone.
- **PR B — independent** at runtime (new components, unused until adopted); **PR D depends on PR B** (imports the primitives) — reverting B breaks D.
- **PR C is COUPLED to `3ee1a6a`** (both edit `branches.service.ts`; `3ee1a6a` adds the `ForbiddenException` import PR C's code requires). They must ship together; reverting C alone leaves an unused import (harmless), reverting `3ee1a6a` alone **breaks the build**.
- **PR E — test-only** (runtime-independent; its fault-injection suite tests PR A's filter, so reverting A fails those tests but nothing at runtime).
- **GATE commits:** `15322de`+`5037d07` extend PR C (same files — ship with the C unit); `11ef02f` (POS) and `cc2da30` (test) are independent.

### Hosted GitHub CI evidence
CI triggers on main/develop pushes and PRs (not fix/* pushes). The candidate was fast-forwarded to `develop` (`2b54e4d..cc2da30`; `deploy-staging` in ci.yml is an unconfigured placeholder — no deployment occurs):
- Run 1 (`3ee1a6a`): **FAILED** — Lint & Type Check: `only-throw-error` (intentional non-Error fault injection) + `no-useless-escape` in the request-id regex → **fixed in `15322de`**.
- Run 2 (`15322de`): **FAILED** — Build API: `LimitCheckResult.limit/remaining` typed `number` rejected the null-unlimited returns, plus a **pre-existing** clean-build error in `events.gateway.ts` (TS2739) that a stale local incremental build had masked → **fixed in `5037d07`** (types widened to `number | null`; the socket JWT payload now validated for required claims).
- Run 3 (`5037d07`): **SUCCESS** (lint ✅, tests ✅, build ✅).
- Run 4 (`cc2da30`): test-only addition; triggered, pending at report time — code identical to the green run 3.
- Per-PR hosted CI: **requires draft PRs from the five review branches** (procedure documented; PR creation needs operator credentials — no token in this environment).

### Parallel work preserved (verified by `git log -1`)
`feat/cashier-journey1` @ `f54f674` ✅ untouched · `fix/cashier-admin-freeze1` @ `b9d8d5a` ✅ untouched.

---

## 2. Subscription-policy conflict resolution (Phase 2)

**Production evidence (read-only probe of the LIVE plans endpoint, not seed defaults):** the production `trial` plan is configured `maxShops: 1, maxEmployees: 1, maxProducts: 25, setupPrice: 3000`. Two policy conflicts follow:
1. **`maxShops: 1` + enforcement contradicts the approved Free Plan — Full Access policy** (the `(1/1)` warning blocks a second location for free merchants).
2. **`setupPrice: 3000` on the free plan is the CASHIER-JOURNEY1 write-lockout root cause — still live in production** (the journey branch fixes the seeding code; the production plan RECORD still carries the fee until the self-healing migration runs on a deploy of that branch).

**Resolution implemented (`15322de` + `5037d07`) — accounting separated from enforcement:**
- **Accounting (PR C, retained):** usage counts are accurate (main shop + branches), atomic, floor-at-0, self-healing — policy-neutral truth-telling.
- **Enforcement:** a plan whose `maxShops` is **null/absent now means UNLIMITED** — the owner's policy lever. Granting Full Access is a **plan-CONFIG change** (`maxShops: null` on the trial plan), not a code change; numeric limits behave exactly as before (schema default stays 1 — backward-compatible; no production subscription records modified).
- **Display:** the branches page renders `null` as "unlimited on your plan".
- **Tests (DB-backed, disposable MongoDB):** unlimited claims succeed while the count still increments; `enforceLimit` resolves on unlimited plans; plus PR C's original 9 (concurrency exactness, floors, sync, release-on-failure, inactive subscriptions, legacy message). Suite **11/11**.

**Owner decision required before enforcement ships:** set the production trial plan's `maxShops` to `null` (Full Access) or keep `1` (the current live restriction). **Until decided, PR C's unit should be released with the accounting only if the owner confirms the live `maxShops: 1` restriction is intended** — see §6.

---

## 3. Security and reliability verification (Phase 3)

| Requirement | Evidence |
|---|---|
| Unexpected errors expose nothing internal | filter spec 10/10: unhandled `Error`/non-Error → generic message + `code: INTERNAL_ERROR`; E11000/collection names never disclosed (fault-injection 13/13 re-proves over real HTTP) |
| Validation errors keep safe field messages | validation arrays → structured `errors[]` + joined readable message (both suites) |
| Correlation IDs safe + available | `x-request-id` generated/echoed; malformed inbound IDs rejected (injection-safe); present on responses and error payloads |
| HTTP statuses compatible | canonical body preserves the original status; HttpException business messages preserved |
| No auto-retry of non-idempotent methods | web spec 12/12: POST/PATCH/PUT/DELETE never retried (1 fetch call); GET retried; explicit opt-in only for keyed mutations |
| Ambiguous payment outcomes never "failed-safe-to-resubmit" | **GATE `11ef02f`:** all four POS checkout fetches now carry `AbortSignal.timeout(30000)`; both catch paths distinguish `TimeoutError`/`AbortError` and show *"The checkout request timed out. The order may or may not have been created — check Orders before attempting checkout again."* — no silent retry, no false failure claim |
| Expired auth never returns fake success | 401 → typed ApiError (never `{} as T`) — web spec |
| Aborted requests handled | caller signals combined with the timeout signal; never retried — web spec |
| M-Pesa callbacks/reconciliation unaffected | callback suite **10/10** on the candidate; zero payments files in any commit (scanned); **production probe: `paused:true, canaryAllowlistSize:0`** |

---

## 4. Cross-branch compatibility (Phase 4)

Test merges in disposable worktrees (throwaway branches `test/journey-plus-errorux`, `test/freeze-plus-errorux`; **neither protected branch was modified**; worktrees removed after):

| Pair | Result |
|---|---|
| Candidate × `feat/cashier-journey1` | **1 conflict:** `subscription-guard.service.ts` — the journey's `claimEmployeeSlot` vs PR C's `claimUsage` occupy the same region. **Resolved: both methods kept** (complementary). Merged tree: `nest build` exit 0; subscriptions suites **8/8, 94/94**. |
| Candidate × `fix/cashier-admin-freeze1` | **Clean merge** (zero overlapping files); merged tree builds exit 0. |

**Integration order:** `feat/cashier-journey1` first (deepest root causes: registration/subscription provisioning), then `fix/cashier-admin-freeze1` (cashier UI + the P0 tenant-isolation fix), then this candidate (cross-cutting standard). The only file-level conflict is the guard (resolution above).

**Tenant-isolation prioritization (required by this gate):** the user-lookup cross-tenant exposure (`GET /users?email` global query + `pinHash` leak; branch cashiers unscoped) was fixed on the **freeze branch** (`c0a531b`) and **remains unresolved on this candidate** (it branched from `c39cf8f`). **The security release must include `c0a531b` with or before PR A.**

**Honest note:** the journey branch's 10-scenario E2E spec was never committed (it lived untracked in a prior session and was lost); its 10/10 result is documented in `CASHIER-JOURNEY1-E2E-RESULTS.md`. Recreating the spec is a follow-up; this gate's journey verification covers the merge, build, and the 94 subscriptions tests.

---

## 5. UX and browser acceptance (Phase 5)

**Executed browser evidence — `tests/e2e/error-ux.spec.ts`, 8/8 PASS (17.0s), Playwright chromium:**
- Desktop 1280px: login validation announced without reload ✅ · keyboard navigation reaches an interactive element ✅ · failed inventory load → recoverable `[role=alert]` banner with Retry ✅ · offline retry → global "No internet connection" banner, no reload ✅ · **branch-creation 400 renders INSIDE the dialog** (PR C adoption) ✅ · POS checkout control present, double-submit-protected ✅
- Mobile 390px touch: login renders + validates ✅ · no horizontal overflow on the dashboard ✅

**Not claimed:** full coverage of all 114 routes. Representative workflows verified: login/registration entry, branch management, inventory, POS checkout, dashboard. **Adoption backlog (documented separately in the APPLICATION-MATRIX):** 81 direct-fetch pages, 67 bare `JSON.parse` sites, 24 native `confirm()`s, 13 full-page reloads, three notification systems — migrate opportunistically onto the shared primitives; `api-error-handler.ts` has zero callers (remove after adoption).

---

## 6. Production release plan (Phase 6)

**Recommended sequence (P0 first, policy-gated entitlements last):**

| Step | Unit | Commits | Gate |
|---|---|---|---|
| 1 | **P0 security bundle** | freeze-branch `c0a531b` (tenant isolation) + PR A `04e707b` | Ship first — independent, negative-tested |
| 2 | **Reliability core** | PR B `76cc337` + PR D `13f7fa0` + `11ef02f` (checkout honesty) + `cc2da30` | Web-only; ship after 1 |
| 3 | **Entitlements (PR C unit)** | `d80afbd` + `3ee1a6a` + `15322de` + `5037d07` | **HOLD for the owner's policy decision** (trial `maxShops`: null vs 1). The accounting is safe to ship; the enforcement semantics must match the approved commercial policy |
| 4 | PR E `426bf3f` | test-only | Any time |

**Rollback:** per-unit single-commit reverts (see the dependency graph — C's unit reverts as a block; D requires B). **Smoke tests:** `/health` 200 → any 4xx returns the canonical body (`code`, `requestId`) → `x-request-id` present → the POS checkout timeout path shows the ambiguity message → the branches page usage indicator. **Monitoring:** 5xx rate + `code=INTERNAL_ERROR` count (redacted, tenant-safe); 4xx logged WARN one-line.

**GO/NO-GO:**
- **GO** for step 1 (P0 security) and step 2 (reliability core) — all evidence green.
- **NO-GO until the owner decides** the trial-plan `maxShops` policy (step 3) — shipping enforcement against the live `maxShops: 1` config while the stated policy is Full Access would hard-code a contradiction.
- **M-Pesa:** `paused:true`, canary `0` — unchanged; no payment files touched.

**Stopped before any production merge or deployment.**

**Token: `SMARTDUKA_ERROR_UX_RELEASE_GATE1_READY`**
