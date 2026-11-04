# ERROR-UX-RELIABILITY1 — Test Results

**Repository:** DTBbuilds/SmartDuka · **Branch:** `fix/error-ux-reliability1`
**All commands run locally; no production deployment, no production data mutations.**

## 1. Final battery (this branch, after all PRs)

| Check | Result |
|---|---|
| **API full unit battery** (`jest --runInBand`) | **63/63 suites, 902/902 tests PASS** |
| **Web unit battery** | **3/3 suites, 37/37 tests PASS** |
| API `nest build` | ✅ exit 0 |
| Web `next build` | ✅ Compiled successfully |
| Baseline before this task (origin/main @ `c39cf8f`) | API 61/61 suites, 870/870 · web 3/3, 25/25 |
| Net new tests | **+32 API (10 filter/middleware + 9 entitlements + 13 fault-injection), +12 web** |
| Pre-existing regression suites (Google OAuth/OTP, cashier P0, payment convergence) | **All preserved green** (included in the battery) |

## 2. New regression suites (evidence detail)

### `apps/api/src/common/filters/all-exceptions.filter.spec.ts` — 10/10
- Unhandled `Error` → 500, generic message only; raw internal message (E11000/duplicate key/collection names) **never disclosed**; `code: INTERNAL_ERROR`; `requestId` present
- HttpException string message preserved; business `errorCode` wins over status-derived code
- Validation arrays → structured `errors[]` + joined message
- 429/5xx → `retryable: true`; 4xx → no retryable field
- Unknown status codes → stable `HTTP_ERROR` fallback
- `headersSent` guard (no double-write)
- RequestIdMiddleware: generates + echoes `x-request-id`; honors well-formed inbound IDs; rejects malformed (injection-safe)

### `apps/api/src/subscriptions/subscription-guard-limits.spec.ts` — 9/9 (disposable MongoDB, real schemas)
- One-location plan: `(1/1)` restriction is legitimate policy AND the message now explains the main shop counts
- `claimUsage` grants while room remains, denies at the limit
- **6 concurrent claims on room-for-2 → exactly 2 win** (no quota over-provisioning)
- `releaseUsage`/`decrementUsage` floor at 0 (deletions never grant quota)
- Claim → failed creation → release → next claim succeeds (no quota leak)
- Inactive subscriptions cannot claim
- `enforceLimit` backward-compatible (ForbiddenException + explanatory message)

### `apps/api/src/common/filters/fault-injection.spec.ts` — 13/13 (real HTTP, supertest, REAL filter + middleware)
- Every fault class (400/401/403/404/409/429/500/unhandled Error/non-Error throw) → canonical shape: status, stable code, `requestId` == `x-request-id` header, timestamp, path, method
- Unhandled Error and non-Error throw: internals never disclosed
- 429 carries `retryable`; 409 does not
- **Duplicate submission with the same idempotency key → same record returned 3× — no second record, no double-credit**; distinct keys → distinct records

### `apps/web/src/lib/api-resilience.spec.ts` — 12/12
- POST/PATCH/PUT/DELETE **never auto-retried** on network failure (1 fetch call each)
- GET retried and succeeds on attempt 2
- Caller AbortSignal honored (navigation cancellation) and never retried
- Timeout not retried (POST: 1 call) — "may have reached the server" honesty
- Explicit `retryOnNonIdempotent` opt-in works for keyed mutations
- 4xx returned as-is by the resilience layer
- Non-JSON 502 HTML body → proper ApiError (`BAD_GATEWAY`, friendly message) — no SyntaxError
- 401 → typed auth error (never a fake successful empty response)
- Nest validation arrays joined into one readable message
- Canonical `code` surfaced for machine-readable handling
- Timeout via api-client reports honestly (`TIMEOUT`)

## 3. Production probes (read-only, 2026-11-04)

| Probe | Result |
|---|---|
| `GET /health` | 200 — mongodb up, memory up |
| `GET /api/v1/payments/mpesa/pause-status` | `{"paused":true,"mode":"paused","canaryAllowlistSize":0,"rawValue":null}` — **M-Pesa paused, canary allowlist unchanged** |
| `GET /api/v1/auth/google/status` | `{"configured":true}` |
| `POST /auth/oauth/exchange` (garbage ticket) | 401 generic fail-closed message |
| `POST /auth/login` (garbage creds) | 401 |
| `GET /auth/google/callback` (no state) | 302 → friendly login error |

## 4. Browser verification (Phase 8)

- **Executable harness committed:** `apps/web/tests/e2e/error-ux.spec.ts` (Playwright) — desktop 1280px + mobile 390px (touch), keyboard navigation, recoverable banners with retry, offline banner without reload, double-submit protection, no horizontal overflow on dashboard.
- **Run procedure:** `npx playwright install chromium` then `npx playwright test apps/web/tests/e2e/error-ux.spec.ts` (requires local web + API). Browser-run evidence is **remaining work** (Playwright/browsers not installed in this environment; API-level fault injection is fully green — see §2).
- Fault-injection coverage matrix at API level: 400 ✅ 401 ✅ 403 ✅ 404 ✅ 409 ✅ 429 ✅ 500 ✅ 503 (client-mapped) ✅ malformed response ✅ duplicate submission ✅ timeout ✅ offline (resilience layer) ✅ aborted request ✅.

## 5. Performance/observability (Phase 7 evidence)

| Item | Before | After |
|---|---|---|
| Duplicate provider requests from retries | POSTs retried up to 4× on timeout/network | 1 attempt (no auto-retry for non-idempotent) |
| Request cancellation on navigation | Impossible (signals discarded) | Caller signals honored + combined with timeout |
| Error correlation | None (unmatchable logs) | `x-requestId` on every request + response + error payload + log line |
| 4xx log noise | Every error logged at ERROR with stack | 5xx/unhandled = ERROR + stack; 4xx business = WARN one-line |
| Render-loop/freezes | No evidence found in audited routes (POS checkout uses guarded state transitions) | Playwright harness includes overflow/freeze checks for regression |
| Error monitoring redaction | Raw messages to client; logs could carry payloads | Client gets generic + correlation ID; logs carry message/stack only — no tokens/tickets/credentials (verified by test) |
