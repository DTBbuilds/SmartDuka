import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { InvoicePaymentAuthorityService } from './services/invoice-payment-authority.service';
import { StripePaymentService } from '../stripe/services/stripe-payment.service';
import { SubscriptionMpesaService } from './subscription-mpesa.service';
import {
  StripePaymentStatus,
  StripePaymentType,
} from '../stripe/schemas/stripe-payment.schema';

jest.mock('nanoid', () => ({ nanoid: () => 'P011C1' }));

/**
 * P0-11C1 — DURABLE BILLING EFFECTS & PAYMENT TRUST BOUNDARIES
 *
 * Invariants under test:
 *  - a PAID invoice must never permanently lose subscription effects —
 *    settlement is recoverable after a crash and effects run exactly once;
 *  - payment-status reconciliation is tenant-scoped (Stripe + M-Pesa);
 *  - an M-Pesa callback is only a SIGNAL — truth is established by
 *    server-to-provider reconciliation with backend credentials; a forged
 *    callback can never settle an invoice.
 */

const SHOP_A = '507f1f77bcf86cd7994390aa';
const SHOP_B = '507f1f77bcf86cd7994390bb';
const INV_A = '507f1f77bcf86cd7994390b1';
const SUB_A = '507f1f77bcf86cd7994390c1';
const PI = 'pi_sub_1';

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

const makeSubscription = (overrides: Record<string, any> = {}) => {
  const doc: any = {
    _id: new Types.ObjectId(SUB_A),
    shopId: new Types.ObjectId(SHOP_A),
    status: 'past_due',
    billingCycle: 'monthly',
    numberOfDays: 30,
    failedPaymentAttempts: 2,
    metadata: {},
    saveCount: 0,
    ...overrides,
  };
  doc.save = jest.fn(async () => doc);
  return doc;
};

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

