# SMARTDUKA-STRIPE-MULTITENANT-FIX1 — Implementation & Verification Report

**Status:** `SMARTDUKA_STRIPE_MULTITENANT_FIX1_READY_FOR_REVIEW`
**Mode honoured:** local implementation and testing only. **Nothing pushed, deployed, connected, charged, or mutated.** Stripe live activation remains OFF (production still runs the test-mode platform; the `requireConnectedAccountId` gate keeps card payments unusable until a shop connects).
**Source audit:** `docs/09-audits/SMARTDUKA-STRIPE-MULTITENANT-AUDIT1.md` (preserved, untouched).

---

## Root causes addressed

| # | Root cause (from the audit) | Fix |
| --- | --- | --- |
| RC-1 | Platform publishable key used to confirm a connected-account client secret → every card checkout failed | The POS intent response now carries the **connected account's own publishable key** + `stripeAccount`; the frontend loads Stripe.js with `loadStripe(pk, { stripeAccount })` |
| RC-2 | `/payment/success` return route did not exist → SCA/3DS redirects 404'd and the browser response was lost | New server-truth recovery page (§B2) |
| RC-3 | Unscoped cross-tenant refund (`findOne` without shopId) | Ownership enforced end-to-end (§A1) |
| RC-4 | `Date.now()` inside the idempotency-key generator → every retry created a NEW key → duplicate PaymentIntents/charges | Deterministic per-attempt keys (§C) |
| RC-5 | Webhook signature failures returned HTTP 200 → legitimate events silently dropped (no retry, no record) | Non-2xx rejections + durable records (§A3) |
| RC-6 | OAuth state nonce never single-use-checked → 15-min replay window | Durable atomic nonce consumption + membership revalidation (§A4) |

## Exact files modified

| File | Change |
| --- | --- |
| `apps/api/src/stripe/stripe.controller.ts` | Refund endpoint passes `user.shopId` (A1); PM attach/detach now admin-only + `@CurrentUser` (A2) |
| `apps/api/src/stripe/services/stripe-payment.service.ts` | Tenant-scoped refund with validation/idempotency/ambiguity handling (A1); deterministic idempotency keys + per-attempt generation (C); pending-intent reuse verifies the connected account, cancels stale intents after disconnect (C); account-context + mode-consistency gates in `createPOSPayment` (B1); `convergeExternalRefund` for dashboard-initiated refunds (C); webhook handler binding + terminal-state guards (A3) |
| `apps/api/src/stripe/services/stripe-customer.service.ts` | `detachPaymentMethodOwned` — ownership verified before any Stripe mutation (A2) |
| `apps/api/src/stripe/services/stripe-connect.service.ts` | `signState` registers a durable single-use nonce (async); `consumeStateNonce` — atomic `findOneAndDelete` + current membership/admin revalidation (A4); `publishableKey` captured on account sync; `getAccountContext` (B1) |
| `apps/api/src/stripe/stripe-webhook.controller.ts` | Non-2xx on missing secret/signature/malformed payload (A3); account-context binding + terminal-state reorder guards delegated via the payment service; `charge.refunded` → provider-truth convergence (C) |
| `apps/api/src/stripe/stripe.service.ts` | `createRefund` accepts + forwards `idempotencyKey` (A1) |
| `apps/api/src/stripe/schemas/oauth-state.schema.ts` | **NEW** — durable single-use nonce store with a 20-min TTL index (A4) |
| `apps/api/src/stripe/stripe.module.ts` | Registers `OAuthState` + `User` models |
| `apps/api/src/shops/schemas/shop.schema.ts` | `stripeConnect.publishableKey?: string` (additive, optional — no migration) |
| `apps/web/src/components/payment-method-modal.tsx` | Uses the RESPONSE's account publishable key + `stripeAccount` (B1) |
| `apps/web/src/components/stripe-payment-form.tsx` | `loadStripe(publishableKey, { stripeAccount })` (B1) |
| `apps/web/src/app/payment/success/page.tsx` | **NEW** — redirected-payment recovery: polls the tenant-scoped backend; URL params are never settlement proof; succeeded/processing/failed/canceled/unresolved states; no receipt before confirmed settlement (B2) |
| `apps/api/src/stripe/stripe-multitenant-fix1.spec.ts` | **NEW** — the Phase D acceptance suite (22 tests) |

## Completed fixes (Phase A/B/C)

**A1 — Refund protection:** `{shopId, stripePaymentIntentId}` ownership matching (foreign and unknown references → the same safe 404, no Stripe call, no disclosure); positive-amount + remaining-balance + cumulative validation BEFORE the provider call; deterministic refund idempotency (repeated/concurrent identical requests return the same refund); ambiguous provider outcomes never record locally (the provider truth converges via status sync + `charge.refunded`).

**A2 — PM security:** attach/detach are admin-only; detach resolves the caller's shop-scoped customer and verifies the PM belongs to it before invoking Stripe; foreign/unknown PMs → safe 404.

