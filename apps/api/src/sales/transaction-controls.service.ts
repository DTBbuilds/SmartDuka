import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, RefundAllocation } from './schemas/order.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Product, ProductDocument } from '../inventory/schemas/product.schema';
import {
  StockAdjustment,
  StockAdjustmentDocument,
} from '../inventory/schemas/stock-adjustment.schema';
import { InventoryService } from '../inventory/inventory.service';

type PostSaleOp = 'refund' | 'void' | 'discount';

/**
 * P0-10 — post-sale financial controls.
 *
 * A settled sale is immutable history. Refund/void/discount are durable,
 * idempotent events with server-derived bounds — never rewrites of the sale
 * and never scalar overwrites of each other.
 *
 * Invariants enforced here:
 * - cumulative refunds <= authoritatively confirmed paid amount (atomic)
 * - same operation id + same intent = replay; different intent = 409
 * - a fully refunded sale is still a completed sale (refundStatus is the
 *   financial truth, order.status stays 'completed')
 * - paid orders can never be voided; void restores stock once via P0-2
 *   canonical mutations with deterministic void:<order>:<product> ids
 * - cash refunds are 'completed'; provider-method refunds are honestly
 *   recorded 'manual_required' — SmartDuka never claims money moved
 * - cashier permissions/limits/approval requirements enforced server-side;
 *   a requester can never be their own approver
 */
@Injectable()
export class TransactionControlsService {
  private readonly logger = new Logger(TransactionControlsService.name);

