import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { StripeService } from '../stripe.service';
import { StripeCustomerService } from './stripe-customer.service';
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
    @InjectModel(StripePayment.name)
    private readonly paymentModel: Model<StripePaymentDocument>,
  ) {}

  /**
   * Create a payment intent for POS sale
   * Returns client secret for frontend to complete payment
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
  }> {
    const currency = params.currency || 'kes';

    // Create payment intent
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: params.amount,
      currency,
      description: params.description || `POS Sale - Order ${params.orderNumber}`,
      receiptEmail: params.customerEmail,
      metadata: {
        shopId: params.shopId,
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        type: StripePaymentType.POS_SALE,
        source: 'smartduka_pos',
      },
    });

    // Save to local database
    const payment = new this.paymentModel({
      stripePaymentIntentId: paymentIntent.id,
      shopId: new Types.ObjectId(params.shopId),
      orderId: new Types.ObjectId(params.orderId),
      paymentType: StripePaymentType.POS_SALE,
      amount: params.amount,
      currency,
      status: this.mapStripeStatus(paymentIntent.status),
      description: params.description,
      clientSecret: paymentIntent.client_secret,
      metadata: {
        orderNumber: params.orderNumber,
        customerName: params.customerName || '',
      },
    });

    await payment.save();

    this.logger.log(`Created POS payment intent ${paymentIntent.id} for order ${params.orderNumber}`);

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
      amount: params.amount,
      currency,
    };
  }

  /**
   * Create a payment intent for subscription/invoice payment
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

    // Get or create customer
    const customer = await this.customerService.getOrCreateCustomer({
      shopId: params.shopId,
      email: params.customerEmail,
    });

    // Check if invoiceId is a valid ObjectId (24 hex chars)
    const isValidObjectId = params.invoiceId && /^[a-fA-F0-9]{24}$/.test(params.invoiceId);

    // Create payment intent
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: params.amount,
      currency,
      customerId: customer.stripeCustomerId,
      description: params.description || `Subscription Payment - Invoice ${params.invoiceNumber}`,
      receiptEmail: params.customerEmail,
      metadata: {
        shopId: params.shopId,
        invoiceId: params.invoiceId || '',
        invoiceNumber: params.invoiceNumber,
        type: StripePaymentType.SUBSCRIPTION,
        source: 'smartduka_subscription',
      },
    });

    // Save to local database
    const payment = new this.paymentModel({
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: customer.stripeCustomerId,
      shopId: new Types.ObjectId(params.shopId),
      ...(isValidObjectId && { invoiceId: new Types.ObjectId(params.invoiceId) }),
      paymentType: StripePaymentType.SUBSCRIPTION,
      amount: params.amount,
      currency,
      status: this.mapStripeStatus(paymentIntent.status),
      description: params.description,
      clientSecret: paymentIntent.client_secret,
      receiptEmail: params.customerEmail,
      metadata: {
        invoiceNumber: params.invoiceNumber,
      },
    });

    await payment.save();

    this.logger.log(`Created subscription payment intent ${paymentIntent.id} for invoice ${params.invoiceNumber}`);

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
  async getPaymentByIntentId(paymentIntentId: string): Promise<StripePaymentDocument | null> {
    return this.paymentModel.findOne({ stripePaymentIntentId: paymentIntentId });
  }

  /**
   * Get payment status from Stripe and sync
   */
  async syncPaymentStatus(paymentIntentId: string): Promise<StripePaymentDocument> {
    const paymentIntent = await this.stripeService.retrievePaymentIntent(paymentIntentId);

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

    return payment;
  }

  /**
   * Process refund for a payment
   */
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

    this.logger.log(`Refunded ${refundAmount} for payment ${params.paymentIntentId}`);

    return this.paymentModel.findOne({ stripePaymentIntentId: params.paymentIntentId }) as Promise<StripePaymentDocument>;
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
          await this.customerService.recordPayment(customer.stripeCustomerId, paymentIntent.amount);
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
      const pmId = typeof paymentIntent.payment_method === 'string'
        ? paymentIntent.payment_method
        : paymentIntent.payment_method.id;
      updateData.paymentMethodId = pmId;
    }

    await this.paymentModel.updateOne(
      { stripePaymentIntentId: paymentIntent.id },
      { $set: updateData },
    );

    this.logger.log(`Updated payment ${paymentIntent.id} status to ${paymentIntent.status}`);
  }

  /**
   * Map Stripe payment intent status to local status
   */
  private mapStripeStatus(stripeStatus: Stripe.PaymentIntent.Status): StripePaymentStatus {
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
