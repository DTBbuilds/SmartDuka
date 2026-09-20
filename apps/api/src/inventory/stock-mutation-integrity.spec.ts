jest.mock('nanoid', () => ({ nanoid: () => 'MOCKID' }));

import { Types } from 'mongoose';
import { ConflictException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { PurchasesService } from '../purchases/purchases.service';
import { SalesService } from '../sales/sales.service';
import { TransactionControlsService } from '../sales/transaction-controls.service';
import { InventoryReconciliationService } from './inventory-reconciliation.service';
import { InventoryRecoveryService } from './inventory-recovery.service';
import {
  InventoryClaimItemState,
  InventoryClaimState,
  RecoveryResolutionAction,
  RecoveryResolutionStatus,
} from './schemas/inventory-claim.schema';

/**
 * P0-1B regression shield on the V2 hardening branch: one logical stock
 * movement = one physical quantity mutation + one durable adjustment record.
 *
 * Stateful in-memory model fakes honor the real guard semantics ($gte stock
 * floor, $elemMatch item-state work claims, mutation-receipt idempotency),
 * so double mutations and missed guards are physically observable.
 */
describe('V2 stock mutation integrity (P0-1B)', () => {
  const SHOP = '507f1f77bcf86cd799439011';
  const USER = '507f1f77bcf86cd799439012';
  const PID = '507f1f77bcf86cd799439013';
  const ORDER_ID = '507f1f77bcf86cd799439014';
  const CLAIM_ID = '507f1f77bcf86cd799439015';
  const OLD = new Date(Date.now() - 60 * 60 * 1000);

  let product: any;
  let productModel: any;
  let adjustments: any[];
  let adjustmentModel: any;
  let reconciliationDocs: any[];
  let reconciliationModel: any;
  let claims: any[];
  let claimModel: any;
  let inventoryService: InventoryService;

  // Mongoose queries are thenables: code may await them or call .exec()
  const toQuery = (resolve: () => any): any => {
    const q: any = {
      exec: async () => resolve(),
      then: (onFulfilled: any, onRejected: any) =>
        Promise.resolve(resolve()).then(onFulfilled, onRejected),
    };
    q.populate = () => q;
    q.sort = () => q;
    q.limit = () => q;
    return q;
  };

  const matchesId = (a: any, b: any) => a?.toString?.() === b?.toString?.();

  // ----- product document -------------------------------------------------

  function applyProductUpdate(update: any): void {
    if (update.$inc?.stock !== undefined) product.stock += update.$inc.stock;
    if (update.$set?.stock !== undefined) product.stock = update.$set.stock;
    if (update.$push?.claimMutations) {
      product.claimMutations = product.claimMutations || [];
      product.claimMutations.push(update.$push.claimMutations);
    }
    if (update.$pull?.claimMutations) {
      const cond = update.$pull.claimMutations;
      const ids: string[] = cond?.mutationId?.$in ?? [cond?.mutationId];
      product.claimMutations = (product.claimMutations || []).filter(
        (m: any) => !ids.includes(m.mutationId),
      );
    }
  }

  function productMatchesFilter(filter: any): boolean {
    if (filter._id && !matchesId(filter._id, product._id)) return false;
    if (filter.shopId && !matchesId(filter.shopId, product.shopId))
      return false;
    if (
      filter.stock?.$gte !== undefined &&
      !(product.stock >= filter.stock.$gte)
    )
      return false;
    const receiptFilter = filter['claimMutations.mutationId'];
    if (receiptFilter !== undefined) {
      const receipts = (product.claimMutations || []).map(
        (m: any) => m.mutationId,
      );
      // $ne on an array field matches when NO element equals the value
      // (empty array included); equality matches when ANY element equals it.
      const matches =
        typeof receiptFilter === 'object' && '$ne' in receiptFilter
          ? !receipts.includes(receiptFilter.$ne)
          : receipts.includes(receiptFilter);
      if (!matches) return false;
    }
    return true;
  }

  function makeProductModel(): void {
    productModel = jest.fn((doc: any) => ({
      ...doc,
      save: jest.fn(async () => ({ _id: new Types.ObjectId(), ...doc })),
    }));
    productModel.findOne = jest.fn((filter: any) =>
      toQuery(() => (productMatchesFilter(filter) ? product : null)),
    );
    productModel.findById = jest.fn((id: any) =>
      toQuery(() => (matchesId(id, product._id) ? product : null)),
    );
    productModel.findOneAndUpdate = jest.fn((filter: any, update: any) =>
      toQuery(() =>
        productMatchesFilter(filter)
          ? (applyProductUpdate(update), product)
          : null,
      ),
    );
    productModel.findByIdAndUpdate = jest.fn((id: any, update: any) =>
      toQuery(() =>
        matchesId(id, product._id)
          ? (applyProductUpdate(update), product)
          : null,
      ),
    );
    productModel.updateOne = jest.fn((filter: any, update: any) =>
      toQuery(() => {
        if (!productMatchesFilter(filter)) return { modifiedCount: 0 };
        applyProductUpdate(update);
        return { modifiedCount: 1, matchedCount: 1 };
      }),
    );
  }

  // ----- claim document ---------------------------------------------------

  function claimMatchesState(doc: any, cond: any): boolean {
    if (cond === undefined) return true;
    if (cond.$in) return cond.$in.includes(doc.state);
    if (cond.$ne) return doc.state !== cond.$ne;
    return doc.state === cond;
  }

  function claimItemMatches(item: any, elem: any): boolean {
    if (elem.productId !== undefined && item.productId !== elem.productId)
      return false;
    if (elem.state !== undefined && item.state !== elem.state) return false;
    if (elem.resolution?.$exists === false && item.resolution) return false;
    if (
      elem['resolution.mutationId'] !== undefined &&
      item.resolution?.mutationId !== elem['resolution.mutationId']
    )
      return false;
    if (
      elem['resolution.status'] !== undefined &&
      item.resolution?.status !== elem['resolution.status']
    )
      return false;
    return true;
  }

  function applyClaimSet(doc: any, set: any, item?: any): void {
    for (const [key, value] of Object.entries(set)) {
      if (key === 'items.$.state' && item) item.state = value;
      else if (key === 'items.$.resolution' && item) item.resolution = value;
      else if (key === 'items.$.resolution.status' && item)
        item.resolution.status = value;
      else doc[key] = value;
    }
  }

  function claimUpdateOne(
    filter: any,
    update: any,
  ): { modifiedCount: number; matchedCount: number } {
    const doc = claims.find((c) => matchesId(c._id, filter._id));
    if (!doc) return { modifiedCount: 0, matchedCount: 0 };
    if (!claimMatchesState(doc, filter.state))
      return { modifiedCount: 0, matchedCount: 0 };
    if (
      filter.createdAt?.$lt &&
      !(
        new Date(doc.createdAt).getTime() <
        new Date(filter.createdAt.$lt).getTime()
      )
    )
      return { modifiedCount: 0, matchedCount: 0 };

    let item: any;
    if (filter.items?.$elemMatch) {
      item = doc.items.find((i: any) =>
        claimItemMatches(i, filter.items.$elemMatch),
      );
      if (!item) return { modifiedCount: 0, matchedCount: 0 };
    } else if (filter['items.productId']) {
      item = doc.items.find(
        (i: any) => i.productId === filter['items.productId'],
      );
      if (!item) return { modifiedCount: 0, matchedCount: 0 };
    }
    applyClaimSet(doc, update.$set, item);
    return { modifiedCount: 1, matchedCount: 1 };
  }

  function makeClaimModel(): void {
    claimModel = {
      create: jest.fn(async (input: any) => {
        const doc = {
          _id: new Types.ObjectId(CLAIM_ID),
          createdAt: new Date(),
          ...input,
          items: (input.items ?? []).map((i: any) => ({ ...i })),
        };
        claims.push(doc);
        return doc;
      }),
      findOne: jest.fn((filter: any) =>
        toQuery(
          () =>
            claims.find(
              (c) =>
                (!filter._id || matchesId(c._id, filter._id)) &&
                (!filter.shopId || matchesId(c.shopId, filter.shopId)) &&
                (!filter.orderId || matchesId(c.orderId, filter.orderId)),
            ) ?? null,
        ),
      ),
      findById: jest.fn((id: any) =>
        toQuery(() => claims.find((c) => matchesId(c._id, id)) ?? null),
      ),
      find: jest.fn((filter: any) =>
        toQuery(() =>
          claims.filter(
            (c) =>
              claimMatchesState(c, filter.state) &&
              (!filter.shopId || matchesId(c.shopId, filter.shopId)) &&
              (!filter.createdAt?.$lt ||
                new Date(c.createdAt).getTime() <
                  new Date(filter.createdAt.$lt).getTime()),
          ),
        ),
      ),
      updateOne: jest.fn((filter: any, update: any) =>
        toQuery(() => claimUpdateOne(filter, update)),
      ),
      findOneAndUpdate: jest.fn((filter: any, update: any) =>
        toQuery(() => {
          const doc = claims.find((c) => matchesId(c._id, filter._id));
          if (!doc) return null;
          if (!claimMatchesState(doc, filter.state)) return null;
          if (
            filter.createdAt?.$lt &&
            !(
              new Date(doc.createdAt).getTime() <
              new Date(filter.createdAt.$lt).getTime()
            )
          )
            return null;
          applyClaimSet(doc, update.$set);
          return doc;
        }),
      ),
    };
  }

  // ----- order model -------------------------------------------------------

  function makeOrderModel(orders: any[] = []): any {
    const model: any = jest.fn((doc: any) => ({
      _id: new Types.ObjectId(ORDER_ID),
      ...doc,
      save: jest.fn(async function (this: any) {
        return this;
      }),
    }));
    model.findOne = jest.fn((filter: any) =>
      toQuery(
        () =>
          orders.find(
            (o) =>
              matchesId(o._id, filter._id) &&
              matchesId(o.shopId, filter.shopId),
          ) ?? null,
      ),
    );
    model.findOneAndUpdate = jest.fn((filter: any, update: any) =>
      toQuery(() => {
        const order = orders.find(
          (o) =>
            matchesId(o._id, filter._id) &&
            matchesId(o.shopId, filter.shopId) &&
            (filter.status?.$ne === undefined ||
              o.status !== filter.status.$ne),
        );
        if (!order) return null;
        Object.assign(order, update);
        return order;
      }),
    );
    model.updateOne = jest.fn(() => toQuery(() => ({ modifiedCount: 1 })));
    return model;
  }

  function makeClaim(overrides: any = {}): any {
    return {
      _id: new Types.ObjectId(CLAIM_ID),
      shopId: new Types.ObjectId(SHOP),
      orderNumber: 'STK-2026-TEST01',
      claimedBy: new Types.ObjectId(USER),
      createdAt: OLD,
      state: InventoryClaimState.CLAIMED,
      items: [
        {
          productId: PID,
          name: 'Test Product',
          quantity: 3,
          state: InventoryClaimItemState.CLAIMED,
          mutationId: 'dec-m1',
        },
      ],
      ...overrides,
    };
  }

  function makeOrder(overrides: any = {}): any {
    return {
      _id: new Types.ObjectId(ORDER_ID),
      shopId: new Types.ObjectId(SHOP),
      orderNumber: 'STK-2026-TEST01',
      status: 'completed',
      paymentStatus: 'paid',
      total: 300,
      items: [
        { productId: PID, name: 'Test Product', quantity: 3, unitPrice: 100 },
      ],
      ...overrides,
    };
  }

  function makeRecoveryService(): InventoryRecoveryService {
    const config = { get: (_k: string, d: any) => d } as any;
    return new InventoryRecoveryService(
      claimModel,
      makeOrderModel(),
      inventoryService,
      config,
    );
  }

  beforeEach(() => {
    product = {
      _id: new Types.ObjectId(PID),
      shopId: new Types.ObjectId(SHOP),
      name: 'Test Product',
      sku: 'T-001',
      price: 100,
      cost: 50,
      stock: 10,
      branchInventory: {},
      claimMutations: [],
      save: jest.fn(async () => product),
    };
    makeProductModel();

    adjustments = [];
    adjustmentModel = jest.fn((doc: any) => ({
      ...doc,
      save: jest.fn(async () => {
        const record = { _id: new Types.ObjectId(), ...doc };
        adjustments.push(record);
        return record;
      }),
    }));

    reconciliationDocs = [];
    reconciliationModel = jest.fn((doc: any) => ({
      ...doc,
      save: jest.fn(async () => {
        reconciliationDocs.push(doc);
        return doc;
      }),
    }));

    claims = [];
    makeClaimModel();

    inventoryService = new InventoryService(
      productModel,
      {} as any,
      adjustmentModel,
      reconciliationModel,
      {} as any,
      {} as any,
      {} as any,
      {
        deletePattern: jest.fn(),
        getOrSet: jest.fn((_k: string, f: any) => f()),
      } as any,
    );
  });

  describe('createStockAdjustment contract', () => {
    it('writes exactly one audit record and performs zero stock mutation', async () => {
      await inventoryService.createStockAdjustment(
        SHOP,
        PID,
        -3,
        'sale',
        USER,
        'audit only',
      );

      expect(product.stock).toBe(10);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0]).toEqual(
        expect.objectContaining({ quantityChange: -3, reason: 'sale' }),
      );
      expect(productModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(productModel.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('manual adjustment endpoint', () => {
    it('applies +3 once: stock 10 -> 13 with one audit record', async () => {
      const controller = new InventoryController(inventoryService, {} as any);
      await controller.createStockAdjustment(
        { productId: PID, quantityChange: 3, reason: 'correction' },
        { shopId: SHOP, sub: USER },
      );
      expect(product.stock).toBe(13);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].quantityChange).toBe(3);
    });

    it('applies -2 once: stock 10 -> 8 with one audit record', async () => {
      const controller = new InventoryController(inventoryService, {} as any);
      await controller.createStockAdjustment(
        { productId: PID, quantityChange: -2, reason: 'damage' },
        { shopId: SHOP, sub: USER },
      );
      expect(product.stock).toBe(8);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].quantityChange).toBe(-2);
    });
  });

  describe('stock reconciliation variance', () => {
    it('applies variance once: physical 7 vs system 10 -> stock 7', async () => {
      await inventoryService.createStockReconciliation(
        SHOP,
        PID,
        7,
        new Date(),
        USER,
        'recount',
      );
      expect(product.stock).toBe(7);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].quantityChange).toBe(-3);
      expect(reconciliationDocs[0].variance).toBe(-3);
    });
  });

  describe('branch operations', () => {
    it('transfer moves stock between branches without touching global stock', async () => {
      product.branchInventory = { b1: { stock: 10 } };
      await inventoryService.transferBranchStock(
        SHOP,
        PID,
        'b1',
        'b2',
        4,
        USER,
      );
      expect(product.branchInventory.b1.stock).toBe(6);
      expect(product.branchInventory.b2.stock).toBe(4);
      expect(product.stock).toBe(10);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].reason).toBe('transfer');
    });

    it('addProductToBranch seeds branch stock without inflating global stock', async () => {
      await inventoryService.addProductToBranch(SHOP, PID, 'b1', 8, USER);
      expect(product.branchInventory.b1.stock).toBe(8);
      expect(product.stock).toBe(10);
      expect(adjustments).toHaveLength(1);
    });
  });

  describe('purchase receiving', () => {
    it('receiving qty 5 applies +5 once: stock 10 -> 15 with one audit record', async () => {
      const purchase: any = {
        _id: new Types.ObjectId(),
        shopId: new Types.ObjectId(SHOP),
        purchaseNumber: 'PO-TEST-1',
        status: 'pending',
        items: [
          {
            productId: new Types.ObjectId(PID),
            productName: 'Test Product',
            quantity: 5,
            unitCost: 50,
            totalCost: 250,
          },
        ],
        totalCost: 250,
      };
      const purchaseModel: any = {
        findOne: jest.fn(() => toQuery(() => purchase)),
        findOneAndUpdate: jest.fn((_f: any, update: any) =>
          toQuery(() => {
            Object.assign(purchase, update);
            return purchase;
          }),
        ),
      };
      const purchasesService = new PurchasesService(
        purchaseModel,
        inventoryService,
      );

      await purchasesService.update(
        purchase._id.toString(),
        SHOP,
        { status: 'received' },
        USER,
      );

      expect(product.stock).toBe(15);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].quantityChange).toBe(5);
      expect(adjustments[0].reason).toBe('purchase');
      expect(purchase.status).toBe('received');
    });
  });

  describe('checkout sale', () => {
    it('selling qty 3 decrements stock exactly once: stock 10 -> 7', async () => {
      const orderModel = makeOrderModel();
      const salesService = new SalesService(
        orderModel,
        claimModel,
        {} as any, // connection
        inventoryService,
        { logActivity: jest.fn() } as any,
        { createTransaction: jest.fn() } as any,
        { deletePattern: jest.fn() } as any,
        {
          getByShopId: jest.fn().mockResolvedValue({ tax: { enabled: false } }),
        } as any,
        {} as any,
        {} as any,
        {} as any,
      );

      await salesService.checkout(SHOP, USER, undefined, {
        items: [
          { productId: PID, name: 'Test Product', quantity: 3, unitPrice: 100 },
        ],
        payments: [{ method: 'cash', amount: 300 }],
      });

      expect(product.stock).toBe(7);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].quantityChange).toBe(-3);
      expect(adjustments[0].reason).toBe('sale');
      // Decrement receipt was written atomically then pulled once CLAIMED
      expect(product.claimMutations).toHaveLength(0);
    });
  });

  describe('void restore', () => {
    it('restores +3 once via the legacy path when no claim exists', async () => {
      const order = makeOrder({ status: 'completed' });
      const service = new TransactionControlsService(
        makeOrderModel([order]),
        claimModel, // findOne -> null -> legacy path
        inventoryService,
      );

      await service.voidTransaction(ORDER_ID, SHOP, 'customer return', USER);

      expect(product.stock).toBe(13);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].quantityChange).toBe(3);
      expect(adjustments[0].reason).toBe('void');
      expect(order.status).toBe('void');
    });

    it('restores +3 once via the claim-aware path', async () => {
      const order = makeOrder({ status: 'completed' });
      claims.push(
        makeClaim({
          state: InventoryClaimState.COMMITTED,
          orderId: new Types.ObjectId(ORDER_ID),
        }),
      );
      const service = new TransactionControlsService(
        makeOrderModel([order]),
        claimModel,
        inventoryService,
      );

      await service.voidTransaction(ORDER_ID, SHOP, 'customer return', USER);

      expect(product.stock).toBe(13);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].quantityChange).toBe(3);
      expect(adjustments[0].reason).toBe('void');
      expect(claims[0].items[0].state).toBe(InventoryClaimItemState.RESTORED);
      expect(claims[0].state).toBe(InventoryClaimState.RELEASED);
    });
  });

  describe('refund restore', () => {
    it('full refund restores +3 once; partial refund restores nothing', async () => {
      const order = makeOrder({ status: 'completed', total: 300 });
      const service = new TransactionControlsService(
        makeOrderModel([order]),
        claimModel,
        inventoryService,
      );

      await service.processRefund(ORDER_ID, SHOP, 300, 'full refund', USER);

      expect(product.stock).toBe(13);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].quantityChange).toBe(3);
      expect(adjustments[0].reason).toBe('refund');
    });

    it('partial refund performs zero stock mutation and zero adjustments', async () => {
      const order = makeOrder({ status: 'completed', total: 300 });
      const service = new TransactionControlsService(
        makeOrderModel([order]),
        claimModel,
        inventoryService,
      );

      await service.processRefund(ORDER_ID, SHOP, 100, 'partial', USER);

      expect(product.stock).toBe(10);
      expect(adjustments).toHaveLength(0);
      expect(order.status).toBe('completed');
    });
  });

  describe('claim recovery sweep', () => {
    it('orphaned CLAIMED reservation restores +3 exactly once', async () => {
      claims.push(makeClaim({ state: InventoryClaimState.CLAIMED }));
      const config = { get: (_k: string, d: any) => d } as any;
      const service = new InventoryReconciliationService(
        claimModel,
        makeOrderModel(),
        inventoryService,
        config,
      );

      const result = await service.recoverIncompleteClaims({ shopId: SHOP });

      expect(result.repaired).toBe(1);
      expect(product.stock).toBe(13);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].quantityChange).toBe(3);
      expect(adjustments[0].reason).toBe('correction');
      expect(claims[0].state).toBe(InventoryClaimState.RELEASED);
    });
  });

  describe('operator recovery', () => {
    it('RESTORE_STOCK on committed PENDING item with receipt restores +3 once', async () => {
      // Product carries the durable decrement receipt - proof the -3 landed.
      product.claimMutations = [{ mutationId: 'dec-m1', quantity: 3 }];
      product.stock = 7;
      claims.push(
        makeClaim({
          state: InventoryClaimState.COMMITTED,
          orderId: new Types.ObjectId(ORDER_ID),
          items: [
            {
              productId: PID,
              name: 'Test Product',
              quantity: 3,
              state: InventoryClaimItemState.PENDING,
              mutationId: 'dec-m1',
            },
          ],
        }),
      );
      const service = makeRecoveryService();

      const first = await service.resolveCase(SHOP, USER, {
        kind: 'claim_item',
        claimId: CLAIM_ID,
        productId: PID,
        action: RecoveryResolutionAction.RESTORE_STOCK,
        reason: 'decrement proven by receipt',
      });

      expect(first.quantityRestored).toBe(3);
      expect(product.stock).toBe(10);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].quantityChange).toBe(3);
      expect(claims[0].items[0].state).toBe(InventoryClaimItemState.RESTORED);
      expect(claims[0].items[0].resolution.status).toBe(
        RecoveryResolutionStatus.RESOLVED,
      );

      // Exactly-once: a second resolution attempt is rejected, stock unchanged
      await expect(
        service.resolveCase(SHOP, USER, {
          kind: 'claim_item',
          claimId: CLAIM_ID,
          productId: PID,
          action: RecoveryResolutionAction.RESTORE_STOCK,
          reason: 'duplicate attempt',
        }),
      ).rejects.toThrow(ConflictException);
      expect(product.stock).toBe(10);
      expect(adjustments).toHaveLength(1);
    });
  });
});
