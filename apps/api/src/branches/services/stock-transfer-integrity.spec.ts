import { Types } from 'mongoose';
import { InventoryService } from '../../inventory/inventory.service';
import { StockTransferService } from './stock-transfer.service';
import { StockTransferService as StubTransferService } from '../../inventory/stock-transfer.service';

jest.mock('nanoid', () => ({ nanoid: () => 'P08EVT' }));

/**
 * P0-8 — STOCK TRANSFER INTEGRITY SHIELD
 *
 * TRANSFERRED INVENTORY = source decrement exactly once + destination
 * credit only for legitimately received quantity + durable audit +
 * consistent lifecycle state. Retries, races, cancellation and crashes
 * never duplicate, over-receive, or double-restore.
 */
describe('P0-8 stock transfer integrity', () => {
  const SHOP = '507f1f77bcf86cd799439011';
  const OTHER_SHOP = '507f1f77bcf86cd799439099';
  const USER = '507f1f77bcf86cd799439012';
  const PID_A = '507f1f77bcf86cd799439031';
  const PID_B = '507f1f77bcf86cd799439032';
  const TID = '507f1f77bcf86cd799439041';
  const BRANCH_A = '507f1f77bcf86cd799439051';
  const BRANCH_B = '507f1f77bcf86cd799439052';

  let products: Map<string, any>;
  let adjustments: any[];
  let auditLog: any[];
  let auditFailures: number;
  let transfer: any;
  let transfers: Map<string, any>;
  let inventoryService: InventoryService;
  let transferService: StockTransferService;
  let transferModel: any;
  let productModel: any;
  let adjustmentModel: any;
  let branchModel: any;
  let auditModel: any;

  const toQuery = (resolve: () => any): any => {
    const q: any = {
      exec: async () => resolve(),
      then: (onFulfilled: any, onRejected: any) =>
        Promise.resolve(resolve()).then(onFulfilled, onRejected),
    };
    q.populate = () => q;
    q.select = () => q;
    return q;
  };

  const productFor = (id: any) => products.get(id?.toString());

  function boot(
    options: {
      items?: Array<{ productId: string; quantity: number }>;
      stockA?: number;
      stockB?: number;
      branchAStock?: number;
      branchBStock?: number;
      status?: string;
      fromMain?: boolean;
      toMain?: boolean;
    } = {},
  ) {
    const {
      items = [{ productId: PID_A, quantity: 10 }],
      stockA = 100,
      stockB = 100,
      branchAStock = 10,
      branchBStock = 0,
      status = 'pending_approval',
      fromMain = false,
      toMain = false,
    } = options;

    adjustments = [];
    auditLog = [];
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
      branchInventory: {
        [BRANCH_A]: { stock: branchAStock },
        [BRANCH_B]: { stock: branchBStock },
      },
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
      branchInventory: {
        [BRANCH_A]: { stock: branchAStock },
        [BRANCH_B]: { stock: branchBStock },
      },
      stockMutations: [],
      save: jest.fn(async () => products.get(PID_B)),
    });

    transfer = {
      _id: new Types.ObjectId(TID),
      shopId: new Types.ObjectId(SHOP),
      transferNumber: 'TRF-TEST-1',
      fromBranchId: fromMain ? undefined : new Types.ObjectId(BRANCH_A),
      fromBranchName: 'Branch A',
      toBranchId: toMain ? undefined : new Types.ObjectId(BRANCH_B),
      toBranchName: 'Branch B',
      isFromMainStore: fromMain,
      isToMainStore: toMain,
      items: items.map((i) => ({
        productId: new Types.ObjectId(i.productId),
        productName: productFor(i.productId)?.name ?? 'Item',
        sku: 'SKU',
        quantity: i.quantity,
        receivedQuantity: 0,
        damagedQuantity: 0,
        receiptEventIds: [],
      })),
      status,
      save: jest.fn(async () => transfer),
    };
    transfers = new Map([[TID, transfer]]);

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
        if (update.$inc) {
          applyUpdate(prod, {}, update);
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
        // Faithful to the real unique sparse (shopId, mutationId) index.
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

    branchModel = {
      findOne: jest.fn((filter: any) =>
        toQuery(() => ({
          _id: filter._id,
          shopId: filter.shopId,
          name: 'Branch',
          canTransferStock: true,
        })),
      ),
    };

    auditModel = {
      create: jest.fn(async (doc: any) => {
        auditLog.push(doc);
        return doc;
      }),
    };

    /**
     * Single-condition evaluator for a transfer doc — handles scalar ops
     * ($in/$ne/$lte/$gte/$exists), positional `items.<idx>.<field>` paths,
     * and the legacy `items.$elemMatch` shape (returns the matched index).
     */
    const evalCond = (f: any, t: any): number | boolean => {
      for (const [k, v] of Object.entries(f)) {
        const pos = /^items\.(\d+)\.(.+)$/.exec(k);
        if (pos) {
          const el = t.items?.[Number(pos[1])];
          const field = pos[2];
          if (v && typeof v === 'object' && !Array.isArray(v)) {
            const cond = v as any;
            if (cond.$ne !== undefined) {
              if (
                (el?.[field] ?? []).includes
                  ? (el?.[field] ?? []).includes(cond.$ne)
                  : el?.[field] === cond.$ne
              )
                return false;
            }
            if (cond.$lte !== undefined) {
              // Real Mongo: $lte does NOT match a missing field.
              if (!(el && field in el) || el[field] > cond.$lte) return false;
            }
            if (cond.$gte !== undefined) {
              if (!(el && field in el) || el[field] < cond.$gte) return false;
            }
            if (cond.$exists !== undefined) {
              if ((el != null && field in el) === cond.$exists) continue;
              return false;
            }
            if (cond.$in !== undefined) {
              if (!cond.$in.includes(el?.[field])) return false;
            }
          } else {
            // Real Mongo: scalar equality against an array field means
            // "contains", against a scalar field it means "equals".
            const ev = el?.[field];
            if (Array.isArray(ev)) {
              if (!ev.map(String).includes(String(v))) return false;
            } else if (
              (ev?.toString?.() ?? ev ?? null) !==
              ((v as any)?.toString?.() ?? v ?? null)
            ) {
              return false;
            }
          }
          continue;
        }
        if (k === 'items' && v?.$elemMatch) {
          const em = v.$elemMatch;
          const idx = t.items.findIndex((i: any) => {
            if (
              em.productId &&
              i.productId.toString() !== em.productId.toString()
            )
              return false;
            if (
              em.receivedQuantity?.$lte !== undefined &&
              (i.receivedQuantity ?? 0) > em.receivedQuantity.$lte
            )
              return false;
            if (
              em.receiptEventIds?.$ne &&
              (i.receiptEventIds ?? []).includes(em.receiptEventIds.$ne)
            )
              return false;
            return true;
          });
          if (idx < 0) return false;
          return idx;
        }
        if (k === '_id' && f._id.toString() !== t._id.toString()) return false;
        if (k === 'shopId' && t.shopId.toString() !== f.shopId.toString())
          return false;
        if (k === 'status') {
          if (f.status.$in) {
            if (!f.status.$in.includes(t.status)) return false;
          } else if (t.status !== f.status) return false;
          continue;
        }
        if (['shipClaimId', 'cancelClaimId'].includes(k)) {
          if (v === null) {
            if (t[k] != null) return false;
          } else if (t[k] !== v) return false;
          continue;
        }
        if (k === 'pendingReceipts') {
          const cond = v as any;
          if (cond && typeof cond === 'object') {
            if (cond.$exists !== undefined) {
              if ('pendingReceipts' in t !== cond.$exists) return false;
            }
            if (cond.$lte !== undefined && !('pendingReceipts' in t))
              return false;
            if (cond.$lte !== undefined && (t.pendingReceipts ?? 0) > cond.$lte)
              return false;
            if (cond.$gte !== undefined && (t.pendingReceipts ?? 0) < cond.$gte)
              return false;
          } else if ((t.pendingReceipts ?? null) !== v) {
            return false;
          }
          continue;
        }
        if (k === '$or') continue;
      }
      return true;
    };

    /**
     * Transfer-doc filter evaluator — top-level keys incl. $or.
     * Returns the matched line index when an items condition matched
     * positionally (drives the `items.$` positional update), else bool.
     */
    const evalFilter = (f: any, t: any): number | boolean => {
      if (f._id && f._id.toString() !== t._id.toString()) return false;
      if (f.shopId && t.shopId.toString() !== f.shopId.toString()) return false;
      if (f.$or) {
        const ok = f.$or.some((c: any) => evalCond(c, t) !== false);
        if (!ok) return false;
      }
      const rest = { ...f };
      delete rest.$or;
      delete rest._id;
      delete rest.shopId;
      return evalCond(rest, t);
    };

    const setPath = (obj: any, path: string, value: any, mode: string) => {
      const m = /^items\.(\d+)\.(.+)$/.exec(path);
      const target = m ? obj.items[Number(m[1])] : obj;
      const field = m ? m[2] : path;
      if (mode === 'set') target[field] = value;
      if (mode === 'inc') target[field] = (target[field] ?? 0) + value;
      if (mode === 'addToSet') {
        target[field] = target[field] ?? [];
        if (!target[field].includes(value)) target[field].push(value);
      }
      if (mode === 'push') {
        target[field] = target[field] ?? [];
        target[field].push(value);
      }
    };

    const applyTransferUpdate = (t: any, update: any, matchIdx: number) => {
      const norm = (path: string) =>
        path.startsWith('items.$.')
          ? `items.${matchIdx >= 0 ? matchIdx : 0}.${path.slice(8)}`
          : path;
      for (const [k, v] of Object.entries(update.$set ?? {}))
        setPath(t, norm(k), v, 'set');
      for (const [k, v] of Object.entries(update.$inc ?? {}))
        setPath(t, norm(k), v, 'inc');
      for (const [k, v] of Object.entries(update.$addToSet ?? {}))
        setPath(t, norm(k), v, 'addToSet');
      for (const [k, v] of Object.entries(update.$push ?? {}))
        setPath(t, norm(k), v, 'push');
      return t;
    };

    transferModel = jest.fn((doc: any) => ({
      ...doc,
      save: jest.fn(async () => {
        const rec = { ...doc, _id: new Types.ObjectId() };
        transfers.set(rec._id.toString(), rec);
        return rec;
      }),
    }));
    transferModel.findOne = jest.fn((filter: any) =>
      toQuery(() => {
        const t = filter._id
          ? (transfers.get(filter._id.toString()) ?? null)
          : transfer;
        if (!t) return null;
        if (evalFilter(filter, t) === false) return null;
        return t;
      }),
    );
    transferModel.findOneAndUpdate = jest.fn((filter: any, update: any) =>
      toQuery(() => {
        const t = transfers.get(filter._id.toString()) ?? null;
        if (!t) return null;
        const match = evalFilter(filter, t);
        if (match === false) return null;
        return applyTransferUpdate(t, update, match === true ? 0 : match);
      }),
    );
    transferModel.countDocuments = jest.fn(() => toQuery(() => 0));

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

    transferService = new StockTransferService(
      transferModel,
      branchModel,
      productModel,
      auditModel,
      inventoryService,
    );
  }

  const bootShipped = async (opts: any = {}) => {
    boot(opts);
    await transferService.approve(TID, SHOP, USER);
    await transferService.ship(TID, SHOP, USER);
  };
  const approve = () => transferService.approve(TID, SHOP, USER);
  const ship = () => transferService.ship(TID, SHOP, USER);
  const receive = (items: any[], eventId?: string) =>
    transferService.receive(TID, SHOP, USER, items, undefined, eventId);
  const cancel = () => transferService.cancel(TID, SHOP, USER, 'test cancel');
  const bStock = (pid: string, b: string) =>
    products.get(pid).branchInventory[b].stock;
  const seedReceipt = (
    pid: string,
    mutationId: string,
    qty: number,
    branch?: string,
  ) => {
    const p = products.get(pid);
    if (branch) p.branchInventory[branch].stock += qty;
    else p.stock += qty;
    p.stockMutations = [
      ...(p.stockMutations ?? []),
      {
        mutationId,
        quantityDelta: qty,
        reason: 'transfer',
        actor: USER,
        referenceType: 'transfer',
        referenceId: TID,
        audited: false,
        createdAt: new Date(),
      },
    ];
  };

  // ══ LIFECYCLE + APPROVAL ═══════════════════════════════════════════
  describe('approval lifecycle', () => {
    it('approve pending -> approved; double approve rejected', async () => {
      boot();
      await approve();
      expect(transfer.status).toBe('approved');
      await expect(approve()).rejects.toThrow('Cannot approve');
    });

    it('ship before approval: rejected, no stock effect', async () => {
      boot();
      await expect(ship()).rejects.toThrow('Cannot ship');
      expect(bStock(PID_A, BRANCH_A)).toBe(10);
    });
  });

  // ══ SHIP — SOURCE DEDUCTION EXACTLY ONCE ═══════════════════════════
  describe('ship — source deduction', () => {
    it('ship: source -10 once, in_transit, one durable audit', async () => {
      boot();
      await approve();
      const result = await ship();
      expect(result.status).toBe('in_transit');
      expect(bStock(PID_A, BRANCH_A)).toBe(0);
      expect(products.get(PID_A).stock).toBe(100); // global untouched
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0]).toEqual(
        expect.objectContaining({
          mutationId: `transfer:${TID}:${PID_A}:ship`,
          quantityChange: -10,
          reason: 'transfer',
        }),
      );
    });

    it('ship retry x3: source decremented exactly once', async () => {
      boot();
      await approve();
      await ship();
      await ship();
      await ship();
      expect(bStock(PID_A, BRANCH_A)).toBe(0);
      expect(adjustments).toHaveLength(1);
    });

    it('concurrent ship: one deduction, one in_transit', async () => {
      boot();
      await approve();
      await Promise.allSettled([ship(), ship()]);
      expect(bStock(PID_A, BRANCH_A)).toBe(0);
      expect(transfer.status).toBe('in_transit');
      expect(adjustments).toHaveLength(1);
    });

    it('crash after ship claim, before deduction: resume deducts once then finalizes', async () => {
      boot();
      await approve();
      // Persisted state a hard crash leaves: claim written, status approved.
      transfer.shipClaimId = `transfer:${TID}:ship`;
      transfer.shipStartedAt = new Date();
      const retried = await ship();
      expect(retried.status).toBe('in_transit');
      expect(bStock(PID_A, BRANCH_A)).toBe(0);
      expect(adjustments).toHaveLength(1);
    });

    it('crash mid-ship (line A deducted, B not): A deduped, B deducted, finalized', async () => {
      boot({
        items: [
          { productId: PID_A, quantity: 5 },
          { productId: PID_B, quantity: 2 },
        ],
      });
      await approve();
      transfer.shipClaimId = `transfer:${TID}:ship`;
      transfer.shipStartedAt = new Date();
      seedReceipt(PID_A, `transfer:${TID}:${PID_A}:ship`, -5, BRANCH_A);
      expect(bStock(PID_A, BRANCH_A)).toBe(5);
      expect(bStock(PID_B, BRANCH_A)).toBe(10);

      const retried = await ship();
      expect(retried.status).toBe('in_transit');
      expect(bStock(PID_A, BRANCH_A)).toBe(5); // no re-deduct
      expect(bStock(PID_B, BRANCH_A)).toBe(8);
    });

    it('ship with insufficient source stock: fails closed, claim resumable', async () => {
      boot({ branchAStock: 3 });
      await approve();
      await expect(ship()).rejects.toThrow('Insufficient stock');
      // Claim remains — retry after restock converges.
      expect(transfer.status).toBe('approved');
      expect(transfer.shipClaimId).toBe(`transfer:${TID}:ship`);
      expect(bStock(PID_A, BRANCH_A)).toBe(3);
      products.get(PID_A).branchInventory[BRANCH_A].stock = 20;
      const retried = await ship();
      expect(retried.status).toBe('in_transit');
      expect(bStock(PID_A, BRANCH_A)).toBe(10);
    });

    it('cancel cannot slip past an active ship claim on approved', async () => {
      boot();
      await approve();
      transfer.shipClaimId = `transfer:${TID}:ship`;
      transfer.shipStartedAt = new Date();
      await expect(cancel()).rejects.toThrow('in progress');
      expect(transfer.status).toBe('approved');
    });
  });

  // ══ RECEIVE — BOUNDED, EXACTLY-ONCE DESTINATION CREDIT ═════════════
  describe('receive — destination credit', () => {
    it('full receive: destination +10, status received', async () => {
      await bootShipped();
      const result = await receive(
        [{ productId: PID_A, receivedQuantity: 10 }],
        'evt-full',
      );
      expect(result.status).toBe('received');
      expect(bStock(PID_A, BRANCH_B)).toBe(10);
      expect(transfer.items[0].receivedQuantity).toBe(10);
    });

    it('same receive event retried x3: destination credited once', async () => {
      await bootShipped();
      const items = [{ productId: PID_A, receivedQuantity: 10 }];
      await receive(items, 'evt-1');
      await receive(items, 'evt-1');
      await receive(items, 'evt-1');
      expect(bStock(PID_A, BRANCH_B)).toBe(10);
      expect(transfer.items[0].receivedQuantity).toBe(10);
      expect(adjustments).toHaveLength(2); // ship + 1 receive
    });

    it('partial receives 4+3+3: bounded total, then received', async () => {
      await bootShipped();
      let r = await receive([{ productId: PID_A, receivedQuantity: 4 }], 'e1');
      expect(r.status).toBe('partially_received');
      expect(bStock(PID_A, BRANCH_B)).toBe(4);
      r = await receive([{ productId: PID_A, receivedQuantity: 3 }], 'e2');
      expect(r.status).toBe('partially_received');
      expect(bStock(PID_A, BRANCH_B)).toBe(7);
      r = await receive([{ productId: PID_A, receivedQuantity: 3 }], 'e3');
      expect(r.status).toBe('received');
      expect(bStock(PID_A, BRANCH_B)).toBe(10);
    });

    it('over-receipt rejected at the atomic bound: receive 5 with 3 remaining', async () => {
      await bootShipped();
      await receive([{ productId: PID_A, receivedQuantity: 7 }], 'e1');
      await expect(
        receive([{ productId: PID_A, receivedQuantity: 5 }], 'e2'),
      ).rejects.toThrow('Over-receipt');
      expect(transfer.items[0].receivedQuantity).toBe(7);
      expect(bStock(PID_A, BRANCH_B)).toBe(7);
    });

    it('concurrent receive for the same remaining quantity: one winner, no over-receipt', async () => {
      await bootShipped({ items: [{ productId: PID_A, quantity: 5 }] });
      const items = [{ productId: PID_A, receivedQuantity: 5 }];
      const results = await Promise.allSettled([
        receive(items, 'e1'),
        receive(items, 'e2'),
      ]);
      expect(transfer.items[0].receivedQuantity).toBeLessThanOrEqual(5);
      expect(bStock(PID_A, BRANCH_B)).toBeLessThanOrEqual(5);
      expect(
        results.filter((r) => r.status === 'rejected').length,
      ).toBeGreaterThanOrEqual(1);
    });

    it('crash after bound-claim before stock credit: same-event retry credits once', async () => {
      await bootShipped();
      // Persisted crash state: event claimed, stock not credited.
      transfer.items[0].receivedQuantity = 10;
      transfer.items[0].receiptEventIds = ['evt-crash'];
      transfer.pendingReceipts = 1;
      const retried = await receive(
        [{ productId: PID_A, receivedQuantity: 10 }],
        'evt-crash',
      );
      expect(retried.status).toBe('received');
      expect(bStock(PID_A, BRANCH_B)).toBe(10); // exactly once
      expect(transfer.pendingReceipts).toBe(0);
      expect(transfer.items[0].convergedReceiptEventIds).toContain('evt-crash');
    });

    it('damaged quantity: only good quantity credited', async () => {
      await bootShipped();
      await receive(
        [{ productId: PID_A, receivedQuantity: 10, damagedQuantity: 3 }],
        'e1',
      );
      expect(bStock(PID_A, BRANCH_B)).toBe(7);
      expect(transfer.status).toBe('received');
    });

    it('receive on non-shipped transfer: rejected', async () => {
      boot();
      await approve();
      await expect(
        receive([{ productId: PID_A, receivedQuantity: 5 }], 'e1'),
      ).rejects.toThrow('Cannot receive');
      expect(bStock(PID_A, BRANCH_B)).toBe(0);
    });

    it('receive during active cancel claim: rejected', async () => {
      await bootShipped();
      transfer.cancelClaimId = `transfer:${TID}:cancel`;
      transfer.cancelStartedAt = new Date();
      await expect(
        receive([{ productId: PID_A, receivedQuantity: 5 }], 'e1'),
      ).rejects.toThrow('cancellation is in progress');
      expect(bStock(PID_A, BRANCH_B)).toBe(0);
    });
  });

  // ══ CANCEL — RESTORE ONLY OUTSTANDING ══════════════════════════════
  describe('cancel — outstanding restore', () => {
    it('cancel before ship: cancelled, zero stock effect', async () => {
      boot();
      await approve();
      const result = await cancel();
      expect(result.status).toBe('cancelled');
      expect(bStock(PID_A, BRANCH_A)).toBe(10);
      expect(adjustments).toHaveLength(0);
    });

    it('cancel in_transit: full outstanding restored to source', async () => {
      boot();
      await approve();
      await ship();
      expect(bStock(PID_A, BRANCH_A)).toBe(0);
      const result = await cancel();
      expect(result.status).toBe('cancelled');
      expect(bStock(PID_A, BRANCH_A)).toBe(10); // restored
      expect(adjustments).toHaveLength(2); // ship + restore
    });

    it('cancel after partial receipt: restores ONLY outstanding 6, destination keeps 4', async () => {
      boot();
      await approve();
      await ship();
      await receive([{ productId: PID_A, receivedQuantity: 4 }], 'e1');
      const result = await cancel();
      expect(result.status).toBe('cancelled');
      expect(bStock(PID_A, BRANCH_A)).toBe(6); // +6 restore, NOT +10
      expect(bStock(PID_A, BRANCH_B)).toBe(4); // received stays
    });

    it('cancel retry: restore exactly once', async () => {
      boot();
      await approve();
      await ship();
      await cancel();
      await expect(cancel()).rejects.toThrow('Cannot cancel');
      expect(bStock(PID_A, BRANCH_A)).toBe(10);
      expect(
        adjustments.filter((a) => a.mutationId.includes('cancel-restore')),
      ).toHaveLength(1);
    });

    it('cancel after full receive: rejected, no reversal', async () => {
      boot();
      await approve();
      await ship();
      await receive([{ productId: PID_A, receivedQuantity: 10 }], 'e1');
      await expect(cancel()).rejects.toThrow('Cannot cancel');
      expect(bStock(PID_A, BRANCH_B)).toBe(10);
      expect(transfer.status).toBe('received');
    });

    it('receive vs cancel race: one winner, consistent inventory', async () => {
      boot();
      await approve();
      await ship();
      const results = await Promise.allSettled([
        receive([{ productId: PID_A, receivedQuantity: 10 }], 'e1'),
        cancel(),
      ]);
      // Conservation: source + destination = original source stock.
      const dest = bStock(PID_A, BRANCH_B);
      const source = bStock(PID_A, BRANCH_A);
      expect(source + dest).toBe(10);
      expect(
        results.filter((r) => r.status === 'fulfilled').length,
      ).toBeGreaterThanOrEqual(1);
    });
  });

  // ══ P0-8A — RECEIPT IDENTITY + CLAIM/CONVERGE CONVERGENCE ═══════════
  describe('P0-8A — receipt identity and convergence', () => {
    it('receiptEventId is mandatory: keyless receive rejected before any mutation', async () => {
      await bootShipped();
      await expect(
        transferService.receive(TID, SHOP, USER, [
          { productId: PID_A, receivedQuantity: 3 },
        ]),
      ).rejects.toThrow('receiptEventId is required');
      expect(transfer.items[0].receivedQuantity ?? 0).toBe(0);
      expect(bStock(PID_A, BRANCH_B)).toBe(0);
    });

    it('lost response: partial receipt E1 retried with same id → +0', async () => {
      await bootShipped();
      await receive([{ productId: PID_A, receivedQuantity: 3 }], 'E1');
      expect(bStock(PID_A, BRANCH_B)).toBe(3);
      const retried = await receive(
        [{ productId: PID_A, receivedQuantity: 3 }],
        'E1',
      );
      expect(transfer.items[0].receivedQuantity).toBe(3);
      expect(bStock(PID_A, BRANCH_B)).toBe(3);
      expect(retried.status).toBe('partially_received');
      expect(
        adjustments.filter((a) => a.mutationId.includes('E1')),
      ).toHaveLength(1);
    });

    it('equal-quantity DISTINCT receipts are not deduped: E1 +3, E2 +3 → +6', async () => {
      await bootShipped();
      await receive([{ productId: PID_A, receivedQuantity: 3 }], 'E1');
      await receive([{ productId: PID_A, receivedQuantity: 3 }], 'E2');
      expect(transfer.items[0].receivedQuantity).toBe(6);
      expect(bStock(PID_A, BRANCH_B)).toBe(6);
    });

    it('crash post-claim pre-credit: cancel is BLOCKED until the receipt converges', async () => {
      await bootShipped();
      // Persisted in-flight receipt: claimed, destination credit missing.
      transfer.items[0].receivedQuantity = 4;
      transfer.items[0].receiptEventIds = ['E1'];
      transfer.pendingReceipts = 1;
      await expect(cancel()).rejects.toThrow('still converging');
      // Nothing moved: source still -10, destination still +0.
      expect(bStock(PID_A, BRANCH_A)).toBe(0);
      expect(bStock(PID_A, BRANCH_B)).toBe(0);
      // Converge via receive retry → then cancel restores only outstanding.
      await receive([{ productId: PID_A, receivedQuantity: 4 }], 'E1');
      expect(bStock(PID_A, BRANCH_B)).toBe(4);
      expect(transfer.pendingReceipts).toBe(0);
      await cancel();
      expect(bStock(PID_A, BRANCH_A)).toBe(6); // outstanding 6 restored
      expect(bStock(PID_A, BRANCH_B)).toBe(4); // delivered stock kept
      expect(transfer.status).toBe('cancelled');
    });

    it('cancel claim wins before receipt claim → receipt rejected, full restore', async () => {
      await bootShipped();
      transfer.cancelClaimId = `transfer:${TID}:cancel`;
      transfer.cancelStartedAt = new Date();
      await expect(
        receive([{ productId: PID_A, receivedQuantity: 4 }], 'E1'),
      ).rejects.toThrow('cancellation is in progress');
      expect(bStock(PID_A, BRANCH_B)).toBe(0);
    });

    it('crash post-credit pre-mark: retry adds +0 stock and completes the mark', async () => {
      await bootShipped();
      // Claimed + destination credited (witness exists) but the
      // converged-mark/pending decrement never landed.
      transfer.items[0].receivedQuantity = 4;
      transfer.items[0].receiptEventIds = ['E1'];
      transfer.pendingReceipts = 1;
      seedReceipt(PID_A, `transfer:${TID}:${PID_A}:receive:E1`, 4, BRANCH_B);
      expect(bStock(PID_A, BRANCH_B)).toBe(4);
      await receive([{ productId: PID_A, receivedQuantity: 4 }], 'E1');
      expect(bStock(PID_A, BRANCH_B)).toBe(4); // no double credit
      expect(transfer.pendingReceipts).toBe(0);
      expect(transfer.items[0].convergedReceiptEventIds).toContain('E1');
    });

    it('final receipt crash: transfer not sealed received while a claim is unconverged', async () => {
      await bootShipped();
      // Every line fully claimed, but E1's credit still in flight —
      // a concurrent event's finalize must not seal 'received'.
      transfer.items[0].receivedQuantity = 10;
      transfer.items[0].receiptEventIds = ['E1'];
      transfer.pendingReceipts = 1;
      await receive([{ productId: PID_A, receivedQuantity: 0 }], 'E2');
      expect(transfer.status).not.toBe('received');
      // Now converge E1 → its own finalize seals it.
      await receive([{ productId: PID_A, receivedQuantity: 10 }], 'E1');
      expect(transfer.status).toBe('received');
      expect(bStock(PID_A, BRANCH_B)).toBe(10);
    });

    it('same event id + conflicting payload: rejected as conflict, not replayed', async () => {
      await bootShipped();
      await receive([{ productId: PID_A, receivedQuantity: 3 }], 'E1');
      await expect(
        receive([{ productId: PID_A, receivedQuantity: 5 }], 'E1'),
      ).rejects.toThrow('conflicting payload');
      expect(transfer.items[0].receivedQuantity).toBe(3);
      expect(bStock(PID_A, BRANCH_B)).toBe(3);
    });

    it('concurrent identical event id: one logical receipt, one credit', async () => {
      await bootShipped();
      const items = [{ productId: PID_A, receivedQuantity: 5 }];
      await Promise.allSettled([receive(items, 'E1'), receive(items, 'E1')]);
      expect(transfer.items[0].receivedQuantity).toBe(5);
      expect(bStock(PID_A, BRANCH_B)).toBe(5);
      expect(transfer.pendingReceipts).toBe(0);
    });

    it('transferBranchStock without idempotencyKey: rejected before any stock move', async () => {
      boot();
      await expect(
        inventoryService.transferBranchStock(
          SHOP,
          PID_A,
          BRANCH_A,
          BRANCH_B,
          5,
          USER,
          undefined as any,
        ),
      ).rejects.toThrow('idempotencyKey is required');
      expect(bStock(PID_A, BRANCH_A)).toBe(10);
      expect(bStock(PID_A, BRANCH_B)).toBe(0);
    });
  });

  // ══ MULTI-LINE ═════════════════════════════════════════════════════
  describe('multi-line transfers', () => {
    it('two lines: each deducted and credited exactly once', async () => {
      boot({
        items: [
          { productId: PID_A, quantity: 5 },
          { productId: PID_B, quantity: 2 },
        ],
      });
      await approve();
      await ship();
      expect(bStock(PID_A, BRANCH_A)).toBe(5);
      expect(bStock(PID_B, BRANCH_A)).toBe(8);
      await receive(
        [
          { productId: PID_A, receivedQuantity: 5 },
          { productId: PID_B, receivedQuantity: 2 },
        ],
        'e1',
      );
      expect(bStock(PID_A, BRANCH_B)).toBe(5);
      expect(bStock(PID_B, BRANCH_B)).toBe(2);
      expect(transfer.status).toBe('received');
      expect(adjustments).toHaveLength(4); // 2 ship + 2 receive
    });
  });

  // ══ MAIN-STORE LEGS ════════════════════════════════════════════════
  describe('main-store legs', () => {
    it('from main store: global stock decrements, branch untouched', async () => {
      boot({ fromMain: true, stockA: 50 });
      await approve();
      await ship();
      expect(products.get(PID_A).stock).toBe(40);
      expect(bStock(PID_A, BRANCH_A)).toBe(10);
      await receive([{ productId: PID_A, receivedQuantity: 10 }], 'e1');
      expect(bStock(PID_A, BRANCH_B)).toBe(10);
    });
  });

  // ══ P0-2 AUDIT DURABILITY ══════════════════════════════════════════
  describe('P0-2 durable audit', () => {
    it('ship audit projection failure: receipt retained, recovery restores audit, retry no re-deduct', async () => {
      boot();
      await approve();
      auditFailures = 1;
      await ship();
      expect(bStock(PID_A, BRANCH_A)).toBe(0);
      expect(adjustments).toHaveLength(0);
      expect(products.get(PID_A).stockMutations).toHaveLength(1);

      await inventoryService.recoverUnprojectedStockMutations(SHOP);
      expect(adjustments).toHaveLength(1);
      await ship();
      expect(bStock(PID_A, BRANCH_A)).toBe(0);
      expect(adjustments).toHaveLength(1);
    });
  });

  // ══ TENANT ISOLATION ═══════════════════════════════════════════════
  describe('tenant isolation', () => {
    it('cross-tenant approve/ship/receive/cancel: all blocked', async () => {
      boot();
      await expect(
        transferService.approve(TID, OTHER_SHOP, USER),
      ).rejects.toThrow('not found');
      await expect(transferService.ship(TID, OTHER_SHOP, USER)).rejects.toThrow(
        'not found',
      );
      await expect(
        transferService.receive(
          TID,
          OTHER_SHOP,
          USER,
          [{ productId: PID_A, receivedQuantity: 1 }],
          undefined,
          'E1',
        ),
      ).rejects.toThrow('not found');
      await expect(
        transferService.cancel(TID, OTHER_SHOP, USER, 'x'),
      ).rejects.toThrow('not found');
      expect(transfer.status).toBe('pending_approval');
      expect(bStock(PID_A, BRANCH_A)).toBe(10);
    });
  });

  // ══ ONE-SHOT transferBranchStock ═══════════════════════════════════
  describe('one-shot transferBranchStock', () => {
    it('idempotencyKey: retry is a proven no-op', async () => {
      boot();
      await inventoryService.transferBranchStock(
        SHOP,
        PID_A,
        BRANCH_A,
        BRANCH_B,
        5,
        USER,
        'key-1',
      );
      expect(bStock(PID_A, BRANCH_A)).toBe(5);
      expect(bStock(PID_A, BRANCH_B)).toBe(5);
      await inventoryService.transferBranchStock(
        SHOP,
        PID_A,
        BRANCH_A,
        BRANCH_B,
        5,
        USER,
        'key-1',
      );
      expect(bStock(PID_A, BRANCH_A)).toBe(5);
      expect(bStock(PID_A, BRANCH_B)).toBe(5);
      expect(adjustments).toHaveLength(1);
    });
  });

  // ══ STUB SERVICE — BLOCKED ═════════════════════════════════════════
  describe('inventory stub transfer service', () => {
    it('all stub endpoints fail loudly with NotImplementedException', async () => {
      boot();
      const stub = new StubTransferService(productModel);
      await expect(stub.requestTransfer()).rejects.toThrow(
        'non-functional stub',
      );
      await expect(stub.approveTransfer()).rejects.toThrow(
        'non-functional stub',
      );
      await expect(stub.completeTransfer()).rejects.toThrow(
        'non-functional stub',
      );
      await expect(stub.rejectTransfer()).rejects.toThrow(
        'non-functional stub',
      );
      await expect(stub.getTransferHistory()).rejects.toThrow(
        'non-functional stub',
      );
      await expect(stub.getTransferStats()).rejects.toThrow(
        'non-functional stub',
      );
      expect(bStock(PID_A, BRANCH_A)).toBe(10);
    });
  });
});
