import { Types } from 'mongoose';
import { InvoicePaymentAuthorityService } from './services/invoice-payment-authority.service';
import { SubscriptionMpesaService } from './subscription-mpesa.service';
import { BillingEffectsReconciliationService } from './services/billing-effects-reconciliation.service';

jest.mock('nanoid', () => ({ nanoid: () => 'P011C2' }));

/**
 * P0-11C2 — HISTORICAL SETTLEMENT IDEMPOTENCY & DURABLE RECOVERY
 *
 * A single `lastSettledInvoiceId` marker is NOT a sufficient replay guard:
 * once invoice B settles, a retried effect application for older invoice A
 * passes a `$ne` check and rewrites newer subscription state (stale
 * lastPaymentReference, second period extension). The per-invoice ledger is
 * monotonic: effects apply only while the invoice is newer than the last
 * settled invoice (ObjectId ordering), so replay can never regress state.
 */

const SHOP_A = '507f1f77bcf86cd7994390aa';
const INV_A = '507f1f77bcf86cd7994390b1'; // older
const INV_B = '507f1f77bcf86cd7994390b2'; // newer
const SUB_A = '507f1f77bcf86cd7994390c1';

const makeInvoice = (id: string, overrides: Record<string, any> = {}) => ({
  _id: new Types.ObjectId(id),
  shopId: new Types.ObjectId(SHOP_A),
  subscriptionId: new Types.ObjectId(SUB_A),
  invoiceNumber: `INV-${id.slice(-4)}`,
  type: 'subscription',
  status: 'pending',
  amount: 100,
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
    ...overrides,
  };
  doc.save = jest.fn(async () => doc);
  return doc;
};

const applySet = (doc: any, set: Record<string, any>) => {
  for (const [k, v] of Object.entries(set)) {
    const parts = k.split('.');
    let t = doc;
    for (let i = 0; i < parts.length - 1; i++) {
      t[parts[i]] = t[parts[i]] || {};
      t = t[parts[i]];
    }
    t[parts[parts.length - 1]] = v;
  }
};

const applyInc = (doc: any, inc: Record<string, any>) => {
  for (const [k, v] of Object.entries(inc)) {
    const parts = k.split('.');
    let t = doc;
    for (let i = 0; i < parts.length - 1; i++) {
      t[parts[i]] = t[parts[i]] || {};
      t = t[parts[i]];
    }
    t[parts[parts.length - 1]] =
      (t[parts[parts.length - 1]] || 0) + (v as number);
  }
};

const cmpVal = (val: any, cond: any) => {
  const norm = (x: any) =>
    x instanceof Types.ObjectId ? x.toString() : x instanceof Date ? +x : x;
  return { l: norm(val), r: norm(cond) };
};

const matches = (doc: any, filter: any): boolean => {
  for (const [k, cond] of Object.entries(filter)) {
    if (k === '$or') {
      if (!(cond as any[]).some((f: any) => matches(doc, f))) return false;
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
      let handled = false;
      const c = cond as any;
      if ('$ne' in c) {
        handled = true;
        if (val?.toString() === c.$ne?.toString()) return false;
      }
      if ('$in' in c) {
        handled = true;
        if (!c.$in.includes(val)) return false;
      }
      if ('$exists' in c) {
        handled = true;
        if ((val !== undefined) !== c.$exists) return false;
      }
      if ('$lt' in c) {
        handled = true;
        const { l, r } = cmpVal(val, c.$lt);
        if (!(l < r)) return false;
      }
      if ('$lte' in c) {
        handled = true;
        const { l, r } = cmpVal(val, c.$lte);
        if (!(l <= r)) return false;
      }
      if ('$gt' in c) {
        handled = true;
        const { l, r } = cmpVal(val, c.$gt);
        if (!(l > r)) return false;
      }
      if ('$gte' in c) {
        handled = true;
        const { l, r } = cmpVal(val, c.$gte);
        if (!(l >= r)) return false;
      }
      if (handled) continue;
    }
    if (cond instanceof Types.ObjectId || val instanceof Types.ObjectId) {
      if (val?.toString() !== cond?.toString()) return false;
      continue;
    }
    if (val?.toString() !== cond?.toString()) return false;
  }
  return true;
};

const chain = (doc: any): any => {
  const p: any = Promise.resolve(doc);
  p.exec = () => chain(doc);
  p.select = () => chain(doc);
  p.lean = () => chain(doc);
  p.limit = () => chain(doc);
  p.sort = () => chain(doc);
  return p;
};

