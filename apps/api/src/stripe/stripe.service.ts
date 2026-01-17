import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

/**
 * Core Stripe Service
 * 
 * Provides the main Stripe client instance and core functionality.
 * Supports both Stripe (international) and can work alongside
 * M-Pesa for Kenyan local payments.
 * 
 * Mobile-first design considerations:
 * - Payment Links for easy mobile checkout
 * - Payment Intents for flexible payment flows
 * - Webhook handling for async payment confirmation
 */
@Injectable()
export class StripeService implements OnModuleInit {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);
  private isConfigured = false;

  constructor(
    @Inject('STRIPE_API_KEY') private readonly apiKey: string,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    if (this.apiKey) {
      this.stripe = new Stripe(this.apiKey, {
        apiVersion: '2025-11-17.clover',
        typescript: true,
      });
      this.isConfigured = true;
      this.logger.log('✅ Stripe service initialized successfully');
    } else {
      this.logger.warn('⚠️ Stripe API key not configured. Stripe payments will be disabled.');
    }
  }

  /**
   * Check if Stripe is properly configured
   */
  isStripeConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Get the Stripe client instance
   */
  getClient(): Stripe {
    if (!this.isConfigured) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }
    return this.stripe;
  }

  /**
   * Get Stripe publishable key for frontend
   */
  getPublishableKey(): string {
    return this.configService.get<string>('STRIPE_PUBLISHABLE_KEY', '');
  }

  /**
   * Minimum amounts for Stripe payments by currency (in smallest unit)
   * Stripe requires minimum amounts to cover processing fees
   */
  private readonly MINIMUM_AMOUNTS: Record<string, number> = {
    usd: 50,   // $0.50
    gbp: 30,   // £0.30
    eur: 50,   // €0.50
    kes: 5000, // KSh 50.00 (conservative estimate based on GBP conversion)
    default: 50,
  };

  /**
   * Validate payment amount meets Stripe minimums
   */
  validateMinimumAmount(amount: number, currency: string): { valid: boolean; minimum: number; message?: string } {
    const currencyLower = currency.toLowerCase();
    const minimum = this.MINIMUM_AMOUNTS[currencyLower] || this.MINIMUM_AMOUNTS.default;
    
    if (amount < minimum) {
      const formatted = this.formatAmount(minimum, currencyLower);
      return {
        valid: false,
        minimum,
        message: `Amount too small for card payment. Minimum is ${formatted}. Please use cash or M-Pesa for smaller amounts.`,
      };
    }
    
    return { valid: true, minimum };
  }

  /**
   * Format amount for display
   */
  private formatAmount(amount: number, currency: string): string {
    const divisor = currency === 'kes' ? 100 : 100;
    const symbols: Record<string, string> = { usd: '$', gbp: '£', eur: '€', kes: 'KSh ' };
    const symbol = symbols[currency] || '';
    return `${symbol}${(amount / divisor).toFixed(2)}`;
  }

  /**
   * Create a Payment Intent for one-time payments
   * Mobile-friendly with automatic payment method detection
   * Includes idempotency key support for safe retries
   */
  async createPaymentIntent(params: {
    amount: number; // Amount in smallest currency unit (cents for USD, cents for KES)
    currency: string;
    customerId?: string;
    metadata?: Record<string, string>;
    description?: string;
    receiptEmail?: string;
    paymentMethodTypes?: string[];
    idempotencyKey?: string; // Optional idempotency key for safe retries
  }): Promise<Stripe.PaymentIntent> {
    const stripe = this.getClient();
    const currencyLower = params.currency.toLowerCase();

    // Validate minimum amount
    const validation = this.validateMinimumAmount(params.amount, currencyLower);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: params.amount,
      currency: currencyLower,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: params.metadata || {},
      description: params.description,
      receipt_email: params.receiptEmail,
    };

    if (params.customerId) {
      paymentIntentParams.customer = params.customerId;
    }

    if (params.paymentMethodTypes && params.paymentMethodTypes.length > 0) {
      paymentIntentParams.automatic_payment_methods = undefined;
      (paymentIntentParams as any).payment_method_types = params.paymentMethodTypes;
    }

    // Use idempotency key if provided for safe retries
    const options: Stripe.RequestOptions = {};
    if (params.idempotencyKey) {
      options.idempotencyKey = params.idempotencyKey;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams, options);

    this.logger.log(`PaymentIntent created: ${paymentIntent.id} for ${params.amount} ${currencyLower}`);

    return paymentIntent;
  }

  /**
   * Retrieve a Payment Intent
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    const stripe = this.getClient();
    return stripe.paymentIntents.retrieve(paymentIntentId);
  }

  /**
   * Confirm a Payment Intent
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string,
  ): Promise<Stripe.PaymentIntent> {
    const stripe = this.getClient();
    
    const params: Stripe.PaymentIntentConfirmParams = {};
    if (paymentMethodId) {
      params.payment_method = paymentMethodId;
    }

    return stripe.paymentIntents.confirm(paymentIntentId, params);
  }

  /**
   * Cancel a Payment Intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    const stripe = this.getClient();
    return stripe.paymentIntents.cancel(paymentIntentId);
  }

  /**
   * Create a Checkout Session for hosted payment page
   * Great for mobile - redirects to Stripe's optimized checkout
   */
  async createCheckoutSession(params: {
    lineItems: Array<{
      name: string;
      description?: string;
      amount: number;
      quantity: number;
    }>;
    currency: string;
    successUrl: string;
    cancelUrl: string;
    customerId?: string;
    customerEmail?: string;
    metadata?: Record<string, string>;
    mode?: 'payment' | 'subscription' | 'setup';
  }): Promise<Stripe.Checkout.Session> {
    const stripe = this.getClient();

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: params.mode || 'payment',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      line_items: params.lineItems.map((item) => ({
        price_data: {
          currency: params.currency.toLowerCase(),
          product_data: {
            name: item.name,
            description: item.description,
          },
          unit_amount: item.amount,
        },
        quantity: item.quantity,
      })),
      metadata: params.metadata || {},
    };

    if (params.customerId) {
      sessionParams.customer = params.customerId;
    } else if (params.customerEmail) {
      sessionParams.customer_email = params.customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    this.logger.log(`Checkout session created: ${session.id}`);

    return session;
  }

  /**
   * Create a Payment Link for easy sharing
   * Perfect for mobile - shareable via SMS, WhatsApp, etc.
   */
  async createPaymentLink(params: {
    priceId?: string;
    productName?: string;
    amount?: number;
    currency?: string;
    quantity?: number;
    metadata?: Record<string, string>;
  }): Promise<Stripe.PaymentLink> {
    const stripe = this.getClient();

    let lineItems: Stripe.PaymentLinkCreateParams.LineItem[];

    if (params.priceId) {
      lineItems = [{ price: params.priceId, quantity: params.quantity || 1 }];
    } else if (params.productName && params.amount && params.currency) {
      // Create a one-time price
      const price = await stripe.prices.create({
        currency: params.currency.toLowerCase(),
        unit_amount: params.amount,
        product_data: {
          name: params.productName,
        },
      });
      lineItems = [{ price: price.id, quantity: params.quantity || 1 }];
    } else {
      throw new Error('Either priceId or (productName, amount, currency) must be provided');
    }

    const paymentLink = await stripe.paymentLinks.create({
      line_items: lineItems,
      metadata: params.metadata || {},
    });

    this.logger.log(`Payment link created: ${paymentLink.url}`);

    return paymentLink;
  }

  /**
   * Process refund for a payment
   */
  async createRefund(params: {
    paymentIntentId?: string;
    chargeId?: string;
    amount?: number;
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    metadata?: Record<string, string>;
  }): Promise<Stripe.Refund> {
    const stripe = this.getClient();

    const refundParams: Stripe.RefundCreateParams = {
      metadata: params.metadata || {},
    };

    if (params.paymentIntentId) {
      refundParams.payment_intent = params.paymentIntentId;
    } else if (params.chargeId) {
      refundParams.charge = params.chargeId;
    } else {
      throw new Error('Either paymentIntentId or chargeId must be provided');
    }

    if (params.amount) {
      refundParams.amount = params.amount;
    }

    if (params.reason) {
      refundParams.reason = params.reason;
    }

    const refund = await stripe.refunds.create(refundParams);

    this.logger.log(`Refund created: ${refund.id}`);

    return refund;
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<Stripe.Balance> {
    const stripe = this.getClient();
    return stripe.balance.retrieve();
  }

  /**
   * List balance transactions for analytics
   */
  async listBalanceTransactions(params?: {
    limit?: number;
    startingAfter?: string;
    created?: { gte?: number; lte?: number };
  }): Promise<Stripe.ApiList<Stripe.BalanceTransaction>> {
    const stripe = this.getClient();
    return stripe.balanceTransactions.list({
      limit: params?.limit || 100,
      starting_after: params?.startingAfter,
      created: params?.created,
    });
  }

  /**
   * Construct webhook event from payload
   */
  constructWebhookEvent(
    payload: Buffer | string,
    signature: string,
    webhookSecret: string,
  ): Stripe.Event {
    const stripe = this.getClient();
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
