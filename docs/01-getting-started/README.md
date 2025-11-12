# SmartDuka Monorepo

This repository hosts the SmartDuka MVP: an offline-first POS & inventory platform built with Next.js (frontend) and NestJS (backend).

## Structure

- `apps/web` – Next.js PWA client
- `apps/api` – NestJS REST API
- `packages/` – Shared libraries (placeholder)

### Frontend (apps/web)
- Tailwind CSS v3 with custom tokens configured via `tailwind.config.ts`.
- Global theme values (light/dark) live in `src/app/globals.css`.
- ShadCN-compatible CLI config stored in `components.json`; shared utilities in `src/lib/utils.ts`.
- Theme toggling handled by `ThemeProvider` in `src/components/theme-provider.tsx`.
- Landing page scaffold in `src/app/page.tsx` illustrates responsive layout patterns for dashboard modules.

## Getting started

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Approve any required native build scripts (once per machine):
   ```bash
   pnpm approve-builds
   ```
3. Run the development servers:
   ```bash
   pnpm dev
   ```
   - Web: http://localhost:3000
   - API: http://localhost:3001 (once configured)

## Useful commands

- `pnpm dev:web` / `pnpm dev:api` – Run targets individually
- `pnpm build` – Build all apps
- `pnpm lint` / `pnpm test` – Monorepo linting & tests

## Next steps

- Add shared packages (`packages/ui`, `packages/types`, etc.)
- Flesh out POS, inventory, reporting screens using ShadCN primitives
- Configure Tailwind/ShadCN component library and add design tokens to shared package
- Set up NestJS modules, MongoDB connection, and Mongoose schemas
- Introduce CI/CD workflows and Docker Compose

### Backend roadmap (aligned with POS flows)
1. **Auth & Users** – JWT auth, cashier/operator roles, refresh tokens, password reset.
2. **Inventory & Products** – Catalog CRUD, stock levels, unit pricing, supplier refs, bulk import.
3. **Sales & Invoices** – Cart/session API, discounts, taxes, receipt generation, offline queue persistence.
4. **Payments Integration** – M-Pesa STK push, cash/card logging, settlements reconciliation, webhook handlers.
5. **Sync Service** – Offline-first conflict resolution, device status tracking, retry jobs with BullMQ.
6. **Reporting & Analytics** – Daily summaries, product performance, cash flow endpoints.

### Offline persistence plan
1. **Data storage (IndexedDB via Dexie)**
   - `products` table keyed by `_id` (name, price, stock, category, updatedAt).
   - `pendingOrders` table storing checkout payloads + timestamps for background sync.
   - `metadata` table for sync cursors (last product sync, version hashes).
2. **Sync workflows**
   - On app boot, hydrate products from IndexedDB before hitting API.
   - Background task to fetch `/inventory/products` diffs and upsert into IndexedDB.
   - Persist cart checkouts into `pendingOrders` when offline or API fails.
3. **Service Worker (Workbox)**
   - Precaching core shell + POS route assets.
   - Runtime caching: `/inventory/products` with Stale-While-Revalidate.
   - Background sync queue (`workbox-background-sync`) posting `/sales/checkout` when connectivity returns.
4. **UI integration**
   - POS shows offline badge (already present) and counts pending orders from IndexedDB.
   - Retry button triggers background sync manually if queue length > 0.
   - Toast notifications for sync success/failure events.
5. **Conflict & telemetry**
   - Server marks orders synced with `isOffline` flag; client removes matching pending record on 200.
   - Log sync metrics (duration, failures) to `/monitoring/sync` endpoint for observability.
