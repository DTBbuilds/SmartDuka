import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../../sales/schemas/order.schema';

export type ExternalPosPaymentMethod = 'mpesa' | 'stripe';

/**
 * Minor-unit (smallest currency unit) conversion for Stripe-style providers.
 * Mirrors apps/web/src/lib/currency.ts `toCents`: currencies flagged
 * zeroDecimal are charged as integer major units.
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'KES',
  'UGX',
  'RWF',
  'XOF',
  'XAF',
  'CLP',
  'JPY',
  'KRW',
  'VND',
]);

export function toMinorUnits(amountMajor: number, currency?: string): number {
  const code = (currency || 'KES').toUpperCase();
  return ZERO_DECIMAL_CURRENCIES.has(code)
    ? Math.round(amountMajor)
    : Math.round(amountMajor * 100);
}

export interface PaymentInitiationClaim {
  orderId: string;
  orderNumber: string;
  /** Server-authoritative payable amount in major currency units (e.g. KES). */
  amount: number;
}

/**
 * P0-10C — ORDER PAYMENT INITIATION AUTHORITY
 *
 * No external POS payment may be initiated unless the referenced order
 *   - belongs to the authenticated shop (tenant scope is mandatory),
 *   - is in the 'pending' lifecycle state (only pending orders are payable),
 *   - is not void and is not being voided (no active voidOperation claim),
 *   - carries exactly one server-recorded pending/failed allocation for the
 *     requested provider method — the allocation's amount is authoritative.
 *
 * VOID INTERLOCK: the claim is a single atomic updateOne on the Order
 * document. Its filter requires status='pending' and no in-progress
 * voidOperation, while P0-10B's void claim filter requires the absence of a
 * pending external payment. The two predicates are mutually exclusive on the
 * same document — whoever's atomic write lands first wins; the loser sees a
 * failed predicate and is rejected before any provider call or stock change.
 *
 * Before contacting the provider the allocation is durably (re-)asserted as
 * 'pending' with `initiatedAt` provenance, so a crash between claim and
 * provider call leaves the order conservatively blocked from void.
 */
@Injectable()
export class OrderPaymentAuthorityService {
  private readonly logger = new Logger(OrderPaymentAuthorityService.name);

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  /**
   * Atomically establish/retain the unresolved external payment intent on the
   * order. Must be called and succeed BEFORE any provider API call.
   *
   * @param expectedAmount  optional client-supplied amount for tamper check;
   *                        interpreted in major units unless `amountUnit === 'minor'`
   * @param currency        provider currency code used for minor-unit conversion
   */
  async claimExternalPaymentIntent(
    shopId: string,
    orderId: string,
    method: ExternalPosPaymentMethod,
    opts: {
      expectedAmount?: number;
      amountUnit?: 'major' | 'minor';
      currency?: string;
    } = {},
  ): Promise<PaymentInitiationClaim> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new NotFoundException('Order not found');
    }

    const order = await this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        shopId: new Types.ObjectId(shopId),
      })
      .lean()
      .exec();

    if (!order) {
      // Unknown order or cross-tenant — fail closed, never reach provider.
      throw new NotFoundException('Order not found');
    }

    this.assertPayable(order);

    const eligible = (order.payments ?? []).filter(
      (p) =>
        p.method === method && ['pending', 'failed'].includes(p.status ?? ''),
    );
    if (eligible.length === 0) {
      throw new ConflictException(
        `Order has no ${method} payment allocation awaiting provider settlement`,
      );
    }
    if (eligible.length > 1) {
      throw new ConflictException(
        `Order has ${eligible.length} unresolved ${method} payment allocations; cannot determine which to initiate`,
      );
    }

    const amountMajor = eligible[0].amount;
    const amountMinor = toMinorUnits(amountMajor, opts.currency);
    if (opts.expectedAmount !== undefined) {
      const expected = opts.amountUnit === 'minor' ? amountMinor : amountMajor;
      if (Math.abs(opts.expectedAmount - expected) > 0.005) {
        throw new BadRequestException(
          `Requested amount ${opts.expectedAmount} does not match the order's authoritative ${method} amount of ${expected}`,
        );
      }
    }

    // ATOMIC CLAIM: re-assert the intent as pending + initiation provenance,
    // but only while the order is still payable AND no void claim exists.
    // If a void claim won the race, the predicate fails and we never call
    // the provider. If this lands first, P0-10B's void predicate sees a
    // pending external payment and the void is rejected.
    const claim = await this.orderModel
      .updateOne(
        {
          _id: new Types.ObjectId(orderId),
          shopId: new Types.ObjectId(shopId),
          status: 'pending',
          $or: [
            { voidOperation: { $exists: false } },
            { 'voidOperation.status': { $ne: 'in_progress' } },
          ],
          payments: {
            $elemMatch: { method, status: { $in: ['pending', 'failed'] } },
          },
        },
        {
          $set: {
            'payments.$[claim].status': 'pending',
            'payments.$[claim].initiatedAt': new Date(),
          },
        },
        {
          arrayFilters: [
            {
              'claim.method': method,
              'claim.status': { $in: ['pending', 'failed'] },
            },
          ],
        },
      )
      .exec();

    if (!claim.matchedCount) {
      // Lost an interleaving race (void claimed / order completed / allocation
      // settled between read and write) — re-read to classify honestly.
      const raced = await this.orderModel
        .findOne({
          _id: new Types.ObjectId(orderId),
          shopId: new Types.ObjectId(shopId),
        })
        .lean()
        .exec();
      if (raced) this.assertPayable(raced);
      throw new ConflictException(
        'Order payment state changed; payment initiation is no longer permitted',
      );
    }

    return {
      orderId,
      orderNumber: order.orderNumber,
      amount: amountMajor,
    };
  }

  /**
   * Definitive provider/local rejection → transition the claimed intent to
   * terminal 'failed' so the order becomes voidable and retryable again.
   *
   * MUST NOT be called for ambiguous outcomes (e.g. network error after the
   * provider request may have been sent): unresolved 'pending' is the
   * fail-safe state — it blocks void and preserves uncertainty for
   * reconciliation rather than risking charged + voided + restored.
   */
  async markIntentFailed(
    shopId: string,
    orderId: string,
    method: ExternalPosPaymentMethod,
  ): Promise<void> {
    await this.orderModel
      .updateOne(
        {
          _id: new Types.ObjectId(orderId),
          shopId: new Types.ObjectId(shopId),
        },
        { $set: { 'payments.$[claim].status': 'failed' } },
        {
          arrayFilters: [{ 'claim.method': method, 'claim.status': 'pending' }],
        },
      )
      .exec();
  }

  private assertPayable(order: any): void {
    if (order.status === 'void') {
      throw new ConflictException(
        'Order has been voided; payment cannot be initiated',
      );
    }
    if (order.voidOperation?.status === 'in_progress') {
      throw new ConflictException(
        'Order is being voided; payment cannot be initiated',
      );
    }
    if (order.status !== 'pending') {
      throw new ConflictException(
        `Order status '${order.status}' is not payable; payment cannot be initiated`,
      );
    }
  }
}
