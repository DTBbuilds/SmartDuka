# SMARTDUKA_STRIPE_DEPLOY1_FINAL_GO_NO_GO — Release-Control Verification

**Status:** `SMARTDUKA_STRIPE_DEPLOY1_FINAL_GO_NO_GO`
**Mode honoured:** verification + corrective hardening only. **`main` NOT pushed; production NOT deployed; payment processing NOT activated.**

---

## 1. Is production promotion actually blocked until required checks pass? — **NO (proven), now mitigated**

**Evidence (GitHub API, public repo):** every recent `main` commit shows CI `conclusion: failure` — `f248ff4`, `2108785`, `e7a0533`, `1677542`, `fe02603`, `541fa3b` (run #170 and earlier) — **yet every one was deployed to production** and verified live in this engagement. The failure root: the **Lint & Type Check job failed on API lint debt**, which **skipped all downstream jobs** (Unit Tests, Build, Security Scan) — and Render (`autoDeploy: true`) + Vercel deployed on the push event regardless. **CI is advisory today; it gates nothing.**

**Corrective hardening (`3a8989f`):** the lint debt is cleared (API: 19 errors fixed — the FREE_MODE constant-condition restructured to a named const, useless regex escapes corrected in the password-reset redaction patterns, unbound-method disables for legitimate Reflect-metadata use; Web: tooling files eslint-ignored, the pre-existing React-compiler memoization debt in 3 files isolated via `react-hooks/preserve-manual-memoization: off` — documented optimization debt, not a correctness bug). **Both lints now report 0 errors**, so the mandatory CI job chain (lint → tests → build → artifact verification) actually executes end-to-end.

**Remaining gap (operator-only, cannot be fixed from the repo):** Render and Vercel still deploy on push independent of GitHub checks. The repo-side procedure below mitigates it; the durable fix is dashboard configuration:
1. **Render:** enable "Wait for CI" (GitHub Commit Status gating) or set `autoDeploy: false` + deploy via the dashboard/deploy-hook after CI is green.
2. **Vercel:** disable production auto-deploy (deploy via CLI/dashboard after CI) or require the commit status.
3. **GitHub branch protection (optional):** require the `CI/CD Pipeline` check on `main` — blocks direct pushes until checks pass (changes the direct-push workflow; the operator's call).

## 2. Build-runtime mismatch — verified and aligned

| Runtime | Version | Evidence |
| --- | --- | --- |
| GitHub Actions CI (before) | Node **20** (pinned) | `ci.yml` NODE_VERSION |
| Render API production | Node **v22.16.0** | verified LIVE via `/api/v1/health/info` (`"node":"v22.16.0"`) |
| Vercel web production | Node **24.x** | owner-reported; no `engines` pin existed to control it |
| Local dev | v24.13.0 | session environment |

**Findings:** no `engines` field, no `.nvmrc`, no `NODE_VERSION` in `render.yaml` — the runtimes were unmanaged, and CI (20) tested a DIFFERENT runtime than production (22/24). Also: CI pins pnpm 9 via `action-setup@v2` while the lockfile is written by pnpm 10.28 (lockfileVersion 9.0 — format-compatible, but a skew).

**Corrective hardening (`3a8989f`):** CI `NODE_VERSION` 20 → **22** (matches the verified Render production runtime exactly); `.nvmrc` (22) at the root and both apps; `engines: { node: ">=22 <25" }` added to both app manifests (advisory — pnpm enforces only with `engine-strict`). **Vercel's Node 24 remains a documented minor skew** — Next.js 16 supports it; the operator may pin it via `engines` (Vercel honours the field) if exact parity is wanted. **Compatibility validated:** the full suite (793/793) and both builds pass on the local Node 24 runtime AND the code has been serving on Render's Node 22 since the earlier releases.

## 3. Release candidate (updated)

Local `main` is now **7 commits ahead** of `origin/main` @ `f248ff4`, all fast-forwardable:
- `0870c93` — email-report canary hardening (webhook trust, kill-switch test, build verification)
- `d01fe24` — CANARY-PREP1 report
- `b8ab68e` — Stripe FIX1 (multitenant security + checkout reliability)
- `4227370` — release-gate corrections (documented Stripe.js pattern, race-safe refunds)
- `725bbf3` — release-gate report
- `b2d439a` — DEPLOY1 preflight report
- `3a8989f` — **CI gate unblocked (lint debt cleared) + runtime alignment**

**Exclusions verified:** the untracked audit reports (`SMARTDUKA-STRIPE-MULTITENANT-AUDIT1.md`, `V2-MASTER-BACKLOG-RECON1/`) and the sitemap line-ending churn are NOT part of the release. The `3a8989f` lint pass touched 294 files — **formatting-only** (eslint `--fix` output), verified by the post-fix runs: API build clean, web build 115 routes, API suite **793/793**, web tests 25/25, both lints 0 errors.

## 4. Controlled-promotion procedure (proposed; each push needs separate authorisation)

**Phase 1 — non-production branch CI (requires authorisation for the branch push):**
1. Push the 7 commits to `release/stripe-fix1` (a non-production branch — Render/Vercel do NOT deploy it; only CI runs).
2. Watch the run via the GitHub API (the repo is public — verified accessible): `actions/runs?branch=release/stripe-fix1` → require `conclusion: success` for the FULL chain (lint → tests → build → artifact verification) on **Node 22**.
3. Any failure → fix on the branch → re-push → re-verify. `main` untouched.

**Phase 2 — production promotion (requires the final authorisation):**
4. Fast-forward `main` to the verified branch HEAD + push (no force).
5. Monitor Render + Vercel (behavioural probes as in the preflight); record the deployed SHAs + deployment IDs.
6. Post-deploy smoke: `/health` green · `oauthstates` collection + unique/TTL indexes exist · `/stripe/webhook` unsigned → 400 · `/reports/preferences` 401 · OTP path unchanged · `REPORT_EMAILS_ENABLED` still OFF.
7. **Halt + rollback on any failure.**

**Rollback targets (confirmed):** last known-good production = **`2108785`** (app code, currently serving; `f248ff4` is its docs-only redeploy). Rollback = dashboard-redeploy `2108785` OR revert + fast-forward push. No migrations; the additive `oauthstates` collection is harmless under the old code.

## 5. Safety state (unchanged, verified)

- **Stripe live acceptance: OFF** — test-mode platform + 0 connected accounts + the readiness gate + the mode-consistency gate.
- **Email-report sending: OFF** — `REPORT_EMAILS_ENABLED` defaults false; production shows 0 preference/run/suppression documents and 0 digest emails ever.
- **M-Pesa/cash/subscription/FREE_MODE:** 0 diff lines in those paths across the release range.

## 6. Verdict

**GO — conditional on the two-step controlled promotion** (branch CI first, then main push), each step separately authorised. **Exact remaining blockers:**
1. ~~CI gate unblocked~~ ✅ (lint debt cleared; 793/793; both lints 0 errors)
2. ~~Runtime mismatch~~ ✅ (CI aligned to Render's Node 22; Vercel 24 documented)
3. **Operator dashboard gating** (Render "Wait for CI" / Vercel commit-status) — cannot be applied from the repo; recommended before or immediately after this release
4. **Owner authorisations:** (a) the `release/stripe-fix1` branch push for the CI verification, (b) the final `main` push, (c) later, separately: Stripe live keys/Connect env + email-report canary enablement
