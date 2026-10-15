import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SubscriptionInvoice,
  SubscriptionInvoiceDocument,
  InvoiceStatus,
  InvoiceType,
} from '../schemas/subscription-invoice.schema';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionStatus,
} from '../schemas/subscription.schema';
import { toMinorUnits } from '../../common/currency';

/**
 * P0-11C — SUBSCRIPTION INVOICE PAYMENT AUTHORITY
 *
 * The browser is never payment authority. Every subscription card charge is
 * derived exclusively from a tenant-owned, payable SubscriptionInvoice:
 *
 *   - invoice identity: {_id: invoiceId, shopId: jwt.shopId} — cross-tenant
 *     references are invisible (404, no existence leak);
 *   - money: totalAmount + currency come from the stored invoice and are
 *     converted to provider minor units exactly once via the canonical
 *     P0-11A `toMinorUnits` contract;
 *   - client-supplied amount/currency/invoiceNumber are optional CONSISTENCY
 *     ASSERTIONS — a mismatch rejects before any provider call;
 *   - lifecycle gate: only PENDING (and FAILED for authenticated retry) may
 *     initiate — PAID / PENDING_VERIFICATION / CANCELLED / REFUNDED / DRAFT
 *     are refused;
 *   - channel exclusivity: an active M-Pesa STK attempt blocks a competing
 *     card initiation (and vice-versa — see SubscriptionMpesaService);
 *   - durable attempt identity: an atomic claim on the invoice document
 *     (`stripeAttempt`) yields a deterministic Stripe idempotency key
 *     `subpay_<invoiceId>_<seq>` — retried HTTP requests and crash recovery
 *     reuse the same provider identity instead of minting a new intent.
 *
 * Settlement flows through `settleStripeSuccess`, the single canonical
 * primitive for trusted Stripe success (verified webhook or authenticated
 * provider retrieval). It re-verifies amount/currency/tenant/invoice binding
 * against authoritative invoice truth before atomically transitioning the
 * invoice to PAID — never for processing/requires_action/failed/canceled
 * intents, never twice.
 */

export interface StripeInitiationClaim {
  invoice: SubscriptionInvoiceDocument;
  amountMinor: number;
  currency: string;
  attemptSeq: number;
  idempotencyKey: string;
  boundPaymentIntentId?: string;
}

export interface StripeSettlementResult {
  settled: boolean;
  alreadyPaid?: boolean;
  effectsApplied?: boolean;
  reason?: string;
}

// Invoice lifecycle states from which a Stripe-paid transition is legal.
const SETTLEABLE_STATUSES = [
  InvoiceStatus.PENDING,
  InvoiceStatus.FAILED,
  InvoiceStatus.PENDING_VERIFICATION,
];

// States eligible for initiating a card payment. FAILED stays retry-eligible
// under authenticated policy (the prior attempt must be terminal first).
const INITIATION_ELIGIBLE = [InvoiceStatus.PENDING, InvoiceStatus.FAILED];

@Injectable()
export class InvoicePaymentAuthorityService {
  private readonly logger = new Logger(InvoicePaymentAuthorityService.name);

