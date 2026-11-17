# SMARTDUKA-MERCHANT-GROWTH-001 — Merchant-first homepage and safe freemium rollout

**Status:** Proposed commercial policy + implemented marketing preview; *not* a subscription-enforcement release.
**Baseline:** main \`be3514e9f9bb9185e87c7ea30e4b0438ce6f9164\`
**Safety:** No plan or billing mutations, no payment unpause, no production entitlements changed in this work.

## 1. User need and observed homepage problems

The 18 November 2026 mobile screenshot shows:
- Big blank vertical space between navigation and hero.
- "Free Point of Sale for Every Business" prioritises price over business value and credibility.
- Repeated free/open-source promises, even though subscription code still exists and a licensing grant was not verified in the repository tree.
- Introductory free access and "free forever, unlimited" are both advertised, which contradict one another.
- Claimed uptime and merchant/transaction counts without production evidence.
- An overly prominent donation flow which competes with shop sign-up.
- M-Pesa/STK activation promoted while the confirmed global safety pause remains in effect.
- A phone-width hero with a large headline and little useful product context.

**New positioning:**
- Headline: **Run Your Shop Smarter. Sell Faster. Grow with Confidence.**
- Sell the outcomes: a faster sale, reliable stock awareness, cashier workflow, everyday business visibility and understandable receipts.
- Primary action: **Create your shop**. Existing merchant action: **Sign in**.
- Clearly show introductory free access without promising unlimited usage forever.
- Illustrative POS preview uses no real merchant or customer numbers; labels are explicit.
- No fake testimonials, usage counts, uptime promises or stock/payment safety claims.

## 2. Product-led free tier to propose (not active)

| Capability | Free (proposed) | Starter (proposed) | Growth (proposed) |
| --- | --- | --- | --- |
| Locations (incl. main shop) | 1 | 1 | 2 |
| Distinct product **records** | 100 | 500 | 1,500 |
| Additional cashier/employee users | 1 | 3 | 5 |
| Day-to-day sales and checkout | Unlimited normal sales | Unlimited | Unlimited |
| On-hand stock quantity per product | No artificial cap | No artificial cap | No artificial cap |
| Core POS/barcode/search/receipt features | Yes | Yes | Yes |
| Everyday reports | Basic | Enhanced | Advanced |
| Multi-branch tools | Not needed | Not needed | Yes |
| Support | Self-service/email | Standard | Priority, when actually staffed |

"100 products" means **100 catalogue records**, not 100 physical units, not 100 monthly orders, and not a money/turnover cap.
Do not auto-charge or require a card for Free.
Do not cap or interrupt completed sales, stock deductions, refunds, transaction history, receipting, inventory audits, exports, account data access or legitimate support access.

**Pricing hypotheses, not final published prices:** Kenyan market testing could start around KES 999/month Starter and KES 2,499/month Growth. Australian merchant testing could start around A$19/month Starter and A$49/month Growth (local tax and processing fees need separate evaluation). Prices must be shown in the merchant’s billing currency with approved tax treatment, not just formatted by replacing a symbol. Neither subscriptions nor card billing should be launched by adding a static price to a web page.

## 3. Evidence from current code

- \`apps/api/src/subscriptions/subscriptions.service.ts\` seeds a legacy **25-product** trial, **250-product** Starter and **750-product** Basic, plus Silver, Gold, Daily. Existing DB plans are *not changed by seed* when records already exist.
- \`apps/api/src/subscriptions/subscription-guard.service.ts\` implements \`checkLimit\` and \`enforceLimit\` using subscription **cached usage counters**, not always authoritative counts.
- \`apps/api/src/inventory/inventory.service.ts\` calls \`enforceLimit('products')\` before creating a product; branch/user flows have separate calls.
- \`apps/api/src/subscriptions/subscription-enforcement.service.ts\` hardcodes \`FREE_MODE = true\` and grants full access; frontend \`subscription-guard.tsx\`, \`use-subscription-enforcement.ts\`, \`select-plan/page.tsx\` and settings also hardcode free bypasses.
- \`apps/api/src/subscriptions/subscription-scheduler.service.ts\` skips payment/dunning invoice actions while free; other status guards and background repair paths still contain expiry/suspension rules.
- \`apps/api/src/subscriptions/subscription-migration.service.ts\` historically provisions default Starter and resets branch counts to at least 1; existing store/branch count semantics require reconciliation.
- There is historical subscription payment and upgrade invoice integrity code. A flag flip could invalidate merchants’ prior payment rights, expired status, or invoices.
- No root LICENSE or COPYING file was found in the Git repository tree at review time. Public source availability **alone** does not prove a legal open-source licence.
- M-Pesa STK initiation remains paused under its separate financial safety controls.

**Conclusion:** **Do not set FREE_MODE to false.** That is not a safe freemium rollout plan.

## 4. Rollout stages with explicit gates

### Stage A — this branch: commercial truth and design
- Ship reviewable landing page and pricing clarity without turning on limits.
- Remove unsupported "open source"/"unlimited forever" and fake stats.
- Keep introductory free access available while the policy is finalised.
- Add non-binding documentation and tests for the proposed capacity semantics.

### Stage B — inventory and subscription audit, read-only
- Query per-shop authoritative product counts, employees, branches and active subscription/plan status. Aggregate only; do not export customer PII.
- Count **product documents** owned by shop in the main product collection; define whether archived records count before enforcing. Do not trust stale \`currentProductCount\` blindly.
- Inspect >100-product shops, shops missing subscriptions, legacy 25-product plans, paid invoices and pending upgrades.
- Identify all creation paths including bulk CSV imports, admin panels, mobile API, cashier, staff and branch routes. Check optimistic client gating.
- Reconcile historical subscriptions, paid benefits, business currency/tax rules and grandfathering before changes.

### Stage C — shadow mode (no rejection)
- Create a **central backend policy service** and controlled feature flag defaulting to off.
- Calculate per-shop entitlement from verified plan + grandfathering, count authoritative product entries, and return \`used\`, \`limit\`, \`remaining\`, \`mode\` and \`upgradeAvailable\` in a tenant-safe API.
- Warn at 70%, 90% and 100% capacity; do not spam, block checkout or use threats.
- Guard against concurrency (two simultaneous product creates), duplicate CSV imports, retries and cross-tenant usage.
- Run seeded + real-record simulations; maintain an audit log of would-be denials with no PII.

### Stage D — merchant notification and opted-in pilot
- Publish final plans, prices, taxes, checkout terms, effective date and cancellation policy in advance.
- Offer existing stores above the new threshold **grandfathered catalogue slots**; permit edits, stock updates, deletions and normal sales at all times. Do not silently delete products.
- Launch a small, authorised canary cohort of new accounts for the **create-additional-product** rule. Paid entitlement events must be authenticated before raising quota.
- Feature-flag rollback must restore add-product access immediately; never alter inventory or payment ledger records.

### Stage E — monetisation only after payment readiness
- Revalidate Stripe subscriptions + webhooks, M-Pesa subscription handling under pause, invoice idempotency and settled entitlements, including delayed/replayed callbacks.
- No M-Pesa STK unpause without separate authorisation.
- Enable paid upgrades only after a full staging test including failure modes, refunds, downgrade, grace and independent production rollback.
- Gate paid functionality based on server-side validated subscription, never just frontend flags.

## 5. Merchant retention without manufactured urgency

Daily return value comes from **useful operations**, not pop-ups:
1. Open shift / quick POS access.
2. True today sales, order counts and inventory warnings with loaded/error/empty distinctions.
3. Reorder list, accurate low-stock nudges and cashier handover.
4. Reliable end-of-day reconciliation and history.
5. Helpful optional weekly reports (opt-in with notification controls).
6. One-click data export, fast scanner, offline-state clarity, easy daily use.

Measure first-sale completion, day-1/day-7 active shops, weekly repeat sales sessions, checkout-to-receipt success, failed scans, product import completion, and paid conversion **without fabricated testimonials or invasive tracking**. Exclude cashiers from shop-level finance and subscription admin data.

## 6. Required acceptance

- 320/360/390/430px Android and desktop: first-screen hero, CTA and menu, light/dark, no horizontal overflow.
- Every public price/plan sentence accurately distinguishes current access from proposals.
- Confirm existing shops can still add products, sell and access records in this design-only preview.
- Check protected/admin/cashier redirects unchanged.
- SEO metadata, OpenGraph, FAQ JSON-LD and root/marketing alternate routes aligned.
- Preview and CI (API tests, web tests, lint/typecheck, build) pass on exact release head.
- No unauthorized payment or subscription enforcement occurs.
- Before any real limit: DB preflight, merchant notice, capacity UI, concurrency tests, legacy migrations, canary/rollback.
