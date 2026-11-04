# ERROR-UX-RELIABILITY1 — Root Causes

**Repository:** DTBbuilds/SmartDuka · **Branch:** `fix/error-ux-reliability1`

## P0 — confirmed and fixed

### RC-1 — Raw internal exception disclosure (backend, all routes)
`AllExceptionsFilter` sent `exception.message` verbatim to the client for any non-HttpException `Error` — an unhandled exception is by definition not a deliberate API response, so its message is internal: Mongo duplicate-key payloads (`E11000 ... index: email_1 dup key: { email: ... }`), cast errors with collection names, driver/stack fragments. **Fix (PR A, `04e707b`):** full diagnostics logged server-side under a correlation ID; client receives a generic message + `code: INTERNAL_ERROR` + `requestId`. HttpException business messages preserved.

### RC-2 — Non-idempotent auto-retry (frontend, all API calls)
`apiResilience.resilientFetch` retried EVERY method up to 3+1 attempts on any network error or timeout — including POST/PATCH/PUT/DELETE. A timeout does not mean the server didn't process the request: retrying a checkout, payment initiation, void, refund or cashier mutation can duplicate financial/destructive operations. The abort path was worse: the code's own comment said "don't retry on abort" but AbortError still fell through to the retry block. **Fix (PR A):** only GET/HEAD/OPTIONS auto-retry; explicit `retryOnNonIdempotent` opt-in for keyed/idempotent mutations; timeouts and user cancels never retried.

### RC-3 — 401 returned a fake successful response
`api-client.request()` on 401 cleared the session, redirected, and **returned `{} as T`** — callers saw a successful empty result and silently did nothing (data never loads, mutations appear to no-op). **Fix (PR A):** typed ApiError thrown with a clear session-expired message.

### RC-4 — Entitlement quota corruption (shops/branches)
`syncUsageCountsForShop`/`getUsageCounts` hardcoded `shops: 1` ("for now, just 1 per subscription") while branch create/delete incremented/decremented `currentShopCount`. The weekly cron (Sun 02:00) and the on-fetch background sync **reset branch-incremented counts to 1** — multi-branch plans could exceed their location quota (over-provisioning) and the displayed usage was wrong. **Fix (PR C, `d80afbd`):** sync counts `1 + actual branches`; no production records modified.

### RC-5 — Check-then-act limit race
`enforceLimit` (read) → create → `incrementUsage` (write) allowed N concurrent creations to all pass the check. **Fix (PR C):** atomic conditional claim (`claimUsage`: single `findOneAndUpdate` with `count <= limit - increment` precondition) + release-on-failure; proven with 6 concurrent claims → exactly the remaining room wins.

### RC-6 — Negative quota decrements
`decrementUsage` used a raw `$inc` — deletion storms could drive counts negative, silently GRANTING extra quota. **Fix (PR C):** pipeline update floors at `$max: [0, ...]`.

## P1 — confirmed and fixed

### RC-7 — Silent data-load failures rendered as real zeros
`/admin/inventory`: `if (statsRes.ok)` with no else — a 500 rendered zeros as if they were real inventory figures (misleading business data). `/admin/cashiers/[id]`: non-OK detail response rendered "Unknown Cashier" with empty fields. **Fix (PR D, `13f7fa0`)** for inventory (per-section failure + ErrorBanner with retry); cashier detail **deferred to the parallel `fix/cashier-admin-freeze1` investigation** (preserved).

### RC-8 — Errors displayed outside active dialogs
Dialog submit failures (branches page — and the same pattern in cashiers) set PAGE-level error state: the alert rendered behind the open Radix dialog overlay — invisible → "silent failure". **Fix (PR C)** for branches (`dialogError` rendered inside the dialog); cashiers deferred with the freeze investigation.

### RC-9 — Caller AbortSignals silently discarded
`resilientFetch` overwrote `options.signal` with its per-attempt timeout controller — navigation/cancellation never worked through the central client. **Fix (PR A):** signals combined (caller + timeout).

### RC-10 — Non-JSON responses crashed the client
Bare `JSON.parse(text)` (67 call sites; central client included) — a 502 HTML gateway page threw SyntaxError instead of a usable error. **Fix (PR A)** in the central client (safe parse → canonical ApiError with status-derived code); per-page bare parses documented for adoption backlog.

## P1 — confirmed, deferred (parallel work preserved)

### RC-11 — Cashier-management edit freeze + Radix dropdown/dialog issues
Evidence gathered (see APPLICATION-MATRIX Group 3): Radix `DropdownMenuItem onClick` → Dialog open (menu focus-restore fights the dialog focus trap — the canonical freeze class); PIN-dialog errors rendered at page level behind the overlay; no double-submit protection. **Deferred BY DESIGN:** the parallel `fix/cashier-admin-freeze1` branch owns this investigation; the shared primitives (PR B) are available for its adoption. Not overwritten.

## P2 — policy questions for the owner (NOT changed)

1. **Frontend `FREE_MODE = true`** (`subscription-guard.tsx`) bypasses all UI limit checks while the backend enforces them — inconsistent contract. Changing it alters merchant-visible behavior (an entitlement decision) — flagged, not changed.
2. **`/cashier/checkout` stub** posts EMPTY orders (`items: []`, totals 0) with console-only errors; no inbound links found. Recommend removal or redirect to `/pos` (PR D backlog).
3. **`/cashier/pos` hardcodes 16% client-side tax** — inconsistent with server-authoritative tax settings; recommend routing through the canonical checkout quote path.
4. **`/register-shop` hardcodes a fake free plan (`maxShops: 999`) client-side** when the plans fetch fails.
5. **Duplicate management surfaces** (`/users` vs `/admin/cashiers`) — consolidation candidate.
