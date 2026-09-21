import { Types } from 'mongoose';
import { InventoryService } from '../inventory/inventory.service';
import { PurchasesService } from '../purchases/purchases.service';
import { StockTransferService } from '../branches/services/stock-transfer.service';
import {
  OperationalRecoveryService,
  STALE_CLAIM_MS,
} from './operational-recovery.service';

jest.mock('nanoid', () => ({ nanoid: () => 'P07CID' }));

/**
 * P0-7C — OPERATIONAL CLAIM CONVERGENCE SHIELD
 *
 * A durable claim + durable operation data + durable stock witness must let
 * the SERVER converge an interrupted workflow with zero client state —
 * no browser, no HTTP response, no operator memory. Recovery replays the
 * canonical service paths, so stock moves exactly once via P0-2 witnesses.
 */
describe('P0-7C operational claim convergence', () => {
  const SHOP = '507f1f77bcf86cd799439011';
  const OTHER_SHOP = '507f1f77bcf86cd799439099';
  const USER = '507f1f77bcf86cd799439012';
  const PID_A = '507f1f77bcf86cd799439031';
  const PID_B = '507f1f77bcf86cd799439032';
  const PO_ID = '507f1f77bcf86cd799439041';
  const TID = '507f1f77bcf86cd799439042';
  const BRANCH_A = '507f1f77bcf86cd799439051';
  const BRANCH_B = '507f1f77bcf86cd799439052';
  const OLD = new Date(Date.now() - STALE_CLAIM_MS - 60_000);
  const FRESH = new Date();

  let products: Map<string, any>;
  let purchases: Map<string, any>;
  let transfers: Map<string, any>;
  let adjustments: any[];
  let auditLog: any[];
  let inventoryService: InventoryService;
  let purchasesService: PurchasesService;
  let transferService: StockTransferService;
  let recovery: OperationalRecoveryService;
  let purchaseModel: any;
  let transferModel: any;
  let productModel: any;

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

  /** Generic find() with .limit() support over a doc map. */
  const findQuery = (match: (f: any, d: any) => boolean) => {
    const q: any = {
      _filter: null as any,
      _limit: Infinity,
      limit(n: number) {
        q._limit = n;
        return q;
      },
      exec: async () => q._run(),
      then: (onFulfilled: any, onRejected: any) =>
        Promise.resolve(q._run()).then(onFulfilled, onRejected),
      _run: () => {
        const docs = [...q._source.values()].filter(
          (d) => !q._filter || match(q._filter, d),
        );
        return docs.slice(0, q._limit);
      },
      _source: new Map<string, any>(),
    };
    return q;
  };

  /**
   * Top-level claim-sweep matcher: scalar equality, $in/$ne/$lt/$gt/$exists,
   * and $or branches. ObjectIds compare by string.
   */
  const matchDoc = (f: any, d: any): boolean => {
    for (const [k, v] of Object.entries(f)) {
      if (k === '$or') {
        if (!(v as any[]).some((c) => matchDoc(c, d))) return false;
        continue;
      }
      const dv = d[k];
      const s = (x: any) => x?.toString?.() ?? x ?? null;
      if (
        v &&
        typeof v === 'object' &&
        !Array.isArray(v) &&
        !(v instanceof Types.ObjectId) &&
        !(v instanceof Date) &&
        Object.keys(v).some((key) => key.startsWith('$'))
      ) {
        const c = v as any;
        if (c.$ne !== undefined) {
          if (c.$ne === null ? dv == null : s(dv) === s(c.$ne)) return false;
        }
        if (c.$in !== undefined && !c.$in.map(s).includes(s(dv))) return false;
        if (c.$lt !== undefined && !(dv && new Date(dv) < c.$lt)) return false;
        if (c.$gt !== undefined && !((dv ?? 0) > c.$gt)) return false;
        if (c.$exists !== undefined && k in d !== c.$exists) return false;
        continue;
      }
      if (s(dv) !== s(v)) return false;
    }
    return true;
  };

  /** Transfer-doc matcher with positional items.<idx> conditions. */
  const evalCond = (f: any, t: any): boolean => {
    for (const [k, v] of Object.entries(f)) {
      const pos = /^items\.(\d+)\.(.+)$/.exec(k);
      if (pos) {
        const el = t.items?.[Number(pos[1])];
        const field = pos[2];
        if (
          v &&
          typeof v === 'object' &&
          !Array.isArray(v) &&
          !(v instanceof Types.ObjectId) &&
          !(v instanceof Date)
        ) {
          const c = v as any;
          if (c.$ne !== undefined) {
            const ev = el?.[field];
            const has = Array.isArray(ev) ? ev.includes(c.$ne) : ev === c.$ne;
            if (has) return false;
          }
          if (c.$lte !== undefined) {
            if (!(el && field in el) || el[field] > c.$lte) return false;
          }
          if (c.$exists !== undefined) {
            if ((el != null && field in el) === c.$exists) continue;
            return false;
          }
        } else {
          const ev = el?.[field];
          const s = (x: any) => x?.toString?.() ?? x ?? null;
          if (Array.isArray(ev)) {
            if (!ev.map(String).includes(String(v))) return false;
          } else if (s(ev) !== s(v)) return false;
        }
        continue;
      }
      if (k === '$or') continue;
      if (k === 'status') {
        const c = v as any;
        if (c?.$in ? !c.$in.includes(t.status) : t.status !== v) return false;
        continue;
      }
      if (['shipClaimId', 'cancelClaimId'].includes(k)) {
        if (v === null ? t[k] != null : t[k] !== v) return false;
        continue;
      }
      if (k === 'pendingReceipts') {
        const c = v as any;
        if (c && typeof c === 'object') {
          if (c.$exists !== undefined && 'pendingReceipts' in t !== c.$exists)
            return false;
          if (c.$gt !== undefined && !((t.pendingReceipts ?? 0) > c.$gt))
            return false;
        } else if ((t.pendingReceipts ?? null) !== v) return false;
        continue;
      }
      const s = (x: any) => x?.toString?.() ?? x ?? null;
      if (s(t[k]) !== s(v)) return false;
    }
    return true;
  };

  const matchTransfer = (f: any, t: any): boolean => {
    const s = (x: any) => x?.toString?.() ?? x ?? null;
    if (f._id && s(f._id) !== s(t._id)) return false;
    if (f.shopId && s(f.shopId) !== s(t.shopId)) return false;
    if (f.$or && !f.$or.some((c: any) => evalCond(c, t))) return false;
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

  const applyTransferUpdate = (t: any, update: any) => {
    for (const [k, v] of Object.entries(update.$set ?? {}))
      setPath(t, k, v, 'set');
    for (const [k, v] of Object.entries(update.$inc ?? {}))
      setPath(t, k, v, 'inc');
    for (const [k, v] of Object.entries(update.$addToSet ?? {}))
      setPath(t, k, v, 'addToSet');
    for (const [k, v] of Object.entries(update.$push ?? {}))
      setPath(t, k, v, 'push');
    return t;
  };

  const applyProductUpdate = (prod: any, filter: any, update: any) => {
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

  function boot(
    options: {
      purchaseItems?: Array<{ productId: string; quantity: number }>;
      transferItems?: Array<{ productId: string; quantity: number }>;
      stockA?: number;
      stockB?: number;
      branchAStock?: number;
      branchBStock?: number;
      purchaseStatus?: string;
      purchaseClaimed?: boolean;
      purchaseClaimAge?: Date;
      purchaseBranch?: boolean;
      transferStatus?: string;
      otherShopPurchase?: boolean;
    } = {},
  ) {
    const {
      purchaseItems = [{ productId: PID_A, quantity: 5 }],
      transferItems = [{ productId: PID_A, quantity: 10 }],
      stockA = 100,
      stockB = 100,
      branchAStock = 20,
      branchBStock = 0,
      purchaseStatus = 'pending',
      purchaseClaimed = false,
      purchaseClaimAge = OLD,
      purchaseBranch = false,
      transferStatus = 'pending_approval',
      otherShopPurchase = false,
    } = options;

    adjustments = [];
    auditLog = [];
    products = new Map();
    for (const [pid, name, stock] of [
      [PID_A, 'Product A', stockA],
      [PID_B, 'Product B', stockB],
    ] as const) {
      products.set(pid, {
        _id: new Types.ObjectId(pid),
        shopId: new Types.ObjectId(SHOP),
        name,
        sku: `SKU-${name.slice(-1)}`,
        price: 100,
        stock,
        branchInventory: {
          [BRANCH_A]: { stock: branchAStock },
          [BRANCH_B]: { stock: branchBStock },
        },
        stockMutations: [],
        save: jest.fn(async () => products.get(pid)),
      });
    }
    // Same product ids exist in a second tenant — cross-shop safety checks.
    products.set(`${PID_A}:${OTHER_SHOP}`, {
      _id: new Types.ObjectId(PID_A),
      shopId: new Types.ObjectId(OTHER_SHOP),
      name: 'Product A (other shop)',
      stock: 500,
      branchInventory: {},
      stockMutations: [],
      save: jest.fn(async () => products.get(`${PID_A}:${OTHER_SHOP}`)),
    });

    const pFor = (id: any, shopId?: any) =>
      [...products.values()].find(
        (p) =>
          p._id.toString() === id?.toString() &&
          (!shopId || p.shopId.toString() === shopId.toString()),
      );

    purchases = new Map();
    const poShop = otherShopPurchase ? OTHER_SHOP : SHOP;
    const purchase: any = {
      _id: new Types.ObjectId(PO_ID),
      shopId: new Types.ObjectId(poShop),
      purchaseNumber: 'PO-TEST-1',
      supplierId: new Types.ObjectId(),
      branchId: purchaseBranch ? new Types.ObjectId(BRANCH_A) : undefined,
      items: purchaseItems.map((i) => ({
        productId: new Types.ObjectId(i.productId),
        productName: 'Item',
        quantity: i.quantity,
        unitCost: 10,
        totalCost: i.quantity * 10,
      })),
      totalCost: purchaseItems.reduce((s, i) => s + i.quantity * 10, 0),
      status: purchaseStatus,
      createdBy: new Types.ObjectId(USER),
      save: jest.fn(async () => purchase),
    };
    if (purchaseClaimed) {
      purchase.receivingClaimId = `purchase:${PO_ID}:receive`;
      purchase.receivingStartedAt = purchaseClaimAge;
    }
    purchases.set(PO_ID, purchase);

    const transfer: any = {
      _id: new Types.ObjectId(TID),
      shopId: new Types.ObjectId(SHOP),
      transferNumber: 'TRF-TEST-1',
      fromBranchId: new Types.ObjectId(BRANCH_A),
      fromBranchName: 'Branch A',
      toBranchId: new Types.ObjectId(BRANCH_B),
      toBranchName: 'Branch B',
      isFromMainStore: false,
      isToMainStore: false,
      requestedBy: new Types.ObjectId(USER),
      approvedBy: new Types.ObjectId(USER),
      items: transferItems.map((i) => ({
        productId: new Types.ObjectId(i.productId),
        productName: 'Item',
        quantity: i.quantity,
        receivedQuantity: 0,
        damagedQuantity: 0,
        receiptEventIds: [],
        convergedReceiptEventIds: [],
        receiptEvents: [],
      })),
      status: transferStatus,
      save: jest.fn(async () => transfer),
    };
    transfers = new Map([[TID, transfer]]);

    productModel = jest.fn((doc: any) => ({
      ...doc,
      save: jest.fn(async () => doc),
    }));
    productModel.findOne = jest.fn((filter: any) =>
      toQuery(() => pFor(filter?._id, filter?.shopId) ?? null),
    );
    productModel.findById = jest.fn((id: any) =>
      toQuery(() => pFor(id) ?? null),
    );
    productModel.findOneAndUpdate = jest.fn((filter: any, update: any) =>
      toQuery(() => {
        const prod = pFor(filter?._id, filter?.shopId);
        if (!prod) return null;
        return applyProductUpdate(prod, filter, update);
      }),
    );
    productModel.updateOne = jest.fn((filter: any, update: any, opts: any) =>
      toQuery(() => {
        const prod = pFor(filter?._id, filter?.shopId);
        if (!prod) return { modifiedCount: 0 };
        if (update.$set?.['stockMutations.$[m].audited'] !== undefined) {
          const mid = opts?.arrayFilters?.[0]?.['m.mutationId'];
          for (const m of prod.stockMutations ?? []) {
            if (m.mutationId === mid) m.audited = true;
          }
        }
        if (update.$pull?.stockMutations) {
          const c = update.$pull.stockMutations;
          prod.stockMutations = (prod.stockMutations ?? []).filter(
            (m: any) =>
              !(
                c.audited === true &&
                m.audited === true &&
                (c.mutationId === undefined || m.mutationId === c.mutationId)
              ),
          );
        }
        if (update.$inc) applyProductUpdate(prod, {}, update);
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

    const adjustmentModel: any = jest.fn((doc: any) => ({
      ...doc,
      save: jest.fn(async () => {
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
        const rec = { ...doc, _id: `adj-${adjustments.length + 1}` };
        adjustments.push(rec);
        return rec;
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

    const branchModel: any = {
      findOne: jest.fn((filter: any) =>
        toQuery(() => ({
          _id: filter._id,
          shopId: filter.shopId,
          name: 'Branch',
          canTransferStock: true,
        })),
      ),
    };
    const auditModel: any = {
      create: jest.fn(async (doc: any) => {
        auditLog.push(doc);
        return doc;
      }),
    };

    const claimMismatch = (f: any, p: any) => {
      if (f.receivingClaimId === undefined) return false;
      if (f.receivingClaimId === null) return p.receivingClaimId != null;
      return p.receivingClaimId !== f.receivingClaimId;
    };
    purchaseModel = jest.fn((doc: any) => ({
      ...doc,
      save: jest.fn(async () => doc),
    }));
    purchaseModel.findOne = jest.fn((filter: any) =>
      toQuery(() => {
        const p = purchases.get(filter?._id?.toString());
        if (!p) return null;
        if (filter.shopId && p.shopId.toString() !== filter.shopId.toString())
          return null;
        if (filter.status !== undefined && p.status !== filter.status)
          return null;
        if (claimMismatch(filter, p)) return null;
        return p;
      }),
    );
    purchaseModel.findOneAndUpdate = jest.fn((filter: any, update: any) =>
      toQuery(() => {
        const p = purchases.get(filter?._id?.toString());
        if (!p) return null;
        if (filter.shopId && p.shopId.toString() !== filter.shopId.toString())
          return null;
        if (filter.status !== undefined && p.status !== filter.status)
          return null;
        if (claimMismatch(filter, p)) return null;
        Object.assign(p, update.$set ?? update);
        return p;
      }),
    );
    purchaseModel.updateOne = jest.fn((_f: any, update: any) =>
      toQuery(() => {
        Object.assign(purchase, update.$set ?? update);
        return { modifiedCount: 1 };
      }),
    );
    purchaseModel.find = jest.fn((filter: any) => {
      const q = findQuery(matchDoc);
      q._filter = filter;
      q._source = purchases;
      return q;
    });

    transferModel = jest.fn((doc: any) => ({
      ...doc,
      save: jest.fn(async () => doc),
    }));
    transferModel.findOne = jest.fn((filter: any) =>
      toQuery(() => {
        const t = filter._id
          ? (transfers.get(filter._id.toString()) ?? null)
          : [...transfers.values()][0];
        if (!t) return null;
        if (!matchTransfer(filter, t)) return null;
        return t;
      }),
    );
    transferModel.findOneAndUpdate = jest.fn((filter: any, update: any) =>
      toQuery(() => {
        const t = transfers.get(filter?._id?.toString()) ?? null;
        if (!t) return null;
        if (!matchTransfer(filter, t)) return null;
        return applyTransferUpdate(t, update);
      }),
    );
    transferModel.find = jest.fn((filter: any) => {
      const q = findQuery(matchDoc);
      q._filter = filter;
      q._source = transfers;
      return q;
    });
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
    purchasesService = new PurchasesService(purchaseModel, inventoryService);
    transferService = new StockTransferService(
      transferModel,
      branchModel,
      productModel,
      auditModel,
      inventoryService,
    );
    recovery = new OperationalRecoveryService(
      purchaseModel,
      transferModel,
      purchasesService,
      transferService,
    );
  }

  const sweep = () => recovery.sweep(new Date(Date.now() - STALE_CLAIM_MS));
  const bStock = (pid: string, b: string) =>
    products.get(pid).branchInventory[b].stock;
  const transfer = () => transfers.get(TID);
  const purchase = () => purchases.get(PO_ID);
  const outcomes = (rs: any[]) => rs.map((r) => r.outcome);

  /** Simulate a stranded receipt claim exactly as a crash would leave it. */
  const strandReceipt = (
    eventId: string,
    lineIdx: number,
    qty: number,
    dam = 0,
    claimedAt: Date | undefined = OLD,
  ) => {
    const t = transfer();
    const line = t.items[lineIdx];
    line.receivedQuantity = (line.receivedQuantity ?? 0) + qty;
    line.damagedQuantity = (line.damagedQuantity ?? 0) + dam;
    line.receiptEventIds = [...(line.receiptEventIds ?? []), eventId];
    line.receiptEvents = [
      ...(line.receiptEvents ?? []),
      { eventId, receivedQuantity: qty, damagedQuantity: dam, claimedAt },
    ];
    t.pendingReceipts = (t.pendingReceipts ?? 0) + 1;
  };

  describe('purchase receive claims', () => {
    it('claim before any stock: sweep applies every line once, finalizes', async () => {
      boot({
        purchaseClaimed: true,
        purchaseItems: [
          { productId: PID_A, quantity: 5 },
          { productId: PID_B, quantity: 3 },
        ],
      });
      const results = await sweep();
      expect(outcomes(results)).toEqual(['CONVERGED']);
      expect(products.get(PID_A).stock).toBe(105);
      expect(products.get(PID_B).stock).toBe(103);
      expect(purchase().status).toBe('received');
      expect(adjustments).toHaveLength(2);
    });

    it('claim with line A applied, line B missing: A no-op, B applied once', async () => {
      boot({
        purchaseClaimed: true,
        purchaseItems: [
          { productId: PID_A, quantity: 5 },
          { productId: PID_B, quantity: 3 },
        ],
      });
      // Crash state: A's witness + physical stock already present.
      products.get(PID_A).stock += 5;
      products.get(PID_A).stockMutations.push({
        mutationId: `purchase:${PO_ID}:${PID_A}`,
      });
      const results = await sweep();
      expect(outcomes(results)).toEqual(['CONVERGED']);
      expect(products.get(PID_A).stock).toBe(105); // not 110
      expect(products.get(PID_B).stock).toBe(103);
      expect(purchase().status).toBe('received');
    });

    it('repeated sweeps after convergence: zero additional stock', async () => {
      boot({ purchaseClaimed: true });
      await sweep();
      await sweep();
      expect(products.get(PID_A).stock).toBe(105);
      expect(adjustments).toHaveLength(1);
    });

    it('concurrent sweep workers converge the same claim exactly once', async () => {
      boot({ purchaseClaimed: true });
      await Promise.all([sweep(), sweep()]);
      expect(products.get(PID_A).stock).toBe(105);
      expect(adjustments).toHaveLength(1);
      expect(purchase().status).toBe('received');
    });

    it('missing product: MANUAL_REVIEW_REQUIRED, claim evidence retained', async () => {
      boot({ purchaseClaimed: true });
      products.delete(PID_A);
      const results = await sweep();
      expect(outcomes(results)).toEqual(['MANUAL_REVIEW_REQUIRED']);
      expect(purchase().status).toBe('pending');
      expect(purchase().receivingClaimId).toBeTruthy();
    });

    it('branch purchase: recovery applies branch stock via witness', async () => {
      boot({ purchaseClaimed: true, purchaseBranch: true });
      await sweep();
      expect(bStock(PID_A, BRANCH_A)).toBe(25);
      expect(products.get(PID_A).stock).toBe(100); // global untouched
      expect(purchase().status).toBe('received');
    });

    it('fresh claim is not a sweep candidate (age gate)', async () => {
      boot({ purchaseClaimed: true, purchaseClaimAge: FRESH });
      const results = await sweep();
      expect(results).toHaveLength(0);
      expect(products.get(PID_A).stock).toBe(100);
      expect(purchase().receivingClaimId).toBeTruthy();
    });

    it('manual operator recover bypasses the age gate', async () => {
      boot({ purchaseClaimed: true, purchaseClaimAge: FRESH });
      const results = await recovery.recoverResource('purchase', PO_ID, SHOP);
      expect(outcomes(results)).toEqual(['CONVERGED']);
      expect(products.get(PID_A).stock).toBe(105);
    });

    it('cross-tenant: recovery scopes stock to the claim document shop', async () => {
      boot({ purchaseClaimed: true, otherShopPurchase: true });
      await sweep();
      expect(products.get(`${PID_A}:${OTHER_SHOP}`).stock).toBe(505);
      expect(products.get(PID_A).stock).toBe(100); // SHOP product untouched
      // Manual path in the wrong tenant cannot reach it.
      const res = await recovery.recoverResource('purchase', PO_ID, SHOP);
      expect(outcomes(res)).toEqual(['NOT_FOUND']);
    });
  });

  describe('transfer ship claims', () => {
    const strandShip = (age: Date | undefined = OLD) => {
      const t = transfer();
      t.status = 'approved';
      t.shipClaimId = `transfer:${TID}:ship`;
      t.shipStartedAt = age;
    };

    it('claim before any source debit: all lines debited once, in_transit', async () => {
      boot();
      strandShip();
      const results = await sweep();
      expect(outcomes(results)).toEqual(['CONVERGED']);
      expect(bStock(PID_A, BRANCH_A)).toBe(10); // 20 - 10
      expect(transfer().status).toBe('in_transit');
    });

    it('partial line debit before crash: debited line no-ops, rest converge', async () => {
      boot({
        transferItems: [
          { productId: PID_A, quantity: 4 },
          { productId: PID_B, quantity: 3 },
        ],
      });
      strandShip();
      // Crash state: A debited with durable witness.
      products.get(PID_A).branchInventory[BRANCH_A].stock -= 4;
      products.get(PID_A).stockMutations.push({
        mutationId: `transfer:${TID}:${PID_A}:ship`,
      });
      await sweep();
      expect(bStock(PID_A, BRANCH_A)).toBe(16); // not 12
      expect(bStock(PID_B, BRANCH_A)).toBe(17);
      expect(transfer().status).toBe('in_transit');
    });

    it('repeated + concurrent sweeps: source debit exactly once', async () => {
      boot();
      strandShip();
      await Promise.all([sweep(), sweep()]);
      await sweep();
      expect(bStock(PID_A, BRANCH_A)).toBe(10);
      expect(
        adjustments.filter((a) => a.mutationId?.includes(':ship')),
      ).toHaveLength(1);
    });

    it('insufficient source stock: MANUAL_REVIEW_REQUIRED, claim retained', async () => {
      boot({ branchAStock: 2 });
      strandShip();
      const results = await sweep();
      expect(outcomes(results)).toEqual(['MANUAL_REVIEW_REQUIRED']);
      expect(transfer().status).toBe('approved');
      expect(transfer().shipClaimId).toBeTruthy();
    });
  });

  describe('transfer receipt claims — zero client state', () => {
    const bootInTransit = async (opts: any = {}) => {
      boot({ ...opts, transferStatus: 'in_transit' });
    };

    it('E1 claimed, destination never credited, client gone: server converges E1', async () => {
      await bootInTransit();
      strandReceipt('E1', 0, 3);
      const results = await sweep();
      expect(outcomes(results)).toEqual(['CONVERGED']);
      expect(bStock(PID_A, BRANCH_B)).toBe(3);
      expect(transfer().pendingReceipts).toBe(0);
      // Post-projection the embedded receipt is pulled; the durable audit
      // proves the single application.
      expect(adjustments.map((a: any) => a.mutationId)).toEqual([
        `transfer:${TID}:${PID_A}:receive:E1`,
      ]);
      expect(transfer().status).toBe('partially_received');
    });

    it('E1 credited but convergence mark crashed: +0 stock, pending resolves', async () => {
      await bootInTransit();
      strandReceipt('E1', 0, 3);
      // Stock credit landed; the convergence mark + pending decrement crashed.
      products.get(PID_A).branchInventory[BRANCH_B].stock += 3;
      products.get(PID_A).stockMutations.push({
        mutationId: `transfer:${TID}:${PID_A}:receive:E1`,
      });
      await sweep();
      expect(bStock(PID_A, BRANCH_B)).toBe(3); // not 6
      expect(transfer().pendingReceipts).toBe(0);
      expect(transfer().items[0].convergedReceiptEventIds).toContain('E1');
    });

    it('final receipt unresolved: transfer completes only after convergence', async () => {
      await bootInTransit();
      strandReceipt('E1', 0, 10);
      expect(transfer().status).toBe('in_transit'); // never falsely received
      await sweep();
      expect(transfer().status).toBe('received');
      expect(bStock(PID_A, BRANCH_B)).toBe(10);
      expect(transfer().pendingReceipts).toBe(0);
    });

    it('one converged + one unresolved event: only the open event replays', async () => {
      await bootInTransit();
      const t = transfer();
      // E1 fully converged (claimed + stock + mark).
      strandReceipt('E1', 0, 3);
      t.items[0].convergedReceiptEventIds.push('E1');
      t.pendingReceipts -= 1;
      products.get(PID_A).branchInventory[BRANCH_B].stock += 3;
      products.get(PID_A).stockMutations.push({
        mutationId: `transfer:${TID}:${PID_A}:receive:E1`,
      });
      // E2 claimed, stock missing.
      strandReceipt('E2', 0, 2);
      await sweep();
      expect(bStock(PID_A, BRANCH_B)).toBe(5); // 3 + 2, not 3+3+2
      expect(transfer().pendingReceipts).toBe(0);
    });

    it('repeated + concurrent sweeps on a claimed receipt: credit once', async () => {
      await bootInTransit();
      strandReceipt('E1', 0, 4);
      await Promise.all([sweep(), sweep(), sweep()]);
      await sweep();
      expect(bStock(PID_A, BRANCH_B)).toBe(4);
      expect(transfer().pendingReceipts).toBe(0);
    });

    it('fresh in-flight claim is NOT recovered (age gate per event)', async () => {
      await bootInTransit();
      strandReceipt('E1', 0, 3, 0, FRESH);
      const results = await sweep();
      expect(outcomes(results)).toEqual(['NOT_STALE']);
      expect(bStock(PID_A, BRANCH_B)).toBe(0);
      expect(transfer().pendingReceipts).toBe(1);
    });

    it('claimed event without a persisted payload record → manual review', async () => {
      await bootInTransit();
      const t = transfer();
      t.items[0].receivedQuantity = 3;
      t.items[0].receiptEventIds = ['E1']; // claim marker, no receiptEvents record
      t.pendingReceipts = 1;
      const results = await sweep();
      expect(outcomes(results)).toEqual(['MANUAL_REVIEW_REQUIRED']);
      expect(transfer().pendingReceipts).toBe(1); // evidence retained
    });

    it('recovered receipt reuses E1 — never mints E2', async () => {
      await bootInTransit();
      strandReceipt('E1', 0, 3);
      await sweep();
      const eventIds = adjustments.map((a: any) => a.mutationId);
      expect(eventIds).toEqual([`transfer:${TID}:${PID_A}:receive:E1`]);
    });
  });

  describe('transfer cancel claims', () => {
    /** A stranded cancel follows a completed ship — source already debited. */
    const strandCancel = (age: Date | undefined = OLD) => {
      const t = transfer();
      t.status = 'in_transit';
      t.cancelClaimId = `transfer:${TID}:cancel`;
      t.cancelStartedAt = age;
      for (const item of t.items) {
        const pid = item.productId.toString();
        products.get(pid).branchInventory[BRANCH_A].stock -= item.quantity;
      }
    };

    it('claim before any restore: outstanding restored once, cancelled', async () => {
      boot();
      strandCancel();
      const results = await sweep();
      expect(outcomes(results)).toEqual(['CONVERGED']);
      expect(bStock(PID_A, BRANCH_A)).toBe(20); // 10 + all 10 restored
      expect(transfer().status).toBe('cancelled');
    });

    it('partial restore before crash: restored line no-ops, rest converge', async () => {
      boot({
        transferItems: [
          { productId: PID_A, quantity: 4 },
          { productId: PID_B, quantity: 3 },
        ],
      });
      strandCancel(); // A:20->16, B:20->17 (shipped)
      products.get(PID_A).branchInventory[BRANCH_A].stock += 4;
      products.get(PID_A).stockMutations.push({
        mutationId: `transfer:${TID}:${PID_A}:cancel-restore`,
      });
      await sweep();
      expect(bStock(PID_A, BRANCH_A)).toBe(20); // not 24
      expect(bStock(PID_B, BRANCH_A)).toBe(20);
      expect(transfer().status).toBe('cancelled');
    });

    it('partially received transfer: only outstanding quantity restored', async () => {
      boot();
      strandCancel(); // shipped: A 20->10
      transfer().items[0].receivedQuantity = 4; // 4 already at destination
      await sweep();
      expect(bStock(PID_A, BRANCH_A)).toBe(16); // 10 + 6, not +10
      expect(transfer().status).toBe('cancelled');
    });

    it('concurrent cancel sweeps restore exactly once', async () => {
      boot();
      strandCancel();
      await Promise.all([sweep(), sweep()]);
      expect(bStock(PID_A, BRANCH_A)).toBe(20);
      expect(
        adjustments.filter((a) => a.mutationId?.includes('cancel-restore')),
      ).toHaveLength(1);
    });
  });

  describe('visibility + isolation', () => {
    it('listStrandedClaims reports open claims with staleness', async () => {
      boot({ purchaseClaimed: true, transferStatus: 'in_transit' });
      strandReceipt('E1', 0, 3);
      const list = await recovery.listStrandedClaims(SHOP);
      const kinds = list.map((c) => c.workflow).sort();
      expect(kinds).toEqual(['purchase_receive', 'transfer_receipt']);
      expect(list.every((c) => c.stale)).toBe(true);
    });

    it('stranded-claims list is tenant-scoped', async () => {
      boot({ purchaseClaimed: true });
      const mine = await recovery.listStrandedClaims(SHOP);
      const other = await recovery.listStrandedClaims(OTHER_SHOP);
      expect(mine).toHaveLength(1);
      expect(other).toHaveLength(0);
    });

    it('normal path unaffected: synchronous receive still works', async () => {
      boot({ transferStatus: 'in_transit' });
      const t = await transferService.receive(
        TID,
        SHOP,
        USER,
        [{ productId: PID_A, receivedQuantity: 5, damagedQuantity: 0 }],
        undefined,
        'E-normal',
      );
      expect(t.status).toBe('partially_received');
      expect(bStock(PID_A, BRANCH_B)).toBe(5);
    });
  });
});
