# QUALITY-CORE1 — Mobile Help Center Findings (P1-D)

Scope: `/help` (Help Center) and `/support` (Contact Support). Audit method: code-level responsive/accessibility audit against the 320/375/390/430/768/1024 checklist + live render verification via dev server (desktop viewport emulation only — see limitations).

## Defects found and fixed

| # | Defect | Impact | Fix |
| --- | --- | --- | --- |
| D-01 | **No search at all** | Article discovery on mobile impossible | Added search over FAQs + topics with debounced-free simple filter and a proper empty state (`SearchX` icon, "No matching articles") |
| D-02 | **Quick Links were dead cards** (`cursor-pointer` + hover, no handler) | Non-functional buttons; misleading affordance | They now act as real category filters (toggle, `aria-pressed`, Enter/Space keyboard support, active ring) |
| D-03 | **"View Documentation" button had no onClick** | Dead button | Replaced with a working "More ways to get help" → `/support` |
| D-04 | FAQ accordion lacked `aria-expanded`/`aria-controls`; content not a labelled region | Screen-reader inaccessible | Full disclosure pattern (`aria-expanded`, `aria-controls`, `role="region"`, `aria-label`, rotating chevron) |
| D-05 | Contact email/phone were plain text | Not actionable on touch | `mailto:` + dialable `tel:` links (international prefixes; the old `tel:` hrefs contained spaces/parens — invalid on some dialers) |
| D-06 | Support card header (title + button) could squeeze at 320px | Layout overflow risk | `flex-wrap` + gap; buttons `min-h-[44px]` touch targets |
| D-07 | Support page `tel:` hrefs malformed (`tel:0450 275 013 (AU)`) | Dialer failures | Digits-only international hrefs, human-readable display text |
| D-08 | Fixed text sizes (`text-3xl`) on small screens | Cramped at 320px | Responsive scale (`text-2xl sm:text-3xl`, etc.) |

## Verified working (no change needed)

- Grid collapses 1-col at ≤640px, 2-col ≥768px, 3-col ≥1024px.
- Semantic tokens throughout → consistent light/dark appearance.
- No sticky elements/overlays that could trap scroll; page scrolls freely at all widths.
- Loading/error states: static content — not applicable; search empty state added.
- `/support` form: disabled-until-valid, mailto fallback, inbox path with auth redirect.

## Representative journeys (code-verified)

1. **Find answer:** search "mpesa" → filters to the M-Pesa FAQ → expand → contact channels visible below.
2. **Browse by topic:** tap "Payments" card → FAQ list filters to payments category → "Clear filters" restores.
3. **Escalate:** "Open Inbox" → `/inbox`; "More ways to get help" → `/support`; tap phone → dialer with correct number.

## Limitations

Real-device (iOS Safari / Android Chrome) visual verification was not possible from this environment; the audit is code-level plus desktop-emulated rendering. Recommend a 15-minute device pass on the six widths before release.
