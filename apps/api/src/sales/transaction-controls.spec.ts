import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { TransactionControlsService } from './transaction-controls.service';
import { ShiftsService } from '../shifts/shifts.service';
import { ReconciliationService } from '../financial/reconciliation.service';
import { Order } from './schemas/order.schema';
import { User } from '../users/schemas/user.schema';
import { Product } from '../inventory/schemas/product.schema';
import { Shift } from '../shifts/schemas/shift.schema';
import { Reconciliation } from '../financial/reconciliation.schema';
import { InventoryService } from '../inventory/inventory.service';

jest.mock('nanoid', () => ({ nanoid: () => 'IDEM' }));

/**
 * P0-10 — POST-SALE FINANCIAL INTEGRITY SHIELD
 *
 * In-memory store implementing the exact Mongo semantics the service relies
 * on: updateOne evaluates $expr/pipeline stages against the document AT WRITE
 * TIME (synchronous apply = the atomicity guarantee a conditional update or
 * pipeline update gives in MongoDB). Two "concurrent" requests interleave at
 * awaits but serialize on the atomic write — exactly like real MongoDB.
 */
describe('P0-10 post-sale financial controls', () => {
  const SHOP_A = '507f1f77bcf86cd799439011';
  const SHOP_B = '507f1f77bcf86cd799439099';
  const ADMIN = '507f1f77bcf86cd7994390a1';
  const CASHIER_OK = '507f1f77bcf86cd7994390a2';
  const CASHIER_NO_REFUND = '507f1f77bcf86cd7994390a3';
  const CASHIER_LIMITED = '507f1f77bcf86cd7994390a4';
  const CASHIER_NEEDS_APPROVAL = '507f1f77bcf86cd7994390a5';
  const PRODUCT_1 = '507f1f77bcf86cd7994390b1';
  const PRODUCT_2 = '507f1f77bcf86cd7994390b2';

  // ────────────────── minimal mongo-semantics store ──────────────────

  function getPath(doc: any, path: string): any {
    const parts = path.split('.');
    let cur: any = doc;
    for (let i = 0; i < parts.length; i++) {
      if (cur === undefined || cur === null) return undefined;
      const p = parts[i];
      if (Array.isArray(cur)) {
        if (/^\d+$/.test(p)) {
          cur = cur[Number(p)];
        } else {
          const rest = parts.slice(i).join('.');
          return cur
            .map((el) => getPath(el, rest))
            .filter((v) => v !== undefined);
        }
      } else {
        cur = cur[p];
      }
    }
    return cur;
  }

  function setPath(doc: any, path: string, value: any): void {
    const parts = path.split('.');
    let cur = doc;
    for (let i = 0; i < parts.length - 1; i++) {
      if (cur[parts[i]] === undefined) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  function evalExpr(e: any, doc: any, vars: Record<string, any> = {}): any {
    if (e === null || e === undefined) return e;
    if (typeof e === 'string') {
      if (e.startsWith('$$')) return getPath(vars, e.slice(2));
      if (e.startsWith('$')) return getPath(doc, e.slice(1));
      return e;
    }
    if (Array.isArray(e) || typeof e !== 'object' || e instanceof Date) {
      return e;
    }
    const keys = Object.keys(e);
    if (keys.length === 1 && keys[0].startsWith('$')) {
      const op = keys[0];
      const arg = e[op];
      const ev = (x: any) => evalExpr(x, doc, vars);
      switch (op) {
        case '$add':
          return arg.reduce((s: number, x: any) => s + (ev(x) ?? 0), 0);
        case '$subtract':
          return (ev(arg[0]) ?? 0) - (ev(arg[1]) ?? 0);
        case '$max':
          return Math.max(...arg.map(ev));
        case '$lte':
          return ev(arg[0]) <= ev(arg[1]);
        case '$gte':
          return ev(arg[0]) >= ev(arg[1]);
        case '$gt':
          return ev(arg[0]) > ev(arg[1]);
        case '$eq':
          return String(ev(arg[0])) === String(ev(arg[1]));
        case '$ne':
          return String(ev(arg[0])) !== String(ev(arg[1]));
        case '$and':
          return arg.every(ev);
        case '$or':
          return arg.some(ev);
        case '$ifNull': {
          const v = ev(arg[0]);
          return v === undefined || v === null ? ev(arg[1]) : v;
        }
        case '$sum': {
          const v = ev(arg);
          if (v === undefined || v === null) return 0;
          return Array.isArray(v) ? v.reduce((s, x) => s + (x ?? 0), 0) : v;
        }
        case '$map': {
          const input = ev(arg.input) ?? [];
          return input.map((el: any) =>
            evalExpr(arg.in, doc, { ...vars, [arg.as]: el }),
          );
        }
        case '$filter': {
          const input = ev(arg.input) ?? [];
          return input.filter((el: any) =>
            evalExpr(arg.cond, doc, { ...vars, [arg.as]: el }),
          );
        }
        case '$cond': {
          if (Array.isArray(arg)) return ev(arg[0]) ? ev(arg[1]) : ev(arg[2]);
          return ev(arg.if) ? ev(arg.then) : ev(arg.else);
        }
        case '$concatArrays':
          return arg.flatMap((x: any) => ev(x) ?? []);
        case '$literal':
          return arg;
        default:
          throw new Error(`evalExpr: unsupported op ${op}`);
      }
    }
    const out: any = {};
    for (const k of keys) out[k] = evalExpr(e[k], doc, vars);
    return out;
  }

  function eqVal(a: any, b: any): boolean {
    return String(a) === String(b);
  }

  function matchFilter(doc: any, filter: any): boolean {
    for (const [k, v] of Object.entries(filter)) {
      if (k === '$expr') {
        if (!evalExpr(v, doc)) return false;
        continue;
      }
      const actual = getPath(doc, k);
      const isOpObj =
        v !== null &&
        typeof v === 'object' &&
        !Array.isArray(v) &&
        !(v instanceof Date) &&
        Object.keys(v).some((x) => x.startsWith('$'));
      if (isOpObj) {
        for (const [op, val] of Object.entries(v as any)) {
          if (op === '$exists') {
            if ((actual !== undefined) !== val) return false;
          } else if (op === '$ne') {
            if (Array.isArray(actual)) {
              if (actual.some((a) => eqVal(a, val))) return false;
            } else if (actual !== undefined && eqVal(actual, val)) {
              return false;
            }
          } else if (op === '$in') {
            if (!(val as any[]).some((x) => eqVal(actual, x))) return false;
          }
        }
      } else {
        if (Array.isArray(actual)) {
          if (!actual.some((a) => eqVal(a, v))) return false;
        } else if (!eqVal(actual, v)) {
          return false;
        }
      }
    }
    return true;
  }

  function applyUpdate(doc: any, update: any): void {
    const stages = Array.isArray(update) ? update : [update];
    for (const stage of stages) {
      if (stage.$set) {
        for (const [k, v] of Object.entries(stage.$set)) {
          const isExpr =
            v !== null &&
            typeof v === 'object' &&
            !(v instanceof Date) &&
            !Array.isArray(v) &&
            Object.keys(v).some((x) => x.startsWith('$'));
          setPath(doc, k, isExpr ? evalExpr(v, doc) : v);
        }
      }
      if (stage.$push) {
        for (const [k, v] of Object.entries(stage.$push)) {
          const arr = getPath(doc, k) ?? [];
          arr.push(v);
          setPath(doc, k, arr);
        }
      }
    }
  }

  class Collection {
    docs: any[] = [];

    /** Mongoose queries are both awaitable and .exec()-able. */
    private wrap(result: any) {
      const p: any = Promise.resolve(result);
      p.exec = () => Promise.resolve(result);
      p.sort = () => p;
      p.limit = () => p;
      p.lean = () => p;
      return p;
    }

    findOne(filter: any) {
      return this.wrap(
        this.docs.find((doc) => matchFilter(doc, filter)) ?? null,
      );
    }

    find(filter: any) {
      return this.wrap(this.docs.filter((doc) => matchFilter(doc, filter)));
    }

    updateOne(filter: any, update: any) {
      // ATOMIC: predicate + apply happen synchronously against the stored doc.
      const d = this.docs.find((doc) => matchFilter(doc, filter));
      if (!d) {
        return this.wrap({ matchedCount: 0, modifiedCount: 0 });
      }
      applyUpdate(d, update);
      return this.wrap({ matchedCount: 1, modifiedCount: 1 });
    }

    aggregate(pipeline: any[]) {
      let rows = this.docs.slice();
      const result = (() => {
        for (const stage of pipeline) {
          if (stage.$match) {
            rows = rows.filter((d) => matchFilter(d, stage.$match));
          } else if (stage.$project) {
            rows = rows.map((d) => {
              const out: any = {};
              for (const [k, v] of Object.entries(stage.$project)) {
                out[k] = v === 1 ? getPath(d, k) : evalExpr(v, d);
              }
              return out;
            });
          } else if (stage.$group) {
            const groups = new Map<string, any>();
            for (const d of rows) {
              const key = JSON.stringify(evalExpr(stage.$group._id, d));
              if (!groups.has(key)) {
                const init: any = { _id: evalExpr(stage.$group._id, d) };
                for (const [k, v] of Object.entries(stage.$group)) {
                  if (k === '_id') continue;
                  init[k] = 0;
                }
                groups.set(key, init);
              }
              const g = groups.get(key)!;
              for (const [k, v] of Object.entries(stage.$group)) {
                if (k === '_id') continue;
                if ((v as any).$sum !== undefined) {
                  const val = evalExpr((v as any).$sum, d);
                  g[k] += val === 1 ? 1 : (val ?? 0);
                }
              }
            }
            rows = [...groups.values()];
          }
        }
        return rows;
      })();
      return this.wrap(result);
    }
  }

  // ─────────────────────────── fixtures ───────────────────────────

  const orderStore = new Collection();
  const productStore = new Collection();
  const userStore = new Collection();

  let appliedMutations: Map<string, number>; // mutationId -> qty (idempotent)
  let updateStockCalls: { mutationId: string; quantityDelta: number }[];
  let failOnUpdateStockCall: number; // 0 = never; N = throw on Nth call
  let updateStockCallCount: number;

  const inventoryServiceMock = {
    updateStock: jest
      .fn()
      .mockImplementation(
        async (
          shopId: string,
          productId: string,
          quantityDelta: number,
          meta: any,
        ) => {
          updateStockCallCount++;
          if (updateStockCallCount === failOnUpdateStockCall) {
            throw new Error('simulated crash during stock compensation');
          }
          const mutationId = meta.mutationId;
          // Canonical idempotency: same mutationId = no second effect.
          if (appliedMutations.has(mutationId)) {
            const product = productStore.docs.find(
              (p) => String(p._id) === productId && String(p.shopId) === shopId,
            );
            return { stock: product?.stock };
          }
          const product = productStore.docs.find(
            (p) => String(p._id) === productId && String(p.shopId) === shopId,
          );
          if (!product) throw new Error('product not found');
          if (product.stock + quantityDelta < 0) {
            throw new Error('insufficient stock');
          }
          product.stock += quantityDelta;
          product.stockMutations = product.stockMutations ?? [];
          product.stockMutations.push({ mutationId, quantityDelta });
          appliedMutations.set(mutationId, quantityDelta);
          updateStockCalls.push({ mutationId, quantityDelta });
          return { stock: product.stock };
        },
      ),
  };

  function seedUser(id: string, role: string, permissions: any = {}) {
    userStore.docs.push({
      _id: new Types.ObjectId(id),
      shopId: new Types.ObjectId(SHOP_A),
      role,
      permissions,
    });
  }

  function seedOrder(overrides: any): any {
    const doc: any = {
      _id: new Types.ObjectId(overrides._id ?? '507f1f77bcf86cd7994390c1'),
      shopId: new Types.ObjectId(SHOP_A),
      orderNumber: overrides.orderNumber ?? 'ORD-1',
      status: 'completed',
      paymentStatus: 'paid',
      transactionType: 'sale',
      items: [
        { productId: PRODUCT_1, name: 'Widget', quantity: 2, unitPrice: 50 },
      ],
      subtotal: 100,
      tax: 0,
      total: 100,
      payments: [{ method: 'cash', amount: 100, status: 'completed' }],
      refunds: [],
      discounts: [],
      ...overrides,
    };
    if (overrides._id) doc._id = new Types.ObjectId(overrides._id);
    if (overrides.shopId) doc.shopId = new Types.ObjectId(overrides.shopId);
    orderStore.docs.push(doc);
    return doc;
  }

  let service: TransactionControlsService;

  async function boot() {
    orderStore.docs = [];
    productStore.docs = [];
    userStore.docs = [];
    appliedMutations = new Map();
    updateStockCalls = [];
    updateStockCallCount = 0;
    failOnUpdateStockCall = 0;
    inventoryServiceMock.updateStock.mockClear();

    seedUser(ADMIN, 'admin');
    seedUser(CASHIER_OK, 'cashier', {
      canRefund: true,
      canVoid: true,
      canDiscount: true,
    });
    seedUser(CASHIER_NO_REFUND, 'cashier', { canRefund: false });
    seedUser(CASHIER_LIMITED, 'cashier', {
      canRefund: true,
      maxRefundAmount: 30,
      canDiscount: true,
      maxDiscountAmount: 15,
    });
    seedUser(CASHIER_NEEDS_APPROVAL, 'cashier', {
      canRefund: true,
      refundRequiresApproval: true,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionControlsService,
        { provide: getModelToken(Order.name), useValue: orderStore },
        { provide: getModelToken(User.name), useValue: userStore },
        { provide: getModelToken(Product.name), useValue: productStore },
        { provide: InventoryService, useValue: inventoryServiceMock },
      ],
    }).compile();

    service = module.get(TransactionControlsService);
  }

  const refund = (
    orderId: string,
    dto: any,
    actor: string = ADMIN,
    shopId: string = SHOP_A,
  ) => service.processRefund(orderId, shopId, dto, actor);

  const voidOp = (orderId: string, dto: any, actor: string = ADMIN) =>
    service.voidTransaction(orderId, SHOP_A, dto, actor);

  const discount = (orderId: string, dto: any, actor: string = ADMIN) =>
    service.applyDiscount(orderId, SHOP_A, dto, actor);

  // ─────────────────────────── REFUND ───────────────────────────

  describe('refund — cumulative bound + immutability', () => {
    it('accepts a partial refund and preserves the settled sale basis', async () => {
      await boot();
      const order = seedOrder({});
      const updated = await refund(String(order._id), {
        refundOperationId: 'r-1',
        refundAmount: 40,
        refundReason: 'damaged item',
      });
      expect(updated.refunds).toHaveLength(1);
      expect(updated.refundStatus).toBe('partially_refunded');
      expect(updated.status).toBe('completed'); // never rewritten to void
      expect(updated.total).toBe(100); // settled sale value immutable
      expect(updated.subtotal).toBe(100);
      expect(updated.payments).toHaveLength(1);
      expect(updated.payments[0].amount).toBe(100); // payment truth intact
      expect(updated.refunds[0].status).toBe('completed'); // cash = honest
      expect(String(updated.refunds[0].requestedBy)).toBe(ADMIN);
      expect(String(updated.refunds[0].approvedBy)).toBe(ADMIN);
    });

    it('accepts two sequential partial refunds within the paid bound and preserves both events', async () => {
      await boot();
      const order = seedOrder({});
      await refund(String(order._id), {
        refundOperationId: 'r-1',
        refundAmount: 40,
        refundReason: 'first',
      });
      const after = await refund(String(order._id), {
        refundOperationId: 'r-2',
        refundAmount: 50,
        refundReason: 'second',
      });
      expect(after.refunds).toHaveLength(2); // append-only history
      expect(after.refunds.map((r: any) => r.refundOperationId)).toEqual([
        'r-1',
        'r-2',
      ]);
      expect(after.refunds[0].reason).toBe('first'); // not overwritten
      expect(after.refunds[1].reason).toBe('second');
      expect(after.refundStatus).toBe('partially_refunded');
    });

    it('rejects cumulative oversubscription (R1+R2 > paid)', async () => {
      await boot();
      const order = seedOrder({});
      await refund(String(order._id), {
        refundOperationId: 'r-1',
        refundAmount: 60,
        refundReason: 'first',
      });
      // each <= order.total but 60+60 > 100 paid → must fail
      await expect(
        refund(String(order._id), {
          refundOperationId: 'r-2',
          refundAmount: 60,
          refundReason: 'second',
        }),
      ).rejects.toThrow(/exceed/i);
      const final = orderStore.docs.find(
        (d) => String(d._id) === String(order._id),
      );
      expect(final.refunds).toHaveLength(1);
    });

    it('bounds refunds by paid amount, not order total', async () => {
      await boot();
      // total 100 but only 60 confirmed paid (partial)
      const order = seedOrder({
        paymentStatus: 'partial',
        payments: [
          { method: 'cash', amount: 60, status: 'completed' },
          { method: 'mpesa', amount: 40, status: 'pending' },
        ],
      });
      await expect(
        refund(String(order._id), {
          refundOperationId: 'r-1',
          refundAmount: 70,
          refundReason: 'too much',
        }),
      ).rejects.toThrow();
    });

    it('two concurrent refunds cannot oversubscribe paid amount', async () => {
      await boot();
      const order = seedOrder({});
      const [a, b] = await Promise.allSettled([
        refund(String(order._id), {
          refundOperationId: 'r-a',
          refundAmount: 70,
          refundReason: 'A',
        }),
        refund(String(order._id), {
          refundOperationId: 'r-b',
          refundAmount: 70,
          refundReason: 'B',
        }),
      ]);
      const succeeded = [a, b].filter((r) => r.status === 'fulfilled');
      expect(succeeded).toHaveLength(1); // exactly one wins
      const final = orderStore.docs[0];
      const totalRefunded = final.refunds.reduce(
        (s: number, r: any) => s + r.amount,
        0,
      );
      expect(totalRefunded).toBeLessThanOrEqual(100);
      expect(final.refunds).toHaveLength(1);
    });
  });

  describe('refund — idempotency', () => {
    it('same key replayed ×5 produces one event and one financial effect', async () => {
      await boot();
      const order = seedOrder({});
      for (let i = 0; i < 5; i++) {
        await refund(String(order._id), {
          refundOperationId: 'r-1',
          refundAmount: 40,
          refundReason: 'same',
        });
      }
      const final = orderStore.docs[0];
      expect(final.refunds).toHaveLength(1);
      expect(final.refunds.reduce((s: number, r: any) => s + r.amount, 0)).toBe(
        40,
      );
    });

    it('same key concurrent requests produce one event', async () => {
      await boot();
      const order = seedOrder({});
      const dto = {
        refundOperationId: 'r-1',
        refundAmount: 40,
        refundReason: 'same',
      };
      const results = await Promise.allSettled(
        Array(4).fill(refund(String(order._id), dto)),
      );
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
      expect(orderStore.docs[0].refunds).toHaveLength(1);
    });

    it('same key + different amount → 409 Conflict', async () => {
      await boot();
      const order = seedOrder({});
      await refund(String(order._id), {
        refundOperationId: 'r-1',
        refundAmount: 40,
        refundReason: 'same',
      });
      await expect(
        refund(String(order._id), {
          refundOperationId: 'r-1',
          refundAmount: 55,
          refundReason: 'same',
        }),
      ).rejects.toThrow(/409|Conflict|already used/i);
    });

    it('same key + different reason → 409', async () => {
      await boot();
      const order = seedOrder({});
      await refund(String(order._id), {
        refundOperationId: 'r-1',
        refundAmount: 40,
        refundReason: 'first reason',
      });
      await expect(
        refund(String(order._id), {
          refundOperationId: 'r-1',
          refundAmount: 40,
          refundReason: 'different reason',
        }),
      ).rejects.toThrow(/already used/i);
    });

    it('refund requires a refundOperationId', async () => {
      await boot();
      const order = seedOrder({});
      await expect(
        refund(String(order._id), {
          refundAmount: 40,
          refundReason: 'no key',
        }),
      ).rejects.toThrow('refundOperationId');
    });
  });

  describe('refund — status separation + payment truth', () => {
    it('full refund does NOT turn the sale into void', async () => {
      await boot();
      const order = seedOrder({});
      const after = await refund(String(order._id), {
        refundOperationId: 'r-full',
        refundAmount: 100,
        refundReason: 'complete refund',
      });
      expect(after.status).toBe('completed'); // NOT 'void'
      expect(after.refundStatus).toBe('refunded');
      expect(after.transactionType).toBe('sale'); // lifecycle preserved
    });

    it('mpesa refund is recorded manual_required — never claimed completed', async () => {
      await boot();
      const order = seedOrder({
        payments: [{ method: 'mpesa', amount: 100, status: 'completed' }],
      });
      const after = await refund(String(order._id), {
        refundOperationId: 'r-mp',
        refundAmount: 50,
        refundReason: 'customer request',
      });
      expect(after.refunds[0].status).toBe('manual_required');
      expect(after.payments[0].status).toBe('completed'); // truth preserved
    });

    it('refund on an unpaid order is rejected', async () => {
      await boot();
      const order = seedOrder({
        paymentStatus: 'unpaid',
        payments: [{ method: 'cash', amount: 100, status: 'failed' }],
      });
      await expect(
        refund(String(order._id), {
          refundOperationId: 'r-1',
          refundAmount: 40,
          refundReason: 'x',
        }),
      ).rejects.toThrow(/confirmed payment/i);
    });

    it('refund on a pending external-payment order is rejected', async () => {
      await boot();
      const order = seedOrder({
        status: 'pending',
        paymentStatus: 'unpaid',
        payments: [{ method: 'mpesa', amount: 100, status: 'pending' }],
      });
      await expect(
        refund(String(order._id), {
          refundOperationId: 'r-1',
          refundAmount: 40,
          refundReason: 'x',
        }),
      ).rejects.toThrow(/completed sales/i);
    });
  });

  describe('refund — split payments', () => {
    const splitOrder = () =>
      seedOrder({
        payments: [
          { method: 'cash', amount: 50, status: 'completed' },
          { method: 'mpesa', amount: 50, status: 'completed' },
        ],
      });

    it('ambiguous allocation without explicit breakdown fails closed', async () => {
      await boot();
      const order = splitOrder();
      await expect(
        refund(String(order._id), {
          refundOperationId: 'r-1',
          refundAmount: 30,
          refundReason: 'x',
        }),
      ).rejects.toThrow(/ambiguous/i);
    });

    it('validated explicit allocation is accepted with per-method provenance', async () => {
      await boot();
      const order = splitOrder();
      const after = await refund(String(order._id), {
        refundOperationId: 'r-1',
        refundAmount: 80,
        refundReason: 'x',
        allocations: [
          { method: 'cash', amount: 50 },
          { method: 'mpesa', amount: 30 },
        ],
      });
      expect(after.refunds[0].allocations).toEqual([
        { method: 'cash', amount: 50 },
        { method: 'mpesa', amount: 30 },
      ]);
      expect(after.refunds[0].status).toBe('manual_required'); // mixed → mpesa leg unconfirmed
    });

    it('allocation exceeding a method’s confirmed amount is rejected', async () => {
      await boot();
      const order = splitOrder();
      await expect(
        refund(String(order._id), {
          refundOperationId: 'r-1',
          refundAmount: 60,
          refundReason: 'x',
          allocations: [{ method: 'cash', amount: 60 }],
        }),
      ).rejects.toThrow(/exceeds confirmed/i);
    });

    it('allocations that do not sum to the refund amount are rejected', async () => {
      await boot();
      const order = splitOrder();
      await expect(
        refund(String(order._id), {
          refundOperationId: 'r-1',
          refundAmount: 60,
          refundReason: 'x',
          allocations: [{ method: 'cash', amount: 40 }],
        }),
      ).rejects.toThrow(/sum/i);
    });

    it('per-method cumulative bound is enforced atomically across refunds', async () => {
      await boot();
      const order = splitOrder();
      await refund(String(order._id), {
        refundOperationId: 'r-1',
        refundAmount: 50,
        refundReason: 'cash refund',
        allocations: [{ method: 'cash', amount: 50 }],
      });
      // cash leg fully consumed — another cash allocation must fail even
      // though total refunded (50) < total paid (100)
      await expect(
        refund(String(order._id), {
          refundOperationId: 'r-2',
          refundAmount: 20,
          refundReason: 'second',
          allocations: [{ method: 'cash', amount: 20 }],
        }),
      ).rejects.toThrow();
    });
  });

  describe('refund — permissions + tenancy', () => {
    it('cashier without canRefund is denied even via the route role', async () => {
      await boot();
      const order = seedOrder({});
      await expect(
        refund(
          String(order._id),
          { refundOperationId: 'r-1', refundAmount: 10, refundReason: 'x' },
          CASHIER_NO_REFUND,
        ),
      ).rejects.toThrow(/permission/i);
    });

    it('cashier refund above maxRefundAmount is denied', async () => {
      await boot();
      const order = seedOrder({});
      await expect(
        refund(
          String(order._id),
          { refundOperationId: 'r-1', refundAmount: 50, refundReason: 'x' },
          CASHIER_LIMITED,
        ),
      ).rejects.toThrow(/limit/i);
    });

    it('cashier within their limit succeeds and is recorded as requester', async () => {
      await boot();
      const order = seedOrder({});
      const after = await refund(
        String(order._id),
        { refundOperationId: 'r-1', refundAmount: 25, refundReason: 'x' },
        CASHIER_LIMITED,
      );
      expect(after.refunds[0].amount).toBe(25);
      expect(String(after.refunds[0].requestedBy)).toBe(CASHIER_LIMITED);
    });

    it('approval-required cashier cannot self-approve — fails closed', async () => {
      await boot();
      const order = seedOrder({});
      await expect(
        refund(
          String(order._id),
          { refundOperationId: 'r-1', refundAmount: 20, refundReason: 'x' },
          CASHIER_NEEDS_APPROVAL,
        ),
      ).rejects.toThrow(/approval/i);
    });

    it('cross-tenant order mutation is denied', async () => {
      await boot();
      const order = seedOrder({});
      await expect(
        refund(
          String(order._id),
          { refundOperationId: 'r-1', refundAmount: 10, refundReason: 'x' },
          ADMIN,
          SHOP_B,
        ),
      ).rejects.toThrow(/not found|Actor/i);
    });
  });

  // ──────────────────────────── VOID ────────────────────────────

  const pendingUnpaidOrder = (overrides: any = {}) =>
    seedOrder({
      status: 'pending',
      paymentStatus: 'unpaid',
      payments: [{ method: 'mpesa', amount: 100, status: 'pending' }],
      items: [
        { productId: PRODUCT_1, name: 'Widget', quantity: 3, unitPrice: 20 },
        { productId: PRODUCT_2, name: 'Gadget', quantity: 1, unitPrice: 40 },
      ],
      ...overrides,
    });

  const seedProductWithSaleReceipt = (
    productId: string,
    orderId: string,
    deductedQty: number,
    currentStock: number,
  ) => {
    productStore.docs.push({
      _id: new Types.ObjectId(productId),
      shopId: new Types.ObjectId(SHOP_A),
      name: 'p',
      stock: currentStock,
      stockMutations: [
        {
          mutationId: `sale:${orderId}:${productId}`,
          quantityDelta: -deductedQty,
        },
      ],
    });
  };

  describe('void — eligibility', () => {
    it('paid order cannot be voided', async () => {
      await boot();
      const order = seedOrder({}); // completed + cash paid
      await expect(
        voidOp(String(order._id), {
          voidOperationId: 'v-1',
          voidReason: 'mistake',
        }),
      ).rejects.toThrow(/refund path/i);
      expect(orderStore.docs[0].status).toBe('completed');
    });

    it('partially paid order cannot be voided', async () => {
      await boot();
      const order = seedOrder({
        paymentStatus: 'partial',
        payments: [
          { method: 'cash', amount: 30, status: 'completed' },
          { method: 'mpesa', amount: 70, status: 'pending' },
        ],
      });
      await expect(
        voidOp(String(order._id), {
          voidOperationId: 'v-1',
          voidReason: 'mistake',
        }),
      ).rejects.toThrow(/refund path/i);
    });

    it('cashier without canVoid is denied', async () => {
      await boot();
      const order = pendingUnpaidOrder();
      await expect(
        voidOp(
          String(order._id),
          { voidOperationId: 'v-1', voidReason: 'x' },
          CASHIER_NO_REFUND, // has canRefund:false; also no canVoid
        ),
      ).rejects.toThrow(/permission/i);
    });
  });

  describe('void — stock compensation', () => {
    it('unpaid pending void restores each deducted line exactly once', async () => {
      await boot();
      const order = pendingUnpaidOrder();
      const oid = String(order._id);
      seedProductWithSaleReceipt(PRODUCT_1, oid, 3, 7);
      seedProductWithSaleReceipt(PRODUCT_2, oid, 1, 9);

      const after = await voidOp(oid, {
        voidOperationId: 'v-1',
        voidReason: 'customer abandoned',
      });

      expect(after.status).toBe('void');
      expect(after.voidOperation?.status).toBe('completed');
      expect(
        inventoryServiceMock.updateStock.mock.calls.map((c) => c[3].mutationId),
      ).toEqual([`void:${oid}:${PRODUCT_1}`, `void:${oid}:${PRODUCT_2}`]);
      const p1 = productStore.docs.find((p) => String(p._id) === PRODUCT_1);
      const p2 = productStore.docs.find((p) => String(p._id) === PRODUCT_2);
      expect(p1.stock).toBe(10); // 7 + 3
      expect(p2.stock).toBe(10); // 9 + 1
      expect(after.voidOperation?.stockRestorations).toHaveLength(2);
    });

    it('void retry adds zero additional stock', async () => {
      await boot();
      const order = pendingUnpaidOrder();
      const oid = String(order._id);
      seedProductWithSaleReceipt(PRODUCT_1, oid, 3, 7);
      seedProductWithSaleReceipt(PRODUCT_2, oid, 1, 9);

      await voidOp(oid, { voidOperationId: 'v-1', voidReason: 'r' });
      await voidOp(oid, { voidOperationId: 'v-1', voidReason: 'r' });
      await voidOp(oid, { voidOperationId: 'v-1', voidReason: 'r' });

      const p1 = productStore.docs.find((p) => String(p._id) === PRODUCT_1);
      expect(p1.stock).toBe(10); // restored once, not thrice
      expect(
        p1.stockMutations.filter((m: any) => m.mutationId.startsWith('void:')),
      ).toHaveLength(1);
    });

    it('crash after one line converges on retry — remaining lines restored once', async () => {
      await boot();
      const order = pendingUnpaidOrder();
      const oid = String(order._id);
      seedProductWithSaleReceipt(PRODUCT_1, oid, 3, 7);
      seedProductWithSaleReceipt(PRODUCT_2, oid, 1, 9);

      failOnUpdateStockCall = 2; // crash on the second line
      await expect(
        voidOp(oid, { voidOperationId: 'v-1', voidReason: 'crash test' }),
      ).rejects.toThrow('simulated crash');

      const mid = orderStore.docs[0];
      expect(mid.status).not.toBe('void'); // never finalized early
      expect(mid.voidOperation.status).toBe('in_progress'); // durable claim
      expect(
        productStore.docs.find((p) => String(p._id) === PRODUCT_1).stock,
      ).toBe(10);
      expect(
        productStore.docs.find((p) => String(p._id) === PRODUCT_2).stock,
      ).toBe(9); // not yet restored

      failOnUpdateStockCall = 0;
      const after = await voidOp(oid, {
        voidOperationId: 'v-1',
        voidReason: 'crash test',
      });
      expect(after.status).toBe('void');
      const p1 = productStore.docs.find((p) => String(p._id) === PRODUCT_1);
      const p2 = productStore.docs.find((p) => String(p._id) === PRODUCT_2);
      expect(p1.stock).toBe(10); // line 1 not double-restored
      expect(p2.stock).toBe(10); // line 2 completed on retry
      expect(
        p1.stockMutations.filter((m: any) => m.mutationId.startsWith('void:')),
      ).toHaveLength(1);
      expect(
        p2.stockMutations.filter((m: any) => m.mutationId.startsWith('void:')),
      ).toHaveLength(1);
    });

    it('concurrent voids converge — stock restored once, one canonical event', async () => {
      await boot();
      const order = pendingUnpaidOrder();
      const oid = String(order._id);
      seedProductWithSaleReceipt(PRODUCT_1, oid, 3, 7);
      seedProductWithSaleReceipt(PRODUCT_2, oid, 1, 9);

      await Promise.all([
        voidOp(oid, { voidOperationId: 'v-1', voidReason: 'race' }),
        voidOp(oid, { voidOperationId: 'v-1', voidReason: 'race' }),
      ]);

      const final = orderStore.docs[0];
      expect(final.status).toBe('void');
      expect(
        productStore.docs.find((p) => String(p._id) === PRODUCT_1).stock,
      ).toBe(10);
      expect(
        productStore.docs.find((p) => String(p._id) === PRODUCT_2).stock,
      ).toBe(10);
      expect(final.voidOperation.stockRestorations).toHaveLength(2);
    });

    it('conflicting void identity on an already-voided order fails closed', async () => {
      await boot();
      const order = pendingUnpaidOrder();
      const oid = String(order._id);
      seedProductWithSaleReceipt(PRODUCT_1, oid, 3, 7);
      seedProductWithSaleReceipt(PRODUCT_2, oid, 1, 9);

      await voidOp(oid, { voidOperationId: 'v-1', voidReason: 'first' });
      await expect(
        voidOp(oid, { voidOperationId: 'v-2', voidReason: 'second' }),
      ).rejects.toThrow(/different id/i);
    });

    it('void without sale stock evidence does not create stock mutations', async () => {
      await boot();
      const order = seedOrder({
        status: 'pending',
        paymentStatus: 'unpaid',
        payments: [], // nothing ever happened
      });
      // product exists but has no sale:<order>:<product> receipt
      productStore.docs.push({
        _id: new Types.ObjectId(PRODUCT_1),
        shopId: new Types.ObjectId(SHOP_A),
        stock: 10,
        stockMutations: [],
      });
      const after = await voidOp(String(order._id), {
        voidOperationId: 'v-1',
        voidReason: 'abandoned',
      });
      expect(after.status).toBe('void');
      expect(inventoryServiceMock.updateStock).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────── DISCOUNT ───────────────────────────

  describe('discount — fail-closed post-settlement', () => {
    it('discount on a completed sale is rejected', async () => {
      await boot();
      const order = seedOrder({});
      await expect(
        discount(String(order._id), {
          discountOperationId: 'd-1',
          discountAmount: 10,
          discountReason: 'loyalty favor',
        }),
      ).rejects.toThrow(/settled|paid|payment intent/i);
      expect(orderStore.docs[0].total).toBe(100); // untouched
    });

    it('discount on a pending order carrying payment intent is rejected', async () => {
      await boot();
      const order = pendingUnpaidOrder();
      await expect(
        discount(String(order._id), {
          discountOperationId: 'd-1',
          discountAmount: 10,
          discountReason: 'x',
        }),
      ).rejects.toThrow();
    });

    it('unsettled order with no payment intent discounts once, idempotently', async () => {
      await boot();
      const order = seedOrder({
        status: 'pending',
        paymentStatus: 'unpaid',
        payments: [],
      });
      const after = await discount(String(order._id), {
        discountOperationId: 'd-1',
        discountAmount: 10,
        discountReason: 'pre-settlement fix',
      });
      expect(after.total).toBe(90);
      expect(after.discounts).toHaveLength(1);
      expect(after.discountAmount).toBe(10);

      // retry same op → no double subtraction
      const again = await discount(String(order._id), {
        discountOperationId: 'd-1',
        discountAmount: 10,
        discountReason: 'pre-settlement fix',
      });
      expect(again.total).toBe(90);
      expect(again.discounts).toHaveLength(1);

      // same key, different intent → 409
      await expect(
        discount(String(order._id), {
          discountOperationId: 'd-1',
          discountAmount: 20,
          discountReason: 'pre-settlement fix',
        }),
      ).rejects.toThrow(/different intent/i);
    });

    it('cashier without canDiscount is denied; over-limit is denied', async () => {
      await boot();
      const order = seedOrder({
        status: 'pending',
        paymentStatus: 'unpaid',
        payments: [],
      });
      await expect(
        discount(
          String(order._id),
          {
            discountOperationId: 'd-1',
            discountAmount: 5,
            discountReason: 'x',
          },
          CASHIER_NO_REFUND,
        ),
      ).rejects.toThrow(/permission/i);
      await expect(
        discount(
          String(order._id),
          {
            discountOperationId: 'd-2',
            discountAmount: 20,
            discountReason: 'x',
          },
          CASHIER_LIMITED,
        ),
      ).rejects.toThrow(/limit/i);
    });
  });

  // ─────────────────────── CASH / TILL ───────────────────────

  describe('cash refund till correction', () => {
    it('shift expected cash = opening + confirmed cash receipts − completed cash refunds', async () => {
      await boot();
      const SHIFT = '507f1f77bcf86cd7994390d1';
      orderStore.docs.push({
        _id: new Types.ObjectId('507f1f77bcf86cd7994390c9'),
        shopId: new Types.ObjectId(SHOP_A),
        shiftId: new Types.ObjectId(SHIFT),
        status: 'completed',
        total: 50,
        payments: [{ method: 'cash', amount: 50, status: 'completed' }],
        refunds: [
          {
            refundOperationId: 'r-1',
            amount: 20,
            reason: 'x',
            status: 'completed',
            createdAt: new Date(),
            requestedBy: new Types.ObjectId(ADMIN),
            allocations: [{ method: 'cash', amount: 20 }],
          },
        ],
      });
      const shiftStore = new Collection();
      shiftStore.docs.push({
        _id: new Types.ObjectId(SHIFT),
        shopId: new Types.ObjectId(SHOP_A),
        openingBalance: 100,
      });

      const module = await Test.createTestingModule({
        providers: [
          ShiftsService,
          { provide: getModelToken(Shift.name), useValue: shiftStore },
          { provide: getModelToken('Order'), useValue: orderStore },
        ],
      }).compile();
      const shifts = module.get(ShiftsService);

      const data = await shifts.getShiftSalesData(SHIFT, SHOP_A);
      // opening 100 + cash 50 − cash refund 20 = 130, NOT 150
      expect(data.expectedCash).toBe(130);
      expect(data.totalSales).toBe(50);
    });

    it('daily reconciliation subtracts completed cash refunds and ignores manual_required', async () => {
      await boot();
      const now = new Date();
      orderStore.docs.push({
        _id: new Types.ObjectId('507f1f77bcf86cd7994390c9'),
        shopId: new Types.ObjectId(SHOP_A),
        createdAt: now,
        status: 'completed',
        paymentStatus: 'paid',
        payments: [{ method: 'cash', amount: 50, status: 'completed' }],
        refunds: [
          {
            refundOperationId: 'r-1',
            amount: 20,
            status: 'completed',
            createdAt: now,
            allocations: [{ method: 'cash', amount: 20 }],
          },
          {
            refundOperationId: 'r-2',
            amount: 10,
            status: 'manual_required', // money not actually moved yet
            createdAt: now,
            allocations: [{ method: 'cash', amount: 10 }],
          },
        ],
      });
      const reconStore = new Collection();
      const saved: any[] = [];
      const reconMock: any = {
        findOne: () => ({ exec: async () => null }),
      };
      reconMock.prototype = undefined;
      const module = await Test.createTestingModule({
        providers: [
          ReconciliationService,
          {
            provide: getModelToken(Reconciliation.name),
            useValue: Object.assign(
              function Ctor(this: any, arg: any) {
                saved.push(arg);
                return {
                  ...arg,
                  save: async () => {
                    saved[0] = arg;
                    return arg;
                  },
                };
              },
              { findOne: () => ({ exec: async () => null }) },
            ),
          },
          { provide: getModelToken(Order.name), useValue: orderStore },
        ],
      }).compile();
      const recon = module.get(ReconciliationService);

      const result = await recon.createDailyReconciliation(
        SHOP_A,
        now,
        30,
        ADMIN,
      );
      // 50 cash in − 20 completed refund (manual_required 10 ignored) = 30
      expect(result.expectedCash).toBe(30);
    });
  });
});
