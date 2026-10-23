# QUALITY-CORE1 — Order / Payment / Tax Reconciliation Matrix

Canonical definitions established by this investigation (enforced server-side in `sales.service.ts`):

| Term | Canonical definition | Where enforced |
| --- | --- | --- |
| **Subtotal** | Σ round2(authoritative unitPrice × qty) — shelf prices, before tax, before loyalty | checkout STEP 3a |
| **Discounts** | `loyaltyDiscount` (points × 1 KES, applied only on successful redemption) + post-sale `DiscountEvent`s (transaction-controls). Per-item cart discounts are quote-only (registered F-04) | checkout STEP 3c |
| **Tax** | Σ over rate groups of (group base × rate); groups from shop rate, `taxExemptProducts`, `categoryTaxRates`; inclusive mode extracts from payable | checkout STEP 3d |
| **Order total** | Exclusive: round2(subtotal + tax) − loyalty. Inclusive: payable (subtotal − loyalty); tax is informational | checkout STEP 3d |
| **Amount received** | Σ amounts of `completed` payment records (embedded + PaymentTransaction) | paymentStatus derivation |
| **Outstanding balance** | total − received (− refunded). Surfaced client-side from the checkout response; partial orders announce it via toast | POS success path |
| **Refunded amount** | Σ completed `RefundEvent`s (append-only; external methods are `manual_required` until provider reversal) | transaction-controls |
| **Recognised sales** | ⚠️ Currently `order.total` on completed orders (billed). Divergence vs Payments page (settled transactions) registered as F-01 with recommendation | cashier stats |
| **Payment method** | `cash`, `send_money`, `mpesa`, `stripe`, `card`, `qr`, `bank`, `other`; mpesa/stripe are external-settlement | checkout STEP 3e |
| **Order fulfilment status** | `pending` (external settlement unresolved) → `completed` (fully paid or non-external born-complete) → `void` (append-only voidOperation) | checkout + convergence |
| **Payment settlement status** | Embedded allocation: `pending` → `completed`/`failed`/`reversed`; PaymentTransaction mirrors | convergence services |

## Reconciliation matrix — the incident orders

| Field | Orders page | Payments page | Reconciled? | Explanation |
| --- | --- | --- | --- | --- |
| Amount | 933.80 (order.total) | 805.00 (transaction.amount) | ❌ pre-fix | Client tender (805) persisted against server total (933.80); difference = 16% VAT of tender |
| Order status | Completed | — | born-completed (non-external `send_money`) | C3 |
| Payment status | Partial (badge) | Completed (transaction) | consistent *given* the defect | partial = received < total; transaction Completed = client-confirmed method |
| Post-fix equivalent | 933.80 | 933.80 (server-derived allocation) | ✅ | R1 charges the balance; R2 rejects unreconciled tenders |

## Method classification audit

| Method | Birth status | Settlement evidence | Notes |
| --- | --- | --- | --- |
| CASH | completed | client assertion (drawer) | change mechanics validated (R2 clamp) |
| SEND_MONEY | completed | client assertion (manual transfer) | amount reconciled by R2 |
| M-Pesa (STK) | pending | Daraja callback/query only | amount server-derived (R1) |
| Stripe | pending | PaymentIntent retrieve / verified webhook | amount server-derived (R1) |
| Split (cash + external) | pending | mixed | external gets remainder (R1) |
| Split (2 externals) | pending | mixed | must sum to remainder (R1) |

## Test coverage added (`checkout-financial-integrity.spec.ts`, 18 tests)

Taxable / zero-rated / exempt / category-override / tax-inclusive / tax-exclusive · mixed baskets · split payments · loyalty success & failure · rounding (128.80 not 129) · over/under-tender · allocation drop · idempotent retries (hint vs tender changes) · settings-lookup failure fallback.
