# LOADGO-CURRENCY-REMEDIATION1 — Final Evidence & Controlled Correction Package

**Status:** `SMARTDUKA_LOADGO_CURRENCY_REMEDIATION1_READY`
**Mode honoured:** read-only verification + correction preparation. **The correction has NOT been executed.**

---

## Phase A — Final evidence verification

### A1. Production API & remediation capability (authenticated surfaces, unauth probes)

| Check | Result |
| --- | --- |
| API health | `mongodb: up`, `memory_heap: up`, `memory_rss: up` |
| `PUT /api/v1/super-admin/shops/69f31ada…/currency-remediation` | **401 unauth** — route live, guard active (JwtAuthGuard + RolesGuard + `@Roles('super_admin')`) |
| `GET /api/v1/sales/checkout-capabilities` | 401 unauth — the quote-integrity release is live |

### A2. Target shop identity (read-only, full document minus contact fields)

| Field | Value |
| --- | --- |
| Name / code | **Load & Go** / `SHP-00002-VCLTV` |
| Business type | gift_shop |
| **Address** | "Elizabeth street", county **Kisumu**, city "GREYSTANES" |
| **Recorded currency** | **AUD** |
| Tax snapshot | VAT enabled, rate 0.16 (Kenyan standard), updated 2026-05-12 |
| Verification | super-admin verified 2026-05-09 |
| Subscription | starter / trial |

The county field (**Kisumu — Kenya**) and the Kenyan 16% VAT configuration sit directly against the AUD currency setting; the city value ("GREYSTANES", a Sydney suburb) appears to be leftover registration-form data.

### A3. All six orders + six payment transactions (complete financial truth)

| # | Order | Date (UTC) | Items | Subtotal | Tax | Total | Recorded payment | PaymentStatus | Outstanding |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | STK-2026-K8GAYK | 05-04 03:47 | 3 items | 7,960 | **0** (pre-tax-config era) | 7,960 | cash 7,960 (tendered 7,960, change 0) | paid | 0 |
| 2 | STK-2026-ZWKXQL | 06-08 00:28 | 3 items | 6,600 | 1,056 (16%) | 7,656 | cash 7,656 (tendered 7,750, change 94) | paid | 0 |
| 3 | STK-2026-A3HJN9 | 10-15 03:06 | SweetJoy Candy Pack ×1 | 215 | 34.40 | 249.40 | cash **237.25** (tendered 300, change 62.75) | partial | **12.15** |
| 4 | STK-2026-ERIQQ5 | 10-23 02:52 | HerbalPlus Moisturizer ×1 | 805 | 128.80 | 933.80 | send_money 805 (M-Pesa ref HGGHJJJHG) | partial | **128.80** |
| 5 | STK-2026-JD2PTR | 10-23 03:00 | HerbalPlus Moisturizer ×1 | 805 | 128.80 | 933.80 | cash 805 (tendered 900, change 95) | partial | **128.80** |
| 6 | STK-2026-PW-0VJ | 10-23 03:18 | 13 items (incl. InkWave @ 625) | 25,021 | 4,003.36 | 29,024.36 | cash 25,021 (tendered 25,500, change 479) | partial | **4,003.36** |

All orders/transactions: **no currency field** (schema era), all methods cash/send_money, **zero refunds, zero returns, zero receipts, zero invoices, zero M-Pesa provider transactions, zero Stripe payments**.

### A4. Products, tax, payment methods, receipts

- **102 products**, prices 45–6,475 (KES-scale for a Kenyan gift shop), **no currency field** on any.
- InkWave Organic Correction Tape (ICT-0090, barcode 805736260017): price 625, cost 480 — matches the reported case exactly.
- Tax: VAT 16% enabled since 2026-05-12 (order 1 predates it — tax 0 is consistent, not an error).
- Payment methods observed: cash (5), send_money (1) — both KES-operational methods; **no Stripe** (would have been the only AUD-capable rail).

### A5. Genuine AUD evidence — NONE

- Zero records anywhere (orders, payments, products, receipts, audit logs, activities) carrying `currency: AUD`.
- No Stripe payments (the only AUD-capable settlement rail).
- No AU-country markers beyond the city string; county is Kenyan.
- Price scale, tax configuration, payment methods and customer phone formats are all Kenyan.
- One product is *named* "Pure Australian Drink Water" — a product brand, not a currency signal.

**Conclusion: the shop has ALWAYS operated in KES; the AUD value is a stored-configuration error, not a mixed-currency history.**

### A6. No financial records modified by previous releases

- Historical orders with `updatedAt` after today 07:00 UTC (release windows): **0**
- Historical transactions with `updatedAt` after today 07:00 UTC: **0**
- Order `updatedAt` values equal their `createdAt` values (never touched since creation).
- Shop audit log contains only the May verification event — no release has written to it.

## Phase B — Correction safety (verified: code + 6 tests + live deployment)

| Property | Verification |
| --- | --- |
| Explicit authorised access | `@Controller('super-admin')` + `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('super_admin')` — live 401 unauth |
| Targets only the identified shop | `findByIdAndUpdate(shopId, { $set: { currency, updatedAt } })` — single-document scope |
| Idempotent | `remediationId` dedup against the audit ledger — replay returns current state, no second event (tested) |
| Immutable audit event | `ShopAuditLogService.create` → append-only `shopauditlogs` with oldValue/newValue/reason/notes/performedBy (tested) |
| Preserves historical numerical values | Only the SHOP document's `currency` field changes; orders/payments/receipts are not read or written |
| No rewrite of orders/payments/receipts | No order/payment/receipt code path in the remediation method |
| No effect on other shops | Single-shop update; other shops' documents unreachable |
| No automatic exchange-rate conversion | None exists anywhere in the codebase; the audit note states it explicitly |
| Evidence gate | `reason` + `evidenceSummary` each ≥10 chars required (tested) |
| Currency allowlist | `SUPPORTED_CURRENCIES` membership required (tested) |

