# QUALITY-CORE1 — Release & Rollback Recommendations

## Release order (when separately approved)

1. **API first** (`apps/api`) — the tender/tax authority and currency policy are backward-compatible with the CURRENT deployed web client:
   - Exact-tender checkouts behave identically.
   - External (M-Pesa/Stripe) charges become server-derived — old clients sending client-quoted amounts get the correct charge (their hint is only a tamper check; a mismatching hint is rejected with a clear message, which the old client surfaces as a checkout error and the cashier retries — money-safe).
   - Under-tendered cash/send_money checkouts from the old client are now REJECTED with a message naming the outstanding amount — the cashier collects the difference and retries. This is the intended behavior change.
2. **Web second** (`apps/web`) — settings-ready gating, server-derived amounts, canonical receipts.
3. **No data migrations.** One additive settings field (`tax.inclusive`, default false). No historical records are touched.

## Behavior changes to communicate to shop owners

- Checkout now refuses to complete when the collected amount doesn't cover the order total (message names the outstanding amount). This prevents silent phantom receivables.
- Tax settings can finally be SAVED from the admin UI (the old API rejected every save); existing shops should review their VAT rate once after upgrade.
- Currency becomes locked after the first financial record.
- Per-item cart discounts remain quote-only — applying one will cause the checkout to be rejected (cash) or charged at full price (external) until F-04 lands. Communicate this to cashiers.

## Known rollout considerations

- **Legacy offline-queued orders** created by the OLD client with pre-tax amounts will be rejected at sync (R2) and remain in the local pending queue (visible count, "Sync failed" toast). Resolution: re-quote and re-collect, or delete locally. Expected volume: only orders queued during the settings-load window.
- **Legacy shops with a percent-valued tax rate** (>1) in settings: the tax page normalizes on load with a visible notice; the API now rejects >1 on write.

## Rollback

- Plain `git revert` of the branch commits (or redeploy the previous `origin/main` build). No schema changes block rollback; `tax.inclusive` simply becomes an unused field.
- Orders created under the new logic remain valid under the old logic (they are internally consistent by construction: allocations sum to the total).
- The jest `moduleNameMapper` can be reverted independently without runtime effect.

## Gate

`SMARTDUKA_QUALITY_CORE1_READY_FOR_REVIEW` — stop here; production push requires separate approval per the engagement boundaries.
