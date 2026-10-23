# QUALITY-CORE1 — Financial Mismatch Root-Cause Analysis (P0-A)

Incident: orders `STK-2026-JD2PTR` and `STK-2026-ERIQ05` (23 Oct 2026) — Orders page total **KES 933.80**, Payments page **KES 805.00**, payment status Completed, order status Completed, order payment badge **Partial**. Difference **KES 128.80 = exactly 16% of 805.00** (Kenya VAT).

## 1. Lifecycle trace (as found)

| Step | Location | Behavior found |
| --- | --- | --- |
| Selling price | `sales.service.ts` STEP 2 | Server-authoritative (`product.price`) — client price ignored ✅ |
| Tax settings | `shop-settings.service.ts` | `tax: { enabled, rate: 0.16 }` (fraction) ✅ |
| Tax-inclusive vs exclusive | `sales.service.ts` STEP 3 | **Exclusive only** — `total = subtotal + round2(subtotal × rate)`; no inclusive mode existed ❌ |
| Product-level tax overrides | `shop-settings.schema.ts` | `taxExemptProducts` / `categoryTaxRates` stored but **never read by checkout** ❌ |
| Cart subtotal/discount/tax | `pos/page.tsx` | Client-side quote; `Math.round` (integer!) for tax; **tax = 0 while `shopSettings` is null** ❌ |
| Checkout total shown to cashier | `pos/page.tsx` POSCart | Client quote (may be pre-tax during settings load) ❌ |
| Amount tendered / validation | `sales.service.ts` | **None** — client-sent allocation amounts persisted as-is ❌ |
| Order persistence | `sales.service.ts` STEP 4 | `total` server-computed; `payments[]` client-amounts ❌ |
| Payment persistence | `payment-transaction.service.ts` | Records client/server allocation amount as-is |
| Order completion | `sales.service.ts` | Non-external methods (cash/send_money) born `completed` even when tender < total ❌ |
| Receipts/invoices | `receipt.service.ts`, `invoice.service.ts` | Use persisted order fields (consistent with the order, including its defects) |
| Refunds/partial/outstanding | `transaction-controls.service.ts` | Solid (append-only events; partial orders cannot be voided) ✅ |
| Dashboard/analytics | `sales.service.ts` cashier stats | Revenue = `order.total` (billed), not confirmed receipts — definitional divergence (registered) |
| Stock deduction | `inventory.service.updateStock` | Mutation-evidence keyed, exactly-once ✅ |

## 2. Root cause (proven by fixture)

`apps/api/src/sales/checkout-financial-integrity.spec.ts`, test
`STK-2026-JD2PTR fixture: send_money 805.00 tender against a 933.80 taxable basket`:

1. Shop settings: VAT enabled, rate 0.16 (fraction).
2. Basket: product priced 805.00 (server-authoritative price).
3. Client state: `shopSettings === null` (fetch in flight or non-ok — the old code left it null forever on a non-ok response) → `calculateTax()` returned **0** → client displayed and sent **`payments: [{ method: 'send_money', amount: 805 }]`**.
4. Server: `subtotal 805.00 + tax 128.80 = total 933.80`; classified `send_money` as **non-external → 'completed' at birth**; persisted the client's 805.00 allocation unchanged; `paymentStatus = partial` (805 < 933.80).
5. Result = the exact production evidence: order Completed, payment Completed (805.00), badge Partial, difference exactly 16% of the tender.

**Classification: incorrect backend persistence of an unreconciled client-supplied tender, triggered by incorrect frontend presentation (pre-tax quote during settings load).** It is NOT legitimate tax and NOT double-applied tax — the tax was computed once, correctly, by the server; the defect is that the *charged* amount bypassed it.

### Contributing defects (same class, all fixed)

| # | Defect | Effect |
| --- | --- | --- |
| C1 | Client quote computed with tax = 0 while settings unresolved; non-ok settings response left it unresolved for the whole session | Cashier shown/charged pre-tax total |
| C2 | Server persisted client-sent allocation amounts without reconciling against server total | Under/over-charges became permanent records |
| C3 | Non-external methods born `completed` with tender < total | Silent phantom receivable (no add-payment flow exists to ever settle it) |
| C4 | Client tax used `Math.round` (integer) vs server `round2` | 1-shilling display divergence (e.g. 934 vs 933.80) |
| C5 | Loyalty discount subtracted client-side unconditionally; server applies it only if redemption succeeds | Charged amount ≠ displayed amount in either direction |
| C6 | `taxExemptProducts` / `categoryTaxRates` stored but ignored by checkout | Overcharge of exempt/zero-rated items |
| C7 | Settings DTO had no `tax` property; global `forbidNonWhitelisted` pipe rejected every tax-settings save | Shops could not change tax settings at all |
| C8 | Tax rate accepted 0–100 unnormalized (percent vs fraction) | A "16" entry = 1600% tax |
| C9 | Offline fallback payload fabricated `taxRate: 0.02` | Misleading replay payloads (server ignores the field) |
| C10 | Receipts built from client state, not the canonical order | Receipt totals could disagree with the persisted order |

## 3. The fix (contract)

- **R1 — external allocation authority:** mpesa/stripe allocation amounts are **server-derived** from the payable balance (`finalTotal − confirmed non-external tender`); client-sent external amounts are tamper hints only. Single external allocation → remainder; multiple → must already sum to the remainder (else 400). Remainder ≤ 0 → allocation dropped. The STK push / PaymentIntent (already allocation-authoritative via `OrderPaymentAuthorityService`) now always charges the true balance.
- **R2 — no silent phantom receivable:** non-external tender below the payable with no external coverage → **400** naming the outstanding amount; unexplained over-tender → **400**; over-tender with change mechanics (`amountTendered ≥ amount`) → clamped to the payable with `change` recomputed.
- **R3 — tax authority:** grouped per-rate computation honoring exemptions/category overrides; 2-decimal rounding; **tax-inclusive mode** (`settings.tax.inclusive`) extracts VAT from shelf prices instead of adding; loyalty resolves **before** money math.
- **Client:** checkout blocked until settings resolve; non-ok settings → fail closed to the server default; quote mirrors server rules; M-Pesa/Stripe charge the server-derived allocation; receipts/success toasts use canonical server order values.

## 4. What was intentionally NOT changed

- Historical orders (incl. the two incident orders) are **never rewritten**. Remediation for the two production orders is a business decision (collect the 128.80 outstanding, refund, or write off) — recommend using the existing transaction-controls flows.
- `send_money` remains client-confirmed at birth (existing settlement model, P0-10C); its amounts are now reconciled by R2.
- Per-item cart discounts remain **quote-only** (server ignores them) — see register item F-04 for the recommended design; honoring client-sent discounts would reopen the undercharge hole R2 closed.
