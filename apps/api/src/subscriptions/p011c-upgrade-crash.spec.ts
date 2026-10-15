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
  SubscriptionPlan,
  SubscriptionPlanSchema,
} from './schemas/subscription-plan.schema';
import { Shop, ShopSchema } from '../shops/schemas/shop.schema';
import { SubscriptionMpesaService } from './subscription-mpesa.service';
import { SubscriptionsService } from './subscriptions.service';
import { InvoicePaymentAuthorityService } from './services/invoice-payment-authority.service';
import { BillingEffectsReconciliationService } from './services/billing-effects-reconciliation.service';
import * as fx from './services/invoice-effects.helper';

/**
 * P0-11C — FINAL UPGRADE CRASH GATE (real MongoDB)
 *
 * The upgrade activation flow saves the upgraded subscription BEFORE
 * completing the associated shop reactivation (both inside
 * activatePendingUpgrade). This gate reproduces:
 *
 *   suspended shop → legitimate upgrade invoice paid → subscription
 *   saved successfully → PROCESS CRASH before the shop update →
 *   invoice left incompletely reconciled → reconciliation worker retries.
 *
 * Required after recovery: correct upgraded plan, shop reactivated with
 * correct plan/expiration metadata, no duplicate upgrade, no accidental
 * renewal, invoice billingEffects applied.
 *
 * Also covers: crash after the subscription save but before the invoice's
 * entitlement marker is written.
 *
 * Crash injection is real persistence-boundary injection: the shop
 * document's save() throws once (crash between subscription save and shop
 * update), and fx.markBillingEffectsApplied throws once (crash between
 * effects and the applied marker). Everything else — models, conditional
 * updates, leases — is real MongoDB.
 */

const MONGO_URI = process.env.P011C3_MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB = `p011c_upgrade_${process.pid}`;

const INV_U = '507f1f77bcf86cd7994390b3';
const SUB_A = '507f1f77bcf86cd7994390c1';
const SHOP_A = '507f1f77bcf86cd7994390aa';
const LEASE_MS = fx.EFFECT_CLAIM_LEASE_MS;

let conn: mongoose.Connection | null = null;
let Invoice: mongoose.Model<any>;
let Sub: mongoose.Model<any>;
let Shop: mongoose.Model<any>;
let Plan: mongoose.Model<any>;
let mpesa: SubscriptionMpesaService;
let subsSvc: SubscriptionsService;
let stripeAuth: InvoicePaymentAuthorityService;
let worker: BillingEffectsReconciliationService;

const seedPlan = (over: any = {}) =>
  Plan.create({
    code: 'pro',
    name: 'Pro',
    monthlyPrice: 2500,
    annualPrice: 25000,
    setupPrice: 0,
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
    email: `up-${Math.random().toString(36).slice(2, 8)}@t.co`,
    phone: `2547${Math.floor(Math.random() * 1e8)}`,
    shopId: `SHP-${Math.random().toString(36).slice(2, 8)}`,
    city: 'Nairobi',
    businessType: 'retail',
    status: 'suspended',
    subscriptionStatus: 'suspended',
    ...over,
  });

const seedUpgradeInvoice = (over: any = {}) =>
  Invoice.create({
    _id: new Types.ObjectId(INV_U),
    invoiceNumber: `INV-UP-${Math.random().toString(36).slice(2, 8)}`,
    shopId: new Types.ObjectId(SHOP_A),
    subscriptionId: new Types.ObjectId(SUB_A),
    type: 'upgrade',
    status: 'paid',
    paidAt: new Date(),
    description: 'plan upgrade',
    amount: 2500,
    totalAmount: 2500,
    currency: 'KES',
    dueDate: new Date(),
    paymentMethod: 'mpesa_stk',
    mpesaReceiptNumber: 'R_UPGRADE',
    billingEffects: { status: 'pending', channel: 'mpesa_stk' },
    ...over,
  });

const expireClaim = async (invoiceId: string) =>
  Invoice.updateOne(
    { _id: new Types.ObjectId(invoiceId) },
    {
      $set: {
        'billingEffects.claimedAt': new Date(Date.now() - LEASE_MS - 1000),
      },
    },
  );

beforeAll(async () => {
  try {
    conn = await mongoose
      .createConnection(`${MONGO_URI}/${DB}`, {
        serverSelectionTimeoutMS: 3000,
      })
      .asPromise();
    Invoice = conn.model('UpInvoice', SubscriptionInvoiceSchema);
    Sub = conn.model('UpSubscription', SubscriptionSchema);
    Shop = conn.model('UpShop', ShopSchema);
    Plan = conn.model('UpPlan', SubscriptionPlanSchema);
  } catch {
    conn = null;
    return;
  }

  const stub: any = {};
  const cfgStub: any = { get: () => '' };
  subsSvc = new SubscriptionsService(
    Sub as any,
    Plan as any,
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
    Plan as any,
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
      throw new Error(
        `REQUIRED: no mongod at ${MONGO_URI} — this gate is NOT VERIFIED without real MongoDB`,
      );
    }
    await Invoice.deleteMany({});
    await Sub.deleteMany({});
    await Shop.deleteMany({});
    await Plan.deleteMany({});
    await fn();
  });

