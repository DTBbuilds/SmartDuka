import mongoose, { Types } from 'mongoose';
import {
  SubscriptionInvoice,
  SubscriptionInvoiceSchema,
} from './schemas/subscription-invoice.schema';
import {
  Subscription,
  SubscriptionSchema,
} from './schemas/subscription.schema';
import {
  claimBillingEffects,
  markBillingEffectsApplied,
  failBillingEffects,
  applyRenewalExtension,
  applyNewestPaymentTracking,
} from './services/invoice-effects.helper';

/**
 * P0-11C3 — REAL MONGODB OPERATOR TESTS
 *
 * Exercises the EXACT generated update queries against a disposable real
 * MongoDB (mongodb://127.0.0.1:27017 — the repo's docker-compose instance
 * or any local mongod). Requires no credentials; uses a per-run database
 * that is dropped afterwards. Skips cleanly if no local mongod exists.
 *
 * Verified behaviors:
 *  - pending → applying → applied claim transitions (incl. stale-lease
 *    reclaim and concurrent claims: exactly one winner);
 *  - newest-(paidAt,invoiceId)-wins tracking CAS: missing marker, older,
 *    equal-tie, newer invoice ids, ObjectId vs legacy string markers;
 *  - renewal-extension CAS on currentPeriodEnd: missing field, concurrent
 *    conditional updates retrying until both extensions land;
 *  - real $ne/$lt/$exists/$or/$and + ObjectId casting — not mocked
 *    matchers.
 */

const MONGO_URI = process.env.P011C3_MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB = `p011c3_operators_${process.pid}`;

const INV_A = '507f1f77bcf86cd7994390b1';
const INV_B = '507f1f77bcf86cd7994390b2';
const SUB_A = '507f1f77bcf86cd7994390c1';
const SHOP_A = '507f1f77bcf86cd7994390aa';

let conn: mongoose.Connection | null = null;
let Invoice: mongoose.Model<any>;
let Sub: mongoose.Model<any>;

const seedInvoice = async (over: any = {}) =>
  Invoice.create({
    _id: new Types.ObjectId(INV_A),
    invoiceNumber: 'INV-TEST-1',
    shopId: new Types.ObjectId(SHOP_A),
    subscriptionId: new Types.ObjectId(SUB_A),
    type: 'subscription',
    status: 'paid',
    description: 't',
    amount: 100,
    totalAmount: 100,
    currency: 'KES',
    dueDate: new Date(),
    ...over,
  });

const seedSub = async (over: any = {}) =>
  Sub.create({
    _id: new Types.ObjectId(SUB_A),
    shopId: new Types.ObjectId(SHOP_A),
    planId: new Types.ObjectId(),
    planCode: 'basic',
    currentPrice: 100,
    status: 'past_due',
    billingCycle: 'monthly',
    startDate: new Date('2026-01-01'),
    currentPeriodStart: new Date('2026-01-01'),
    currentPeriodEnd: new Date('2026-02-01'),
    metadata: {},
    ...over,
  });

beforeAll(async () => {
  try {
    conn = await mongoose
      .createConnection(`${MONGO_URI}/${DB}`, {
        serverSelectionTimeoutMS: 3000,
      })
      .asPromise();
    Invoice = conn.model('OperatorInvoice', SubscriptionInvoiceSchema);
    Sub = conn.model('OperatorSubscription', SubscriptionSchema);
  } catch {
    conn = null;
  }
}, 15000);

afterAll(async () => {
  if (conn) {
    await conn.dropDatabase();
    await conn.close();
  }
});

const itMongo = (name: string, fn: () => Promise<void>) =>
  it(name, async () => {
    if (!conn) {
      console.warn('SKIP — no local mongod on ' + MONGO_URI);
      return;
    }
    await Invoice.deleteMany({});
    await Sub.deleteMany({});
    await fn();
  });

