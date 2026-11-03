# MPESA-P0-CONVERGENCE1 — M-Pesa Callback Validation & Settlement Convergence

**Project:** SmartDuka · **Repository:** DTBbuilds/SmartDuka
**Priority:** P0 — Payment Reliability
**Production baseline audited:** `2615f39` (branch `fix/cashier-p0-security-integrity1`, HEAD `7195faa` at audit start)
**Fix commit:** **`9c907c0`** — `fix(payments): restore valid M-Pesa callback processing + provider-confirmed convergence (F-48, MPESA-P0-CONVERGENCE1)`
**Status:** Fix implemented, verified, committed — **NOT pushed/deployed** (awaiting review + authorization per task constraints)
**Completion token:** `SMARTDUKA_MPESA_P0_CONVERGENCE1_READY`

---

## 1. Confirmed root causes

### RC-1 (F-48, confirmed) — the callback DTO rejected every callback, including genuine ones

`MpesaCallbackDto` declared `Body` as a bare TypeScript property with **zero class-validator decorators**. The global `ValidationPipe` in `apps/api/src/main.ts` runs with `whitelist: true, forbidNonWhitelisted: true`, so every property of the callback payload was non-whitelisted: **every** POST to `/payments/mpesa/callback` — real Daraja callbacks included — was rejected with `400 "property Body should not exist"` **before the controller ran**. No callback ever reached `MpesaService.processCallback`; the F-08 provider-verification path was unreachable dead code, and callback-driven convergence never happened. (Pre-existing since the initial commit; independently confirmed in production probes recorded in `CASHIER-P0-DEPLOY1.md` §5/§6.)

### RC-2 (new, confirmed during this audit) — initiation never persisted a transaction record

`MpesaMultiTenantService.initiateSTKPush` — the **only** initiation path used by the POS (`POST /payments/mpesa/initiate`, called by `apps/web/src/hooks/use-mpesa-payment.ts`) — saved the transaction with `status: 'PENDING'` (**uppercase**) against the schema's **lowercase** Mongoose enum (`'pending'`), and omitted the **required** `expiresAt` field and the `stkPushSentAt` field the reconciliation loop filters on. Verified empirically against the compiled production schema:

```
enumValues: [ 'reversed', 'expired', 'failed', 'completed', 'pending', 'created' ]
PENDING -> `PENDING` is not a valid enum value for path `status`.
```

Consequence: Daraja accepted the push and **the customer's phone showed a live STK prompt**, then `transaction.save()` threw `ValidationError`, the service returned `{success:false}` and the cashier saw "Failed to initiate payment". A customer who completed the prompt paid real money into the merchant's account with **no transaction record** — nothing for the callback (even if RC-1 were fixed) or the reconciliation loop to converge. Money received; order never marked paid.

### RC-3 (confirmed) — reconciliation could never settle correctly

`MpesaReconciliationService` had five compounding defects:

| # | Defect | Consequence |
|---|---|---|
| a | Queried Daraja via the **platform-global** `DarajaService` credentials instead of the shop's own credentials | Shop-specific `CheckoutRequestID`s can't be resolved with the wrong shortcode/passkey — merchant transactions never settled |
| b | `DarajaService.queryStkStatus` did `ResultCode \|\| 0` | A **missing** `ResultCode` defaulted to **SUCCESS** — an uncertain outcome treated as confirmed money received |
| c | String `"0"` failed `resultCode === 0` | A successful payment reported as numeric string was classified **FAILED** (charged + order released for void) |
| d | `parseInt(result.ResultCode)` on the lowercase `{resultCode}` response | `mpesaResultCode` stored as `NaN`; receipt never extracted; payment record creation **skipped when no receipt** → transaction marked COMPLETED but **no payment record and no order convergence** |
| e | Any non-zero, non-1037 code marked FAILED | Ambiguous codes (17 system busy, unknown) treated as definitive failure — violates the P0-10D uncertainty policy |

### RC-4 (confirmed) — expiry could permanently lose a successful payment

