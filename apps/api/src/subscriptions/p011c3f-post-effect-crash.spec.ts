import mongoose, { Types } from 'mongoose';
import {
  SubscriptionInvoice,
  SubscriptionInvoiceSchema,
} from './schemas/subscription-invoice.schema';
import {
  Subscription,
  SubscriptionSchema,
} from './schemas/subscription.schema';
import { Shop, ShopSchema } from '../shops/schemas/shop.schema';
import { SubscriptionMpesaService } from './subscription-mpesa.service';
import { SubscriptionsService } from './subscriptions.service';
import { InvoicePaymentAuthorityService } from './services/invoice-payment-authority.service';
import { BillingEffectsReconciliationService } from './services/billing-effects-reconciliation.service';
import * as fx from './services/invoice-effects.helper';

/**
 * P0-11C3-FINAL — POST-EFFECT CRASH SAFETY GATE (real MongoDB)
 *
 * Runs the ACTUAL settlement services against a disposable real mongod
 * (mongodb://127.0.0.1:27017). Real conditional updates, real schema,
 * real lease/claim semantics — nothing about persistence is mocked.
 *
 * Critical window under test:
 *   claim → subscription entitlement write COMMITS → process crashes
 *   BEFORE billingEffects.status = 'applied' → claim lease expires →
 *   reconciliation worker reclaims and retries.
 *
 * Required: the retried invoice must NEVER apply its entitlement a second
 * time (no double period extension), and must eventually reach 'applied'.
 *
 * Crash injection: jest.spyOn(fx, 'markBillingEffectsApplied') — the
 * services resolve the helper through the module object at call time, so
 * the injected throw lands exactly at the marker boundary, after the
 * subscription update has already committed.
 */

const MONGO_URI = process.env.P011C3_MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB = `p011c3f_crash_${process.pid}`;

const INV_A = '507f1f77bcf86cd7994390b1';
const INV_B = '507f1f77bcf86cd7994390b2';
const SUB_A = '507f1f77bcf86cd7994390c1';
const SHOP_A = '507f1f77bcf86cd7994390aa';
const LEASE_MS = fx.EFFECT_CLAIM_LEASE_MS;

let conn: mongoose.Connection | null = null;
let Invoice: mongoose.Model<any>;
let Sub: mongoose.Model<any>;
let Shop: mongoose.Model<any>;
let mpesa: SubscriptionMpesaService;
let subsSvc: SubscriptionsService;
let stripeAuth: InvoicePaymentAuthorityService;
let worker: BillingEffectsReconciliationService;

const now = () => new Date();

const seedInvoice = (over: any = {}) =>
  Invoice.create({
    _id: new Types.ObjectId(INV_A),
    invoiceNumber: `INV-${Math.random().toString(36).slice(2, 8)}`,
    shopId: new Types.ObjectId(SHOP_A),
    subscriptionId: new Types.ObjectId(SUB_A),
    type: 'subscription',
    status: 'paid',
    paidAt: now(),
    description: 'renewal',
    amount: 100,
    totalAmount: 100,
    currency: 'KES',
    dueDate: now(),
    paymentMethod: 'mpesa_stk',
    mpesaReceiptNumber: 'R_TEST_1',
    billingEffects: { status: 'pending', channel: 'mpesa_stk' },
    ...over,
  });

const seedSub = (over: any = {}) =>
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
    failedPaymentAttempts: 1,
    metadata: {},
    ...over,
  });

const seedShop = (over: any = {}) =>
  Shop.create({
    _id: new Types.ObjectId(SHOP_A),
    name: 'Shop A',
    email: `shop-${Math.random().toString(36).slice(2, 8)}@t.co`,
    phone: `2547${Math.floor(Math.random() * 1e8)}`,
    shopId: `SHP-${Math.random().toString(36).slice(2, 8)}`,
    city: 'Nairobi',
    businessType: 'retail',
    status: 'suspended',
    subscriptionStatus: 'suspended',
    ...over,
  });

/** Expire an invoice's live 'applying' claim so the worker can reclaim. */
const expireClaim = async (invoiceId: string) =>
  Invoice.updateOne(
    { _id: new Types.ObjectId(invoiceId) },
    {
      $set: {
        'billingEffects.claimedAt': new Date(Date.now() - LEASE_MS - 1000),
      },
    },
  );

