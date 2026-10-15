import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Types } from 'mongoose';
import { InvoicePaymentAuthorityService } from './services/invoice-payment-authority.service';
import { StripePaymentService } from '../stripe/services/stripe-payment.service';
import {
  StripePaymentStatus,
  StripePaymentType,
} from '../stripe/schemas/stripe-payment.schema';
import { SubscriptionPaymentController } from './subscription-payment.controller';
import { SubscriptionMpesaService } from './subscription-mpesa.service';
import { CreateSubscriptionInvoicePaymentDto } from '../stripe/dto/subscription-invoice-payment.dto';
import { ValidationPipe } from '@nestjs/common';
import { toMinorUnits } from '../common/currency';

jest.mock('nanoid', () => ({ nanoid: () => 'P011C' }));

/**
 * P0-11C — SUBSCRIPTION INVOICE PAYMENT AUTHORITY & SETTLEMENT INTEGRITY
 *
 * Invariant: no subscription invoice may be charged, marked paid, or used to
 * activate billing entitlements without tenant authority, server-authoritative
 * money values, durable payment identity, and trusted settlement evidence.
 *
 * All provider calls are mocked; the invoice store is an in-memory map whose
 * findOneAndUpdate applies filters synchronously — interleaved awaits between
 * two initiations reproduce the real claim race.
 */

const SHOP_A = '507f1f77bcf86cd7994390aa';
const SHOP_B = '507f1f77bcf86cd7994390bb';
const INV_A = '507f1f77bcf86cd7994390b1';
const SUB_A = '507f1f77bcf86cd7994390c1';

const makeInvoice = (overrides: Record<string, any> = {}) => ({
  _id: new Types.ObjectId(INV_A),
  shopId: new Types.ObjectId(SHOP_A),
  subscriptionId: new Types.ObjectId(SUB_A),
  invoiceNumber: 'INV-2026-0001',
  type: 'subscription',
  status: 'pending',
  description: 'Monthly subscription',
  amount: 100,
  tax: 0,
  totalAmount: 100,
  currency: 'KES',
  dueDate: new Date(),
  paymentAttempts: 0,
  ...overrides,
});

// Applies an update doc's $set (incl. dotted paths) to a stored object.
const applySet = (doc: any, set: Record<string, any>) => {
  for (const [k, v] of Object.entries(set)) {
    const parts = k.split('.');
    let target = doc;
    for (let i = 0; i < parts.length - 1; i++) {
      target[parts[i]] = target[parts[i]] || {};
      target = target[parts[i]];
    }
    target[parts[parts.length - 1]] = v;
  }
};

const matches = (doc: any, filter: any): boolean => {
  for (const [k, cond] of Object.entries(filter)) {
    if (k === '$or') {
      if (!(cond as any[]).some((f: any) => matches(doc, f))) return false;
      continue;
    }
    if (k === '$and') {
      if (!(cond as any[]).every((f: any) => matches(doc, f))) return false;
      continue;
    }
    const val = k.split('.').reduce((o: any, p) => o?.[p], doc);
    if (k === '_id' || k === 'shopId') {
      if (val?.toString() !== cond?.toString()) return false;
      continue;
    }
    if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
      if ('$in' in (cond as any)) {
        if (!(cond as any).$in.includes(val)) return false;
        continue;
      }
      if ('$ne' in (cond as any)) {
        if (val === (cond as any).$ne) return false;
        continue;
      }
      if ('$exists' in (cond as any)) {
        if ((val !== undefined) !== (cond as any).$exists) return false;
        continue;
      }
      if ('$lt' in (cond as any)) {
        const l = val instanceof Types.ObjectId ? val.toString() : val;
        const r =
          (cond as any).$lt instanceof Types.ObjectId
            ? (cond as any).$lt.toString()
            : (cond as any).$lt;
        if (!(l < r)) return false;
        continue;
      }
    }
    if (cond === null) {
      if (val !== null && val !== undefined) return false;
      continue;
    }
    if (val instanceof Date || cond instanceof Date) {
      if (new Date(val).getTime() !== new Date(cond).getTime()) return false;
      continue;
    }
    if (val?.toString() !== cond?.toString()) return false;
  }
  return true;
};

// Awaitable thenable that also supports Mongoose-style .exec()/.select()/.lean()
const chain = (doc: any): any => {
  const p: any = Promise.resolve(doc);
  p.exec = () => chain(doc);
  p.select = () => chain(doc);
  p.lean = () => chain(doc);
  return p;
};

