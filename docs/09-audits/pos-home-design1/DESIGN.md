# SMARTDUKA-POS-HOME-DESIGN1 — Role-adaptive dashboard wireframes

**Status:** Design for owner review; no production code changed.  
**Git baseline:** `DTBbuilds/SmartDuka` `c39cf8f` (current remote main at design start).  
**Deliverables:** self-contained `wireframes.html`, eight scenario captures available in the conversation ZIP, and this design/implementation contract.  
**Product direction:** One role-adaptive *operations home*, not a second POS application or a new financial state machine.

## Why this redesign exists

The current mobile Admin Dashboard (`apps/web/src/app/admin/page.tsx`) makes `/pos` the secondary outline action while `/admin/products` receives the orange primary CTA. Four large cards occupy the first screen, and the six action tiles are below the fold. Primary activity and statistics compete, rather than guide the merchant to sell.

Source inspection found other design-level concerns:

- Two admin pages, `/admin` (the screenshot implementation) and `/admin/dashboard`, present different interfaces and data models. Consolidation/redirect requires route and navigation regression testing; do not blindly delete either.
- Admin metrics fetch 200 inventory products and count array length rather than using a trustworthy total. All API requests are collected via one `Promise.all` and failed/missing values can render as zeros.
- Some business/finance cards use click handlers on generic `Card` containers rather than accessible semantic links/buttons.
- Admin payment warnings check merchant configuration but don't necessarily represent *platform* M-Pesa initiation pause; show availability from authoritative, safe status rather than encouraging an unavailable checkout method.
- The cashier `/cashier/dashboard` already understands active shifts and breaks; do not create duplicate shift semantics. There is a separate `/cashier/pos` page and a shared `/pos`; the canonical authorized selling route must be resolved in an implementation phase without weakening cashier shift enforcement.
- `AdminMobileNav` currently exposes the main POS action through the menu, which should not be necessary.

## Visual/interaction system

- **Brand:** Dark SmartDuka surface, restrained orange for the *single main next action*, high-contrast neutral text. Do not use orange uniformly on every tile.
- **Mobile layout:** 390px reference width, scales from 320px upward with no horizontal overflow. Fixed contextual header and reachable bottom navigation, safe-area aware. In a mobile viewport, a ready shop shows primary sale CTA, two compact metrics, and actionable shortcuts in the first viewport or close to it.
- **Desktop layout:** 1280px reference width, persistent navigation rail/sidebar and top shop/status bar. Primary sales CTA and operations attention sit side by side. Summary metrics and shortcut rows stay scannable; recent receipts and alerts appear below.
- **Target sizes:** touch actions at least 44×44 CSS px; prominent POS action at least 52px high. Keyboard focus outlines, visible labels, no color-only statuses.
- **Typography:** primary heading ~24–30px; headings ~15–18px; financial figures ~20–24px on mobile. Monetary amounts use `formatMoney`/shop currency rather than hardcoded `KSh` in implementation; the preview's currency and amounts are deliberately illustrative.
- **Navigation:** admin sees Dashboard, **POS**, Products, Orders, Cashiers, Analytics; cashier sees own dashboard, POS (only when allowed), receipts, shift. Mobile bottom tabs propose Home / POS / Orders / More; `Orders` must respect role-based scope (cashier -> only authorized receipts). Header shows current shop and correct branch (and allows choice only if authorized).
- **Data integrity:** never display unknown/error values as `0`; show skeleton while loading, `—`/unavailable with retry after failed fetch, and `0` only for a successful zero result. Clearly distinguish offline, online, pending-sync, and unavailable payment methods.
- **Device performance:** prefer aggregated lightweight dashboard endpoints over inventory list downloads. Independent fetches with request cancellation when switching branches and optional cache freshness labels. One-tap navigation to existing POS must not depend on slow analytics calls.

## Primary wireframes

| View | Primary CTA | Secondary immediate actions | Primary visible data | More below |
| --- | --- | --- | --- | --- |
| Admin mobile / ready | **Open POS** → `/pos` | Products, Orders, Cashiers, Reports | Sales today, today's orders | Low stock, sync status, paused payment notice, recent orders |
| Admin desktop / ready | **Open POS** → `/pos` | Products, Orders, Cashiers, Reports | Sales today, orders, products, revenue | Operations panel, recent orders, secondary shortcuts |
| Cashier mobile / active shift | **Open POS** → existing authorized route | Scan item, My receipts, Shift details, Break | *My shift* sales, transaction count | Current shift and own receipts |
| Cashier desktop / active shift | **Open POS** → existing authorized route | Receipts, scanner, shift and break | Own shift sales, transactions, time | Shift status, own receipts |

Wireframes: `wireframes.html` has role, viewport and state selectors. The sample actions **do not navigate** to real SmartDuka, alter the database, or perform transactions. The prototype's `Start shift` and `End break` controls only change the *illustrative state*.

## State and behavior matrix (must be implemented as real state, not hardcoded UI)

