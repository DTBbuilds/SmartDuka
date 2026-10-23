# SMARTDUKA EMAIL-REPORTS-RELEASE-GATE1 — Final Release Acceptance

**Status:** `SMARTDUKA_EMAIL_REPORTS_RELEASE_GATE1_PASS`
**Release candidate:** branch `feat/email-reports-core1` @ **`0314db7`** (5 commits ahead of `origin/main` @ `e7a0533`)
**STOP honoured:** nothing pushed, nothing deployed, **zero production sends**.

---

## 1. Release candidate authentication

- Branch HEAD `0314db7`; `origin/main` unmoved at `e7a0533` (the audit report commit).
- Full diff `origin/main..HEAD`: **52 files, +8007/−697** — all in the reporting/email/queue/settings/super-admin-observability scope plus the fixture generator. **0 diff lines** in `auth/`, `subscriptions/`, `stripe/`, or `sales.service.ts` — authentication, FREE_MODE, payment systems and the checkout-integrity core are untouched.
- Additive schema/index behaviour (no migrations): `reportpreferences` (unique shopId), `reportruns` (unique runId + status/shop indexes), `emaillogs.idempotencyKey` (unique sparse partial index), `email_suppressions` (created lazily by the webhook). Old collections untouched; existing documents valid without changes.

## 2. Complete test results

| Suite | Result |
| --- | --- |
| `email-delivery.spec.ts` | **13/13** |
| `email-webhook.spec.ts` | **9/9** |
| `reports.service.spec.ts` | **14/14** |
| `report-scheduler.service.spec.ts` | **13/13** |
| `report-preferences-narrative-renderer.spec.ts` | **17/17** |
| **Full API suite** | **742 passed / 28 failed — failure set byte-identical to the pre-change baseline** (28 pre-existing scaffolding failures; 0 new) |
| Web | tsc 0 errors · jest 25/25 · production build ✅ (114 routes) |
| API | clean build ✅ |

## 3. Email reliability findings (Phase A)

| Requirement | Verdict |
| --- | --- |
| Single-provider + controlled fallback | ✅ proven — one provider per send; fallback fires only after a DEFINITIVE primary failure; success breaks the chain |
| Provider timeout / ambiguous acceptance | ✅ **implemented + tested** — an ambiguous outcome (timeout/reset after the request may have been accepted) stops the fallback chain, records the log as `pending` with an `AMBIGUOUS:` note, and the scheduler exhausts retries for manual review. Definitive rejections still fall back safely. **Honest limitation: exactly-once external delivery is NOT claimed** — it is approached via (a) the Resend `Idempotency-Key` header (provider-side dedup of retries) and (b) the no-retry-on-ambiguity rule; a provider that accepts and then loses the record before logging could still yield a rare duplicate, which is why the ambiguity is surfaced for human review rather than auto-retried |
| Idempotent retries after restart | ✅ the idempotency check reads the email log (DB) — process restarts cannot re-send a successful key |
| Concurrent identical keys | ✅ unique sparse index refuses the second send (11000 → "Duplicate send prevented") |
| Durable delivery outcomes | ✅ `report_runs` records queued/processing/accepted/delivered/failed/suppressed with provider + messageId + metrics snapshot |
| Correct webhook verification | ✅ **real Svix HMAC-SHA256** over the exact raw bytes (rawBody capture) with ±5-min replay tolerance; unverified events REJECTED when `RESEND_WEBHOOK_SECRET` is set; log-only mode (warned) without it |
| Duplicate/out-of-order webhooks | ✅ idempotent by messageId; terminal-state guards prevent regression (delivered ⇄ bounced) — tested both directions |
| Bounce & suppression | ✅ PERMANENT bounces → `email_suppressions`; the scheduler filters suppressed addresses at send time (all-suppressed → run suppressed); transient bounces never suppress — tested |
| OTP / password-recovery regressions | ✅ single-provider semantics + redaction untouched (tested) |
| No false-success email jobs | ✅ the fake-success queue processors are DELETED; email delivery is in-process with honest outcomes |

## 4. Scheduler & recipient verification (Phases C/D)