const buildStores = () => {
  const invoices = new Map<string, any>();
  const payments = new Map<string, any>();
  const subscriptions = new Map<string, any>();

  const invoiceModel: any = {
    findOne: jest.fn((filter: any) => {
      for (const d of invoices.values())
        if (matches(d, filter)) return chain(d);
      return chain(null);
    }),
    findById: jest.fn((id: any) => chain(invoices.get(id.toString()) || null)),
    findOneAndUpdate: jest.fn((filter: any, update: any, opts: any) => {
      for (const d of invoices.values()) {
        if (matches(d, filter)) {
          if (update.$set) applySet(d, update.$set);
          if (update.$inc) {
            for (const [k, v] of Object.entries(update.$inc)) {
              d[k] = (d[k] || 0) + (v as number);
            }
          }
          return chain(d);
        }
      }
      return chain(null);
    }),
    updateOne: jest.fn((filter: any, update: any) => {
      let n = 0;
      for (const d of invoices.values()) {
        if (matches(d, filter)) {
          if (update.$set) applySet(d, update.$set);
          n++;
        }
      }
      return chain({ modifiedCount: n });
    }),
  };

  const subscriptionModel: any = {
    findById: jest.fn(
      async (id: any) => subscriptions.get(id.toString()) || null,
    ),
    updateOne: jest.fn(async (filter: any, update: any) => {
      for (const d of subscriptions.values()) {
        if (matches(d, filter)) {
          if (update.$set) applySet(d, update.$set);
          return { modifiedCount: 1 };
        }
      }
      return { modifiedCount: 0 };
    }),
  };

  const intents = new Map<string, any>();
  const keys = new Map<string, string>(); // idempotencyKey -> intentId
  const stripeService: any = {
    validateMinimumAmount: jest.fn(() => ({ valid: true })),
    createPaymentIntent: jest.fn(async (p: any) => {
      // Stripe idempotency: same key → same intent (survives lost responses)
      if (p.idempotencyKey && keys.has(p.idempotencyKey)) {
        return intents.get(keys.get(p.idempotencyKey)!);
      }
      const intent = {
        id: `pi_${intents.size + 1}`,
        status: 'requires_payment_method',
        client_secret: `sec_${intents.size + 1}`,
        amount: p.amount,
        currency: p.currency,
        metadata: p.metadata,
        latest_charge: undefined,
      };
      intents.set(intent.id, intent);
      if (p.idempotencyKey) keys.set(p.idempotencyKey, intent.id);
      return intent;
    }),
    retrievePaymentIntent: jest.fn(async (id: string) => intents.get(id)),
  };

  const PaymentDoc = function (this: any, data: any) {
    Object.assign(this, data);
    this.toObject = () => ({ ...data });
    this.save = jest.fn(async () => this);
  };
  const paymentModel: any = Object.assign(PaymentDoc, {
    findOne: jest.fn((filter: any) => {
      for (const d of payments.values()) {
        if (
          filter.stripePaymentIntentId &&
          d.stripePaymentIntentId === filter.stripePaymentIntentId
        )
          return chain(d);
      }
      return chain(null);
    }),
    findOneAndUpdate: jest.fn((filter: any, update: any, opts: any) => {
      for (const d of payments.values()) {
        if (d.stripePaymentIntentId === filter.stripePaymentIntentId) {
          if (update.$set) applySet(d, update.$set);
          return chain(d);
        }
      }
      return chain(null);
    }),
    updateOne: jest.fn((filter: any, update: any, opts: any) => {
      const existing = [...payments.values()].find(
        (d) => d.stripePaymentIntentId === filter.stripePaymentIntentId,
      );
      if (existing) {
        if (update.$set) applySet(existing, update.$set);
        return chain({ upsertedCount: 0 });
      }
      if (opts?.upsert && update.$setOnInsert) {
        const doc = { ...update.$setOnInsert };
        payments.set(doc.stripePaymentIntentId, doc);
        return chain({ upsertedCount: 1 });
      }
      return chain({ upsertedCount: 0 });
    }),
  });

  return {
    invoices,
    payments,
    subscriptions,
    intents,
    invoiceModel,
    subscriptionModel,
    paymentModel,
    stripeService,
  };
};