const buildStores = () => {
  const invoices = new Map<string, any>();
  const subscriptions = new Map<string, any>();

  const invoiceModel: any = {
    findOne: jest.fn((filter: any) => {
      for (const d of invoices.values())
        if (matches(d, filter)) return chain(d);
      return chain(null);
    }),
    findById: jest.fn((id: any) => chain(invoices.get(id.toString()) || null)),
    find: jest.fn((filter: any) => {
      const out = [...invoices.values()].filter((d) => matches(d, filter));
      return chain(out);
    }),
    findOneAndUpdate: jest.fn((filter: any, update: any) => {
      for (const d of invoices.values()) {
        if (matches(d, filter)) {
          if (update.$set) applySet(d, update.$set);
          if (update.$inc) applyInc(d, update.$inc);
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
          if (update.$inc) applyInc(d, update.$inc);
          n++;
        }
      }
      return chain({ modifiedCount: n });
    }),
  };

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

  return { invoices, subscriptions, invoiceModel, subscriptionModel };
};

const mpesaService = (
  invoiceModel: any,
  subscriptionModel: any,
  subscriptionsService?: any,
) => {
  const svc = new SubscriptionMpesaService(
    invoiceModel,
    subscriptionModel,
    {} as any,
    {} as any,
    { findById: jest.fn(() => chain(null)) } as any,
    { findOne: jest.fn(() => chain(null)) } as any,
    { findOne: jest.fn(() => chain(null)) } as any,
    { get: jest.fn(() => 'production') } as any,
    {} as any,
    {} as any,
    subscriptionsService || ({} as any),
  );
  (svc as any).environment = 'production';
  return svc;
};

const stkSuccess = (
  checkoutRequestId: string,
  receipt: string,
  amount = 100,
) => ({
  Body: {
    stkCallback: {
      MerchantRequestID: 'm1',
      CheckoutRequestID: checkoutRequestId,
      ResultCode: 0,
      ResultDesc: 'Success',
      CallbackMetadata: {
        Item: [
          { Name: 'MpesaReceiptNumber', Value: receipt },
          { Name: 'Amount', Value: amount },
          { Name: 'TransactionDate', Value: 20251015 },
        ],
      },
    },
  },
});

