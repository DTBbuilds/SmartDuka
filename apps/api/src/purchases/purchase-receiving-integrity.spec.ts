import { Types } from 'mongoose';
import { InventoryService } from '../inventory/inventory.service';
import { PurchasesService } from './purchases.service';

jest.mock('nanoid', () => ({ nanoid: () => 'P07ID' }));

/**
 * P0-7 — PURCHASE RECEIVING INTEGRITY SHIELD
 *
 * ONE legitimate receipt event = ONE purchase state change + ONE stock
 * effect per line + ONE durable stock audit per line. Retries and races
 * converge; cancel/delete after receipt is rejected; tenant-scoped.
 */
describe('P0-7 purchase receiving integrity', () => {
  const SHOP = '507f1f77bcf86cd799439011';
  const OTHER_SHOP = '507f1f77bcf86cd799439099';
  const USER = '507f1f77bcf86cd799439012';
  const PID_A = '507f1f77bcf86cd799439031';
  const PID_B = '507f1f77bcf86cd799439032';
  const PO_ID = '507f1f77bcf86cd799439041';
  const BRANCH = '507f1f77bcf86cd799439051';

  let products: Map<string, any>;
  let adjustments: any[];
  let purchase: any;
  let deletedPurchases: any[];
  let auditFailures: number;
  let inventoryService: InventoryService;
  let purchasesService: PurchasesService;
  let purchaseModel: any;
  let productModel: any;
  let adjustmentModel: any;

  const toQuery = (resolve: () => any): any => {
    const q: any = {
      exec: async () => resolve(),
      then: (onFulfilled: any, onRejected: any) =>
        Promise.resolve(resolve()).then(onFulfilled, onRejected),
    };
    q.populate = () => q;
    return q;
  };

  const productFor = (id: any) => products.get(id?.toString());

  function boot(
    options: {
      items?: Array<{ productId: string; quantity: number }>;
      branchId?: string;
      stockA?: number;
      stockB?: number;
      branchStockA?: number;
      purchaseStatus?: string;
    } = {},
  ) {
    const {
      items = [{ productId: PID_A, quantity: 5 }],
      branchId,
      stockA = 10,
      stockB = 20,
      branchStockA,
      purchaseStatus = 'pending',
    } = options;

    adjustments = [];
    deletedPurchases = [];
    auditFailures = 0;

    products = new Map();
    products.set(PID_A, {
      _id: new Types.ObjectId(PID_A),
      shopId: new Types.ObjectId(SHOP),
      name: 'Product A',
      sku: 'A-001',
      price: 100,
      cost: 50,
      stock: stockA,
      branchInventory:
        branchStockA !== undefined ? { [BRANCH]: { stock: branchStockA } } : {},
      stockMutations: [],
      save: jest.fn(async () => products.get(PID_A)),
    });
    products.set(PID_B, {
      _id: new Types.ObjectId(PID_B),
      shopId: new Types.ObjectId(SHOP),
      name: 'Product B',
      sku: 'B-001',
      price: 40,
      cost: 20,
      stock: stockB,
      branchInventory: {},
      stockMutations: [],
      save: jest.fn(async () => products.get(PID_B)),
    });

    purchase = {
      _id: new Types.ObjectId(PO_ID),
      shopId: new Types.ObjectId(SHOP),
      purchaseNumber: 'PO-TEST-1',
      supplierId: new Types.ObjectId(),
      branchId: branchId ? new Types.ObjectId(branchId) : undefined,
      items: items.map((i) => ({
        productId: new Types.ObjectId(i.productId),
        productName: productFor(i.productId)?.name ?? 'Item',
        quantity: i.quantity,
        unitCost: 10,
        totalCost: i.quantity * 10,
      })),
      totalCost: items.reduce((s, i) => s + i.quantity * 10, 0),
      status: purchaseStatus,
      save: jest.fn(async () => purchase),
    };

    const applyUpdate = (prod: any, filter: any, update: any) => {
      const neId = filter['stockMutations.mutationId']?.$ne;
      if (
        neId &&
        (prod.stockMutations ?? []).some((m: any) => m.mutationId === neId)
      ) {
        return null;
      }
      for (const key of Object.keys(filter ?? {})) {
        if (key.startsWith('branchInventory.') && key.endsWith('.stock')) {
          const bk = key.split('.')[1];
          const min = filter[key]?.$gte ?? 0;
          const cur = prod.branchInventory?.[bk]?.stock;
          if (cur === undefined || cur < min) return null;
        }
      }
      if (update.$inc?.stock !== undefined) prod.stock += update.$inc.stock;
      if (update.$set?.stock !== undefined) prod.stock = update.$set.stock;
      for (const key of Object.keys(update.$inc ?? {})) {
        if (key.startsWith('branchInventory.')) {
          const bk = key.split('.')[1];
          prod.branchInventory = prod.branchInventory ?? {};
          prod.branchInventory[bk] = prod.branchInventory[bk] ?? { stock: 0 };
          prod.branchInventory[bk].stock += update.$inc[key];
        }
      }
      if (update.$push?.stockMutations) {
        prod.stockMutations = [
          ...(prod.stockMutations ?? []),
          { ...update.$push.stockMutations },
        ];
      }
      return prod;
    };

    productModel = jest.fn((doc: any) => ({
      ...doc,
      save: jest.fn(async () => doc),
    }));
    productModel.findOne = jest.fn((filter: any) =>
      toQuery(() => {
        const prod = productFor(filter?._id);
        if (!prod) return null;
        if (
          filter.shopId &&
          prod.shopId.toString() !== filter.shopId.toString()
        )
          return null;
        return prod;
      }),
    );
    productModel.findById = jest.fn((id: any) =>
      toQuery(() => productFor(id) ?? null),
    );
    productModel.findOneAndUpdate = jest.fn((filter: any, update: any) =>
      toQuery(() => {
        const prod = productFor(filter?._id);
        if (!prod) return null;
        if (
          filter.shopId &&
          prod.shopId.toString() !== filter.shopId.toString()
        )
          return null;
        return applyUpdate(prod, filter, update);
      }),
    );
    productModel.updateOne = jest.fn((filter: any, update: any, options: any) =>
      toQuery(() => {
        const prod = productFor(filter?._id);
        if (!prod) return { modifiedCount: 0 };
        if (update.$set?.['stockMutations.$[m].audited'] !== undefined) {
          const mid = options?.arrayFilters?.[0]?.['m.mutationId'];
          for (const m of prod.stockMutations ?? []) {
            if (m.mutationId === mid) m.audited = true;
          }
        }
        if (update.$pull?.stockMutations) {
          const crit = update.$pull.stockMutations;
          prod.stockMutations = (prod.stockMutations ?? []).filter(
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
    productModel.find = jest.fn((filter: any) =>
      toQuery(() =>
        [...products.values()].filter(
          (p) =>
            !filter?.shopId || p.shopId.toString() === filter.shopId.toString(),
        ),
      ),
    );

    adjustmentModel = jest.fn((doc: any) => ({
      ...doc,
      save: jest.fn(async () => {
        if (auditFailures > 0) {
          auditFailures -= 1;
          throw new Error('Injected audit persistence failure');
        }
        // Faithful to the real unique sparse (shopId, mutationId) witness
        // index: a concurrent duplicate projection is dup-key rejected —
        // projectStockMutation catches it and leaves the durable receipt.
        if (
          doc.mutationId &&
          adjustments.some(
            (a) =>
              a.mutationId === doc.mutationId &&
              a.shopId.toString() === doc.shopId.toString(),
          )
        ) {
          const dup: any = new Error('E11000 duplicate key error');
          dup.code = 11000;
          throw dup;
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

    purchaseModel = jest.fn((doc: any) => ({
      ...doc,
      save: jest.fn(async () => doc),
    }));
    // Mongo `field: null` matches absent-or-null; a string value requires
    // exact equality. Evaluates the P0-7A receiving-claim filters.
    const claimMismatch = (f: any) => {
      if (f.receivingClaimId === undefined) return false;
      if (f.receivingClaimId === null) return purchase.receivingClaimId != null;
      return purchase.receivingClaimId !== f.receivingClaimId;
    };
    purchaseModel.findOne = jest.fn((filter: any) =>
      toQuery(() => {
        if (filter._id && filter._id.toString() !== purchase._id.toString())
          return null;
        if (deletedPurchases.includes(purchase._id)) return null;
        if (
          filter.shopId &&
          purchase.shopId.toString() !== filter.shopId.toString()
        )
          return null;
        if (filter.status !== undefined && purchase.status !== filter.status)
          return null;
        if (claimMismatch(filter)) return null;
        return purchase;
      }),
    );
    purchaseModel.findOneAndUpdate = jest.fn((filter: any, update: any) =>
      toQuery(() => {
        if (deletedPurchases.includes(purchase._id)) return null;
        if (filter._id && filter._id.toString() !== purchase._id.toString())
          return null;
        if (
          filter.shopId &&
          purchase.shopId.toString() !== filter.shopId.toString()
        )
          return null;
        if (filter.status !== undefined && purchase.status !== filter.status)
          return null;
        if (claimMismatch(filter)) return null;
        Object.assign(purchase, update.$set ?? update);
        return purchase;
      }),
    );
    purchaseModel.updateOne = jest.fn((filter: any, update: any) =>
      toQuery(() => {
        Object.assign(purchase, update.$set ?? update);
        return { modifiedCount: 1 };
      }),
    );
    purchaseModel.deleteOne = jest.fn((filter: any) =>
      toQuery(() => {
        if (filter._id.toString() !== purchase._id.toString())
          return { deletedCount: 0 };
        if (
          filter.shopId &&
          purchase.shopId.toString() !== filter.shopId.toString()
        )
          return { deletedCount: 0 };
        // Atomic non-received + no-active-claim guard mirrors the service's
        // deleteOne filter.
        if (filter.status?.$ne === 'received' && purchase.status === 'received')
          return { deletedCount: 0 };
        if (
          filter.receivingClaimId === null &&
          purchase.receivingClaimId != null
        )
          return { deletedCount: 0 };
        deletedPurchases.push(purchase._id);
        return { deletedCount: 1 };
      }),
    );

    inventoryService = new InventoryService(
      productModel,
      {} as any,
      adjustmentModel,
      jest.fn((doc: any) => ({ ...doc, save: async () => doc })) as any,
      {} as any,
      {} as any,
      {} as any,
      {
        deletePattern: jest.fn(),
        getOrSet: jest.fn((_k: any, f: any) => f()),
      } as any,
    );

    purchasesService = new PurchasesService(purchaseModel, inventoryService);
  }

  const receive = (extra: Record<string, any> = {}) =>
    purchasesService.update(
      PO_ID,
      SHOP,
      { status: 'received', ...extra },
      USER,
    );

  describe('full receive', () => {
    it('first receive: stock 10 +5 -> 15, status received, one audit', async () => {
      boot();
      const result = await receive();
      expect(result.status).toBe('received');
      expect(products.get(PID_A).stock).toBe(15);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0]).toEqual(
        expect.objectContaining({
          quantityChange: 5,
          reason: 'purchase',
          mutationId: `purchase:${PO_ID}:${PID_A}`,
        }),
      );
    });

    it('sequential repeat receive x5: stock remains 15, one audit', async () => {
      boot();
      await receive();
      for (let i = 0; i < 4; i++) await receive();
      expect(products.get(PID_A).stock).toBe(15);
      expect(adjustments).toHaveLength(1);
    });

    it('concurrent receive: exactly one inventory effect', async () => {
      boot();
      const results = await Promise.allSettled([receive(), receive()]);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      expect(fulfilled.length).toBeGreaterThanOrEqual(1);
      expect(products.get(PID_A).stock).toBe(15);
      expect(adjustments).toHaveLength(1);
      expect(purchase.status).toBe('received');
    });

    it('different purchases apply independently', async () => {
      boot();
      await receive();
      const second: any = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439042'),
        shopId: new Types.ObjectId(SHOP),
        purchaseNumber: 'PO-TEST-2',
        items: [
          {
            productId: new Types.ObjectId(PID_A),
            productName: 'Product A',
            quantity: 3,
            unitCost: 10,
            totalCost: 30,
          },
        ],
        status: 'pending',
        totalCost: 30,
      };
      // Point the model at the second purchase for this call.
      const original = purchase;
      purchase = second;
      await purchasesService.update(
        second._id.toString(),
        SHOP,
        { status: 'received' },
        USER,
      );
      expect(products.get(PID_A).stock).toBe(18);
      expect(adjustments).toHaveLength(2);
      purchase = original;
    });
  });

  describe('P0-2 durability interaction', () => {
    it('audit projection failure: stock once, durable receipt retained, retry does not re-mutate', async () => {
      boot();
      auditFailures = 1;
      await receive();
      expect(products.get(PID_A).stock).toBe(15);
      expect(adjustments).toHaveLength(0);
      expect(products.get(PID_A).stockMutations).toHaveLength(1);

      await inventoryService.recoverUnprojectedStockMutations(SHOP);
      expect(adjustments).toHaveLength(1);
      expect(products.get(PID_A).stock).toBe(15);

      await receive();
      expect(products.get(PID_A).stock).toBe(15);
      expect(adjustments).toHaveLength(1);
    });

    it('post-cleanup retry: receive again after receipt pull leaves stock unchanged', async () => {
      boot();
      await receive();
      expect(products.get(PID_A).stockMutations ?? []).toHaveLength(0);
      for (let i = 0; i < 3; i++) await receive();
      expect(products.get(PID_A).stock).toBe(15);
      expect(adjustments).toHaveLength(1);
    });

    it('stock failure after claim: purchase stays pending+claim, retry converges', async () => {
      boot();
      const failing = jest
        .spyOn(inventoryService, 'updateStock')
        .mockRejectedValueOnce(new Error('DB down'));
      await expect(receive()).rejects.toThrow('inventory errors');
      // P0-7A: a stock failure must NEVER leave a false 'received' — the
      // durable claim stays resumable while status remains 'pending'.
      expect(purchase.status).toBe('pending');
      expect(purchase.receivingClaimId).toBe(`purchase:${PO_ID}:receive`);
      expect(products.get(PID_A).stock).toBe(10);
      expect(purchase.notes).toContain('INVENTORY SYNC WARNING');

      failing.mockRestore();
      const retried = await receive();
      expect(retried.status).toBe('received');
      expect(products.get(PID_A).stock).toBe(15);
      expect(adjustments).toHaveLength(1);
    });
  });

  describe('P0-7A crash safety — claim / converge / finalize', () => {
    const CLAIM_ID = `purchase:${PO_ID}:receive`;
    const seedClaim = () => {
      // Persisted state a hard crash leaves behind: claim written, status
      // still 'pending'.
      purchase.receivingClaimId = CLAIM_ID;
      purchase.receivingStartedAt = new Date();
    };
    const seedReceipt = (
      pid: string,
      mutationId: string,
      qty: number,
      branchKey?: string,
    ) => {
      const p = products.get(pid);
      if (branchKey) {
        p.branchInventory[branchKey].stock += qty;
      } else {
        p.stock += qty;
      }
      p.stockMutations = [
        ...(p.stockMutations ?? []),
        {
          mutationId,
          quantityDelta: qty,
          stockAfter: p.stock,
          reason: 'purchase',
          actor: USER,
          referenceType: 'purchase',
          referenceId: PO_ID,
          appliedAt: new Date(),
          audited: false,
        },
      ];
    };

    it('branch crash/resume: claim + branch stock applied, crash before finalize → retry finalizes once', async () => {
      boot({ branchId: BRANCH, branchStockA: 10 });
      purchase.receivingClaimId = `purchase:${PO_ID}:receive`;
      purchase.receivingStartedAt = new Date();
      seedReceipt(PID_A, `purchase:${PO_ID}:${PID_A}`, 5, BRANCH);
      expect(purchase.status).toBe('pending');
      expect(products.get(PID_A).branchInventory[BRANCH].stock).toBe(15);

      const retried = await receive();
      expect(retried.status).toBe('received');
      // Branch mutation witness → no second +5; global stock untouched.
      expect(products.get(PID_A).branchInventory[BRANCH].stock).toBe(15);
      expect(products.get(PID_A).stock).toBe(10);
    });

    it('crash after claim, before any stock: pending+claim persisted, retry completes once', async () => {
      boot();
      seedClaim();
      expect(purchase.status).toBe('pending');
      expect(products.get(PID_A).stock).toBe(10);

      const retried = await receive();
      expect(retried.status).toBe('received');
      expect(products.get(PID_A).stock).toBe(15);
      expect(adjustments).toHaveLength(1);
    });

    it('crash after line A, before line B: A deduped, B applied, then received', async () => {
      boot({
        items: [
          { productId: PID_A, quantity: 5 },
          { productId: PID_B, quantity: 2 },
        ],
      });
      seedClaim();
      seedReceipt(PID_A, `purchase:${PO_ID}:${PID_A}`, 5);
      expect(purchase.status).toBe('pending');
      expect(products.get(PID_A).stock).toBe(15);
      expect(products.get(PID_B).stock).toBe(20);

      const retried = await receive();
      expect(retried.status).toBe('received');
      expect(products.get(PID_A).stock).toBe(15); // no re-apply
      expect(products.get(PID_B).stock).toBe(22);
      // A's audit is recovered from its durable receipt, not re-mutated.
      await inventoryService.recoverUnprojectedStockMutations(SHOP);
      expect(adjustments).toHaveLength(2);
      expect(products.get(PID_A).stock).toBe(15);
    });

    it('crash after all stock, before finalize: retry applies zero stock, finalizes', async () => {
      boot({
        items: [
          { productId: PID_A, quantity: 5 },
          { productId: PID_B, quantity: 2 },
        ],
      });
      seedClaim();
      seedReceipt(PID_A, `purchase:${PO_ID}:${PID_A}`, 5);
      seedReceipt(PID_B, `purchase:${PO_ID}:${PID_B}`, 2);
      expect(purchase.status).toBe('pending');

      const retried = await receive();
      expect(retried.status).toBe('received');
      expect(products.get(PID_A).stock).toBe(15);
      expect(products.get(PID_B).stock).toBe(22);
    });

    it('cancel with active receive claim: rejected', async () => {
      boot();
      seedClaim();
      await expect(
        purchasesService.update(PO_ID, SHOP, { status: 'cancelled' }, USER),
      ).rejects.toThrow('receive is in progress');
      expect(purchase.status).toBe('pending');
      expect(products.get(PID_A).stock).toBe(10);
      // The claim is resumable after the rejected cancel.
      const retried = await receive();
      expect(retried.status).toBe('received');
      expect(products.get(PID_A).stock).toBe(15);
    });

    it('delete with active receive claim: rejected', async () => {
      boot();
      seedClaim();
      await expect(purchasesService.delete(PO_ID, SHOP)).rejects.toThrow(
        'receive is in progress',
      );
      expect(deletedPurchases).toHaveLength(0);
    });

    it('delete vs receive race mid-claim: one winner, no inconsistent state', async () => {
      boot();
      const results = await Promise.allSettled([
        receive(),
        purchasesService.delete(PO_ID, SHOP),
      ]);
      // Exactly one winner. If the claim landed first, delete is rejected
      // and the receive finalizes; if delete landed first, the receive sees
      // not-found and never claims or mutates stock.
      expect(results.filter((r) => r.status === 'rejected').length).toBe(1);
      if (deletedPurchases.length) {
        expect(purchase.status).not.toBe('received');
        expect(products.get(PID_A).stock).toBe(10);
      } else {
        expect(purchase.status).toBe('received');
        expect(products.get(PID_A).stock).toBe(15);
      }
    });

    it('concurrent receive: one canonical claim, one stock effect', async () => {
      boot();
      await Promise.allSettled([receive(), receive()]);
      expect(purchase.status).toBe('received');
      expect(purchase.receivingClaimId).toBe(CLAIM_ID);
      expect(products.get(PID_A).stock).toBe(15);
      expect(adjustments).toHaveLength(1);
    });
  });

  describe('multi-line', () => {
    it('two lines apply exactly once each', async () => {
      boot({
        items: [
          { productId: PID_A, quantity: 5 },
          { productId: PID_B, quantity: 2 },
        ],
      });
      await receive();
      expect(products.get(PID_A).stock).toBe(15);
      expect(products.get(PID_B).stock).toBe(22);
      expect(adjustments).toHaveLength(2);
      await receive();
      expect(products.get(PID_A).stock).toBe(15);
      expect(products.get(PID_B).stock).toBe(22);
      expect(adjustments).toHaveLength(2);
    });

    it('same product on two lines: both apply (line-index identity)', async () => {
      boot({
        items: [
          { productId: PID_A, quantity: 5 },
          { productId: PID_A, quantity: 3 },
        ],
      });
      await receive();
      expect(products.get(PID_A).stock).toBe(18);
      expect(adjustments).toHaveLength(2);
      const ids = adjustments.map((a) => a.mutationId);
      expect(new Set(ids).size).toBe(2);
      await receive();
      expect(products.get(PID_A).stock).toBe(18);
      expect(adjustments).toHaveLength(2);
    });
  });

  describe('receivedItems contract (full receive only)', () => {
    it('rejects divergent receivedQuantity instead of silently over-receiving', async () => {
      boot();
      await expect(
        receive({
          receivedItems: [{ productId: PID_A, receivedQuantity: 3 }],
        }),
      ).rejects.toThrow('Partial receiving is not supported');
      expect(products.get(PID_A).stock).toBe(10);
      // Validation precedes the claim — the rejected request commits nothing.
      expect(purchase.status).toBe('pending');
    });

    it('accepts receivedItems matching ordered quantities', async () => {
      boot();
      await receive({
        receivedItems: [{ productId: PID_A, receivedQuantity: 5 }],
        receiveNotes: 'all good',
      });
      expect(products.get(PID_A).stock).toBe(15);
      expect(adjustments).toHaveLength(1);
    });

    it('rejects receivedItems referencing foreign product', async () => {
      boot();
      await expect(
        receive({
          receivedItems: [{ productId: PID_B, receivedQuantity: 1 }],
        }),
      ).rejects.toThrow('not on this purchase order');
    });
  });

  describe('lifecycle guards', () => {
    it('cancel before receive: allowed, no stock effect', async () => {
      boot();
      const result = await purchasesService.update(
        PO_ID,
        SHOP,
        { status: 'cancelled' },
        USER,
      );
      expect(result.status).toBe('cancelled');
      expect(products.get(PID_A).stock).toBe(10);
      expect(adjustments).toHaveLength(0);
    });

    it('cancel after receive: rejected, stock untouched', async () => {
      boot();
      await receive();
      await expect(
        purchasesService.update(PO_ID, SHOP, { status: 'cancelled' }, USER),
      ).rejects.toThrow(
        "Cannot change purchase order status from 'received' to 'cancelled'",
      );
      expect(products.get(PID_A).stock).toBe(15);
      expect(purchase.status).toBe('received');
    });

    it('receive after cancel: rejected', async () => {
      boot();
      await purchasesService.update(PO_ID, SHOP, { status: 'cancelled' }, USER);
      await expect(receive()).rejects.toThrow(
        "Cannot change purchase order status from 'cancelled' to 'received'",
      );
      expect(products.get(PID_A).stock).toBe(10);
    });

    it('reopen received to pending: rejected', async () => {
      boot();
      await receive();
      await expect(
        purchasesService.update(PO_ID, SHOP, { status: 'pending' }, USER),
      ).rejects.toThrow(
        "Cannot change purchase order status from 'received' to 'pending'",
      );
    });

    it('receive vs cancel race: exactly one winner', async () => {
      boot();
      const results = await Promise.allSettled([
        receive(),
        purchasesService.update(PO_ID, SHOP, { status: 'cancelled' }, USER),
      ]);
      const finalStatus = purchase.status;
      expect(['received', 'cancelled']).toContain(finalStatus);
      if (finalStatus === 'received') {
        expect(products.get(PID_A).stock).toBe(15);
      } else {
        expect(products.get(PID_A).stock).toBe(10);
      }
      const rejected = results.filter((r) => r.status === 'rejected');
      expect(rejected.length).toBe(1);
    });

    it('delete pending purchase: allowed', async () => {
      boot();
      const deleted = await purchasesService.delete(PO_ID, SHOP);
      expect(deleted).toBe(true);
    });

    it('delete received purchase: rejected — inventory provenance preserved', async () => {
      boot();
      await receive();
      await expect(purchasesService.delete(PO_ID, SHOP)).rejects.toThrow(
        'Cannot delete a received purchase order',
      );
      expect(products.get(PID_A).stock).toBe(15);
      expect(adjustments).toHaveLength(1);
    });

    it('delete vs receive race: delete cannot erase a received purchase', async () => {
      boot();
      const results = await Promise.allSettled([
        receive(),
        purchasesService.delete(PO_ID, SHOP),
      ]);
      // If receive won: delete must reject and stock +5 stands.
      if (purchase.status === 'received' && !deletedPurchases.length) {
        expect(products.get(PID_A).stock).toBe(15);
      } else {
        // Delete won first — receive then sees not-found or deleted.
        expect(products.get(PID_A).stock).toBe(10);
      }
      expect(results.some((r) => r.status === 'fulfilled')).toBe(true);
    });
  });

  describe('branch receiving', () => {
    it('branch purchase receive: branch stock +5 once, global untouched', async () => {
      boot({ branchId: BRANCH, branchStockA: 10 });
      await receive();
      expect(products.get(PID_A).branchInventory[BRANCH].stock).toBe(15);
      expect(products.get(PID_A).stock).toBe(10);
      expect(adjustments).toHaveLength(1);
      await receive();
      expect(products.get(PID_A).branchInventory[BRANCH].stock).toBe(15);
      expect(adjustments).toHaveLength(1);
    });
  });

  describe('tenant isolation', () => {
    it('cross-tenant receive: blocked', async () => {
      boot();
      await expect(
        purchasesService.update(
          PO_ID,
          OTHER_SHOP,
          { status: 'received' },
          USER,
        ),
      ).rejects.toThrow('Purchase order not found');
      expect(products.get(PID_A).stock).toBe(10);
      expect(adjustments).toHaveLength(0);
    });

    it('cross-tenant cancel: blocked', async () => {
      boot();
      await expect(
        purchasesService.update(
          PO_ID,
          OTHER_SHOP,
          { status: 'cancelled' },
          USER,
        ),
      ).rejects.toThrow('Purchase order not found');
      expect(purchase.status).toBe('pending');
    });

    it('cross-tenant delete: returns false, nothing deleted', async () => {
      boot();
      const deleted = await purchasesService.delete(PO_ID, OTHER_SHOP);
      expect(deleted).toBe(false);
      expect(deletedPurchases).toHaveLength(0);
    });
  });
});