`expireOldTransactions` marked PENDING → EXPIRED **without querying the provider**, and the reconciliation loop only queried not-yet-expired transactions. A payment that succeeded around the expiry boundary (missed callback, restart, Daraja delay) was expired with money received and the order left unpaid — no recovery path.

### RC-5 (confirmed, security) — `callback-v2` bypassed the F-08 trust shield

`POST /api/v1/payments/mpesa/callback-v2` fed payloads to `MpesaMultiTenantService.handleCallback`, which marked transactions COMPLETED and converged orders on the strength of an **unsigned callback with no provider verification** — a live bypass of the cashier-P0 F-08 protection. It also wrote uppercase status strings and non-schema fields (`resultCode`/`resultDesc`) through an unguarded `findByIdAndUpdate`.

### RC-6 (confirmed) — receipt-less convergence gap and race conditions

- The manual/query settlement paths duplicated settlement logic with the same normalization defects (transaction manager, `MpesaService.queryMpesaStatus`).
- Terminal transitions used read-modify-write `save()` without status preconditions — a concurrent callback and a reconciliation pass could interleave.
- A query-settled payment recorded without a receipt stayed receipt-less forever (late callback hit the "Already processed" guard and dropped the receipt).

---

## 2. Exact changes and commits

**Single fix commit:** `9c907c0` on `fix/cashier-p0-security-integrity1` (16 files, +2432/−406). No data migrations; all schema changes are additive optional fields.