  constructor(
    @InjectModel(SubscriptionInvoice.name)
    private readonly invoiceModel: Model<SubscriptionInvoiceDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  /**
   * Authorize + durably claim a Stripe initiation for an invoice.
   * Throws before any provider call when authority fails.
   */
  async authorizeStripeInitiation(
    shopId: string,
    invoiceId: string,
    client?: {
      amount?: number;
      currency?: string;
      invoiceNumber?: string;
    },
  ): Promise<StripeInitiationClaim> {
    if (!invoiceId || !Types.ObjectId.isValid(invoiceId)) {
      throw new BadRequestException(
        'A canonical subscription invoice is required for card payment',
      );
    }

    const invoice = await this.invoiceModel.findOne({
      _id: new Types.ObjectId(invoiceId),
      shopId: new Types.ObjectId(shopId),
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Client values are consistency assertions only — the stored invoice is
    // authoritative for every monetary and identity field.
    if (
      client?.invoiceNumber &&
      client.invoiceNumber !== invoice.invoiceNumber
    ) {
      throw new BadRequestException(
        'Invoice number does not match the referenced invoice',
      );
    }

    const amountMinor = toMinorUnits(invoice.totalAmount, invoice.currency);
    if (client?.amount != null && client.amount !== amountMinor) {
      throw new BadRequestException(
        'Requested amount does not match the invoice total',
      );
    }
    if (
      client?.currency &&
      client.currency.toLowerCase() !== invoice.currency.toLowerCase()
    ) {
      throw new BadRequestException(
        'Requested currency does not match the invoice currency',
      );
    }

    if (!INITIATION_ELIGIBLE.includes(invoice.status)) {
      throw new ConflictException(
        `Invoice ${invoice.invoiceNumber} is not payable by card in status '${invoice.status}'`,
      );
    }

    // Channel exclusivity: a live M-Pesa STK attempt on this invoice blocks a
    // competing card initiation (the M-Pesa side applies the mirror rule).
    if (
      invoice.paymentAttempt?.initiatedAt &&
      !invoice.paymentAttempt?.failed
    ) {
      throw new ConflictException(
        'An M-Pesa payment attempt is already in progress for this invoice',
      );
    }

    // Reuse an existing active attempt — retried HTTP requests must not mint
    // a second chargeable identity.
    const existing = invoice.stripeAttempt;
    if (existing?.status === 'active') {
      return {
        invoice,
        amountMinor,
        currency: invoice.currency,
        attemptSeq: existing.seq!,
        idempotencyKey: existing.idempotencyKey!,
        boundPaymentIntentId: existing.paymentIntentId,
      };
    }

    // Atomic compare-and-set claim: the invoice document is the durable lock.
    const seq = (existing?.seq || 0) + 1;
    const idempotencyKey = `subpay_${invoiceId}_${seq}`;
    const claimed = await this.invoiceModel.findOneAndUpdate(
      {
        _id: invoice._id,
        shopId: new Types.ObjectId(shopId),
        status: { $in: INITIATION_ELIGIBLE },
        $or: [
          { stripeAttempt: { $exists: false } },
          { 'stripeAttempt.status': { $ne: 'active' } },
        ],
      },
      {
        $set: {
          stripeAttempt: {
            seq,
            idempotencyKey,
            status: 'active',
            claimedAt: new Date(),
          },
        },
      },
      { new: true },
    );

    if (!claimed) {
      // Lost the claim race or the invoice changed state — return the active
      // attempt owned by the winning request so this request still converges
      // to the same provider identity.
      const fresh = await this.invoiceModel.findById(invoice._id);
      if (fresh?.stripeAttempt?.status === 'active') {
        return {
          invoice: fresh,
          amountMinor,
          currency: fresh.currency,
          attemptSeq: fresh.stripeAttempt.seq!,
          idempotencyKey: fresh.stripeAttempt.idempotencyKey!,
          boundPaymentIntentId: fresh.stripeAttempt.paymentIntentId,
        };
      }
      throw new ConflictException(
        'Invoice is no longer payable — state changed during initiation',
      );
    }

    return {
      invoice: claimed,
      amountMinor,
      currency: invoice.currency,
      attemptSeq: seq,
      idempotencyKey,
    };
  }

  /**
   * Bind a provider PaymentIntent id to the claimed attempt. Fails closed if
   * the attempt was already bound to a different intent or is no longer
   * active — a bound intent id is the durable link used to recover from a
   * lost provider response.
   */
  async bindStripeIntent(
    invoiceId: string,
    attemptSeq: number,
    paymentIntentId: string,
  ): Promise<void> {
    const bound = await this.invoiceModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(invoiceId),
        'stripeAttempt.seq': attemptSeq,
        'stripeAttempt.status': 'active',
        $or: [
          { 'stripeAttempt.paymentIntentId': { $exists: false } },
          { 'stripeAttempt.paymentIntentId': paymentIntentId },
        ],
      },
      {
        $set: {
          'stripeAttempt.paymentIntentId': paymentIntentId,
          'stripeAttempt.boundAt': new Date(),
        },
      },
      { new: true },
    );
    if (!bound) {
      this.logger.warn(
        `Refused to bind intent ${paymentIntentId} to invoice ${invoiceId} ` +
          `attempt ${attemptSeq} — attempt no longer active or already bound to a different intent`,
      );
    }
  }

  /**
   * Release an attempt into a terminal local state so a fresh attempt (new
   * seq, new idempotency key) may be claimed. Provider-terminal only —
   * ambiguous outcomes must never release the slot (they would risk a blind
   * second charge).
   */
  async releaseStripeAttempt(
    invoiceId: string,
    attemptSeq: number,
    outcome: 'failed' | 'cancelled',
    reason?: string,
  ): Promise<void> {
    await this.invoiceModel.updateOne(
      { _id: new Types.ObjectId(invoiceId), 'stripeAttempt.seq': attemptSeq },
      {
        $set: {
          'stripeAttempt.status': outcome,
          'stripeAttempt.releasedAt': new Date(),
          'stripeAttempt.releaseReason': reason,
        },
      },
    );
  }

  /**
   * Provider-terminal failure/cancel observed via webhook or retrieval —
   * resolves the owning invoice through the persisted intent binding.
   */
  async releaseStripeAttemptByIntent(
    paymentIntentId: string,
    outcome: 'failed' | 'cancelled',
    reason?: string,
  ): Promise<void> {
    await this.invoiceModel.updateOne(
      {
        'stripeAttempt.paymentIntentId': paymentIntentId,
        'stripeAttempt.status': 'active',
      },
      {
        $set: {
          'stripeAttempt.status': outcome,
          'stripeAttempt.releasedAt': new Date(),
          'stripeAttempt.releaseReason': reason,
        },
      },
    );
  }

  /**
   * CANONICAL SETTLEMENT PRIMITIVE — trusted Stripe success only.
   *
   * Re-verifies the invoice binding (tenant + invoice id), amount and
   * currency against authoritative invoice truth, then atomically transitions
   * an eligible invoice to PAID and runs subscription billing side effects
   * exactly once (the atomic update is the once-guard).
   */
  async settleStripeSuccess(input: {
    invoiceId: string;
    shopId: string;
    paymentIntentId: string;
    stripeChargeId?: string;
    amountMinor: number;
    currency: string;
  }): Promise<StripeSettlementResult> {
    const { invoiceId, shopId, paymentIntentId, stripeChargeId } = input;

    if (!Types.ObjectId.isValid(invoiceId) || !Types.ObjectId.isValid(shopId)) {
      return { settled: false, reason: 'invalid-binding' };
    }

    const invoice = await this.invoiceModel.findOne({
      _id: new Types.ObjectId(invoiceId),
      shopId: new Types.ObjectId(shopId),
    });
    if (!invoice) {
      return { settled: false, reason: 'invoice-not-found-for-binding' };
    }

    if (invoice.status === InvoiceStatus.PAID) {
      // P0-11C1: an already-paid invoice may still carry PENDING billing
      // effects (crash between the atomic transition and the subscription
      // mutation). Resume them — payment truth is established, only the
      // effects may be missing.
      const fx = await this.ensureBillingEffects(invoiceId, shopId);
      return { settled: false, alreadyPaid: true, effectsApplied: fx };
    }
    if (!SETTLEABLE_STATUSES.includes(invoice.status)) {
      return { settled: false, reason: `status:${invoice.status}` };
    }

    // Re-verify provider money against invoice truth — a succeeded intent for
    // the wrong amount/currency must never settle the invoice.
    const expectedMinor = toMinorUnits(invoice.totalAmount, invoice.currency);
    if (
      input.amountMinor !== expectedMinor ||
      input.currency.toLowerCase() !== invoice.currency.toLowerCase()
    ) {
      this.logger.error(
        `Refusing settlement: intent ${paymentIntentId} amount/currency ` +
          `${input.amountMinor} ${input.currency} != invoice ${invoice.invoiceNumber} ` +
          `${expectedMinor} ${invoice.currency} — manual reconciliation required`,
      );
      await this.invoiceModel.updateOne(
        { _id: invoice._id },
        {
          $set: {
            lastPaymentError:
              'Provider amount/currency mismatch — manual reconciliation required',
          },
        },
      );
      return { settled: false, reason: 'amount-currency-mismatch' };
    }

    // Atomic transition — the once-guard. Concurrent webhook + status
    // retrieval + redelivery all converge here; only the first wins.
    const transitioned = await this.invoiceModel.findOneAndUpdate(
      {
        _id: invoice._id,
        shopId: new Types.ObjectId(shopId),
        status: { $in: SETTLEABLE_STATUSES },
      },
      {
        $set: {
          status: InvoiceStatus.PAID,
          paidAt: new Date(),
          paymentMethod: 'stripe',
          paymentReference: paymentIntentId,
          'stripePayment.paymentIntentId': paymentIntentId,
          'stripePayment.chargeId': stripeChargeId,
          'stripePayment.amount': input.amountMinor,
          'stripePayment.currency': input.currency,
          'stripePayment.status': 'succeeded',
          'stripePayment.completedAt': new Date(),
          'stripeAttempt.status': 'succeeded',
          'stripeAttempt.settledAt': new Date(),
          // P0-11C1: the pending effects marker is committed atomically WITH
          // the paid transition — a crash can never produce paid-without-
          // pending-effects under this primitive.
          'billingEffects.status': 'pending',
          'billingEffects.channel': 'stripe',
        },
      },
      { new: true },
    );

    if (!transitioned) {
      // Another caller won the transition — effects may still be pending.
      const fx = await this.ensureBillingEffects(invoiceId, shopId);
      return { settled: false, alreadyPaid: true, effectsApplied: fx };
    }

    // Exactly-once billing side effects — idempotent application + durable
    // completion marker. A crash here leaves status 'pending' and the next
    // webhook redelivery or authenticated reconciliation resumes the work.
    const fx = await this.ensureBillingEffects(invoiceId, shopId);

    this.logger.log(
      `Invoice ${transitioned.invoiceNumber} settled by Stripe intent ${paymentIntentId} ` +
        `(${input.amountMinor} ${input.currency})`,
    );
    return { settled: true, effectsApplied: fx };
  }

  /**
   * P0-11C1 — DURABLE BILLING-EFFECT EXECUTION
   *
   * Applies subscription effects for a PAID invoice whose billingEffects
   * marker is not yet 'applied', then records completion. Every effect in
   * applyInvoicePaidEffects is an idempotent fixed-value write, so resuming
   * after a crash (or racing another reconciler) can never duplicate the
   * entitlement. The 'applied' marker is written only AFTER the effects are
   * durable; on failure the marker stays 'pending' and lastError is recorded
   * so webhook redelivery / authenticated reconciliation retries the work.
   * Returns true when this call applied the effects.
   */
  async ensureBillingEffects(
    invoiceId: string,
    shopId: string,
  ): Promise<boolean> {
    const invoice = await this.invoiceModel.findOne({
      _id: new Types.ObjectId(invoiceId),
      shopId: new Types.ObjectId(shopId),
    });
    if (!invoice || invoice.status !== InvoiceStatus.PAID) return false;
    if (invoice.billingEffects?.status === 'applied') return false;

    try {
      await this.applyInvoicePaidEffects(
        invoice,
        invoice.paymentMethod || 'stripe',
        invoice.paymentReference || '',
      );
      await this.invoiceModel.updateOne(
        { _id: invoice._id },
        {
          $set: {
            'billingEffects.status': 'applied',
            'billingEffects.appliedAt': new Date(),
          },
          $inc: { 'billingEffects.attempts': 1 },
        },
      );
      return true;
    } catch (error: any) {
      await this.invoiceModel
        .updateOne(
          { _id: invoice._id },
          {
            $set: {
              'billingEffects.lastError':
                error?.message || 'billing effects failed',
            },
            $inc: { 'billingEffects.attempts': 1 },
          },
        )
        .catch(() => undefined);
      throw error;
    }
  }

  /**
   * Billing side effects for a settled invoice — the same effects the former
   * markInvoicePaid applied: last-payment tracking, setup completion for
   * SETUP invoices, and PAST_DUE → ACTIVE recovery.
   *
   * P0-11C2: applied through a MONOTONIC per-invoice CAS — the update only
   * lands if this invoice is newer than `metadata.lastSettledInvoiceId`
   * (ObjectId ordering). A replayed older invoice can never overwrite a
   * newer invoice's payment tracking or re-run effects; the subscription
   * read is only used to build the fixed-value write set, never trusted as
   * the guard.
   */
  private async applyInvoicePaidEffects(
    invoice: SubscriptionInvoiceDocument,
    paymentMethod: string,
    paymentReference: string,
  ): Promise<void> {
    const subscription = await this.subscriptionModel.findById(
      invoice.subscriptionId,
    );
    if (!subscription) return;

    const updateData: Record<string, any> = {
      lastPaymentDate: new Date(),
      lastPaymentAmount: invoice.totalAmount,
      lastPaymentMethod: paymentMethod,
      lastPaymentReference: paymentReference,
      failedPaymentAttempts: 0,
      'metadata.lastSettledInvoiceId': new Types.ObjectId(
        invoice._id.toString(),
      ),
    };

    if (invoice.type === InvoiceType.SETUP) {
      updateData.setupPaid = true;
      updateData.setupPaidAt = new Date();
      updateData.setupAmount = invoice.totalAmount;
    }

    if (subscription.status === SubscriptionStatus.PAST_DUE) {
      updateData.status = SubscriptionStatus.ACTIVE;
    }

    await this.subscriptionModel.updateOne(
      {
        _id: subscription._id,
        // $ne covers same-invoice replay incl. legacy string markers.
        'metadata.lastSettledInvoiceId': {
          $ne: invoice._id.toString(),
        },
        $or: [
          { 'metadata.lastSettledInvoiceId': { $exists: false } },
          {
            'metadata.lastSettledInvoiceId': {
              $lt: invoice._id,
            },
          },
        ],
      },
      { $set: updateData },
    );
  }
}
