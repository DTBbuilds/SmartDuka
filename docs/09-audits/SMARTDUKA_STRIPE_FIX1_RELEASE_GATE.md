# SMARTDUKA_STRIPE_FIX1_RELEASE_GATE — Final Verification

**Status:** `SMARTDUKA_STRIPE_FIX1_RELEASE_GATE_READY`
**Mode honoured:** local verification and corrective hardening only — **nothing pushed, deployed, no live credentials, no production merchants, no real payments.**

---

## 1. Stripe publishable-key architecture — **FAIL found → CORRECTED (PASS after fix)**

The gate challenged the FIX1 implementation's dependency on `accounts.retrieve()` exposing a connected account's publishable key — **the challenge was correct**:

- The official Stripe.js documentation (docs.stripe.com/connect/authentication, docs.stripe.com/js) specifies the client-side connected-account pattern as `Stripe(platformPublishableKey, { stripeAccount: connectedAccountId })` — the **PLATFORM's** publishable key combined with the account id. The connected account's own key is not the documented mechanism for Connect platforms.
- The installed Stripe SDK's types do not declare `publishable_key` on `Account.Settings.Dashboard` (FIX1 had to cast to `any` — a signal of an unsupported dependency).

**Corrective commit `4227370`:** the account-pk retrieval dependency is REMOVED entirely — no capture at sync, no on-demand fetch, the `stripeConnect.publishableKey` schema field is gone, and the POS intent response carries only the **server-verified `stripeAccount`** id. The frontend pairs it with the platform key from `GET /stripe/config`: `loadStripe(platformPk, { stripeAccount })`. Server-verified account identity, test/live separation (mode-mismatch rejection at initiation) and PaymentIntent account matching are all preserved. **PASS.**

## 2. CI release readiness — **FAIL found → CORRECTED (PASS after fix)**

The hardened CI (mandatory typecheck + tests, no `continue-on-error` restoration) would have **blocked the release**: 28 baseline failures existed. Per the mission, every failure was classified and the safe scaffolding defects were FIXED rather than isolated:

| Suite | Failures | Classification | Action |
| --- | --- | --- | --- |
| `app.controller.spec` | 1 | stale assertion (removed `getHello` method) | **FIXED** — asserts the current `getRoot` descriptor |
| `users.service.spec` / `users.controller.spec` | 2 | missing DI providers in stale scaffolding | **FIXED** — provider lists completed |
| `auth.service.spec` / `auth.controller.spec` | 2 | missing DI providers (14-dep constructor) | **FIXED** — mandatory providers + model tokens (`getModelToken`) |
| `inventory.service.spec` | 20 | wrong schema import (token mismatch 'Adjustment' vs 'StockAdjustment'), missing providers (StockReconciliation/Order/CategorySuggestionService), non-constructor mock models, non-thenable query mocks, stale query-shape expectations (regex SKU, mutation-aware stock checks) | **FIXED** — correct imports/tokens, constructor-callable mocks, thenable `findOne`, current-behaviour expectations |
| `inventory.controller.spec` | 1 | missing DI providers | **FIXED** |
| `barcode.service.spec` | 2 | invalid ObjectId fixtures (BSONError before the intended error), checksum-invalid barcode fixture (the service validates EAN-13 — real behaviour), missing `shopId.toString()` | **FIXED** |

**Result: the FULL API suite is now 793/793 — zero failures.** No isolation patterns, no `continue-on-error`, no hidden regressions (the failure set went from 28 known-stale to empty; every fix was verified against current service behaviour).

## 3. Financial concurrency — **FAIL found → CORRECTED (PASS after fix)**

