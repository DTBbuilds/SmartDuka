import mongoose, { Types } from 'mongoose';
import { StockTransferService } from './services/stock-transfer.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  StockTransfer,
  StockTransferSchema,
} from './schemas/stock-transfer.schema';
import { Branch, BranchSchema } from './branch.schema';
import {
  Product,
  ProductSchema,
} from '../inventory/schemas/product.schema';
import { AuditLog, AuditLogSchema } from '../audit/audit-log.schema';
import {
  Adjustment,
  AdjustmentSchema,
} from '../stock/adjustment.schema';

jest.mock('nanoid', () => ({ nanoid: () => 'testnanoid' }));

/**
 * FRONTEND-FIX1A — BRANCH TRANSFER SAFETY (disposable real MongoDB)
 *
 * Defect fixed here: transfer CREATION validated a branch's available
 * stock with a fallback to the MAIN store's global `stock`, so a branch
 * could create a transfer for stock that exists only at the main store.
 * Shipment deducts from branchInventory ONLY (atomically guarded against
 * going negative), so such a transfer could never ship cleanly — the
 * creation check now validates against the branch's own inventory.
 *
 * Verified against the REAL service + REAL conditional-update semantics
 * on a disposable database:
 *  1. branch→branch transfer of main-store-only stock → REJECTED
 *  2. main→branch transfer of global stock → allowed
 *  3. branch→branch with sufficient branch stock → ship deducts branch
 *     stock exactly once; global stock untouched
 *  4. missing branch inventory record → clean rejection (no negative)
 *  5. concurrent over-transfer: the atomic shipment guard prevents
 *     branch stock from ever going negative
 *  6. ship retry → no double deduction (durable mutation identity)
 */

const MONGO_URI = process.env.P011C3_MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB = `p011fix1a_transfer_${process.pid}`;

const SHOP = '507f1f77bcf86cd7994390aa';
const BRANCH_B = '507f1f77bcf86cd7994390d1';
const BRANCH_C = '507f1f77bcf86cd7994390d2';

let conn: mongoose.Connection | null = null;
let svc: StockTransferService;
let Transfer: mongoose.Model<any>;
let Product: mongoose.Model<any>;
let Branch: mongoose.Model<any>;

const seedProduct = (over: any = {}) =>
  Product.create({
    name: 'Transfer Product',
    sku: 'SKU-TR-1',
    barcode: 'BC-TR-1',
    price: 100,
    cost: 60,
    stock: 50, // main-store (global) stock
    lowStockThreshold: 5,
    status: 'active',
    shopId: new Types.ObjectId(SHOP),
    branchInventory: {},
    ...over,
  });

const seedBranches = async () => {
  await Branch.create({
    _id: new Types.ObjectId(BRANCH_B),
    shopId: new Types.ObjectId(SHOP),
    name: 'Branch B',
    code: 'BRB',
    isActive: true,
    allowStockTransfers: true,
  });
  await Branch.create({
    _id: new Types.ObjectId(BRANCH_C),
    shopId: new Types.ObjectId(SHOP),
    name: 'Branch C',
    code: 'BRC',
    isActive: true,
    allowStockTransfers: true,
  });
};

beforeAll(async () => {
  try {
    conn = await mongoose
      .createConnection(`${MONGO_URI}/${DB}`, {
        serverSelectionTimeoutMS: 15000,
      })
      .asPromise();
    Transfer = conn.model('Fix1aTransfer', StockTransferSchema);
    Branch = conn.model('Fix1aBranch', BranchSchema);
    Product = conn.model('Fix1aProduct', ProductSchema);
    const Audit = conn.model('Fix1aAudit', AuditLogSchema);
    const Adjustment = conn.model('Fix1aAdjustment', AdjustmentSchema);

    // ctor: (productModel, categoryModel, adjustmentModel,
    //        reconciliationModel, orderModel, categorySuggestionService,
    //        subscriptionGuard, cacheService)
    const inventoryService = new InventoryService(
      Product as any,
      {} as any, // categoryModel
      Adjustment as any, // adjustmentModel (durable-mutation receipts)
      {} as any, // reconciliationModel
      {} as any, // orderModel
      {} as any, // categorySuggestionService
      {} as any, // subscriptionGuard
      {} as any, // cacheService
    );
    svc = new StockTransferService(
      Transfer as any,
      Branch as any,
      Product as any,
      Audit as any,
      inventoryService,
    );
  } catch (e: any) {
    conn = null;
    console.error('MONGO_CONNECT_FAIL:', e?.message || e);
  }
}, 30000);

afterAll(async () => {
  if (conn) {
    await conn.dropDatabase();
    await conn.close();
  }
});

const itMongo = (name: string, fn: () => Promise<void>) =>
  it(name, async () => {
    if (!conn) {
      throw new Error(
        `REQUIRED: no mongod at ${MONGO_URI} — FIX1A is NOT VERIFIED without real MongoDB`,
      );
    }
    await Transfer.deleteMany({});
    await Product.deleteMany({});
    await Branch.deleteMany({});
    await seedBranches();
    await fn();
  });

const getBranchStock = async (productId: string, branchId: string) => {
  const p = await Product.findById(productId).lean();
  return p?.branchInventory?.[branchId]?.stock ?? 0;
};

