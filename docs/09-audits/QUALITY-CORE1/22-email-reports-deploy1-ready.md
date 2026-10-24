# SMARTDUKA EMAIL-REPORTS-DEPLOY1 — Visual Acceptance & Deployment Preparation

**Status:** `SMARTDUKA_EMAIL_REPORTS_DEPLOY1_READY`
**Release candidate:** `feat/email-reports-core1` @ **`158bc36`** (7 commits ahead of `origin/main` @ `e7a0533`)
**STOP honoured:** nothing pushed/deployed; `REPORT_EMAILS_ENABLED=false` preserved; no DNS changes; no sends.

---

## 1. Visual acceptance results

### 1.1 A genuine defect was found and fixed during visual inspection (`158bc36`)

The coordinate-level PDF inspection exposed a **real corruption**: the two-pass render resolved a Buffer where a page COUNT was expected — pass 2 stringified the **entire pass-1 PDF** as the "total pages" text (`Page 1 of %PDF-1.3…`), drawing the document's own source bytes onto every page. Fixed: the two-pass contract returns `{buffer, pageCount}`; footers are written **while each page is still current** (pdfkit flushes pages on `addPage` — flushed pages are unreachable by `switchToPage`, which had silently dropped page-1 footers); the footer is drawn without width/align (pdfkit's LineWrapper re-breaks pages for that text). All 66 report/email tests re-verified after the fix.

### 1.2 PDF verification (kerning-aware coordinate extraction — `scripts/inspect-pdf-layout.js`)

| Fixture | Pages | Checks |
| --- | --- | --- |
| daily | 1 | ✅ totals (billed KSh 933.80 / collected KSh 805.00 / outstanding KSh 128.80 / tax), Fact/Suggestion labels, footer "Page 1 of 1" |
| weekly | 1 | ✅ KSh 46,757.36 / 41,463.00 / 5,294.36; payments-by-method (cash + send money); best sellers; low stock |
| monthly | 2 | ✅ KSh 47,182.16 / 41,887.80 / 5,476.16; discounts; page-2 footer correct |
| no_sales | 1 | ✅ honest zeros (KSh 0.00), "No completed sales", first-checkout guidance |
| long_names | 1 | ✅ 116-char product name ellipsized by design (no overflow/clipping) |
| multi_page | 2 | ✅ 25-product stress: page break mid-table, "Page 2 of 2" footer, low-stock table continues |

Every page: header band at top (brand dark #111827 + orange label), footer at the bottom with generation timestamp (shop-local + UTC) and correct page numbers; **no horizontal clipping, no vertical collisions, no content below the margin, no customer PII**. Typography: Helvetica 8–18pt hierarchy; currency KSh throughout.

**Human visual pass:** the fixtures remain live at **http://127.0.0.1:63397** (PDF/HTML/TXT per example) for the reviewer's final eyeball — the coordinate analysis above is the programmatic equivalent and found + fixed the one real defect.

### 1.3 HTML/mobile verification — **84/84 checks**

Per fixture: viewport meta ✅ · table-based `role="presentation"` layout (email-client safe) ✅ · inline styles only (no `<style>`) ✅ · 560px mobile container ✅ · brand colors ✅ · KSh currency ✅ · billed/collected separated ✅ · dashboard link ✅ · preferences + unsubscribe links ✅ · timestamps ✅ · no PII ✅ · plain-text parity (facts + links) ✅.

## 2. Deployment package

- **Ancestry:** `origin/main` unmoved at `e7a0533`; branch is a clean fast-forward candidate (7 commits: implementation, lockfile+design, seed helper, release package, gate hardening, gate report, this fix).
- **Flags:** `REPORT_EMAILS_ENABLED` defaults to **`false`** in code (`report-scheduler.service.ts:64`) — deployment sends NOTHING until separately authorised; `AI_NARRATIVE_ENABLED` likewise OFF.
- **Auth-email paths operational:** production's most recent sends are `otp_login_verification` via **Resend** (2026-10-23T00:41 UTC — alive); the branch has **0 diff lines** in auth/ and the delivery spec pins the OTP single-provider + redaction behavior.
- **Rollout steps (on authorisation):** 1) push → Render deploys the API first (flag OFF — zero sends) → verify `/health` + the new `/reports/preferences` route (401 unauth). 2) Set `RESEND_WEBHOOK_SECRET` (Render env, from the Resend dashboard) → webhook verification activates. 3) Vercel deploys the web (preferences UI + observability; graceful degradation either order). 4) Canary (below). 5) Enablement is a SEPARATE approval.
- **Kill switches:** `REPORT_EMAILS_ENABLED=false` stops all scheduled sends instantly (no in-flight state); revert the 7 commits + fast-forward push, or dashboard-redeploy `e7a0533`. No migrations; additive collections/indexes are harmless under the old code.
- **Canary definition:** ONE verified, explicitly consenting shop-owner address — the operator's own shop admin account — enabled via Settings → Reports (daily), observed through one full cycle (Super Admin → Emails → Scheduler: run queued → accepted → delivered), THEN widened per-shop by explicit owner opt-in only.
- **No existing shop automatically receives reports:** flag OFF + per-shop preferences default OFF + eligibility re-checked at delivery + suppression filtering — four independent layers.

## 3. Operator checklist (DNS & webhook — operator-executed, not this release)

1. **SPF:** add `v=spf1 include:_spf.resend.com ~all` (plus any existing includes) as a TXT record for smartduka.org.
2. **DKIM:** already present (`resend._domainkey.smartduka.org` — verified live); confirm it remains after any DNS churn.
3. **DMARC:** add `_dmarc.smartduka.org` TXT `v=DMARC1; p=none; rua=mailto:<operator-address>` to start monitoring (tighten later).
4. **Resend webhook:** create a webhook for `email.delivered`, `email.bounced`, `email.complained` → `https://api.smartduka.org/api/v1/notifications/email/webhook/resend`; copy the signing secret into Render as `RESEND_WEBHOOK_SECRET`.
5. Verify with one test send; confirm the email log progresses sent → delivered.

## 4. Remaining risks

- Exactly-once external delivery is approached (provider idempotency header + no-retry-on-ambiguity) but not guaranteed against a provider that accepts and loses its own record — surfaced as manual-review failures, not silent duplicates.
- PDF charts are tabular (no chart images) — v1 scope.
- Resend webhook runs log-only until the secret is set (deploy step 2).
- Real-device email rendering (Gmail Android/iOS) — the fixtures are served for the reviewer's visual pass; the table layout is deliberately conservative.

## 5. Final recommendation

**APPROVE for controlled deployment** — flag-OFF default means zero sending risk on deploy; the visual pass found and fixed the one real defect; all suites green (66/66 new; full-suite failure set identical to baseline; builds clean).
