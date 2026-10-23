# SMARTDUKA POS-CURRENCY-CHECKOUT-P0 — Investigation & Corrective Implementation

**Status:** `SMARTDUKA_POS_CURRENCY_CHECKOUT_P0_READY_FOR_REVIEW`
**Mode honoured:** read-only production inspection → isolated local implementation. **Nothing pushed or deployed; no production record modified.**
**Commits (local `main`, unpushed):** `2886aa3` (implementation), `ee9cd69` (read-only inspection scripts)

---

## 1. Confirmed root cause with reproduction

### The reported case, reproduced from code + production evidence

| Symptom | Cause (verified) |
| --- | --- |
| Cart total shows **KSh 625** | `pos-cart-compact.tsx` / `pos-cart-sidebar.tsx` / `pos-mobile-cart-sheet.tsx` hardcoded a `Ksh` prefix, ignoring the shop currency |
| Bottom checkout shows **A$625.00** | `POSCheckoutBar` uses the injected `formatMoney(value, shop?.currency)`; the shop's stored currency is **AUD** |
| Payment confirmation shows **0 items** | `handleConfirmPayment`'s catch path queued the sale offline and **cleared the cart while the confirmation modal was still open** — the modal re-rendered from the now-empty cart state |
| Confirmation total **KSh 0** | Same desync: `total` recomputed from the emptied cart; the modal's formatter is also hardcoded `Ksh` |
| Tendered 1,000 → **change 1,000** | `change = max(0, amountTendered − total)` with total 0; the cash step's guard `amountTendered >= total` passes trivially against a zero total |

**Reproduction path:** cart with one item → Checkout → Cash → tender 1000 → Confirm → checkout POST fails (network/5xx **or any 4xx**) → offline queue + immediate `setCartItems([])` → confirmation modal still open, bound to live state → 0 items / 0 total / change = tender. Server-side, the empty-cart submission was already refused (`Cart must contain at least one item`) — but the client then queued an empty payload offline, stranding junk in the sync queue.

**Multiple implementations/state stores?** One cart state (`cartItems` in `/pos`), but **three currency formatter families** (hardcoded `Ksh`, hardcoded `KES`, shop-currency) and **two checkout surfaces** (`/pos` canonical; `/cashier/pos` dead-end with hardcoded 16% tax; `/cashier/checkout` broken stub — previously registered F-02/F-03).

## 2. Affected shop currency-history analysis (authorised read-only access)

**Shop: Load & Go — `SHP-00002-VCLTV`** (ObjectId `69f31ada3e6e44b7887130dd`), admin `dontech1914@gmail.com`. The reported **InkWave Organic Correction Tape** (SKU ICT-0090, barcode 805736260017, price 625) belongs to this shop — and so do the **original QUALITY-CORE1 incident orders** (STK-2026-JD2PTR, STK-2026-ERIQQ5).

Stored configuration: `currency: "AUD"`, no `country` field, tax snapshot `{enabled: true, rate: 0.16, name: "VAT"}` (Kenyan VAT).

**Financial history (all read-only inspected; 6 orders, 6 payment transactions, 0 receipts/purchases/shifts):**

| Order | Date (UTC) | Subtotal | Tax | Total | Recorded payment | PaymentStatus |
| --- | --- | --- | --- | --- | --- | --- |
| K8GAYK | 2026-05-04 | 7,960 | 0 | 7,960 | cash 7,960 (tendered 7,960, change 0) | paid |
| ZWKXQL | 2026-06-08 | 6,600 | 1,056 | 7,656 | cash 7,656 (tendered 7,750, change 94) | paid |
| A3HJN9 | 2026-10-15 | 215 | 34.40 | 249.40 | cash 237.25 (tendered 300, change 62.75) | **partial** |
| ERIQQ5 | 2026-10-23 02:52 | 805 | 128.80 | 933.80 | send_money 805 (M-Pesa ref HGGHJJJHG) | **partial** |
| JD2PTR | 2026-10-23 03:00 | 805 | 128.80 | 933.80 | cash 805 (tendered 900, change 95) | **partial** |
| PW-0VJ | 2026-10-23 03:18 | 25,021 | 4,003.36 | 29,024.36 | cash 25,021 (tendered 25,500, change 479) | **partial** |

