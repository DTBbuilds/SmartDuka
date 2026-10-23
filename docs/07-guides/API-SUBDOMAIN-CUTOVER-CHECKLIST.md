# API Subdomain Cutover Checklist — `api.smartduka.org`

Mission: OAUTH-COOKIE-FIX1 (Option A preparation). This document is the
runbook for moving the API from `https://smartduka-91q6.onrender.com` to
`https://api.smartduka.org` so that cookies become **same-site** and the
OAuth browser-binding works in every browser (Safari ITP, Brave, Chrome
incognito, Firefox ETP included).

**Nothing in this document has been executed yet.** All code changes are
config-gated and inert until `COOKIE_DOMAIN` is set on the Render service.

## Why

The OAuth browser-binding cookie (`oauth_bind`, HttpOnly) is set on the
API domain but must be presented from frontend pages on
`www.smartduka.org`. Across different registrable domains that is a
**third-party cookie**, which Safari (ITP), Brave, Chrome incognito and
Firefox ETP-strict refuse to send → ticket redemption fails with
`401 "Authentication ticket is invalid for this browser"`.

With the API under the frontend's registrable domain
(`api.smartduka.org`) and `Domain=.smartduka.org` on the cookie, the
cookie is **same-site** for both the frontend pages and the API — sent by
every browser, binding preserved at full strength (HttpOnly + Secure +
Lax). This also future-proofs the refresh-token/CSRF cookies, which
currently have the same third-party limitation.

## Current topology (baseline `5b34fc0` + OAUTH-COOKIE-FIX1 branch)

| Component | URL |
|---|---|
| Frontend | `https://www.smartduka.org` (Vercel) |
| API | `https://smartduka-91q6.onrender.com` (Render, service `smartduka-api`) |
| Google callback | `https://smartduka-91q6.onrender.com/api/v1/auth/google/callback` |
| Binding cookie | host-only for `smartduka-91q6.onrender.com`, `SameSite=None; Secure; HttpOnly` |

## Target topology

| Component | URL |
|---|---|
| Frontend | `https://www.smartduka.org` (unchanged) |
| API | `https://api.smartduka.org` |
| Google callback | `https://api.smartduka.org/api/v1/auth/google/callback` |
| Binding cookie | `Domain=.smartduka.org`, `SameSite=Lax; Secure; HttpOnly` (code applies this automatically once `COOKIE_DOMAIN` is set) |

## Cutover steps (in order)

### 1. DNS (registrar / DNS provider)
- Add: `CNAME api.smartduka.org → <target shown by Render for the custom domain>` (Render displays the exact target, typically `<service-id>.onrender.com`).
- Do NOT remove any existing records.

### 2. Render — custom domain
- Service `smartduka-api` → Settings → Custom Domains → Add `api.smartduka.org`.
- Render provisions TLS automatically once DNS verifies.
- The existing `smartduka-91q6.onrender.com` hostname keeps working — do not remove it (this is the rollback path).

### 3. Render — environment variables (Dashboard → Environment)
- Add `COOKIE_DOMAIN` = `.smartduka.org` (activates same-site cookie mode: binding cookie gets `Domain` + `SameSite=Lax`).
- Change `GOOGLE_CALLBACK_URL` = `https://api.smartduka.org/api/v1/auth/google/callback`.
- Leave `FRONTEND_URL` unchanged (`https://www.smartduka.org`).
- Note: the code's CORS allowlist is keyed on the REQUEST origin (the frontend), which does not change — no CORS change is required for the cutover.
- Pre-existing config mismatch to be aware of: `render.yaml` declares `CORS_ORIGINS` (plural) while the code reads `CORS_ORIGIN` (singular). The hardcoded allowlist already covers the production frontend, so no action is needed now; if you ever need an extra origin, set `CORS_ORIGIN` (singular) in the dashboard.

### 4. Google Cloud Console (APIs & Services → Credentials → OAuth client)
- Add authorized redirect URI: `https://api.smartduka.org/api/v1/auth/google/callback`.
- **Keep** the existing `https://smartduka-91q6.onrender.com/api/v1/auth/google/callback` URI during the transition (rollback path). Remove it only after the cutover is verified and stable.

### 5. Vercel — frontend environment
- Set `NEXT_PUBLIC_API_URL` = `https://api.smartduka.org/api/v1` → redeploy the frontend.
- The code reads this variable for every API call (`apps/web/src/lib/config.ts`); no code change is needed.

### 6. Verify (post-cutover)
- `curl -s https://api.smartduka.org/health/live` → 200.
- Real-browser admin Google login → `/auth/google` redirect must use `api.smartduka.org` as `redirect_uri`.
- DevTools → `google/callback` response → `Set-Cookie: oauth_bind=…; Domain=.smartduka.org; SameSite=Lax; Secure; HttpOnly`.
- DevTools → `oauth/exchange` request → cookies include `oauth_bind` (also verify in Safari / Brave / incognito).
- Cashier Google signup + PIN flow; register-shop Google flow; OTP flow.
- Existing password login, FREE_MODE shops, payments (M-Pesa/Stripe callbacks unaffected — they are server-to-server), existing sessions (JWTs are bearer tokens in headers; they survive the hostname change).

## Rollback (any time, minutes)
1. Vercel: set `NEXT_PUBLIC_API_URL` back to `https://smartduka-91q6.onrender.com/api/v1` → redeploy.
2. Render: set `GOOGLE_CALLBACK_URL` back to `https://smartduka-91q6.onrender.com/api/v1/auth/google/callback`; remove `COOKIE_DOMAIN` (returns cookies to host-only `SameSite=None`).
3. Google Console: the old redirect URI was never removed.
4. The `api.smartduka.org` domain/DNS can remain in place unused, or be removed later.

## Explicitly NOT done in OAUTH-COOKIE-FIX1 (awaiting approval)
- No DNS changes, no Render custom domain, no Render env changes, no Google Console changes, no Vercel env changes, no deployments.
- `render.yaml` untouched (avoids any blueprint-sync side effects); all env additions are documented above instead.
- Production hostname and configuration unchanged until cutover is authorised.
