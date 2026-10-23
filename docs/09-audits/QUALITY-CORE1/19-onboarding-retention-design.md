# EMAIL-REPORTS-CORE1 (Phase G) — Onboarding & Retention Design (consent-respecting, no sends in this release)

## Baseline (read-only, 23 Oct 2026)

10 registered shops → 2 with products → 1 with sales (Load & Go). The funnel collapses at **inventory setup** (8/10 never added a product). 12 orphaned `shopsettings` docs (shops deleted or never completed). Email engagement to date: OTP + verification only.

## Principles

1. **No empty financial reports.** A shop with zero completed sales never receives a "0 revenue" digest — it receives ONBOARDING content instead (and only if opted in).
2. **Consent is explicit.** Registration/OAuth never implies marketing/report consent. Onboarding nudges are part of the account's core service communication ONLY when the shop opted in during setup (a single clear checkbox, default OFF).
3. **Measurement without misleading attribution:** activation = first product created; first-sale = first completed order; return-to-use = a subsequent session with activity. Email OPEN tracking is NOT used as an engagement metric (only delivered/bounced for hygiene).

## Onboarding journey (proposed)

| Stage | Trigger | Content | Channel |
| --- | --- | --- | --- |
| Day 0 | Shop verified | Welcome + setup checklist (add products → first sale) | Email (opt-in) + in-app checklist |
| Day 1/3/7 | No products yet | Setup nudge: import products (CSV import exists) / add first product | Email (opt-in) — max 3, then stop |
| First product created | activation event | Congratulate + guide first checkout | In-app |
| Day 7 after first product, no sale | still no completed order | First-sale nudge (POS link) | Email (opt-in) — max 2 |
| First sale | activation event | Congratulate + OFFER report emails (explicit opt-in — the C-phase preferences) | In-app |
| Inactive 30+ days (had activity) | re-eligibility check | One monthly "we're here" note — suppressed if unsubscribed/bounced | Email (opt-in) |

All nudges share the report scheduler's infrastructure (report_runs identity: `frequency: 'onboarding'` variants or a separate `nudge_runs` with the same idempotency design) — one engine, no parallel paths.

## Measurement plan

- **First-product activation rate:** shops with ≥1 product ÷ registered shops (per cohort month).
- **First-sale conversion:** shops with ≥1 completed order ÷ shops with ≥1 product.
- **Return-to-use:** shops with activity in week N after registration (sessions/heartbeats already logged in `activities`) — aggregate only.
- **Email hygiene (not engagement):** delivered/bounced/suppressed rates from the email log + Resend webhook.
- **Dashboard:** the Super Admin analytics tab gains the funnel (counts only; no PII).

## Explicitly out of scope for this release

No reactivation sends, no open tracking, no cohort emails — the design is documented for a future, separately-approved release.
