// FIX1B — source-specific transfer stock logic (pure functions).
//
// The stock-transfer UI must present the SAME inventory-ownership rules
// the backend enforces (FIX1A): a BRANCH source's availability is that
// branch's own inventory; the MAIN store's availability is the global
// stock. The API transforms `stock` to branch stock on branch-scoped
// fetches; the shop-wide fallback list carries MAIN-store stock, which
// is never branch availability.

export type StockContext = 'branch' | 'shop';

export interface TransferProduct {
  _id: string;
  name?: string;
  stock?: number;
}

export interface SelectedItem {
  productId: string;
  quantity: number;
}

/** Availability of `product` at the CURRENT source location. */
export function availableFor(
  product: TransferProduct | undefined,
  isBranchSource: boolean,
  stockContext: StockContext,
): number {
  if (!product) return 0;
  if (!isBranchSource) return product.stock || 0;
  // Branch source: only the branch-scoped list's stock counts.
  return stockContext === 'branch' ? product.stock || 0 : 0;
}

/** A product may be added only when it is stocked at the source. */
export function isEligible(
  product: TransferProduct | undefined,
  isBranchSource: boolean,
  stockContext: StockContext,
): boolean {
  return availableFor(product, isBranchSource, stockContext) > 0;
}

/** Clamp a transfer quantity to [1, available]; 0-available → 1 (UI shows ineligible). */
export function clampQuantity(
  requested: number,
  available: number,
): number {
  const parsed = Number.isFinite(requested) ? Math.floor(requested) : 1;
  return Math.max(1, Math.min(parsed, Math.max(available, 1)));
}

/** Client-side submit validation — the SERVER remains authoritative. */
export function validateSelection(
  items: SelectedItem[],
  products: TransferProduct[],
  isBranchSource: boolean,
  stockContext: StockContext,
): { ok: true } | { ok: false; error: string } {
  for (const item of items) {
    const product = products.find((p) => p._id === item.productId);
    const available = availableFor(product, isBranchSource, stockContext);
    if (available <= 0) {
      return {
        ok: false,
        error: `${product?.name || 'An item'} is not stocked at the source branch — remove it or pick a stocked product.`,
      };
    }
    if (item.quantity > available) {
      return {
        ok: false,
        error: `${product?.name || 'An item'}: requested ${item.quantity}, but only ${available} in stock at the source branch.`,
      };
    }
  }
  return { ok: true };
}
