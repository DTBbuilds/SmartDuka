# SMARTDUKA-AUTH-LOGIN-POS-UX1 — Shop sign-in implementation

**Branch:** `feat/login-pos-workspace1`  
**Base:** production `main` at `3d485ba2ff853dcdb426e098843b670153b1a566`  
**PR:** #8 (draft, design review)  
**Safety:** No production merge/deploy authorised in this task.

## User-observed problems

Android screenshots show:

- Generic "Welcome back" instead of a recognisable store/terminal sign-in experience.
- Google sign-in appears before the Admin/Cashier role decision, confusing the cashier PIN route.
- Cashier shop choice → PIN steps use different blue/green CTA colors from the orange retail brand.
- PIN placeholder is over-tracked and too large for narrow mobile widths.
- A low-opacity floating service-provider lock overlaps the primary form near the mobile bottom edge.
- Shop search/select and validation need clearer focus, accessible labels, and recovery.
- Default empty shop requests were silent; a failed directory load could look like an absent merchant.

## Implemented

**Layout and roles**
- Role-adaptive desktop POS workspace panel for shop administrators versus cashier terminals.
- Mobile-first card with concise role-specific heading and brand-consistent primary actions.
- Admin and Cashier controls announce pressed state and remain keyboard accessible.
- First decision: role; then select shop; then admin credentials or cashier PIN.
- Existing role-specific auth context methods and server guards are untouched.

**Administrator**
- Large full-width shop/email/password fields with browser-safe autocomplete and an accessible show-password control.
- "Sign in to shop" primary action; Forgot Password remains reachable.
- Google login remains available only in the admin section as an optional alternative (the original Google OAuth callback/OTP flow remains unchanged).
- Register Shop available only where it makes sense, not promoted as a cashier access path.

**Cashier**
- Validated remembered shop; deleted/stale stored shop IDs can never skip the shop-selection step.
- Selected shop clearly displayed on PIN entry.
- Switching shops immediately clears the prior PIN.
- 4–6-digit numeric PIN remains password-masked and is not persisted in local storage.
- Orange "Sign in to POS" CTA, admin-assisted recovery messaging, optional cashier Google account linking.
- All PIN, OTP and role-enforcement logic remains on the existing backend path.

**Accessibility and recoverability**
- Escape closes shop picker and returns focus to its trigger.
- Picker announces its selected shop, supports searchable lists, and has a viewport-bounded dropdown.
- Six OTP cells fit narrow phone screens without changing OTP verification.
- Shop-directory failures show an explicit "Retry shops" action.
- Error text from arbitrary Google redirect queries is not reflected directly.
- Post-login `redirect` query parameters accept same-origin internal paths only (new pure helper + tests).
- Service-provider login button is moved to a normal footer flow instead of covering mobile actions.

## Tests and gate

**New tests:** `safe-login-redirect.spec.ts` and `login-workspace-state.spec.ts` test internal navigation safety and remembered-shop logic.

**Required hosted checks:** Lint & Type Check, Security Scan, Unit Tests, Build and Vercel preview, all on the exact release head.

**Still requiring authorized live account/device tests before release:**
1. Mobile widths 320/360/390/430; dark/light; no overflow and 44px touch targets.
2. Admin: shop selection, password reveal/hide, invalid credentials, success, forgotten password.
3. Cashier: first shop → PIN, remembered shop → PIN, change shop clears PIN, malformed PIN and valid staff flow.
4. Google admin OAuth → OTP, OTP resend, wrong/expired/replayed ticket.
5. Cashier Google account-linking, never shortcutting required shop/PIN/OTP authorisation.
6. Keyboard navigation, focus and browser screen reader on shop dropdown.
7. Shop API unavailable → helpful retry, no fake "no shop exists" message.
8. Service-provider access is reachable but no longer overlays the customer form.
9. Existing merchant registration, session-expiry and role-specific post-login redirects.
10. M-Pesa global pause and canary allowlist unchanged.

**Release verdict:** Design implementation for review. Do not mark production GO without authenticated end-to-end acceptance and completed CI.
