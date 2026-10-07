import { Types } from 'mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { OrderPaymentAuthorityService } from './services/order-payment-authority.service';
import { toMinorUnits } from '../common/currency';
import { MpesaController } from './mpesa.controller';
import { PaymentsService } from './payments.service';
import { StripeController } from '../stripe/stripe.controller';
import { StripePaymentService } from '../stripe/services/stripe-payment.service';
import { PaymentTransactionService } from './services/payment-transaction.service';
import { isTerminalMpesaResultCode } from './schemas/mpesa-transaction.schema';

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
      // Nested logical ops keep the element prefix on their field keys
      // ({'claim.status': 'pending'}), so recurse with the same prefix
      // stripping rather than the element-root matchFilter.
      if (k === '$or')
        return (cond as any[]).some((c) => matchArrayElement(el, c, name));
      if (k === '$and')
        return (cond as any[]).every((c) => matchArrayElement(el, c, name));
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
      findOne: jest.fn((filter: any) => {
        const find = () => docs.find((d) => matchFilter(d, filter)) ?? null;
        return {
          lean: () => ({
            exec: async () => find(),
            then: (onF: any, onR: any) =>
              Promise.resolve(find()).then(onF, onR),
          }),
          exec: async () => find(),
          then: (onF: any, onR: any) => Promise.resolve(find()).then(onF, onR),
        };
      }),
      updateOne: jest.fn(
        (filter: any, update: any, opts?: { arrayFilters?: any[] }) => {
          // Mongoose Query is awaitable AND exposes .exec() — mirror both so
          // services that `await updateOne(...)` and those that call
          // `.updateOne(...).exec()` share one lazy, once-only write.
          let promise: Promise<any> | null = null;
          const run = () =>
            (promise ??= Promise.resolve().then(() => {
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
            }));
          return {
            exec: () => run(),
            then: (onF: any, onR: any) => run().then(onF, onR),
          };
        },
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
      cashierId: new Types.ObjectId(CASHIER),
      cashierName: 'Alice',
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
    getUnresolvedOrderTransaction: jest.Mock;
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
      getUnresolvedOrderTransaction: jest.fn(async () => ({
        _id: 'tx-1',
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
      stripe.createPOSPayment(user, { orderId: ORDER_1, amount: 10000 }),
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
      stripe.createPOSPayment(user, { orderId: ORDER_1, amount: 10000 }),
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
      stripe.createPOSPayment(user, { orderId: ORDER_1, amount: 99999 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(stripePayments.createPOSPayment).not.toHaveBeenCalled();

    // P0-11A: the CORRECT minor-unit representation of 100 KES (10000) is
    // accepted — the client amount is a tamper check, not the charge source.
    const ok = await stripe.createPOSPayment(user, {
      orderId: ORDER_1,
      amount: 10000,
    });
    expect(ok.success).toBe(true);
  });

  it('sends server-derived Stripe amount + orderNumber (KES two-decimal, P0-11A)', async () => {
    docs.push(
      makeOrder({
        payments: [{ method: 'stripe', amount: 100, status: 'pending' }],
      }),
    );
    const res = await stripe.createPOSPayment(user, {
      orderId: ORDER_1,
      orderNumber: 'FORGED',
      amount: 10000, // client minor units: 100 KES -> 10000 (P0-11A)
      currency: 'kes',
    });
    expect(res.success).toBe(true);
    const call = stripePayments.createPOSPayment.mock.calls[0][0];
    expect(call.amount).toBe(10000); // 100 KES -> 10000 minor (Stripe two-decimal)
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
    await stripe.createPOSPayment(user, { orderId: ORDER_1, amount: 10000 });
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
      stripe.createPOSPayment(user, { orderId: ORDER_1, amount: 10000 }),
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
      stripe.createPOSPayment(user, { orderId: ORDER_1, amount: 10000 }),
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
    await stripe.createPOSPayment(user, { orderId: ORDER_1, amount: 10000 });
    expect(docs[0].payments[0].status).toBe('pending');
    expect(docs[0].payments[0].initiatedAt).toBeInstanceOf(Date);
    expect(stripePayments.createPOSPayment).toHaveBeenCalledTimes(1);
  });

  // ── P0-10D: M-Pesa first-initiation / ambiguous-retry safety ──

  it('M-Pesa first initiation sends exactly one STK push', async () => {
    docs.push(makeOrder());
    const res = await mpesa.initiatePayment(user, mpesaDto(ORDER_1, 100));
    expect(res.success).toBe(true);
    expect(multiTenant.initiateSTKPush).toHaveBeenCalledTimes(1);
    expect(docs[0].payments[0].status).toBe('pending');
    expect(docs[0].payments[0].initiatedAt).toBeInstanceOf(Date);
  });

  it('M-Pesa ambiguous retry ×5 → zero additional STK pushes, claim stays pending', async () => {
    docs.push(makeOrder());
    await mpesa.initiatePayment(user, mpesaDto(ORDER_1, 100));
    expect(multiTenant.initiateSTKPush).toHaveBeenCalledTimes(1);

    // Browser retries while the first attempt is unresolved (pending +
    // initiatedAt) — every retry returns the existing pending transaction
    // and must NEVER reach Daraja again.
    for (let i = 0; i < 5; i++) {
      const res = await mpesa.initiatePayment(user, mpesaDto(ORDER_1, 100));
      expect(res.success).toBe(true);
      expect(res.status).toBe('PENDING');
      expect(res.errorCode).toBe('PAYMENT_ALREADY_PENDING');
      expect(res.checkoutRequestId).toBe('cr-1');
    }
    expect(multiTenant.initiateSTKPush).toHaveBeenCalledTimes(1);
    expect(docs[0].payments[0].status).toBe('pending');

    // ...and the unresolved intent keeps void blocked throughout.
    const voidResult = await applyVoidClaim(orderModel, ORDER_1, SHOP_A);
    expect(voidResult.matchedCount).toBe(0);
  });

  it('M-Pesa retry allowed only after terminal failure → second push succeeds', async () => {
    docs.push(makeOrder());
    // First attempt: provider definitively rejects (initiation-level failure)
    multiTenant.initiateSTKPush.mockResolvedValueOnce({
      success: false,
      error: 'definitive rejection',
      responseCode: '1',
    });
    const first = await mpesa.initiatePayment(user, mpesaDto(ORDER_1, 100));
    expect(first.success).toBe(false);
    expect(multiTenant.initiateSTKPush).toHaveBeenCalledTimes(1);
    expect(docs[0].payments[0].status).toBe('failed'); // terminal release

    // Genuinely new attempt after terminal failure → claimable → 2nd push
    const second = await mpesa.initiatePayment(user, mpesaDto(ORDER_1, 100));
    expect(second.success).toBe(true);
    expect(multiTenant.initiateSTKPush).toHaveBeenCalledTimes(2);
    expect(docs[0].payments[0].status).toBe('pending');
    expect(docs[0].payments[0].initiatedAt).toBeInstanceOf(Date);
  });

  it('M-Pesa callback terminal codes release the intent; ambiguous 1037 does not', () => {
    // Classification is a pure function — verify the contract the callback
    // and status-query paths rely on.
    // Definitive terminal failures — intent released
    for (const code of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1032, 2001]) {
      expect(isTerminalMpesaResultCode(code)).toBe(true);
    }
    // Success is not a failure
    expect(isTerminalMpesaResultCode(0)).toBe(false);
    // Ambiguous — outcome may still be settling → NEVER terminal
    for (const code of [1037, 17, 9999, '1037']) {
      expect(isTerminalMpesaResultCode(code as any)).toBe(false);
    }
    expect(isTerminalMpesaResultCode(undefined)).toBe(false);
  });

  // ── P0-10D: Stripe order-binding + identity ──

  it('Stripe POS requires a real order — missing/placeholder orderId rejected with zero provider calls', async () => {
    docs.push(makeOrder());
    // No orderId at all
    await expect(
      stripe.createPOSPayment(user, { amount: 100 } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    // temp-* placeholder (the pre-P0-10D flow)
    await expect(
      stripe.createPOSPayment(user, {
        orderId: `temp-${Date.now()}`,
        orderNumber: `POS-${Date.now()}`,
        amount: 100,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    // Alias path is bound identically
    await expect(
      stripe.createPaymentIntentAlias(user, { amount: 100 } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(stripePayments.createPOSPayment).not.toHaveBeenCalled();
  });

  it('Stripe PaymentIntent id is persisted onto the canonical order allocation', async () => {
    docs.push(
      makeOrder({
        payments: [{ method: 'stripe', amount: 100, status: 'pending' }],
      }),
    );
    const res = await stripe.createPOSPayment(user, {
      orderId: ORDER_1,
      amount: 10000, // 100 KES in minor units (P0-11A)
      currency: 'kes',
    });
    expect(res.success).toBe(true);
    expect(res.paymentIntentId).toBe('pi_1');
    expect(docs[0].payments[0].stripePaymentIntentId).toBe('pi_1');
  });

  // ── orderless is forbidden: P0-10D removed the pre-checkout placeholder ──

  it('Stripe alias enforces authority for real orderIds and rejects orderless', async () => {
    docs.push(makeOrder({ status: 'void' }));
    await expect(
      stripe.createPaymentIntentAlias(user, { orderId: ORDER_1, amount: 100 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(stripePayments.createPOSPayment).not.toHaveBeenCalled();
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

  // ── legacy /payments/stk-push surface: same authority, same interlock ──

  describe('legacy /payments/stk-push surface', () => {
    let daraja: { initiateStkPush: jest.Mock };
    let paymentsService: PaymentsService;

    const stkDto = (orderId: string, amount = 100) => ({
      orderId,
      phoneNumber: '0712345678',
      amount,
      accountReference: 'FORGED-REF',
      customerEmail: 'c@example.com',
    });

    beforeEach(() => {
      daraja = {
        initiateStkPush: jest.fn(async () => ({
          MerchantRequestID: 'mr-1',
          CheckoutRequestID: 'cr-9',
          ResponseCode: '0',
          CustomerMessage: 'Success',
        })),
      };
      paymentsService = new PaymentsService(daraja as any, authority);
    });

    it('cannot bypass order authority — void order → zero provider calls', async () => {
      docs.push(
        makeOrder({
          status: 'void',
          payments: [{ method: 'mpesa', amount: 100, status: 'failed' }],
        }),
      );
      await expect(
        paymentsService.initiateStkPush(SHOP_A, stkDto(ORDER_1) as any),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(daraja.initiateStkPush).not.toHaveBeenCalled();
    });

    it('unresolved prior attempt → ConflictException, zero new STK pushes', async () => {
      docs.push(
        makeOrder({
          payments: [
            {
              method: 'mpesa',
              amount: 100,
              status: 'pending',
              initiatedAt: new Date(),
            },
          ],
        }),
      );
      await expect(
        paymentsService.initiateStkPush(SHOP_A, stkDto(ORDER_1) as any),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(daraja.initiateStkPush).not.toHaveBeenCalled();
    });

    it('body amount/accountReference are never charged — order values win', async () => {
      docs.push(
        makeOrder({
          payments: [{ method: 'mpesa', amount: 100, status: 'pending' }],
        }),
      );
      // Tampered amount is rejected outright (tamper check on the allocation)
      await expect(
        paymentsService.initiateStkPush(SHOP_A, stkDto(ORDER_1, 99999) as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(daraja.initiateStkPush).not.toHaveBeenCalled();

      const res = await paymentsService.initiateStkPush(
        SHOP_A,
        stkDto(ORDER_1),
      );
      expect(res.requestId).toBe('mr-1');
      expect(daraja.initiateStkPush).toHaveBeenCalledTimes(1);
      const sent = daraja.initiateStkPush.mock.calls[0][0];
      expect(sent.amount).toBe(100); // allocation amount, never body
      expect(sent.accountReference).toBe('STK-2025-ORD'); // order-derived
    });

    it('cross-tenant order id → NotFound, zero provider calls', async () => {
      docs.push(
        makeOrder({
          shopId: SHOP_B,
          payments: [{ method: 'mpesa', amount: 100, status: 'pending' }],
        }),
      );
      await expect(
        paymentsService.initiateStkPush(SHOP_A, stkDto(ORDER_1) as any),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(daraja.initiateStkPush).not.toHaveBeenCalled();
    });
  });

  it('toMinorUnits mirrors the web currency contract (P0-11A)', () => {
    expect(toMinorUnits(100, 'KES')).toBe(10000); // KES is two-decimal for Stripe
    expect(toMinorUnits(5, 'USD')).toBe(500);
    expect(toMinorUnits(10, 'JPY')).toBe(10); // true zero-decimal
    expect(toMinorUnits(5, 'ISK')).toBe(500); // special case: display 0-dec, API x100
    expect(toMinorUnits(5, undefined)).toBe(500); // default KES, two-decimal
  });

  // ────────────────────────────────────────────────────────────────
  // P0-10D — STRIPE PROVIDER-TRUTH CONVERGENCE
  // Verified webhooks AND authenticated server-side retrieval converge the
  // canonical order through the shared PaymentTransactionService primitive —
  // deduplicated on stripePaymentIntentId, tenant-scoped, once-only.
  // ────────────────────────────────────────────────────────────────

  describe('P0-10D stripe provider-truth convergence', () => {
    const PI = 'pi_live_1';
    let payTxnStore: Map<string, any>;
    let payTxnSeq: number;
    let stripePaymentStore: Map<string, any>;
    let stripePaymentSvc: StripePaymentService;
    let paymentTxns: PaymentTransactionService;
    let stripeFull: {
      retrievePaymentIntent: jest.Mock;
      createPaymentIntent: jest.Mock;
      validateMinimumAmount: jest.Mock;
      isStripeConfigured: jest.Mock;
    };
    let earnPoints: jest.Mock;
    let updatePurchaseStats: jest.Mock;

    const thenable = (doc: any): any => ({
      exec: async () => doc,
      lean: () => thenable(doc),
      select: () => thenable(doc),
      then: (onF: any, onR: any) => Promise.resolve(doc).then(onF, onR),
      then: (res: any, rej: any) => Promise.resolve(doc).then(res, rej),
    });

    const seedStripePayment = (overrides: any = {}) => {
      const doc = {
        _id: 'sp-1',
        stripePaymentIntentId: PI,
        shopId: new Types.ObjectId(SHOP_A),
        orderId: new Types.ObjectId(ORDER_1),
        paymentType: 'pos_sale',
        amount: 10000, // 100.00 KES in Stripe minor units (P0-11A two-decimal)
        currency: 'kes',
        status: 'requires_payment_method',
        clientSecret: 'secret_1',
        metadata: { orderNumber: 'STK-2025-ORD001' },
        ...overrides,
      };
      stripePaymentStore.set(PI, doc);
      return doc;
    };

    const intentEvent = (status: string) =>
      ({
        id: `evt_${status}`,
        type: `payment_intent.${status === 'succeeded' ? 'succeeded' : status === 'canceled' ? 'canceled' : 'payment_failed'}`,
        data: {
          object: {
            id: PI,
            status,
            latest_charge: 'ch_1',
            metadata: { shopId: SHOP_A },
          },
        },
      }) as any;

    beforeEach(() => {
      payTxnStore = new Map();
      payTxnSeq = 0;
      stripePaymentStore = new Map();
      earnPoints = jest.fn(async () => ({}));
      updatePurchaseStats = jest.fn(async () => ({}));

      // PaymentTransaction store — deduped on provider identity (mirrors the
      // unique sparse index on stripePaymentIntentId).
      const ptModel: any = jest.fn().mockImplementation((arg: any) => {
        const doc: any = {
          _id: `pt-${++payTxnSeq}`,
          ...arg,
          save: jest.fn().mockImplementation(async () => {
            const key = arg.stripePaymentIntentId || `unkeyed-${payTxnSeq}`;
            if (payTxnStore.has(key)) {
              const err: any = new Error('E11000 duplicate key');
              err.code = 11000;
              throw err;
            }
            payTxnStore.set(key, doc);
            return doc;
          }),
        };
        return doc;
      });
      ptModel.findOne = jest.fn((f: any) =>
        thenable(
          f?.stripePaymentIntentId
            ? (payTxnStore.get(f.stripePaymentIntentId) ?? null)
            : f?.mpesaTransactionId
              ? (payTxnStore.get(f.mpesaTransactionId) ?? null)
              : null,
        ),
      );

      paymentTxns = new PaymentTransactionService(
        ptModel,
        {} as any,
        orderModel as any,
        { earnPoints } as any,
        { updatePurchaseStats } as any,
      );

      // StripePayment store keyed by PaymentIntent id.
      const spModel: any = jest.fn().mockImplementation((arg: any) => ({
        ...arg,
        save: jest.fn().mockImplementation(async function (this: any) {
          stripePaymentStore.set(this.stripePaymentIntentId, this);
          return this;
        }),
      }));
      spModel.findOne = jest.fn((f: any) =>
        thenable(
          f?.stripePaymentIntentId
            ? (stripePaymentStore.get(f.stripePaymentIntentId) ?? null)
            : null,
        ),
      );
      spModel.findOneAndUpdate = jest.fn(
        async (f: any, update: any, _opts?: any) => {
          const d = stripePaymentStore.get(f?.stripePaymentIntentId);
          if (!d) return null;
          Object.assign(d, update?.$set ?? {});
          return d;
        },
      );
      spModel.updateOne = jest.fn(async (f: any, update: any) => {
        const d = stripePaymentStore.get(f?.stripePaymentIntentId);
        if (d) Object.assign(d, update?.$set ?? {});
        return { modifiedCount: d ? 1 : 0 };
      });

      stripeFull = {
        isStripeConfigured: jest.fn(() => true),
        validateMinimumAmount: jest.fn(() => ({ valid: true })),
        createPaymentIntent: jest.fn(),
        retrievePaymentIntent: jest.fn(),
      };

      stripePaymentSvc = new StripePaymentService(
        stripeFull as any,
        {
          getCustomerByShopId: jest.fn(async () => null),
          recordPayment: jest.fn(async () => ({})),
        } as any,
        { requireConnectedAccountId: jest.fn(async () => 'acct_1') } as any,
        { get: jest.fn(() => 0) } as any,
        spModel,
        orderModel as any,
        paymentTxns,
        authority,
      );
    });

    it('verified webhook success converges the canonical order (pending → paid/completed)', async () => {
      docs.push(
        makeOrder({
          payments: [
            {
              method: 'stripe',
              amount: 100,
              status: 'pending',
              initiatedAt: new Date(),
              stripePaymentIntentId: PI,
            },
          ],
        }),
      );
      seedStripePayment();
      await stripePaymentSvc.handlePaymentIntentEvent(intentEvent('succeeded'));
      expect(docs[0].status).toBe('completed');
      expect(docs[0].paymentStatus).toBe('paid');
      expect(docs[0].payments[0].status).toBe('completed');
      expect(payTxnStore.size).toBe(1);
      expect(payTxnStore.get(PI).paymentMethod).toBe('stripe');
      expect(payTxnStore.get(PI).stripePaymentIntentId).toBe(PI);
    });

    it('same successful webhook ×5 → one payment record, one convergence, side effects once', async () => {
      docs.push(
        makeOrder({
          customerId: new Types.ObjectId('507f1f77bcf86cd799439071'),
          payments: [
            {
              method: 'stripe',
              amount: 100,
              status: 'pending',
              initiatedAt: new Date(),
            },
          ],
        }),
      );
      seedStripePayment();
      for (let i = 0; i < 5; i++) {
        await stripePaymentSvc.handlePaymentIntentEvent(
          intentEvent('succeeded'),
        );
      }
      expect(payTxnStore.size).toBe(1);
      expect(earnPoints).toHaveBeenCalledTimes(1);
      expect(updatePurchaseStats).toHaveBeenCalledTimes(1);
      expect(docs[0].status).toBe('completed');
    });

    it('lost browser response: authenticated server retrieve converges the order exactly once', async () => {
      docs.push(
        makeOrder({
          payments: [
            {
              method: 'stripe',
              amount: 100,
              status: 'pending',
              initiatedAt: new Date(),
              stripePaymentIntentId: PI,
            },
          ],
        }),
      );
      seedStripePayment();
      stripeFull.retrievePaymentIntent.mockResolvedValue({
        id: PI,
        status: 'succeeded',
        latest_charge: 'ch_1',
      });
      // Browser closed before success — the client status poll (or webhook)
      // still settles the canonical order.
      await stripePaymentSvc.syncPaymentStatus(PI);
      expect(docs[0].status).toBe('completed');
      expect(docs[0].paymentStatus).toBe('paid');
      // Webhook arriving later is a deduped no-op
      await stripePaymentSvc.handlePaymentIntentEvent(intentEvent('succeeded'));
      expect(payTxnStore.size).toBe(1);
    });

    it('payment_failed (requires_payment_method) stays unresolved — void stays blocked', async () => {
      docs.push(
        makeOrder({
          payments: [
            {
              method: 'stripe',
              amount: 100,
              status: 'pending',
              initiatedAt: new Date(),
            },
          ],
        }),
      );
      seedStripePayment();
      await stripePaymentSvc.handlePaymentIntentEvent(
        intentEvent('requires_payment_method'),
      );
      expect(docs[0].payments[0].status).toBe('pending'); // NOT released
      const voidResult = await applyVoidClaim(orderModel, ORDER_1, SHOP_A);
      expect(voidResult.matchedCount).toBe(0);
    });

    it('canceled → terminal failure → allocation failed → void may proceed', async () => {
      docs.push(
        makeOrder({
          payments: [
            {
              method: 'stripe',
              amount: 100,
              status: 'pending',
              initiatedAt: new Date(),
            },
          ],
        }),
      );
      seedStripePayment();
      await stripePaymentSvc.handlePaymentIntentEvent(intentEvent('canceled'));
      expect(docs[0].payments[0].status).toBe('failed');
      const voidResult = await applyVoidClaim(orderModel, ORDER_1, SHOP_A);
      expect(voidResult.matchedCount).toBe(1);
    });

    it('stripe success || void: void-first → success recorded but order never reopens', async () => {
      docs.push(
        makeOrder({
          payments: [{ method: 'stripe', amount: 100, status: 'failed' }],
        }),
      );
      // void wins the claim before any initiation
      const voidResult = await applyVoidClaim(orderModel, ORDER_1, SHOP_A);
      expect(voidResult.matchedCount).toBe(1);
      docs[0].status = 'void'; // void finalizes
      // late Stripe success — recorded financially, order stays void
      seedStripePayment();
      await stripePaymentSvc.handlePaymentIntentEvent(intentEvent('succeeded'));
      expect(docs[0].status).toBe('void');
      expect(payTxnStore.size).toBe(1); // financial record preserved for reconciliation
    });

    it('stripe success || void: success-first → order completes → void rejected', async () => {
      docs.push(
        makeOrder({
          payments: [
            {
              method: 'stripe',
              amount: 100,
              status: 'pending',
              initiatedAt: new Date(),
            },
          ],
        }),
      );
      seedStripePayment();
      await stripePaymentSvc.handlePaymentIntentEvent(intentEvent('succeeded'));
      expect(docs[0].status).toBe('completed');
      const voidResult = await applyVoidClaim(orderModel, ORDER_1, SHOP_A);
      expect(voidResult.matchedCount).toBe(0); // completed order cannot be voided
    });

    it('non-POS payments (subscription) never converge an order', async () => {
      docs.push(
        makeOrder({
          payments: [{ method: 'stripe', amount: 100, status: 'pending' }],
        }),
      );
      seedStripePayment({ paymentType: 'subscription' });
      await stripePaymentSvc.handlePaymentIntentEvent(intentEvent('succeeded'));
      expect(docs[0].status).toBe('pending');
      expect(payTxnStore.size).toBe(0);
    });

    it('cross-tenant stripe payment never mutates the order', async () => {
      docs.push(
        makeOrder({
          payments: [{ method: 'stripe', amount: 100, status: 'pending' }],
        }),
      );
      seedStripePayment({ shopId: new Types.ObjectId(SHOP_B) });
      await stripePaymentSvc.handlePaymentIntentEvent(intentEvent('succeeded'));
      expect(docs[0].status).toBe('pending');
      expect(payTxnStore.size).toBe(0);
    });
  });
});