describe('P0-11C2 — historical settlement idempotency', () => {
  let s: ReturnType<typeof buildStores>;

  beforeEach(() => {
    s = buildStores();
    jest.clearAllMocks();
  });

  // ---------- B/C: A/B/A M-Pesa replay ----------

  it('M-Pesa A/B/A replay — crashed A effects finish safely WITHOUT regressing B state', async () => {
    const invA = makeInvoice(INV_A, {
      paymentAttempt: { checkoutRequestId: 'ws_A' },
    });
    const invB = makeInvoice(INV_B, {
      paymentAttempt: { checkoutRequestId: 'ws_B' },
    });
    s.invoices.set(INV_A, invA);
    s.invoices.set(INV_B, invB);
    s.subscriptions.set(SUB_A, makeSubscription());

    // A settles but crashes before effects.
    let crashes = 1;
    const flakySub = {
      ...s.subscriptionModel,
      findOne: jest.fn(async (filter: any) => {
        if (crashes-- > 0) throw new Error('crash before A effects');
        for (const d of s.subscriptions.values())
          if (matches(d, filter)) return d;
        return null;
      }),
    };
    const svc = mpesaService(s.invoiceModel, flakySub);
    jest
      .spyOn(svc as any, 'verifyStkSuccessWithProvider')
      .mockResolvedValue(true);

    await svc.handleStkCallback(stkSuccess('ws_A', 'RECEIPT_A'));
    expect(invA.status).toBe('paid');
    expect(invA.billingEffects?.status).toBe('pending');

    // B settles fully.
    const svc2 = mpesaService(s.invoiceModel, s.subscriptionModel);
    jest
      .spyOn(svc2 as any, 'verifyStkSuccessWithProvider')
      .mockResolvedValue(true);
    await svc2.handleStkCallback(stkSuccess('ws_B', 'RECEIPT_B'));
    const sub = s.subscriptions.get(SUB_A);
    expect(invB.status).toBe('paid');
    expect(invB.billingEffects?.status).toBe('applied');
    expect(sub.lastPaymentReference).toBe('RECEIPT_B');
    const writesAfterB = s.subscriptionModel.activationWrites.mock.calls.length;

    // A's settlement retries — effects must finish but may NOT regress B.
    await svc2.handleStkCallback(stkSuccess('ws_A', 'RECEIPT_A'));
    expect(invA.billingEffects?.status).toBe('applied');
    expect(sub.lastPaymentReference).toBe('RECEIPT_B'); // NOT 'RECEIPT_A'
    // No second period extension for the older invoice.
    expect(s.subscriptionModel.activationWrites).toHaveBeenCalledTimes(
      writesAfterB,
    );
    expect(sub.metadata.lastSettledInvoiceId?.toString()).toBe(INV_B);

    // B replay is a pure no-op.
    await svc2.handleStkCallback(stkSuccess('ws_B', 'RECEIPT_B'));
    expect(s.subscriptionModel.activationWrites).toHaveBeenCalledTimes(
      writesAfterB,
    );
    expect(sub.lastPaymentReference).toBe('RECEIPT_B');
  });

  it('M-Pesa A/B/A concurrent settlement — both apply once, newest wins tracking', async () => {
    const invA = makeInvoice(INV_A, {
      paymentAttempt: { checkoutRequestId: 'ws_A' },
    });
    const invB = makeInvoice(INV_B, {
      paymentAttempt: { checkoutRequestId: 'ws_B' },
    });
    s.invoices.set(INV_A, invA);
    s.invoices.set(INV_B, invB);
    s.subscriptions.set(SUB_A, makeSubscription());
    const svc = mpesaService(s.invoiceModel, s.subscriptionModel);
    jest
      .spyOn(svc as any, 'verifyStkSuccessWithProvider')
      .mockResolvedValue(true);

    await Promise.all([
      svc.handleStkCallback(stkSuccess('ws_A', 'RECEIPT_A')),
      svc.handleStkCallback(stkSuccess('ws_B', 'RECEIPT_B')),
    ]);

    const sub = s.subscriptions.get(SUB_A);
    expect(invA.status).toBe('paid');
    expect(invB.status).toBe('paid');
    expect(invA.billingEffects?.status).toBe('applied');
    expect(invB.billingEffects?.status).toBe('applied');
    expect(sub.status).toBe('active');
    // Each invoice applies its entitlement exactly once — 2 writes total.
    expect(s.subscriptionModel.activationWrites).toHaveBeenCalledTimes(2);

    // Replaying either invoice must not extend the period again.
    await svc.handleStkCallback(stkSuccess('ws_A', 'RECEIPT_A'));
    await svc.handleStkCallback(stkSuccess('ws_B', 'RECEIPT_B'));
    expect(s.subscriptionModel.activationWrites).toHaveBeenCalledTimes(2);
    expect(sub.metadata.lastSettledInvoiceId?.toString()).toBe(INV_B);
  });

  // ---------- D: Stripe stale replay ----------

  it('Stripe A/B/A replay — stale invoice cannot overwrite newer payment tracking', async () => {
    const authority = new InvoicePaymentAuthorityService(
      s.invoiceModel,
      s.subscriptionModel,
    );
    const invA = makeInvoice(INV_A, {
      stripePayment: { paymentIntentId: 'pi_A' },
    });
    const invB = makeInvoice(INV_B, {
      stripePayment: { paymentIntentId: 'pi_B' },
    });
    s.invoices.set(INV_A, invA);
    s.invoices.set(INV_B, invB);
    s.subscriptions.set(SUB_A, makeSubscription());

    // A settles, crashes before effects marker.
    let crashes = 1;
    const flaky = {
      ...s.subscriptionModel,
      findById: jest.fn(async (id: any) => {
        if (crashes-- > 0) throw new Error('crash before A effects');
        return s.subscriptions.get(id.toString()) || null;
      }),
    };
    const flakyAuthority = new InvoicePaymentAuthorityService(
      s.invoiceModel,
      flaky,
    );
    await expect(
      flakyAuthority.settleStripeSuccess({
        invoiceId: INV_A,
        shopId: SHOP_A,
        paymentIntentId: 'pi_A',
        amountMinor: 10000,
        currency: 'kes',
      }),
    ).rejects.toThrow('crash before A effects');
    expect(invA.status).toBe('paid');

    // B settles fully.
    await authority.settleStripeSuccess({
      invoiceId: INV_B,
      shopId: SHOP_A,
      paymentIntentId: 'pi_B',
      amountMinor: 10000,
      currency: 'kes',
    });
    const sub = s.subscriptions.get(SUB_A);
    expect(sub.lastPaymentReference).toBe('pi_B');

    // A replay: effects finish, no stale overwrite.
    await authority.settleStripeSuccess({
      invoiceId: INV_A,
      shopId: SHOP_A,
      paymentIntentId: 'pi_A',
      amountMinor: 10000,
      currency: 'kes',
    });
    expect(invA.billingEffects?.status).toBe('applied');
    expect(sub.lastPaymentReference).toBe('pi_B');
    expect(sub.lastPaymentMethod).toBe('stripe');
    expect(sub.metadata.lastSettledInvoiceId?.toString()).toBe(INV_B);
  });

  // ---------- E: durable pending-effects recovery ----------

  it('reconciliation worker drains pending effects with no webhooks and no polling', async () => {
    const invA = makeInvoice(INV_A, {
      status: 'paid',
      paymentMethod: 'mpesa_stk',
      mpesaReceiptNumber: 'RECEIPT_A',
      billingEffects: { status: 'pending', channel: 'mpesa_stk', attempts: 0 },
    });
    s.invoices.set(INV_A, invA);
    s.subscriptions.set(SUB_A, makeSubscription());

    const mpesa = mpesaService(s.invoiceModel, s.subscriptionModel);
    const authority = new InvoicePaymentAuthorityService(
      s.invoiceModel,
      s.subscriptionModel,
    );
    const worker = new BillingEffectsReconciliationService(
      s.invoiceModel,
      authority,
      mpesa,
    );

    const report = await worker.reconcilePendingBillingEffects();
    expect(report.processed).toBe(1);
    expect(invA.billingEffects?.status).toBe('applied');
    expect(s.subscriptions.get(SUB_A).status).toBe('active');

    // Second run: nothing left to do.
    const again = await worker.reconcilePendingBillingEffects();
    expect(again.processed).toBe(0);
  });

  it('reconciliation retries failures with backoff and surfaces stuck records', async () => {
    const invA = makeInvoice(INV_A, {
      status: 'paid',
      billingEffects: { status: 'pending', channel: 'mpesa_stk', attempts: 0 },
    });
    s.invoices.set(INV_A, invA);
    s.subscriptions.set(SUB_A, makeSubscription());

    const brokenSub = {
      ...s.subscriptionModel,
      findOne: jest.fn(async () => {
        throw new Error('persistent DB failure');
      }),
    };
    const mpesa = mpesaService(s.invoiceModel, brokenSub);
    const authority = new InvoicePaymentAuthorityService(
      s.invoiceModel,
      brokenSub,
    );
    const worker = new BillingEffectsReconciliationService(
      s.invoiceModel,
      authority,
      mpesa,
    );
    const opts = { maxAttempts: 2, backoffMs: () => 0 };

    await worker.reconcilePendingBillingEffects(opts);
    expect(invA.billingEffects.attempts).toBeGreaterThanOrEqual(1);
    expect(invA.billingEffects.lastError).toMatch(/persistent/);

    // With zero backoff, second run retries immediately → exhausts.
    await worker.reconcilePendingBillingEffects(opts);
    expect(invA.billingEffects.status).toBe('failed');

    const stuck = await worker.listStuckBillingEffects();
    expect(stuck.map((i: any) => i._id.toString())).toContain(INV_A);
  });

  // ---------- F: STK provenance ----------

  it('forged receipt in verified callback settles but receipt is NOT verified evidence', async () => {
    const invA = makeInvoice(INV_A, {
      paymentAttempt: { checkoutRequestId: 'ws_F' },
    });
    s.invoices.set(INV_A, invA);
    s.subscriptions.set(SUB_A, makeSubscription());
    const svc = mpesaService(s.invoiceModel, s.subscriptionModel);
    jest
      .spyOn(svc as any, 'verifyStkSuccessWithProvider')
      .mockResolvedValue(true);

    await svc.handleStkCallback(stkSuccess('ws_F', 'FABRICATED9'));
    expect(invA.status).toBe('paid');
    // Settlement is legitimate (provider confirmed) — but the receipt is
    // unsigned callback data, never verified receipt evidence.
    expect(invA.stkPayment.receiptSource).toBe('callback');
    expect(invA.stkPayment.providerVerified).toBe(true);
    expect(invA.stkPayment.amountSource).toBe('callback');
    expect(invA.mpesaReceiptNumber).toBe('FABRICATED9');
  });

  it('query-settled invoice records requested amount, not independently observed', async () => {
    const invA = makeInvoice(INV_A, {
      paymentAttempt: { checkoutRequestId: 'ws_Q' },
    });
    s.invoices.set(INV_A, invA);
    s.subscriptions.set(SUB_A, makeSubscription());
    const svc = mpesaService(s.invoiceModel, s.subscriptionModel);
    jest.spyOn(svc as any, 'queryDarajaStkStatus').mockResolvedValue({
      success: true,
      resultCode: '0',
      resultDesc: 'Success',
    });

    const res = await svc.queryStkStatus('ws_Q', SHOP_A);
    expect(res.success).toBe(true);
    expect(invA.status).toBe('paid');
    expect(invA.stkPayment.amountSource).toBe('requested');
    expect(invA.stkPayment.receiptNumber).toBeUndefined();
    expect(invA.stkPayment.providerVerified).toBe(true);
  });
});
