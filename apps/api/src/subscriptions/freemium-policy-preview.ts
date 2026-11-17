/**
 * SMARTDUKA-MERCHANT-GROWTH-001.
 *
 * PROPOSAL / SHADOW-ONLY: not connected to user creation, inventory,
 * checkout, subscriptions, billing or guards. No production denial can
 * occur by importing this helper in tests or audit scripts.
 *
 * "100 products" means 100 separate product documents, NOT 100 stock units
 * and NOT 100 sales.
 */
export const PROPOSED_FREE_CAPACITY = Object.freeze({
  locationsIncludingMainShop: 1,
  productRecords: 100,
  cashierAccounts: 1,
});

export interface FreeTierSnapshot {
  locationsIncludingMainShop: number;
  productRecords: number;
  cashierAccounts: number;
}

export interface ProposedFreeCapacityPreview {
  productSlotsRemaining: number;
  locationSlotsRemaining: number;
  cashierSlotsRemaining: number;
  wouldAllowOneMoreProduct: boolean;
  wouldAllowOneMoreCashier: boolean;
  wouldAllowOneMoreLocation: boolean;
  /** Always true under the intended policy, including for grandfathered shops. */
  existingSalesAllowed: true;
  existingReceiptsAccessible: true;
  existingInventoryAdjustmentsAllowed: true;
}

function validateCount(value: number, key: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(key + ' must be a nonnegative safe integer');
  }
}

/**
 * Hypothetical result only: deliberately does not perform any API/database
 * writes or enforce quota decisions. Implement an authoritative, atomic
 * tenant-scoped server gate separately after subscription migration.
 */
export function previewProposedFreeCapacity(snapshot: FreeTierSnapshot): ProposedFreeCapacityPreview {
  validateCount(snapshot.locationsIncludingMainShop, 'locationsIncludingMainShop');
  validateCount(snapshot.productRecords, 'productRecords');
  validateCount(snapshot.cashierAccounts, 'cashierAccounts');

  const productSlotsRemaining = Math.max(0, PROPOSED_FREE_CAPACITY.productRecords - snapshot.productRecords);
  const locationSlotsRemaining = Math.max(0, PROPOSED_FREE_CAPACITY.locationsIncludingMainShop - snapshot.locationsIncludingMainShop);
  const cashierSlotsRemaining = Math.max(0, PROPOSED_FREE_CAPACITY.cashierAccounts - snapshot.cashierAccounts);

  return {
    productSlotsRemaining,
    locationSlotsRemaining,
    cashierSlotsRemaining,
    wouldAllowOneMoreProduct: productSlotsRemaining > 0,
    wouldAllowOneMoreCashier: cashierSlotsRemaining > 0,
    wouldAllowOneMoreLocation: locationSlotsRemaining > 0,
    existingSalesAllowed: true,
    existingReceiptsAccessible: true,
    existingInventoryAdjustmentsAllowed: true,
  };
}
