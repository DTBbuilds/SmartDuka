import { Types } from 'mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderPaymentAuthorityService,
  toMinorUnits,
} from './services/order-payment-authority.service';
import { MpesaController } from './mpesa.controller';
import { StripeController } from '../stripe/stripe.controller';

jest.mock('nanoid', () => ({ nanoid: () => 'IDEM' }));

/**
 * P0-10C — EXTERNAL PAYMENT INITIATION AUTHORITY + VOID INTERLOCK SHIELD
 *
 * In-memory store implementing the Mongo semantics the interlock relies on:
 * updateOne evaluates its filter against the document AT WRITE TIME and
 * applies the update synchronously — the atomicity guarantee of a real
 * conditional write. A "race" between payment initiation and a void claim is
 * therefore a strict ordering of two atomic writes: whichever lands first
 * wins, and the loser's predicate sees the winner's committed state.
 */
describe('P0-10C external payment initiation authority', () => {
  const SHOP_A = '507f1f77bcf86cd799439011';
  const SHOP_B = '507f1f77bcf86cd799439099';
  const CASHIER = '507f1f77bcf86cd7994390a2';
  const ORDER_1 = '507f1f77bcf86cd7994390c1';
  const ORDER_UNKNOWN = '507f1f77bcf86cd7994390ff';

  // ────────────────── minimal mongo-semantics store ──────────────────

  function eqVal(a: any, b: any): boolean {
    if (a instanceof Types.ObjectId || b instanceof Types.ObjectId) {
      return String(a) === String(b);
    }
    return a === b;
  }

  function getPath(doc: any, path: string): any {
    const parts = path.split('.');
    let cur: any = doc;
    for (const p of parts) {
      if (cur === undefined || cur === null) return undefined;
      cur = cur[p];
    }
    return cur;
  }

  function matchCond(value: any, cond: any): boolean {
    if (
      cond !== null &&
      typeof cond === 'object' &&
      !(cond instanceof Types.ObjectId) &&
      !(cond instanceof Date) &&
      !Array.isArray(cond)
    ) {
      const keys = Object.keys(cond);
      if (keys.length > 0 && keys.every((k) => k.startsWith('$'))) {
        return keys.every((op) => {
          const arg = cond[op];
          switch (op) {
            case '$ne':
              return !eqVal(value, arg);
            case '$in':
              return arg.some((x: any) => eqVal(value, x));
            case '$exists':
              return (value !== undefined) === arg;
            case '$elemMatch':
              return (
                Array.isArray(value) && value.some((el) => matchFilter(el, arg))
              );
            case '$not':
              return !matchCond(value, arg);
            default:
              throw new Error(`unsupported op ${op}`);
          }
        });
      }
      return matchFilter(value, cond);
    }
    return eqVal(value, cond);
  }

  function matchFilter(doc: any, filter: any): boolean {
    return Object.entries(filter).every(([key, cond]) => {
      if (key === '$and')
        return (cond as any[]).every((c) => matchFilter(doc, c));
      if (key === '$or')
        return (cond as any[]).some((c) => matchFilter(doc, c));
      return matchCond(getPath(doc, key), cond);
    });
  }

  function matchArrayElement(el: any, af: any, name: string): boolean {
    return Object.entries(af).every(([k, cond]) => {
      const field = k.startsWith(`${name}.`) ? k.slice(name.length + 1) : k;
      return matchCond(getPath(el, field), cond);
    });
  }

  function applySetPath(
    node: any,
    parts: string[],
    value: any,
    arrayFilters: any[],
  ): void {
    if (node === undefined || node === null) return;
    const [head, ...rest] = parts;
    const positional = /^\$\[(.+)\]$/.exec(head);
    if (rest.length === 0 && !positional) {
      node[head] = value;
      return;
    }
    if (positional) {
      const name = positional[1];
      const af = arrayFilters.find((f) =>
        Object.keys(f).some((k) => k.startsWith(`${name}.`)),
      );
      for (const el of node) {
        if (!af || matchArrayElement(el, af, name)) {
          applySetPath(el, rest, value, arrayFilters);
        }
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((el) => applySetPath(el, parts, value, arrayFilters));
      return;
    }
    if (node[head] === undefined) node[head] = {};
    applySetPath(node[head], rest, value, arrayFilters);
  }

  function makeOrderModel(docs: any[]) {
    return {
      findOne: jest.fn((filter: any) => ({
        lean: () => ({
          exec: async () => docs.find((d) => matchFilter(d, filter)) ?? null,
        }),
        exec: async () => docs.find((d) => matchFilter(d, filter)) ?? null,
      })),
      updateOne: jest.fn(
        (filter: any, update: any, opts?: { arrayFilters?: any[] }) => ({
          exec: async () => {
            const doc = docs.find((d) => matchFilter(d, filter));
            if (!doc) return { matchedCount: 0, modifiedCount: 0 };
            for (const [path, value] of Object.entries(update.$set ?? {})) {
              applySetPath(
                doc,
                path.split('.'),
                value,
                opts?.arrayFilters ?? [],
              );
            }
            return { matchedCount: 1, modifiedCount: 1 };
          },
        }),
      ),
    };
  }

  // P0-10B void-claim predicate — the other half of the interlock. Initiation
  // must atomically lose against it (and vice-versa) on the same document.
  function applyVoidClaim(
    store: ReturnType<typeof makeOrderModel>,
    orderId: string,
    shopId: string,
  ): Promise<{ matchedCount: number; modifiedCount: number }> {
    return store
      .updateOne(
        {
          _id: new Types.ObjectId(orderId),
          shopId: new Types.ObjectId(shopId),
          status: { $ne: 'void' },
          voidOperation: { $exists: false },
          $and: [
            { payments: { $not: { $elemMatch: { status: 'completed' } } } },
            {
              payments: {
                $not: {
                  $elemMatch: {
                    method: { $in: ['mpesa', 'stripe'] },
                    status: 'pending',
                  },
                },
              },
            },
          ],
        },
        {
          $set: {
            voidOperation: {
              voidOperationId: 'v-1',
              reason: 'test',
              requestedBy: new Types.ObjectId(CASHIER),
              createdAt: new Date(),
              status: 'in_progress',
              stockRestorations: [],
            },
          },
        },
      )
      .exec();
  }

  function makeOrder(overrides: any = {}) {
    return {
      _id: ORDER_1,
      shopId: SHOP_A,
      orderNumber: 'STK-2025-ORD001',
      status: 'pending',
      paymentStatus: 'unpaid',
      total: 100,
      payments: [{ method: 'mpesa', amount: 100, status: 'pending' }],
      ...overrides,
    };
  }

  const user = { sub: CASHIER, shopId: SHOP_A, email: 'c@shop.test' } as any;

  let docs: any[];
  let orderModel: ReturnType<typeof makeOrderModel>;
  let authority: OrderPaymentAuthorityService;
  let multiTenant: {
    getMpesaConfigStatus: jest.Mock;
    initiateSTKPush: jest.Mock;
  };
  let mpesa: MpesaController;
  let stripeService: { isStripeConfigured: jest.Mock };
  let stripePayments: { createPOSPayment: jest.Mock };
  let stripe: StripeController;

  beforeEach(() => {
    docs = [];
    orderModel = makeOrderModel(docs);
    authority = new OrderPaymentAuthorityService(orderModel as any);
    multiTenant = {
      getMpesaConfigStatus: jest.fn(async () => ({
        isConfigured: true,
        isEnabled: true,
        isVerified: true,
      })),
      initiateSTKPush: jest.fn(async () => ({
        success: true,
        transactionId: 'tx-1',
        checkoutRequestId: 'cr-1',
      })),
    };
    mpesa = new MpesaController(
      {} as any,
      multiTenant as any,
      {} as any,
      {} as any,
      authority,
    );
    stripeService = { isStripeConfigured: jest.fn(() => true) };
    stripePayments = {
      createPOSPayment: jest.fn(async (params: any) => ({
        paymentIntentId: 'pi_1',
        clientSecret: 'secret_1',
        amount: params.amount,
        currency: params.currency || 'kes',
      })),
    };
    stripe = new StripeController(
      stripeService as any,
      {} as any,
      stripePayments as any,
      {} as any,
      {} as any,
      authority,
    );
  });

  const mpesaDto = (orderId: string, amount = 100) => ({
    orderId,
    phoneNumber: '0712345678',
    amount,
  });

  // ── reproductions: the defects this phase closes ──

  it('rejects M-Pesa initiation for a void order; Daraja never called', async () => {
    docs.push(
      makeOrder({
        status: 'void',
        payments: [{ method: 'mpesa', amount: 100, status: 'failed' }],
      }),
    );
    await expect(
      mpesa.initiatePayment(user, mpesaDto(ORDER_1) as any),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(multiTenant.initiateSTKPush).not.toHaveBeenCalled();
  });

  it('rejects Stripe initiation for a void order; PaymentIntent never created', async () => {
    docs.push(
      makeOrder({
        status: 'void',
        payments: [{ method: 'stripe', amount: 100, status: 'failed' }],
      }),
    );
    await expect(
      stripe.createPOSPayment(user, {
        orderId: ORDER_1,
        orderNumber: 'FORGED',
        amount: 100,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(stripePayments.createPOSPayment).not.toHaveBeenCalled();
  });

  it('rejects initiation while a void claim is in progress (both methods)', async () => {
    docs.push(
      makeOrder({
        voidOperation: { voidOperationId: 'v-1', status: 'in_progress' },
      }),
    );
    await expect(
      mpesa.initiatePayment(user, mpesaDto(ORDER_1) as any),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      stripe.createPOSPayment(user, {
        orderId: ORDER_1,
        orderNumber: 'X',
        amount: 100,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(multiTenant.initiateSTKPush).not.toHaveBeenCalled();
    expect(stripePayments.createPOSPayment).not.toHaveBeenCalled();
  });

  it('rejects completed orders — no incremental POS charges', async () => {
    docs.push(
      makeOrder({
        status: 'completed',
        paymentStatus: 'paid',
        payments: [{ method: 'stripe', amount: 100, status: 'completed' }],
      }),
    );
    await expect(
      stripe.createPOSPayment(user, {
        orderId: ORDER_1,
        orderNumber: 'X',
        amount: 100,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(stripePayments.createPOSPayment).not.toHaveBeenCalled();
  });

  it('rejects cross-tenant and unknown order ids with zero provider calls', async () => {
    docs.push(makeOrder({ shopId: SHOP_B })); // belongs to another shop
    await expect(
      mpesa.initiatePayment(user, mpesaDto(ORDER_1) as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      stripe.createPOSPayment(user, { orderId: ORDER_1, amount: 100 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      mpesa.initiatePayment(user, mpesaDto(ORDER_UNKNOWN) as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(multiTenant.initiateSTKPush).not.toHaveBeenCalled();
    expect(stripePayments.createPOSPayment).not.toHaveBeenCalled();
  });

  it('rejects a pending order with no eligible allocation for the method', async () => {
    docs.push(
      makeOrder({
        payments: [{ method: 'cash', amount: 100, status: 'completed' }],
      }),
    );
    await expect(
      mpesa.initiatePayment(user, mpesaDto(ORDER_1) as any),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(multiTenant.initiateSTKPush).not.toHaveBeenCalled();
  });

  it('fails closed on ambiguous split allocations for the same method', async () => {
    docs.push(
      makeOrder({
        payments: [
          { method: 'stripe', amount: 60, status: 'pending' },
          { method: 'stripe', amount: 40, status: 'pending' },
        ],
      }),
    );
    await expect(
      stripe.createPOSPayment(user, { orderId: ORDER_1, amount: 100 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(stripePayments.createPOSPayment).not.toHaveBeenCalled();
  });

  // ── amount + order-number authority ──

  it('rejects M-Pesa amount tampering (1 and 10000 vs authoritative 100)', async () => {
    docs.push(makeOrder());
    await expect(
      mpesa.initiatePayment(user, mpesaDto(ORDER_1, 1) as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      mpesa.initiatePayment(user, mpesaDto(ORDER_1, 10000) as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(multiTenant.initiateSTKPush).not.toHaveBeenCalled();
  });

  it('sends the server-derived amount and orderNumber to Daraja', async () => {
    docs.push(makeOrder());
    const res = await mpesa.initiatePayment(user, mpesaDto(ORDER_1, 100));
    expect(res.success).toBe(true);
    const call = multiTenant.initiateSTKPush.mock.calls[0][0];
    expect(call.amount).toBe(100); // order allocation, not fabricated
    expect(call.orderNumber).toBe('STK-2025-ORD001'); // not ORD-<id-slice>
    expect(call.shopId).toBe(SHOP_A);
  });

  it('rejects Stripe amount tampering (client minor units vs authoritative)', async () => {
    docs.push(
      makeOrder({
        payments: [{ method: 'stripe', amount: 100, status: 'pending' }],
      }),
    );
    await expect(
      stripe.createPOSPayment(user, { orderId: ORDER_1, amount: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      stripe.createPOSPayment(user, { orderId: ORDER_1, amount: 10000 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(stripePayments.createPOSPayment).not.toHaveBeenCalled();
  });

  it('sends server-derived Stripe amount + orderNumber (zero-decimal KES)', async () => {
    docs.push(
      makeOrder({
        payments: [{ method: 'stripe', amount: 100, status: 'pending' }],
      }),
    );
    const res = await stripe.createPOSPayment(user, {
      orderId: ORDER_1,
      orderNumber: 'FORGED',
      amount: 100,
      currency: 'kes',
    });
    expect(res.success).toBe(true);
    const call = stripePayments.createPOSPayment.mock.calls[0][0];
    expect(call.amount).toBe(100);
    expect(call.orderNumber).toBe('STK-2025-ORD001');
  });

  it('converts to minor units for non-zero-decimal currencies (USD)', async () => {
    docs.push(
      makeOrder({
        payments: [{ method: 'stripe', amount: 5, status: 'pending' }],
      }),
    );
    await expect(
      stripe.createPOSPayment(user, {
        orderId: ORDER_1,
        amount: 5,
        currency: 'usd',
      }),
    ).rejects.toBeInstanceOf(BadRequestException); // 5 ≠ 500 minor units
    const res = await stripe.createPOSPayment(user, {
      orderId: ORDER_1,
      amount: 500,
      currency: 'usd',
    });
    expect(res.success).toBe(true);
    expect(stripePayments.createPOSPayment.mock.calls[0][0].amount).toBe(500);
  });

  // ── interlock races ──

  it('M-Pesa initiation || void: initiation wins → void cannot claim', async () => {
    // order with a terminal-failed mpesa attempt is voidable UNTIL a retry
    // claim re-establishes pending — the real race window.
    docs.push(
      makeOrder({
        payments: [{ method: 'mpesa', amount: 100, status: 'failed' }],
      }),
    );
    await mpesa.initiatePayment(user, mpesaDto(ORDER_1, 100));
    expect(docs[0].payments[0].status).toBe('pending');
    const voidResult = await applyVoidClaim(orderModel, ORDER_1, SHOP_A);
    expect(voidResult.matchedCount).toBe(0); // pending external now blocks void
    expect(docs[0].voidOperation).toBeUndefined();
  });

  it('M-Pesa initiation || void: void wins → initiation rejected pre-provider', async () => {
    docs.push(
      makeOrder({
        payments: [{ method: 'mpesa', amount: 100, status: 'failed' }],
      }),
    );
    const voidResult = await applyVoidClaim(orderModel, ORDER_1, SHOP_A);
    expect(voidResult.matchedCount).toBe(1);
    await expect(
      mpesa.initiatePayment(user, mpesaDto(ORDER_1, 100) as any),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(multiTenant.initiateSTKPush).not.toHaveBeenCalled();
  });

  it('Stripe initiation || void: initiation wins → void cannot claim', async () => {
    docs.push(
      makeOrder({
        payments: [{ method: 'stripe', amount: 100, status: 'failed' }],
      }),
    );
    await stripe.createPOSPayment(user, { orderId: ORDER_1, amount: 100 });
    expect(docs[0].payments[0].status).toBe('pending');
    const voidResult = await applyVoidClaim(orderModel, ORDER_1, SHOP_A);
    expect(voidResult.matchedCount).toBe(0);
    expect(docs[0].voidOperation).toBeUndefined();
  });

  it('Stripe initiation || void: void wins → initiation rejected pre-provider', async () => {
    docs.push(
      makeOrder({
        payments: [{ method: 'stripe', amount: 100, status: 'failed' }],
      }),
    );
    await applyVoidClaim(orderModel, ORDER_1, SHOP_A);
    await expect(
      stripe.createPOSPayment(user, { orderId: ORDER_1, amount: 100 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(stripePayments.createPOSPayment).not.toHaveBeenCalled();
  });

  // ── failure / retry semantics ──

  it('definitive provider rejection → terminal failed → void permitted, retry safe', async () => {
    docs.push(makeOrder());
    multiTenant.initiateSTKPush.mockResolvedValueOnce({
      success: false,
      error: 'rejected',
    });
    const res = await mpesa.initiatePayment(user, mpesaDto(ORDER_1, 100));
    expect(res.success).toBe(false);
    expect(docs[0].payments[0].status).toBe('failed');
    // failed intent no longer blocks void
    const voidResult = await applyVoidClaim(orderModel, ORDER_1, SHOP_A);
    expect(voidResult.matchedCount).toBe(1);
  });

  it('definitive local 4xx throw → claim released to failed', async () => {
    docs.push(
      makeOrder({
        payments: [{ method: 'stripe', amount: 100, status: 'pending' }],
      }),
    );
    stripePayments.createPOSPayment.mockRejectedValueOnce(
      new BadRequestException('below minimum'),
    );
    await expect(
      stripe.createPOSPayment(user, { orderId: ORDER_1, amount: 100 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(docs[0].payments[0].status).toBe('failed');
  });

  it('ambiguous provider throw → intent stays pending → void still blocked', async () => {
    docs.push(makeOrder());
    multiTenant.initiateSTKPush.mockRejectedValueOnce(
      new Error('network timeout'),
    );
    await expect(
      mpesa.initiatePayment(user, mpesaDto(ORDER_1, 100) as any),
    ).rejects.toThrow('network timeout');
    expect(docs[0].payments[0].status).toBe('pending');
    const voidResult = await applyVoidClaim(orderModel, ORDER_1, SHOP_A);
    expect(voidResult.matchedCount).toBe(0); // fail-safe: void stays blocked
  });

  it('retry after terminal failure re-establishes pending before provider call', async () => {
    docs.push(
      makeOrder({
        payments: [{ method: 'stripe', amount: 100, status: 'failed' }],
      }),
    );
    await stripe.createPOSPayment(user, { orderId: ORDER_1, amount: 100 });
    expect(docs[0].payments[0].status).toBe('pending');
    expect(docs[0].payments[0].initiatedAt).toBeInstanceOf(Date);
    expect(stripePayments.createPOSPayment).toHaveBeenCalledTimes(1);
  });

  it('re-initiation while pending re-uses the claim (idempotent)', async () => {
    docs.push(makeOrder());
    await mpesa.initiatePayment(user, mpesaDto(ORDER_1, 100));
    await mpesa.initiatePayment(user, mpesaDto(ORDER_1, 100));
    expect(multiTenant.initiateSTKPush).toHaveBeenCalledTimes(2);
    expect(docs[0].payments[0].status).toBe('pending');
  });

  // ── orderless compatibility (active pre-checkout callers) ──

  it('Stripe orderless pre-checkout intent (temp- id) remains supported', async () => {
    const res = await stripe.createPOSPayment(user, {
      orderId: `temp-${Date.now()}`,
      orderNumber: 'POS-1',
      amount: 5000,
    });
    expect(res.success).toBe(true);
    expect(stripePayments.createPOSPayment).toHaveBeenCalledTimes(1);
  });

  it('Stripe alias enforces authority for real orderIds, orderless otherwise', async () => {
    docs.push(makeOrder({ status: 'void' }));
    await expect(
      stripe.createPaymentIntentAlias(user, { orderId: ORDER_1, amount: 100 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(stripePayments.createPOSPayment).not.toHaveBeenCalled();

    const res = await stripe.createPaymentIntentAlias(user, { amount: 5000 });
    expect(res.success).toBe(true);
    expect(stripePayments.createPOSPayment).toHaveBeenCalledTimes(1);
    expect(stripePayments.createPOSPayment.mock.calls[0][0].orderId).toMatch(
      /^pos-/,
    );
  });

  it('initiate-v2 deprecated alias is held to the same authority', async () => {
    docs.push(makeOrder({ status: 'void' }));
    await expect(
      mpesa.initiatePaymentV2(user, {
        orderId: ORDER_1,
        orderNumber: 'FORGED',
        phoneNumber: '0712345678',
        amount: 100,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(multiTenant.initiateSTKPush).not.toHaveBeenCalled();
  });

  it('toMinorUnits mirrors the web currency contract', () => {
    expect(toMinorUnits(100, 'KES')).toBe(100); // zero-decimal
    expect(toMinorUnits(5, 'USD')).toBe(500);
    expect(toMinorUnits(5, undefined)).toBe(5); // default KES
  });
});
