# SMARTDUKA EMAIL-REPORTS-CORE1 — Implementation & Release Package

**Status:** `SMARTDUKA_EMAIL_REPORTS_CORE1_READY_FOR_REVIEW`
**Branch:** `feat/email-reports-core1` (from `origin/main` @ `e7a0533`) — **STOPPED before push/deploy; no production sends.**
**Commits:** `e306f34` (implementation, 28 files +3852/−680), `12bdf28` (pdfkit lockfile + onboarding design), `7192199` (e2e seed helper)

---

## 1. Implementation architecture

```
reports/
  schemas/report-preferences.schema.ts   shop-scoped consent (default OFF) + per-frequency schedules
  schemas/report-run.schema.ts           durable run identity + explicit outcome states
  report-preferences.service.ts          recipient resolution (verified owner/admin, tenant-scoped,
                                         deduped, unverified excluded), eligibility, unsubscribe
  report-scheduler.service.ts            15-min tick: due-run creation (idempotent by unique runId),
                                         atomic claiming, stale-claim recovery, backoff-paced
                                         retries, suppression, rate-limited delivery
  report-renderer.service.ts             branded HTML (mobile-safe tables) + plain text + pdfkit PDF
  report-narrative.service.ts            deterministic insights (facts/suggestions) + optional
                                         AI narrative (OFF by default, metrics-only, fallback)
  report-preferences.controller.ts       shop-admin preferences + preview (no send) +
                                         super-admin scheduler health/runs
notifications/email.service.ts           single-provider + controlled fallback + idempotency keys
notifications/email-webhook.controller.ts Resend delivery/bounce webhook (log-only until secret set)
super-admin/schemas/email-log.schema.ts  +idempotencyKey (unique sparse index)
queue/                                   dead stub processors REMOVED; email/reports queues removed
```

**No parallel engines:** one metrics source (`ReportsService.factsForRange`), one renderer, one delivery path (`EmailService`), one scheduler. The old AI scheduler's crons are retired; its manual trigger helpers remain.

## 2. Email delivery fixes (Phase A — acceptance met)

| Requirement | Implementation | Evidence |
| --- | --- | --- |
| No duplicate sends from multiple providers | Parallel mode REPLACED with single-provider + fallback-after-failure | `email-delivery.spec.ts`: "single provider: ONE provider only", "controlled fallback: one failure → one fallback" |
| Fallback cannot duplicate | Fallback fires only when the primary FAILED (nothing delivered); success breaks the chain | test: primary fail → exactly `[resend:FAILED, smtp:…]` |
| No false-success jobs | The fake-success email/stock/mpesa-callback processors DELETED (never registered, no producers); email/reports queues removed | build clean; queue stats no longer list them |
| Idempotent send keys | `idempotencyKey` option + unique sparse index; retry short-circuits on prior success; concurrent same-key send refused (11000) | tests: "retry short-circuits", "concurrent same-key refused" |
| Accurate statuses | `sent` = provider acceptance (provider + messageId recorded); delivered/bounced/spam via the Resend webhook (log-only mode until `RESEND_WEBHOOK_SECRET` is configured) | test: "status recording"; webhook controller |
| Attachments preserved | Resend path now base64-encodes attachments (previously silently dropped) | test: "attachments survive the Resend path" |
| Auth/payment behavior preserved | OTP/auth single-provider semantics unchanged; redaction untouched | test: "authentication emails keep single-provider semantics" |

## 3. Financial reporting regression evidence (Phase B)

`reports.service.spec.ts` (14 tests) against synthetic canonical orders:
- **Shop-local boundaries:** a 21:30Z sale = NEXT local day (00:30 EAT); 18:30Z = same local day; previous day separate.
- **Canonical separation:** billed 2,320 vs collected 1,660 vs outstanding 660; tax 320; refunds (completed events only); discounts (loyalty + events); payment-method breakdown (completed only).
- **Void/pending never count.**
- **Top products from `lineTotal`/`name`** — the old `item.price`/`item.productName` (nonexistent fields → 0-revenue "Unknown") are gone.
- **Tenant scoping** + currency from order snapshots/shop.
- **Weekly/monthly single-query** with breakdown sums == period totals; monthly excludes the next-month EAT sale.
- **Empty periods report honest zeros** — never fabricated.

## 4. Recipient/preferences implementation (Phase C)

`ReportPreferencesService` + controller + settings UI (`report-preferences-settings.tsx`):
- Global flag `REPORT_EMAILS_ENABLED=false` (default) gates the scheduler entirely.
- Per-shop: daily/weekly/monthly OFF by default; shop-local hour/day selectors; IANA timezone (validated); pause/resume; unsubscribe-all (explicit re-consent to resume).
- Recipients: verified owner/admin users OF THE SHOP only (tenant-scoped query, tested rejection for cross-shop users and cashiers); deduplication (case-insensitive); unverified accounts excluded; re-resolved at send time (never stale).
- Google-login accounts: ordinary verified users — same identity path (their email arrives verified from Google).
- Registration/OAuth NEVER implies consent.

## 5. Scheduler & idempotency evidence (Phase D)

