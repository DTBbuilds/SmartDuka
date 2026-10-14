import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { StripeService } from '../stripe.service';
import { StripeCustomerService } from './stripe-customer.service';
import { StripeConnectService } from './stripe-connect.service';
import { Order, OrderDocument } from '../../sales/schemas/order.schema';
import { PaymentTransactionService } from '../../payments/services/payment-transaction.service';
import { OrderPaymentAuthorityService } from '../../payments/services/order-payment-authority.service';
import { InvoicePaymentAuthorityService } from '../../subscriptions/services/invoice-payment-authority.service';
import { fromMinorUnits } from '../../common/currency';
import {
  StripePayment,
  StripePaymentDocument,
  StripePaymentStatus,
  StripePaymentType,
} from '../schemas/stripe-payment.schema';

/**
 * Stripe Payment Service
 *
 * Handles all payment operations including:
 * - POS payments (card payments at point of sale)
 * - Subscription payments
 * - Invoice payments
 * - Refunds
 *
 * Mobile-first design with support for various payment methods.
 */
@Injectable()
export class StripePaymentService {
  private readonly logger = new Logger(StripePaymentService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly customerService: StripeCustomerService,
    private readonly connectService: StripeConnectService,
    private readonly configService: ConfigService,
    @InjectModel(StripePayment.name)
    private readonly paymentModel: Model<StripePaymentDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly paymentTransactionService: PaymentTransactionService,
    private readonly orderPaymentAuthority: OrderPaymentAuthorityService,
    private readonly invoicePaymentAuthority: InvoicePaymentAuthorityService,
  ) {}

  /**
   * Platform fee (basis points) taken from every POS card sale, routed from the shop's
   * connected account back to the platform account via Stripe's application_fee_amount.
   * Configurable via env `STRIPE_APPLICATION_FEE_BPS` (e.g. 150 = 1.50%). Default 0 (no fee).
   */
  private computeApplicationFee(amount: number): number {
    const bpsRaw = this.configService.get<string | number>(
      'STRIPE_APPLICATION_FEE_BPS',
      0,
    );
    const bps =
      typeof bpsRaw === 'number' ? bpsRaw : parseInt(bpsRaw || '0', 10);
    if (!bps || bps <= 0) return 0;
    return Math.floor((amount * bps) / 10000);
  }

