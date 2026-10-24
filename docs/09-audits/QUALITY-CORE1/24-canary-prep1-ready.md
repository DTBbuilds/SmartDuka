# SMARTDUKA EMAIL-REPORTS-CANARY-PREP1 — Production Email Readiness

**Status:** `SMARTDUKA_EMAIL_REPORTS_CANARY_PREP1_READY`
**Mode honoured:** preparation only — **nothing sent, enabled, deployed, or mutated.** The hardening commit `0870c93` sits **local on `main`** (1 commit ahead of `origin/main` @ `f248ff4`) and deploys with the next authorised push.
**Production app SHA:** `2108785` · global flag `REPORT_EMAILS_ENABLED=false` (unchanged).

---

## Phase A — Email authentication readiness

**Live Resend inspection (read-only, no secrets exposed):**

| Item | Status |
| --- | --- |
| smartduka.org in Resend | **`verified`** (eu-west-1) |
| DKIM (`resend._domainkey`) | **verified** ✅ — signs `d=smartduka.org`, aligned with the From: header (strict alignment) |
| SPF (envelope path) | **verified** ✅ — `send.smartduka.org` → `v=spf1 include:amazonses.com ~all`; the From: apex `smartduka.org` shares the organisational domain → **relaxed-mode DMARC alignment passes** |
| MX (bounce path) | **verified** ✅ → `feedback-smtp.eu-west-1.amazonses.com` |
| Sending identity | `SmartDuka <noreply@smartduka.org>` (apex From:) + `send.smartduka.org` envelope — the authenticated configuration |
| DMARC | **absent** — operator action (below) |

**Security hardening shipped in `0870c93`:** the webhook previously ran "log-only" without the signing secret — but that still mutated delivery statuses and could add **suppressions from forged permanent-bounce events** (an unauthenticated attacker could suppress a legitimate address or fabricate delivery evidence). Now: **without `RESEND_WEBHOOK_SECRET` the endpoint rejects every event (400) and mutates nothing**; with the secret, Svix HMAC verification (±5-min replay tolerance) rejects invalid signatures and replays; duplicate/out-of-order events are idempotent and cannot regress terminal states (delivered ⇄ bounced) — all tested (9/9). Secrets are never logged (only the configured/not-configured state).

**Operator checklist (exact steps, none applied):**
1. **DMARC:** DNS TXT `_dmarc.smartduka.org` → `v=DMARC1; p=none; rua=mailto:<operator-inbox@smartduka.org>; fo=1` (monitoring first; tighten to `quarantine` after 2 clean weeks).
2. **Webhook:** Resend dashboard → Webhooks → create for events `email.delivered`, `email.bounced`, `email.complained` → endpoint `https://api.smartduka.org/api/v1/notifications/email/webhook/resend` → copy the **Signing secret** → Render env `RESEND_WEBHOOK_SECRET` (manual redeploy after env change). Verification activates automatically; until then report delivery stays at `accepted` (provider acceptance) and never claims `delivered`.
3. **Optional apex SPF:** `v=spf1 include:_spf.resend.com ~all` (only if a sender ever uses the apex envelope).
4. Verify with one test OTP: the email log should progress `sent` → `delivered` after the webhook is live.

## Phase B — Canary recipient (eligibility confirmed, NOTHING enrolled)

Read-only enumeration (no credentials/addresses exposed): all 10 shops have exactly **1 admin account each**, every account is a **verified Gmail address** (`emailVerified: true`) under the operator's control. **No shop has `ownerId` set** — so the canary MUST use explicit `recipientUserIds` (the API supports it; a settings-UI recipient picker is a noted follow-up).