`report-scheduler.service.spec.ts` (10 tests): flag-OFF inertness; due-run creation with deterministic identity (`shop:daily:2026-10-22:v1`); duplicate-tick prevention (unique runId); atomic claiming (a processing run is never re-claimed; losers touch nothing); suppression outcomes (unsubscribed / no recipients); backoff-paced retries to a 3-attempt cap (verified: no instant triple-retry within one tick); stale-claim recovery (crashed instance → queued); no-sales shops get honest zero reports (delivered, not skipped); multi-shop run scoping. Provider acceptance is recorded as `accepted` — **never `delivered` without webhook evidence**.

## 6. Professional report previews (Phase E)

- HTML: branded header band, KPI table (billed/collected/outstanding/refunds/tax/discounts/orders/items/AOV + prior-period change), payments-by-method, best sellers, low-stock (red band), insights (Fact/Suggestion labelled), dashboard CTA, preferences + unsubscribe links, generation timestamp (shop-local + UTC). Table-based inline-styled layout (mobile-Gmail safe); all user strings HTML-escaped (tested).
- Plain text mirrors every fact (tested).
- PDF (pdfkit, pure JS — no Chromium on Render): A4, branded header, KPI table, method breakdown, best sellers, low stock, insights, page numbers + generation timestamp (tested: valid header, hex-decoded text assertions, >1KB).
- **Preview without sending:** `GET /reports/preview?frequency=…&format=html|pdf` (admin-only) + an in-settings preview iframe.

## 7. AI narrative evaluation (Phase F)

- Deterministic insights built and tested FIRST (facts verbatim; suggestions grounded; no-sales honesty; no "Keep up the great work!" filler).
- AI path OFF by default (`AI_NARRATIVE_ENABLED=false`); when enabled: metrics-only prompt with explicit no-fabrication rules, 15s timeout, 300-token cap, one call per run (cost-capped); ANY failure returns the deterministic insights unchanged (tested).
- Placeholder AI services are NOT enabled anywhere (the stub anomaly/forecast/reorder services remain dormant and are no longer cron-driven).

## 8. Super Admin monitoring improvements (Phase H)

New "Scheduler" tab in Super Admin → Emails: enabled/instance state, queued/processing/accepted/delivered/failed/suppressed counts (30-day window), stale-claim warnings, recent 25 runs with recipients count/attempts/provider/error/status. Read-only — **no bulk-send controls exist**. Template inventory + logs + preview/test-send already existed and are unchanged.

## 9. Onboarding & retention (Phase G)

Design-only (`19-onboarding-retention-design.md`): consent-gated setup nudges (max 3), activation events (first product / first sale), no empty financial reports to inactive shops, measurement via activation/return-to-use (NOT email opens), suppression hygiene. No sends in this release.

## 10. Tests added (Phase I)

| Suite | Count | Covers |
| --- | --- | --- |
| `email-delivery.spec.ts` | 9 | duplicate prevention, fallback, false-success absence, idempotency, statuses, attachments, auth regression |
| `reports.service.spec.ts` | 14 | shop-local boundaries, canonical separation, voids/partials/refunds/discounts/methods, tenant isolation, currency, single-query periods, empty periods |
| `report-scheduler.service.spec.ts` | 10 | flag OFF, identity, duplicate prevention, atomic claims, suppression, backoff retries, stale recovery, no-sales, multi-shop |
| `report-preferences-narrative-renderer.spec.ts` | 15 | recipients/eligibility/dedup/tenant-scope/unsubscribe, narrative guardrails + AI fallback, HTML/text/PDF contracts |

**Full API suite: 724 passed / 28 failed — failure set byte-identical to the pre-change baseline (28 pre-existing scaffolding failures).** API + web builds clean; web tsc 0 errors.

## 11. Outstanding limitations & security risks

- **DMARC/SPF DNS records** still absent (operator action in Cloudflare; Resend DKIM present).
- **Resend webhook** runs log-only until `RESEND_WEBHOOK_SECRET` is configured (documented in the controller); full Svix HMAC verification should be added when the secret lands.
- **PDF charts** are tabular (no chart images) — acceptable for v1; chart rendering needs Puppeteer or SVG-in-pdfkit (future).
- **The `useSingleProvider` option** is now a no-op (uniform single-provider strategy) — kept for API compatibility.
- **Real-device email rendering** (Gmail Android/iOS) not visually verified — the templates use conservative table layouts; recommend a seed-recipient pass at release.
- **No production sends occurred** — all evidence is synthetic/local.

## 12. Deployment & rollback plan

- **Deploy order:** API first (new endpoints + scheduler), web second (preferences UI + observability). Either order is safe: the UI degrades gracefully if the API lacks the endpoints (loading/error states).
- **Feature flags:** `REPORT_EMAILS_ENABLED=false` (default — NO scheduled sends until explicitly enabled per the audit's no-mass-email rule); `AI_NARRATIVE_ENABLED=false` (default).
- **Enablement path:** deploy → operator sets up DNS (DMARC/SPF) → Resend webhook secret → enable the flag → canary on the operator's own shop → per-shop opt-in via the settings UI.
- **Rollback:** flag off stops all scheduled sends instantly; revert the branch commits (no migrations; two additive collections `reportpreferences`/`reportruns` + one additive log field); the email single-provider change reverts cleanly.
