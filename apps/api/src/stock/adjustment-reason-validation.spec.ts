jest.mock('nanoid', () => ({ nanoid: () => 'testnanoid' }));
import { BadRequestException } from '@nestjs/common';
import { AdjustmentsService } from './adjustments.service';
import { InventoryService } from '../inventory/inventory.service';

/**
 * FRONTEND-FIX1 / FIX1-B — stock-adjustment input validation.
 *
 * REGRESSION: a reason-less adjustment was silently accepted and mapped
 * to 'other', weakening the stock audit trail. The API now rejects it
 * with an actionable message (the UI enforces the same rule).
 */

const PRODUCT_ID = '6ad2ccf44b5406c534c5b148';
const SHOP = '507f1f77bcf86cd7994390aa';

const makeService = () => {
  const product = { _id: PRODUCT_ID, shopId: SHOP, stock: 10 };
  const productModel: any = {
    findOne: jest.fn(async () => product),
  };
  const inventoryService: any = {
    updateStock: jest.fn(async () => ({ ...product, stock: 11 })),
  };
  const adjustmentModel: any = {
    create: jest.fn(async (doc: any) => ({ ...doc, _id: 'adj1' })),
    findOne: jest.fn(async () => null),
    // P0-9: exactly-once insert via mutationId unique index
    findOneAndUpdate: jest.fn((filter: any, doc: any) => ({
      exec: async () => ({ ...doc, _id: 'adj1', mutationId: filter.mutationId }),
    })),
  };
  // ctor order: (adjustmentModel, productModel, inventoryService)
  const svc = new AdjustmentsService(
    adjustmentModel,
    productModel,
    inventoryService,
  );
  return { svc, productModel, inventoryService, adjustmentModel };
};

describe('FIX1-B — stock-adjustment reason validation', () => {
  it('rejects a reason-less adjustment with an actionable message', async () => {
    const { svc } = makeService();
    await expect(
      svc.create(SHOP, '507f1f77bcf86cd7994390c3', {
        productId: PRODUCT_ID,
        productName: 'Product 1',
        delta: 1,
      } as any),
    ).rejects.toThrow(BadRequestException);
    await expect(
      svc.create(SHOP, '507f1f77bcf86cd7994390c3', {
        productId: PRODUCT_ID,
        productName: 'Product 1',
        delta: 1,
      } as any),
    ).rejects.toThrow(/reason is required/);
  });

  it('still accepts a valid reasoned adjustment (accounting unchanged)', async () => {
    const { svc, inventoryService, adjustmentModel } = makeService();
    const res = await svc.create(SHOP, '507f1f77bcf86cd7994390c3', {
      productId: PRODUCT_ID,
      productName: 'Product 1',
      delta: 1,
      reason: 'recount',
      idempotencyKey: 'k-1',
    } as any);
    expect(res).toBeTruthy();
    expect(inventoryService.updateStock).toHaveBeenCalledWith(
      SHOP, PRODUCT_ID, 1,
      expect.objectContaining({ mutationId: 'stock-adjustment:k-1' }),
    );
    // P0-9: exactly-once via upsert on (shopId, mutationId) — not create()
    expect(adjustmentModel.findOneAndUpdate).toHaveBeenCalled();
    expect(adjustmentModel.create).not.toHaveBeenCalled();
  });

  it('duplicate idempotency key does not double-apply (P0-9 preserved)', async () => {
    const { svc, adjustmentModel, inventoryService } = makeService();
    // Replay: the upsert filter matches the EXISTING row → Mongo returns
    // it unchanged ($setOnInsert ignored) — the original record.
    const original = { _id: 'adj0', mutationId: 'stock-adjustment:k-1', delta: 1 };
    adjustmentModel.findOneAndUpdate = jest.fn(() => ({
      exec: async () => original,
    }));
    const res = await svc.create(SHOP, '507f1f77bcf86cd7994390c3', {
      productId: PRODUCT_ID,
      productName: 'Product 1',
      delta: 1,
      reason: 'recount',
      idempotencyKey: 'k-1',
    } as any);
    expect((res as any)._id).toBe('adj0');
    expect(adjustmentModel.create).not.toHaveBeenCalled();
    // NOTE: the canonical contract re-applies the stock $inc through the
    // SAME mutationId — the durable-mutation layer's own idempotency
    // (tested in stock-mutation-integrity.spec) guarantees the stock
    // total does not move twice.
    expect(inventoryService.updateStock).toHaveBeenCalled();
  });
});
