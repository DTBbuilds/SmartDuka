import { PROPOSED_FREE_CAPACITY, previewProposedFreeCapacity } from './freemium-policy-preview';

describe('Proposed free tier (shadow-only, never enforced)', () => {
  const base = { locationsIncludingMainShop: 1, productRecords: 0, cashierAccounts: 1 };

  it('uses 100 distinct product records rather than units of stock or number of orders', () => {
    expect(PROPOSED_FREE_CAPACITY.productRecords).toBe(100);
    expect(previewProposedFreeCapacity({ ...base, productRecords: 99 }).productSlotsRemaining).toBe(1);
    expect(previewProposedFreeCapacity({ ...base, productRecords: 100 }).wouldAllowOneMoreProduct).toBe(false);
  });

  it('handles grandfathered accounts above limit without blocking sales, receipts or stock corrections', () => {
    const decision = previewProposedFreeCapacity({ ...base, productRecords: 103, cashierAccounts: 4 });
    expect(decision.productSlotsRemaining).toBe(0);
    expect(decision.wouldAllowOneMoreProduct).toBe(false);
    expect(decision.existingSalesAllowed).toBe(true);
    expect(decision.existingReceiptsAccessible).toBe(true);
    expect(decision.existingInventoryAdjustmentsAllowed).toBe(true);
  });

  it('counts the main shop as the sole free location', () => {
    const decision = previewProposedFreeCapacity(base);
    expect(decision.locationSlotsRemaining).toBe(0);
    expect(decision.wouldAllowOneMoreLocation).toBe(false);
  });

  it('preserves an owner plus one proposed cashier slot', () => {
    expect(previewProposedFreeCapacity({ ...base, cashierAccounts: 0 }).wouldAllowOneMoreCashier).toBe(true);
    expect(previewProposedFreeCapacity(base).wouldAllowOneMoreCashier).toBe(false);
  });

  it('rejects invalid totals instead of silently producing quota decisions', () => {
    for (const count of [-1, NaN, Infinity, 0.3, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => previewProposedFreeCapacity({ ...base, productRecords: count })).toThrow(RangeError);
    }
  });
});