**Findings:**
- **Every stored amount is KES-denominated in practice** (16% VAT, M-Pesa send-money, Kenyan cash denominations) while the configuration says AUD. The DB stores **AUD configuration + KES-amount records + no per-record currency** — orders, payment transactions and products have **no currency field at all**.
- **Currency-change trail: none exists.** `shopauditlogs` holds only verification events; `activities` (664 events for this shop, from 2026-07-29) contains no settings/currency events. The currency was AUD at least since the earliest surviving configuration snapshot; whether it was AUD at registration (2026-04-30) or changed later via the then-unguarded `PUT /shops/my-shop` (no audit before QUALITY-CORE1) **cannot be determined from the record** — stated honestly.
- **Registration validation gap (enabler):** `RegisterShopDto` validates country ∈ SUPPORTED_COUNTRIES and currency ∈ SUPPORTED_CURRENCIES **independently** — no country↔currency consistency rule; a shop could register AU/AUD and operate in Kenya.
- **Four of six orders are under-tendered partials** (the QUALITY-CORE1 P0 bug — client-quoted pre-tax totals), including one from 2026-10-23 03:18 UTC, created **before** the fix deployed at 07:29 UTC. The shop is owed 34.40 + 128.80 + 128.80 + 4,003.36 = **4,294.36** in uncollected balances (business decision required — see remediation proposal).
- Historical embedded-payment inconsistency: K8GAYK/ZWKXQL embedded cash allocations carry `status: 'pending'` while `paymentStatus: 'paid'` (pre-hardening data; the convergence primitive only flips external methods). Noted for the reconciliation backlog; no data rewritten.

## 3. Complete checkout data-flow map (as fixed)

```
handleCheckout (/pos page)
 ├─ guards: cart non-empty · total > 0 · settingsReady
 ├─ FREEZE checkoutQuote {itemCount, total, currency}        ← canonical quote
 └─ PaymentMethodModal (shop-currency formatter)
      ├─ cash: requires total > 0 ∧ tender ≥ total (change preview)
      ├─ mpesa: server-derived allocation (QUALITY-CORE1 R1)
      ├─ card: order-first, allocation-authoritative PaymentIntent
      └─ send_money: manual confirmation, amount reconciled (R2)
           ↓
handleConfirmPayment
 ├─ validateCheckoutSession(cart vs quote)  → refuse: empty-cart / zero-total / stale-quote
 ├─ payload.expectedTotal = quote total     → server 409 on divergence (unbypassable)
 ├─ POST /sales/checkout (server recomputes subtotal/tax/total authoritatively)
 │    ├─ ok → receipt from canonical order → partial toast if under-tendered
 │    ├─ 5xx/network → close modal → queue offline (same idempotency key) → clear cart
 │    └─ 4xx → close modal → surface error → KEEP cart (never queued)
 └─ resetCheckout (cancel) keeps the cart; quote cleared on every exit path
```

## 4. Corrective implementation — exact changed files (commit `2886aa3`)

**Server:** `sales/dto/checkout.dto.ts` (+`expectedTotal`), `sales/sales.service.ts` (quote-integrity 409 before any mutation; `order.currency` snapshot), `sales/schemas/order.schema.ts` (+`currency`), `sales/sales.module.ts` (+Shop model), `super-admin/super-admin.{service,controller}.ts` (+`PUT /super-admin/shops/:id/currency-remediation`).
**Client:** `lib/checkout-session.ts` (NEW — shared validators), `app/pos/page.tsx` (quote freeze/validation, submission guards, offline classification, modal-close-before-clear, cancel keeps cart, formatter wiring), `components/pos-cart-{compact,sidebar}` + `pos-mobile-cart-sheet` + `payment-confirmation-modal` + `mpesa-payment-flow-enhanced` + `receipt-preview-modal` (injectable shop-currency formatter), `payment-method-modal` (cash `total > 0` guard), `app/orders/page.tsx` + `app/payments/page.tsx` (shop-currency display instead of literal KES).

## 5. Financial-integrity regression tests