| Role | State | Hero / next action | Safety / messaging |
| --- | --- | --- | --- |
| Admin | New shop with no products | **Add first product** → `/admin/products` (POS remains reachable from mobile nav, but explain that catalogue setup is needed) | Specific setup guidance; no misleading checkout-ready claim; no unnecessary upgrades |
| Admin | Catalogue ready | **Open POS** → `/pos` in one tap | Shop/branch clearly visible; product readiness validated from real data |
| Admin | Partial data unavailable | **Open POS** stays available if authorized and product data locally ready | KPIs `—` and per-section retry, never fabricated zero |
| Admin | Payment method paused | Same available POS action | M-Pesa status shown as paused (not a sales blocker if other permitted methods work) |
| Cashier | No active shift | **Start shift** → `/cashier/shift-start` | Do not expose a misleading working checkout; deep links must enforce shift policy server-side |
| Cashier | Active authorized shift | **Open POS** in one tap | Show own shift totals only; never all-merchant revenue |
| Cashier | On break | **End break** action | Selling blocked during break if current policy enforces it; no bypass via bottom nav |
| Cashier | Shift close/reconciliation pending | **Resolve or resume shift** based on authoritative state | Show truthful reconciliation state; no fabricated ready-to-sell status |
| Either | Offline/pending sync | Retain authorized, supported offline operations only | Distinguish cached data from fresh; avoid silent double submission and payment promises |
| Either | Auth expired/permission failure | Reauthenticate or request access | Preserve authorized safe state; avoid redirect loops and fake success |

## Implementation contract and routing

**Do not implement until the owner approves the wireframes.** The implementation phase should:

1. Use `/admin` as the observed home experience; explicitly determine whether `/admin/dashboard` is a legacy/deep link before redirecting/consolidating. Keep any authorized bookmarks working.
2. Preserve existing auth/role checks (`AuthGuard`) and shift permissions. **Do not implement cashier authorization solely by hiding UI controls.**
3. Resolve canonical POS link/shift prerequisites; do not accidentally route cashiers to incomplete `/cashier/pos` if `/pos` is the actual full checkout implementation.
4. Build reusable `POSHomeHero`, `QuickActionGrid`, `DailyMetrics`, `OperationsStatus`, and `ShiftSummary` only where they save duplication. No new backend financial logic in this UX sprint.
5. Fetch real summary counts rather than `limit=200` list length. Use branch-correct data and user-specific metrics; cancel older requests on branch switch and handle partial failure independently.
6. Read payment availability from safe authoritative status and keep **M-Pesa initiation globally paused**. Do not add `MPESA_CANARY_SHOP_IDS`, enable payment, call real provider endpoints, or change checkout settlement rules.
7. Respect existing admin/cashier operations and parallel `feat/cashier-journey1`, `fix/cashier-admin-freeze1`, and `fix/error-ux-reliability1` work; perform a file-level diff conflict check before any implementation branch is opened.
8. Where product or order data is legitimately absent, render a helpful empty state; do not imply errors are empty states.
9. Do not introduce a sticky bottom bar that obscures mobile cart/checkout controls on the POS route. Scope dashboard navigation and safe-area padding to home/approved admin routes.
10. Build independent design/component smoke coverage: 320, 360, 390, 430, 768, 1024, 1280px; light/dark contrast where supported, keyboard navigation and screen reader names.

## Acceptance criteria (release gate later)

- A *ready* admin reaches actual POS with one tap/click from home without opening a menu or scrolling.
- An *active-shift* cashier reaches authorized POS with one tap/click; an unopened shift is prompted to start before a sale, with no client-side bypass of server enforcement.
- Admin sees enough operational context to react but doesn't have to scroll past four large stat cards to reach primary operations.
- Cashier never sees business-wide revenue, other cashiers' private details or admin-only links.
- Dashboard claims never confuse real zero, stale cache, loading, API error, offline queue or payment unavailable.
- Shop/currency and branch context are correct for each request; switching branches doesn't show stale prior branch metrics.
- Responsive tests show no horizontal overflow at 320–1280px, minimum 44px tap targets, correct keyboard focus/semantic links, no fixed bottom nav overlap.
- M-Pesa safety invariants unchanged: `paused:true`, `canaryAllowlistSize:0` in the reported current baseline; require fresh production checks before a later implementation release.
- Real-browser tests for admin ready/onboarding/error and cashier active/no shift/break; product-empty and loading states; failed fetch and reconnection; reduced motion.
- Performance goals proposed for implementation: primary navigation usable immediately after shell hydration; avoid N+1 requests and any blocking analytics fetch before showing the action. Measure actual mobile p75 interactivity rather than inventing a baseline.

## Non-goals / decisions awaiting approval

- No payment activation, live transaction, production record mutation or rewrite of `/pos` checkout.
- No changes to subscriptions, employee limits or free-access commercial policy; onboarding messaging must remain accurate for the current policy.
- No promise that mobile cart, barcode scanner, held sale or offline payment are available without verifying real implementation and permissions.
- No deletion of the existing cashier dashboard; adapt its validated state machine and only then migrate.
- Design question for owner: whether mobile nav has four tabs Home/POS/Orders/More or a more minimal Home/POS/More. This preview proposes four, using role-specific routes for Orders.

## Design verification performed

This is a **design-only test**, not product functional verification:

- Local Chromium/Playwright rendered eight cases (admin mobile/desktop/first-time/data error; cashier mobile/desktop/no shift/on break).
- Browser JS errors: **0**.
- Scenario/role/view controls switch successfully; `Start shift` demo state transition works locally.
- Current preview has **no production API calls** or external dependencies.

Signoff requested before implementation: visual hierarchy, role-specific quick actions, mobile nav, and empty-state wording.