  /** Methods SmartDuka can honestly mark refunded at request time. */
  private static readonly CASH_LIKE_METHODS = new Set(['cash']);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(StockAdjustment.name)
    private readonly adjustmentModel: Model<StockAdjustmentDocument>,
    private readonly inventoryService: InventoryService,
  ) {}

  // ─────────────────────────── PERMISSIONS ───────────────────────────

  /**
   * Actor provenance comes from the authenticated JWT (user.sub/shopId) —
   * request-supplied identity fields are never trusted for authority.
   * Admins are the authorized approver role; cashiers need explicit
   * permission, stay under their amount cap, and cannot self-approve.
   */
  private async authorize(
    shopId: string,
    actorId: string,
    op: PostSaleOp,
    amount?: number,
  ): Promise<{ approvedBy?: Types.ObjectId }> {
    const actor = await this.userModel
      .findOne({
        _id: new Types.ObjectId(actorId),
        shopId: new Types.ObjectId(shopId),
      })
      .exec();
    if (!actor) {
      throw new ForbiddenException('Actor not found in this shop');
    }

    if (actor.role === 'admin') {
      // An authorized approver performs the operation directly.
      return { approvedBy: actor._id };
    }

    const perms = (actor.permissions ?? {}) as Record<string, unknown>;
    const capKey = `can${op[0].toUpperCase()}${op.slice(1)}`;
    if (perms[capKey] !== true) {
      throw new ForbiddenException(`Cashier lacks ${op} permission`);
    }

    const maxKey =
      op === 'refund'
        ? 'maxRefundAmount'
        : op === 'discount'
          ? 'maxDiscountAmount'
          : undefined;
    const cap = maxKey ? (perms[maxKey] as number | undefined) : undefined;
    if (cap !== undefined && amount !== undefined && amount > cap) {
      throw new ForbiddenException(
        `${op} amount ${amount} exceeds cashier limit ${cap}`,
      );
    }

    const approvalKey = `${op}RequiresApproval`;
    if (perms[approvalKey] === true) {
      // Fail closed: the requester can never satisfy their own approval.
      throw new ForbiddenException(
        `${op} requires authorized approval — an admin must execute it`,
      );
    }

    return {};
  }

  // ─────────────────────────── PAYMENT TRUTH ───────────────────────────

  /** Server-confirmed settled amount — request totals are never trusted. */
  private confirmedPaid(order: Order): number {
    return (order.payments ?? [])
      .filter((p) => p.status === 'completed')
      .reduce((s, p) => s + p.amount, 0);
  }

  private resolveRefundAllocations(
    order: Order,
    amount: number,
    requested?: RefundAllocation[],
  ): RefundAllocation[] {
    const confirmedByMethod = new Map<string, number>();
    for (const p of order.payments ?? []) {
      if (p.status !== 'completed') continue;
      confirmedByMethod.set(
        p.method,
        (confirmedByMethod.get(p.method) ?? 0) + p.amount,
      );
    }
    const refundedByMethod = new Map<string, number>();
    for (const r of order.refunds ?? []) {
      for (const a of r.allocations ?? []) {
        refundedByMethod.set(
          a.method,
          (refundedByMethod.get(a.method) ?? 0) + a.amount,
        );
      }
    }
    const refundableByMethod = new Map<string, number>();
    for (const [m, c] of confirmedByMethod) {
      refundableByMethod.set(m, c - (refundedByMethod.get(m) ?? 0));
    }

    if (requested?.length) {
      const sum = requested.reduce((s, a) => s + a.amount, 0);
      if (Math.abs(sum - amount) > 0.0001) {
        throw new BadRequestException(
          'Refund allocations must sum to the refund amount',
        );
      }
      for (const a of requested) {
        if (!a.method || !(a.amount > 0)) {
          throw new BadRequestException('Invalid refund allocation');
        }
        const available = refundableByMethod.get(a.method) ?? 0;
        if (a.amount > available) {
          throw new BadRequestException(
            `Refund allocation ${a.amount} exceeds confirmed ${a.method} amount ${available}`,
          );
        }
      }
      return requested.map((a) => ({ method: a.method, amount: a.amount }));
    }

    // Unambiguous derivation only — ambiguous allocation fails closed.
    const candidates = [...refundableByMethod.entries()].filter(
      ([, v]) => v > 0,
    );
    if (candidates.length === 1 && candidates[0][1] >= amount) {
      return [{ method: candidates[0][0], amount }];
    }
    if (candidates.length <= 1) {
      throw new BadRequestException(
        `Refund ${amount} exceeds confirmed refundable amount`,
      );
    }
    throw new BadRequestException(
      'Refund allocation across payment methods is ambiguous — specify allocations',
    );
  }

  // ───────────────────────────── REFUND ─────────────────────────────

  async processRefund(
    orderId: string,
    shopId: string,
    dto: {
      refundOperationId?: string;
      refundAmount: number;
      refundReason: string;
      allocations?: RefundAllocation[];
    },
    actorId: string,
  ): Promise<OrderDocument> {
    if (!dto.refundOperationId?.trim()) {
      throw new BadRequestException('refundOperationId is required');
    }
    if (!(dto.refundAmount > 0)) {
      throw new BadRequestException('Invalid refund amount');
    }
    if (!dto.refundReason?.trim()) {
      throw new BadRequestException('Refund reason is required');
    }
    const opId = dto.refundOperationId;

    const { approvedBy } = await this.authorize(
      shopId,
      actorId,
      'refund',
      dto.refundAmount,
    );

    const order = await this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        shopId: new Types.ObjectId(shopId),
      })
      .exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Idempotent replay: same key + same intent returns the canonical event;
    // same key + different intent is a 409 conflict.
    const prior = (order.refunds ?? []).find(
      (r) => r.refundOperationId === opId,
    );
    if (prior) {
      this.assertSameRefund(prior, dto);
      return order;
    }

    if (order.status !== 'completed') {
      throw new BadRequestException(
        'Only completed sales can be refunded (pending/unconfirmed payments must settle or fail first)',
      );
    }

    const confirmedPaid = this.confirmedPaid(order);
    if (confirmedPaid <= 0) {
      throw new BadRequestException('No confirmed payment exists to refund');
    }

    const allocations = this.resolveRefundAllocations(
      order,
      dto.refundAmount,
      dto.allocations,
    );

    // Payment truth: only cash can honestly be marked refunded now.
    const allCash = allocations.every((a) =>
      TransactionControlsService.CASH_LIKE_METHODS.has(a.method),
    );
    const eventStatus = allCash ? 'completed' : 'manual_required';

    const event = {
      refundOperationId: opId,
      amount: dto.refundAmount,
      reason: dto.refundReason,
      requestedBy: new Types.ObjectId(actorId),
      ...(approvedBy ? { approvedBy } : {}),
      createdAt: new Date(),
      allocations,
      status: eventStatus,
    };

    // Per-method atomic bound clauses: cumulative refunded per method must
    // never exceed that method's confirmed amount.
    const perMethodBounds = allocations.map((a) => {
      const confirmedForMethod = (order.payments ?? [])
        .filter((p) => p.status === 'completed' && p.method === a.method)
        .reduce((s, p) => s + p.amount, 0);
      return {
        $lte: [
          {
            $add: [
              {
                $sum: {
                  $map: {
                    input: { $ifNull: ['$refunds', []] },
                    as: 'r',
                    in: {
                      $sum: {
                        $map: {
                          input: {
                            $filter: {
                              input: '$$r.allocations',
                              as: 'al',
                              cond: { $eq: ['$$al.method', a.method] },
                            },
                          },
                          as: 'al',
                          in: '$$al.amount',
                        },
                      },
                    },
                  },
                },
              },
              a.amount,
            ],
          },
          confirmedForMethod,
        ],
      };
    });

    // ATOMIC cumulative bound: total recorded refunds + this refund must not
    // exceed confirmed paid — evaluated inside the write predicate so two
    // concurrent refunds cannot both pass a stale read.
    const res = await this.orderModel
      .updateOne(
        {
          _id: new Types.ObjectId(orderId),
          shopId: new Types.ObjectId(shopId),
          status: 'completed',
          'refunds.refundOperationId': { $ne: opId },
          $expr: {
            $and: [
              {
                $lte: [
                  {
                    $add: [
                      { $ifNull: [{ $sum: '$refunds.amount' }, 0] },
                      dto.refundAmount,
                    ],
                  },
                  confirmedPaid,
                ],
              },
              ...perMethodBounds,
            ],
          },
        },
        [
          {
            $set: {
              refunds: {
                $concatArrays: [{ $ifNull: ['$refunds', []] }, [event]],
              },
            },
          },
          {
            $set: {
              // P0-10A: refundStatus reflects COMPLETED refunds only — money
              // honestly confirmed moved. A manual_required event reserves
              // refundable balance (the $expr bound counts all events) but
              // must never make the order claim it was refunded.
              refundStatus: (() => {
                const completedSum = {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: { $ifNull: ['$refunds', []] },
                          as: 'r',
                          cond: { $eq: ['$$r.status', 'completed'] },
                        },
                      },
                      as: 'r',
                      in: '$$r.amount',
                    },
                  },
                };
                return {
                  $cond: [
                    { $gte: [completedSum, confirmedPaid] },
                    'refunded',
                    {
                      $cond: [
                        { $gt: [completedSum, 0] },
                        'partially_refunded',
                        'not_refunded',
                      ],
                    },
                  ],
                };
              })(),
            },
          },
        ],
      )
      .exec();

    if (!res.modifiedCount) {
      // Either a racing identical request won (replay) or the bound failed.
      const canonical = await this.orderModel
        .findOne({
          _id: new Types.ObjectId(orderId),
          shopId: new Types.ObjectId(shopId),
        })
        .exec();
      const raced = (canonical?.refunds ?? []).find(
        (r) => r.refundOperationId === opId,
      );
      if (raced) {
        this.assertSameRefund(raced, dto);
        return canonical!;
      }
      throw new BadRequestException(
        `Refund ${dto.refundAmount} would exceed confirmed paid amount ${confirmedPaid}`,
      );
    }

    return this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        shopId: new Types.ObjectId(shopId),
      })
      .exec() as Promise<OrderDocument>;
  }

  private assertSameRefund(
    prior: {
      amount: number;
      reason: string;
      allocations?: RefundAllocation[];
    },
    dto: {
      refundAmount: number;
      refundReason: string;
      allocations?: RefundAllocation[];
    },
  ): void {
    const allocSig = (allocs?: RefundAllocation[]) =>
      (allocs ?? [])
        .map((a) => `${a.method}:${a.amount}`)
        .sort()
        .join(',');
    // Allocations the server derived are part of the canonical event but were
    // not caller intent — only compare them when the request supplied them.
    const allocConflict =
      dto.allocations !== undefined &&
      allocSig(prior.allocations) !== allocSig(dto.allocations);
    if (
      prior.amount !== dto.refundAmount ||
      prior.reason !== dto.refundReason ||
      allocConflict
    ) {
      throw new ConflictException(
        'refundOperationId already used with different refund intent',
      );
    }
  }

  // ────────────────────────────── VOID ──────────────────────────────

  /**
   * Void = cancellation before settlement. Paid orders are refused outright
   * (refund path required). Stock is restored exactly once via P0-2 canonical
   * mutations keyed void:<orderId>:<productId>, and only for lines whose
   * sale:<orderId>:<productId> receipt proves a deduction landed. The durable
   * voidOperation claim makes crashes and retries converge.
   */
  async voidTransaction(
    orderId: string,
    shopId: string,
    dto: { voidOperationId?: string; voidReason: string },
    actorId: string,
  ): Promise<OrderDocument> {
    if (!dto.voidOperationId?.trim()) {
      throw new BadRequestException('voidOperationId is required');
    }
    if (!dto.voidReason?.trim()) {
      throw new BadRequestException('Void reason is required');
    }
    const opId = dto.voidOperationId;

    const { approvedBy } = await this.authorize(shopId, actorId, 'void');

    let order = await this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        shopId: new Types.ObjectId(shopId),
      })
      .exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Replay / conflict on the durable operation identity.
    if (order.voidOperation) {
      if (order.voidOperation.voidOperationId !== opId) {
        throw new ConflictException(
          'Order already has a void operation with a different id',
        );
      }
      if (order.voidOperation.reason !== dto.voidReason) {
        throw new ConflictException(
          'voidOperationId already used with a different reason',
        );
      }
      if (
        order.voidOperation.status === 'completed' ||
        order.status === 'void'
      ) {
        return order; // retry of a finished void
      }
      // Payment may have settled while the void was in progress — never let a
      // void supersede confirmed money; leave the claim durable for manual
      // reconciliation instead of finalizing a contradictory truth.
      if (this.confirmedPaid(order) > 0) {
        throw new BadRequestException(
          'Payment settled while void was in progress — paid orders cannot be voided',
        );
      }
      // in_progress → resume below (crash-safe convergence)
    } else if (order.status === 'void') {
      throw new BadRequestException('Order is already voided');
    } else {
      if (this.confirmedPaid(order) > 0) {
        throw new BadRequestException(
          'Paid orders cannot be voided — use the refund path',
        );
      }
      // ATOMIC CLAIM — persist reason/actor before any compensation runs so a
      // crash is resumable and a concurrent void cannot double-restore.
      const claim = await this.orderModel
        .updateOne(
          {
            _id: new Types.ObjectId(orderId),
            shopId: new Types.ObjectId(shopId),
            status: { $ne: 'void' },
            voidOperation: { $exists: false },
          },
          {
            $set: {
              voidOperation: {
                voidOperationId: opId,
                reason: dto.voidReason,
                requestedBy: new Types.ObjectId(actorId),
                ...(approvedBy ? { approvedBy } : {}),
                createdAt: new Date(),
                status: 'in_progress',
                stockRestorations: [],
              },
            },
          },
        )
        .exec();

      if (!claim.modifiedCount) {
        order = await this.orderModel
          .findOne({
            _id: new Types.ObjectId(orderId),
            shopId: new Types.ObjectId(shopId),
          })
          .exec();
        if (
          order?.voidOperation &&
          order.voidOperation.voidOperationId === opId
        ) {
          if (order.voidOperation.reason !== dto.voidReason) {
            throw new ConflictException(
              'voidOperationId already used with a different reason',
            );
          }
          if (
            order.voidOperation.status === 'completed' ||
            order.status === 'void'
          ) {
            return order;
          }
          // fall through — resume the raced in-progress void
        } else {
          throw new ConflictException(
            'Order already has a void operation with a different id',
          );
        }
      }
    }

    // STOCK COMPENSATION — restore each line once, only if the sale deduction
    // is proven by DURABLE EVIDENCE, never by current stock level. P0-2 pulls
    // embedded receipts after audit projection, so "sale landed" means either:
    //   (a) embedded product.stockMutations receipt still present, OR
    //   (b) the permanent StockAdjustment {shopId, mutationId} exists — the
    //       normal long-term production state.
    // Neither witness → the deduction never happened → restore nothing.
    for (const item of order.items ?? []) {
      const productId = item.productId.toString();
      const saleMutationId = `sale:${orderId}:${productId}`;
      const voidMutationId = `void:${orderId}:${productId}`;
      const product = await this.productModel
        .findOne({
          _id: new Types.ObjectId(productId),
          shopId: new Types.ObjectId(shopId),
        })
        .exec();
      const saleReceipt = (product?.stockMutations ?? []).find(
        (m: any) => m.mutationId === saleMutationId,
      );
      let qty = saleReceipt ? -saleReceipt.quantityDelta : 0;
      if (!saleReceipt && product) {
        // Embedded receipt cleaned → fall back to the permanent
        // StockAdjustment witness (tenant-scoped, mutationId-identified).
        const saleAudit = await this.adjustmentModel
          .findOne({
            shopId: new Types.ObjectId(shopId),
            mutationId: saleMutationId,
          })
          .exec();
        if (saleAudit) {
          qty = -saleAudit.quantityChange;
        }
      }
      if (!product || qty <= 0) {
        continue; // no proven sale deduction for this line
      }

      await this.inventoryService.updateStock(shopId, productId, qty, {
        mutationId: voidMutationId,
        reason: 'void',
        actor: actorId,
        referenceType: 'order',
        referenceId: orderId,
        notes: `Void ${order.orderNumber} - restore ${item.name} x${qty}`,
      });

      await this.orderModel
        .updateOne(
          {
            _id: new Types.ObjectId(orderId),
            'voidOperation.stockRestorations.mutationId': {
              $ne: voidMutationId,
            },
          },
          {
            $push: {
              'voidOperation.stockRestorations': {
                productId,
                quantity: qty,
                mutationId: voidMutationId,
              },
            },
          },
        )
        .exec();
    }

    // FINALIZE only after compensation converged — status='void' is never set
    // before stock truth is durable.
    await this.orderModel
      .updateOne(
        {
          _id: new Types.ObjectId(orderId),
          'voidOperation.voidOperationId': opId,
        },
        {
          $set: {
            status: 'void',
            voidReason: dto.voidReason,
            voidApprovedBy: approvedBy,
            voidApprovedAt: approvedBy ? new Date() : undefined,
            'voidOperation.status': 'completed',
            'voidOperation.completedAt': new Date(),
          },
        },
      )
      .exec();

    return this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        shopId: new Types.ObjectId(shopId),
      })
      .exec() as Promise<OrderDocument>;
  }

  // ──────────────────────────── DISCOUNT ────────────────────────────

  /**
   * A discount may only exist BEFORE settlement. Checkout produces either a
   * completed order or a pending order that already carries provider payment
   * intent — so no reachable post-order state can legitimately rewrite the
   * total; anything else fails closed.
   */
  async applyDiscount(
    orderId: string,
    shopId: string,
    dto: {
      discountOperationId?: string;
      discountAmount: number;
      discountReason: string;
    },
    actorId: string,
  ): Promise<OrderDocument> {
    if (!dto.discountOperationId?.trim()) {
      throw new BadRequestException('discountOperationId is required');
    }
    if (!(dto.discountAmount > 0)) {
      throw new BadRequestException('Invalid discount amount');
    }
    if (!dto.discountReason?.trim()) {
      throw new BadRequestException('Discount reason is required');
    }
    const opId = dto.discountOperationId;

    const { approvedBy } = await this.authorize(
      shopId,
      actorId,
      'discount',
      dto.discountAmount,
    );

    const order = await this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        shopId: new Types.ObjectId(shopId),
      })
      .exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const prior = (order.discounts ?? []).find(
      (d) => d.discountOperationId === opId,
    );
    if (prior) {
      if (
        prior.amount !== dto.discountAmount ||
        prior.reason !== dto.discountReason
      ) {
        throw new ConflictException(
          'discountOperationId already used with different intent',
        );
      }
      return order;
    }

    const discountableBase =
      order.subtotal + order.tax - (order.loyaltyDiscount ?? 0);
    if (dto.discountAmount > discountableBase) {
      throw new BadRequestException('Discount exceeds order value');
    }

    // ATOMIC: eligible only while the sale is still unsettled — pending
    // status, nothing paid, and no payment intent recorded. One write both
    // appends the durable event and recomputes the total from immutable
    // parts; the settled sale fields themselves are never rewritten.
    const res = await this.orderModel
      .updateOne(
        {
          _id: new Types.ObjectId(orderId),
          shopId: new Types.ObjectId(shopId),
          status: 'pending',
          paymentStatus: 'unpaid',
          'payments.0': { $exists: false },
          'discounts.discountOperationId': { $ne: opId },
          $expr: {
            $lte: [
              {
                $add: [
                  { $ifNull: [{ $sum: '$discounts.amount' }, 0] },
                  dto.discountAmount,
                ],
              },
              discountableBase,
            ],
          },
        },
        [
          {
            $set: {
              discounts: {
                $concatArrays: [
                  { $ifNull: ['$discounts', []] },
                  [
                    {
                      discountOperationId: opId,
                      amount: dto.discountAmount,
                      reason: dto.discountReason,
                      requestedBy: new Types.ObjectId(actorId),
                      ...(approvedBy ? { approvedBy } : {}),
                      createdAt: new Date(),
                    },
                  ],
                ],
              },
            },
          },
          {
            $set: {
              discountAmount: { $ifNull: [{ $sum: '$discounts.amount' }, 0] },
              total: {
                $max: [
                  0,
                  {
                    $subtract: [
                      { $add: ['$subtotal', '$tax'] },
                      {
                        $add: [
                          { $ifNull: ['$loyaltyDiscount', 0] },
                          { $ifNull: [{ $sum: '$discounts.amount' }, 0] },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
      )
      .exec();

    if (!res.modifiedCount) {
      const canonical = await this.orderModel
        .findOne({
          _id: new Types.ObjectId(orderId),
          shopId: new Types.ObjectId(shopId),
        })
        .exec();
      const raced = (canonical?.discounts ?? []).find(
        (d) => d.discountOperationId === opId,
      );
      if (raced) {
        if (
          raced.amount !== dto.discountAmount ||
          raced.reason !== dto.discountReason
        ) {
          throw new ConflictException(
            'discountOperationId already used with different intent',
          );
        }
        return canonical!;
      }
      throw new BadRequestException(
        'Order cannot be discounted — it is settled, paid, or already carries payment intent',
      );
    }

    return this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        shopId: new Types.ObjectId(shopId),
      })
      .exec() as Promise<OrderDocument>;
  }

  // ─────────────────────────── REPORTING ───────────────────────────

  /**
   * Truthful queries: voided = lifecycle status; refunded = financial events.
   * A refunded sale is still a sale — it must not disappear from sales
   * reports; refunds surface through refundStatus/events instead.
   */
  async getVoidedTransactions(
    shopId: string,
    limit: number = 50,
  ): Promise<Order[]> {
    return this.orderModel
      .find({ shopId: new Types.ObjectId(shopId), status: 'void' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getRefundedTransactions(
    shopId: string,
    limit: number = 50,
  ): Promise<Order[]> {
    return this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        refundStatus: { $in: ['partially_refunded', 'refunded'] },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getTransactionsByCashier(
    shopId: string,
    cashierId: string,
    limit: number = 50,
  ): Promise<Order[]> {
    return this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        userId: new Types.ObjectId(cashierId),
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getShiftTransactions(
    shopId: string,
    shiftId: string,
    limit: number = 100,
  ): Promise<Order[]> {
    return this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        shiftId: new Types.ObjectId(shiftId),
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getTransactionStats(shopId: string): Promise<any> {
    const stats = await this.orderModel.aggregate([
      { $match: { shopId: new Types.ObjectId(shopId) } },
      {
        $group: {
          _id: { transactionType: '$transactionType', status: '$status' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          // Completed money only — manual_required events reserve refundable
          // balance but are not refunded cash.
          refundedAmount: {
            $sum: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: { $ifNull: ['$refunds', []] },
                      as: 'r',
                      cond: { $eq: ['$$r.status', 'completed'] },
                    },
                  },
                  as: 'r',
                  in: '$$r.amount',
                },
              },
            },
          },
          pendingRefundAmount: {
            $sum: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: { $ifNull: ['$refunds', []] },
                      as: 'r',
                      cond: { $eq: ['$$r.status', 'manual_required'] },
                    },
                  },
                  as: 'r',
                  in: '$$r.amount',
                },
              },
            },
          },
        },
      },
    ]);

    return stats;
  }

  async getCashierStats(shopId: string, cashierId: string): Promise<any> {
    const stats = await this.orderModel.aggregate([
      {
        $match: {
          shopId: new Types.ObjectId(shopId),
          userId: new Types.ObjectId(cashierId),
        },
      },
      {
        $group: {
          _id: { transactionType: '$transactionType', status: '$status' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          refundedAmount: {
            $sum: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: { $ifNull: ['$refunds', []] },
                      as: 'r',
                      cond: { $eq: ['$$r.status', 'completed'] },
                    },
                  },
                  as: 'r',
                  in: '$$r.amount',
                },
              },
            },
          },
          pendingRefundAmount: {
            $sum: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: { $ifNull: ['$refunds', []] },
                      as: 'r',
                      cond: { $eq: ['$$r.status', 'manual_required'] },
                    },
                  },
                  as: 'r',
                  in: '$$r.amount',
                },
              },
            },
          },
        },
      },
    ]);

    return stats;
  }
}
