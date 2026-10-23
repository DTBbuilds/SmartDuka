# QUALITY-CORE1 — Files, Commits, Test Results & Device Verification

## Commits (branch `fix/quality-core1-financial-integrity`, based on `origin/main` @ `2f93926`)

| Commit | Message |
| --- | --- |
| `07ad353` | fix(sales): server-authoritative tender + tax authority — QUALITY-CORE1 P0-A |
| `d7d5c48` | feat(shops): base-currency immutability policy — QUALITY-CORE1 P1-B |
| `fc7c79a` | feat(web): currency lock UI + official Safaricom/M-Pesa artwork — QUALITY-CORE1 P1-B/P1-C |
| `4bcbf63` | fix(help): mobile Help Center usability + accessibility — QUALITY-CORE1 P1-D |
| `e56e35f` | fix(scanner): open manual entry directly when camera is unusable — QUALITY-CORE1 P1-E |
| `17d1e2d` | style: prettier auto-fix sales.service.ts + drop unused eslint directive |

## Exact files changed

**API**
- `apps/api/src/sales/sales.service.ts` — R1/R2/R3 tender+tax authority, loyalty-before-math, fingerprint normalization
- `apps/api/src/sales/checkout-financial-integrity.spec.ts` — NEW, 18 tests
- `apps/api/src/sales/checkout-authority.spec.ts`, `checkout-idempotency.spec.ts`, `sales.service.spec.ts` — updated to the new tender contract
- `apps/api/src/shop-settings/shop-settings.schema.ts` — `tax.inclusive`
- `apps/api/src/shop-settings/dto/update-shop-settings.dto.ts` — nested `TaxSettingsDto` (fixes forbidden-property rejection), rate 0–1
- `apps/api/src/shops/services/currency-policy.service.ts` + `currency-policy.spec.ts` — NEW
- `apps/api/src/shops/shops.service.ts`, `shops.module.ts`, `shops.controller.ts` — policy wiring + `GET /shops/currency-policy`
- `apps/api/src/shops/shops-authority.spec.ts` — DI stub for the policy
- `apps/api/package.json` — jest `moduleNameMapper` for ESM `nanoid`
- `apps/api/test/__mocks__/nanoid.ts` — NEW
- `apps/api/src/payments/payment-reconciliation.service.spec.ts`, `payments.service.spec.ts`, `payments.controller.spec.ts` — fixed pre-existing broken fixtures/DI

**Web**
- `apps/web/src/app/pos/page.tsx` — settings-ready gate, non-ok fallback, server-mirrored tax quote, server-derived M-Pesa/Stripe amounts, canonical receipts, partial-payment toast, offline payload cleanup
- `apps/web/src/lib/db.ts` — `taxRate` optional in offline payload type
- `apps/web/src/app/admin/settings/tax/page.tsx` — legacy rate normalization, inclusive toggle
- `apps/web/src/app/settings/page.tsx` — currency lock UI + error surfacing
- `apps/web/src/components/payment-trust-badges.tsx`, `payment-method-modal.tsx`, `settings/mpesa-settings.tsx` — official artwork, ratio-correct
- `apps/web/public/images/payments/mpesa-official.svg` (NEW), `safaricom-official.png` (NEW); `mpesa.svg`, `safaricom.svg` deleted
- `apps/web/src/app/(marketing)/features/mpesa/page.tsx` — factual claim
- `apps/web/src/app/help/page.tsx`, `support/page.tsx` — P1-D
- `apps/web/src/components/barcode-scanner-unified.tsx`, `barcode-scanner-html5.tsx` — P1-E

## Automated test results

| Suite | Result |
| --- | --- |
| `apps/api` jest (full) | **645 passed / 28 failed** — all 28 verified pre-existing at baseline (8 stale suites: users/inventory/auth/app scaffolding; 19 unmasked from behind the old nanoid ESM parse error by the new mapper) |
| `apps/api` sales+payments+stripe | **214/214 passed** (incl. 18 new financial-integrity tests) |
| `apps/api` shops | 34/34 passed |
| `apps/api` build (`nest build`) | ✅ |
| `apps/api` tsc source files | 0 errors (335 pre-existing errors confined to `.spec.ts`) |
| `apps/api` eslint (changed files) | clean |
| `apps/web` build (`next build`) | ✅ 114 routes |
| `apps/web` tsc | ✅ 0 errors |
| `apps/web` jest | 10/10 |
| `apps/web` eslint (changed files) | clean (1 pre-existing React-Compiler memoization error in scanner code, present at parent commit) |

## Real-device verification — limitations

**Not performed.** No Android/iOS device or real Safari/Chrome-mobile runtime is available in this environment. Affected claims, explicitly NOT made:
- Barcode scanner behavior on real cameras (Android Chrome/Firefox, iPhone Safari, PWA webview, torch, low-light, orientation).
- Help Center touch ergonomics beyond code-level audit (44px targets, wrap behavior verified in code; visual pass recommended).
- M-Pesa STK push end-to-end on a real handset (Daraja sandbox credentials not configured locally).

Everything else (API behavior, tax/tender math, currency policy, builds, web rendering) is verified by automated tests and local builds as reported.
