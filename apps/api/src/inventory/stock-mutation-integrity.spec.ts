jest.mock('nanoid', () => ({ nanoid: () => 'MOCKID' }));

import { Types } from 'mongoose';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { PurchasesService } from '../purchases/purchases.service';
import { SalesService } from '../sales/sales.service';

/**
 * P0-1 regression shield: one logical stock movement must produce exactly one
 * physical quantity mutation plus one durable adjustment record.
 *
 * These tests use stateful in-memory model fakes: $inc/$set actually mutate a
 * product document, so a double mutation is physically observable.
 */
describe('Stock mutation integrity (P0-1)', () => {
  const SHOP = '507f1f77bcf86cd799439011';
  const USER = '507f1f77bcf86cd799439012';
  const PID = '507f1f77bcf86cd799439013';

  let product: any;
  let productModel: any;
  let adjustments: any[];
  let adjustmentModel: any;
  let auditFailures = 0;
  let reconciliationDocs: any[];
  let reconciliationModel: any;
  let inventoryService: InventoryService;

  const matchesFilter = (filter: any) =>
    (!filter._id || filter._id.toString() === PID) &&
    (!filter.shopId || filter.shopId.toString() === SHOP);

  const applyUpdate = (filter: any, update: any) => {
    // Mutation-identity idempotency: an existing receipt for the same
    // mutationId means the mutation already landed (proven no-op).
    const neId = filter['stockMutations.mutationId']?.$ne;
    if (
      neId &&
      (product.stockMutations ?? []).some((m: any) => m.mutationId === neId)
    ) {
      return null;
    }
    if (update.$inc?.stock !== undefined) product.stock += update.$inc.stock;
    if (update.$set?.stock !== undefined) product.stock = update.$set.stock;
    for (const key of Object.keys(update.$inc ?? {})) {
      if (key.startsWith('branchInventory.')) {
        const branchKey = key.split('.')[1];
        product.branchInventory = product.branchInventory ?? {};
        product.branchInventory[branchKey] = product.branchInventory[
          branchKey
        ] ?? { stock: 0 };
        product.branchInventory[branchKey].stock += update.$inc[key];
      }
    }
    if (update.$push?.stockMutations) {
      product.stockMutations = [
        ...(product.stockMutations ?? []),
        { ...update.$push.stockMutations },
      ];
    }
    return product;
  };

  // Mongoose queries are thenables: code may await them or call .exec()
  const toQuery = (resolve: () => any): any => {
    const q: any = {
      exec: async () => resolve(),
      then: (onFulfilled: any, onRejected: any) =>
        Promise.resolve(resolve()).then(onFulfilled, onRejected),
    };
    q.populate = () => q;
    return q;
  };

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
      save: jest.fn(async () => product),
    };

    productModel = jest.fn((doc: any) => ({
      ...doc,
      save: jest.fn(async () => ({ _id: new Types.ObjectId(), ...doc })),
    }));
    productModel.findOne = jest.fn((filter: any) =>
      toQuery(() => (matchesFilter(filter) ? product : null)),
    );
    productModel.findById = jest.fn((id: any) =>
      toQuery(() => (id.toString() === PID ? product : null)),
    );
    productModel.findOneAndUpdate = jest.fn((filter: any, update: any) =>
      toQuery(() =>
        matchesFilter(filter) ? applyUpdate(filter, update) : null,
      ),
    );
    productModel.findByIdAndUpdate = jest.fn((id: any, update: any) =>
      toQuery(() =>
        id.toString() === PID ? applyUpdate({ _id: id }, update) : null,
      ),
    );

    adjustments = [];
    auditFailures = 0;
    adjustmentModel = jest.fn((doc: any) => ({
      ...doc,
      save: jest.fn(async () => {
        if (auditFailures > 0) {
          auditFailures -= 1;
          throw Object.assign(new Error('Injected audit persistence failure'), {
            code: 500,
          });
        }
        const record = { _id: new Types.ObjectId(), ...doc };
        adjustments.push(record);
        return record;
      }),
    }));
    adjustmentModel.findOne = jest.fn((filter: any) =>
      toQuery(
        () =>
          adjustments.find(
            (a: any) =>
              a.mutationId === filter.mutationId &&
              (!filter.shopId ||
                a.shopId.toString() === filter.shopId.toString()),
          ) ?? null,
      ),
    );
    productModel.updateOne = jest.fn((filter: any, update: any, options: any) =>
      toQuery(() => {
        if (!matchesFilter(filter)) return { modifiedCount: 0 };
        if (update.$set?.['stockMutations.$[m].audited'] !== undefined) {
          const mid = options?.arrayFilters?.[0]?.['m.mutationId'];
          for (const m of product.stockMutations ?? []) {
            if (m.mutationId === mid) m.audited = true;
          }
        }
        if (update.$pull?.stockMutations) {
          const crit = update.$pull.stockMutations;
          product.stockMutations = (product.stockMutations ?? []).filter(
            (m: any) =>
              !(
                crit.audited === true &&
                m.audited === true &&
                (crit.mutationId === undefined ||
                  m.mutationId === crit.mutationId)
              ),
          );
        }
        return { modifiedCount: 1 };
      }),
    );

    reconciliationDocs = [];
    reconciliationModel = jest.fn((doc: any) => ({
      ...doc,
      save: jest.fn(async () => {
        reconciliationDocs.push(doc);
        return doc;
      }),
    }));

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
        -1,
        'sale',
        USER,
        'audit only',
      );

      expect(product.stock).toBe(10);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0]).toEqual(
        expect.objectContaining({ quantityChange: -1, reason: 'sale' }),
      );
      expect(productModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
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
      expect(reconciliationDocs).toHaveLength(1);
      expect(reconciliationDocs[0].variance).toBe(-3);
    });
  });

  describe('branch operations', () => {
    it('branch transfer moves stock between branches without touching global stock', async () => {
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
      expect(product.stock).toBe(10); // global stock conserved
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
        findOneAndUpdate: jest.fn((filter: any, update: any) =>
          toQuery(() => {
            // Honor the conditional lifecycle claim: the update only lands
            // when the filter's status still matches the purchase.
            if (
              filter?.status !== undefined &&
              purchase.status !== filter.status
            ) {
              return null;
            }
            Object.assign(purchase, update.$set ?? update);
            return purchase;
          }),
        ),
        updateOne: jest.fn((_f: any, update: any) =>
          toQuery(() => {
            Object.assign(purchase, update.$set ?? update);
            return { modifiedCount: 1 };
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
    it('selling qty 1 decrements stock exactly once: stock 10 -> 9', async () => {
      const orderDoc: any = {
        save: jest.fn(async () => orderDoc),
      };
      const orderModel: any = jest.fn((doc: any) => {
        Object.assign(orderDoc, doc);
        orderDoc._id = new Types.ObjectId();
        return orderDoc;
      });
      const salesService = new SalesService(
        orderModel,
        {} as any, // connection
        inventoryService,
        { logActivity: jest.fn() } as any, // activity
        { createTransaction: jest.fn() } as any, // payment transactions
        { deletePattern: jest.fn() } as any, // cache
        {
          getByShopId: jest.fn().mockResolvedValue({ tax: { enabled: false } }),
        } as any,
        {} as any, // transactionService
        {} as any, // loyalty
        {} as any, // customers
      );

      await salesService.checkout(SHOP, USER, undefined as any, {
        items: [
          {
            productId: PID,
            name: 'Test Product',
            quantity: 1,
            unitPrice: 100,
          },
        ],
        payments: [{ method: 'cash', amount: 100 }],
      });

      expect(product.stock).toBe(9);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].quantityChange).toBe(-1);
      expect(adjustments[0].reason).toBe('sale');
    });
  });
});