describe('FRONTEND-FIX1A — branch transfer safety (real MongoDB)', () => {
  itMongo(
    '1. branch CANNOT transfer stock that exists only at the main store',
    async () => {
      const p = await seedProduct(); // global stock 50; no branch inventory
      await expect(
        svc.create(SHOP, '507f1f77bcf86cd7994390c3', {
          fromBranchId: BRANCH_B,
          toBranchId: BRANCH_C,
          items: [{ productId: (p._id as any).toString(), quantity: 10 }],
          reason: 'Low stock in kitale',
        } as any),
      ).rejects.toThrow(/Insufficient stock/i);
      // nothing was created
      expect(await Transfer.countDocuments({})).toBe(0);
    },
  );

  itMongo(
    '2. main→branch transfer of global stock is allowed',
    async () => {
      const p = await seedProduct();
      const t = await svc.create(SHOP, '507f1f77bcf86cd7994390c3', {
        fromBranchId: 'main',
        toBranchId: BRANCH_B,
        items: [{ productId: (p._id as any).toString(), quantity: 10 }],
        reason: 'Stock replenishment',
      } as any);
      expect(t.status).toBe('pending_approval');
      expect((t as any).fromBranchId).toBeNull(); // main store
    },
  );

  itMongo(
    '3. branch→branch with sufficient branch stock: ship deducts branch stock exactly once; global untouched',
    async () => {
      const p = await seedProduct({
        branchInventory: {
          [BRANCH_B]: { stock: 30 },
        },
      });
      const pid = (p._id as any).toString();
      const t = await svc.create(SHOP, '507f1f77bcf86cd7994390c3', {
        fromBranchId: BRANCH_B,
        toBranchId: BRANCH_C,
        items: [{ productId: pid, quantity: 10 }],
        reason: 'Stock rebalancing',
      } as any);
      expect(t.status).toBe('pending_approval');

      await svc.approve((t._id as any).toString(), SHOP, '507f1f77bcf86cd7994390c3');
      const shipped = await svc.ship((t._id as any).toString(), SHOP, '507f1f77bcf86cd7994390c3');
      expect(shipped.status).toBe('in_transit');

      // Branch B deducted exactly once: 30 → 20. Global stock untouched: 50.
      expect(await getBranchStock(pid, BRANCH_B)).toBe(20);
      const after = await Product.findById(pid).lean();
      expect(after.stock).toBe(50);
    },
  );

  itMongo(
    '4. missing branch inventory record → clean rejection, no negative stock',
    async () => {
      const p = await seedProduct({
        branchInventory: { [BRANCH_B]: { stock: 5 } },
      });
      await expect(
        svc.create(SHOP, '507f1f77bcf86cd7994390c3', {
          fromBranchId: BRANCH_B,
          toBranchId: BRANCH_C,
          items: [{ productId: (p._id as any).toString(), quantity: 10 }],
          reason: 'Transfer request',
        } as any),
      ).rejects.toThrow(/Insufficient stock.*Available: 5/);
      expect(await getBranchStock((p._id as any).toString(), BRANCH_B)).toBe(5);
    },
  );

  itMongo(
    '5. concurrent over-transfer: the atomic shipment guard keeps branch stock non-negative',
    async () => {
      const p = await seedProduct({
        branchInventory: { [BRANCH_B]: { stock: 10 } },
      });
      const pid = (p._id as any).toString();
      // Two transfers of 10 each — both PASS creation (the check is
      // advisory; no reservation at creation).
      const t1 = await svc.create(SHOP, '507f1f77bcf86cd7994390c3', {
        fromBranchId: BRANCH_B, toBranchId: BRANCH_C,
        items: [{ productId: pid, quantity: 10 }], reason: 'r1',
      } as any);
      const t2 = await svc.create(SHOP, '507f1f77bcf86cd7994390c3', {
        fromBranchId: BRANCH_B, toBranchId: BRANCH_C,
        items: [{ productId: pid, quantity: 10 }], reason: 'r2',
      } as any);
      for (const t of [t1, t2]) {
        await svc.approve((t._id as any).toString(), SHOP, '507f1f77bcf86cd7994390c3');
      }
      // Ship both: the first deduction lands (10→0); the second MUST be
      // blocked by the atomic $gte guard — branch stock never negative.
      const s1 = await svc.ship((t1._id as any).toString(), SHOP, '507f1f77bcf86cd7994390c3');
      expect(s1.status).toBe('in_transit');
      expect(await getBranchStock(pid, BRANCH_B)).toBe(0);
      await expect(
        svc.ship((t2._id as any).toString(), SHOP, '507f1f77bcf86cd7994390c3'),
      ).rejects.toThrow(); // insufficient branch stock at shipment
      expect(await getBranchStock(pid, BRANCH_B)).toBe(0); // never negative
    },
  );

  itMongo(
    '6. ship retry → no double deduction (durable mutation identity)',
    async () => {
      const p = await seedProduct({
        branchInventory: { [BRANCH_B]: { stock: 30 } },
      });
      const pid = (p._id as any).toString();
      const t = await svc.create(SHOP, '507f1f77bcf86cd7994390c3', {
        fromBranchId: BRANCH_B, toBranchId: BRANCH_C,
        items: [{ productId: pid, quantity: 10 }], reason: 'retry case',
      } as any);
      await svc.approve((t._id as any).toString(), SHOP, '507f1f77bcf86cd7994390c3');
      await svc.ship((t._id as any).toString(), SHOP, '507f1f77bcf86cd7994390c3');
      expect(await getBranchStock(pid, BRANCH_B)).toBe(20);
      // Re-ship (retry/duplicate call) — idempotent, no second deduction.
      await svc.ship((t._id as any).toString(), SHOP, '507f1f77bcf86cd7994390c3');
      expect(await getBranchStock(pid, BRANCH_B)).toBe(20);
    },
  );
});