**Recommended canary: Load & Go (`SHP-00002-VCLTV`)** — the only shop with real sales history (6 orders), order-snapshot currency **KES** (the report's currency comes from the snapshots, so the AUD configuration pending remediation does not affect report correctness), timezone default `Africa/Nairobi` ✓. Its single admin account is the intended Gmail recipient **pending the owner's explicit agreement** (operator confirmation — the one thing this preparation cannot decide).

Enrollment guardrails verified: the preferences PUT rejects users outside the shop and non-admin roles (tested); recipient lists are deduplicated and unverified addresses excluded (tested); **no other shop is touched** — preferences are per-shop documents.

## Phase C — Reporting acceptance (reconciled against production, read-only)

The compiled `ReportsService` ran against production for **Load & Go, 2026-10-23** (shop-local EAT boundaries):

| Metric | Report | Independent aggregation | Match |
| --- | --- | --- | --- |
| Billed sales | **30,891.96** | 30,891.96 | ✅ |
| Payments collected | **26,631.00** | 26,631.00 | ✅ |
| Outstanding | **4,260.96** | (30,891.96 − 26,631.00) | ✅ |
| Tax | **4,260.96** | 4,260.96 | ✅ |
| Orders / items | 3 / 15 | 3 / 15 | ✅ |
| Methods | cash 25,826 + send_money 805 | — | ✅ |
| Top products | Oraimo 6,450 → SmartEdge 5,445 → Voltix 3,725 … | — | ✅ |

**`RECONCILIATION: MATCH`** — the email, PDF and dashboard all read the same canonical order/payment documents (single source). The exact canary preview artifacts are generated locally and served for review at **http://127.0.0.1:63397/canary_daily.pdf** (+ `.html`/`.txt`) — **nothing was sent**. AI narratives remain **disabled** for the canary (deterministic insights only).

## Phase D — Activation safety (verified)

| Requirement | Evidence |
| --- | --- |
| Global flag OFF prevents scheduling AND dispatch | tested — the tick returns before any run creation or delivery |
| Pending jobs cannot bypass the kill switch | **new test** — runs queued while ON stay `queued` (never delivered) after the flag flips OFF; re-enabling resumes the SAME run with no duplicate creation |
| Per-shop preferences default OFF | schema defaults (`enabled: false` ×3) + production shows 0 preference documents |
| Enabling the global flag cannot activate unconsented shops | run creation queries ONLY shops with explicitly enabled frequencies + passing eligibility (tested) |
| Retries don't duplicate | idempotency keys (provider header + log index), backoff-paced retries, ambiguous outcomes never auto-retry (tested) |
| Suppressed recipients excluded | permanent-bounce suppression + send-time filtering (tested) |
| Run status reflects real evidence | `accepted` = provider acceptance; `delivered` ONLY via verified webhook (tested) |

**Exact canary enablement procedure (on separate approval):**
1. Push `0870c93` (webhook hardening + CI/build hardening) → verify deployment probes.
2. Apply the Phase A operator checklist (DMARC + webhook secret).
3. `REPORT_EMAILS_ENABLED=true` in Render (+ redeploy).
4. As the Load & Go admin: Settings → Reports → enable Daily (20:00 EAT) → the recipient is the shop's single verified admin.
5. Observe one cycle: Super Admin → Emails → Scheduler → run `queued → processing → accepted → delivered`; confirm ONE email arrives with the reconciled figures (§C).
6. Rollback at any point: flag OFF (instant) → the pending run stays queued; revert + fast-forward push if code rollback is needed.

## Phase E — Build-pipeline hardening (shipped in `0870c93`)

Root cause of the DEPLOY1 near-miss (10 masked build errors): a failed build leaves the previous `dist`/`.next` in place, and output-grep checks report false success. Fixed:
- **CI:** the API typecheck and test steps are now **mandatory** (`continue-on-error` removed); new artifact-verification steps assert `dist/src/main.js` and `.next/BUILD_ID` exist and are **fresher than the build start** (stale output fails CI).
- **Local:** `scripts/verify-build.js` — clean builds (rm first) with **real exit codes**, artifact-freshness assertions, then the mandatory suites. (Verified end-to-end: both builds + fresh artifacts.)
- **Recommendation for the operator (dashboard action):** enable Render's "wait for CI" / GitHub check gating and Vercel's commit-status requirement so auto-deploy cannot bypass a red CI.

## Deliverables summary

Email-domain readiness: **verified end-to-end except DMARC (operator)** · DMARC/webhook checklist: §A · Canary shop/recipient eligibility: §B (owner agreement pending) · Preview + reconciliation: §C (MATCH; artifacts served) · Activation safety: §D (all tested) · Build hardening: §E (shipped) · Canary execution checklist: §D · Rollback/monitoring: §D + Super Admin Scheduler health.