- **Server:** `checkout-currency-integrity.spec.ts` (13) — currency snapshots (KES/AUD/legacy-misconfigured/lookup-failure), quote-integrity 409s (stale cart, mid-checkout pricing change, tampered quote) with **no order + no stock mutation** proven, absent-quote backward compat, empty-cart/zero-total refusal, over-tender clamp with recomputed change, duplicate submission → canonical order.
- **Remediation:** `currency-remediation.spec.ts` (6) — audited apply, idempotency, thin-evidence rejection, unsupported/no-op targets.
- **Client:** `checkout-session.spec.ts` (11) — every guard incl. the exact incident shapes (0-item confirmation, change=full-tender, mixed-currency tender).
- Full financial suites: **314/314**; full API suite failure set **identical to the pre-change baseline** (28 pre-existing scaffolding failures); API + web builds clean; web jest 21/21.

## 6. Legacy shop remediation proposal (Load & Go — requires separate authorisation)

**Phase 1 — correct the configuration (the implemented, audited path):**
`PUT /super-admin/shops/69f31ada3e6e44b7887130dd/currency-remediation` with
`{ remediationId: "loadandgo-currency-001", targetCurrency: "KES", reason: "Shop operates in Kenya: 16% VAT snapshots, M-Pesa send-money settlements and KES cash denominations across all six orders (May–Oct 2026); configuration says AUD.", evidenceSummary: "Read-only inspection 2026-10-23: orders K8GAYK/ZWKXQL/A3HJN9/ERIQQ5/JD2PTR/PW-0VJ all KES-denominated; shopsettings tax=VAT 16%; no country field; no currency-change audit exists." }`
→ writes the audit event, corrects future operations, **touches no historical record**.

**Phase 2 — customer-facing explanation (draft):** "Your shop's currency setting was corrected from A$ to KSh on [date]. All past transactions were always recorded in Kenyan Shillings; only the currency label was wrong. No amounts were changed, converted, or deleted — receipts and reports keep their original values."

**Phase 3 — outstanding balances (business decision, per incident):** the four partial orders carry 4,294.36 uncollected. Options per order: collect the outstanding (cash/send-money), refund/void via transaction-controls, or write off. **No automatic write-off is performed.**

**Phase 4 — display separation:** historical orders carry no currency field; after remediation they display under the corrected shop currency (KES) — which matches their true denomination. For shops whose history is genuinely mixed, the new `order.currency` snapshot separates eras going forward; a per-record currency backfill is explicitly **NOT** performed (would be history rewriting).

**The other AUD shop** (SmartDuka `SHP-00009-22Y6Q`, country AU, 0 orders) needs no remediation — it has no financial records and can change currency through the normal settings UI.

## 7. Production-data safety assessment

- Inspection: **read-only** (find/count/aggregate projections; no customer PII extracted; no writes — connection used with a read-intent script set).
- Implementation: additive only (optional DTO field, optional schema field, new endpoint). No migration, no backfill, no deletion, no conversion.
- The two incident orders and all Load & Go records are byte-untouched.
- FREE_MODE/auth/subscriptions/stripe: 0 diff lines.

## 8. Risk & rollback plan

| Risk | Mitigation |
| --- | --- |
| `expectedTotal` rejects legitimate checkouts if client/server totals diverge | Tolerance 0.01; the client freezes the quote from the same mirrored tax rules; rejection message is actionable ("restart checkout"); absent field = legacy behavior |
| Old clients (deployed web) don't send `expectedTotal` | Field is optional — old clients behave exactly as the currently-deployed build |
| Remediation endpoint misuse | super_admin role guard + evidence-length requirements + idempotency + audit event; NOT called in this engagement |
| Order.currency additive field | Ignored by all existing readers; no migration |
| Rollback | Revert `2886aa3`/`ee9cd69` (plain git revert, fast-forward push); no schema/data blockers; orders created with `currency` remain valid |

## 9. Browser testing results & limitations

- Local verification: builds, typechecks, unit suites (server + client). The POS runtime flow was verified by code-path analysis and the extracted pure validators; a full interactive browser pass of the POS checkout (adding InkWave, cash tender, offline simulation) was **not** performed in this session — the dev-server preview from the previous phase is no longer running.
- Production verification: **not attempted** (deployment not authorised; no production credentials for an authenticated POS session).
- Real-device/mobile: unchanged limitation from QUALITY-CORE1 (documented).

## 10. Release recommendation

**`SMARTDUKA_POS_CURRENCY_CHECKOUT_P0_READY_FOR_REVIEW`** — recommend release after review, **API-first** (the `expectedTotal` guard + currency snapshot), then web. The Load & Go remediation (Section 6) is a **separately authorised production operation** — the tooling and evidence are ready; execution awaits approval.
