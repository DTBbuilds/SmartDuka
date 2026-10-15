import { Types } from 'mongoose';
import { InvoicePaymentAuthorityService } from './services/invoice-payment-authority.service';
import { SubscriptionMpesaService } from './subscription-mpesa.service';
import { SubscriptionsService } from './subscriptions.service';
import { BillingEffectsReconciliationService } from './services/billing-effects-reconciliation.service';

jest.mock('nanoid', () => ({ nanoid: () => 'P011C3' }));

/**
 * P0-11C3 — INVOICE ORDERING & SETTLEMENT COMPLETENESS
 *
 * Invariant: EVERY legitimately paid invoice receives its correct billing
 * treatment EXACTLY ONCE — regardless of creation order, payment-arrival
 * order, replay, concurrency, or crash. The per-invoice
 * pending → applying → applied claim is the once-guard; the subscription
 * marker is informational only. Renewal entitlement extends from
 * max(now, currentPeriodEnd) via a CAS retry; tracking fields are
 * newest-paidAt-wins.
 */

const SHOP_A = '507f1f77bcf86cd7994390aa';
const INV_A = '507f1f77bcf86cd7994390b1'; // created first
const INV_B = '507f1f77bcf86cd7994390b2'; // created second
const INV_U = '507f1f77bcf86cd7994390b3'; // upgrade
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

const norm = (x: any) =>
  x instanceof Types.ObjectId ? x.toString() : x instanceof Date ? +x : x;

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
        if (!(norm(val) < norm(c.$lt))) return false;
      }
      if ('$lte' in c) {
        handled = true;
        if (!(norm(val) <= norm(c.$lte))) return false;
      }
      if ('$gt' in c) {
        handled = true;
        if (!(norm(val) > norm(c.$gt))) return false;
      }
      if ('$gte' in c) {
        handled = true;
        if (!(norm(val) >= norm(c.$gte))) return false;
      }
      if (handled) continue;
    }
    if (cond === null) {
      if (val !== null && val !== undefined) return false;
      continue;
    }
    if (val instanceof Date || cond instanceof Date) {
      if (norm(val) !== norm(cond)) return false;
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
  const shops = new Map<string, any>();

  const invoiceModel: any = {
    findOne: jest.fn((filter: any) => {
      for (const d of invoices.values())
        if (matches(d, filter)) return chain(d);
      return chain(null);
    }),
    findById: jest.fn((id: any) => chain(invoices.get(id.toString()) || null)),
    find: jest.fn((filter: any) =>
      chain([...invoices.values()].filter((d) => matches(d, filter))),
    ),
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

  const extensionWrites = jest.fn();
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
            if ('currentPeriodEnd' in update.$set) extensionWrites();
            applySet(d, update.$set);
          }
          return { modifiedCount: 1 };
        }
      }
      return { modifiedCount: 0 };
    }),
    extensionWrites,
  };

  const shopModel: any = {
    findById: jest.fn(async (id: any) => shops.get(id.toString()) || null),
  };

  return {
    invoices,
    subscriptions,
    shops,
    invoiceModel,
    subscriptionModel,
    shopModel,
  };
};

const mpesaService = (
  s: ReturnType<typeof buildStores>,
  overrides: any = {},
) => {
  const svc = new SubscriptionMpesaService(
    s.invoiceModel,
    overrides.subscriptionModel || s.subscriptionModel,
    {} as any,
    {} as any,
    { findById: jest.fn(() => chain(null)) } as any,
    { findOne: jest.fn(() => chain(null)) } as any,
    { findOne: jest.fn(() => chain(null)) } as any,
    { get: jest.fn(() => 'production') } as any,
    {} as any,
    {} as any,
    overrides.subscriptionsService || ({} as any),
  );
  (svc as any).environment = 'production';
  return svc;
};

const subscriptionsService = (s: ReturnType<typeof buildStores>) =>
  new SubscriptionsService(
    s.subscriptionModel,
    {} as any,
    s.invoiceModel,
    s.shopModel,
    {} as any,
    {} as any,
    {} as any,
    { get: jest.fn() } as any,
    { sendEmail: jest.fn() } as any,
  );

const stkSuccess = (checkoutRequestId: string, receipt: string) => ({
  Body: {
    stkCallback: {
      MerchantRequestID: 'm1',
      CheckoutRequestID: checkoutRequestId,
      ResultCode: 0,
      ResultDesc: 'Success',
      CallbackMetadata: {
        Item: [
          { Name: 'MpesaReceiptNumber', Value: receipt },
          { Name: 'Amount', Value: 100 },
          { Name: 'TransactionDate', Value: 20251015 },
        ],
      },
    },
  },
});

