# SMARTDUKA EMAIL-REPORTS-DEPLOY1 — Controlled Release Closeout

**Status:** `SMARTDUKA_EMAIL_REPORTS_DEPLOY1_PASS`
**Pushed SHA:** `2108785` (fast-forward `e7a0533..2108785`, no force)
**Scope honoured:** code deployment ONLY — no report sending activated, no DNS changes, no data modifications.

---

## Phase 1 — Pre-push authentication ✅

- `origin/main` confirmed unmoved at `e7a0533`; fast-forward merge of the 8-commit candidate; **PDF correction `158bc36` verified in the pushed history**.
- Flags verified in code: `REPORT_EMAILS_ENABLED` defaults **`false`** (`report-scheduler.service.ts:64`); `AI_NARRATIVE_ENABLED` requires explicit `true`. Per-shop preferences: every frequency `default: false`.
- **A real pre-push catch:** the mandatory build re-run exposed **10 build errors that earlier verification had masked** (the dist on disk was stale from a previous successful build, so grep-based build checks reported false success; jest compiles per-file without full-project typechecking). Fixed in `2108785`: the deleted queue processors' re-exports/imports removed (the dead queue paths are now fully gone), the report schemas export their Document types, `CurrentUser` imported from the project's auth decorator (not `@nestjs/common`), and the webhook's interface types use `import type`. Fresh dist verified to contain the release features before the push.
- FREE_MODE untouched (`FREE_MODE = true`); **0 diff lines** in auth/subscriptions/stripe.
- Final mandatory runs: full API suite **742/770** (failure set byte-identical to baseline); API + web builds clean (114 routes).

## Phase 2 — Integration & deployment ✅

| Event | Evidence |
| --- | --- |
| Push | `e7a0533..2108785 main -> main` (no force) |
| **Vercel frontend live** | **18:19:07 UTC** — probe: `/release-gate-fixtures/daily.pdf` 404 → 200 |
| **Render API live** | **18:19:38 UTC** — probe: `/api/v1/reports/preferences` 404 → 401 (route registered + guarded) |
| Liveness | `/health/live` 200 on every poll — **no observable downtime** |
| Health | mongodb/heap/rss all up; fresh process (uptime 119s at check) |
| Cross-version window | **~31 s** (frontend first) — covered by design: the new settings Reports tab degrades to its loading/error state against the old API; no sends possible (flag OFF); the old web + new API pairing is unaffected (additive endpoints) |
| Reporting endpoints | preferences/preview/scheduler-health all **401 unauth** (registered, guarded) |
| Webhook route | public, log-only: garbage POST → `{"received":false}` — **no send, no state change** |
| Existing surfaces | checkout 401 (guarded), auth/login 400 (validation live), `/help` 200, settings 307 (auth guard) |

## Phase 3 — Reporting safety ✅ (production, read-only)

| Check | Result |
| --- | --- |
| `reportpreferences` documents | **0** — nothing created at startup |
| `reportruns` documents | **0** — no scheduled runs exist |
| `email_suppressions` documents | 0 (populates only from verified permanent-bounce webhooks) |
| Report-digest emails ever sent | **0** |
| Email queue backlog | n/a — the dead queues were REMOVED; delivery is in-process |
| Duplicate scheduled runs | none (no runs exist; unique runId design) |
| Unauthorised recipients | none (no preferences docs; recipients resolve only from verified owner/admin users per shop) |
| Cross-shop disclosure | nothing generated; queries are shop-scoped (tested) |
| Authentication emails | **operational** — 3 OTP sends in the last 7 days, all `sent` via Resend; the most recent log entries are OTP-only |

## Phase 4 — Delivery infrastructure (inspected, NOT modified)

Live Resend API inspection (read-only, no secrets exposed):
- **smartduka.org: `verified`** in Resend (eu-west-1).
- **DKIM** (`resend._domainkey`): **verified** ✅
- **SPF** (`send` subdomain: `v=spf1 include:amazonses.com ~all`): **verified** ✅ — Resend's envelope path is fully configured (the earlier "no SPF" audit finding applied to the apex; the actual sending path is covered).
- **MX** (`send` → feedback-smtp.eu-west-1.amazonses.com): **verified** ✅ (bounce handling).

**Operator actions still required (separate approval, not applied):**
1. **DMARC** for smartduka.org: add `_dmarc` TXT `v=DMARC1; p=none; rua=mailto:<operator-address>` (monitoring first; tighten later). SPF alignment is subdomain-relaxed — fine under `p=none`.
2. **Webhook:** in the Resend dashboard create a webhook for `email.delivered` / `email.bounced` / `email.complained` → `https://api.smartduka.org/api/v1/notifications/email/webhook/resend`; set the signing secret in Render as `RESEND_WEBHOOK_SECRET` (verification activates automatically; until then the endpoint runs log-only and warns).
3. Optional apex SPF (`v=spf1 include:_spf.resend.com ~all`) if any sender ever uses the apex envelope.

## Phase 5 — Closeout

- **Pushed SHA:** `2108785` · Render + Vercel both serving it (probes above)
- **Smoke tests:** all read-only; **zero production sends, zero data mutations**
- **Feature-flag & recipient safety:** verified in production (§Phase 3)
- **Auth-email regression:** none observed (OTP path healthy before/after)
- **Rollback readiness: HIGH** — `REPORT_EMAILS_ENABLED=false` is the primary kill switch (already the state); code rollback = revert the 8 commits + fast-forward push, or dashboard-redeploy `e7a0533`; additive collections/indexes are harmless under the old code
- **Open risks:** webhook log-only until the secret is set; exactly-once external delivery approached (provider Idempotency-Key + no-retry-on-ambiguity) but not guaranteed against provider-side record loss (surfaced as manual-review failures); PDF charts tabular (v1); real-device email rendering pending the reviewer's fixture pass (https://www.smartduka.org/release-gate-fixtures/)

**Canary recommendation (when separately approved):** enable daily reports for the operator's own shop admin (one verified, consenting address) via Settings → Reports; observe one full cycle in Super Admin → Emails → Scheduler (queued → accepted → delivered after the webhook secret is set); then widen strictly by per-shop owner opt-in.
