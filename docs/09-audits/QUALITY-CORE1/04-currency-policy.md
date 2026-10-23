# QUALITY-CORE1 — Currency Policy Design & Implementation (P1-B)

## Policy (as implemented)

1. **Selection at creation** — unchanged; `CreateShopDto` / `RegisterShopDto` validate against `SUPPORTED_CURRENCIES` (51 currencies).
2. **Change allowed only before financial activity.** `CurrencyPolicyService.assertCurrencyChangeAllowed(shopId, current, requested)`:
   - same currency or no currency in the payload → allowed (not a change);
   - otherwise the shop's financial-record evidence is checked.
3. **Immutability once records exist** — `BadRequestException` with explicit guidance ("create a new shop; existing records and reports stay unchanged"). **No role override**, including super_admin — data integrity outweighs convenience; a manual ops script would be required for an exceptional, explicitly-approved migration (none provided).
4. **No automatic historical conversion** — now or ever.

## Evidence set (why "completed sales > 0" is insufficient)

| Collection | Query | Rationale |
| --- | --- | --- |
| `orders` | `exists({ shopId })` — ANY status | pending orders already carry denominated totals + payment allocations; void orders remain as records reports may reference |
| `paymenttransactions` | `exists({ shopId })` — ANY status | failed/pending/reversed settlements are still denominated records |
| `purchases` | `exists({ shopId })` | supplier bills and stock costs are denominated |
| `shifts` | `exists({ shopId, $or: [openingBalance>0, totalSales>0, transactionCount>0] })` | only money-bearing shifts count; a bare opened shift is operational, not financial |

All queries are tenant-scoped by `shopId` (verified by test).

## Investigated surfaces

- **Concurrency:** read-check → write is a small TOCTOU window (a sale committing between check and update). Accepted and logged (`Currency change blocked…` warn on the reject path); the window is milliseconds and the failure mode is a currency change that "should" have been blocked — detectable via the evidence endpoint. A transactional check across 4 collections was deliberately NOT added (cross-collection DDL-style locking is not worth the coupling here).
- **Shop imports:** no shop-import surface exists (only product import) — nothing bypasses the policy.
- **Historical transactions:** never rewritten; reports unchanged.
- **Branch currencies:** branches have no currency field — single shop-level currency; nothing to converge.
- **Tenant isolation:** the policy runs inside `ShopsService.update`, which is only reachable for the JWT shop (`PUT /shops/my-shop`, `PUT /shops/:id` both use `user.shopId`).
- **Admin overrides:** none (see policy point 3).
- **Refunds:** covered by orders evidence.
- **Opening balances:** covered by the shift money-facts predicate.
- **FREE_MODE / subscriptions:** subscription invoices are platform-side (KES/USD platform billing) and intentionally NOT part of shop-currency evidence.

## API surface

- `GET /shops/currency-policy` → `{ currency, currencyLocked, evidence }` (auth; own shop only).
- `PUT /shops/my-shop` / `PUT /shops/:id` → enforced server-side.

## Frontend

- Settings → Shop: currency `<select>` disabled when `currencyLocked`, with an explanation and new-shop guidance; when unlocked, helper text states the lock-after-first-financial-record rule.
- Save errors now surface the server's reason (e.g. the lock message) instead of a generic failure.

## Tests (`currency-policy.spec.ts`, 10 tests)

Detection breadth (each evidence type independently locks) · tenant scoping of every query · money-fact predicate shape for shifts · same-currency no-op · undefined-currency no-op · rejection message guidance · clean-change allowed.

**Not done (by design):** automatic conversion, back-dated currency edits, per-branch currencies.
