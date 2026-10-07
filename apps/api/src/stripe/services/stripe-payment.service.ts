import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
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
   * Create a payment intent for subscription/invoice payment
   *
   * ACID Properties:
   * - Atomicity: Payment intent and local record created together
   * - Consistency: Validates amount and customer before creating payment
   * - Isolation: Uses idempotency keys to prevent duplicate payments
   * - Durability: Saved to local DB with Stripe as source of truth
   */
  async createSubscriptionPayment(params: {
    shopId: string;
    invoiceId?: string; // Optional - may not exist for pending upgrades
    invoiceNumber: string;
    amount: number;
    currency?: string;
    customerEmail: string;
    description?: string;
  }): Promise<{
    paymentIntentId: string;
    clientSecret: string;
    amount: number;
    currency: string;
  }> {
    const currency = params.currency || 'kes';

    // Validate minimum amount
    const validation = this.stripeService.validateMinimumAmount(
      params.amount,
      currency,
    );
    if (!validation.valid) {
      throw new BadRequestException(validation.message);
    }

    // Check for existing payment intent for this invoice to ensure idempotency
    const existingPayment = await this.paymentModel.findOne({
      shopId: new Types.ObjectId(params.shopId),
      'metadata.invoiceNumber': params.invoiceNumber,
      status: {
        $in: [
          StripePaymentStatus.REQUIRES_PAYMENT_METHOD,
          StripePaymentStatus.REQUIRES_ACTION,
        ],
      },
    });

    if (existingPayment) {
      this.logger.log(
        `Returning existing payment intent ${existingPayment.stripePaymentIntentId} for invoice ${params.invoiceNumber}`,
      );
      return {
        paymentIntentId: existingPayment.stripePaymentIntentId,
        clientSecret: existingPayment.clientSecret!,
        amount: existingPayment.amount,
        currency: existingPayment.currency,
      };
    }

    // Get or create customer
    const customer = await this.customerService.getOrCreateCustomer({
      shopId: params.shopId,
      email: params.customerEmail,
    });

    // Check if invoiceId is a valid ObjectId (24 hex chars)
    const isValidObjectId =
      params.invoiceId && /^[a-fA-F0-9]{24}$/.test(params.invoiceId);

    // Generate idempotency key
    const idempotencyKey = this.generateIdempotencyKey(
      params.shopId,
      params.invoiceNumber,
      'subscription',
    );

    // Create payment intent with idempotency
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: params.amount,
      currency,
      customerId: customer.stripeCustomerId,
      description:
        params.description ||
        `Subscription Payment - Invoice ${params.invoiceNumber}`,
      receiptEmail: params.customerEmail,
      metadata: {
        shopId: params.shopId,
        invoiceId: params.invoiceId || '',
        invoiceNumber: params.invoiceNumber,
        type: StripePaymentType.SUBSCRIPTION,
        source: 'smartduka_subscription',
      },
      idempotencyKey,
    });

    // Save to local database
    const payment = new this.paymentModel({
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: customer.stripeCustomerId,
      shopId: new Types.ObjectId(params.shopId),
      ...(isValidObjectId && {
        invoiceId: new Types.ObjectId(params.invoiceId),
      }),
      paymentType: StripePaymentType.SUBSCRIPTION,
      amount: params.amount,
      currency,
      status: this.mapStripeStatus(paymentIntent.status),
      description: params.description,
      clientSecret: paymentIntent.client_secret,
      receiptEmail: params.customerEmail,
      metadata: {
        invoiceNumber: params.invoiceNumber,
        idempotencyKey,
      },
    });

    await payment.save();

    this.logger.log(
      `Created subscription payment intent ${paymentIntent.id} for invoice ${params.invoiceNumber} (shop: ${params.shopId})`,
    );

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
      amount: params.amount,
      currency,
    };
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
   * Get payment status from Stripe and sync
   */
  async syncPaymentStatus(
    paymentIntentId: string,
  ): Promise<StripePaymentDocument> {
    // Look up the local record first so we know which connected account (if any) to scope against.
    const existing = await this.paymentModel
      .findOne({ stripePaymentIntentId: paymentIntentId })
      .select('connectedAccountId')
      .lean();

    const paymentIntent = await this.stripeService.retrievePaymentIntent(
      paymentIntentId,
      existing?.connectedAccountId
        ? { stripeAccount: existing.connectedAccountId }
        : undefined,
    );

    const payment = await this.paymentModel.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntentId },
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