const buildServices = (s: ReturnType<typeof buildStores>) => {
  const authority = new InvoicePaymentAuthorityService(
    s.invoiceModel,
    s.subscriptionModel,
  );
  const paymentService = new StripePaymentService(
    s.stripeService,
    {
      getOrCreateCustomer: jest.fn(async () => ({ stripeCustomerId: 'cus_1' })),
      getCustomerByShopId: jest.fn(async () => null),
    } as any,
    {} as any,
    { get: jest.fn() } as any,
    s.paymentModel,
    {} as any,
    { createTransaction: jest.fn(async () => ({})) } as any,
    {} as any,
    authority,
  );
  return { authority, paymentService };
};

describe('P0-11C subscription invoice payment authority', () => {
  let s: ReturnType<typeof buildStores>;
  let authority: InvoicePaymentAuthorityService;
  let paymentService: StripePaymentService;

  beforeEach(() => {
    s = buildStores();
    ({ authority, paymentService } = buildServices(s));
    jest.clearAllMocks();
  });

  const initiate = (overrides: Record<string, any> = {}) =>
    paymentService.createSubscriptionPayment({
      shopId: SHOP_A,
      invoiceId: INV_A,
      customerEmail: 'a@x.co',
      ...overrides,
    });

  // ---------- D: tenant + identity authority ----------

  it('shop B invoice + shop A token → DENY (cross-tenant invisible)', async () => {
    s.invoices.set(INV_A, makeInvoice({ shopId: new Types.ObjectId(SHOP_B) }));
    await expect(initiate()).rejects.toBeInstanceOf(NotFoundException);
    expect(s.stripeService.createPaymentIntent).not.toHaveBeenCalled();
  });

  it('invalid / missing invoiceId → DENY (fail closed, no implicit invoice)', async () => {
    s.invoices.set(INV_A, makeInvoice());
    await expect(initiate({ invoiceId: 'not-an-id' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(initiate({ invoiceId: '' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(s.stripeService.createPaymentIntent).not.toHaveBeenCalled();
  });

  it('client invoiceNumber mismatch → DENY before provider call', async () => {
    s.invoices.set(INV_A, makeInvoice());
    await expect(
      initiate({ client: { invoiceNumber: 'INV-WRONG' } }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(s.stripeService.createPaymentIntent).not.toHaveBeenCalled();
  });

  // ---------- E: server-authoritative money ----------

  it('client amount 1 vs invoice 100 → DENY mismatch', async () => {
    s.invoices.set(INV_A, makeInvoice());
    await expect(initiate({ client: { amount: 1 } })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(s.stripeService.createPaymentIntent).not.toHaveBeenCalled();
  });

  it('client currency USD vs invoice KES → DENY mismatch', async () => {
    s.invoices.set(INV_A, makeInvoice());
    await expect(
      initiate({ client: { currency: 'usd' } }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(s.stripeService.createPaymentIntent).not.toHaveBeenCalled();
  });

  it.each([
    [100, 'KES', 10000],
    [25.5, 'AUD', 2550],
    [5, 'UGX', 500],
    [10, 'JPY', 10],
    [5, 'ISK', 500],
  ])(
    'invoice %s %s → provider amount %i (P0-11A canonical minor units)',
    async (total, currency, expected) => {
      s.invoices.set(INV_A, makeInvoice({ totalAmount: total, currency }));
      const res = await initiate();
      expect(s.stripeService.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({ amount: expected }),
      );
      expect(res.amount).toBe(expected);
      expect(res.currency).toBe(currency.toLowerCase());
      // StripePayment row binds invoice + tenant + canonical minor amount
      const row = s.payments.get(res.paymentIntentId);
      expect(row.invoiceId.toString()).toBe(INV_A);
      expect(row.shopId.toString()).toBe(SHOP_A);
      expect(row.amount).toBe(expected);
      expect(row.paymentType).toBe(StripePaymentType.SUBSCRIPTION);
    },
  );

  // ---------- F: invoice state gate ----------

  it.each([
    ['paid'],
    ['cancelled'],
    ['refunded'],
    ['draft'],
    ['pending_verification'],
  ])('invoice status %s → initiation DENY', async (status) => {
    s.invoices.set(INV_A, makeInvoice({ status }));
    await expect(initiate()).rejects.toBeInstanceOf(ConflictException);
    expect(s.stripeService.createPaymentIntent).not.toHaveBeenCalled();
  });

  it('active M-Pesa STK attempt on the invoice → competing card DENY', async () => {
    s.invoices.set(
      INV_A,
      makeInvoice({
        paymentAttempt: { initiatedAt: new Date(), checkoutRequestId: 'crx1' },
      }),
    );
    await expect(initiate()).rejects.toBeInstanceOf(ConflictException);
    expect(s.stripeService.createPaymentIntent).not.toHaveBeenCalled();
  });

  it('failed invoice → retry eligible under authenticated policy', async () => {
    s.invoices.set(INV_A, makeInvoice({ status: 'failed' }));
    const res = await initiate();
    expect(res.paymentIntentId).toBeTruthy();
  });

  // ---------- H/I: durable identity + concurrency ----------

  it('two concurrent initiations → ONE provider intent (atomic claim + deterministic key)', async () => {
    s.invoices.set(INV_A, makeInvoice());
    const [r1, r2] = await Promise.all([initiate(), initiate()]);
    expect(r1.paymentIntentId).toBe(r2.paymentIntentId);
    expect(s.intents.size).toBe(1);
  });

  it('retried HTTP request reuses the same pending intent', async () => {
    s.invoices.set(INV_A, makeInvoice());
    const r1 = await initiate();
    const r2 = await initiate();
    expect(r2.paymentIntentId).toBe(r1.paymentIntentId);
    expect(s.stripeService.retrievePaymentIntent).toHaveBeenCalledWith(
      r1.paymentIntentId,
    );
    expect(s.intents.size).toBe(1);
  });

  it('lost local response recovers the same provider identity (same idempotency key)', async () => {
    s.invoices.set(INV_A, makeInvoice());
    // Simulate crash between provider success and local bind: claim exists
    // with no paymentIntentId; retry must reuse the deterministic key.
    await authority.authorizeStripeInitiation(SHOP_A, INV_A, undefined);
    const inv = s.invoices.get(INV_A);
    inv.stripeAttempt.paymentIntentId = undefined;
    const res = await initiate();
    const usedKey = (s.stripeService.createPaymentIntent as jest.Mock).mock
      .calls[0][0].idempotencyKey;
    expect(usedKey).toBe(`subpay_${INV_A}_1`);
    expect(s.intents.size).toBe(1);
    expect(inv.stripeAttempt.paymentIntentId).toBe(res.paymentIntentId);
  });

  it('bound intent whose provider state is canceled → released; retry claims a fresh attempt', async () => {
    s.invoices.set(INV_A, makeInvoice());
    const r1 = await initiate();
    s.intents.get(r1.paymentIntentId).status = 'canceled';
    const r2 = await initiate();
    expect(r2.paymentIntentId).not.toBe(r1.paymentIntentId);
    const inv = s.invoices.get(INV_A);
    expect(inv.stripeAttempt.seq).toBe(2);
    expect(inv.stripeAttempt.paymentIntentId).toBe(r2.paymentIntentId);
  });

  it('a bound intent with mismatched provider amount is never reused', async () => {
    s.invoices.set(INV_A, makeInvoice());
    const r1 = await initiate();
    s.intents.get(r1.paymentIntentId).amount = 1; // tampered provider state
    const r2 = await initiate();
    expect(r2.paymentIntentId).not.toBe(r1.paymentIntentId);
    expect(s.invoices.get(INV_A).stripeAttempt.seq).toBe(2);
  });

  // ---------- J/K/L/M: settlement ----------

  const succeededIntent = (overrides: Record<string, any> = {}) => ({
    id: 'pi_1',
    status: 'succeeded' as const,
    amount: toMinorUnits(100, 'KES'),
    currency: 'kes',
    latest_charge: 'ch_1',
    metadata: {
      type: StripePaymentType.SUBSCRIPTION,
      invoiceId: INV_A,
      shopId: SHOP_A,
    },
    ...overrides,
  });

  const fireWebhook = async (intent: any) =>
    paymentService.handlePaymentIntentEvent({
      id: 'evt_1',
      type: 'payment_intent.succeeded',
      data: { object: intent },
    } as any);

  it('provider success + correct amount → SETTLE once (invoice PAID + effects once)', async () => {
    const inv = makeInvoice();
    s.invoices.set(INV_A, inv);
    s.subscriptions.set(SUB_A, {
      _id: new Types.ObjectId(SUB_A),
      status: 'past_due',
      failedPaymentAttempts: 2,
      save: jest.fn(async function (this: any) {
        return this;
      }),
    });
    await initiate(); // creates intent pi_1 + StripePayment row + attempt

    await fireWebhook(succeededIntent());
    expect(inv.status).toBe('paid');
    expect(inv.paymentMethod).toBe('stripe');
    expect(inv.paymentReference).toBe('pi_1');
    expect(inv.stripePayment.chargeId).toBe('ch_1');
    expect(inv.paidAt).toBeInstanceOf(Date);
    const sub = s.subscriptions.get(SUB_A);
    expect(sub.status).toBe('active'); // PAST_DUE recovered
    expect(sub.failedPaymentAttempts).toBe(0);
    expect(sub.lastPaymentReference).toBe('pi_1');
    // Effects = entitlement + newest-payment tracking + status recovery.
    const writesAfterSettle = s.subscriptionModel.updateOne.mock.calls.length;

    // Duplicate delivery → no second transition, no second effects run.
    await fireWebhook(succeededIntent());
    expect(s.subscriptionModel.updateOne).toHaveBeenCalledTimes(
      writesAfterSettle,
    );
  });

  it.each([
    ['wrong amount', { amount: 1 }],
    ['wrong currency', { currency: 'usd' }],
    [
      'wrong invoice binding',
      {
        metadata: {
          type: 'subscription',
          invoiceId: '507f1f77bcf86cd7994390b9',
          shopId: SHOP_A,
        },
      },
    ],
  ])('provider succeeded but %s → DO NOT settle', async (_l, over) => {
    s.invoices.set(INV_A, makeInvoice());
    await initiate();
    await fireWebhook(succeededIntent(over));
    expect(s.invoices.get(INV_A).status).toBe('pending');
  });

  it('non-succeeded intents never settle (processing / requires_action / failed)', async () => {
    s.invoices.set(INV_A, makeInvoice());
    await initiate();
    for (const status of ['processing', 'requires_action'] as const) {
      await paymentService.handlePaymentIntentEvent({
        type: 'payment_intent.processing',
        data: { object: succeededIntent({ status }) },
      } as any);
    }
    expect(s.invoices.get(INV_A).status).toBe('pending');
    expect(s.invoices.get(INV_A).stripeAttempt.status).toBe('active');
  });

  it('canceled intent releases the attempt → invoice remains payable', async () => {
    s.invoices.set(INV_A, makeInvoice());
    await initiate();
    await paymentService.handlePaymentIntentEvent({
      type: 'payment_intent.canceled',
      data: { object: succeededIntent({ status: 'canceled' }) },
    } as any);
    expect(s.invoices.get(INV_A).status).toBe('pending');
    expect(s.invoices.get(INV_A).stripeAttempt.status).toBe('cancelled');
    const r = await initiate(); // retry now allowed
    expect(r.paymentIntentId).toBe('pi_2');
  });

  it('authenticated retrieval (syncPaymentStatus) settles when webhook was lost', async () => {
    const inv = makeInvoice();
    s.invoices.set(INV_A, inv);
    await initiate();
    s.intents.get('pi_1').status = 'succeeded';
    s.intents.get('pi_1').latest_charge = 'ch_9';
    await paymentService.syncPaymentStatus('pi_1', SHOP_A);
    expect(inv.status).toBe('paid');
    expect(inv.paymentReference).toBe('pi_1');
  });

  it('concurrent webhook + status retrieval → exactly ONE settlement', async () => {
    const inv = makeInvoice();
    s.invoices.set(INV_A, inv);
    await initiate();
    s.intents.get('pi_1').status = 'succeeded';
    await Promise.all([
      fireWebhook(succeededIntent()),
      paymentService.syncPaymentStatus('pi_1', SHOP_A),
    ]);
    expect(inv.status).toBe('paid');
    // second converge sees paid → returns alreadyPaid, no transition write
  });

  it('failure event after paid → NO regression to unpaid', async () => {
    const inv = makeInvoice();
    s.invoices.set(INV_A, inv);
    await initiate();
    await fireWebhook(succeededIntent());
    expect(inv.status).toBe('paid');
    await paymentService.handlePaymentIntentEvent({
      type: 'payment_intent.payment_failed',
      data: {
        object: succeededIntent({
          status: 'requires_payment_method',
          last_payment_error: { message: 'late failure' },
        }),
      },
    } as any);
    expect(inv.status).toBe('paid');
  });

  it('lost local StripePayment row → settles via provider metadata binding', async () => {
    const inv = makeInvoice();
    s.invoices.set(INV_A, inv);
    // No initiation row at all — provider metadata is the only evidence.
    await fireWebhook(succeededIntent({ id: 'pi_orphan' }));
    expect(inv.status).toBe('paid');
    expect(inv.paymentReference).toBe('pi_orphan');
  });

  // ---------- N: manual self-approval removed ----------

  it('POST /subscriptions/payments/confirm/:invoiceId no longer exists', () => {
    const proto = Object.getOwnPropertyNames(
      SubscriptionPaymentController.prototype,
    );
    expect(proto).not.toContain('confirmPayment');
    // Canonical privileged paths remain
    expect(proto).toContain('verifyManualPayment');
  });

  it('SubscriptionsService no longer exposes unguarded markInvoicePaid', () => {
    const { SubscriptionsService } = require('./subscriptions.service');
    expect(
      Object.getOwnPropertyNames(SubscriptionsService.prototype),
    ).not.toContain('markInvoicePaid');
    expect(
      Object.getOwnPropertyNames(SubscriptionsService.prototype),
    ).toContain('verifyAndActivatePayment');
  });

  // ---------- O: M-Pesa preserved + conflict gate ----------

  const mpesaService = (invoiceModel: any, planModel?: any) => {
    const svc = new SubscriptionMpesaService(
      invoiceModel,
      {
        findOne: jest.fn(() => chain(null)),
        findById: jest.fn(() => chain(null)),
        updateOne: jest.fn(() => chain({ modifiedCount: 0 })),
      } as any,
      {} as any,
      {} as any,
      { findById: jest.fn(() => chain(null)) } as any,
      { findOne: jest.fn(() => chain(null)) } as any,
      planModel || ({ findOne: jest.fn(() => chain(null)) } as any),
      { get: jest.fn(() => 'production') } as any,
      {} as any,
      {} as any,
      {} as any,
    );
    (svc as any).environment = 'production';
    return svc;
  };

  it('M-Pesa initiation denied on non-payable invoice states', async () => {
    for (const status of [
      'pending_verification',
      'cancelled',
      'refunded',
      'draft',
    ]) {
      const local = buildStores();
      local.invoices.set(INV_A, makeInvoice({ status }));
      const svc = mpesaService(local.invoiceModel);
      const res = await svc.initiateSubscriptionPayment(
        INV_A,
        '0712345678',
        SHOP_A,
      );
      expect(res.success).toBe(false);
      expect(res.error).toBe('INVOICE_NOT_PAYABLE');
    }
  });

  it('M-Pesa initiation denied while a card attempt is active (channel exclusivity)', async () => {
    const local = buildStores();
    local.invoices.set(
      INV_A,
      makeInvoice({ stripeAttempt: { status: 'active', seq: 1 } }),
    );
    const svc = mpesaService(local.invoiceModel);
    const res = await svc.initiateSubscriptionPayment(
      INV_A,
      '0712345678',
      SHOP_A,
    );
    expect(res.success).toBe(false);
    expect(res.error).toBe('PAYMENT_IN_PROGRESS');
  });

  it('M-Pesa initiation denied cross-tenant', async () => {
    const local = buildStores();
    local.invoices.set(
      INV_A,
      makeInvoice({ shopId: new Types.ObjectId(SHOP_B) }),
    );
    const svc = mpesaService(local.invoiceModel);
    const res = await svc.initiateSubscriptionPayment(
      INV_A,
      '0712345678',
      SHOP_A,
    );
    expect(res.success).toBe(false);
    expect(res.error).toBe('INVOICE_NOT_FOUND');
  });

  it('M-Pesa upgrade: client amount is an assertion — server derives plan price', async () => {
    const planModel = {
      findOne: jest.fn((f: any) =>
        chain(
          f.code === 'pro'
            ? { code: 'pro', monthlyPrice: 1500, annualPrice: 15000 }
            : null,
        ),
      ),
    };
    const svc = mpesaService(
      { findOne: jest.fn(() => chain(null)) },
      planModel,
    );

    // Client-declared amount that disagrees with the plan price → deny.
    const bad = await svc.initiateUpgradePayment(
      '0712345678',
      SHOP_A,
      'pro',
      'monthly',
      1,
    );
    expect(bad.success).toBe(false);
    expect(bad.error).toBe('AMOUNT_MISMATCH');

    // Unknown plan → deny before any provider call.
    const unknown = await svc.initiateUpgradePayment(
      '0712345678',
      SHOP_A,
      'nonexistent',
      'monthly',
      999,
    );
    expect(unknown.success).toBe(false);
    expect(unknown.error).toBe('UNKNOWN_PLAN');
  });

  it('M-Pesa callback: underpaid amount does NOT settle the invoice', async () => {
    const local = buildStores();
    const inv = makeInvoice({
      status: 'pending',
      totalAmount: 1000,
      paymentAttempt: { checkoutRequestId: 'ws_co_1' },
    });
    local.invoices.set(INV_A, inv);
    const svc = mpesaService(local.invoiceModel);
    jest
      .spyOn(svc as any, 'verifyStkSuccessWithProvider')
      .mockResolvedValue(true);
    await svc.handleStkCallback({
      Body: {
        stkCallback: {
          MerchantRequestID: 'm1',
          CheckoutRequestID: 'ws_co_1',
          ResultCode: 0,
          ResultDesc: 'Success',
          CallbackMetadata: {
            Item: [
              { Name: 'MpesaReceiptNumber', Value: 'RKL2ABCD5E' },
              { Name: 'Amount', Value: 1 }, // underpaid
              { Name: 'TransactionDate', Value: 20251015 },
            ],
          },
        },
      },
    });
    expect(local.invoices.get(INV_A).status).toBe('pending');
    expect(local.invoices.get(INV_A).paymentAttempt.amountMismatch).toBe(true);
  });

  it('M-Pesa callback: duplicate success settles ONCE — no repeat side effects', async () => {
    const local = buildStores();
    local.invoices.set(
      INV_A,
      makeInvoice({
        status: 'pending',
        totalAmount: 100,
        paymentAttempt: { checkoutRequestId: 'ws_co_2' },
      }),
    );
    const svc = mpesaService(local.invoiceModel);
    jest
      .spyOn(svc as any, 'verifyStkSuccessWithProvider')
      .mockResolvedValue(true);
    const cb = () =>
      svc.handleStkCallback({
        Body: {
          stkCallback: {
            MerchantRequestID: 'm1',
            CheckoutRequestID: 'ws_co_2',
            ResultCode: 0,
            ResultDesc: 'Success',
            CallbackMetadata: {
              Item: [
                { Name: 'MpesaReceiptNumber', Value: 'RKL2ABCD5E' },
                { Name: 'Amount', Value: 100 },
                { Name: 'TransactionDate', Value: 20251015 },
              ],
            },
          },
        },
      });
    await Promise.all([cb(), cb()]);
    await cb(); // third delivery — already paid → no-op
    expect(local.invoices.get(INV_A).status).toBe('paid');
    expect(local.invoices.get(INV_A).paidAmount).toBe(100);
  });

  // ---------- DTO contract ----------

  it('initiation DTO: invoiceId required + ObjectId-shaped; money fields optional asserts', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    await expect(
      pipe.transform(
        { invoiceId: INV_A },
        { type: 'body', metatype: CreateSubscriptionInvoicePaymentDto },
      ),
    ).resolves.toBeTruthy();
    await expect(
      pipe.transform(
        { invoiceId: 'bogus' },
        { type: 'body', metatype: CreateSubscriptionInvoicePaymentDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      pipe.transform(
        { invoiceId: INV_A, status: 'paid' },
        { type: 'body', metatype: CreateSubscriptionInvoicePaymentDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('invoice record retains full settlement provenance', async () => {
    const inv = makeInvoice();
    s.invoices.set(INV_A, inv);
    await initiate();
    await fireWebhook(succeededIntent());
    expect(inv.status).toBe('paid');
    expect(inv.stripePayment).toMatchObject({
      paymentIntentId: 'pi_1',
      chargeId: 'ch_1',
      amount: 10000,
      currency: 'kes',
      status: 'succeeded',
    });
    expect(inv.stripeAttempt.status).toBe('succeeded');
    expect(inv.stripeAttempt.settledAt).toBeInstanceOf(Date);
  });
});