  /**
   * Create a payment intent for POS sale
   * Returns client secret for frontend to complete payment
   *
   * ACID Properties:
   * - Atomicity: Payment intent and local record created together
   * - Consistency: Validates amount before creating payment
   * - Isolation: Uses idempotency keys to prevent duplicate payments
   * - Durability: Saved to local DB with Stripe as source of truth
   */
  async createPOSPayment(params: {
    shopId: string;
    orderId: string;
    orderNumber: string;
    amount: number;
    currency?: string;
    customerEmail?: string;
    customerName?: string;
    description?: string;
  }): Promise<{
    paymentIntentId: string;
    clientSecret: string;
    amount: number;
    currency: string;
    minimumAmount?: number;
  }> {
    const currency = params.currency || 'kes';

    // Validate minimum amount before attempting Stripe call
    const validation = this.stripeService.validateMinimumAmount(
      params.amount,
      currency,
    );
    if (!validation.valid) {
      throw new BadRequestException(validation.message);
    }

    // Check for existing payment intent for this order to ensure idempotency
    const existingPayment = await this.paymentModel.findOne({
      shopId: new Types.ObjectId(params.shopId),
      'metadata.orderNumber': params.orderNumber,
      status: {
        $in: [
          StripePaymentStatus.REQUIRES_PAYMENT_METHOD,
          StripePaymentStatus.REQUIRES_ACTION,
        ],
      },
    });

    if (existingPayment) {
      this.logger.log(
        `Returning existing payment intent ${existingPayment.stripePaymentIntentId} for order ${params.orderNumber}`,
      );
      return {
        paymentIntentId: existingPayment.stripePaymentIntentId,
        clientSecret: existingPayment.clientSecret!,
        amount: existingPayment.amount,
        currency: existingPayment.currency,
      };
    }

    // Stripe Connect: require the shop to have a connected account that can accept charges.
    // This both enforces "no card sales without Stripe configured" and routes funds directly
    // to the shop's own Stripe balance — the platform never touches the money.
    const connectedAccountId =
      await this.connectService.requireConnectedAccountId(params.shopId);
    const applicationFeeAmount = this.computeApplicationFee(params.amount);

    // Generate idempotency key to prevent duplicate payments on retry
    const idempotencyKey = this.generateIdempotencyKey(
      params.shopId,
      params.orderId,
      'pos',
    );

    // Create payment intent with idempotency — DIRECT CHARGE on the shop's connected account.
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: params.amount,
      currency,
      description:
        params.description || `POS Sale - Order ${params.orderNumber}`,
      receiptEmail: params.customerEmail,
      metadata: {
        shopId: params.shopId,
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        type: StripePaymentType.POS_SALE,
        source: 'smartduka_pos',
        connectedAccountId,
      },
      idempotencyKey,
      stripeAccount: connectedAccountId,
      applicationFeeAmount:
        applicationFeeAmount > 0 ? applicationFeeAmount : undefined,
    });

    // Save to local database for tracking — P0-10D: POS intents are always
    // bound to a canonical order (real ObjectId enforced by the controller),
    // so the linkage row always carries orderId + orderNumber.
    const isValidObjectId = /^[a-fA-F0-9]{24}$/.test(params.orderId);
    const payment = new this.paymentModel({
      stripePaymentIntentId: paymentIntent.id,
      connectedAccountId,
      shopId: new Types.ObjectId(params.shopId),
      ...(isValidObjectId && { orderId: new Types.ObjectId(params.orderId) }),
      paymentType: StripePaymentType.POS_SALE,
      amount: params.amount,
      currency,
      status: this.mapStripeStatus(paymentIntent.status),
      description: params.description,
      clientSecret: paymentIntent.client_secret,
      metadata: {
        orderNumber: params.orderNumber,
        customerName: params.customerName || '',
        idempotencyKey,
        connectedAccountId,
        applicationFeeAmount: String(applicationFeeAmount),
      },
    });

    await payment.save();

    this.logger.log(
      `Created POS payment intent ${paymentIntent.id} for order ${params.orderNumber} ` +
        `(shop: ${params.shopId}, connected account: ${connectedAccountId}, fee: ${applicationFeeAmount})`,
    );

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
      amount: params.amount,
      currency,
    };
  }

  /**
   * Create a payment intent for a subscription invoice.
   *
   * P0-11C — INVOICE-AUTHORITATIVE, DURABLY IDEMPOTENT.
   *
   * The invoice is the only payment authority: identity is resolved as
   * {_id: invoiceId, shopId: caller's JWT shopId} and amount/currency are
   * derived from the stored invoice (totalAmount → toMinorUnits(currency)).
   * Client-supplied amount/currency/invoiceNumber are optional consistency
   * assertions; a mismatch rejects before any provider call.
   *
   * Attempt lifecycle (InvoicePaymentAuthorityService):
   *  - atomic claim on the invoice document → exactly one active attempt;
   *  - deterministic idempotency key `subpay_<invoiceId>_<seq>` — retried
   *    HTTP requests, lost responses and provider timeouts all converge on
   *    the same PaymentIntent instead of minting a new chargeable identity;
   *  - a bound attempt reuses its intent ONLY after provider re-verification
   *    (status usable + amount/currency/invoice/tenant match);
   *  - provider-terminal outcomes (canceled/failed) release the slot so a
   *    retry claims a fresh attempt; ambiguous errors leave the claim intact.
   */
  async createSubscriptionPayment(params: {
    shopId: string;
    invoiceId: string;
    customerEmail: string;
    client?: {
      amount?: number;
      currency?: string;
      invoiceNumber?: string;
      description?: string;
    };
  }): Promise<{
    paymentIntentId: string;
    clientSecret: string;
    amount: number;
    currency: string;
    invoiceNumber: string;
  }> {
    return this.initiateInvoicePaymentAttempt(params, 0);
  }

  private async initiateInvoicePaymentAttempt(
    params: {
      shopId: string;
      invoiceId: string;
      customerEmail: string;
      client?: {
        amount?: number;
        currency?: string;
        invoiceNumber?: string;
        description?: string;
      };
    },
    depth: number,
  ): Promise<{
    paymentIntentId: string;
    clientSecret: string;
    amount: number;
    currency: string;
    invoiceNumber: string;
  }> {
    if (depth > 2) {
      throw new BadRequestException(
        'Unable to establish a payment attempt for this invoice',
      );
    }

    const claim = await this.invoicePaymentAuthority.authorizeStripeInitiation(
      params.shopId,
      params.invoiceId,
      params.client,
    );
    const { invoice, amountMinor, currency } = claim;
    const currencyLower = currency.toLowerCase();

    // Existing attempt already bound to a provider intent → reuse only after
    // provider re-verification (retry / lost-response recovery path).
    if (claim.boundPaymentIntentId) {
      const intent = await this.stripeService.retrievePaymentIntent(
        claim.boundPaymentIntentId,
      );
      const bindingOk =
        intent.amount === amountMinor &&
        intent.currency === currencyLower &&
        intent.metadata?.invoiceId === params.invoiceId &&
        intent.metadata?.shopId === params.shopId;

      if (intent.status === 'succeeded' && bindingOk) {
        // Already paid at the provider — converge the invoice and report.
        await this.invoicePaymentAuthority.settleStripeSuccess({
          invoiceId: params.invoiceId,
          shopId: params.shopId,
          paymentIntentId: intent.id,
          stripeChargeId: intent.latest_charge as string | undefined,
          amountMinor: intent.amount,
          currency: intent.currency,
        });
        throw new BadRequestException('Invoice is already paid');
      }

      if (
        bindingOk &&
        [
          'requires_payment_method',
          'requires_confirmation',
          'requires_action',
          'processing',
        ].includes(intent.status) &&
        intent.client_secret
      ) {
        return {
          paymentIntentId: intent.id,
          clientSecret: intent.client_secret,
          amount: intent.amount,
          currency: intent.currency,
          invoiceNumber: invoice.invoiceNumber,
        };
      }

      // Provider-terminal or foreign/mismatched intent — never reuse it.
      await this.invoicePaymentAuthority.releaseStripeAttempt(
        params.invoiceId,
        claim.attemptSeq,
        intent.status === 'canceled' ? 'cancelled' : 'failed',
        bindingOk
          ? `provider status ${intent.status}`
          : 'provider intent binding mismatch',
      );
      return this.initiateInvoicePaymentAttempt(params, depth + 1);
    }

    // Fresh claim (or an unbound attempt recovered after a lost response):
    // the deterministic key makes Stripe return the SAME intent if this
    // attempt already reached the provider.
    const customer = await this.customerService.getOrCreateCustomer({
      shopId: params.shopId,
      email: params.customerEmail,
    });

    try {
      const paymentIntent = await this.stripeService.createPaymentIntent({
        amount: amountMinor,
        currency: currencyLower,
        customerId: customer.stripeCustomerId,
        description:
          params.client?.description ||
          `Subscription Payment - Invoice ${invoice.invoiceNumber}`,
        receiptEmail: params.customerEmail,
        metadata: {
          shopId: params.shopId,
          invoiceId: params.invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          type: StripePaymentType.SUBSCRIPTION,
          source: 'smartduka_subscription',
          attemptSeq: String(claim.attemptSeq),
        },
        idempotencyKey: claim.idempotencyKey,
      });

      // Persist the provider identity BEFORE binding so webhook/status
      // convergence can always resolve the canonical invoice.
      const payment = new this.paymentModel({
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: customer.stripeCustomerId,
        shopId: new Types.ObjectId(params.shopId),
        invoiceId: new Types.ObjectId(params.invoiceId),
        paymentType: StripePaymentType.SUBSCRIPTION,
        amount: amountMinor,
        currency: currencyLower,
        status: this.mapStripeStatus(paymentIntent.status),
        description: params.client?.description,
        clientSecret: paymentIntent.client_secret,
        receiptEmail: params.customerEmail,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          idempotencyKey: claim.idempotencyKey,
          attemptSeq: String(claim.attemptSeq),
        },
      });
      // A retry may return the pre-existing intent → the row may already
      // exist (stripePaymentIntentId is unique) — upsert rather than fail.
      await this.paymentModel
        .updateOne(
          { stripePaymentIntentId: paymentIntent.id },
          { $setOnInsert: payment.toObject() },
          { upsert: true },
        )
        .exec();

      await this.invoicePaymentAuthority.bindStripeIntent(
        params.invoiceId,
        claim.attemptSeq,
        paymentIntent.id,
      );

      this.logger.log(
        `Created subscription payment intent ${paymentIntent.id} for invoice ${invoice.invoiceNumber} ` +
          `(shop: ${params.shopId}, attempt ${claim.attemptSeq})`,
      );

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount: amountMinor,
        currency: currencyLower,
        invoiceNumber: invoice.invoiceNumber,
      };
    } catch (err) {
      // Definitive pre-provider rejection → release the claim so a retry may
      // claim a fresh attempt. Ambiguous failures (network/5xx — the intent
      // may exist) keep the claim: the deterministic key recovers it.
      if (err instanceof HttpException && err.getStatus() < 500) {
        await this.invoicePaymentAuthority.releaseStripeAttempt(
          params.invoiceId,
          claim.attemptSeq,
          'failed',
          err.message,
        );
      }
      throw err;
    }
  }

  /**
   * Get payment by Stripe payment intent ID
   */
  async getPaymentByIntentId(
    paymentIntentId: string,
  ): Promise<StripePaymentDocument | null> {
    return this.paymentModel.findOne({
      stripePaymentIntentId: paymentIntentId,
    });
  }

  /**
   * Get payment status from Stripe and sync — P0-11C1: tenant-bound.
   *
   * The caller's JWT shopId is resolved against the local StripePayment row
   * BEFORE any provider retrieval: a foreign or unknown intent is a plain
   * 404 (no existence leak, no cross-shop reconciliation trigger), and the
   * provider is never contacted for a payment the caller does not own.
   */
  async syncPaymentStatus(
    paymentIntentId: string,
    shopId: string,
  ): Promise<StripePaymentDocument> {
    if (!shopId || !Types.ObjectId.isValid(shopId)) {
      throw new NotFoundException('Payment not found');
    }

    // Tenant-scoped local resolution gates the provider call.
    const existing = await this.paymentModel
      .findOne({
        stripePaymentIntentId: paymentIntentId,
        shopId: new Types.ObjectId(shopId),
      })
      .select('connectedAccountId')
      .lean();
    if (!existing) {
      throw new NotFoundException('Payment not found');
    }

    const paymentIntent = await this.stripeService.retrievePaymentIntent(
      paymentIntentId,
      existing?.connectedAccountId
        ? { stripeAccount: existing.connectedAccountId }
        : undefined,
    );

    const payment = await this.paymentModel.findOneAndUpdate(
      {
        stripePaymentIntentId: paymentIntentId,
        shopId: new Types.ObjectId(shopId),
      },
      {
        $set: {
          status: this.mapStripeStatus(paymentIntent.status),
          stripeChargeId: paymentIntent.latest_charge as string,
          paidAt: paymentIntent.status === 'succeeded' ? new Date() : undefined,
        },
      },
      { new: true },
    );

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // P0-10D: authenticated server-side retrieval is trusted provider truth —
    // converge the canonical order exactly like a verified webhook would, so
    // a lost browser response still settles the order.
    await this.convergeOrderFromProviderTruth(
      payment,
      paymentIntent.status,
      paymentIntent.latest_charge as string | undefined,
    );

    // P0-11C: the same trusted provider truth settles a subscription invoice
    // — this is the durable reconciliation path when a webhook delivery was
    // lost or its processing failed.
    await this.convergeInvoiceFromProviderTruth(payment, paymentIntent);

    return payment;
  }
  async refundPayment(params: {
    paymentIntentId: string;
    amount?: number;
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  }): Promise<StripePaymentDocument> {
    const payment = await this.paymentModel.findOne({
      stripePaymentIntentId: params.paymentIntentId,
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== StripePaymentStatus.SUCCEEDED) {
      throw new BadRequestException('Can only refund succeeded payments');
    }

    const refund = await this.stripeService.createRefund({
      paymentIntentId: params.paymentIntentId,
      amount: params.amount,
      reason: params.reason,
      // If the original charge was a Direct Charge on a connected account, the refund
      // must be scoped to that same account — otherwise Stripe returns "No such payment_intent".
      stripeAccount: payment.connectedAccountId || undefined,
    });

    // Update payment record
    const refundAmount = params.amount || payment.amount;
    const newRefundedAmount = (payment.refundedAmount || 0) + refundAmount;
    const isFullyRefunded = newRefundedAmount >= payment.amount;

    await this.paymentModel.updateOne(
      { stripePaymentIntentId: params.paymentIntentId },
      {
        $set: {
          status: isFullyRefunded
            ? StripePaymentStatus.REFUNDED
            : StripePaymentStatus.PARTIALLY_REFUNDED,
          refundedAmount: newRefundedAmount,
        },
        $push: {
          refunds: {
            refundId: refund.id,
            amount: refundAmount,
            reason: params.reason,
            status: refund.status,
            createdAt: new Date(),
          },
        },
      },
    );

    this.logger.log(
      `Refunded ${refundAmount} for payment ${params.paymentIntentId}`,
    );

    return this.paymentModel.findOne({
      stripePaymentIntentId: params.paymentIntentId,
    }) as Promise<StripePaymentDocument>;
  }

  /**
   * Get payments for a shop with filters
   */
  async getShopPayments(
    shopId: string,
    filters?: {
      status?: StripePaymentStatus;
      paymentType?: StripePaymentType;
      from?: Date;
      to?: Date;
      limit?: number;
      skip?: number;
    },
  ): Promise<StripePaymentDocument[]> {
    const query: any = { shopId: new Types.ObjectId(shopId) };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.paymentType) {
      query.paymentType = filters.paymentType;
    }

    if (filters?.from || filters?.to) {
      query.createdAt = {};
      if (filters.from) query.createdAt.$gte = filters.from;
      if (filters.to) query.createdAt.$lte = filters.to;
    }

    return this.paymentModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(filters?.limit || 100)
      .skip(filters?.skip || 0)
      .exec();
  }

  /**
   * Handle payment intent webhook events
   */
  async handlePaymentIntentEvent(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    const updateData: any = {
      status: this.mapStripeStatus(paymentIntent.status),
    };

    if (paymentIntent.status === 'succeeded') {
      updateData.paidAt = new Date();
      updateData.stripeChargeId = paymentIntent.latest_charge;
      // Receipt URL is available on the charge object, fetched separately if needed

      // Update customer payment stats
      const shopId = paymentIntent.metadata?.shopId;
      if (shopId) {
        const customer = await this.customerService.getCustomerByShopId(shopId);
        if (customer) {
          await this.customerService.recordPayment(
            customer.stripeCustomerId,
            paymentIntent.amount,
          );
        }
      }
    }

    if (paymentIntent.status === 'canceled') {
      updateData.canceledAt = new Date();
    }

    if (paymentIntent.last_payment_error) {
      updateData.failureCode = paymentIntent.last_payment_error.code;
      updateData.failureMessage = paymentIntent.last_payment_error.message;
    }

    // Extract payment method details
    if (paymentIntent.payment_method) {
      const pmId =
        typeof paymentIntent.payment_method === 'string'
          ? paymentIntent.payment_method
          : paymentIntent.payment_method.id;
      updateData.paymentMethodId = pmId;
    }

    await this.paymentModel.updateOne(
      { stripePaymentIntentId: paymentIntent.id },
      { $set: updateData },
    );

    this.logger.log(
      `Updated payment ${paymentIntent.id} status to ${paymentIntent.status}`,
    );

    // P0-10D: verified webhook = trusted provider truth → converge order.
    const payment = await this.paymentModel
      .findOne({ stripePaymentIntentId: paymentIntent.id })
      .exec();
    if (payment) {
      await this.convergeOrderFromProviderTruth(
        payment,
        paymentIntent.status,
        paymentIntent.latest_charge as string | undefined,
      );
      // P0-11C: converge a bound subscription invoice (or release the attempt
      // slot on provider-terminal failure).
      await this.convergeInvoiceFromProviderTruth(payment, paymentIntent);
    } else if (
      paymentIntent.metadata?.type === StripePaymentType.SUBSCRIPTION &&
      paymentIntent.metadata?.invoiceId &&
      paymentIntent.metadata?.shopId
    ) {
      // Lost-local-record recovery: the intent metadata still carries the
      // canonical binding — settle directly from provider truth.
      await this.convergeInvoiceFromProviderTruth(null, paymentIntent);
    }
  }

  /**
   * P0-11C — PROVIDER-TRUTH INVOICE CONVERGENCE
   *
   * Called from the verified webhook handler AND authenticated server-side
   * retrieval (syncPaymentStatus). Only Stripe-observed truth mutates the
   * canonical invoice — a browser success callback never settles billing.
   *   - 'succeeded' → canonical settlement primitive: binding, amount and
   *     currency are re-verified against the stored invoice before the
   *     atomic PAID transition; side effects run exactly once.
   *   - 'canceled' / 'payment_failed' → provider-terminal → the invoice's
   *     active card attempt is released so a retry may claim a fresh one.
   *   - anything else → unresolved: the attempt stays active.
   * When the persisted StripePayment row is missing (lost local response),
   * the provider metadata binding is used as the recovery path — settlement
   * still re-verifies amount/currency/tenant against the invoice.
   */
  private async convergeInvoiceFromProviderTruth(
    payment: StripePaymentDocument | null,
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    try {
      const isSubscription =
        payment?.paymentType === StripePaymentType.SUBSCRIPTION ||
        paymentIntent.metadata?.type === StripePaymentType.SUBSCRIPTION;
      if (!isSubscription) return;

      const rowInvoiceId = payment?.invoiceId?.toString();
      const rowShopId = payment?.shopId?.toString();
      const metaInvoiceId = paymentIntent.metadata?.invoiceId;
      const metaShopId = paymentIntent.metadata?.shopId;

      // Binding agreement: when both the persisted payment row and the
      // provider metadata carry the binding they MUST agree — metadata alone
      // is never permission to settle a different invoice/tenant.
      if (
        (rowInvoiceId && metaInvoiceId && rowInvoiceId !== metaInvoiceId) ||
        (rowShopId && metaShopId && rowShopId !== metaShopId)
      ) {
        this.logger.error(
          `Refusing invoice convergence for intent ${paymentIntent.id}: ` +
            `payment-row binding (${rowShopId}/${rowInvoiceId}) disagrees with ` +
            `provider metadata (${metaShopId}/${metaInvoiceId})`,
        );
        return;
      }

      const invoiceId = rowInvoiceId || metaInvoiceId;
      const shopId = rowShopId || metaShopId;
      if (!invoiceId || !shopId) return;

      if (paymentIntent.status === 'succeeded') {
        await this.invoicePaymentAuthority.settleStripeSuccess({
          invoiceId,
          shopId,
          paymentIntentId: paymentIntent.id,
          stripeChargeId: paymentIntent.latest_charge as string | undefined,
          amountMinor: paymentIntent.amount,
          currency: paymentIntent.currency,
        });
        return;
      }

      if (
        paymentIntent.status === 'canceled' ||
        (paymentIntent.last_payment_error &&
          paymentIntent.status === 'requires_payment_method')
      ) {
        await this.invoicePaymentAuthority.releaseStripeAttemptByIntent(
          paymentIntent.id,
          paymentIntent.status === 'canceled' ? 'cancelled' : 'failed',
          paymentIntent.last_payment_error?.message,
        );
      }
    } catch (error: any) {
      // Convergence failure must not fail webhook ack handling upstream —
      // the durable webhook-event record + authenticated retrieval are the
      // retry/convergence path. Logged loudly for reconciliation.
      this.logger.error(
        `Invoice convergence failed for Stripe intent ${paymentIntent.id}: ${error?.message}`,
      );
      throw error;
    }
  }

  /**
   * P0-10D — PROVIDER-TRUTH ORDER CONVERGENCE
   *
   * Called from the verified webhook handler AND authenticated server-side
   * retrieval (syncPaymentStatus). Only Stripe-observed terminal truth mutates
   * the canonical order — browser success alone never does.
   *   - 'succeeded' → record the completed payment transaction (deduped on
   *     stripePaymentIntentId) → the shared convergence primitive flips the
   *     embedded pending allocation to 'completed', recalculates
   *     paymentStatus, completes the order, and fires once-only side effects.
   *   - 'canceled'  → terminal failure → embedded intent → 'failed' (the
   *     order becomes voidable / a new attempt may be initiated).
   *   - 'requires_payment_method' / 'requires_action' / 'processing' →
   *     unresolved: the intent stays 'pending', void stays blocked.
   * Tenant scope is enforced by the StripePayment row (created under the
   * authenticated shop) and re-verified by the {_id, shopId} order lookup.
   */
  private async convergeOrderFromProviderTruth(
    payment: StripePaymentDocument,
    intentStatus: Stripe.PaymentIntent.Status,
    latestCharge?: string,
  ): Promise<void> {
    try {
      if (
        !payment.orderId ||
        !payment.shopId ||
        payment.paymentType !== StripePaymentType.POS_SALE
      ) {
        return; // subscription/donation/legacy intents bind no POS order
      }
      const shopId = payment.shopId.toString();
      const orderId = payment.orderId.toString();

      if (intentStatus === 'canceled') {
        await this.orderPaymentAuthority.markIntentFailed(
          shopId,
          orderId,
          'stripe',
        );
        this.logger.log(
          `Stripe intent ${payment.stripePaymentIntentId} canceled — order ${orderId} allocation marked failed`,
        );
        return;
      }

      if (intentStatus !== 'succeeded') return;

      const order = await this.orderModel
        .findOne({
          _id: new Types.ObjectId(orderId),
          shopId: new Types.ObjectId(shopId),
        })
        .lean()
        .exec();
      if (!order) {
        this.logger.warn(
          `Stripe payment ${payment.stripePaymentIntentId} succeeded but order ${orderId} not found in shop ${shopId}`,
        );
        return;
      }

      const cashierId = order.cashierId || order.userId;
      if (!cashierId) {
        this.logger.warn(
          `Confirmed Stripe payment ${payment.stripePaymentIntentId} has no cashier attribution — order convergence requires manual reconciliation`,
        );
        return;
      }

      const amountMajor = fromMinorUnits(payment.amount, payment.currency);
      await this.paymentTransactionService.createTransaction({
        shopId,
        orderId,
        orderNumber: payment.metadata?.orderNumber || order.orderNumber,
        cashierId: cashierId.toString(),
        cashierName: order.cashierName || 'POS',
        branchId: order.branchId?.toString(),
        paymentMethod: 'stripe',
        amount: amountMajor,
        status: 'completed',
        customerName: payment.metadata?.customerName || order.customerName,
        stripePaymentIntentId: payment.stripePaymentIntentId,
        stripeChargeId: payment.stripeChargeId || latestCharge,
        cardLastFour: undefined,
      });
    } catch (error: any) {
      // Convergence failure must not fail webhook ack (Stripe retries); the
      // PaymentTransaction dedup makes the next delivery converge safely.
      this.logger.error(
        `Order convergence failed for Stripe payment ${payment.stripePaymentIntentId}: ${error?.message}`,
      );
    }
  }

  /**
   * Generate idempotency key for payment operations
   */
  private generateIdempotencyKey(
    shopId: string,
    identifier: string,
    type: string,
  ): string {
    return `${shopId}_${identifier}_${type}_${Date.now()}`;
  }

  /**
   * Map Stripe payment intent status to local status
   */
  private mapStripeStatus(
    stripeStatus: Stripe.PaymentIntent.Status,
  ): StripePaymentStatus {
    const statusMap: Record<string, StripePaymentStatus> = {
      requires_payment_method: StripePaymentStatus.REQUIRES_PAYMENT_METHOD,
      requires_confirmation: StripePaymentStatus.REQUIRES_CONFIRMATION,
      requires_action: StripePaymentStatus.REQUIRES_ACTION,
      processing: StripePaymentStatus.PROCESSING,
      requires_capture: StripePaymentStatus.REQUIRES_CAPTURE,
      canceled: StripePaymentStatus.CANCELED,
      succeeded: StripePaymentStatus.SUCCEEDED,
    };

    return statusMap[stripeStatus] || StripePaymentStatus.FAILED;
  }
}
