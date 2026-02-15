import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { StripeService } from '../stripe.service';
import { StripeCustomer, StripeCustomerDocument } from '../schemas/stripe-customer.schema';

/**
 * Stripe Customer Service
 * 
 * Manages Stripe customers and syncs with local database.
 * Supports both shop-level and user-level customers.
 */
@Injectable()
export class StripeCustomerService {
  private readonly logger = new Logger(StripeCustomerService.name);

  constructor(
    private readonly stripeService: StripeService,
    @InjectModel(StripeCustomer.name)
    private readonly customerModel: Model<StripeCustomerDocument>,
  ) {}

  /**
   * Create or retrieve a Stripe customer for a shop
   */
  async getOrCreateCustomer(params: {
    shopId: string;
    email: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, string>;
  }): Promise<StripeCustomerDocument> {
    // Check if customer already exists locally
    const existingCustomer = await this.customerModel.findOne({
      shopId: new Types.ObjectId(params.shopId),
    });

    if (existingCustomer) {
      return existingCustomer;
    }

    // Create customer in Stripe
    const stripe = this.stripeService.getClient();
    const stripeCustomer = await stripe.customers.create({
      email: params.email,
      name: params.name,
      phone: params.phone,
      metadata: {
        shopId: params.shopId,
        source: 'smartduka',
        ...params.metadata,
      },
    });

    // Save to local database
    const customer = new this.customerModel({
      stripeCustomerId: stripeCustomer.id,
      shopId: new Types.ObjectId(params.shopId),
      email: params.email,
      name: params.name,
      phone: params.phone,
      metadata: params.metadata || {},
      isActive: true,
    });

    await customer.save();

    this.logger.log(`Created Stripe customer ${stripeCustomer.id} for shop ${params.shopId}`);

    return customer;
  }

  /**
   * Get customer by shop ID
   */
  async getCustomerByShopId(shopId: string): Promise<StripeCustomerDocument | null> {
    return this.customerModel.findOne({
      shopId: new Types.ObjectId(shopId),
      isActive: true,
    });
  }

  /**
   * Get customer by Stripe customer ID
   */
  async getCustomerByStripeId(stripeCustomerId: string): Promise<StripeCustomerDocument | null> {
    return this.customerModel.findOne({ stripeCustomerId });
  }

  /**
   * Update customer details
   */
  async updateCustomer(
    stripeCustomerId: string,
    updates: {
      email?: string;
      name?: string;
      phone?: string;
      defaultPaymentMethodId?: string;
      metadata?: Record<string, string>;
    },
  ): Promise<StripeCustomerDocument> {
    const stripe = this.stripeService.getClient();

    // Update in Stripe
    const stripeUpdates: Stripe.CustomerUpdateParams = {};
    if (updates.email) stripeUpdates.email = updates.email;
    if (updates.name) stripeUpdates.name = updates.name;
    if (updates.phone) stripeUpdates.phone = updates.phone;
    if (updates.defaultPaymentMethodId) {
      stripeUpdates.invoice_settings = {
        default_payment_method: updates.defaultPaymentMethodId,
      };
    }
    if (updates.metadata) stripeUpdates.metadata = updates.metadata;

    await stripe.customers.update(stripeCustomerId, stripeUpdates);

    // Update local record
    const customer = await this.customerModel.findOneAndUpdate(
      { stripeCustomerId },
      { $set: updates },
      { new: true },
    );

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  /**
   * Attach a payment method to customer
   */
  async attachPaymentMethod(
    stripeCustomerId: string,
    paymentMethodId: string,
    setAsDefault = false,
  ): Promise<void> {
    const stripe = this.stripeService.getClient();

    // Attach payment method
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId,
    });

    // Set as default if requested
    if (setAsDefault) {
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      await this.customerModel.updateOne(
        { stripeCustomerId },
        { $set: { defaultPaymentMethodId: paymentMethodId } },
      );
    }

    this.logger.log(`Attached payment method ${paymentMethodId} to customer ${stripeCustomerId}`);
  }

  /**
   * List payment methods for a customer
   */
  async listPaymentMethods(
    stripeCustomerId: string,
    type: 'card' | 'us_bank_account' = 'card',
  ): Promise<Stripe.PaymentMethod[]> {
    const stripe = this.stripeService.getClient();

    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: type as Stripe.PaymentMethodListParams.Type,
    });

    return paymentMethods.data;
  }

  /**
   * Detach a payment method from customer
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    const stripe = this.stripeService.getClient();
    await stripe.paymentMethods.detach(paymentMethodId);
    this.logger.log(`Detached payment method ${paymentMethodId}`);
  }

  /**
   * Create a setup intent for saving payment methods
   */
  async createSetupIntent(stripeCustomerId: string): Promise<Stripe.SetupIntent> {
    const stripe = this.stripeService.getClient();

    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return setupIntent;
  }

  /**
   * Update customer payment statistics
   */
  async recordPayment(stripeCustomerId: string, amount: number): Promise<void> {
    await this.customerModel.updateOne(
      { stripeCustomerId },
      {
        $set: { lastPaymentAt: new Date() },
        $inc: { totalSpent: amount, paymentCount: 1 },
      },
    );
  }

  /**
   * Sync customer from Stripe webhook
   */
  async syncFromStripe(stripeCustomer: Stripe.Customer): Promise<void> {
    await this.customerModel.updateOne(
      { stripeCustomerId: stripeCustomer.id },
      {
        $set: {
          email: stripeCustomer.email || '',
          name: stripeCustomer.name || '',
          phone: stripeCustomer.phone || '',
          delinquent: stripeCustomer.delinquent,
          defaultPaymentMethodId:
            typeof stripeCustomer.invoice_settings?.default_payment_method === 'string'
              ? stripeCustomer.invoice_settings.default_payment_method
              : stripeCustomer.invoice_settings?.default_payment_method?.id,
        },
      },
      { upsert: false },
    );
  }
}
