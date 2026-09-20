import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { InventoryRecoveryService } from './inventory-recovery.service';
import {
  InventoryClaim,
  InventoryClaimItemState,
  InventoryClaimState,
} from './schemas/inventory-claim.schema';
import { Order } from '../sales/schemas/order.schema';
import { InventoryService } from './inventory.service';

/**
 * SDV2-006 ambiguous-state resolution shield.
 *
 * Models are mocked with deterministic in-memory stores so state transitions
 * (work claims, resolution records, item states) behave like MongoDB
 * conditional updates: a filter that does not match mutates nothing.
 */
describe('InventoryRecoveryService (SDV2-006)', () => {
  const SHOP_ID = new Types.ObjectId().toString();
  const OTHER_SHOP_ID = new Types.ObjectId().toString();
  const USER_ID = new Types.ObjectId().toString();
  const GRACE_MS = 120000;

  let service: InventoryRecoveryService;
  let claimModel: any;
  let orderModel: any;
  let inventoryService: any;

  const execable = (value: any) => ({
    exec: jest.fn().mockResolvedValue(value),
  });
  const queryable = (value: any) => ({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  });

  /** Applies a mongoose-style update to a stored claim in memory. */
  const applyUpdate = (claim: any, update: any) => {
    const setNested = (obj: any, dotted: string, value: any) => {
      const parts = dotted.split('.');
      let cur = obj;
      for (let i = 0; i < parts.length - 1; i += 1) {
        cur = cur?.[parts[i]];
        if (cur === undefined || cur === null) return;
      }
      cur[parts[parts.length - 1]] = value;
    };
    for (const [path, value] of Object.entries(update.$set ?? {})) {
      if (path.startsWith('items.$.')) {
        const field = path.replace('items.$.', '');
        // The item was matched by the update filter before mutation.
        const match = update.__matchedItem;
        if (match) setNested(match, field, value);
      } else {
        setNested(claim, path, value);
      }
    }
    for (const [path, value] of Object.entries(update.$push ?? {})) {
      if (path === 'notes') claim.notes = [...(claim.notes ?? []), value];
    }
  };

  const makeClaim = (overrides: any = {}) => ({
    _id: new Types.ObjectId(),
    shopId: new Types.ObjectId(SHOP_ID),
    orderNumber: 'ORD-T-1',
    state: InventoryClaimState.RELEASING,
    claimedBy: new Types.ObjectId(USER_ID),
    createdAt: new Date(Date.now() - GRACE_MS * 2),
    items: [],
    notes: [],
    ...overrides,
  });

  const restoringItem = (overrides: any = {}) => ({
    productId: 'prodA',
    name: 'Product A',
    quantity: 2,
    mutationId: 'mut-A1',
    state: InventoryClaimItemState.RESTORING,
    ...overrides,
  });

  /**
   * updateOne mock that honours the filters the service relies on:
   * item state, resolution existence/status, claim state, shop scope.
   */
  const installUpdateOne = () => {
    claimModel.updateOne.mockImplementation((filter: any, update: any) => {
      const claim = claimModel.__claims.get(filter._id?.toString());
      if (!claim) return execable({ matchedCount: 0, modifiedCount: 0 });
      if (
        filter.shopId &&
        claim.shopId.toString() !== filter.shopId.toString()
      ) {
        return execable({ matchedCount: 1, modifiedCount: 0 });
      }
      if (filter.state && filter.state.$in && !filter.state.$in.includes(claim.state)) {
        return execable({ matchedCount: 1, modifiedCount: 0 });
      }
      if (typeof filter.state === 'string' && claim.state !== filter.state) {
        return execable({ matchedCount: 1, modifiedCount: 0 });
      }
      if (filter['resolution.status']) {
        const cond = filter['resolution.status'];
        const blocked =
          (cond.$ne !== undefined && claim.resolution?.status === cond.$ne) ||
          (typeof cond === 'string' && claim.resolution?.status !== cond);
        if (blocked) {
          return execable({ matchedCount: 1, modifiedCount: 0 });
        }
      }
      if (filter.items?.$elemMatch) {
        const em = filter.items.$elemMatch;
        const item = claim.items.find((i: any) => {
          if (em.productId && i.productId !== em.productId) return false;
          if (em.state && i.state !== em.state) return false;
          if (
            em['resolution.status']?.$ne !== undefined &&
            i.resolution?.status === em['resolution.status'].$ne
          )
            return false;
          if (
            typeof em['resolution.status'] === 'string' &&
            i.resolution?.status !== em['resolution.status']
          )
            return false;
          if (em['resolution.mutationId'] && i.resolution?.mutationId !== em['resolution.mutationId'])
            return false;
          if (em['resolution']?.$exists === false && i.resolution) return false;
          return true;
        });
        if (!item) return execable({ matchedCount: 1, modifiedCount: 0 });
        update.__matchedItem = item;
      }
      applyUpdate(claim, update);
      return execable({ matchedCount: 1, modifiedCount: 1 });
    });
  };

  beforeEach(async () => {
    claimModel = {
      __claims: new Map<string, any>(),
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(0),
    };
    orderModel = {
      findOne: jest.fn().mockReturnValue(execable(null)),
    };
    inventoryService = {
      updateStock: jest.fn().mockResolvedValue({ stock: 10 }),
      createStockAdjustment: jest.fn().mockResolvedValue({}),
      hasClaimMutation: jest.fn().mockResolvedValue(false),
      clearClaimMutation: jest.fn().mockResolvedValue(undefined),
      clearClaimMutations: jest.fn().mockResolvedValue(undefined),
      getClaimMutation: jest.fn().mockResolvedValue(null),
      claimMutationForResolution: jest.fn().mockResolvedValue(true),
      findProductsWithClaimMutations: jest.fn().mockResolvedValue([]),
      countResolutionAdjustments: jest.fn().mockResolvedValue(0),
    };
    const configService = {
      get: jest.fn((key: string, def: string) => {
        if (key === 'INVENTORY_RECOVERY_GRACE_MS') return String(GRACE_MS);
        return def;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryRecoveryService,
        { provide: getModelToken(InventoryClaim.name), useValue: claimModel },
        { provide: getModelToken(Order.name), useValue: orderModel },
        { provide: InventoryService, useValue: inventoryService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(InventoryRecoveryService);
    installUpdateOne();
  });

  const store = (claim: any) => {
    claimModel.__claims.set(claim._id.toString(), claim);
    claimModel.findOne.mockImplementation((filter: any) => {
      const found = claimModel.__claims.get(filter._id?.toString());
      if (!found) return execable(null);
      if (
        filter.shopId &&
        found.shopId.toString() !== filter.shopId.toString()
      ) {
        return execable(null);
      }
      return execable(found);
    });
    claimModel.findById.mockImplementation((id: any) =>
      execable(claimModel.__claims.get(id.toString()) ?? null),
    );
    return claim;
  };

  describe('case visibility', () => {
    it('lists a stuck RESTORING item as an actionable case', async () => {
      const claim = makeClaim({ items: [restoringItem()] });
      store(claim);
      claimModel.find.mockReturnValue(queryable([claim]));

      const cases = await service.listCases(SHOP_ID);

      expect(cases).toHaveLength(1);
      expect(cases[0]).toMatchObject({
        kind: 'claim_item',
        reasonCode: 'STUCK_RESTORING',
        productId: 'prodA',
        itemState: 'restoring',
      });
    });

    it('exposes an unmatched mutation receipt', async () => {
      inventoryService.findProductsWithClaimMutations.mockResolvedValue([
        {
          _id: new Types.ObjectId(),
          shopId: new Types.ObjectId(SHOP_ID),
          claimMutations: [
            {
              mutationId: 'mut-X',
              claimId: new Types.ObjectId(),
              quantity: 3,
              createdAt: new Date(),
            },
          ],
        },
      ]);
      claimModel.find.mockReturnValue(queryable([]));
      claimModel.findOne.mockReturnValue(execable(null));

      const cases = await service.listCases(SHOP_ID);

      expect(cases).toHaveLength(1);
      expect(cases[0].reasonCode).toBe('UNMATCHED_MUTATION_RECEIPT');
      expect(cases[0].mutationId).toBe('mut-X');
    });

    it('lists a claim whose persisted orderId has no order', async () => {
      const claim = makeClaim({
        state: InventoryClaimState.CLAIMED,
        orderId: new Types.ObjectId(),
        items: [
          { productId: 'prodA', name: 'A', quantity: 1, state: InventoryClaimItemState.CLAIMED },
        ],
      });
      store(claim);
      claimModel.find.mockReturnValue(queryable([claim]));
      orderModel.findOne.mockReturnValue(execable(null));

      const cases = await service.listCases(SHOP_ID);

      expect(cases.some((c) => c.reasonCode === 'CLAIM_WITH_MISSING_ORDER')).toBe(true);
    });

    it('lists a committed claim whose PENDING item has a proven decrement', async () => {
      const claim = makeClaim({
        state: InventoryClaimState.COMMITTED,
        orderId: new Types.ObjectId(),
        items: [
          {
            productId: 'prodA',
            name: 'A',
            quantity: 1,
            mutationId: 'mut-A1',
            state: InventoryClaimItemState.PENDING,
          },
        ],
      });
      store(claim);
      claimModel.find.mockReturnValue(queryable([claim]));
      inventoryService.hasClaimMutation.mockResolvedValue(true);

      const cases = await service.listCases(SHOP_ID);

      expect(cases[0].reasonCode).toBe('COMMITTED_PENDING_WITH_RECEIPT');
      expect((cases[0] as any).decrementProven).toBe(true);
    });

    it('never presents an in-grace in-flight claim as actionable', async () => {
      const claim = makeClaim({
        createdAt: new Date(), // inside grace window
        items: [restoringItem()],
      });
      store(claim);
      claimModel.find.mockReturnValue(queryable([claim]));

      const cases = await service.listCases(SHOP_ID);
      expect(cases).toHaveLength(0);
    });

    it('scopes discovery to the authenticated shop only', async () => {
      const claim = makeClaim({ items: [restoringItem()] });
      store(claim);
      claimModel.find.mockReturnValue(queryable([claim]));

      await service.listCases(SHOP_ID);

      const filter = claimModel.find.mock.calls[0][0];
      expect(filter.shopId.toString()).toBe(SHOP_ID);
    });
  });

  describe('claim_item resolution', () => {
    it('RESTORE_STOCK restores exactly once with audit evidence', async () => {
      const claim = store(makeClaim({ items: [restoringItem()] }));
      claimModel.find.mockReturnValue(queryable([claim]));

      const result = await service.resolveCase(SHOP_ID, USER_ID, {
        kind: 'claim_item',
        claimId: claim._id.toString(),
        productId: 'prodA',
        action: 'restore_stock' as any,
        reason: 'stocktake confirmed goods on shelf',
      });

      expect(result.resolved).toBe(true);
      expect(result.quantityRestored).toBe(2);
      expect(inventoryService.updateStock).toHaveBeenCalledTimes(1);
      expect(inventoryService.updateStock).toHaveBeenCalledWith(
        SHOP_ID,
        'prodA',
        2,
        expect.objectContaining({ kind: 'restore' }),
      );
      // Audit: actor, reason, inventory effect
      expect(inventoryService.createStockAdjustment).toHaveBeenCalledWith(
        SHOP_ID,
        'prodA',
        2,
        'correction',
        USER_ID,
        expect.stringContaining('stocktake confirmed goods on shelf'),
      );
      expect(claim.items[0].state).toBe(InventoryClaimItemState.RESTORED);
      expect(claim.items[0].resolution).toMatchObject({
        status: 'resolved',
        action: 'restore_stock',
      });
    });

    it('a second resolve on a resolved item is rejected and mutates nothing', async () => {
      const claim = store(makeClaim({ items: [restoringItem()] }));
      claimModel.find.mockReturnValue(queryable([claim]));

      await service.resolveCase(SHOP_ID, USER_ID, {
        kind: 'claim_item',
        claimId: claim._id.toString(),
        productId: 'prodA',
        action: 'restore_stock' as any,
        reason: 'first',
      });
      inventoryService.updateStock.mockClear();

      await expect(
        service.resolveCase(SHOP_ID, USER_ID, {
          kind: 'claim_item',
          claimId: claim._id.toString(),
          productId: 'prodA',
          action: 'restore_stock' as any,
          reason: 'second',
        }),
      ).rejects.toThrow(ConflictException);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });

    it('a concurrent resolver that loses the work claim restores nothing', async () => {
      const claim = store(makeClaim({ items: [restoringItem()] }));
      claimModel.find.mockReturnValue(queryable([claim]));

      // Winner claims first
      await service.resolveCase(SHOP_ID, USER_ID, {
        kind: 'claim_item',
        claimId: claim._id.toString(),
        productId: 'prodA',
        action: 'restore_stock' as any,
        reason: 'winner',
      });
      inventoryService.updateStock.mockClear();

      // Loser sees resolution resolved -> conflict, no mutation
      await expect(
        service.resolveCase(SHOP_ID, USER_ID, {
          kind: 'claim_item',
          claimId: claim._id.toString(),
          productId: 'prodA',
          action: 'restore_stock' as any,
          reason: 'loser',
        }),
      ).rejects.toThrow(ConflictException);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });

    it('a conflicting action on an in-progress resolution is rejected', async () => {
      const claim = store(
        makeClaim({
          items: [
            restoringItem({
              resolution: {
                status: 'resolving',
                action: 'restore_stock',
                mutationId: 'restore-x',
                resolvedBy: new Types.ObjectId(USER_ID),
              },
            }),
          ],
        }),
      );
      claimModel.find.mockReturnValue(queryable([claim]));

      await expect(
        service.resolveCase(SHOP_ID, USER_ID, {
          kind: 'claim_item',
          claimId: claim._id.toString(),
          productId: 'prodA',
          action: 'accept_current_stock' as any,
          reason: 'conflict',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('resumes a crashed restore resolution without a second stock mutation', async () => {
      // Crash happened after updateStock(+2) but before finalize: the restore
      // receipt proves the mutation; retry must not mutate again.
      const claim = store(
        makeClaim({
          items: [
            restoringItem({
              resolution: {
                status: 'resolving',
                action: 'restore_stock',
                mutationId: 'restore-x',
                resolvedBy: new Types.ObjectId(USER_ID),
              },
            }),
          ],
        }),
      );
      claimModel.find.mockReturnValue(queryable([claim]));
      // updateStock returns null because the receipt already exists
      inventoryService.updateStock.mockResolvedValue(null);
      inventoryService.hasClaimMutation.mockImplementation(
        (_s: string, _p: string, mid: string) => Promise.resolve(mid === 'restore-x'),
      );

      const result = await service.resolveCase(SHOP_ID, USER_ID, {
        kind: 'claim_item',
        claimId: claim._id.toString(),
        productId: 'prodA',
        action: 'restore_stock' as any,
        reason: 'retry after crash',
      });

      expect(result.resolved).toBe(true);
      // The mutation was attempted idempotently (receipt-exclusion made it a
      // proven no-op); the finalize still ran exactly once.
      expect(inventoryService.updateStock).toHaveBeenCalledWith(
        SHOP_ID,
        'prodA',
        2,
        expect.objectContaining({ mutationId: 'restore-x' }),
      );
      expect(claim.items[0].state).toBe(InventoryClaimItemState.RESTORED);
    });

    it('ACCEPT_CURRENT_STOCK mutates no stock but records the decision', async () => {
      const claim = store(makeClaim({ items: [restoringItem()] }));
      claimModel.find.mockReturnValue(queryable([claim]));

      const result = await service.resolveCase(SHOP_ID, USER_ID, {
        kind: 'claim_item',
        claimId: claim._id.toString(),
        productId: 'prodA',
        action: 'accept_current_stock' as any,
        reason: 'physical count matches - restore had landed',
      });

      expect(result.resolved).toBe(true);
      expect(result.quantityRestored).toBe(0);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
      expect(claim.items[0].state).toBe(InventoryClaimItemState.RESTORED);
      expect(claim.items[0].resolution).toMatchObject({
        status: 'resolved',
        action: 'accept_current_stock',
      });
    });

    it('rejects RESTORE_STOCK on a committed PENDING item with no decrement proof', async () => {
      const claim = store(
        makeClaim({
          state: InventoryClaimState.COMMITTED,
          items: [
            {
              productId: 'prodA',
              name: 'A',
              quantity: 1,
              mutationId: 'mut-A1',
              state: InventoryClaimItemState.PENDING,
            },
          ],
        }),
      );
      claimModel.find.mockReturnValue(queryable([claim]));
      inventoryService.hasClaimMutation.mockResolvedValue(false);

      await expect(
        service.resolveCase(SHOP_ID, USER_ID, {
          kind: 'claim_item',
          claimId: claim._id.toString(),
          productId: 'prodA',
          action: 'restore_stock' as any,
          reason: 'no proof',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });

    it('rejects resolution of a non-ambiguous item (never guesses)', async () => {
      const claim = store(
        makeClaim({
          items: [
            {
              productId: 'prodA',
              name: 'A',
              quantity: 1,
              state: InventoryClaimItemState.CLAIMED,
            },
          ],
        }),
      );
      claimModel.find.mockReturnValue(queryable([claim]));

      await expect(
        service.resolveCase(SHOP_ID, USER_ID, {
          kind: 'claim_item',
          claimId: claim._id.toString(),
          productId: 'prodA',
          action: 'restore_stock' as any,
          reason: 'not ambiguous',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects resolution for another tenant (cross-shop isolation)', async () => {
      const claim = makeClaim({ items: [restoringItem()] });
      store(claim);
      claimModel.find.mockReturnValue(queryable([claim]));
      // findOne filter includes shopId of OTHER_SHOP -> not found
      claimModel.findOne.mockImplementation((filter: any) =>
        execable(
          claim.shopId.toString() === filter.shopId.toString() ? claim : null,
        ),
      );

      await expect(
        service.resolveCase(OTHER_SHOP_ID, USER_ID, {
          kind: 'claim_item',
          claimId: claim._id.toString(),
          productId: 'prodA',
          action: 'restore_stock' as any,
          reason: 'cross-shop attempt',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });

    it('rejects resolution of an in-flight claim', async () => {
      const claim = store(
        makeClaim({
          createdAt: new Date(),
          items: [restoringItem()],
        }),
      );
      claimModel.find.mockReturnValue(queryable([claim]));

      await expect(
        service.resolveCase(SHOP_ID, USER_ID, {
          kind: 'claim_item',
          claimId: claim._id.toString(),
          productId: 'prodA',
          action: 'restore_stock' as any,
          reason: 'in-flight',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('claim-level resolution (CLAIM_WITH_MISSING_ORDER)', () => {
    const missingOrderClaim = () =>
      makeClaim({
        state: InventoryClaimState.CLAIMED,
        orderId: new Types.ObjectId(),
        items: [
          {
            productId: 'prodA',
            name: 'A',
            quantity: 2,
            mutationId: 'mut-A1',
            state: InventoryClaimItemState.CLAIMED,
          },
        ],
      });

    it('ACCEPT_CURRENT_STOCK terminally resolves without touching stock', async () => {
      const claim = store(missingOrderClaim());
      orderModel.findOne.mockReturnValue(execable(null));

      const result = await service.resolveCase(SHOP_ID, USER_ID, {
        kind: 'claim',
        claimId: claim._id.toString(),
        action: 'accept_current_stock' as any,
        reason: 'order verified sold through secondary log',
      });

      expect(result.resolved).toBe(true);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
      expect(claim.state).toBe(InventoryClaimState.RESOLVED);
      expect(claim.resolution).toMatchObject({
        status: 'resolved',
        action: 'accept_current_stock',
      });
    });

    it('RESTORE_STOCK releases provable items exactly once', async () => {
      const claim = store(missingOrderClaim());
      orderModel.findOne.mockReturnValue(execable(null));
      claimModel.findOneAndUpdate.mockImplementation(
        (filter: any, update: any) => {
          const c = claimModel.__claims.get(filter._id.toString());
          if (c?.state === InventoryClaimState.CLAIMED) {
            applyUpdate(c, update);
            return execable(c);
          }
          return execable(null);
        },
      );

      const result = await service.resolveCase(SHOP_ID, USER_ID, {
        kind: 'claim',
        claimId: claim._id.toString(),
        action: 'restore_stock' as any,
        reason: 'order vanished - release reservation',
      });

      expect(result.resolved).toBe(true);
      expect(inventoryService.updateStock).toHaveBeenCalledTimes(1);
      expect(claim.items[0].state).toBe(InventoryClaimItemState.RESTORED);
    });
  });

  describe('mutation_receipt resolution', () => {
    const receiptProduct = () => ({
      _id: new Types.ObjectId(),
      shopId: new Types.ObjectId(SHOP_ID),
      claimMutations: [
        {
          mutationId: 'mut-X',
          claimId: new Types.ObjectId(),
          quantity: 3,
          createdAt: new Date(),
        },
      ],
    });

    it('restores an unmatched receipt exactly once', async () => {
      inventoryService.getClaimMutation.mockResolvedValue(
        receiptProduct().claimMutations[0],
      );
      claimModel.findOne.mockReturnValue(execable(null));

      const result = await service.resolveCase(SHOP_ID, USER_ID, {
        kind: 'mutation_receipt',
        productId: 'prodX',
        mutationId: 'mut-X',
        action: 'restore_stock' as any,
        reason: 'goods confirmed back on shelf',
      });

      expect(result.resolved).toBe(true);
      expect(result.quantityRestored).toBe(3);
      expect(inventoryService.updateStock).toHaveBeenCalledTimes(1);
      expect(inventoryService.claimMutationForResolution).toHaveBeenCalledWith(
        SHOP_ID,
        'prodX',
        'mut-X',
        expect.objectContaining({ status: 'resolving', action: 'restore_stock' }),
      );
      expect(inventoryService.clearClaimMutations).toHaveBeenCalled();
    });

    it('losing the receipt work claim mutates nothing', async () => {
      inventoryService.getClaimMutation.mockResolvedValue(
        receiptProduct().claimMutations[0],
      );
      claimModel.findOne.mockReturnValue(execable(null));
      inventoryService.claimMutationForResolution.mockResolvedValue(false);

      await expect(
        service.resolveCase(SHOP_ID, USER_ID, {
          kind: 'mutation_receipt',
          productId: 'prodX',
          mutationId: 'mut-X',
          action: 'restore_stock' as any,
          reason: 'second worker',
        }),
      ).rejects.toThrow(ConflictException);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
    });

    it('ACCEPT_CURRENT_STOCK pulls the receipt with a zero-delta audit record', async () => {
      inventoryService.getClaimMutation.mockResolvedValue(
        receiptProduct().claimMutations[0],
      );
      claimModel.findOne.mockReturnValue(execable(null));

      const result = await service.resolveCase(SHOP_ID, USER_ID, {
        kind: 'mutation_receipt',
        productId: 'prodX',
        mutationId: 'mut-X',
        action: 'accept_current_stock' as any,
        reason: 'decrement was a legitimate sale',
      });

      expect(result.resolved).toBe(true);
      expect(result.quantityRestored).toBe(0);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();
      expect(inventoryService.createStockAdjustment).toHaveBeenCalledWith(
        SHOP_ID,
        'prodX',
        0,
        'correction',
        USER_ID,
        expect.stringContaining('accepted current stock'),
      );
    });

    it('rejects resolution of a receipt that matches a live claim item', async () => {
      const claim = makeClaim({
        state: InventoryClaimState.COMMITTED,
        items: [
          {
            productId: 'prodX',
            name: 'X',
            quantity: 3,
            mutationId: 'mut-X',
            state: InventoryClaimItemState.CLAIMED,
          },
        ],
      });
      store(claim);
      inventoryService.getClaimMutation.mockResolvedValue({
        ...receiptProduct().claimMutations[0],
        claimId: claim._id,
      });

      await expect(
        service.resolveCase(SHOP_ID, USER_ID, {
          kind: 'mutation_receipt',
          productId: 'prodX',
          mutationId: 'mut-X',
          action: 'restore_stock' as any,
          reason: 'matched receipt',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('escalation and metrics', () => {
    it('addNote records investigation without mutating inventory or closing the case', async () => {
      const claim = store(makeClaim({ items: [restoringItem()] }));
      claimModel.find.mockReturnValue(queryable([claim]));

      const result = await service.addNote(
        SHOP_ID,
        USER_ID,
        claim._id.toString(),
        'checking CCTV and supplier log',
      );

      expect(result.noted).toBe(true);
      expect(claim.notes[0].text).toContain('CCTV');
      expect(claim.items[0].state).toBe(InventoryClaimItemState.RESTORING);
      expect(inventoryService.updateStock).not.toHaveBeenCalled();

      // Case is still discoverable as unresolved
      const cases = await service.listCases(SHOP_ID);
      expect(cases).toHaveLength(1);
    });

    it('metrics count unresolved cases, receipts, and resolutions', async () => {
      const claim = makeClaim({ items: [restoringItem()] });
      claimModel.find.mockReturnValue(queryable([claim]));
      claimModel.findOne.mockReturnValue(execable(claim));
      claimModel.countDocuments.mockResolvedValue(2);
      inventoryService.countResolutionAdjustments.mockResolvedValue(1);

      const metrics = await service.getMetrics(SHOP_ID);

      expect(metrics.unresolvedCases).toBe(1);
      expect(metrics.stuckRestoringItems).toBe(1);
      // 2 claim-level + 2 item-level + 1 receipt-level resolution today
      expect(metrics.resolvedToday).toBe(5);
      expect(metrics.byReason.STUCK_RESTORING).toBe(1);
    });
  });
});