/** Crash exactly at the marker boundary for the next effects application. */
const crashOnce = () =>
  jest
    .spyOn(fx, 'markBillingEffectsApplied')
    .mockRejectedValueOnce(new Error('process died before applied marker'));

beforeAll(async () => {
  try {
    conn = await mongoose
      .createConnection(`${MONGO_URI}/${DB}`, {
        serverSelectionTimeoutMS: 3000,
      })
      .asPromise();
    Invoice = conn.model('CrashInvoice', SubscriptionInvoiceSchema);
    Sub = conn.model('CrashSubscription', SubscriptionSchema);
    Shop = conn.model('CrashShop', ShopSchema);
  } catch {
    conn = null;
    return;
  }

  const stub: any = {};
  const cfgStub: any = { get: () => '' };
  subsSvc = new SubscriptionsService(
    Sub as any,
    stub, // planModel
    Invoice as any,
    Shop as any,
    stub, // productModel
    stub, // userModel
    stub, // systemConfigModel
    cfgStub,
    stub, // emailService
  );
  mpesa = new SubscriptionMpesaService(
    Invoice as any,
    Sub as any,
    stub, // systemConfigModel
    stub, // paymentAttemptModel
    Shop as any,
    stub, // userModel
    stub, // planModel
    cfgStub,
    stub, // encryptionService
    stub, // emailService
    subsSvc,
  );
  stripeAuth = new InvoicePaymentAuthorityService(Invoice as any, Sub as any);
  worker = new BillingEffectsReconciliationService(
    Invoice as any,
    stripeAuth,
    mpesa,
    subsSvc,
  );
}, 20000);

afterAll(async () => {
  if (conn) {
    await conn.dropDatabase();
    await conn.close();
  }
});

afterEach(() => jest.restoreAllMocks());

const itMongo = (name: string, fn: () => Promise<void>) =>
  it(name, async () => {
    if (!conn) {
      // Mandatory DB test — fail loudly, never silently skip.
      throw new Error(
        `REQUIRED: no mongod at ${MONGO_URI} — this gate is NOT VERIFIED without real MongoDB`,
      );
    }
    await Invoice.deleteMany({});
    await Sub.deleteMany({});
    await Shop.deleteMany({});
    await fn();
  });

const getSub = () => Sub.findById(SUB_A).lean();
const getInv = (id: string) => Invoice.findById(id).lean();