| File | Change |
|---|---|
| `apps/api/src/payments/dto/mpesa.dto.ts` | **F-48 fix.** `MpesaCallbackDto` rewritten with explicit nested validation mirroring the real Daraja STK callback: `Body → stkCallback → {MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc?, CallbackMetadata? → Item[]}`. `Value` optional (real callbacks send a `Balance` item with no `Value`); `ResultCode` normalized from numeric strings, non-numeric strings rejected; `CallbackMetadata` optional (absent on failure callbacks). Global pipe config untouched. `parseCallbackMetadata` widened to accept optional `Value` and skip value-less items. |
| `apps/api/src/payments/services/mpesa-multi-tenant.service.ts` | **RC-2 fix:** `initiateSTKPush` saves `MpesaTransactionStatus.PENDING` + `expiresAt` + `stkPushSentAt` (record now persists; reconciliation loop can see it). **RC-3/RC-5:** `querySTKStatus` rewritten — result-code normalization (missing ⇒ UNRESOLVED, never success), atomic status-preconditioned settlement via pipeline update (`previousStatus` captured atomically; only `created/pending/expired` may transition — a concurrent callback always wins), receipt parsed from query metadata when present, **always** converges the canonical order + payment record on provider-confirmed success (receipt or not), receipt backfill on dedup. `handleCallback` fixed (schema enum values, schema field names, atomic precondition) and marked deprecated. New `MPESA_PAYMENTS_PAUSED` kill switch at the single initiation choke point. |
| `apps/api/src/payments/services/mpesa-reconciliation.service.ts` | **RC-3 fix:** settlement delegated to `MpesaMultiTenantService.querySTKStatus` (shop's own credentials, one convergence semantics); `markTransactionCompleted/Failed` duplicates removed; query attempts tracked (`queryCount`/`lastQueryAt`); **RC-4 fix:** new `reconcileRecentlyExpiredTransactions` cron re-queries recently-expired callback-less transactions (bounded: 24 h window, max 3 queries) and settles them on provider truth; cron overlap guards; manual `reconcileTransaction` also accepts EXPIRED (rescue path). |
| `apps/api/src/payments/daraja.service.ts` | **RC-3 fix:** `queryStkStatus` normalization — `ResultCode \|\| 0` default-to-success removed; missing/unparseable ⇒ `pending`/undefined; `0` ⇒ completed; terminal codes ⇒ failed; ambiguous (1037/17/unknown) ⇒ pending; `CallbackMetadata` parsed for the receipt when the query response carries it. |
| `apps/api/src/payments/services/mpesa.service.ts` | `queryMpesaStatus` delegates to the per-shop verified settlement (was: platform credentials + duplicate settlement logic). `processCallback`: terminal guard extended to `REVERSED`; **late-callback receipt backfill** on already-COMPLETED transactions (bookkeeping only, deduped). |
| `apps/api/src/payments/services/mpesa-transaction-manager.service.ts` | `queryMpesaStatus`/`handleTimeout` delegate settlement to the per-shop verified path (credentials + normalization + convergence in one place); timeout expiry is now an atomic status-preconditioned update. |
| `apps/api/src/payments/services/payment-transaction.service.ts` | Receipt backfill on the dedup paths (pre-read and unique-index race winner): backfills a missing receipt on the existing payment record and the order's embedded mpesa allocation; never overwrites an existing receipt. |
| `apps/api/src/payments/mpesa.controller.ts` | `callback-v2` now runs the exact same hardened, provider-verified pipeline as the primary callback (RC-5 closed); typed `MpesaCallbackDto`. |
| `apps/api/src/payments/schemas/mpesa-transaction.schema.ts` | Additive optional audit fields `shortCode`, `isShopSpecific` (previously written but silently dropped by strict mode). |
| `apps/api/src/cashier-p0-mpesa-callback.spec.ts` | Duplicate-callback test updated for the receipt-backfill behavior + new explicit backfill test (bookkeeping-only, one payment record). |
| `apps/api/src/payments/mpesa-callback-validation.spec.ts` | **New** — 13 ValidationPipe regression tests (below). |
| `apps/api/src/payments/mpesa-convergence.integration.spec.ts` | **New** — 17 database-backed integration tests (below). |
| `apps/api/.env.example` | Documents `MPESA_RECONCILIATION_ENABLED` (default true) and `MPESA_PAYMENTS_PAUSED` (default false). |
| `apps/api/package.json`, `pnpm-lock.yaml` | devDependency `mongodb-memory-server@^11.3.0` (disposable test MongoDB). |
| `scripts/audit-mpesa-convergence-readonly.js` | **New** — strictly read-only production audit script (Phase 4 runbook). |

Preserved by design (verified by tests): global `whitelist`/`forbidNonWhitelisted`/`transform` pipe config; F-08 provider verification as the only path to COMPLETED; tenant isolation (`shopId` on every settlement filter); transaction idempotency (terminal guard + unique `mpesaTransactionId` index); order monotonicity (never reopens voided/completed orders); zero inventory mutation at confirmation.

---

## 3. Automated test results

All commands run from `apps/api` with `node_modules/.bin/jest --runInBand`.

| Suite | Result |
|---|---|
| `payments/mpesa-callback-validation.spec.ts` (new, F-48) | **13/13 pass** |
| `payments/mpesa-convergence.integration.spec.ts` (new, Phase 3) | **17/17 pass** |
| `cashier-p0-mpesa-callback.spec.ts` (F-08 trust shield, updated) | **10/10 pass** |
| All 8 payments suites (incl. order-payment-authority, order-convergence, payment-reconciliation) | **108/108 pass** |
| **Full API suite** | **59/59 suites, 864/864 tests pass** |

F-48 regression coverage proves, against a real Nest HTTP app with the **exact** global pipe configuration from `main.ts`:

- a real Daraja **success** callback (decimal Amount, string receipt, numeric TransactionDate/PhoneNumber, and the `Balance` item with **no** `Value`) → 200 and reaches the handler with the parsed payload;
- a real Daraja **failure** callback (no `CallbackMetadata`) → 200 and reaches the handler;
- numeric-string `ResultCode "0"` → normalized to number `0` for the handler;
- rejected with 400: missing `Body`, missing `stkCallback`, missing `CheckoutRequestID`, missing `MerchantRequestID`, non-numeric `ResultCode`, metadata item without `Name`, non-object `Body`, unknown top-level property, unknown nested property (global `forbidNonWhitelisted` preserved, recursively);
- `callback-v2` alias runs the same validated pipeline.

---

## 4. Database-backed integration evidence

`payments/mpesa-convergence.integration.spec.ts` boots **real Mongoose schemas, real services, real unique indexes** against a disposable in-memory MongoDB (`mongodb-memory-server`, dropped between tests) with the Daraja HTTP surface mocked (`global.fetch` spy: OAuth, STK push, STK query). Every scenario below asserts against **persisted database state** (re-read documents), not mocks:

| # | Scenario | Database evidence asserted |
|---|---|---|
| 1 | Initiation persists a resolvable record (RC-2 regression) | `mpesa_transactions` doc: status `pending`, checkoutRequestId, stkPushSentAt, expiresAt, correct shopId/orderId/cashierId/amount |
| 2 | Callback-driven success | transaction COMPLETED + receipt; `paymenttransactions` record with correct shopId/orderId/cashierId/cashierName/amount/method/status/receipt; order `paymentStatus: paid`, `status: completed`, embedded payment completed with receipt |
| 3 | Duplicate callback | exactly **1** payment record for the CheckoutRequestID; order payments array not duplicated |
| 4 | Forged success callback | transaction FAILED (`callback_verification_failed`), **0** payment records, order allocation released to `failed`, order still pending/unpaid |
| 5 | Callback for unknown CheckoutRequestID | acknowledged; **0** transactions, **0** payment records created |
| 6 | Rejected payment (provider-confirmed failure) | transaction FAILED with result code 1032; 0 payment records; allocation `failed` |
| 7 | Delayed payment | unverified success claim stays PENDING (`callback_unverified`); scheduled reconciliation later settles COMPLETED + receipt + order paid (`recoveredViaQuery: true`) |
| 8 | Failed provider lookup + retry | stays PENDING with `queryCount: 1`; second reconciliation run settles; order paid |
| 9 | Missing receipt | reconciliation converges **without** receipt (payment record + order paid); late callback backfills receipt on transaction + payment record + order allocation — still exactly 1 payment record |
| 10 | Ambiguous provider outcome (missing ResultCode) | transaction stays PENDING; no payment record; order untouched — never success, never failure |
| 11 | Expiry + post-expiry rescue | `expireOldTransactions` → EXPIRED; post-expiry pass + provider success → COMPLETED + receipt + order paid |
| 12 | Post-expiry definitive failure | EXPIRED → FAILED on provider truth; allocation released |
| 13 | Concurrent callback + reconciliation race | exactly **1** payment record (unique provider index); order paid once |
| 14 | Merchant-specific credentials | OAuth Basic credential captured from the mocked provider = the **shop's own** `key:secret` |
| 15 | Tenant isolation | a foreign shop's query cannot settle another shop's transaction (atomic filter by shopId); no payment record, order untouched |
| 16 | Manual reconciliation | `reconcileTransaction` settles with full convergence |
| 17 | `MPESA_PAYMENTS_PAUSED=true` | new initiation rejected (no new record); the already-pending payment still settles and converges |

The read-only audit script (`scripts/audit-mpesa-convergence-readonly.js`) was itself verified end-to-end against a seeded disposable MongoDB: it correctly surfaced the seeded money→record gap, the at-risk expired transaction, and the pending population, while masking phone numbers and printing no secrets.

---

## 5. Phase 4 — Production operational readiness

### 5.1 Configuration evidence (from the repository — no secrets accessed)

| Setting | Value / source | Assessment |
|---|---|---|
| `MPESA_RECONCILIATION_ENABLED` | Not set in `render.yaml`/`.env.example` → code default `'true'` | Reconciliation **enabled** in production |
| `MPESA_PAYMENTS_PAUSED` | New switch; unset → `'false'` | Initiation currently **not** paused (see 5.4) |
| `MPESA_ENV` | `render.yaml` key present (value in Render dashboard) | Must be `production` for live shortcodes |
| `MPESA_CALLBACK_URL` | `render.yaml` key present | Must point at `https://<api>/payments/mpesa/callback` (no `/api/v1` prefix — excluded from the global prefix in `main.ts`) |
| `MPESA_ENCRYPTION_KEY` | `render.yaml` key present | **Must remain set** — without it shop credentials cannot be decrypted and every verification/reconciliation query fails (fail-safe: transactions stay pending, never falsely settled) |
| Cron cadence | reconciliation 5 min; expiry 5 min; post-expiry 5 min; transaction-manager timeouts 30 s | Single API instance (`ecosystem.config.js` `instances: 1`; Render single service) — in-process overlap guards are sufficient today |

### 5.2 Monitoring evidence — what to check (no log-stream access from this environment)

Render dashboard logs, after deploy, in order of appearance:

1. `M-Pesa reconciliation service enabled` (startup)
2. `STK push sent ... checkoutRequestId: ws_CO_…` **followed by a persisted record** (RC-2 fix — verify via the audit script §2: `pending without stkPushSentAt` must be 0 for new transactions)
3. `Processing M-Pesa callback for checkoutRequestId: …` — **this line appearing at all proves F-48 is fixed** (previously unreachable)
4. `M-Pesa payment successful (provider-verified) … receipt: …` / `Reconciled transaction … as COMPLETED`
5. Absence (after the first hours) of: `claimed success but provider verification did not confirm`, `amount mismatch`, `Failed to create payment transaction`, `Confirmed payment … lacks cashier attribution`

### 5.3 Pending/expired/inconsistent transaction assessment — runbook (read-only)

This environment has no production DB access; the operator should run:

```
node scripts/audit-mpesa-convergence-readonly.js
```

It prints, strictly read-only: counts by status; pending population (with unreconcilable/invisible-to-reconciliation flags); **expired-within-24 h never-reconciled transactions (the "paid but expired" at-risk population)**; COMPLETED transactions without a payment record; COMPLETED transactions whose order is not paid; duplicate payment records per CheckoutRequestID (double-credit check); orphan/cross-tenant payment records; and the flagged manual-review queue (`amount_mismatch`, `callback_unverified`, `callback_verification_failed`, `failure_claim_unverified`).

**Manual-review guidance (no financial records are modified by this task):**
- A transaction that is COMPLETED but whose order is unpaid → verify the receipt in the M-Pesa statement, then reconcile the order manually (the fix's convergence paths will also self-heal this population for *future* payments only).
- An expired transaction flagged at-risk → query the provider once (admin `POST /payments/mpesa/transactions/:id/reconcile-service`) before any refund/void decision.
- `amount_mismatch` transactions → never auto-settled by design; compare the claimed amount against the order and the M-Pesa statement.

### 5.4 Should new M-Pesa initiation be paused?

**Recommendation: YES — pause immediately, until the fix is deployed and verified.** Set `MPESA_PAYMENTS_PAUSED=true` in the Render environment (new switch, no code change needed to take effect). Rationale:

- On the production baseline (`2615f39`), every initiation sends a **real STK prompt** and then fails to persist the record (RC-2) — a customer who pays leaves zero convergence trail (no transaction, callback rejected per RC-1, nothing to reconcile). Each day unpatched risks real customer money with no order binding.
- The pause blocks **new** initiation only. **Existing pending payments are never cancelled silently** — they keep settling through the callback path and the (now shop-credential-based, normalized, post-expiry-rescuing) reconciliation loop; integration test 17 proves settlement continues while paused.
- Unpause condition: post-deploy verification (5.2) green **and** the read-only audit (5.3) shows zero new money→record/money→order gaps over a controlled test payment.

---

## 6. Remaining risks

1. **Multi-instance scaling:** the cron overlap guards are per-process. Horizontal scaling would duplicate provider queries (rate-limit pressure) but **cannot** double-credit — settlement is atomic status-preconditioned and the payment record is unique per CheckoutRequestID. Keep single-instance until a Redis-backed lock is added (same deployment rule as the PIN limiter in `CASHIER-P0-FINAL-PREFLIGHT1` §2.2).
2. **Legacy `/payments/stk-push` surface** (`PaymentsService`): sends real STK pushes with platform credentials and creates **no** transaction record — an orphaned-prompt path if anything ever calls it. The web POS does not call it; recommend removal or re-binding in a follow-up.
3. **`callback-v2` alias** now runs the verified pipeline but remains as a legacy URL; migrate any stored shop `callbackUrl` values to the primary `/payments/mpesa/callback` and remove the alias in a follow-up.
4. **Receipt-less convergence:** when the STK query response carries no `CallbackMetadata`, convergence happens without a receipt (by design — money→order binding first); the receipt is backfilled when the late callback delivers it. If no callback ever arrives, the receipt exists only in the M-Pesa statement.
5. **Daraja query semantics:** the provider's own eventual consistency means a query immediately after a success claim can legitimately report "still processing"; the design keeps such transactions unresolved and relies on the next reconciliation tick — bounded, but settlement of a delayed payment can take up to ~5 minutes (or the post-expiry pass within 24 h).
6. **`MPESA_ENCRYPTION_KEY` dependency:** losing it makes shop credentials undecryptable → all verification/reconciliation queries fail **safe** (pending, never falsely settled) but settlement stalls until the key is restored.
7. **Pre-existing spec type errors** elsewhere in the repo (371 `tsc --noEmit` errors in unrelated spec files) — untouched by this task; none in the changed files.

---

## 7. Release and rollback plan

**Release (only after review + authorization; nothing is pushed or deployed by this task):**

1. Reviewer approves commit `9c907c0` on `fix/cashier-p0-security-integrity1`.
2. Set `MPESA_PAYMENTS_PAUSED=true` in the Render production environment (takes effect without a deploy).
3. Push/merge to `main` → Render autoDeploy (API-first; no web changes in this commit).
4. Post-deploy verification, in order:
   - `/health` 200;
   - **F-48 marker:** POST a real-shaped Daraja callback to `/payments/mpesa/callback` → expect **200** and the `Processing M-Pesa callback` log line (was 400 on production);
   - controlled end-to-end test payment (sandbox or live test shortcode): initiate → pay → transaction COMPLETED, payment record created, order paid (audit script §4/§5 empty for the new transaction);
   - reconciliation log cadence present (`Reconciling N pending transactions` when applicable).
5. Only after 4 is green: set `MPESA_PAYMENTS_PAUSED=false` and monitor for 7 days (5.2 log lines + weekly read-only audit).

**Rollback:**

- `git revert 9c907c0` (single commit; no migrations; additive optional schema fields are backward-compatible — a rollback leaves them dormant).
- Rollback restores the known fail-closed state: callbacks 400 (F-48), initiation persisting nothing (RC-2). **Keep `MPESA_PAYMENTS_PAUSED=true` through any rollback** — the pre-fix state must not accept new customer prompts.
- No financial records are created, modified or deleted by either deploy or rollback path.

---

## 8. GO / NO-GO recommendation

| Decision | Verdict |
|---|---|
| Deploy commit `9c907c0` (with initiation paused) | **GO** — all 864 API tests pass incl. 30 new regression/integration tests; root causes RC-1…RC-6 fixed with database-backed evidence; rollback is a single clean revert |
| Unpause new M-Pesa initiation | **CONDITIONAL GO** — only after the §7 step-4 verification is green on production |
| Treat M-Pesa convergence as reliable | **NO-GO until 7 days** of production monitoring (5.2) + read-only audits (5.3) show zero new convergence gaps |
| Current production state (baseline `2615f39`, unfixed) | **NO-GO** — pause initiation now (§5.4); every unprompted day risks real customer payments with no order convergence |

---

*Prepared by MPESA-P0-CONVERGENCE1 (Devin) — no push, no deploy, no financial-record changes performed. Awaiting review and authorization.*