## Phase C — Outstanding-balance reconciliation (order by order)

| Order | Outstanding | Classification | Basis |
| --- | --- | --- | --- |
| STK-2026-A3HJN9 | 12.15 | **Defect artifact** — stale client quote | Customer paid 237.25 against the server's 249.40; the quoted amount implies a stale unit price (~204.53) vs the server's 215. The customer paid what they were shown and received change on it. |
| STK-2026-ERIQQ5 | 128.80 | **Defect artifact** — pre-tax client quote | Client quoted 805 (pre-VAT); server added 16% (933.80); customer paid the quoted 805 via send-money. |
| STK-2026-JD2PTR | 128.80 | **Defect artifact** — pre-tax client quote | Same class; cash 805 tendered 900, change 95 — the till balanced against the quoted amount. |
| STK-2026-PW-0VJ | 4,003.36 | **Defect artifact** — pre-tax client quote | Client quoted the pre-tax subtotal 25,021; server added 4,003.36 VAT; customer paid the quoted amount, change given on 25,500. |
| **Total** | **4,294.36** | **All four are defect artifacts — no legitimate receivables identified** | Every customer paid the amount they were quoted and received correct change against it. |

**Recommendation for the balances (owner decision, NOT automatic):** treat the four outstanding balances as write-off candidates (defect-caused phantom receivables) — the customers paid in full for the quoted prices. Alternatives per order: collect the difference (customer goodwill risk), or refund/void via transaction-controls. **No automatic action is taken by this engagement.**

## Phase D — Owner decision package

### Final currency recommendation
**Remediate AUD → KES.** The evidence is unambiguous: Kenyan county, Kenyan VAT (16%, configured May 12), KES-scale pricing, cash/M-Pesa operations, zero AUD-denominated records, zero AUD-capable payment rails. No mixed-currency history exists — this is a pure configuration correction, the safest possible remediation case.

### Verified evidence & exceptions
- Evidence: §A2–A5 (all read-only, repeatable via `scripts/inspect-loadgo-final-readonly.js`).
- Exceptions: order 1 (K8GAYK) predates tax configuration (tax 0) — correct for its era, no action. City "GREYSTANES" is inconsistent registration data — cosmetic, optional cleanup, NOT part of this correction.

### Exact proposed remediation operation (requires explicit approval)

```
PUT /api/v1/super-admin/shops/69f31ada3e6e44b7887130dd/currency-remediation
Authorization: Bearer <super_admin_token>

{
  "remediationId": "loadgo-currency-kes-2026-10-23",
  "targetCurrency": "KES",
  "reason": "Configuration correction: shop operates in Kenya (county Kisumu, VAT 16% since 2026-05-12, cash and M-Pesa send-money settlement, KES-scale pricing across 102 products); stored currency AUD has never matched any recorded operation.",
  "evidenceSummary": "Read-only inspection 2026-10-23: 6 orders / 6 payment transactions (May-Oct 2026) all KES-denominated; 0 records with currency AUD; 0 Stripe payments; 0 receipts/invoices; shopauditlogs contains only the 2026-05-09 verification event; no currency-change audit exists; historical records unmodified by releases (0 updatedAt after 2026-10-23T07:00Z on pre-existing records)."
}
```

### Before / after values

| Document | Before | After |
| --- | --- | --- |
| `shops/69f31ada…` | `currency: "AUD"` | `currency: "KES"` (+ `updatedAt` bump) |
| 6 orders | unchanged (amounts 7,960 / 7,656 / 249.40 / 933.80 / 933.80 / 29,024.36) | **unchanged** |
| 6 payment transactions | unchanged | **unchanged** |
| 102 products | unchanged | **unchanged** |
| shopsettings (VAT 16%) | unchanged | **unchanged** |
| shopauditlogs | 1 event (verify) | **2 events** (verify + currency-remediation) |

### Audit-log expectations
One new `shopauditlogs` document: `action: "update"`, `oldValue: {currency: "AUD"}`, `newValue: {currency: "KES"}`, `reason: "currency-remediation:loadgo-currency-kes-2026-10-23 — …"`, `notes: "Evidence: … Historical records unchanged; no conversion performed."`, `performedBy: <super_admin id>`, timestamped at execution.

### Rollback & recovery plan
1. **Revert the correction:** execute the same endpoint with `targetCurrency: "AUD"` and a new `remediationId` (e.g. `loadgo-currency-revert-001`) — the same audited, idempotent path. Both events remain in the audit trail (no history deletion).
2. **Data recovery:** the change is a single-field update on one document; the audit event records the exact before/after. MongoDB point-in-time recovery (if configured on the Atlas tier) covers the window as a second layer.
3. **Client effect:** the web caches shop currency in the auth context — refreshed on next page load; the POS formatters immediately display KSh (matching every historical amount's true denomination).

### Production acceptance checklist (post-correction, read-only)
1. `GET /shops/currency-policy` (as the shop admin) → `currency: "KES"`, `currencyLocked: true`.
2. Orders page: all 6 orders display `KSh …` amounts matching the table above (no value changes).
3. POS: new checkout quotes display KSh; a test checkout in the shop (owner-consented) creates an order with `currency: "KES"`.
4. Receipts/reports: totals unchanged; currency labels now KES.
5. `shopauditlogs` shows exactly one new currency-remediation event.
6. Other shops unaffected (spot-check one: currency unchanged).

**STOPPED before execution per the mission — the correction runs only on separate explicit approval.**
