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
import { toMinorUnits } from '../../common/currency';

export type ExternalPosPaymentMethod = 'mpesa' | 'stripe';

export interface InitiationClaimGranted {
  claimed: true;
  unresolved?: false;
  orderId: string;
  orderNumber: string;
  /** Server-authoritative payable amount in major currency units (e.g. KES). */
  amount: number;
}

export interface InitiationUnresolved {
  claimed: false;
  unresolved: true;
  orderId: string;
  orderNumber: string;
  amount: number;
}

export type PaymentInitiationClaim =
  | InitiationClaimGranted
  | InitiationUnresolved;

/**
 * Per-method eligibility for a NEW provider initiation attempt.
 * - 'failed'  → terminal attempt; a genuinely new attempt may start.
 * - 'pending' without initiatedAt → intent recorded at checkout but never
 *   claimed by an initiation attempt (e.g. crash before claim) → claimable.
 * - 'pending' WITH initiatedAt → a previous attempt's outcome is unresolved
 *   (provider may already hold a live request) → NOT claimable; the caller
 *   receives the unresolved marker and must reconcile, never re-issue the
 *   provider call. Stripe is exempt from this rule because its own
 *   per-order intent record deduplicates retries (same PaymentIntent is
 *   returned); M-Pesa STK pushes have no such dedup — a second push would
 *   double-charge the customer.
 */
function isClaimable(
  p: { method?: string; status?: string; initiatedAt?: Date },
  method: ExternalPosPaymentMethod,
): boolean {
  if (p.method !== method) return false;
  if (p.status === 'failed') return true;
  if (p.status !== 'pending') return false;
  if (method === 'mpesa') return !p.initiatedAt;
  return true;
}

/**
 * P0-10C/D — ORDER PAYMENT INITIATION AUTHORITY
 *
 * No external POS payment may be initiated unless the referenced order
 *   - belongs to the authenticated shop (tenant scope is mandatory),
 *   - is in the 'pending' lifecycle state (only pending orders are payable),
 *   - is not void and is not being voided (no active voidOperation claim),
 *   - carries exactly one server-recorded claimable allocation for the
 *     requested provider method — the allocation's amount is authoritative.
 *
 * VOID INTERLOCK: the claim is a single atomic updateOne on the Order
 * document. Its filter requires status='pending' and no in-progress
 * voidOperation, while P0-10B's void claim filter requires the absence of a
 * pending external payment. The two predicates are mutually exclusive on the
 * same document — whoever's atomic write lands first wins; the loser sees a
 * failed predicate and is rejected before any provider call or stock change.
 *
 * RETRY SAFETY (P0-10D): the claim stamps `initiatedAt` atomically. An
 * allocation that is pending AND already has initiatedAt means an earlier
 * initiation reached (or may have reached) the provider — re-initiating
 * would double-charge. Such allocations are returned as `unresolved` and
 * must NOT trigger another provider call.
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

    const order = await this.findOrder(shopId, orderId);
    if (!order) {
      // Unknown order or cross-tenant — fail closed, never reach provider.
      throw new NotFoundException('Order not found');
    }

    this.assertPayable(order);

    const unresolved = (order.payments ?? []).find(
      (p) => p.method === method && p.status === 'pending' && p.initiatedAt,
    );
    const eligible = (order.payments ?? []).filter((p) =>
      isClaimable(p, method),
    );

    if (unresolved && eligible.length === 0) {
      // An earlier initiation already claimed this allocation and its outcome
      // is unresolved — NEVER issue a second provider request. Report the
      // existing unresolved intent; the caller must surface it for
      // status-polling/reconciliation.
      this.logger.warn(
        `Refusing duplicate ${method} initiation for order ${orderId} — unresolved attempt exists`,
      );
      return {
        claimed: false,
        unresolved: true,
        orderId,
        orderNumber: order.orderNumber,
        amount: unresolved.amount,
      };
    }
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
    // but only while the order is still payable AND no void claim exists AND
    // the allocation is still claimable (a racing initiation already stamped
    // initiatedAt → the elemMatch fails → this caller is told 'unresolved',
    // never a second provider request). If a void claim won the race, the
    // predicate fails and we never call the provider. If this lands first,
    // P0-10B's void predicate sees a pending external payment and the void is
    // rejected.
    const eligibility =
      method === 'mpesa'
        ? {
            method,
            $or: [
              { status: 'failed' },
              { status: 'pending', initiatedAt: { $exists: false } },
            ],
          }
        : { method, status: { $in: ['pending', 'failed'] } };

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
          payments: { $elemMatch: eligibility },
        },
        {
          $set: {
            'payments.$[claim].status': 'pending',
            'payments.$[claim].initiatedAt': new Date(),
          },
        },
        {
          arrayFilters: [
            method === 'mpesa'
              ? {
                  'claim.method': method,
                  $or: [
                    { 'claim.status': 'failed' },
                    {
                      'claim.status': 'pending',
                      'claim.initiatedAt': { $exists: false },
                    },
                  ],
                }
              : {
                  'claim.method': method,
                  'claim.status': { $in: ['pending', 'failed'] },
                },
          ],
        },
      )
      .exec();

    if (!claim.matchedCount) {
      // Lost an interleaving race — re-read to classify honestly.
      const raced = await this.findOrder(shopId, orderId);
      if (raced) {
        this.assertPayable(raced);
        const racedUnresolved = (raced.payments ?? []).find(
          (p) => p.method === method && p.status === 'pending' && p.initiatedAt,
        );
        if (racedUnresolved) {
          // A concurrent initiation won the atomic claim — report the
          // existing unresolved intent; no second provider call.
          return {
            claimed: false,
            unresolved: true,
            orderId,
            orderNumber: raced.orderNumber,
            amount: racedUnresolved.amount,
          };
        }
      }
      throw new ConflictException(
        'Order payment state changed; payment initiation is no longer permitted',
      );
    }

    return {
      claimed: true,
      orderId,
      orderNumber: order.orderNumber,
      amount: amountMajor,
    };
  }

  /**
   * Persist provider identity onto the claimed order allocation after a
   * successful initiation — the canonical order ↔ provider linkage required
   * for provider-truth convergence (webhook/retrieve) and audit.
   */
  async attachProviderRef(
    shopId: string,
    orderId: string,
    method: ExternalPosPaymentMethod,
    refs: { stripePaymentIntentId?: string },
  ): Promise<void> {
    if (!Types.ObjectId.isValid(orderId) || !refs.stripePaymentIntentId) {
      return;
    }
    await this.orderModel
      .updateOne(
        {
          _id: new Types.ObjectId(orderId),
          shopId: new Types.ObjectId(shopId),
        },
        {
          $set: {
            'payments.$[p].stripePaymentIntentId': refs.stripePaymentIntentId,
          },
        },
        { arrayFilters: [{ 'p.method': method, 'p.status': 'pending' }] },
      )
      .exec();
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

  private async findOrder(shopId: string, orderId: string): Promise<any> {
    return this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        shopId: new Types.ObjectId(shopId),
      })
      .lean()
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
