# SMARTDUKA EMAIL-REPORTS-AUDIT1 — Full Audit & Implementation Plan

**Status:** `SMARTDUKA_EMAIL_REPORTS_AUDIT1_COMPLETE`
**Mode honoured:** read-only production audit + source investigation + implementation planning. **No sends, no mutations, no pushes.**
**Production evidence:** read-only queries 23 Oct 2026 (scripts: `inspect-email-usage-readonly.js`, `inspect-loadgo-final-readonly.js`).

---

## 1. Email template inventory & live usage classification

### 1.1 Source-controlled templates (`notifications/email-templates.ts`, 20 defined; seeded to `emailtemplates`, all `active`, reseeded on every deploy)

| Template | Trigger (code path) | Production sends ever | Verdict |
| --- | --- | --- | --- |
| `otp_verification`, `otp_login_verification` | OTP service (login/password ops) | **60** (37+23; last 2026-10-23) | **KEEP** — the only proven-critical flow; single-provider (no duplicates) ✅ |
| `shop_verified` | super-admin verification | **9** (last 2026-08-24) | **KEEP** |
| `welcome` | shop registration | **0** — hard-disabled: `if (this.systemEventManager && false) { // FREE_MODE }` (`auth.service.ts:170`) | **KEEP, re-enable behind a flag** — the top retention lever |
| `daily_sales_report` | **NO live caller** — the scheduler's email path is commented out (`ai-report-scheduler.service.ts:196-198`) | **0** | **IMPROVE + WIRE** (the core of this engagement) |
| `password_reset`, `employee_invited`, `low_stock_alert` | auth/users/inventory paths | 0 logged (password-reset uses redaction; may predate the log) | KEEP |
| `subscription_*` (10), `payment_successful`, `shop_rejected`, `shop_suspended`, `plan_changed` | subscription dunning/lifecycle, super-admin actions | **0** — FREE_MODE (`subscription-enforcement.service.ts:63 FREE_MODE = true`) suppresses the billing lifecycle | RETAIN (dormant until monetisation) |
| Uncategorised sends | ad-hoc (`category: other/notification/support`) | 4 | — |

**Production totals: 76 sends logged / 21 unique recipient addresses / 73 sent, 3 failed (4%).** Failure causes: 2× invalid recipient format (Resend validation), 1× SMTP timeout + Resend DNS failure.

### 1.2 Delivery infrastructure (actual reachable paths)

| Path | State |
| --- | --- |
| **Direct `EmailService.sendEmail`** (in-process) | ✅ the ONLY working path — SMTP (Gmail) + Resend **fire in PARALLEL for non-auth emails** |
| **BullMQ email queue** (`queue/processors/email.processor.ts`) | ❌ **STUB — logs "processing" and returns success WITHOUT sending.** Any queued email is silently dropped while reporting success. (Moot in practice: Redis is optional in production; without it the queue system is disabled.) |
| **BullMQ reports queue** | ❌ **NO PROCESSOR EXISTS** — `addReportGeneration` accepts 'pdf' format jobs nobody consumes |
| **WhatsApp** (`whatsapp_configs` / `whatsapp_messages`) | ❌ **0 configs, 0 messages EVER** — the entire AI-report WhatsApp flow has never delivered |

**DEFECT (P1): parallel dual-send.** Non-auth emails go to SMTP **and** Resend simultaneously → recipients receive **two copies** of every email (the log records `provider: "smtp+resend"`). Only OTP/auth emails use single-provider.

### 1.3 Delivery statuses
Schema defines `pending/sent/delivered/failed/bounced/spam`; **only `sent`/`failed` are ever populated** — no Resend webhook → no delivered/bounced/opened evidence exists.

## 2. Existing AI report quality assessment