const applyAddToSet = (doc: any, add: Record<string, any>) => {
  for (const [k, v] of Object.entries(add)) {
    const parts = k.split('.');
    let cur = doc;
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] = cur[parts[i]] || {};
      cur = cur[parts[i]];
    }
    const key = parts[parts.length - 1];
    cur[key] = Array.isArray(cur[key]) ? cur[key] : [];
    if (!cur[key].some((x: any) => x?.toString() === v?.toString()))
      cur[key].push(v);
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
    if (
      cond &&
      typeof cond === 'object' &&
      !Array.isArray(cond) &&
      !(cond instanceof Types.ObjectId) &&
      !(cond instanceof Date)
    ) {
      if ('$in' in (cond as any)) {
        if (!(cond as any).$in.includes(val)) return false;
        continue;
      }
      if ('$ne' in (cond as any)) {
        if (
          Array.isArray(val)
            ? val.some(
                (v: any) => v?.toString() === (cond as any).$ne?.toString(),
              )
            : val?.toString() === (cond as any).$ne?.toString()
        )
          return false;
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
      if ('$lte' in (cond as any)) {
        const l = val instanceof Types.ObjectId ? val.toString() : val;
        const r =
          (cond as any).$lte instanceof Types.ObjectId
            ? (cond as any).$lte.toString()
            : (cond as any).$lte;
        if (!(l <= r)) return false;
        continue;
      }
    }
    if (cond === null) {
      if (val !== null && val !== undefined) return false;
      continue;
    }
    if (k === '_id' || k === 'shopId' || k.endsWith('Id')) {
      if (cond instanceof Types.ObjectId || val instanceof Types.ObjectId) {
        if (val?.toString() !== cond?.toString()) return false;
        continue;
      }
    }
    if (val instanceof Date || cond instanceof Date) {
      if (new Date(val).getTime() !== new Date(cond).getTime()) return false;
      continue;
    }
    if (val !== cond) return false;
  }
  return true;
};

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
    findOneAndUpdate: jest.fn((filter: any, update: any) => {
      for (const d of invoices.values()) {
        if (matches(d, filter)) {
          if (update.$set) applySet(d, update.$set);
          if (update.$addToSet) applyAddToSet(d, update.$addToSet);
          if (update.$inc) {
            for (const [k, v] of Object.entries(update.$inc)) {
              const parts = k.split('.');
              let t = d;
              for (let i = 0; i < parts.length - 1; i++) {
                t[parts[i]] = t[parts[i]] || {};
                t = t[parts[i]];
              }
              t[parts[parts.length - 1]] =
                (t[parts[parts.length - 1]] || 0) + (v as number);
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
          if (update.$addToSet) applyAddToSet(d, update.$addToSet);
          if (update.$inc) {
            for (const [k, v] of Object.entries(update.$inc)) {
              const parts = k.split('.');
              let t = d;
              for (let i = 0; i < parts.length - 1; i++) {
                t[parts[i]] = t[parts[i]] || {};
                t = t[parts[i]];
              }
              t[parts[parts.length - 1]] =
                (t[parts[parts.length - 1]] || 0) + (v as number);
            }
          }
          n++;
        }
      }
      return chain({ modifiedCount: n });
    }),
  };

  // Counts subscription-activating writes so tests can prove exactly-once
  // effects: every updateOne carrying currentPeriodStart is one activation.
  const activationWrites = jest.fn();
  const subscriptionModel: any = {
    findById: jest.fn(
      async (id: any) => subscriptions.get(id.toString()) || null,
    ),
    findOne: jest.fn(async (filter: any) => {
      for (const d of subscriptions.values()) if (matches(d, filter)) return d;
      return null;
    }),
    updateOne: jest.fn(async (filter: any, update: any) => {
      for (const d of subscriptions.values()) {
        if (matches(d, filter)) {
          if (update.$set) {
            if ('currentPeriodStart' in update.$set) activationWrites();
            applySet(d, update.$set);
          }
          return { modifiedCount: 1 };
        }
      }
      return { modifiedCount: 0 };
    }),
    activationWrites,
  };

  const paymentModel: any = {
    findOne: jest.fn((filter: any) => {
      for (const d of payments.values())
        if (matches(d, filter)) return chain(d);
      return chain(null);
    }),
    findOneAndUpdate: jest.fn((filter: any, update: any) => {
      for (const d of payments.values()) {
        if (matches(d, filter)) {
          if (update.$set) applySet(d, update.$set);
          if (update.$addToSet) applyAddToSet(d, update.$addToSet);
          return chain(d);
        }
      }
      return chain(null);
    }),
    updateOne: jest.fn((filter: any, update: any) => {
      let n = 0;
      for (const d of payments.values()) {
        if (matches(d, filter)) {
          if (update.$set) applySet(d, update.$set);
          if (update.$addToSet) applyAddToSet(d, update.$addToSet);
          n++;
        }
      }
      return chain({ modifiedCount: n });
    }),
  };

  const stripeService: any = {
    retrievePaymentIntent: jest.fn(async (id: string) => null),
  };

  return {
    invoices,
    payments,
    subscriptions,
    invoiceModel,
    subscriptionModel,
    paymentModel,
    stripeService,
  };
};

const successIntent = (over: Record<string, any> = {}) => ({
  id: PI,
  status: 'succeeded',
  amount: 10000,
  currency: 'kes',
  latest_charge: 'ch_1',
  metadata: {
    type: 'subscription',
    invoiceId: INV_A,
    shopId: SHOP_A,
    paymentType: 'subscription',
  },
  ...over,
});

const seedPayment = (s: ReturnType<typeof buildStores>, over: any = {}) => {
  s.payments.set(PI, {
    _id: new Types.ObjectId(),
    stripePaymentIntentId: PI,
    shopId: new Types.ObjectId(SHOP_A),
    invoiceId: new Types.ObjectId(INV_A),
    paymentType: StripePaymentType.SUBSCRIPTION,
    status: StripePaymentStatus.SUCCEEDED,
    amount: 10000,
    currency: 'kes',
    ...over,
  });
};

const mpesaService = (
  invoiceModel: any,
  subscriptionModel: any,
  opts: { environment?: string; subscriptionsService?: any } = {},
) => {
  const svc = new SubscriptionMpesaService(
    invoiceModel,
    subscriptionModel,
    {} as any,
    {} as any,
    { findById: jest.fn(() => chain(null)) } as any,
    { findOne: jest.fn(() => chain(null)) } as any,
    { findOne: jest.fn(() => chain(null)) } as any,
    { get: jest.fn(() => opts.environment || 'production') } as any,
    {} as any,
    {} as any,
    opts.subscriptionsService || ({} as any),
  );
  // environment is a field initializer ('sandbox'); set it explicitly.
  (svc as any).environment = opts.environment || 'production';
  return svc;
};