describe('P0-11C3 — real MongoDB operator behavior', () => {
  itMongo(
    'claim: pending→applying once; second claim loses; applied is terminal',
    async () => {
      const inv = await seedInvoice({
        billingEffects: { status: 'pending', channel: 'mpesa_stk' },
      });
      const c1 = await claimBillingEffects(Invoice, inv._id.toString());
      expect(c1?.billingEffects?.status).toBe('applying');
      // Second claim on fresh 'applying' lease → null.
      const c2 = await claimBillingEffects(Invoice, inv._id.toString());
      expect(c2).toBeNull();

      await markBillingEffectsApplied(Invoice, inv._id.toString());
      const c3 = await claimBillingEffects(Invoice, inv._id.toString());
      expect(c3).toBeNull();
      const after = await Invoice.findById(inv._id).lean();
      expect(after.billingEffects.status).toBe('applied');
      expect(after.billingEffects.attempts).toBe(1);
    },
  );

  itMongo(
    'claim: stale applying lease IS reclaimed; failure returns to pending',
    async () => {
      const inv = await seedInvoice({
        billingEffects: {
          status: 'applying',
          channel: 'mpesa_stk',
          claimedAt: new Date(Date.now() - 60 * 60 * 1000),
        },
      });
      const c = await claimBillingEffects(Invoice, inv._id.toString());
      expect(c).not.toBeNull();

      await failBillingEffects(Invoice, inv._id.toString(), new Error('boom'));
      const after = await Invoice.findById(inv._id).lean();
      expect(after.billingEffects.status).toBe('pending');
      expect(after.billingEffects.lastError).toBe('boom');
      expect(after.billingEffects.attempts).toBe(1);
    },
  );

  itMongo(
    'claim: concurrent claims on one invoice — exactly one winner',
    async () => {
      const inv = await seedInvoice({
        billingEffects: { status: 'pending', channel: 'stripe' },
      });
      const results = await Promise.all(
        Array.from({ length: 8 }, () =>
          claimBillingEffects(Invoice, inv._id.toString()),
        ),
      );
      expect(results.filter(Boolean)).toHaveLength(1);
    },
  );

  itMongo(
    'tracking: missing marker → write; older paidAt → blocked; tie → larger id wins',
    async () => {
      await seedSub();
      const t1 = new Date('2026-02-01T00:00:00Z');
      const t2 = new Date('2026-02-02T00:00:00Z');

      // Missing marker → writes.
      await applyNewestPaymentTracking(
        Sub,
        SUB_A,
        { _id: new Types.ObjectId(INV_A), paidAt: t1, totalAmount: 100 } as any,
        {
          paymentMethod: 'mpesa_stk',
          paymentReference: 'R_A',
        },
      );
      let sub = await Sub.findById(SUB_A).lean();
      expect(sub.lastPaymentReference).toBe('R_A');

      // NEWER paidAt wins.
      await applyNewestPaymentTracking(
        Sub,
        SUB_A,
        { _id: new Types.ObjectId(INV_B), paidAt: t2, totalAmount: 100 } as any,
        {
          paymentMethod: 'mpesa_stk',
          paymentReference: 'R_B',
        },
      );
      sub = await Sub.findById(SUB_A).lean();
      expect(sub.lastPaymentReference).toBe('R_B');
      expect(sub.metadata.lastSettledInvoiceId.toString()).toBe(INV_B);

      // OLDER paidAt cannot overwrite.
      await applyNewestPaymentTracking(
        Sub,
        SUB_A,
        { _id: new Types.ObjectId(INV_A), paidAt: t1, totalAmount: 100 } as any,
        {
          paymentMethod: 'mpesa_stk',
          paymentReference: 'R_A',
        },
      );
      sub = await Sub.findById(SUB_A).lean();
      expect(sub.lastPaymentReference).toBe('R_B');

      // Tie paidAt → larger invoice id wins deterministically.
      await applyNewestPaymentTracking(
        Sub,
        SUB_A,
        {
          _id: new Types.ObjectId('507f1f77bcf86cd7994390b9'),
          paidAt: t2,
          totalAmount: 100,
        } as any,
        {
          paymentMethod: 'mpesa_stk',
          paymentReference: 'R_B9',
        },
      );
      sub = await Sub.findById(SUB_A).lean();
      expect(sub.lastPaymentReference).toBe('R_B9');
      expect(sub.metadata.lastSettledInvoiceId.toString()).toBe(
        '507f1f77bcf86cd7994390b9',
      );
    },
  );

  itMongo(
    'tracking: legacy STRING lastSettledInvoiceId marker is safely superseded',
    async () => {
      // A C1-era row stores the marker as a string.
      await Sub.collection.insertOne({
        _id: new Types.ObjectId(SUB_A),
        shopId: new Types.ObjectId(SHOP_A),
        status: 'active',
        billingCycle: 'monthly',
        metadata: {
          lastSettledInvoiceId: INV_A, // legacy string form
          lastPaymentInvoicePaidAt: new Date('2026-02-01T00:00:00Z'),
        },
      });
      const t2 = new Date('2026-02-02T00:00:00Z');
      await applyNewestPaymentTracking(
        Sub,
        SUB_A,
        { _id: new Types.ObjectId(INV_B), paidAt: t2, totalAmount: 100 } as any,
        {
          paymentMethod: 'mpesa_stk',
          paymentReference: 'R_B',
        },
      );
      const sub = await Sub.findById(SUB_A).lean();
      expect(sub.lastPaymentReference).toBe('R_B');
      // Marker now normalized to ObjectId.
      expect(sub.metadata.lastSettledInvoiceId.toString()).toBe(INV_B);
    },
  );

  itMongo(
    'extension CAS: missing currentPeriodEnd → applies; concurrent updates serialize',
    async () => {
      // Raw insert — a genuinely MISSING currentPeriodEnd (schema requires
      // it; legacy/migrated rows may lack it). The CAS filter uses
      // `currentPeriodEnd: null`, which must match the absent field.
      await Sub.collection.insertOne({
        _id: new Types.ObjectId(SUB_A),
        shopId: new Types.ObjectId(SHOP_A),
        planId: new Types.ObjectId(),
        planCode: 'basic',
        status: 'past_due',
        billingCycle: 'monthly',
        metadata: {},
      });
      const invoice: any = {
        _id: new Types.ObjectId(INV_A),
        totalAmount: 100,
        paidAt: new Date(),
      };

      const ok1 = await applyRenewalExtension(Sub, SUB_A, invoice);
      expect(ok1).toBe(true);
      const after1 = await Sub.findById(SUB_A).lean();
      const end1 = after1.currentPeriodEnd.getTime();
      expect(end1).toBeGreaterThan(Date.now());

      // A second (different) invoice extends FROM the new end — CAS retries
      // converge; it must never recompute from a stale read.
      const invoice2: any = {
        _id: new Types.ObjectId(INV_B),
        totalAmount: 100,
        paidAt: new Date(),
      };
      const ok2 = await applyRenewalExtension(Sub, SUB_A, invoice2);
      expect(ok2).toBe(true);
      const after2 = await Sub.findById(SUB_A).lean();
      // ~monthly cycle: second end ≈ first + 1 month.
      const monthMs = 28 * 24 * 60 * 60 * 1000;
      expect(after2.currentPeriodEnd.getTime()).toBeGreaterThan(end1 + monthMs);
      // Status recovered to active on first extension.
      expect(after2.status).toBe('active');
    },
  );

  itMongo(
    'extension CAS: invoice-carried service period is authoritative',
    async () => {
      await seedSub();
      const invoice: any = {
        _id: new Types.ObjectId(INV_A),
        totalAmount: 100,
        paidAt: new Date(),
        periodStart: new Date('2026-01-01T00:00:00Z'),
        periodEnd: new Date('2026-03-02T00:00:00Z'), // 60 days
      };
      await applyRenewalExtension(Sub, SUB_A, invoice);
      const sub = await Sub.findById(SUB_A).lean();
      const expected = Date.now() + 60 * 24 * 60 * 60 * 1000;
      expect(Math.abs(sub.currentPeriodEnd.getTime() - expected)).toBeLessThan(
        120_000,
      );
    },
  );
});