| Component | Finding |
| --- | --- |
| `AiReportSchedulerService` | Daily 20:00 **UTC** (= 23:00 EAT — the "8 PM local" comment is wrong; **no per-shop timezone**); weekly Sun 08:00 UTC; monthly 1st 09:00 UTC = **TODO — logs only, sends nothing**; email path **commented out**; WhatsApp path dead (0 configs) → **the scheduler has never delivered a single report** |
| `AiDataService.getDailySalesMetrics` | revenue = Σ `order.total` (**billed**, tax-inclusive, **includes partial orders' full totals** — the F-01 divergence: recognised sales ≠ settled payments); day boundaries in **server-local (UTC)** time, not shop-local; status filter `{completed, paid}` — `paid` is not a valid order status (dead clause) |
| `BusinessSummaryService` | `topProducts: []` placeholder; weekly `revenueChange: 0` placeholder; 7 sequential day-queries (N+1) |
| `AnomalyDetectionService.detectSalesAnomalies` | **STUB** — writes an audit entry, returns `[]` |
| `DemandForecastService.forecastDemand` | **STUB** — `return null`; `generateDemandInsights` logs only |
| `ReorderOptimizerService.generateReorderSuggestions` | **STUB** — returns `[]` |
| `ai_insights` collection | **0 documents ever generated**; `ai_audit_logs`: **1,211 entries** — all no-op cron bookkeeping |
| `ReportsService` (daily/weekly/monthly) | monthly: **no status filter** (void/pending orders count toward revenue); uses `item.price`/`item.productName` — **the OrderItem schema fields are `unitPrice`/`name`** → monthly top-product revenue = 0 and names = "Unknown" (real defect); weekly = 7 sequential daily queries |
| "Recommendations" | rule-based strings ("Keep up the great work!") — no AI involved anywhere |

**Verdict: the AI reporting stack is scaffolding with working aggregation primitives and zero real delivery, zero real AI, and several financial-accuracy defects.**

## 3. Email delivery infrastructure audit

- **Providers:** Gmail SMTP (port 465, pooled) + Resend HTTP API; Resend requires the verified domain (`noreply@smartduka.org`); free-mail senders fall back to the verified domain on Resend.
- **DNS (live check):** `resend._domainkey.smartduka.org` **present** (DKIM ✅ via Resend); **`_dmarc.smartduka.org` DOES NOT EXIST** (DMARC ❌); SPF: only google-site-verification TXT records found on the apex — **no SPF for the sending identity** (Gmail SMTP sends are covered by Gmail's infrastructure; Resend sends rely on the verified domain — SPF should be confirmed/added in Cloudflare DNS).
- **Retries:** SMTP 2× on transient errors; Resend none; queue-based retry = dead path (stub processor).
- **Duplicate sends:** parallel dual-send defect (§1.2); no idempotency key per logical email.
- **Suppression/unsubscribe:** **none implemented** (no suppression list, no unsubscribe headers on non-marketing mail — acceptable for transactional mail, required before any report/broadcast program).
- **Logging:** every send logged with provider, messageId, redaction support for secrets (P1-13A) — good foundation; statuses never progress past sent/failed (no webhooks).
- **Super-admin tooling:** templates CRUD/preview/reseed, stats, logs, retry, test-send, config test — complete and usable.

## 4. Recipient identity & permissions design (proposed)

- **Recipient resolution:** shop owner = `shops.ownerId` → `users` document; fall back to the shop admin user (`role: 'admin'`, earliest-created); Google-OAuth accounts are ordinary `users` documents (email verified at OAuth time) — same path.
- **Per-shop report settings** (new `report_settings` sub-document on `shopsettings` or a dedicated collection): `{ daily: {enabled, hour local}, weekly: {enabled, dayOfWeek}, monthly: {enabled, dayOfMonth}, recipients: [userId…], paused: boolean, timezone: IANA }` — admin-only writes, tenant-scoped.
- **Eligibility gate:** shop `status: active` + at least one verified admin recipient + report settings enabled + not suppressed. **No mass-send until preferences exist** (default OFF; the onboarding flow offers opt-in).
- **Suppression:** a `suppressions` collection (email, reason, date) checked before every send; transactional OTP mail bypasses suppression only for account-security necessity.

## 5. Daily/weekly/monthly report architecture (proposed)

```
ReportScheduler (per-shop, timezone-correct)
  ├─ for each eligible shop: compute local send instant (IANA tz via date-fns-tz)
  ├─ idempotency: report_runs collection {shopId, periodKey, status} unique index
  │    → duplicate-send prevention + retry resume
  ├─ ReportDataService (SINGLE authoritative metrics source):
  │    billedRevenue (Σ total, completed) · recognisedRevenue (Σ completed payments)
  │    outstanding (Σ total − received on completed) · refunds · tax · itemsSold
  │    orders · avgOrderValue · topProducts (correct unitPrice/name fields)
  │    lowStock · discounts — explicit [start, end) in SHOP-LOCAL time, round2, shop currency
  ├─ AiNarrativeService (optional): LLM summarises the VALIDATED metrics JSON only
  │    (no numbers invented — the narrative references the passed figures;
  │     deterministic fallback text when AI unavailable/disabled; cost-capped, cached per period)
  ├─ Renderers: HTML email (mobile-Gmail-safe tables) + plain text + PDF attachment
  └─ Delivery: EmailService single-provider (Resend primary, SMTP fallback — NOT parallel),
       logged with templateName/category 'report', linked reportRunId
```

Consolidation: **replace** the stub AI services' cron duties with this scheduler; retire the dead WhatsApp report path (or revive later behind the same ReportDataService); keep `ReportsService` as the on-screen report source but fix its defects (below) and have both share ReportDataService to end duplicated calculation logic.

## 6. Financial-accuracy corrections required (from the audit)

1. **Recognised vs billed:** never present Σ(order.total) as "payments received"; show both (billed revenue; received = Σ completed payments; outstanding = difference) — aligned with the QUALITY-CORE1 reconciliation matrix and the F-01 register item.
2. **Status filters:** completed-only for sales; exclude void/pending everywhere (fixes the monthly report's missing filter).
3. **Field names:** `unitPrice`/`name` (fixes monthly top-product revenue=0 / "Unknown" names).
4. **Timezones:** shop-local day boundaries (EAT for Kenyan shops) — the current UTC day boundary misassigns 03:00–03:00 EAT sales.
5. **Rounding:** round2 at presentation; currency from the shop's configuration (now snapshotted per-order by the checkout-integrity release).
6. **Expenses/profit:** NO expense module exists in production — omit profit claims entirely until real expense data exists.

## 7. Professional PDF capability audit

- **No PDF library exists** (`puppeteer`/`playwright`/`pdfkit` absent from `apps/api/package.json`). The only "PDF" is invoice **HTML** generated for print; the queue's 'pdf' report format has no processor; `canvas` (optional dep) powers barcode/QrCode images only.
- **Recommendation:** server-side HTML→PDF via **Puppeteer (bundled Chromium)** on Render, or `@react-pdf`/`pdfkit` for a lighter vector build; Puppeteer preferred for chart fidelity (reuse recharts server-side is NOT trivial — prefer simple SVG/CSS charts in the PDF template). Size target < 1 MB; retention: PDFs generated on demand per send, not stored (regenerable), or 30-day retention in object storage if caching is added.
- **PDF contents spec:** shop name + period (shop-local dates, currency-correct) · KPI summary (billed/received/outstanding/refunds/tax) · daily revenue chart + orders table · top-10 products · low-stock table · insights (facts vs suggestions labelled) · page numbers + generation timestamp (UTC + shop-local) · no customer personal data beyond aggregate counts.

## 8. Reliability & security test strategy

- **Unit:** ReportDataService boundaries (DST, month-ends, empty shops, partial-only days), rounding, currency snapshot use; narrative fallback when AI unavailable; suppression checks.
- **Integration:** report_runs idempotency (double cron tick → one send); retry resume after failure; recipient resolution (owner vs admin vs OAuth); tenant isolation (shop A's report never contains shop B data — query-scoped tests).
- **Delivery:** staging sends to seed addresses; Resend webhook → delivered/bounced statuses; dual-send removal verification (exactly one copy).
- **Security:** no secrets/recipient PII in logs (redaction regression tests); PDFs free of cross-tenant data; unsubscribe/suppression honored; scheduler disabled by env flag (`AI_REPORTS_ENABLED`) verified.

## 9. Shop retention baseline (aggregate, read-only — 23 Oct 2026)

| Funnel stage | Count |
| --- | --- |
| Registered | 10 (cohorts: Apr 2, May 3, Jul 2, Aug 3) — 10/10 marked active |
| Created shop settings | ≥10 (20 settings docs exist, **12 orphaned** — settings without matching shops: cleanup candidate) |
| Added products | **2** |
| Made first sale | **1** (Load & Go — 6 orders, May→Oct) |
| Returned after first sale | 1 (same shop; gap May→Jun then Oct) |
| 1/7/30-day return cohorts | **not measurable yet** (single selling shop; no event stream) |

**Onboarding abandonment: 8/10 shops never added a single product; 9/10 never sold.** The funnel collapses at inventory setup — before any report program can retain anyone, the report program itself should carry the onboarding message (e.g., "your first sale" nudges), consent-gated.

**Measurement plan (consent-respecting):** per-shop first-product/first-sale timestamps + report_runs as engagement events; retention = return-activity within 1/7/30 days of registration; NO device fingerprinting, NO cross-shop attribution, NO email-open tracking beyond Resend's aggregate webhook statuses (delivered/bounced — opens only with explicit consent if ever).

**Reactivation approach (proposed, consent-gated):** onboarding-completion emails (welcome re-enable + setup nudges at day 1/3/7) → then daily/weekly reports once the shop is active; pause on bounce/suppression; a monthly "we miss you" only for shops that opted into communications.

## 10. Prioritised implementation backlog

| # | Item | Pri |
| --- | --- | --- |
| 1 | Fix parallel dual-send → single-provider with fallback (stops duplicate customer emails) | P1 |
| 2 | Fix ReportsService defects (status filter, `unitPrice`/`name`, timezone, rounding) | P1 |
| 3 | ReportDataService + report_runs idempotent scheduler (daily/weekly/monthly, per-shop tz + pause controls, recipients = verified owner/admin) | P1 |
| 4 | Wire the `daily_sales_report` email (HTML + text) to the scheduler; default OFF per shop | P1 |
| 5 | DMARC + SPF records in Cloudflare DNS (operator action; Resend DKIM already present) | P1 |
| 6 | Resend webhook → delivered/bounced statuses; failure visibility in the admin email log | P2 |
| 7 | PDF attachment (Puppeteer) + branded template | P2 |
| 8 | AiNarrativeService with strict no-fabrication guardrails + deterministic fallback + caching | P2 |
| 9 | Welcome/onboarding emails behind a feature flag (FREE_MODE-respecting); suppression list | P2 |
| 10 | Retire stub AI crons + dead WhatsApp report path; consolidate into the scheduler | P2 |
| 11 | Orphaned shopsettings cleanup (12 docs) | P3 |
| 12 | Queue processor stubs: implement or remove the email/reports queues | P3 |

## 11. Release & rollback proposal

- **Phase 1 (P1 items 1–4):** one release; feature-flagged (`REPORT_EMAILS_ENABLED=false` default); canary: enable for the operator's own shop first; rollback = flag off (no data migrations; report_runs collection additive).
- **Phase 2 (items 5–7):** DNS changes are operator-executed and instantly reversible; PDF renderer behind the same flag.
- **Phase 3 (items 8–10):** AI narrative behind `AI_NARRATIVE_ENABLED` with cost caps; stub retirement is code-removal (revertible).
- **No mass email at any phase until recipient eligibility + preferences + suppression exist.**
