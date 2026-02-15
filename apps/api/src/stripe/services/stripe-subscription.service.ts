import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { StripeService } from '../stripe.service';
import { StripeCustomerService } from './stripe-customer.service';
import {
  StripeSubscription,
  StripeSubscriptionDocument,
  StripeSubscriptionStatus,
} from '../schemas/stripe-subscription.schema';

/**
 * Stripe Subscription Service
 * 
 * Manages Stripe subscriptions for SmartDuka plans.
 * Syncs with local subscription system for seamless billing.
 */
@Injectable()
export class StripeSubscriptionService {
  private readonly logger = new Logger(StripeSubscriptionService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly customerService: StripeCustomerService,
    @InjectModel(StripeSubscription.name)
    private readonly subscriptionModel: Model<StripeSubscriptionDocument>,
  ) {}

  /**
   * Create a Stripe subscription for a shop
   */
  async createSubscription(params: {
    shopId: string;
    email: string;
    priceId: string;
    planCode: string;
    trialDays?: number;
    metadata?: Record<string, string>;
  }): Promise<{
    subscriptionId: string;
    clientSecret?: string;
    status: string;
  }> {
    // Get or create customer
    const customer = await this.customerService.getOrCreateCustomer({
      shopId: params.shopId,
      email: params.email,
    });

    const stripe = this.stripeService.getClient();

    // Create subscription
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customer.stripeCustomerId,
      items: [{ price: params.priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        shopId: params.shopId,
        planCode: params.planCode,
        source: 'smartduka',
        ...params.metadata,
      },
    };

    if (params.trialDays && params.trialDays > 0) {
      subscriptionParams.trial_period_days = params.trialDays;
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

    // Extract client secret for payment
    let clientSecret: string | undefined;
    if (subscription.latest_invoice && typeof subscription.latest_invoice !== 'string') {
      const invoice = subscription.latest_invoice as any;
      if (invoice.payment_intent && typeof invoice.payment_intent !== 'string') {
        clientSecret = invoice.payment_intent.client_secret || undefined;
      }
    }

    // Save to local database
    const subData = subscription as any;
    const localSubscription = new this.subscriptionModel({
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customer.stripeCustomerId,
      stripePriceId: params.priceId,
      shopId: new Types.ObjectId(params.shopId),
      status: this.mapStripeStatus(subscription.status),
      planCode: params.planCode,
      currentPeriodStart: new Date(subData.current_period_start * 1000),
      currentPeriodEnd: new Date(subData.current_period_end * 1000),
      amount: subscription.items.data[0]?.price?.unit_amount || 0,
      currency: subscription.currency,
      interval: subscription.items.data[0]?.price?.recurring?.interval || 'month',
      intervalCount: subscription.items.data[0]?.price?.recurring?.interval_count || 1,
      trialStart: subData.trial_start ? new Date(subData.trial_start * 1000) : undefined,
      trialEnd: subData.trial_end ? new Date(subData.trial_end * 1000) : undefined,
      metadata: params.metadata || {},
      items: subscription.items.data.map((item) => ({
        priceId: item.price.id,
        productId: typeof item.price.product === 'string' ? item.price.product : item.price.product.id,
        quantity: item.quantity || 1,
      })),
    });

    await localSubscription.save();

    this.logger.log(`Created Stripe subscription ${subscription.id} for shop ${params.shopId}`);

    return {
      subscriptionId: subscription.id,
      clientSecret,
      status: subscription.status,
    };
  }

  /**
   * Get subscription by shop ID
   */
  async getSubscriptionByShopId(shopId: string): Promise<StripeSubscriptionDocument | null> {
    return this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
      status: { $nin: [StripeSubscriptionStatus.CANCELED, StripeSubscriptionStatus.INCOMPLETE_EXPIRED] },
    });
  }

  /**
   * Get subscription by Stripe subscription ID
   */
  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<StripeSubscriptionDocument | null> {
    return this.subscriptionModel.findOne({ stripeSubscriptionId });
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    stripeSubscriptionId: string,
    cancelAtPeriodEnd = true,
  ): Promise<StripeSubscriptionDocument> {
    const stripe = this.stripeService.getClient();

    let subscription: Stripe.Subscription;

    if (cancelAtPeriodEnd) {
      subscription = await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      subscription = await stripe.subscriptions.cancel(stripeSubscriptionId);
    }

    const localSubscription = await this.subscriptionModel.findOneAndUpdate(
      { stripeSubscriptionId },
      {
        $set: {
          status: this.mapStripeStatus(subscription.status),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : undefined,
          canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
        },
      },
      { new: true },
    );

    if (!localSubscription) {
      throw new NotFoundException('Subscription not found');
    }

    this.logger.log(`Canceled subscription ${stripeSubscriptionId}`);

    return localSubscription;
  }

  /**
   * Resume a canceled subscription (if cancel_at_period_end was true)
   */
  async resumeSubscription(stripeSubscriptionId: string): Promise<StripeSubscriptionDocument> {
    const stripe = this.stripeService.getClient();

    const subscription = await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    const localSubscription = await this.subscriptionModel.findOneAndUpdate(
      { stripeSubscriptionId },
      {
        $set: {
          status: this.mapStripeStatus(subscription.status),
          cancelAtPeriodEnd: false,
          cancelAt: undefined,
        },
      },
      { new: true },
    );

    if (!localSubscription) {
      throw new NotFoundException('Subscription not found');
    }

    this.logger.log(`Resumed subscription ${stripeSubscriptionId}`);

    return localSubscription;
  }

  /**
   * Update subscription plan (upgrade/downgrade)
   */
  async updateSubscriptionPlan(
    stripeSubscriptionId: string,
    newPriceId: string,
    newPlanCode: string,
  ): Promise<StripeSubscriptionDocument> {
    const stripe = this.stripeService.getClient();

    // Get current subscription
    const currentSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    if (!currentSub.items.data[0]) {
      throw new BadRequestException('Subscription has no items');
    }

    // Update subscription with new price
    const subscription = await stripe.subscriptions.update(stripeSubscriptionId, {
      items: [
        {
          id: currentSub.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
      metadata: {
        ...currentSub.metadata,
        planCode: newPlanCode,
      },
    });

    const localSubscription = await this.subscriptionModel.findOneAndUpdate(
      { stripeSubscriptionId },
      {
        $set: {
          stripePriceId: newPriceId,
          planCode: newPlanCode,
          amount: subscription.items.data[0]?.price?.unit_amount || 0,
          items: subscription.items.data.map((item) => ({
            priceId: item.price.id,
            productId: typeof item.price.product === 'string' ? item.price.product : item.price.product.id,
            quantity: item.quantity || 1,
          })),
        },
      },
      { new: true },
    );

    if (!localSubscription) {
      throw new NotFoundException('Subscription not found');
    }

    this.logger.log(`Updated subscription ${stripeSubscriptionId} to plan ${newPlanCode}`);

    return localSubscription;
  }

  /**
   * Handle subscription webhook events
   */
  async handleSubscriptionEvent(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;

    const updateData: any = {
      status: this.mapStripeStatus(subscription.status),
      currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      latestInvoiceId: typeof subscription.latest_invoice === 'string'
        ? subscription.latest_invoice
        : subscription.latest_invoice?.id,
    };

    if (subscription.cancel_at) {
      updateData.cancelAt = new Date(subscription.cancel_at * 1000);
    }

    if (subscription.canceled_at) {
      updateData.canceledAt = new Date(subscription.canceled_at * 1000);
    }

    if (subscription.default_payment_method) {
      updateData.defaultPaymentMethodId = typeof subscription.default_payment_method === 'string'
        ? subscription.default_payment_method
        : subscription.default_payment_method.id;
    }

    await this.subscriptionModel.updateOne(
      { stripeSubscriptionId: subscription.id },
      { $set: updateData },
    );

    this.logger.log(`Updated subscription ${subscription.id} from webhook event ${event.type}`);
  }

  /**
   * Get all active subscriptions for analytics
   */
  async getActiveSubscriptions(): Promise<StripeSubscriptionDocument[]> {
    return this.subscriptionModel.find({
      status: { $in: [StripeSubscriptionStatus.ACTIVE, StripeSubscriptionStatus.TRIALING] },
    });
  }

  /**
   * Map Stripe subscription status to local status
   */
  private mapStripeStatus(stripeStatus: Stripe.Subscription.Status): StripeSubscriptionStatus {
    const statusMap: Record<string, StripeSubscriptionStatus> = {
      incomplete: StripeSubscriptionStatus.INCOMPLETE,
      incomplete_expired: StripeSubscriptionStatus.INCOMPLETE_EXPIRED,
      trialing: StripeSubscriptionStatus.TRIALING,
      active: StripeSubscriptionStatus.ACTIVE,
      past_due: StripeSubscriptionStatus.PAST_DUE,
      canceled: StripeSubscriptionStatus.CANCELED,
      unpaid: StripeSubscriptionStatus.UNPAID,
      paused: StripeSubscriptionStatus.PAUSED,
    };

    return statusMap[stripeStatus] || StripeSubscriptionStatus.INCOMPLETE;
  }
}
