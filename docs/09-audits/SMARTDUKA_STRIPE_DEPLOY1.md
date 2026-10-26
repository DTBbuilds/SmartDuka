# SMARTDUKA_STRIPE_DEPLOY1 — Controlled Release Preflight

**Status:** `SMARTDUKA_STRIPE_DEPLOY1_PREFLIGHT_READY`
**Mode honoured:** production preflight ONLY — nothing pushed, deployed, enabled, or mutated. **Awaiting explicit owner authorisation to push.**

---

## 1. Pre-deployment checks — all PASS

### 1.1 Git state & deployment triggers
- **Remote HEAD:** `origin/main` @ `f248ff4` (unmoved since the release gate)
- **Local HEAD:** `725bbf3` — **5 commits ahead, all fast-forwardable** (verified `merge-base --is-ancestor`):
  `0870c93` (email-report canary hardening) · `d01fe24` (canary report) · `b8ab68e` (Stripe FIX1) · `4227370` (gate corrections) · `725bbf3` (gate report)
- **Working tree:** clean except the sitemap line-ending churn (no content change) and two untracked dirs (`docs/09-audits/SMARTDUKA-STRIPE-MULTITENANT-AUDIT1.md` — preserved per the audit's no-commit constraint; `V2-MASTER-BACKLOG-RECON1/`) — **excluded from the push**
- **Deployment triggers:** Render `autoDeploy: true` + health check `/health/live`; Vercel auto-deploys main. A push deploys BOTH — the ~31s cross-version window observed last release is covered by graceful degradation (additive endpoints; the new web's new calls fail harmlessly against the old API).

### 1.2 CI enforcement (verified in `.github/workflows/ci.yml`)
- Type check API: **mandatory** (failures fail CI)
- API tests: **mandatory** (failures fail CI)
- Artifact verification: `dist/src/main.js` + `.next/BUILD_ID` must exist and be **fresher than the build start** (stale output fails CI)
- The single remaining `continue-on-error` is the advisory `pnpm audit` (security scan) — intentional, not a blanket bypass
- Current suite state: **793/793 API tests passing** — CI will be green

### 1.3 Environment variables (presence/mode only — no values printed)

| Variable | Local `.env` | `render.yaml` | Production effect |
| --- | --- | --- | --- |
| `STRIPE_SECRET_KEY` | **TEST mode** | declared (sync: false) | test-mode platform — Connect OAuth impossible (unchanged by this release) |
| `STRIPE_PUBLISHABLE_KEY` | **TEST mode** | declared (sync: false) | matches the secret's mode ✓ |
| `STRIPE_WEBHOOK_SECRET` | SET | declared (sync: false) | signature verification active |
| `STRIPE_CONNECT_CLIENT_ID` | not set | **ABSENT** | Connect OAuth URL generation 500s — **operator gap** (unchanged) |
| `STRIPE_CONNECT_REDIRECT_URI` | not set | **ABSENT** | same operator gap |
| `RESEND_WEBHOOK_SECRET` | not set | **ABSENT** | the Resend webhook endpoint rejects all events (400) — zero mutation, by design |
| `REPORT_EMAILS_ENABLED` | not set | not set | **code default `false` applies** — no scheduled report sending |
| `AI_NARRATIVE_ENABLED` | not set | not set | code default — AI narrative OFF |
| `AI_REPORTS_ENABLED` | empty | not set | moot — the old AI scheduler's crons were retired |

### 1.4 Webhook interruption analysis
- **Stripe webhook** (`/stripe/webhook`, prefix-excluded): after this release, unsigned/malformed requests receive **400** (previously 200). Interruption risk: **NONE observed** — production has 0 connected accounts, 0 payments, 0 recorded events → Stripe is not delivering anything to interrupt. If a platform webhook endpoint IS registered in the Stripe dashboard (NOT VERIFIED — dashboard access required), signed events verify with the configured `STRIPE_WEBHOOK_SECRET` and are unaffected; a secret MISMATCH would surface as redelivered 400s — the operator should confirm the secret matches at enablement. Stripe's automatic endpoint disabling after repeated failures is a residual operator-verification item.
- **Resend webhook** (`/notifications/email/webhook/resend`): **not registered anywhere yet** → nothing to interrupt. The stricter reject-without-secret behaviour only hardens an endpoint nothing points at.
- **M-Pesa callback** (`/payments/mpesa/callback`): untouched by this release (0 diff lines in the M-Pesa path) — no interruption.

### 1.5 Disabled-state confirmation
- **Live Stripe card acceptance: DISABLED** — test-mode platform + 0 connected accounts + the `requireConnectedAccountId` readiness gate + the new mode-consistency gate. The release cannot enable payments by itself.
- **Email-report sending: DISABLED** — `REPORT_EMAILS_ENABLED` defaults `false`; production verified with 0 preference/run/suppression documents and 0 digest emails ever.

### 1.6 OAuth state collection safety
- `oauthstates` materializes on the next deployment (the model ships in `b8ab68e`); Mongoose `autoIndex` is NOT disabled → the unique nonce index + 20-min TTL index auto-create on model compilation.
- The Atlas user can create collections/indexes (evidenced by `stripepayments` and prior collections). Multi-instance safety: atomic `findOneAndDelete`.
- **Post-deploy smoke check:** verify `oauthstates` exists with the unique + TTL indexes.

## 2. Rollback procedure & last known-good deployments

- **Last known-good production:** app code **`2108785`** (currently serving; the `f248ff4` docs-only redeploy is behaviourally identical).
- **Instant kill switches (no rollback needed):** `REPORT_EMAILS_ENABLED=false` (already the state) stops all report sending; card payments stay gated by the readiness checks regardless.
- **Code rollback:** `git revert` the release commits + fast-forward push (no force), OR Render/Vercel dashboard redeploy of `2108785`. No migrations; the additive `oauthstates` collection is harmless under the old code (it simply goes unused).
- **Halt criteria (during the post-push verification):** health check failures, new test failures in CI, OTP/auth-email regression, or any unexpected route behaviour → halt + execute the rollback.

## 3. Controlled release procedure (NOT executed — awaiting authorisation)

1. Push `f248ff4..725bbf3` (fast-forward, no force).
2. Require green CI (mandatory typecheck/tests/artifact verification) — Render/Vercel deploy.
3. Monitor: `/health/live` 200 throughout; behavioural probes — `/api/v1/reports/preferences` 401 (unchanged), `/stripe/webhook` unsigned → **400** (the corrected behaviour), `/stripe/config` unchanged (test-mode), `/release-gate-fixtures/daily.pdf` 200 (frontend).
4. Verify `oauthstates` collection + unique/TTL indexes in the production DB (read-only).
5. Verify authenticated routes reject unauthorised access (401s) and the OTP path remains operational (recent-send evidence).
6. Confirm `REPORT_EMAILS_ENABLED` remains OFF (no digest emails; 0 preference documents).
7. Record the deployed SHA + platform deployment identifiers in this report.
8. **Halt + rollback on any failure.**

## 4. Outstanding operator requirements (unchanged, separately approved)

1. **Stripe enablement:** LIVE `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY` + `STRIPE_CONNECT_CLIENT_ID` + `STRIPE_CONNECT_REDIRECT_URI` (add to Render AND `render.yaml`) + webhook endpoint registration in the Stripe dashboard + secret-match verification.
2. **Email-report canary:** DMARC record + Resend webhook (`RESEND_WEBHOOK_SECRET` in Render) + owner agreement + `REPORT_EMAILS_ENABLED=true` (the CANARY-PREP1 checklist).
3. **CI gating (recommended):** Render "wait for CI" + Vercel commit-status requirement so auto-deploy cannot bypass a red build.

**PREFLIGHT COMPLETE — requesting explicit authorisation to push `f248ff4..725bbf3`.**