**A3 — Webhook authentication:** missing secret / missing signature / malformed payload / bad signature → **non-2xx** (Stripe redelivers legitimate events; attackers get no silent acceptance); connected-account context binding (`event.account` must match the local record's `connectedAccountId`); terminal-state reorder guard (duplicate/reordered events cannot regress succeeded/refunded/canceled); durable event processing + rethrow-on-error (Stripe redelivery) preserved.

**A4 — OAuth:** nonces are durably registered at flow start and consumed atomically at callback (`findOneAndDelete`) — replay is rejected across instances and process restarts; the initiating user's CURRENT shop membership + admin role are revalidated at callback time (removed/downgraded users cannot bind accounts); the one-account-one-shop conflict check preserved; existing Standard Connect accounts unaffected.

**B1 — Elements:** the POS intent response carries `publishableKey` (the connected account's own, captured at sync/fetched on demand) + `stripeAccount`; the account id always comes from the server's shop record (never the browser); test/live mode consistency enforced at initiation (a mode mismatch is rejected with a reconnect message); no secret keys touched.

**B2 — Redirect recovery:** `/payment/success` polls the authenticated tenant-scoped status endpoint (up to ~30 s) and renders succeeded/processing/failed/canceled/unresolved; URL query parameters are never settlement proof; no success message before confirmed settlement.

**B3 — Onboarding:** the status UI already surfaces requirements/disabled reasons; the initiation gate blocks unconnected/not-ready shops with actionable messages; the account's `defaultCurrency`/`country` are stored and returned in the account context (a currency-compatibility warning surface for the UI).

**C — Financial reliability:** deterministic idempotency keys (per attempt generation — advanced only after a CANCELED intent); pending-intent reuse verifies the connected account and cancels stale intents after disconnect/reconnect; external (dashboard) refunds converge the local record idempotently; every financial state change requires verified provider evidence + tenant-scoped authority.

## Test evidence (Phase D)

**22/22** in the dedicated suite (`stripe-multitenant-fix1.spec.ts`), mapping to the required scenarios:

| Required scenario | Test(s) |
| --- | --- |
| Shop A cannot refund Shop B | ✅ safe 404, no Stripe call |
| Shop A cannot access Shop B's saved PMs | ✅ ownership 404 before Stripe |
| A disconnected shop cannot initiate card payments | ✅ |
| Shop A's PaymentIntent cannot settle Shop B's order | ✅ account-context binding guard |
| Platform subscription payments remain independent | ✅ (subscription convergence untouched — 0 diff lines in the subscription flow's authority path; the invoice-authoritative platform-account flow is unchanged) |
| Invalid webhook signatures cannot mutate data | ✅ non-2xx, no event stored |
| Duplicate webhook delivery does not duplicate transactions | ✅ idempotent handlers + terminal guards |
| Concurrent checkout requests do not create duplicate charges | ✅ deterministic keys + the claim system's unresolved-attempt refusal |
| SCA/3DS redirect recovery confirms through the server | ✅ `/payment/success` polls the tenant-scoped backend (URL params never trusted) |
| Repeated/partial refunds cannot exceed the authorised balance | ✅ validation + accumulation tests |
| Failed/processing payments never appear as completed sales | ✅ status mapping + terminal guards |

**Full regression:** API suite **765 passed / 28 failed — the failure set is byte-identical to the pre-change baseline** (28 pre-existing scaffolding failures; 0 new). Web typecheck 0 errors; web build ✅ (115 routes incl. `/payment/success`); API build ✅ via `scripts/verify-build.js` (clean builds + artifact-freshness assertions — the stale-dist failure mode is now structurally prevented).

## Residual risks / deferred

- Disputes (charge.dispute.*) are still unhandled — deferred (no production data exists).
- The donation endpoint's unauthenticated intent factory remains (P2, deferred — not a tenant-isolation issue).
- The pinned Stripe API version (`2026-02-25.clover`) should be verified against Stripe's current versions at enablement.
- The connected account's country/currency compatibility is surfaced as data (UI warning is a follow-up).
- Real SCA/3DS behaviour requires the operator's live/test keys + a canary shop (§I of the audit).

## Migration requirements

**None unsafe.** Two additive optional surfaces: `shop.stripeConnect.publishableKey` (populated lazily at sync/initiation) and the new `oauthstates` collection (TTL-indexed, self-cleaning). No existing documents change; old code tolerates both additions.

## Deployment ordering & rollback

1. **API first** (Render): the fixes are inert until a shop connects (the readiness gate) — zero behavioural risk to existing M-Pesa/cash/subscription flows.
2. **Web second** (Vercel): the modal/form changes + the new route; graceful against an old API (the account-context fields are simply absent → the OLD failure mode persists until the API lands — no new breakage).
3. **Rollback:** revert the commits + fast-forward push, or dashboard-redeploy; no data transformations.
4. **Stripe live activation: OFF** — enabling card payments requires the operator's live keys + Connect env + webhook registration (the audit's H-7 list), separately approved.

## Operator-only tasks (unchanged from the audit, restated)

1. Provision LIVE `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY` (test-mode cannot OAuth real merchants).
2. Add `STRIPE_CONNECT_CLIENT_ID` + `STRIPE_CONNECT_REDIRECT_URI` to Render (+ `render.yaml`).
3. Register the webhook endpoint in the Stripe dashboard (`/stripe/webhook`) + set `STRIPE_WEBHOOK_SECRET`.
4. Verify the redirect URI matches the Stripe dashboard registration exactly.
5. Connect ONE canary shop and run the §I lifecycle before opening card payments to all shops.