const getSub = () => Sub.findById(SUB_A).lean();
const getShop = () => Shop.findById(SHOP_A).lean();
const getInv = () => Invoice.findById(INV_U).lean();

describe('P0-11C — upgrade crash gate (real MongoDB)', () => {
  itMongo(
    'crash between subscription save and shop reactivation → worker recovery completes shop update, no duplicate upgrade',
    async () => {
      const plan = await seedPlan();
      await seedSub({
        pendingUpgrade: {
          planCode: 'pro',
          planId: plan._id.toString(),
          billingCycle: 'monthly',
          price: 2500,
          invoiceId: INV_U,
          requestedAt: new Date(),
        },
      });
      await seedShop();
      await seedUpgradeInvoice();

      // Crash: the shop document's save() throws once — exactly between
      // the subscription save (committed) and the shop update.
      const realShopFindById = Shop.findById.bind(Shop);
      const shopFindSpy = jest
        .spyOn(Shop, 'findById')
        .mockImplementationOnce((async (...args: any[]) => {
          const shop = await realShopFindById(...args);
          if (shop) {
            shop.save = async () => {
              throw new Error('crash before shop update');
            };
          }
          return shop;
        }) as any);

      await expect(mpesa.ensureStkBillingEffects(INV_U)).rejects.toThrow(
        'crash before shop update',
      );

      // Subscription upgrade committed; shop NOT reactivated; invoice
      // incomplete (claim released to pending by the catch path).
      let sub = await getSub();
      expect(sub.planCode).toBe('pro');
      expect(sub.status).toBe('active');
      expect(sub.pendingUpgrade).toBeUndefined();
      expect((await getShop()).status).toBe('suspended');
      const invMid = await getInv();
      expect(['applying', 'pending']).toContain(invMid.billingEffects.status);
      const endAfterActivation = sub.currentPeriodEnd.getTime();

      // Recovery: lease expiry → worker retries → shop update completes.
      await expireClaim(INV_U);
      await worker.reconcilePendingBillingEffects();
      await worker.reconcilePendingBillingEffects();

      sub = await getSub();
      const shop = await getShop();
      const inv = await getInv();

      // Correct upgraded plan, no duplicate activation, no accidental
      // renewal (period end unchanged from the activation write).
      expect(sub.planCode).toBe('pro');
      expect(sub.status).toBe('active');
      expect(sub.currentPeriodEnd.getTime()).toBe(endAfterActivation);
      // Shop fully reactivated with correct plan/expiration metadata.
      expect(shop.status).toBe('active');
      expect(shop.subscriptionStatus).toBe('active');
      expect(shop.subscriptionPlan).toBe('pro');
      expect(shop.subscriptionExpiresAt?.getTime()).toBe(endAfterActivation);
      expect(inv.billingEffects.status).toBe('applied');
    },
  );

  itMongo(
    'crash after subscription save but before entitlement marker → recovery completes without duplicate',
    async () => {
      const plan = await seedPlan();
      await seedSub({
        pendingUpgrade: {
          planCode: 'pro',
          planId: plan._id.toString(),
          billingCycle: 'monthly',
          price: 2500,
          invoiceId: INV_U,
          requestedAt: new Date(),
        },
      });
      await seedShop();
      await seedUpgradeInvoice();

      // Crash exactly at the marker boundary (after the subscription
      // save AND the shop reactivation inside activatePendingUpgrade).
      jest
        .spyOn(fx, 'markBillingEffectsApplied')
        .mockRejectedValueOnce(new Error('died before entitlement marker'));

      await expect(mpesa.ensureStkBillingEffects(INV_U)).rejects.toThrow(
        'died before entitlement marker',
      );

      const subMid = await getSub();
      expect(subMid.planCode).toBe('pro');
      const endAfterActivation = subMid.currentPeriodEnd.getTime();

      await expireClaim(INV_U);
      await worker.reconcilePendingBillingEffects();
      await worker.reconcilePendingBillingEffects();

      const sub = await getSub();
      const shop = await getShop();
      const inv = await getInv();

      expect(sub.planCode).toBe('pro');
      expect(sub.currentPeriodEnd.getTime()).toBe(endAfterActivation);
      expect(shop.status).toBe('active');
      expect(shop.subscriptionStatus).toBe('active');
      expect(shop.subscriptionPlan).toBe('pro');
      expect(inv.billingEffects.status).toBe('applied');
    },
  );
});