const stkSuccess = (checkoutRequestId: string, amount = 100) => ({
  Body: {
    stkCallback: {
      MerchantRequestID: 'm1',
      CheckoutRequestID: checkoutRequestId,
      ResultCode: 0,
      ResultDesc: 'The service request is processed successfully.',
      CallbackMetadata: {
        Item: [
          { Name: 'MpesaReceiptNumber', Value: 'RKL2ABCD5E' },
          { Name: 'Amount', Value: amount },
          { Name: 'TransactionDate', Value: 20251015 },
        ],
      },
    },
  },
});

describe('P0-11C1 — durable billing effects & trust boundaries', () => {
  let s: ReturnType<typeof buildStores>;
  let authority: InvoicePaymentAuthorityService;

  beforeEach(() => {
    s = buildStores();
    jest.clearAllMocks();
  });

  const buildAuthority = (subscriptionModel?: any) =>
    new InvoicePaymentAuthorityService(
      s.invoiceModel,
      subscriptionModel || s.subscriptionModel,
    );

  // ---------- Stripe: paid-before-effects crash ----------

  it('Stripe: crash after PAID transition → retry through webhook + reconciliation recovers effects', async () => {
    s.invoices.set(INV_A, makeInvoice());
    s.subscriptions.set(SUB_A, makeSubscription());

    // First attempt: invoice settles PAID, then the subscription read crashes.
    let crashes = 1;
    const flakySubModel = {
      ...s.subscriptionModel,
      findById: jest.fn(async (id: any) => {
        if (crashes-- > 0) throw new Error('ECONNRESET — mid-settlement crash');
        return s.subscriptions.get(id.toString()) || null;
      }),
    };
    authority = buildAuthority(flakySubModel);

    await expect(
      authority.settleStripeSuccess({
        invoiceId: INV_A,
        shopId: SHOP_A,
        paymentIntentId: PI,
        stripeChargeId: 'ch_1',
        amountMinor: 10000,
        currency: 'kes',
      }),
    ).rejects.toThrow('ECONNRESET');

    // Evidence of the half-settled state: PAID, effects lost.
    expect(s.invoices.get(INV_A).status).toBe('paid');
    expect(s.subscriptions.get(SUB_A).lastPaymentReference).toBeUndefined();
    expect(s.subscriptions.get(SUB_A).status).toBe('past_due');

    // Retry (webhook redelivery OR authenticated status retrieval — same primitive).
    await authority.settleStripeSuccess({
      invoiceId: INV_A,
      shopId: SHOP_A,
      paymentIntentId: PI,
      stripeChargeId: 'ch_1',
      amountMinor: 10000,
      currency: 'kes',
    });

    const sub = s.subscriptions.get(SUB_A);
    expect(sub.lastPaymentReference).toBe(PI);
    expect(sub.status).toBe('active');
    expect(sub.lastPaymentAmount).toBe(100);
    expect(s.invoices.get(INV_A).billingEffects?.status).toBe('applied');
  });

  it('Stripe: effects are exactly-once — concurrent settlement + reconciliation apply once', async () => {
    s.invoices.set(INV_A, makeInvoice());
    s.subscriptions.set(SUB_A, makeSubscription());
    authority = buildAuthority();

    const settle = () =>
      authority.settleStripeSuccess({
        invoiceId: INV_A,
        shopId: SHOP_A,
        paymentIntentId: PI,
        amountMinor: 10000,
        currency: 'kes',
      });
    await Promise.all([settle(), settle()]);
    await settle();

    const sub = s.subscriptions.get(SUB_A);
    // Failed-attempt counter reset exactly once (not repeatedly written).
    expect(sub.failedPaymentAttempts).toBe(0);
    expect(s.invoices.get(INV_A).billingEffects?.status).toBe('applied');
  });

  // ---------- Stripe: tenant-scoped status reconciliation ----------

  it('GET /stripe/payment/:id — foreign shop cannot read or trigger reconciliation', async () => {
    seedPayment(s, { shopId: new Types.ObjectId(SHOP_B) });
    s.stripeService.retrievePaymentIntent.mockResolvedValue(successIntent());
    const svc = new StripePaymentService(
      s.stripeService,
      {} as any,
      {} as any,
      { get: jest.fn() } as any,
      s.paymentModel,
      {} as any,
      {} as any,
      {} as any,
      buildAuthority(),
    );

    // Shop A asks about shop B's intent → must 404 BEFORE any provider call.
    await expect(svc.syncPaymentStatus(PI, SHOP_A)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(s.stripeService.retrievePaymentIntent).not.toHaveBeenCalled();

    // The owner shop resolves normally.
    s.stripeService.retrievePaymentIntent.mockResolvedValue(successIntent());
    const pay = await svc.syncPaymentStatus(PI, SHOP_B);
    expect(pay.stripePaymentIntentId).toBe(PI);
    expect(s.stripeService.retrievePaymentIntent).toHaveBeenCalledTimes(1);
  });

  it('GET /stripe/payment/:id — unknown intent → 404, provider never called', async () => {
    const svc = new StripePaymentService(
      s.stripeService,
      {} as any,
      {} as any,
      { get: jest.fn() } as any,
      s.paymentModel,
      {} as any,
      {} as any,
      {} as any,
      buildAuthority(),
    );
    await expect(
      svc.syncPaymentStatus('pi_does_not_exist', SHOP_A),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(s.stripeService.retrievePaymentIntent).not.toHaveBeenCalled();
  });

  // ---------- M-Pesa: tenant-scoped STK status ----------

  it('GET stk-status — foreign shop cannot read or trigger another shop transaction', async () => {
    s.invoices.set(
      INV_A,
      makeInvoice({ paymentAttempt: { checkoutRequestId: 'ws_co_foreign' } }),
    );
    const svc = mpesaService(s.invoiceModel, s.subscriptionModel);
    const res = await svc.queryStkStatus('ws_co_foreign', SHOP_B);
    expect(res.success).toBe(false);
    expect(res.resultDesc).toMatch(/not found/i);
  });

  // ---------- M-Pesa: callback is not proof — provider verification required ----------

  it('forged success callback (real checkoutRequestId, crafted metadata) → NOT settled', async () => {
    s.invoices.set(
      INV_A,
      makeInvoice({
        status: 'pending',
        paymentAttempt: { checkoutRequestId: 'ws_co_1' },
      }),
    );
    const svc = mpesaService(s.invoiceModel, s.subscriptionModel);
    // Provider reconciliation says the transaction does not exist / failed —
    // the callback alone is never settlement evidence.
    jest
      .spyOn(svc as any, 'verifyStkSuccessWithProvider')
      .mockResolvedValue(false);

    await svc.handleStkCallback(stkSuccess('ws_co_1'));
    expect(s.invoices.get(INV_A).status).toBe('pending');
  });

  it('callback for a real checkoutId with wrong amount → NOT settled even when provider confirms', async () => {
    s.invoices.set(
      INV_A,
      makeInvoice({
        status: 'pending',
        totalAmount: 1000,
        paymentAttempt: { checkoutRequestId: 'ws_co_1' },
      }),
    );
    const svc = mpesaService(s.invoiceModel, s.subscriptionModel);
    jest
      .spyOn(svc as any, 'verifyStkSuccessWithProvider')
      .mockResolvedValue(true);

    await svc.handleStkCallback(stkSuccess('ws_co_1', 1));
    expect(s.invoices.get(INV_A).status).toBe('pending');
    expect(s.invoices.get(INV_A).paymentAttempt.amountMismatch).toBe(true);
  });

  it('verified success settles ONCE; duplicate + failed-after-paid callbacks are no-ops', async () => {
    s.invoices.set(
      INV_A,
      makeInvoice({
        status: 'pending',
        paymentAttempt: { checkoutRequestId: 'ws_co_2' },
      }),
    );
    s.subscriptions.set(SUB_A, makeSubscription());
    const svc = mpesaService(s.invoiceModel, s.subscriptionModel);
    jest
      .spyOn(svc as any, 'verifyStkSuccessWithProvider')
      .mockResolvedValue(true);

    await Promise.all([
      svc.handleStkCallback(stkSuccess('ws_co_2')),
      svc.handleStkCallback(stkSuccess('ws_co_2')),
    ]);
    await svc.handleStkCallback(stkSuccess('ws_co_2'));
    expect(s.invoices.get(INV_A).status).toBe('paid');
    expect(s.invoices.get(INV_A).billingEffects?.status).toBe('applied');
    // Activation ran exactly once.
    expect(s.subscriptionModel.activationWrites).toHaveBeenCalledTimes(1);

    // Failed-after-paid → no regression.
    await svc.handleStkCallback({
      Body: {
        stkCallback: {
          MerchantRequestID: 'm1',
          CheckoutRequestID: 'ws_co_2',
          ResultCode: 1,
          ResultDesc: 'User cancelled',
        },
      },
    });
    expect(s.invoices.get(INV_A).status).toBe('paid');
  });

  it('M-Pesa crash after PAID before activation → retry recovers subscription effects', async () => {
    s.invoices.set(
      INV_A,
      makeInvoice({
        status: 'pending',
        paymentAttempt: { checkoutRequestId: 'ws_co_3' },
      }),
    );
    s.subscriptions.set(SUB_A, makeSubscription());

    let crashes = 1;
    const flakySubModel = {
      ...s.subscriptionModel,
      findOne: jest.fn(async (filter: any) => {
        if (crashes-- > 0) throw new Error('ECONNRESET — mid-activation crash');
        for (const d of s.subscriptions.values())
          if (matches(d, filter)) return d;
        return null;
      }),
    };
    const svc = mpesaService(s.invoiceModel, flakySubModel);
    jest
      .spyOn(svc as any, 'verifyStkSuccessWithProvider')
      .mockResolvedValue(true);

    await svc.handleStkCallback(stkSuccess('ws_co_3'));
    expect(s.invoices.get(INV_A).status).toBe('paid');
    expect(s.subscriptions.get(SUB_A).lastPaymentDate).toBeUndefined();
    expect(s.invoices.get(INV_A).billingEffects?.status).toBe('pending');

    // Redelivery / later callback for the same checkout → effects resume.
    await svc.handleStkCallback(stkSuccess('ws_co_3'));
    const sub = s.subscriptions.get(SUB_A);
    expect(sub.status).toBe('active');
    expect(sub.lastPaymentDate).toBeInstanceOf(Date);
    expect(s.invoices.get(INV_A).billingEffects?.status).toBe('applied');
    // Still exactly one activation write.
    expect(s.subscriptionModel.activationWrites).toHaveBeenCalledTimes(1);
  });

  it('success callback after a failed callback still settles (invoice stayed payable)', async () => {
    s.invoices.set(
      INV_A,
      makeInvoice({
        status: 'pending',
        paymentAttempt: { checkoutRequestId: 'ws_co_4' },
      }),
    );
    s.subscriptions.set(SUB_A, makeSubscription());
    const svc = mpesaService(s.invoiceModel, s.subscriptionModel);
    jest
      .spyOn(svc as any, 'verifyStkSuccessWithProvider')
      .mockResolvedValue(true);

    await svc.handleStkCallback({
      Body: {
        stkCallback: {
          MerchantRequestID: 'm0',
          CheckoutRequestID: 'ws_co_4',
          ResultCode: 1032,
          ResultDesc: 'Request cancelled by user',
        },
      },
    });
    expect(s.invoices.get(INV_A).paymentAttempt.failed).toBe(true);
    expect(s.invoices.get(INV_A).status).toBe('pending');

    await svc.handleStkCallback(stkSuccess('ws_co_4'));
    expect(s.invoices.get(INV_A).status).toBe('paid');
  });

  it('repeated authenticated reconciliation converges — provider-confirmed success settles', async () => {
    s.invoices.set(
      INV_A,
      makeInvoice({
        status: 'pending',
        paymentAttempt: { checkoutRequestId: 'ws_co_5' },
      }),
    );
    s.subscriptions.set(SUB_A, makeSubscription());
    const svc = mpesaService(s.invoiceModel, s.subscriptionModel);
    // Webhook lost: Daraja says the checkout completed.
    const query = jest
      .spyOn(svc as any, 'queryDarajaStkStatus')
      .mockResolvedValue({
        success: true,
        resultCode: '0',
        resultDesc: 'The service request is processed successfully.',
      });

    // Foreign shop still cannot reconcile it.
    const foreign = await svc.queryStkStatus('ws_co_5', SHOP_B);
    expect(foreign.success).toBe(false);
    expect(s.invoices.get(INV_A).status).toBe('pending');

    // Owner poll → provider truth settles + applies effects.
    const r1 = await svc.queryStkStatus('ws_co_5', SHOP_A);
    expect(r1.success).toBe(true);
    expect(s.invoices.get(INV_A).status).toBe('paid');
    expect(s.invoices.get(INV_A).billingEffects?.status).toBe('applied');

    // Repeated polls are idempotent.
    await svc.queryStkStatus('ws_co_5', SHOP_A);
    await svc.queryStkStatus('ws_co_5', SHOP_A);
    expect(s.subscriptionModel.activationWrites).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(3);
  });
});
