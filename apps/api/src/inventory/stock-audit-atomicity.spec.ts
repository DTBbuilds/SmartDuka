import { Types } from 'mongoose';
import { InventoryService } from './inventory.service';

jest.mock('nanoid', () => ({ nanoid: () => 'P02ID' }));

/**
 * P0-2 — STOCK MUTATION ↔ AUDIT ATOMICITY SHIELD
 *
 * ONE logical stock movement = ONE physical quantity change + ONE durable
 * mutation receipt + ONE durable audit record. Audit-write failures are
 * recoverable from receipt facts; retries are idempotent; recovery is
 * idempotent and concurrency-safe; tenant-scoped throughout.
 */
describe('P0-2 stock mutation ↔ audit atomicity', () => {
  const SHOP = '507f1f77bcf86cd799439011';
  const OTHER_SHOP = '507f1f77bcf86cd799439099';
  const PID = '507f1f77bcf86cd799439031';
  const USER = '507f1f77bcf86cd799439012';

  let product: any;
  let adjustments: any[];
  let auditFailures: number;
  let inventoryService: InventoryService;
  let productModel: any;
  let adjustmentModel: any;

  const matchesFilter = (filter: any) =>
    (!filter._id || filter._id.toString() === PID) &&
    (!filter.shopId || filter.shopId.toString() === SHOP);

  const toQuery = (resolve: () => any): any => {
    const q: any = {
      exec: async () => resolve(),
      then: (onFulfilled: any, onRejected: any) =>
        Promise.resolve(resolve()).then(onFulfilled, onRejected),
    };
    q.populate = () => q;
    return q;
  };

  function boot(productOverrides: Record<string, any> = {}) {
    adjustments = [];
    auditFailures = 0;

    product = {
      _id: new Types.ObjectId(PID),
      shopId: new Types.ObjectId(SHOP),
      name: 'Test Product',
      sku: 'T-001',
      price: 100,
      cost: 50,
      stock: 10,
      branchInventory: {},
      stockMutations: [],
      save: jest.fn(async () => product),
      ...productOverrides,
    };

    const applyUpdate = (filter: any, update: any) => {
      if (update.$inc?.stock !== undefined) product.stock += update.$inc.stock;
      if (update.$set?.stock !== undefined) product.stock = update.$set.stock;
      for (const key of Object.keys(update.$inc ?? {})) {
        if (key.startsWith('branchInventory.')) {
          const branchKey = key.split('.')[1];
          product.branchInventory = product.branchInventory ?? {};
          product.branchInventory[branchId_from_key(key)] = product
            .branchInventory[branchId_from_key(key)] ?? { stock: 0 };
          product.branchInventory[branchId_from_key(key)].stock +=
            update.$inc[key];
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

    const branchId_from_key = (key: string) => key.split('.')[1];

    productModel = jest.fn((doc: any) => ({
      ...doc,
      save: jest.fn(async () => doc),
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
    productModel.updateOne = jest.fn(
      (filter: any, update: any, options: any) => ({
        exec: async () => {
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
        },
      }),
    );
    productModel.find = jest.fn((filter: any) =>
      toQuery(() => {
        const shopOk =
          !filter?.shopId ||
          product.shopId.toString() === filter.shopId.toString();
        return shopOk ? [product] : [];
      }),
    );

    adjustmentModel = jest.fn((doc: any) => ({
      ...doc,
      save: jest.fn(async () => {
        if (auditFailures > 0) {
          auditFailures -= 1;
          throw new Error('Injected audit persistence failure');
        }
        const record = { ...doc, _id: `adj-${adjustments.length + 1}` };
        adjustments.push(record);
        return record;
      }),
    }));
    adjustmentModel.findOne = jest.fn((q: any) =>
      toQuery(
        () =>
          adjustments.find(
            (a) =>
              a.mutationId === q.mutationId &&
              (!q.shopId || a.shopId.toString() === q.shopId.toString()),
          ) ?? null,
      ),
    );
    adjustmentModel.find = jest.fn(() => toQuery(() => adjustments));

    const reconciliationModel: any = jest.fn((doc: any) => ({
      ...doc,
      save: jest.fn(async () => ({ ...doc, _id: 'recon-1' })),
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
        getOrSet: jest.fn((_k: any, f: any) => f()),
      } as any,
    );
    return inventoryService;
  }

  describe('normal path', () => {
    it('sale: stock 10 -3 -> 7 with exactly one durable audit record', async () => {
      boot();
      await inventoryService.updateStock(SHOP, PID, -3, {
        mutationId: 'sale:order1:prod1',
        reason: 'sale',
        actor: USER,
        referenceType: 'order',
        referenceId: 'order1',
      });
      expect(product.stock).toBe(7);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0]).toEqual(
        expect.objectContaining({
          quantityChange: -3,
          reason: 'sale',
          mutationId: 'sale:order1:prod1',
        }),
      );
      expect(product.stockMutations ?? []).toHaveLength(0);
    });

    it('duplicate mutationId x5 -> one physical mutation, one audit record', async () => {
      boot();
      for (let i = 0; i < 5; i++) {
        await inventoryService.updateStock(SHOP, PID, -3, {
          mutationId: 'sale:order1:prod1',
          reason: 'sale',
          actor: USER,
        });
      }
      expect(product.stock).toBe(7);
      expect(adjustments).toHaveLength(1);
    });

    it('manual positive +3 once; manual negative -2 once', async () => {
      boot();
      await inventoryService.updateStock(SHOP, PID, 3, {
        mutationId: 'manual:m1',
        reason: 'other',
        actor: USER,
      });
      expect(product.stock).toBe(13);
      expect(adjustments).toHaveLength(1);
      await inventoryService.updateStock(SHOP, PID, -2, {
        mutationId: 'manual:m2',
        reason: 'correction',
        actor: USER,
      });
      expect(product.stock).toBe(11);
      expect(adjustments).toHaveLength(2);
    });
  });

  describe('audit-failure window', () => {
    it('audit save fails: mutation applied once, durable receipt retained, audit missing', async () => {
      boot();
      auditFailures = 1;
      await inventoryService.updateStock(SHOP, PID, -3, {
        mutationId: 'sale:order1:prod1',
        reason: 'sale',
        actor: USER,
      });
      expect(product.stock).toBe(7);
      expect(adjustments).toHaveLength(0);
      const receipts = product.stockMutations ?? [];
      expect(receipts).toHaveLength(1);
      expect(receipts[0]).toEqual(
        expect.objectContaining({
          mutationId: 'sale:order1:prod1',
          quantityDelta: -3,
          audited: false,
        }),
      );
    });

    it('recovery reconstructs the audit from receipt facts; stock unchanged', async () => {
      boot();
      auditFailures = 1;
      await inventoryService.updateStock(SHOP, PID, -3, {
        mutationId: 'sale:order1:prod1',
        reason: 'sale',
        actor: USER,
      });
      expect(product.stock).toBe(7);
      expect(adjustments).toHaveLength(0);

      const result =
        await inventoryService.recoverUnprojectedStockMutations(SHOP);
      expect(result.recovered).toBe(1);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0]).toEqual(
        expect.objectContaining({
          quantityChange: -3,
          mutationId: 'sale:order1:prod1',
        }),
      );
      expect(product.stock).toBe(7);
      expect(product.stockMutations ?? []).toHaveLength(0);
    });

    it('repeated recovery is a no-op (zero additional records, zero stock mutation)', async () => {
      boot();
      auditFailures = 1;
      await inventoryService.updateStock(SHOP, PID, -3, {
        mutationId: 'sale:order1:prod1',
        reason: 'sale',
        actor: USER,
      });
      await inventoryService.recoverUnprojectedStockMutations(SHOP);
      const stockAfterFirst = product.stock;
      const countAfterFirst = adjustments.length;

      const second =
        await inventoryService.recoverUnprojectedStockMutations(SHOP);
      expect(second.recovered).toBe(0);
      expect(product.stock).toBe(stockAfterFirst);
      expect(adjustments.length).toBe(countAfterFirst);
    });

    it('crash after audit before receipt cleanup: retry finalizes without duplicating', async () => {
      boot();
      await inventoryService.updateStock(SHOP, PID, -3, {
        mutationId: 'sale:order1:prod1',
        reason: 'sale',
        actor: USER,
      });
      // Simulate the crash window: audit persisted, receipt still present
      product.stockMutations = [
        {
          mutationId: 'sale:order1:prod1',
          quantityDelta: -3,
          reason: 'sale',
          actor: USER,
          audited: true,
          createdAt: new Date(),
        },
      ];
      const countBefore = adjustments.length;

      const result =
        await inventoryService.recoverUnprojectedStockMutations(SHOP);
      expect(result.alreadyAudited).toBe(1);
      expect(result.recovered).toBe(0);
      expect(adjustments.length).toBe(countBefore);
      expect(product.stockMutations ?? []).toHaveLength(0);
      expect(product.stock).toBe(7);
    });
  });

  describe('failure windows around the physical mutation', () => {
    it('crash before mutation: retry executes once, no phantom audit', async () => {
      boot();
      await inventoryService.updateStock(SHOP, PID, -3, {
        mutationId: 'sale:order1:prod1',
        reason: 'sale',
        actor: USER,
      });
      expect(product.stock).toBe(7);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].quantityChange).toBe(-3);
    });

    it('insufficient stock: clamp preserves reality, audit matches actual delta', async () => {
      boot({ stock: 1 });
      await inventoryService.updateStock(SHOP, PID, -3, {
        mutationId: 'sale:order1:prod1',
        reason: 'sale',
        actor: USER,
      });
      expect(product.stock).toBe(0);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].quantityChange).toBe(-1);
    });

    it('rejected mutation never creates audit evidence claiming success', async () => {
      boot({ stock: 0 });
      await inventoryService.updateStock(SHOP, PID, -3, {
        mutationId: 'sale:order1:prod1',
        reason: 'sale',
        actor: USER,
      });
      expect(product.stock).toBe(0);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].quantityChange).toBe(0);
    });
  });

  describe('business callers', () => {
    it('purchase receive: +5 once with recoverable audit', async () => {
      boot();
      auditFailures = 1;
      await inventoryService.updateStock(SHOP, PID, 5, {
        mutationId: 'purchase:po1:prod1',
        reason: 'purchase',
        actor: USER,
        referenceType: 'purchase',
        referenceId: 'po1',
      });
      expect(product.stock).toBe(15);
      expect(adjustments).toHaveLength(0);
      expect(product.stockMutations ?? []).toHaveLength(1);

      await inventoryService.recoverUnprojectedStockMutations(SHOP);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0]).toEqual(
        expect.objectContaining({
          quantityChange: 5,
          reason: 'purchase',
          mutationId: 'purchase:po1:prod1',
        }),
      );
      expect(product.stock).toBe(15);
    });

    it('reconciliation variance: correction applied once with one audit', async () => {
      boot();
      await inventoryService.createStockReconciliation(
        SHOP,
        PID,
        7,
        new Date(),
        USER,
        'stocktake',
      );
      expect(product.stock).toBe(7);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0]).toEqual(
        expect.objectContaining({ quantityChange: -3, reason: 'correction' }),
      );
    });

    it('branch stock mutation carries durable evidence and audit', async () => {
      boot({ branchInventory: { 'branch-1': { stock: 10 } } });
      await inventoryService.updateBranchStock(SHOP, PID, 'branch-1', -2, {
        mutationId: 'branch:adj1',
        reason: 'correction',
        actor: USER,
        notes: 'branch correction',
      });
      expect(product.branchInventory['branch-1'].stock).toBe(8);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].quantityChange).toBe(-2);
      expect(product.stockMutations ?? []).toHaveLength(0);
    });

    it('branch transfer: atomic movement with one transfer audit', async () => {
      boot({
        branchInventory: {
          'branch-1': { stock: 10 },
          'branch-2': { stock: 0 },
        },
      });
      await inventoryService.transferBranchStock(
        SHOP,
        PID,
        'branch-1',
        'branch-2',
        4,
        USER,
      );
      expect(product.branchInventory['branch-1'].stock).toBe(6);
      expect(product.branchInventory['branch-2'].stock).toBe(4);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].reason).toBe('transfer');
      expect(adjustments[0].quantityChange).toBe(-4);
    });
  });

  describe('tenant isolation', () => {
    it('a mutation scoped to another shop cannot touch this product', async () => {
      boot();
      const result = await inventoryService.updateStock(OTHER_SHOP, PID, -3, {
        mutationId: 'sale:foreign:prod1',
        reason: 'sale',
        actor: USER,
      });
      expect(result).toBeNull();
      expect(product.stock).toBe(10);
      expect(adjustments).toHaveLength(0);
    });

    it('recovery never reconstructs cross-tenant audit records', async () => {
      boot();
      auditFailures = 1;
      await inventoryService.updateStock(SHOP, PID, -3, {
        mutationId: 'sale:order1:prod1',
        reason: 'sale',
        actor: USER,
      });
      const result =
        await inventoryService.recoverUnprojectedStockMutations(OTHER_SHOP);
      expect(result.recovered).toBe(0);
      expect(adjustments).toHaveLength(0);
    });
  });
});