const MS_30_DAYS = 30 * 24 * 60 * 60 * 1000;

describe('P0-11C3 — invoice ordering & settlement completeness', () => {
  let s: ReturnType<typeof buildStores>;

  beforeEach(() => {
    s = buildStores();
    jest.clearAllMocks();
  });

  // ---------- B-first settlement (reverse of creation order) ----------

  it('B paid before A — both get their entitlement exactly once, tracking = latest paid', async () => {
    s.invoices.set(
      INV_A,
      makeInvoice(INV_A, { paymentAttempt: { checkoutRequestId: 'ws_A' } }),
    );
    s.invoices.set(
      INV_B,
      makeInvoice(INV_B, { paymentAttempt: { checkoutRequestId: 'ws_B' } }),
    );
    s.subscriptions.set(SUB_A, makeSubscription());
    const svc = mpesaService(s);
    jest
      .spyOn(svc as any, 'verifyStkSuccessWithProvider')
      .mockResolvedValue(true);

    // B pays and settles BEFORE A.
    await svc.handleStkCallback(stkSuccess('ws_B', 'RECEIPT_B'));
    const sub = s.subscriptions.get(SUB_A);
    expect(sub.status).toBe('active');
    const endAfterB = sub.currentPeriodEnd.getTime();

    // A pays AFTER B — A's entitlement still applies exactly once.
    await svc.handleStkCallback(stkSuccess('ws_A', 'RECEIPT_A'));
    expect(invAStatus(s, INV_A)).toBe('paid');
    expect(s.invoices.get(INV_A).billingEffects?.status).toBe('applied');
    expect(s.invoices.get(INV_B).billingEffects?.status).toBe('applied');
    // Two paid invoices → two extensions (A extends from B's end).
    expect(s.subscriptionModel.extensionWrites).toHaveBeenCalledTimes(2);
    expect(sub.currentPeriodEnd.getTime()).toBeGreaterThan(endAfterB);
    // A paid most recently → tracking shows A.
    expect(sub.lastPaymentReference).toBe('RECEIPT_A');

    // Replays of BOTH old events — pure no-ops.
    await svc.handleStkCallback(stkSuccess('ws_B', 'RECEIPT_B'));
    await svc.handleStkCallback(stkSuccess('ws_A', 'RECEIPT_A'));
    expect(s.subscriptionModel.extensionWrites).toHaveBeenCalledTimes(2);
    expect(sub.lastPaymentReference).toBe('RECEIPT_A');
  });

  it('concurrent A/B settlement — each applies once, extensions serialize', async () => {
    s.invoices.set(
      INV_A,
      makeInvoice(INV_A, { paymentAttempt: { checkoutRequestId: 'ws_A' } }),
    );
    s.invoices.set(
      INV_B,
      makeInvoice(INV_B, { paymentAttempt: { checkoutRequestId: 'ws_B' } }),
    );
    s.subscriptions.set(SUB_A, makeSubscription());
    const svc = mpesaService(s);
    jest
      .spyOn(svc as any, 'verifyStkSuccessWithProvider')
      .mockResolvedValue(true);

    await Promise.all([
      svc.handleStkCallback(stkSuccess('ws_A', 'RECEIPT_A')),
      svc.handleStkCallback(stkSuccess('ws_B', 'RECEIPT_B')),
    ]);

    const sub = s.subscriptions.get(SUB_A);
    expect(s.invoices.get(INV_A).billingEffects?.status).toBe('applied');
    expect(s.invoices.get(INV_B).billingEffects?.status).toBe('applied');
    expect(s.subscriptionModel.extensionWrites).toHaveBeenCalledTimes(2);
    // Both extensions serialized — end is ~2 cycles from now.
    expect(sub.currentPeriodEnd.getTime()).toBeGreaterThan(
      Date.now() + MS_30_DAYS + MS_30_DAYS - 60_000,
    );
  });

  // ---------- Upgrade interleave ----------

  it('upgrade and renewal invoices interleave — each gets its own treatment once', async () => {
    const activatePendingUpgrade = jest
      .fn()
      .mockResolvedValue({ planCode: 'pro' });
    s.invoices.set(
      INV_A,
      makeInvoice(INV_A, { paymentAttempt: { checkoutRequestId: 'ws_A' } }),
    );
    s.invoices.set(
      INV_U,
      makeInvoice(INV_U, {
        type: 'upgrade',
        paymentAttempt: { checkoutRequestId: 'ws_U' },
      }),
    );
    s.subscriptions.set(
      SUB_A,
      makeSubscription({
        pendingUpgrade: { invoiceId: INV_U, planCode: 'pro' },
      }),
    );
    const svc = mpesaService(s, {
      subscriptionsService: { activatePendingUpgrade },
    });
    jest
      .spyOn(svc as any, 'verifyStkSuccessWithProvider')
      .mockResolvedValue(true);

    // Upgrade invoice pays → activates the pending upgrade, not a renewal.
    await svc.handleStkCallback(stkSuccess('ws_U', 'RECEIPT_U'));
    expect(activatePendingUpgrade).toHaveBeenCalledTimes(1);
    expect(s.invoices.get(INV_U).billingEffects?.status).toBe('applied');
    expect(s.subscriptionModel.extensionWrites).not.toHaveBeenCalled();

    // Renewal invoice pays → its own extension.
    await svc.handleStkCallback(stkSuccess('ws_A', 'RECEIPT_A'));
    expect(s.subscriptionModel.extensionWrites).toHaveBeenCalledTimes(1);
    expect(s.invoices.get(INV_A).billingEffects?.status).toBe('applied');

    // Replay both — no duplicate upgrade, no extra extension.
    await svc.handleStkCallback(stkSuccess('ws_U', 'RECEIPT_U'));
    await svc.handleStkCallback(stkSuccess('ws_A', 'RECEIPT_A'));
    expect(activatePendingUpgrade).toHaveBeenCalledTimes(1);
    expect(s.subscriptionModel.extensionWrites).toHaveBeenCalledTimes(1);
  });

  // ---------- Immutable invoice period terms ----------

  it('invoice-carried service period defines the extension duration', async () => {
    const periodStart = new Date('2026-01-01');
    const periodEnd = new Date('2026-04-01'); // 90 days of service
    s.invoices.set(
      INV_A,
      makeInvoice(INV_A, {
        periodStart,
        periodEnd,
        paymentAttempt: { checkoutRequestId: 'ws_A' },
      }),
    );
    s.subscriptions.set(SUB_A, makeSubscription());
    const svc = mpesaService(s);
    jest
      .spyOn(svc as any, 'verifyStkSuccessWithProvider')
      .mockResolvedValue(true);

    await svc.handleStkCallback(stkSuccess('ws_A', 'RECEIPT_A'));
    const sub = s.subscriptions.get(SUB_A);
    const expected = Date.now() + (periodEnd.getTime() - periodStart.getTime());
    expect(Math.abs(sub.currentPeriodEnd.getTime() - expected)).toBeLessThan(
      60_000,
    );
  });

  // ---------- Manual-verification recovery ----------

  it('manual verify → crash before effects → worker recovers via manual channel (no STK fabrication)', async () => {
    const inv = makeInvoice(INV_A, {
      status: 'paid',
      paymentMethod: 'manual',
      mpesaReceiptNumber: 'MANUALRCPT1',
      billingEffects: { status: 'pending', channel: 'manual', attempts: 0 },
    });
    s.invoices.set(INV_A, inv);
    s.subscriptions.set(SUB_A, makeSubscription());
    s.shops.set(
      SHOP_A,
      Object.assign(
        {
          _id: new Types.ObjectId(SHOP_A),
          status: 'suspended',
          subscriptionStatus: 'suspended',
        },
        {
          save: jest.fn(async function (this: any) {
            return this;
          }),
        },
      ),
    );

    const mpesa = mpesaService(s);
    const stkSpy = jest.spyOn(mpesa, 'ensureStkBillingEffects');
    const subs = subscriptionsService(s);
    const worker = new BillingEffectsReconciliationService(
      s.invoiceModel,
      new InvoicePaymentAuthorityService(s.invoiceModel, s.subscriptionModel),
      mpesa,
      subs,
    );

    const report = await worker.reconcilePendingBillingEffects();
    expect(report.recovered).toBe(1);
    // Dispatched on channel — NOT through the STK primitive.
    expect(stkSpy).not.toHaveBeenCalled();

    const sub = s.subscriptions.get(SUB_A);
    const invoice = s.invoices.get(INV_A);
    expect(invoice.billingEffects?.status).toBe('applied');
    expect(sub.status).toBe('active');
    expect(sub.setupPaid).toBe(true);
    expect(sub.setupPaidAt).toBeInstanceOf(Date);
    expect(sub.lastPaymentReference).toBe('MANUALRCPT1');
    expect(sub.lastPaymentMethod).toBe('manual');
    // No fabricated STK/provider payment data.
    expect(invoice.stkPayment).toBeUndefined();
    expect(invoice.paymentMethod).toBe('manual');
    // Suspended shop reactivated.
    expect(s.shops.get(SHOP_A).status).toBe('active');
    // Exactly-once across repeated recovery.
    await worker.reconcilePendingBillingEffects();
    expect(s.subscriptionModel.extensionWrites).toHaveBeenCalledTimes(1);
  });

  // ---------- Stale 'applying' lease reclaim ----------

  it('crashed mid-application (stale applying lease) is reclaimed by the worker', async () => {
    s.invoices.set(
      INV_A,
      makeInvoice(INV_A, {
        status: 'paid',
        paymentMethod: 'mpesa_stk',
        mpesaReceiptNumber: 'RECEIPT_A',
        billingEffects: {
          status: 'applying',
          channel: 'mpesa_stk',
          claimedAt: new Date(Date.now() - 60 * 60 * 1000), // 1h stale
          attempts: 1,
        },
      }),
    );
    s.subscriptions.set(SUB_A, makeSubscription());
    const worker = new BillingEffectsReconciliationService(
      s.invoiceModel,
      new InvoicePaymentAuthorityService(s.invoiceModel, s.subscriptionModel),
      mpesaService(s),
      subscriptionsService(s),
    );

    const report = await worker.reconcilePendingBillingEffects();
    expect(report.recovered).toBe(1);
    expect(s.invoices.get(INV_A).billingEffects?.status).toBe('applied');
    expect(s.subscriptions.get(SUB_A).status).toBe('active');
  });

  it('fresh applying lease is NOT reclaimed (another applier in flight)', async () => {
    s.invoices.set(
      INV_A,
      makeInvoice(INV_A, {
        status: 'paid',
        billingEffects: {
          status: 'applying',
          channel: 'mpesa_stk',
          claimedAt: new Date(), // live claim
          attempts: 0,
        },
      }),
    );
    s.subscriptions.set(SUB_A, makeSubscription());
    const worker = new BillingEffectsReconciliationService(
      s.invoiceModel,
      new InvoicePaymentAuthorityService(s.invoiceModel, s.subscriptionModel),
      mpesaService(s),
      subscriptionsService(s),
    );

    const report = await worker.reconcilePendingBillingEffects();
    expect(report.recovered).toBe(0);
    expect(s.invoices.get(INV_A).billingEffects?.status).toBe('applying');
  });

  // ---------- Stale reactivation prevention ----------

  it('older Stripe replay cannot reactivate a subscription past-due on a newer invoice', async () => {
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

    // A settles fully (paidAt_A), then subscription goes past_due on a
    // NEWER unpaid invoice.
    await authority.settleStripeSuccess({
      invoiceId: INV_A,
      shopId: SHOP_A,
      paymentIntentId: 'pi_A',
      amountMinor: 10000,
      currency: 'kes',
    });
    const sub = s.subscriptions.get(SUB_A);
    expect(sub.status).toBe('active');
    sub.status = 'past_due'; // newer invoice B outstanding

    // B settles (paidAt_B > paidAt_A) — reactivates.
    await authority.settleStripeSuccess({
      invoiceId: INV_B,
      shopId: SHOP_A,
      paymentIntentId: 'pi_B',
      amountMinor: 10000,
      currency: 'kes',
    });
    expect(sub.status).toBe('active');
    expect(sub.lastPaymentReference).toBe('pi_B');

    // Now regress to past_due and replay OLD A — it must not reactivate
    // or overwrite tracking.
    sub.status = 'past_due';
    invA.billingEffects.status = 'pending'; // simulate unfinished effects
    await authority.settleStripeSuccess({
      invoiceId: INV_A,
      shopId: SHOP_A,
      paymentIntentId: 'pi_A',
      amountMinor: 10000,
      currency: 'kes',
    });
    expect(sub.lastPaymentReference).toBe('pi_B');
    expect(sub.status).toBe('past_due');
    expect(invA.billingEffects?.status).toBe('applied');
  });
});

const invAStatus = (s: any, id: string) => s.invoices.get(id).status;