- **Refund idempotency race (real defect found):** two concurrent identical refunds share one Stripe idempotency key (both receive the SAME refund object from Stripe) — but the local accumulation would have double-counted (`refundedAmount` 8000 instead of 4000). **Corrected:** the local update is guarded by `'refunds.idempotencyKey': { $ne: key }` — MongoDB evaluates the filter atomically per update, so only the FIRST write accumulates; the loser observes `matchedCount: 0` and logs the concurrency. The webhook's external-refund convergence got the same refund-id guard.
- **Partial-refund balance calculations:** validated BEFORE the provider call (positive amounts, remaining refundable balance, cumulative totals) — tested.
- **PaymentIntent retry generation:** deterministic keys per attempt generation (advanced only after a CANCELED intent) — tested (same attempt → same key; no timestamp embedding).
- **Webhook redelivery/ordering:** durable event records + processed flags + terminal-state reorder guards + account-context binding — tested.
- **Provider-success/local-failure reconciliation:** ambiguous outcomes never record locally; convergence via authenticated retrieval + verified webhooks — tested.
- **Transaction deduplication/recovery:** unique `stripePaymentIntentId` index + the claim system's unresolved-attempt refusal + stale-intent cancellation after account changes — tested.
- **Test fidelity:** the 23 acceptance tests now cover failure paths (foreign refs, over-refund, ambiguity, replay, downgrade, mode mismatch, stale reuse) AND the new concurrency race — not just mocked success paths. **PASS.**

## 4. OAuth persistence — **PASS (with one NOT VERIFIED production item)**

- **Atomic consumption:** `findOneAndDelete({nonce, shopId, userId})` — a replay finds nothing → rejected (tested, including across "restarts" since the store is durable).
- **Unique index:** `nonce` unique (schema-level) — duplicate registration impossible.
- **TTL index:** `createdAt` with `expireAfterSeconds: 1200` (20 min > the 15-min state expiry) — self-cleaning.
- **Index creation:** the Mongoose connection does NOT set `autoIndex: false` → schema indexes auto-create on model compilation. Verified in the connection config (`app.module.ts:59-67`).
- **Multi-instance:** atomic `findOneAndDelete` is safe across concurrent instances.
- **NOT VERIFIED (production):** the `oauthstates` collection does not exist yet in the production database — expected, because the deployed API (`2108785`) predates the FIX1 model; the collection + indexes materialize on the next deployment. **Operational prerequisite:** after the next authorised deploy, verify `oauthstates` exists with the unique + TTL indexes (a one-line smoke check; the Atlas user already creates collections/indexes — evidenced by `stripepayments` and prior collections).

## 5. Release isolation — **PASS**

- **Ancestry verified:** `origin/main` @ `f248ff4` → local `main` is **4 commits ahead**, all fast-forwardable (`0870c93` canary hardening, `d01fe24` canary report, `b8ab68e` Stripe FIX1, `4227370` gate corrections).
- **Working tree:** clean except the untracked audit reports (`SMARTDUKA-STRIPE-MULTITENANT-AUDIT1.md` — preserved per the audit's no-commit constraint; `V2-MASTER-BACKLOG-RECON1/`) and the sitemap line-ending churn (normalised by the build, no content change).
- **Deployment triggers:** both Render and Vercel auto-deploy on a main push — a push of the 4 commits deploys BOTH. The email-report canary hardening (`0870c93`) is inert (flag OFF) and the Stripe fixes are inert (the readiness gate) — a combined push is SAFE, but the recommended order preserves reviewability (below).

## 6. Recommended release order (on separate authorisation)

1. **Push all 4 commits as one fast-forward** (`f248ff4..4227370`) — every commit is inert in production (flag OFF; card-readiness gate; webhook rejects without the secret). Alternatively split: `0870c93`+`d01fe24` first (email-report hardening), then `b8ab68e`+`4227370` (Stripe) — two pushes, two verification windows.
2. **Post-deploy smoke:** `/health` green · `oauthstates` collection + indexes exist · `/stripe/webhook` unsigned → **400** (the corrected behaviour) · `/reports/preferences` 401 · OTP send path unchanged.
3. **Operator enablement (separate approvals):** DMARC + webhook secret (CANARY-PREP1 checklist) → email-report canary; live Stripe keys + Connect env + webhook registration (AUDIT1 H-7) → Stripe canary.
4. **Rollback:** flag OFF (email reports, instant) / revert + fast-forward (code) / dashboard-redeploy `f248ff4`; no migrations; additive collections only.

## Final decision

**`SMARTDUKA_STRIPE_FIX1_RELEASE_GATE_READY`** — the FIX1 implementation is accepted after two gate-found corrections (the unsupported account-pk dependency → the documented platform-pk + `stripeAccount` pattern; the refund accumulation race → atomic guarded updates) and the CI debt clearance (793/793). Remaining blockers to PRODUCTION ENABLEMENT (not to this release): operator live keys/Connect env/webhook registration + DMARC/webhook-secret configuration — all separately approved operator actions.
