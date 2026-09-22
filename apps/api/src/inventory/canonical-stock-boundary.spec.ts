jest.mock('nanoid', () => ({ nanoid: () => 'MOCKID' }));

import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { AdjustmentsService } from '../stock/adjustments.service';

/**
 * P0-9 regression shield: every physical stock change must carry a canonical
 * durable mutation identity + real actor provenance. Direct/unwitnessed
 * writers, unstable identities, and stale-document overwrites are defects.
 */
describe('Canonical stock mutation boundary (P0-9)', () => {
  const SHOP = '507f1f77bcf86cd799439011';
  const USER = '507f1f77bcf86cd799439012';
  const PID = '507f1f77bcf86cd799439013';
  const PID2 = '507f1f77bcf86cd799439014';
  const B1 = 'branch-1';
  const B2 = 'branch-2';

  let products: Map<string, any>;
  let stockAdjustments: any[];
  let domainAdjustments: any[];
  let productModel: any;
  let adjustmentModel: any;
  let domainAdjustmentModel: any;
  let auditFailures: number;
  let domainProjectionFailures: number;
  let service: InventoryService;
  let controller: InventoryController;
  let adjustmentsService: AdjustmentsService;

  const seedProduct = (overrides: any = {}) => {
    const p: any = {
      _id: new Types.ObjectId(PID),
      shopId: new Types.ObjectId(SHOP),
      name: 'Test Product',
      sku: 'T-001',
      barcode: 'BC-1',
      price: 100,
      cost: 50,
      stock: 10,
      branchInventory: {},
      stockMutations: [],
      ...overrides,
    };
    products.set(p._id.toString(), p);
    return p;
  };

  const fieldMatches = (doc: any, path: string, cond: any): boolean => {
    // stockMutations.mutationId is an array-element path: $ne means "no
    // element has this mutationId" — not "the field is absent".
    if (
      path === 'stockMutations.mutationId' &&
      cond &&
      typeof cond === 'object' &&
      cond.$ne !== undefined
    ) {
      return !(doc.stockMutations ?? []).some(
        (m: any) => m.mutationId === cond.$ne,
      );
    }
    const value = path.split('.').reduce((o: any, k: string) => o?.[k], doc);
    if (cond && typeof cond === 'object' && !(cond instanceof Types.ObjectId)) {
      if (cond.$exists === false) return value === undefined;
      if (cond.$exists === true) return value !== undefined;
      if (cond.$ne !== undefined)
        return String(value ?? '') !== String(cond.$ne);
      if (cond.$gte !== undefined) return (value ?? 0) >= cond.$gte;
      if (cond.$lt !== undefined) return (value ?? 0) < cond.$lt;
      if (cond.$in !== undefined)
        return cond.$in.some((v: any) => String(v) === String(value));
    }
    return String(value ?? '') === String(cond ?? '') || value === cond;
  };

  const findDoc = (filter: any) => {
    for (const p of products.values()) {
      if (Object.entries(filter).every(([k, v]) => fieldMatches(p, k, v))) {
        return p;
      }
    }
    return null;
  };

  const applyProductUpdate = (doc: any, update: any) => {
    for (const [key, val] of Object.entries(update.$inc ?? {})) {
      const parts = key.split('.');
      if (parts[0] === 'branchInventory') {
        doc.branchInventory = doc.branchInventory ?? {};
        doc.branchInventory[parts[1]] = doc.branchInventory[parts[1]] ?? {
          stock: 0,
        };
        doc.branchInventory[parts[1]][parts[2]] += val as number;
      } else {
        doc[key] = (doc[key] ?? 0) + (val as number);
      }
    }
    for (const [key, val] of Object.entries(update.$set ?? {})) {
      if (key.includes('.$[')) continue; // arrayFilter writes handled below
      const parts = key.split('.');
      if (parts[0] === 'branchInventory') {
        doc.branchInventory = doc.branchInventory ?? {};
        doc.branchInventory[parts[1]] = val;
      } else {
        doc[key] = val;
      }
    }
    if (update.$push?.stockMutations) {
      doc.stockMutations = [
        ...(doc.stockMutations ?? []),
        { ...update.$push.stockMutations },
      ];
    }
    if (update.$pull?.stockMutations) {
      const crit = update.$pull.stockMutations;
      doc.stockMutations = (doc.stockMutations ?? []).filter(
        (m: any) =>
          !(
            crit.audited === true &&
            m.audited === true &&
            (crit.mutationId === undefined || m.mutationId === crit.mutationId)
          ),
      );
    }
    return doc;
  };

  const toQuery = (resolve: () => any): any => {
    const q: any = {
      exec: async () => resolve(),
      then: (onFulfilled: any, onRejected: any) =>
        Promise.resolve(resolve()).then(onFulfilled, onRejected),
    };
    q.populate = () => q;
    q.sort = () => q;
    q.limit = () => q;
    q.lean = () => q;
    return q;
  };

  beforeEach(() => {
    products = new Map();
    stockAdjustments = [];
    domainAdjustments = [];
    auditFailures = 0;
    domainProjectionFailures = 0;

    productModel = jest.fn((doc: any) => ({
      ...doc,
      save: jest.fn(async () => {
        products.set(doc._id.toString(), doc);
        return doc;
      }),
    }));
    productModel.findOne = jest.fn((filter: any) =>
      toQuery(() => findDoc(filter)),
    );
    productModel.findById = jest.fn((id: any) =>
      toQuery(() => products.get(id.toString()) ?? null),
    );
    productModel.findOneAndUpdate = jest.fn((filter: any, update: any) =>
      toQuery(() => {
        const doc = findDoc(filter);
        return doc ? applyProductUpdate(doc, update) : null;
      }),
    );
    productModel.updateOne = jest.fn((filter: any, update: any, options: any) =>
      toQuery(() => {
        const doc = findDoc(filter);
        if (!doc) return { modifiedCount: 0 };
        if (update.$set?.['stockMutations.$[m].audited'] !== undefined) {
          const mid = options?.arrayFilters?.[0]?.['m.mutationId'];
          for (const m of doc.stockMutations ?? []) {
            if (m.mutationId === mid) m.audited = true;
          }
        }
        applyProductUpdate(doc, {
          $pull: update.$pull,
          $set: Object.fromEntries(
            Object.entries(update.$set ?? {}).filter(
              ([k]) => !k.includes('$['),
            ),
          ),
        });
        return { modifiedCount: 1 };
      }),
    );
    productModel.insertMany = jest.fn(async (docs: any[]) => {
      for (const d of docs) products.set(d._id.toString(), { ...d });
      return docs;
    });
    productModel.bulkWrite = jest.fn(async (ops: any[]) => {
      for (const op of ops) {
        if (op.updateOne) {
          const doc = findDoc(op.updateOne.filter);
          if (doc) applyProductUpdate(doc, op.updateOne.update);
        }
      }
      return { modifiedCount: ops.length };
    });
    productModel.updateMany = jest.fn(async (filter: any, update: any) => {
      let n = 0;
      for (const p of products.values()) {
        if (Object.entries(filter).every(([k, v]) => fieldMatches(p, k, v))) {
          applyProductUpdate(p, update);
          n++;
        }
      }
      return { modifiedCount: n };
    });
    productModel.countDocuments = jest.fn((filter: any) =>
      toQuery(
        () =>
          [...products.values()].filter((p) =>
            Object.entries(filter ?? {}).every(([k, v]) =>
              fieldMatches(p, k, v),
            ),
          ).length,
      ),
    );
    productModel.find = jest.fn(() => toQuery(() => [...products.values()]));

    adjustmentModel = jest.fn((doc: any) => ({
      ...doc,
      save: jest.fn(async () => {
        if (auditFailures > 0) {
          auditFailures -= 1;
          throw Object.assign(new Error('Injected audit failure'), {
            code: 500,
          });
        }
        const record = { _id: new Types.ObjectId(), ...doc };
        stockAdjustments.push(record);
        return record;
      }),
    }));
    adjustmentModel.findOne = jest.fn((filter: any) =>
      toQuery(
        () =>
          stockAdjustments.find(
            (a: any) =>
              a.mutationId === filter.mutationId &&
              (!filter.shopId ||
                a.shopId.toString() === filter.shopId.toString()),
          ) ?? null,
      ),
    );

    domainAdjustmentModel = jest.fn();
    domainAdjustmentModel.findOneAndUpdate = jest.fn(
      (filter: any, update: any, options: any) =>
        toQuery(() => {
          if (domainProjectionFailures > 0) {
            domainProjectionFailures -= 1;
            throw new Error('Injected domain-projection failure');
          }
          let existing = domainAdjustments.find(
            (a: any) =>
              a.mutationId === filter.mutationId &&
              a.shopId.toString() === filter.shopId.toString(),
          );
          if (!existing && options?.upsert) {
            existing = { _id: new Types.ObjectId(), ...update.$setOnInsert };
            domainAdjustments.push(existing);
          }
          return existing ?? null;
        }),
    );

    const categoryModel: any = {
      find: jest.fn(() => toQuery(() => [])),
      findOne: jest.fn(() => toQuery(() => null)),
      bulkWrite: jest.fn(async () => ({ modifiedCount: 0 })),
    };

    service = new InventoryService(
      productModel,
      categoryModel,
      adjustmentModel,
      {} as any,
      {} as any,
      { suggestCategory: jest.fn(() => null) } as any,
      {
        enforceLimit: jest.fn(async () => undefined),
        incrementUsage: jest.fn(async () => undefined),
        decrementUsage: jest.fn(async () => undefined),
      } as any,
      {
        deletePattern: jest.fn(),
        getOrSet: jest.fn((_k: string, f: any) => f()),
      } as any,
    );
    controller = new InventoryController(service, {} as any);
    adjustmentsService = new AdjustmentsService(
      domainAdjustmentModel,
      productModel,
      service,
    );
  });

  const product = (id: string = PID) => products.get(id);
  const mutationCount = (mutationId: string) =>
    stockAdjustments.filter((a: any) => a.mutationId === mutationId).length;

  // ==================== PRODUCT EDIT ====================

  describe('product edit stock authority', () => {
    it('rejects a stock field on routine product edit', async () => {
      seedProduct();
      await expect(
        service.updateProduct(SHOP, PID, { stock: 99 } as any),
      ).rejects.toThrow(BadRequestException);
      expect(product().stock).toBe(10);
      expect(stockAdjustments).toHaveLength(0);
    });

    it('metadata edit does not touch stock', async () => {
      seedProduct();
      const updated = await service.updateProduct(SHOP, PID, {
        name: 'Renamed',
        price: 120,
      });
      expect(updated.name).toBe('Renamed');
      expect(updated.price).toBe(120);
      expect(product().stock).toBe(10);
    });

    it('metadata edit concurrent with a sale preserves the decrement', async () => {
      seedProduct();
      await Promise.all([
        service.updateProduct(SHOP, PID, { name: 'Renamed' } as any),
        service.updateStock(SHOP, PID, -3, {
          mutationId: 'sale:ord-1:p1',
          reason: 'sale',
          actor: USER,
        }),
      ]);
      expect(product().name).toBe('Renamed');
      expect(product().stock).toBe(7);
      expect(mutationCount('sale:ord-1:p1')).toBe(1);
    });
  });

  // ==================== PRODUCT CREATE ====================

  describe('product creation initial stock', () => {
    it('initial stock carries a durable witness + one audit + real actor', async () => {
      const created = await service.createProduct(
        SHOP,
        { name: 'New', price: 10, stock: 20 },
        USER,
      );
      const id = created._id.toString();
      expect(product(id).stock).toBe(20);
      const adj = stockAdjustments.find(
        (a: any) => a.mutationId === `product-init:${id}`,
      );
      expect(adj).toBeDefined();
      expect(adj.quantityChange).toBe(20);
      expect(adj.adjustedBy.toString()).toBe(USER);
    });

    it('zero initial stock writes no witness', async () => {
      const created = await service.createProduct(
        SHOP,
        { name: 'New', price: 10, stock: 0 },
        USER,
      );
      expect(product(created._id.toString()).stockMutations).toBeUndefined();
      expect(stockAdjustments).toHaveLength(0);
    });

    it('audit projection failure leaves recoverable receipt, recovered exactly once', async () => {
      auditFailures = 1;
      const created = await service.createProduct(
        SHOP,
        { name: 'New', price: 10, stock: 15 },
        USER,
      );
      const id = created._id.toString();
      // Receipt retained, audit missing
      expect(
        product(id).stockMutations.some(
          (m: any) => m.mutationId === `product-init:${id}`,
        ),
      ).toBe(true);
      expect(mutationCount(`product-init:${id}`)).toBe(0);
      // P0-2 sweep recovers the projection exactly once
      await service.recoverUnprojectedStockMutations(SHOP);
      expect(mutationCount(`product-init:${id}`)).toBe(1);
      await service.recoverUnprojectedStockMutations(SHOP);
      expect(mutationCount(`product-init:${id}`)).toBe(1);
    });
  });

  // ==================== STARTUP NEGATIVE STOCK ====================

  describe('startup negative-stock scan', () => {
    it('detects but never mutates negative stock', async () => {
      seedProduct({ stock: -2 });
      const result = await service.detectNegativeStock();
      expect(result.detected).toBe(1);
      expect(product().stock).toBe(-2);
      expect(stockAdjustments).toHaveLength(0);
    });

    it('deprecated fixNegativeStock performs no mutation', async () => {
      seedProduct({ stock: -5 });
      const result = await service.fixNegativeStock();
      expect(result.fixed).toBe(0);
      expect(product().stock).toBe(-5);
    });
  });

  // ==================== GLOBAL MANUAL STOCK UPDATE ====================

  describe('POST /inventory/stock/update', () => {
    it('requires an idempotency key', async () => {
      seedProduct();
      // controller method is synchronous — the guard throws directly
      expect(() =>
        controller.updateStock({ productId: PID, quantityChange: 5 } as any, {
          shopId: SHOP,
          sub: USER,
        }),
      ).toThrow(BadRequestException);
      expect(product().stock).toBe(10);
    });

    it('same key retried ×5 applies once', async () => {
      seedProduct();
      const dto = {
        productId: PID,
        quantityChange: 5,
        idempotencyKey: 'k1',
        reason: 'correction',
      };
      const user = { shopId: SHOP, sub: USER };
      for (let i = 0; i < 5; i++) await controller.updateStock(dto, user);
      expect(product().stock).toBe(15);
      expect(mutationCount('manual:k1')).toBe(1);
    });

    it('concurrent same-key requests apply once', async () => {
      seedProduct();
      const dto = {
        productId: PID,
        quantityChange: 5,
        idempotencyKey: 'k1',
      };
      const user = { shopId: SHOP, sub: USER };
      await Promise.all([
        controller.updateStock(dto, user),
        controller.updateStock(dto, user),
      ]);
      expect(product().stock).toBe(15);
      expect(mutationCount('manual:k1')).toBe(1);
    });

    it('same key + different delta → 409', async () => {
      seedProduct();
      const user = { shopId: SHOP, sub: USER };
      await controller.updateStock(
        { productId: PID, quantityChange: 5, idempotencyKey: 'k1' },
        user,
      );
      await expect(
        controller.updateStock(
          { productId: PID, quantityChange: 9, idempotencyKey: 'k1' },
          user,
        ),
      ).rejects.toThrow(ConflictException);
      expect(product().stock).toBe(15);
    });

    it('same key + different product → 409', async () => {
      seedProduct();
      seedProduct({ _id: new Types.ObjectId(PID2), sku: 'T-002' });
      const user = { shopId: SHOP, sub: USER };
      await controller.updateStock(
        { productId: PID, quantityChange: 5, idempotencyKey: 'k1' },
        user,
      );
      await expect(
        controller.updateStock(
          { productId: PID2, quantityChange: 5, idempotencyKey: 'k1' },
          user,
        ),
      ).rejects.toThrow(ConflictException);
      expect(product(PID2).stock).toBe(10);
    });

    it('records the authenticated actor, not system', async () => {
      seedProduct();
      await controller.updateStock(
        { productId: PID, quantityChange: 5, idempotencyKey: 'k1' },
        { shopId: SHOP, sub: USER },
      );
      expect(stockAdjustments[0].adjustedBy.toString()).toBe(USER);
    });

    it('negative reduction below zero fails closed', async () => {
      seedProduct();
      await expect(
        controller.updateStock(
          { productId: PID, quantityChange: -20, idempotencyKey: 'k1' },
          { shopId: SHOP, sub: USER },
        ),
      ).rejects.toThrow(BadRequestException);
      expect(product().stock).toBe(10);
    });
  });

  // ==================== BRANCH MANUAL STOCK UPDATE ====================

  describe('POST /inventory/branch/:branchId/stock/update', () => {
    it('requires an idempotency key', async () => {
      seedProduct({ branchInventory: { [B1]: { stock: 6 } } });
      await expect(
        controller.updateBranchStock(
          B1,
          { productId: PID, quantityChange: -2 } as any,
          { shopId: SHOP, sub: USER },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('same key retried ×5 applies once', async () => {
      seedProduct({ branchInventory: { [B1]: { stock: 6 } } });
      const dto = {
        productId: PID,
        quantityChange: -2,
        idempotencyKey: 'bk1',
      };
      const user = { shopId: SHOP, sub: USER };
      for (let i = 0; i < 5; i++)
        await controller.updateBranchStock(B1, dto, user);
      expect(product().branchInventory[B1].stock).toBe(4);
      expect(mutationCount('manual-branch:bk1')).toBe(1);
    });

    it('same key + different delta → 409', async () => {
      seedProduct({ branchInventory: { [B1]: { stock: 6 } } });
      const user = { shopId: SHOP, sub: USER };
      await controller.updateBranchStock(
        B1,
        { productId: PID, quantityChange: -2, idempotencyKey: 'bk1' },
        user,
      );
      await expect(
        controller.updateBranchStock(
          B1,
          { productId: PID, quantityChange: -3, idempotencyKey: 'bk1' },
          user,
        ),
      ).rejects.toThrow(ConflictException);
      expect(product().branchInventory[B1].stock).toBe(4);
    });
  });

  // ==================== /inventory/adjustments ====================

  describe('POST /inventory/adjustments', () => {
    it('requires an idempotency key', async () => {
      seedProduct();
      await expect(
        controller.createStockAdjustment(
          { productId: PID, quantityChange: 3, reason: 'correction' } as any,
          { shopId: SHOP, sub: USER },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('replay applies once', async () => {
      seedProduct();
      const dto = {
        productId: PID,
        quantityChange: 3,
        reason: 'correction',
        idempotencyKey: 'adj-1',
      };
      const user = { shopId: SHOP, sub: USER };
      await controller.createStockAdjustment(dto, user);
      await controller.createStockAdjustment(dto, user);
      expect(product().stock).toBe(13);
      expect(mutationCount('manual:adj-1')).toBe(1);
    });
  });

  // ==================== /stock/adjustments (parallel surface) ====================

  describe('POST /stock/adjustments', () => {
    const dto = () => ({
      productId: PID,
      productName: 'Test Product',
      delta: 4,
      reason: 'damage' as const,
      idempotencyKey: 'sa-1',
    });

    it('requires an idempotency key', async () => {
      seedProduct();
      await expect(
        adjustmentsService.create(SHOP, USER, {
          ...dto(),
          idempotencyKey: undefined,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('replay applies stock once and writes one domain adjustment', async () => {
      seedProduct();
      await adjustmentsService.create(SHOP, USER, dto());
      await adjustmentsService.create(SHOP, USER, dto());
      expect(product().stock).toBe(14);
      expect(mutationCount('stock-adjustment:sa-1')).toBe(1);
      expect(domainAdjustments).toHaveLength(1);
    });

    it('crash after stock mutation + retry recovers exactly one projection', async () => {
      seedProduct();
      domainProjectionFailures = 1;
      await expect(
        adjustmentsService.create(SHOP, USER, dto()),
      ).rejects.toThrow();
      expect(product().stock).toBe(14); // physical mutation landed
      expect(domainAdjustments).toHaveLength(0); // projection did not
      const recovered = await adjustmentsService.create(SHOP, USER, dto());
      expect(product().stock).toBe(14); // no double stock
      expect(domainAdjustments).toHaveLength(1);
      expect(recovered.mutationId).toBe('stock-adjustment:sa-1');
    });

    it('same key + different delta → 409', async () => {
      seedProduct();
      await adjustmentsService.create(SHOP, USER, dto());
      await expect(
        adjustmentsService.create(SHOP, USER, { ...dto(), delta: 7 }),
      ).rejects.toThrow(ConflictException);
      expect(product().stock).toBe(14);
    });
  });

  // ==================== BRANCH PRODUCT INITIALIZATION ====================

  describe('addProductToBranch', () => {
    it('initializes once with a witnessed mutation', async () => {
      seedProduct();
      await service.addProductToBranch(SHOP, PID, B1, 8, USER);
      expect(product().branchInventory[B1].stock).toBe(8);
      expect(product().stock).toBe(10); // global untouched
      expect(mutationCount(`branch-init:${PID}:${B1}`)).toBe(1);
    });

    it('retry applies nothing twice', async () => {
      seedProduct();
      await service.addProductToBranch(SHOP, PID, B1, 8, USER);
      await service.addProductToBranch(SHOP, PID, B1, 8, USER);
      await service.addProductToBranch(SHOP, PID, B1, 8, USER);
      expect(product().branchInventory[B1].stock).toBe(8);
      expect(mutationCount(`branch-init:${PID}:${B1}`)).toBe(1);
    });

    it('concurrent initialization lands once', async () => {
      seedProduct();
      await Promise.all([
        service.addProductToBranch(SHOP, PID, B1, 8, USER),
        service.addProductToBranch(SHOP, PID, B1, 8, USER),
      ]);
      expect(product().branchInventory[B1].stock).toBe(8);
      expect(mutationCount(`branch-init:${PID}:${B1}`)).toBe(1);
    });

    it('refuses to overwrite an existing branch entry', async () => {
      seedProduct({ branchInventory: { [B1]: { stock: 3 } } });
      await expect(
        service.addProductToBranch(SHOP, PID, B1, 8, USER),
      ).rejects.toThrow(ConflictException);
      expect(product().branchInventory[B1].stock).toBe(3);
    });

    it('same identity with different quantity → 409', async () => {
      seedProduct();
      await service.addProductToBranch(SHOP, PID, B1, 8, USER);
      // receipt pulled after audit projection → audit witness carries the check
      await expect(
        service.addProductToBranch(SHOP, PID, B1, 12, USER),
      ).rejects.toThrow(ConflictException);
      expect(product().branchInventory[B1].stock).toBe(8);
    });

    it('does not overwrite a concurrent branch mutation', async () => {
      seedProduct();
      await Promise.all([
        service.addProductToBranch(SHOP, PID, B1, 8, USER),
        service.addProductToBranch(SHOP, PID, B2, 5, USER),
      ]);
      expect(product().branchInventory[B1].stock).toBe(8);
      expect(product().branchInventory[B2].stock).toBe(5);
    });
  });

  // ==================== IMPORT ====================

  describe('products import', () => {
    it('new product initial stock is witnessed + audited with real actor', async () => {
      const result = await service.importProducts(
        SHOP,
        [{ name: 'Imported', sku: 'IMP-1', price: 10, stock: 25 }],
        {},
        USER,
      );
      expect(result.imported).toBe(1);
      const doc = [...products.values()].find((p: any) => p.sku === 'IMP-1');
      expect(doc.stock).toBe(25);
      const adj = stockAdjustments.find((a: any) =>
        String(a.mutationId).startsWith('product-init:'),
      );
      expect(adj).toBeDefined();
      expect(adj.quantityChange).toBe(25);
      expect(adj.adjustedBy.toString()).toBe(USER);
    });

    it('retry of the same import does not double stock', async () => {
      const rows = [
        { name: 'Imported', sku: 'IMP-1', price: 10, stock: 25 } as any,
      ];
      await service.importProducts(SHOP, rows, {}, USER);
      const doc = [...products.values()].find((p: any) => p.sku === 'IMP-1');
      const second = await service.importProducts(SHOP, rows, {}, USER);
      expect(second.imported).toBe(0);
      expect(products.get(doc._id.toString()).stock).toBe(25);
      expect(
        stockAdjustments.filter((a: any) =>
          String(a.mutationId).startsWith('product-init:'),
        ),
      ).toHaveLength(1);
    });

    it('updateExisting never overwrites stock', async () => {
      seedProduct({ sku: 'IMP-1', stock: 10 });
      const result = await service.importProducts(
        SHOP,
        [{ name: 'Imported', sku: 'IMP-1', price: 99, stock: 500 }],
        { updateExisting: true },
        USER,
      );
      expect(product().stock).toBe(10);
      expect(result.errors.some((e: string) => e.includes('stock'))).toBe(true);
    });
  });
});