describe('P0-11C3-FINAL — post-effect crash safety (real MongoDB)', () => {
  itMongo(
    'M-Pesa renewal WITH invoice period terms: crash after extension → worker retry does not double-extend',
    async () => {
      const pStart = new Date('2026-02-01');
      const pEnd = new Date('2026-03-03'); // 30 days
      await seedSub();
      await seedShop();
      const inv = await seedInvoice({
        periodStart: pStart,
        periodEnd: pEnd,
      });

      // Settle + claim + apply effects, crash before applied marker.
      crashOnce();
      await expect(mpesa.ensureStkBillingEffects(INV_A)).rejects.toThrow(
        'process died',
      );

      const subAfterCrash = await getSub();
      const end1 = subAfterCrash.currentPeriodEnd.getTime();
      const invAfterCrash = await getInv(INV_A);
      // The extension committed; the marker did not. (Injected throw →
      // released to 'pending'; a hard kill would leave 'applying' — both
      // are recoverable incomplete states.)
      expect(end1).toBeGreaterThan(Date.now());
      expect(['applying', 'pending']).toContain(
        invAfterCrash.billingEffects.status,
      );

      // Lease expiry → worker recovery ×3 → replayed settlement.
      await expireClaim(INV_A);
      for (let i = 0; i < 3; i++) {
        await worker.reconcilePendingBillingEffects();
      }
      await mpesa.ensureStkBillingEffects(INV_A); // replayed payment event

      const sub = await getSub();
      const invFinal = await getInv(INV_A);
      expect(sub.currentPeriodEnd.getTime()).toBe(end1);
      expect(invFinal.billingEffects.status).toBe('applied');
    },
  );

  itMongo(
    'M-Pesa renewal LEGACY invoice (no period terms): crash after extension → exactly one monthly extension',
    async () => {
      await seedSub();
      await seedShop();
      await seedInvoice(); // no periodStart/periodEnd

      crashOnce();
      await expect(mpesa.ensureStkBillingEffects(INV_A)).rejects.toThrow(
        'process died',
      );

      const end1 = (await getSub()).currentPeriodEnd.getTime();

      await expireClaim(INV_A);
      await worker.reconcilePendingBillingEffects();
      await worker.reconcilePendingBillingEffects();

      const sub = await getSub();
      expect(sub.currentPeriodEnd.getTime()).toBe(end1);
      expect((await getInv(INV_A)).billingEffects.status).toBe('applied');
    },
  );

  itMongo(
    'manual verification: crash after activation → ensureManualBillingEffects does not re-extend',
    async () => {
      await seedSub({ status: 'expired' });
      await seedShop();
      await Invoice.create({
        _id: new Types.ObjectId(INV_A),
        invoiceNumber: 'INV-MAN-1',
        shopId: new Types.ObjectId(SHOP_A),
        subscriptionId: new Types.ObjectId(SUB_A),
        type: 'subscription',
        status: 'pending_verification',
        description: 'manual renewal',
        amount: 100,
        totalAmount: 100,
        currency: 'KES',
        dueDate: now(),
        paymentMethod: 'mpesa_manual',
        manualPayment: { pendingVerification: true },
      });

      crashOnce();
      // verifyAndActivatePayment swallows the marker failure — effects are
      // durable but the claim lease is still live.
      await subsSvc.verifyAndActivatePayment(INV_A, 'admin-1');

      const end1 = (await getSub()).currentPeriodEnd.getTime();
      const invAfterCrash = await getInv(INV_A);
      expect(end1).toBeGreaterThan(Date.now());
      expect(['applying', 'pending']).toContain(
        invAfterCrash.billingEffects.status,
      );

      await expireClaim(INV_A);
      await worker.reconcilePendingBillingEffects();
      await worker.reconcilePendingBillingEffects();

      const sub = await getSub();
      const inv = await getInv(INV_A);
      expect(sub.currentPeriodEnd.getTime()).toBe(end1);
      expect(sub.setupPaid).toBe(true);
      expect(sub.status).toBe('active');
      expect(inv.billingEffects.status).toBe('applied');
      expect(inv.billingEffects.channel).toBe('manual');
      // No fabricated provider payment.
      expect(inv.stkPayment).toBeUndefined();
    },
  );

  itMongo(
    'setup invoice (stripe): crash after setup effects → retry is idempotent, no duplicate entitlement',
    async () => {
      await seedSub({ setupPaid: false, status: 'past_due' });
      await Invoice.create({
        _id: new Types.ObjectId(INV_A),
        invoiceNumber: 'INV-SETUP-1',
        shopId: new Types.ObjectId(SHOP_A),
        subscriptionId: new Types.ObjectId(SUB_A),
        type: 'setup',
        status: 'paid',
        paidAt: now(),
        description: 'setup',
        amount: 50,
        totalAmount: 50,
        currency: 'KES',
        dueDate: now(),
        paymentMethod: 'stripe',
        paymentReference: 'pi_setup_1',
        billingEffects: { status: 'pending', channel: 'stripe' },
      });

      crashOnce();
      await expect(
        stripeAuth.ensureBillingEffects(INV_A, SHOP_A),
      ).rejects.toThrow('process died');
      expect((await getSub()).setupPaid).toBe(true);

      await expireClaim(INV_A);
      await worker.reconcilePendingBillingEffects();
      await stripeAuth.ensureBillingEffects(INV_A, SHOP_A); // replay

      const sub = await getSub();
      const inv = await getInv(INV_A);
      expect(sub.setupPaid).toBe(true);
      expect(inv.billingEffects.status).toBe('applied');
    },
  );

  itMongo(
    'upgrade invoice: crash after activatePendingUpgrade → no repeated activation',
    async () => {
      await seedSub({
        status: 'active',
        pendingUpgrade: {
          invoiceId: INV_A,
          planCode: 'pro',
        },
      });
      // Realistic activation semantics: clears pendingUpgrade atomically
      // (the self-guard the real method relies on).
      const activateSpy = jest
        .spyOn(subsSvc, 'activatePendingUpgrade')
        .mockImplementation(async () => {
          await Sub.updateOne(
            { _id: new Types.ObjectId(SUB_A) },
            { $unset: { pendingUpgrade: 1 }, $set: { planCode: 'pro' } },
          );
          return { planCode: 'pro' } as any;
        });
      await seedInvoice({ type: 'upgrade' });

      crashOnce();
      await expect(mpesa.ensureStkBillingEffects(INV_A)).rejects.toThrow(
        'process died',
      );
      expect(activateSpy).toHaveBeenCalledTimes(1);

      await expireClaim(INV_A);
      await worker.reconcilePendingBillingEffects();
      await mpesa.ensureStkBillingEffects(INV_A); // replay

      // Upgrade self-guards on pendingUpgrade (cleared) — and the retry
      // must NOT fall through to a spurious renewal extension.
      expect(activateSpy).toHaveBeenCalledTimes(1);
      const sub = await getSub();
      expect(sub.currentPeriodEnd.getTime()).toBe(
        new Date('2026-02-01').getTime(),
      );
      expect((await getInv(INV_A)).billingEffects.status).toBe('applied');
    },
  );

  itMongo(
    'historical A/B: A crashes post-write → B settles → A retry → B replay → worker — both entitlements once',
    async () => {
      const pA1 = new Date('2026-02-01');
      const pA2 = new Date('2026-03-03');
      const pB1 = new Date('2026-03-03');
      const pB2 = new Date('2026-04-02');
      await seedSub({ status: 'active' });
      await seedShop({ status: 'active', subscriptionStatus: 'active' });
      const invA = await seedInvoice({
        periodStart: pA1,
        periodEnd: pA2,
        paidAt: new Date('2026-02-01T10:00:00Z'),
        mpesaReceiptNumber: 'RECEIPT_A',
      });
      await Invoice.create({
        _id: new Types.ObjectId(INV_B),
        invoiceNumber: 'INV-B-1',
        shopId: new Types.ObjectId(SHOP_A),
        subscriptionId: new Types.ObjectId(SUB_A),
        type: 'subscription',
        status: 'paid',
        paidAt: new Date('2026-03-05T10:00:00Z'),
        description: 'renewal B',
        amount: 100,
        totalAmount: 100,
        currency: 'KES',
        dueDate: now(),
        paymentMethod: 'mpesa_stk',
        mpesaReceiptNumber: 'RECEIPT_B',
        periodStart: pB1,
        periodEnd: pB2,
        billingEffects: { status: 'pending', channel: 'mpesa_stk' },
      });

      // A settles, crashes post-extension.
      crashOnce();
      await expect(mpesa.ensureStkBillingEffects(INV_A)).rejects.toThrow(
        'process died',
      );
      const endAfterA = (await getSub()).currentPeriodEnd.getTime();

      // B settles fully while A is incomplete.
      await mpesa.ensureStkBillingEffects(INV_B);
      const endAfterB = (await getSub()).currentPeriodEnd.getTime();
      expect(endAfterB).toBeGreaterThan(endAfterA);

      // A retried (claim lease expired) + B replayed + worker sweep.
      await expireClaim(INV_A);
      await worker.reconcilePendingBillingEffects();
      await mpesa.ensureStkBillingEffects(INV_B); // replay B
      await worker.reconcilePendingBillingEffects();

      const sub = await getSub();
      const invAFinal = await getInv(INV_A);
      const invBFinal = await getInv(INV_B);

      // Both entitlements applied EXACTLY once: end == endAfterB and no
      // third extension materialized.
      expect(sub.currentPeriodEnd.getTime()).toBe(endAfterB);
      // Newer-paid invoice B owns the tracking fields.
      expect(sub.lastPaymentReference).toBe('RECEIPT_B');
      expect(invAFinal.billingEffects.status).toBe('applied');
      expect(invBFinal.billingEffects.status).toBe('applied');
    },
  );
});
