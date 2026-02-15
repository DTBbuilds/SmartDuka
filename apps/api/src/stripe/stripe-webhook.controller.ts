import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import { StripeService } from './stripe.service';
import { StripePaymentService } from './services/stripe-payment.service';
import { StripeSubscriptionService } from './services/stripe-subscription.service';
import { StripeCustomerService } from './services/stripe-customer.service';
import { StripeWebhookEvent, StripeWebhookEventDocument } from './schemas/stripe-webhook-event.schema';

/**
 * Stripe Webhook Controller
 * 
 * Handles all Stripe webhook events for real-time payment updates.
 * Ensures idempotent processing and proper database sync.
 */
@ApiTags('Stripe Webhooks')
@Controller('stripe/webhook')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly paymentService: StripePaymentService,
    private readonly subscriptionService: StripeSubscriptionService,
    private readonly customerService: StripeCustomerService,
    @Inject('STRIPE_WEBHOOK_SECRET') private readonly webhookSecret: string,
    @InjectModel(StripeWebhookEvent.name)
    private readonly webhookEventModel: Model<StripeWebhookEventDocument>,
  ) {}

  /**
   * Handle Stripe webhook events
   * 
   * This endpoint receives all Stripe webhook events and routes them
   * to appropriate handlers. It ensures idempotent processing by
   * storing event IDs and checking for duplicates.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    if (!this.stripeService.isStripeConfigured()) {
      this.logger.warn('Stripe webhook received but Stripe is not configured');
      return { received: true };
    }

    if (!signature || !this.webhookSecret) {
      this.logger.error('Missing webhook signature or secret');
      return { received: true };
    }

    let event: Stripe.Event;

    try {
      const rawBody = request.rawBody;
      if (!rawBody) {
        this.logger.error('No raw body available for webhook verification');
        return { received: true };
      }

      event = this.stripeService.constructWebhookEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      return { received: true };
    }

    // Check for duplicate event (idempotency)
    const existingEvent = await this.webhookEventModel.findOne({
      stripeEventId: event.id,
    });

    if (existingEvent?.processed) {
      this.logger.log(`Duplicate event ${event.id} already processed, skipping`);
      return { received: true };
    }

    // Store event for tracking
    if (!existingEvent) {
      await this.webhookEventModel.create({
        stripeEventId: event.id,
        type: event.type,
        apiVersion: event.api_version || 'unknown',
        data: event.data,
        processed: false,
      });
    }

    try {
      await this.processEvent(event);

      // Mark as processed
      await this.webhookEventModel.updateOne(
        { stripeEventId: event.id },
        {
          $set: {
            processed: true,
            processedAt: new Date(),
          },
        },
      );

      this.logger.log(`Successfully processed webhook event: ${event.type} (${event.id})`);
    } catch (err: any) {
      this.logger.error(`Error processing webhook event ${event.id}: ${err.message}`);

      // Store error for retry
      await this.webhookEventModel.updateOne(
        { stripeEventId: event.id },
        {
          $set: { error: err.message },
          $inc: { retryCount: 1 },
        },
      );
    }

    return { received: true };
  }

  /**
   * Process webhook event based on type
   */
  private async processEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      // Payment Intent events
      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled':
      case 'payment_intent.processing':
      case 'payment_intent.requires_action':
        await this.paymentService.handlePaymentIntentEvent(event);
        break;

      // Subscription events
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed':
      case 'customer.subscription.trial_will_end':
        await this.subscriptionService.handleSubscriptionEvent(event);
        break;

      // Customer events
      case 'customer.updated':
        await this.handleCustomerUpdated(event);
        break;

      // Invoice events (for subscription billing)
      case 'invoice.paid':
        await this.handleInvoicePaid(event);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event);
        break;

      // Charge events (for receipt URLs)
      case 'charge.succeeded':
        await this.handleChargeSucceeded(event);
        break;

      case 'charge.refunded':
        await this.handleChargeRefunded(event);
        break;

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Handle customer updated event
   */
  private async handleCustomerUpdated(event: Stripe.Event): Promise<void> {
    const customer = event.data.object as Stripe.Customer;
    await this.customerService.syncFromStripe(customer);
    this.logger.log(`Synced customer ${customer.id} from webhook`);
  }

  /**
   * Handle invoice paid event
   */
  private async handleInvoicePaid(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;

    this.logger.log(`Invoice ${invoice.id} paid for subscription ${(invoice as any).subscription}`);

    // The subscription service will handle updating the subscription status
    // when it receives the subscription.updated event
  }

  /**
   * Handle invoice payment failed event
   */
  private async handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;

    this.logger.warn(
      `Invoice ${invoice.id} payment failed for subscription ${(invoice as any).subscription}`,
    );

    // TODO: Send notification to shop owner about failed payment
  }

  /**
   * Handle charge succeeded event (for receipt URLs)
   */
  private async handleChargeSucceeded(event: Stripe.Event): Promise<void> {
    const charge = event.data.object as Stripe.Charge;

    if (charge.payment_intent) {
      const paymentIntentId = typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent.id;

      // Update payment with receipt URL
      // This is handled in the payment service when syncing status
      this.logger.log(`Charge ${charge.id} succeeded for payment intent ${paymentIntentId}`);
    }
  }

  /**
   * Handle charge refunded event
   */
  private async handleChargeRefunded(event: Stripe.Event): Promise<void> {
    const charge = event.data.object as Stripe.Charge;

    this.logger.log(`Charge ${charge.id} refunded: ${charge.amount_refunded}`);

    // Refunds are handled through the refund API, this is just for logging
  }
}