- **One logical identity per shop+frequency+period+version** (`shop:daily:2026-10-22:v1`) — unique index; duplicate ticks are no-ops (tested).
- **Concurrent workers:** atomic `findOneAndUpdate` claim — a processing run is never double-claimed; losers touch nothing (tested).
- **Render restarts:** stale claims (>15 min) recovered to queued (tested).
- **Delayed jobs / missed schedules:** only the LATEST due period is created, flagged `late`; **no multi-day back-fill after an outage** (tested — 5-day outage yields exactly one run for the most recent period).
- **Retry exhaustion:** backoff-paced (15 min), 3-attempt cap, terminal `failed` (tested); ambiguous outcomes exhaust immediately (tested).
- **Timezone boundaries:** shop-local day/week/month via Intl (tested: 21:30Z = next EAT day).
- **Recipient dedup + eligibility immediately before sending:** recipients re-resolved and eligibility re-checked INSIDE the delivery step (tested); roles re-checked at resolve time — downgraded/removed admins stop receiving (tested); per-shop Google-account isolation (tested); unverified addresses excluded (tested); paused/unsubscribed → suppressed (tested); flag OFF → nothing runs (tested).

## 5. Financial report reconciliation results (Phase B)

Synthetic canonical-order tests prove: billed vs collected vs outstanding separation (partial payments), completed-but-partially-paid orders counted as billed with the shortfall visible as outstanding, voids/pending excluded, refunds (completed events only), discounts (loyalty + events), correct top-product revenue from `lineTotal`/`name`, tax totals, empty periods as honest zeros, shop-local boundaries, currency from order snapshots/shop, cross-shop isolation, and breakdown-sums == period-total consistency (weekly + monthly). **Aggregate reconciliation against authoritative records is by construction: the report reads the same Order/PaymentTransaction documents as the sales module (single source), and the QUALITY-CORE1 reconciliation matrix's definitions (billed ≠ collected; outstanding = billed − collected) are encoded verbatim.**

## 6. PDF/email visual verification (Phase E)

Synthetic fixtures generated for daily / weekly / monthly / no-sales / long product names / multi-page stress (25 products, 12 low-stock, 8 insights) — **live for your inspection at http://127.0.0.1:63397** (PDF + HTML + TXT per example). Structural verification: honest page counts (daily/weekly/no-sales/long-names = 1 page; monthly = 2; stress = 2 — a spurious trailing page on EVERY report was found and FIXED: pdfkit 0.15 applies its default 72pt margins regardless of the margin option, so the footer write crossed maxY and auto-broke a page; the footer now sits at maxY − 12), page numbers + generation timestamps present, KSh currency formatting, shop name + period on every page, **no customer PII** in any fixture. HTML: table-based inline-styled mobile-safe layout, escaped user content, unsubscribe/preferences links. TXT mirrors all facts. **Visual inspection of the rendered images is the reviewer's step (no PDF rasterizer exists on this box) — the fixtures are served for exactly that.**

## 7. Security & privacy assessment

- No cross-tenant disclosure paths: every recipient/product/stock query is shop-scoped (tested); report runs carry only aggregate metrics (no customer PII; tested).
- No secrets in logs: the P1-13A redaction path is untouched; the webhook logs redact recipient addresses (masked in the suppression log line).
- Webhook: signature-enforced when configured; log-only mode is explicit and warned.
- Suppression honours permanent bounces; transactional security mail is never suppressed.
- No bulk-send path exists anywhere in the release (the only sender is the per-shop scheduler behind the OFF flag).

## 8. Deployment procedure (when authorised)

1. **API first** (Render autoDeploy on push): new endpoints + scheduler (flag OFF — zero sends) + webhook route.
2. Set `RESEND_WEBHOOK_SECRET` in Render env (from Resend dashboard) → webhook verification activates.
3. Operator DNS: add DMARC + SPF records for smartduka.org (Resend DKIM already present).
4. **Web second** (Vercel): preferences UI + observability tab (graceful degradation if the API lacked the endpoints).
5. Enablement (separate approval): set `REPORT_EMAILS_ENABLED=true` → canary on the operator's own shop → per-shop opt-in via Settings → Reports.

## 9. Rollback procedure

- **Instant:** `REPORT_EMAILS_ENABLED=false` stops all scheduled sends (no in-flight state to clean; failed runs remain for audit).
- **Code:** revert the branch commits + fast-forward push (no migrations; the additive collections/indexes are harmless under the old code); or dashboard-redeploy `e7a0533`.
- The email single-provider change reverts cleanly; no data transformations exist.

## 10. Final release recommendation

**APPROVE for controlled deployment** — the candidate is feature-complete against the mission, all 66 new tests + full-suite baseline parity pass, both builds are clean, and the flag-OFF default means deployment carries **zero email-sending risk** until separately authorised enablement. Remaining pre-enablement operator actions: DMARC/SPF DNS, `RESEND_WEBHOOK_SECRET`, and a seed-recipient visual pass of the fixtures at http://127.0.0.1:63397.
