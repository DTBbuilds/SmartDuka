import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { InventoryReconciliationService } from './inventory-reconciliation.service';
import { InventoryService } from './inventory.service';
import {
  InventoryClaim,
  InventoryClaimState,
  InventoryClaimItemState,
} from './schemas/inventory-claim.schema';
import { Order } from '../sales/schemas/order.schema';

describe('InventoryReconciliationService crash recovery (SDV2-005)', () => {
  let service: InventoryReconciliationService;
  let claimModel: any;
  let orderModel: any;
  let inventoryService: any;

  const SHOP_ID = '507f1f77bcf86cd799439011';

  const queryable = (result: any) => ({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  });
  const execable = (result: any) => ({ exec: jest.fn().mockResolvedValue(result) });

  function makeClaim(overrides: Record<string, any> = {}) {
    return {
      _id: new Types.ObjectId(),
      shopId: new Types.ObjectId(SHOP_ID),
      orderNumber: 'STK-2026-CLAIM1',
      idempotencyKey: 'chk-xyz',
      orderId: null,
      state: InventoryClaimState.CLAIMED,
      claimedBy: new Types.ObjectId(),
      createdAt: new Date(Date.now() - 600000), // past the recovery grace window
      items: [
        { productId: 'prodA', name: 'Product A', quantity: 2, state: InventoryClaimItemState.CLAIMED },
        { productId: 'prodB', name: 'Product B', quantity: 1, state: InventoryClaimItemState.CLAIMED },
      ],
      ...overrides,
    };
  }

  beforeEach(async () => {
    claimModel = Object.assign(jest.fn(), {
      find: jest.fn().mockReturnValue(queryable([])),
      findOne: jest.fn(),
      findById: jest.fn().mockReturnValue(execable(null)),
      updateOne: jest.fn().mockReturnValue(execable({ modifiedCount: 1 })),
      findOneAndUpdate: jest.fn().mockReturnValue(execable(null)),
    });
    orderModel = {
      findOne: jest.fn().mockReturnValue(execable(null)),
    };
    inventoryService = {
      updateStock: jest.fn().mockResolvedValue({ stock: 10 }),
      createStockAdjustment: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryReconciliationService,
        { provide: getModelToken(InventoryClaim.name), useValue: claimModel },
        { provide: getModelToken(Order.name), useValue: orderModel },
        { provide: InventoryService, useValue: inventoryService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def: string) =>
              key === 'INVENTORY_RECONCILIATION_ENABLED' ? 'false' : def,
            ),
          },
        },
      ],
    }).compile();

    service = module.get<InventoryReconciliationService>(InventoryReconciliationService);
  });

  describe('classification (read-only inspection)', () => {
    it('classifies committed claims as healthy without mutating them', async () => {
      claimModel.find.mockReturnValue(queryable([makeClaim({ state: InventoryClaimState.COMMITTED })]));

      const report = await service.inspect();

      expect(report.healthyCommitted).toBe(1);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });

    it('classifies released claims as healthy terminal state', async () => {
      claimModel.find.mockReturnValue(queryable([makeClaim({ state: InventoryClaimState.RELEASED })]));

      const report = await service.inspect();

      expect(report.healthyReleased).toBe(1);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });

    it('classifies a claim whose order exists as healthy (crash between order.save and state flip)', async () => {
      const claim = makeClaim({ orderId: new Types.ObjectId() });
      claimModel.find.mockReturnValue(queryable([claim]));
      orderModel.findOne.mockReturnValue(execable({ _id: claim.orderId }));

      const report = await service.inspect();

      // The reservation is legitimate - must never be reported for restore.
      expect(report.healthyCommitted).toBe(1);
      expect(report.recoverableOrphan).toBe(0);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });

    it('classifies a claim with an orderId but missing order as ambiguous (never auto-mutated)', async () => {
      const claim = makeClaim({ orderId: new Types.ObjectId() });
      claimModel.find.mockReturnValue(queryable([claim]));
      orderModel.findOne.mockReturnValue(execable(null));

      const report = await service.inspect();

      expect(report.ambiguous).toBe(1);
      expect(report.recoverableOrphan).toBe(0);
    });

    it('classifies an orphan claim (no orderId) as recoverable', async () => {
      claimModel.find.mockReturnValue(queryable([makeClaim()]));

      const report = await service.inspect();

      expect(report.recoverableOrphan).toBe(1);
    });

    it('does not classify an in-flight claim inside the grace window', async () => {
      claimModel.find.mockReturnValue(
        queryable([makeClaim({ createdAt: new Date() })]),
      );

      const report = await service.inspect();

      expect(report.recoverableOrphan).toBe(0);
      expect(report.healthyCommitted).toBe(0);
      expect(report.healthyReleased).toBe(0);
      expect(report.partialRelease).toBe(0);
      expect(report.ambiguous).toBe(0);
    });

    it('classifies an item stuck in RESTORING as ambiguous (never auto-mutated)', async () => {
      claimModel.find.mockReturnValue(
        queryable([
          makeClaim({
            state: InventoryClaimState.RELEASING,
            items: [
              { productId: 'prodA', name: 'Product A', quantity: 2, state: InventoryClaimItemState.RESTORING },
              { productId: 'prodB', name: 'Product B', quantity: 1, state: InventoryClaimItemState.RESTORED },
            ],
          }),
        ]),
      );

      const report = await service.inspect();

      expect(report.ambiguous).toBe(1);
      expect(report.partialRelease).toBe(0);
    });

    it('classifies a partially released claim as recoverable partial release', async () => {
      claimModel.find.mockReturnValue(
        queryable([
          makeClaim({
            state: InventoryClaimState.RELEASING,
            items: [
              { productId: 'prodA', name: 'Product A', quantity: 2, state: InventoryClaimItemState.RESTORED },
              { productId: 'prodB', name: 'Product B', quantity: 1, state: InventoryClaimItemState.CLAIMED },
            ],
          }),
        ]),
      );

      const report = await service.inspect();

      expect(report.partialRelease).toBe(1);
    });
  });

  describe('orphan recovery', () => {
    it('closes out a claim whose order exists instead of restoring stock (crash after order.save)', async () => {
      const claim = makeClaim({ orderId: new Types.ObjectId() });
      claimModel.find.mockReturnValue(queryable([claim]));
      orderModel.findOne.mockReturnValue(execable({ _id: claim.orderId }));

      const result = await service.recoverIncompleteClaims();

      // Legitimate reservation: no stock mutation, claim marked committed.
      expect(result.repaired).toBe(1);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
      expect(claimModel.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: claim._id }),
        { $set: { state: InventoryClaimState.COMMITTED } },
      );
    });

    it('refuses to touch a claim with orderId but missing order (ambiguous)', async () => {
      const claim = makeClaim({ orderId: new Types.ObjectId() });
      claimModel.find.mockReturnValue(queryable([claim]));
      orderModel.findOne.mockReturnValue(execable(null));

      const result = await service.recoverIncompleteClaims();

      expect(result.ambiguous).toBe(1);
      expect(result.repaired).toBe(0);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });

    it('releases an orphan claim exactly once per item (crash during compensation resumes)', async () => {
      const claim = makeClaim();
      claimModel.find.mockReturnValue(queryable([claim]));
      claimModel.findOneAndUpdate.mockReturnValue(
        execable({ ...claim, state: InventoryClaimState.RELEASING }),
      );
      claimModel.findById.mockReturnValue(
        execable({
          ...claim,
          state: InventoryClaimState.RELEASING,
          items: claim.items.map((i: any) => ({ ...i, state: InventoryClaimItemState.RESTORED })),
        }),
      );

      const result = await service.recoverIncompleteClaims();

      expect(result.repaired).toBe(1);
      // Both items restored exactly once
      expect(inventoryService.updateStock).toHaveBeenCalledWith(SHOP_ID, 'prodA', 2);
      expect(inventoryService.updateStock).toHaveBeenCalledWith(SHOP_ID, 'prodB', 1);
      expect(inventoryService.updateStock).toHaveBeenCalledTimes(2);
      expect(inventoryService.createStockAdjustment).toHaveBeenCalledTimes(2);
      // Per-item progress flags were persisted (CLAIMED -> RESTORING -> RESTORED)
      expect(claimModel.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({
          items: { $elemMatch: { productId: 'prodA', state: InventoryClaimItemState.CLAIMED } },
        }),
        { $set: { 'items.$.state': InventoryClaimItemState.RESTORING } },
      );
      expect(claimModel.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({
          items: { $elemMatch: { productId: 'prodA', state: InventoryClaimItemState.RESTORING } },
        }),
        { $set: { 'items.$.state': InventoryClaimItemState.RESTORED } },
      );
    });

    it('is idempotent: a second recovery run discovers nothing and restores nothing', async () => {
      claimModel.find.mockReturnValue(queryable([])); // released claims are not discovered

      const result = await service.recoverIncompleteClaims();

      expect(result.repaired).toBe(0);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });

    it('does not restore the same item twice when recovery runs twice (work claim lost on rerun)', async () => {
      // Second pass: item already RESTORED, so the per-item work claim loses.
      const claim = makeClaim({
        state: InventoryClaimState.RELEASING,
        items: [
          { productId: 'prodA', name: 'Product A', quantity: 2, state: InventoryClaimItemState.RESTORED },
          { productId: 'prodB', name: 'Product B', quantity: 1, state: InventoryClaimItemState.RESTORED },
        ],
      });
      claimModel.find.mockReturnValue(queryable([claim]));
      claimModel.findById.mockReturnValue(execable(claim));

      const result = await service.recoverIncompleteClaims();

      expect(result.repaired).toBe(0);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });

    it('resumes a partial release: only un-restored items are restored', async () => {
      // Crash during release: item A already restored, item B still claimed
      const claim = makeClaim({
        state: InventoryClaimState.RELEASING,
        items: [
          { productId: 'prodA', name: 'Product A', quantity: 2, state: InventoryClaimItemState.RESTORED },
          { productId: 'prodB', name: 'Product B', quantity: 1, state: InventoryClaimItemState.CLAIMED },
        ],
      });
      claimModel.find.mockReturnValue(queryable([claim]));
      claimModel.findById.mockReturnValue(
        execable({
          ...claim,
          items: [
            { productId: 'prodA', name: 'Product A', quantity: 2, state: InventoryClaimItemState.RESTORED },
            { productId: 'prodB', name: 'Product B', quantity: 1, state: InventoryClaimItemState.RESTORED },
          ],
        }),
      );

      const result = await service.recoverIncompleteClaims();

      expect(result.repaired).toBe(1);
      expect(inventoryService.updateStock).toHaveBeenCalledTimes(1);
      expect(inventoryService.updateStock).toHaveBeenCalledWith(SHOP_ID, 'prodB', 1);
      expect(inventoryService.updateStock).not.toHaveBeenCalledWith(SHOP_ID, 'prodA', 2);
    });

    it('concurrent workers divide items safely: a lost work claim restores nothing', async () => {
      const claim = makeClaim();
      claimModel.find.mockReturnValue(queryable([claim]));
      claimModel.findOneAndUpdate.mockReturnValue(
        execable({ ...claim, state: InventoryClaimState.RELEASING }),
      );
      // Another worker already claimed every item's restoration work
      claimModel.updateOne.mockReturnValue(execable({ modifiedCount: 0 }));
      claimModel.findById.mockReturnValue(execable(claim));

      const result = await service.recoverIncompleteClaims();

      expect(result.repaired).toBe(0);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });

    it('a concurrent worker that loses the claim-level work claim skips the repair', async () => {
      const claim = makeClaim();
      claimModel.find.mockReturnValue(queryable([claim]));
      // Worker B: findOneAndUpdate returns null - worker A already took it
      claimModel.findOneAndUpdate.mockReturnValue(execable(null));

      const result = await service.recoverIncompleteClaims();

      expect(result.repaired).toBe(0);
      expect(result.skipped).toBe(1);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });

    it('never mutates a claim whose items include an ambiguous RESTORING marker', async () => {
      const claim = makeClaim({
        state: InventoryClaimState.RELEASING,
        items: [
          { productId: 'prodA', name: 'Product A', quantity: 2, state: InventoryClaimItemState.RESTORING },
          { productId: 'prodB', name: 'Product B', quantity: 1, state: InventoryClaimItemState.CLAIMED },
        ],
      });
      claimModel.find.mockReturnValue(queryable([claim]));
      claimModel.findById.mockReturnValue(execable(claim));

      const result = await service.recoverIncompleteClaims();

      // prodA is ambiguous (skipped, logged); prodB still restores exactly once.
      expect(inventoryService.updateStock).toHaveBeenCalledTimes(1);
      expect(inventoryService.updateStock).toHaveBeenCalledWith(SHOP_ID, 'prodB', 1);
      expect(inventoryService.updateStock).not.toHaveBeenCalledWith(SHOP_ID, 'prodA', 2);
    });

    it('keeps recovery tenant-scoped (shop filter on discovery and mutations)', async () => {
      const claim = makeClaim();
      claimModel.find.mockReturnValue(queryable([claim]));
      claimModel.findOneAndUpdate.mockReturnValue(
        execable({ ...claim, state: InventoryClaimState.RELEASING }),
      );
      claimModel.findById.mockReturnValue(
        execable({
          ...claim,
          items: claim.items.map((i: any) => ({ ...i, state: InventoryClaimItemState.RESTORED })),
        }),
      );

      await service.recoverIncompleteClaims({ shopId: SHOP_ID });

      expect(claimModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ shopId: expect.any(Types.ObjectId) }),
      );
      expect(
        inventoryService.updateStock.mock.calls.every((call: any[]) => call[0] === SHOP_ID),
      ).toBe(true);
      expect(
        inventoryService.createStockAdjustment.mock.calls.every(
          (call: any[]) => call[0] === SHOP_ID,
        ),
      ).toBe(true);
    });
  });
});
