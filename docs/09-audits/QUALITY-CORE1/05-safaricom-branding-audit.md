# QUALITY-CORE1 — Safaricom / M-Pesa Branding Audit (P1-C)

## Inventory (before fix)

| Asset | Location | Verdict |
| --- | --- | --- |
| `mpesa.svg` | `apps/web/public/images/payments/` | ❌ **Invented mark** — Material-palette green (#4CAF50) text "M PESA" + generic phone rect + fake red swoosh; not official artwork |
| `safaricom.svg` | `apps/web/public/images/payments/` | ❌ **Invented mark** — wrong colors (Material #E53935/#4CAF50), rough swoosh, and rendered squished (intrinsic 4:1 drawn at 3.44:1) |
| `payment-trust-badges.tsx` | renders both | aspect-ratio mismatches (distortion) |
| `payment-method-modal.tsx` | renders mpesa.svg at 80×26 (3.08:1 vs intrinsic 3.33:1) | distortion |
| `mpesa-settings.tsx` | renders both | distortion |
| `(marketing)/features/mpesa/page.tsx:189` | text claim **"Safaricom Approved"** | ❌ **Invented certification claim** — no such relationship exists |
| `mpesa-settings.tsx:217` "Powered by Safaricom Daraja API" | text | ✅ factual (the integration does use Daraja) |
| `blog/mpesa-retail.svg/.png` | blog header art (generic "M-PESA Integration" card) | ✅ acceptable — own artwork, not a brand reproduction |
| Visa/Mastercard/Stripe SVGs | same folder | generic text approximations — out of P1-C scope; registered (F-09) |

## Official artwork obtained

| Brand | Asset | Source | License/proof |
| --- | --- | --- | --- |
| M-Pesa | `mpesa-official.svg` (512×273 wordmark) | Wikimedia Commons `M-PESA LOGO-01.svg` | Public domain (PD-textlogo; author Vodafone) — downloaded via `commons.wikimedia.org/wiki/Special:FilePath/M-PESA_LOGO-01.svg` |
| Safaricom | `safaricom-official.png` (480×106, transparent, trimmed from 1200×1200) | **safaricom.co.ke official brand assets** (`/images/SAF-MAIN-LOGO.png`), trimmed + resized with PIL (LANCZOS) | Official brand-toolkit file served by safaricom.co.ke |

Both are **bundled locally** under `apps/web/public/images/payments/` — no runtime external image dependency.

## Corrections applied

1. `payment-trust-badges.tsx` — both logos now point at official assets; width/height preserve intrinsic ratios (mpesa 60×32 @1.875:1, safaricom 145×32 @4.528:1).
2. `payment-method-modal.tsx` — mpesa renders 49×26 and 23×12 (ratio-correct).
3. `mpesa-settings.tsx` — mpesa 53×28, safaricom 127×28 (ratio-correct).
4. Deleted the invented `mpesa.svg` and `safaricom.svg` (no remaining references — verified by grep).
5. Marketing claim "Safaricom Approved" → **"Integrated with M-Pesa (Daraja API)"** (factual).
6. Alt text: "M-Pesa" / "Safaricom" on every render site (accessible names unchanged/improved).

## Not changed

- No partnership/certification badges added; no claims of endorsement.
- Visa/Mastercard/Stripe marks untouched (registered for a follow-up with official artwork under the same policy).
