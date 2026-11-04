# ERROR-UX-RELIABILITY1 — Design System (error, validation & feedback standard)

**Repository:** DTBbuilds/SmartDuka · **Branch:** `fix/error-ux-reliability1`
**Implementation:** `apps/web/src/components/feedback/index.tsx` (PR B, `76cc337`)

## 1. Canonical error contract (backend → frontend)

Every error response (PR A, `04e707b`):

```json
{
  "statusCode": 409,
  "timestamp": "2026-11-04T07:00:00.000Z",
  "path": "/api/v1/branches",
  "method": "POST",
  "message": "Branch code already exists in this shop",
  "code": "CONFLICT",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "errors": ["field-level messages when relevant"],
  "retryable": true
}
```

- `code` — stable machine-readable (`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE`, … or the business `errorCode` convention e.g. `MPESA_007`).
- `requestId` — correlation; matches the `x-request-id` response header and the server log line; shown in the UI as a support reference.
- `retryable` — present ONLY for 429/5xx. The frontend never auto-retries non-idempotent methods regardless.
- Client mirror: `api-client.ts` derives the same codes from status for old/proxy responses.

## 2. Presentation primitives (when to use which)

| Situation | Component | Behavior |
|---|---|---|
| Operation failed but recoverable (load failed, save failed) | `ErrorBanner` | Inline, dismissible, optional Retry; `role="alert"` + `aria-live="assertive"`; shows `requestId` as support reference |
| Operation succeeded | `SuccessNotice` | Auto-dismisses (3 s), `role="status"` + `aria-live="polite"`; never blocks interaction |
| Informational / warning context | `InfoNotice` | Non-blocking; `warning` tone uses `role="alert"` |
| Zero data | `EmptyState` | Icon + one-sentence description + ONE primary action; distinguishes "nothing yet" from "failed to load" (never render zeros as data) |
| Work in progress | `LoadingState` | Spinner + label, `role="status"`; skeleton for layout-sensitive lists; buttons disable with inline spinner while saving |
| Destructive/irreversible action | `ConfirmDialog` | Focus-trapped dialog (Radix), explicit consequence sentence, loading-aware buttons; replaces native `confirm()` |
| Field-level validation | `FieldError` | Inline under the field, `role="alert"`, `aria-describedby` wiring; validate on submit + on blur; never block typing |
| Offline / reconnecting / slow | `BackendStatusOverlay` (existing global) | Single global banner — no per-page duplicates |

## 3. Behavior rules

1. **No full-page reloads** for API outcomes — state updates in place; navigation uses the router.
2. **No duplicated alerts** — one error surface per operation; dialog errors render INSIDE the dialog (never behind the overlay).
3. **No lost form data** — validation errors keep input; failed submissions keep the dialog open with the error inline.
4. **No silent failures** — every non-OK response surfaces (banner/toast/inline); `console.error` alone is never the only handling.
5. **No automatic retry of POST/PATCH/PUT/DELETE** — only idempotent methods auto-retry; keyed mutations may opt in explicitly.
6. **Timeouts report honestly** — "the server took too long; check whether the operation completed before retrying."
7. **401 is terminal** — typed error, session cleared, single redirect to `/login?expired=true`; never a fake empty success.
8. **Duplicate submission protection** — submit buttons disable while in flight (`isSubmitting`); server-side idempotency keys for financial operations.
9. **Accessibility** — `role="alert"`/`aria-live` for errors/status; focus trapped in dialogs; keyboard-reachable primary actions; visible focus.
10. **Retail-conditions design** — 30 s cold-start-friendly timeouts; offline/reconnecting banner; large touch targets on mobile; no layout jump while loading; slow-connection states are non-blocking.

## 4. Adoption guide

- New/modified pages: use the shared primitives; do not re-implement alerts.
- Existing pages: adopt opportunistically (PR D pattern: `/admin/inventory`, `/admin/branches`).
- The three legacy notification systems (page Alerts, `useToast`+ToastContainer, ad-hoc) remain functional during migration; `api-error-handler.ts` (zero callers) is superseded by the canonical client normalization and slated for removal.
