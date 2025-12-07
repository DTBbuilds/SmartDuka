import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Subscription, SubscriptionDocument, SubscriptionStatus, BillingCycle } from './schemas/subscription.schema';
import { SubscriptionPlan, SubscriptionPlanDocument } from './schemas/subscription-plan.schema';
import { SubscriptionInvoice, SubscriptionInvoiceDocument, InvoiceStatus, InvoiceType } from './schemas/subscription-invoice.schema';
import { Shop, ShopDocument } from '../shops/schemas/shop.schema';
import {
  CreateSubscriptionDto,
  ChangePlanDto,
  CancelSubscriptionDto,
  SubscriptionResponseDto,
  SubscriptionPlanResponseDto,
  InvoiceResponseDto,
} from './dto/subscription.dto';

// Grace period in days before suspension
const GRACE_PERIOD_DAYS = 7;

// Trial period in days
const TRIAL_PERIOD_DAYS = 14;

// VAT rate in Kenya
const VAT_RATE = 0.16;

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(SubscriptionPlan.name)
    private readonly planModel: Model<SubscriptionPlanDocument>,
    @InjectModel(SubscriptionInvoice.name)
    private readonly invoiceModel: Model<SubscriptionInvoiceDocument>,
    @InjectModel(Shop.name)
    private readonly shopModel: Model<ShopDocument>,
    private readonly configService: ConfigService,
  ) {}

  // ============================================
  // PLAN MANAGEMENT
  // ============================================

  /**
   * Get all available subscription plans
   */
  async getPlans(): Promise<SubscriptionPlanResponseDto[]> {
    const plans = await this.planModel
      .find({ status: 'active' })
      .sort({ displayOrder: 1 })
      .exec();

    return plans.map(plan => this.mapPlanToResponse(plan));
  }

  /**
   * Get a specific plan by code
   */
  async getPlanByCode(code: string): Promise<SubscriptionPlanResponseDto> {
    const plan = await this.planModel.findOne({ code, status: 'active' });
    if (!plan) {
      throw new NotFoundException(`Plan '${code}' not found`);
    }
    return this.mapPlanToResponse(plan);
  }

  /**
   * Seed default subscription plans (run once on startup)
   */
  async seedPlans(): Promise<void> {
    const existingPlans = await this.planModel.countDocuments();
    if (existingPlans > 0) {
      this.logger.log('Subscription plans already exist, skipping seed');
      return;
    }

    // Setup fee: KES 3,000 (optional) - includes 1 month training & support
    const SETUP_FEE = 3000;
    const SETUP_FREE_MONTHS = 1;

    const plans = [
      {
        code: 'starter',
        name: 'Starter',
        description: 'Perfect for small shops just getting started',
        monthlyPrice: 1000,
        annualPrice: 10000, // ~17% discount
        setupPrice: SETUP_FEE,
        maxShops: 1,
        maxEmployees: 2,
        maxProducts: 500,
        features: [
          'POS System',
          'Inventory Management',
          'Sales Reports',
          'M-Pesa Integration',
          'Email Support',
          'Mobile App Access',
        ],
        setupIncludes: {
          siteSurvey: false,
          stocktake: false,
          setup: true,
          training: true,
          support: true,
          freeMonths: SETUP_FREE_MONTHS,
          optional: true,
        },
        displayOrder: 1,
        colorTheme: 'blue',
      },
      {
        code: 'basic',
        name: 'Basic',
        description: 'Great for growing businesses with multiple locations',
        monthlyPrice: 1500,
        annualPrice: 15000, // ~17% discount
        setupPrice: SETUP_FEE,
        maxShops: 2,
        maxEmployees: 5,
        maxProducts: 1000,
        features: [
          'Everything in Starter',
          'Multi-Branch Support',
          'Advanced Reports',
          'Customer Management',
          'Loyalty Programs',
          'Priority Support',
        ],
        setupIncludes: {
          siteSurvey: false,
          stocktake: false,
          setup: true,
          training: true,
          support: true,
          freeMonths: SETUP_FREE_MONTHS,
          optional: true,
        },
        displayOrder: 2,
        badge: 'Popular',
        colorTheme: 'green',
      },
      {
        code: 'silver',
        name: 'Silver',
        description: 'For established businesses with multiple outlets',
        monthlyPrice: 2500,
        annualPrice: 25000, // ~17% discount
        setupPrice: SETUP_FEE,
        maxShops: 5,
        maxEmployees: 15,
        maxProducts: 2000,
        features: [
          'Everything in Basic',
          'Stock Transfer',
          'Purchase Orders',
          'Supplier Management',
          'Advanced Analytics',
          'API Access',
          'Phone Support',
        ],
        setupIncludes: {
          siteSurvey: false,
          stocktake: false,
          setup: true,
          training: true,
          support: true,
          freeMonths: SETUP_FREE_MONTHS,
          optional: true,
        },
        displayOrder: 3,
        colorTheme: 'purple',
      },
      {
        code: 'gold',
        name: 'Gold',
        description: 'Enterprise solution for large retail chains',
        monthlyPrice: 4500,
        annualPrice: 45000, // ~17% discount
        setupPrice: SETUP_FEE,
        maxShops: 10,
        maxEmployees: 25,
        maxProducts: 4000,
        features: [
          'Everything in Silver',
          'Unlimited Branches',
          'Custom Integrations',
          'Dedicated Account Manager',
          'Custom Reports',
          'White-label Options',
          '24/7 Support',
          'On-site Training',
        ],
        setupIncludes: {
          siteSurvey: false,
          stocktake: false,
          setup: true,
          training: true,
          support: true,
          freeMonths: SETUP_FREE_MONTHS,
          optional: true,
        },
        displayOrder: 4,
        badge: 'Best Value',
        colorTheme: 'gold',
      },
    ];

    await this.planModel.insertMany(plans);
    this.logger.log('Subscription plans seeded successfully');
  }

  /**
   * Update all subscription plans with new setup pricing
   * Setup fee: KES 3,000 (optional) - includes 1 month training & support
   */
  async updatePlansSetupPricing(): Promise<{ updated: number; message: string }> {
    const SETUP_FEE = 3000;
    const SETUP_FREE_MONTHS = 1;

    const result = await this.planModel.updateMany(
      {},
      {
        $set: {
          setupPrice: SETUP_FEE,
          'setupIncludes.siteSurvey': false,
          'setupIncludes.stocktake': false,
          'setupIncludes.setup': true,
          'setupIncludes.training': true,
          'setupIncludes.support': true,
          'setupIncludes.freeMonths': SETUP_FREE_MONTHS,
          'setupIncludes.optional': true,
        },
      },
    );

    this.logger.log(`Updated ${result.modifiedCount} subscription plans with new setup pricing`);
    
    return {
      updated: result.modifiedCount,
      message: `Updated ${result.modifiedCount} plans: Setup fee KES ${SETUP_FEE}, includes ${SETUP_FREE_MONTHS} month training & support (optional)`,
    };
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================

  /**
   * Get subscription for a shop
   */
  async getSubscription(shopId: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const plan = await this.planModel.findById(subscription.planId);
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    return this.mapSubscriptionToResponse(subscription, plan);
  }

  /**
   * Create a new subscription for a shop
   */
  async createSubscription(
    shopId: string,
    dto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    // Check if shop already has a subscription
    const existing = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    if (existing) {
      throw new ConflictException('Shop already has a subscription');
    }

    // Get the plan
    const plan = await this.planModel.findOne({ code: dto.planCode, status: 'active' });
    if (!plan) {
      throw new NotFoundException(`Plan '${dto.planCode}' not found`);
    }

    const now = new Date();
    const billingCycle = dto.billingCycle || BillingCycle.MONTHLY;
    const price = billingCycle === BillingCycle.ANNUAL ? plan.annualPrice : plan.monthlyPrice;

    // Calculate period end based on billing cycle
    const periodEnd = new Date(now);
    if (billingCycle === BillingCycle.ANNUAL) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Create subscription
    // - If setup fee required: starts as PENDING_PAYMENT
    // - If free trial available: starts as TRIAL
    // - Otherwise: starts as ACTIVE (free plan)
    const freeMonths = plan.setupIncludes?.freeMonths || 0;
    const hasSetupFee = plan.setupPrice > 0;
    const trialEndDate = new Date(now);
    trialEndDate.setMonth(trialEndDate.getMonth() + freeMonths);

    // Determine initial status
    let initialStatus: SubscriptionStatus;
    if (hasSetupFee) {
      // Requires payment before activation
      initialStatus = SubscriptionStatus.PENDING_PAYMENT;
    } else if (freeMonths > 0) {
      // Free trial period
      initialStatus = SubscriptionStatus.TRIAL;
    } else {
      // Free plan or no setup required
      initialStatus = SubscriptionStatus.ACTIVE;
    }

    const subscription = new this.subscriptionModel({
      shopId: new Types.ObjectId(shopId),
      planId: plan._id,
      planCode: plan.code,
      billingCycle,
      status: initialStatus,
      startDate: now,
      currentPeriodStart: now,
      currentPeriodEnd: freeMonths > 0 ? trialEndDate : periodEnd,
      nextBillingDate: freeMonths > 0 ? trialEndDate : periodEnd,
      currentPrice: price,
      isTrialUsed: freeMonths > 0,
      trialEndDate: freeMonths > 0 ? trialEndDate : undefined,
      autoRenew: dto.autoRenew ?? true,
      promoCode: dto.promoCode,
      // Track if setup payment is required
      setupPaid: !hasSetupFee,
    });

    await subscription.save();

    this.logger.log(`Created subscription for shop ${shopId} with plan ${plan.code}, status: ${initialStatus}`);

    // Create setup invoice if applicable
    if (hasSetupFee) {
      await this.createInvoice(
        shopId,
        subscription._id.toString(),
        InvoiceType.SETUP,
        'SmartDuka POS Setup Package',
        plan.setupPrice,
      );
      this.logger.log(`Setup invoice created for shop ${shopId}, payment required to activate`);
    }

    return this.mapSubscriptionToResponse(subscription, plan);
  }

  /**
   * Change subscription plan (upgrade/downgrade)
   */
  async changePlan(
    shopId: string,
    dto: ChangePlanDto,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const newPlan = await this.planModel.findOne({ code: dto.newPlanCode, status: 'active' });
    if (!newPlan) {
      throw new NotFoundException(`Plan '${dto.newPlanCode}' not found`);
    }

    const oldPlanCode = subscription.planCode;
    const billingCycle = dto.billingCycle || subscription.billingCycle;
    const newPrice = billingCycle === BillingCycle.ANNUAL ? newPlan.annualPrice : newPlan.monthlyPrice;

    // Check if upgrading or downgrading
    const isUpgrade = newPlan.monthlyPrice > subscription.currentPrice;

    // Update subscription
    subscription.planId = newPlan._id;
    subscription.planCode = newPlan.code;
    subscription.billingCycle = billingCycle;
    subscription.currentPrice = newPrice;

    if (isUpgrade) {
      subscription.metadata = {
        ...subscription.metadata,
        upgradedFrom: oldPlanCode,
        upgradedAt: new Date(),
      };
    } else {
      subscription.metadata = {
        ...subscription.metadata,
        downgradedFrom: oldPlanCode,
        downgradedAt: new Date(),
      };
    }

    await subscription.save();

    this.logger.log(`Changed subscription for shop ${shopId} from ${oldPlanCode} to ${newPlan.code}`);

    // Create upgrade invoice if immediate and upgrading
    if (dto.immediate && isUpgrade) {
      const proratedAmount = this.calculateProratedAmount(subscription, newPrice);
      if (proratedAmount > 0) {
        await this.createInvoice(
          shopId,
          subscription._id.toString(),
          InvoiceType.UPGRADE,
          `Upgrade to ${newPlan.name} Plan`,
          proratedAmount,
        );
      }
    }

    return this.mapSubscriptionToResponse(subscription, newPlan);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    shopId: string,
    dto: CancelSubscriptionDto,
  ): Promise<void> {
    const subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Subscription is already cancelled');
    }

    subscription.cancelledAt = new Date();
    subscription.cancelReason = dto.reason;
    subscription.autoRenew = false;

    if (dto.immediate) {
      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.currentPeriodEnd = new Date();
    }

    await subscription.save();

    this.logger.log(`Cancelled subscription for shop ${shopId}`);
  }

  /**
   * Reactivate cancelled subscription
   */
  async reactivateSubscription(shopId: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== SubscriptionStatus.CANCELLED && 
        subscription.status !== SubscriptionStatus.EXPIRED) {
      throw new BadRequestException('Subscription is not cancelled or expired');
    }

    const plan = await this.planModel.findById(subscription.planId);
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    const now = new Date();
    const periodEnd = new Date(now);
    if (subscription.billingCycle === BillingCycle.ANNUAL) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.cancelledAt = undefined;
    subscription.cancelReason = undefined;
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = periodEnd;
    subscription.nextBillingDate = periodEnd;
    subscription.autoRenew = true;
    subscription.failedPaymentAttempts = 0;

    await subscription.save();

    // Create new billing invoice
    await this.createInvoice(
      shopId,
      subscription._id.toString(),
      InvoiceType.SUBSCRIPTION,
      `${plan.name} Plan - ${subscription.billingCycle === BillingCycle.ANNUAL ? 'Annual' : 'Monthly'}`,
      subscription.currentPrice,
      now,
      periodEnd,
    );

    this.logger.log(`Reactivated subscription for shop ${shopId}`);

    return this.mapSubscriptionToResponse(subscription, plan);
  }

  // ============================================
  // BILLING & INVOICES
  // ============================================

  /**
   * Get billing history for a shop
   */
  async getBillingHistory(
    shopId: string,
    limit = 20,
    skip = 0,
    status?: string,
  ): Promise<InvoiceResponseDto[]> {
    const query: any = { shopId: new Types.ObjectId(shopId) };
    if (status) {
      query.status = status;
    }

    const invoices = await this.invoiceModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();

    return invoices.map(inv => this.mapInvoiceToResponse(inv));
  }

  /**
   * Get pending invoices for a shop
   */
  async getPendingInvoices(shopId: string): Promise<InvoiceResponseDto[]> {
    const invoices = await this.invoiceModel
      .find({
        shopId: new Types.ObjectId(shopId),
        status: { $in: [InvoiceStatus.PENDING, InvoiceStatus.FAILED] },
      })
      .sort({ dueDate: 1 })
      .exec();

    return invoices.map(inv => this.mapInvoiceToResponse(inv));
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(shopId: string, invoiceId: string): Promise<InvoiceResponseDto> {
    const invoice = await this.invoiceModel.findOne({
      _id: new Types.ObjectId(invoiceId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return this.mapInvoiceToResponse(invoice);
  }

  /**
   * Create an invoice
   */
  private async createInvoice(
    shopId: string,
    subscriptionId: string,
    type: InvoiceType,
    description: string,
    amount: number,
    periodStart?: Date,
    periodEnd?: Date,
  ): Promise<SubscriptionInvoiceDocument> {
    const invoiceNumber = await this.generateInvoiceNumber();
    const tax = Math.round(amount * VAT_RATE);
    const totalAmount = amount + tax;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

    const invoice = new this.invoiceModel({
      invoiceNumber,
      shopId: new Types.ObjectId(shopId),
      subscriptionId: new Types.ObjectId(subscriptionId),
      type,
      status: InvoiceStatus.PENDING,
      description,
      amount,
      discount: 0,
      tax,
      totalAmount,
      currency: 'KES',
      periodStart,
      periodEnd,
      dueDate,
      lineItems: [
        {
          description,
          quantity: 1,
          unitPrice: amount,
          amount,
        },
      ],
    });

    await invoice.save();
    this.logger.log(`Created invoice ${invoiceNumber} for shop ${shopId}`);

    return invoice;
  }

  /**
   * Mark invoice as paid
   */
  async markInvoicePaid(
    invoiceId: string,
    paymentMethod: string,
    paymentReference: string,
    mpesaReceiptNumber?: string,
  ): Promise<void> {
    const invoice = await this.invoiceModel.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    invoice.status = InvoiceStatus.PAID;
    invoice.paidAt = new Date();
    invoice.paymentMethod = paymentMethod;
    invoice.paymentReference = paymentReference;
    invoice.mpesaReceiptNumber = mpesaReceiptNumber;

    await invoice.save();

    // Update subscription payment tracking
    const subscription = await this.subscriptionModel.findById(invoice.subscriptionId);
    if (subscription) {
      subscription.lastPaymentDate = new Date();
      subscription.lastPaymentAmount = invoice.totalAmount;
      subscription.lastPaymentMethod = paymentMethod;
      subscription.lastPaymentReference = paymentReference;
      subscription.failedPaymentAttempts = 0;

      // If this was a setup payment, mark setup as paid
      if (invoice.type === InvoiceType.SETUP) {
        subscription.setupPaid = true;
        subscription.setupPaidAt = new Date();
        subscription.setupAmount = invoice.totalAmount;
      }

      // If subscription was past due, reactivate it
      if (subscription.status === SubscriptionStatus.PAST_DUE) {
        subscription.status = SubscriptionStatus.ACTIVE;
      }

      await subscription.save();
    }

    this.logger.log(`Invoice ${invoice.invoiceNumber} marked as paid`);
  }

  /**
   * Record failed payment attempt
   */
  async recordFailedPayment(invoiceId: string, error: string): Promise<void> {
    const invoice = await this.invoiceModel.findById(invoiceId);
    if (!invoice) {
      return;
    }

    invoice.status = InvoiceStatus.FAILED;
    invoice.paymentAttempts += 1;
    invoice.lastPaymentAttempt = new Date();
    invoice.lastPaymentError = error;

    await invoice.save();

    // Update subscription
    const subscription = await this.subscriptionModel.findById(invoice.subscriptionId);
    if (subscription) {
      subscription.failedPaymentAttempts += 1;

      // After 3 failed attempts, mark as past due
      if (subscription.failedPaymentAttempts >= 3) {
        subscription.status = SubscriptionStatus.PAST_DUE;
        subscription.gracePeriodEndDate = new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
      }

      await subscription.save();
    }
  }

  // ============================================
  // PAYMENT VERIFICATION (Super Admin)
  // ============================================

  /**
   * Get all payments pending verification
   */
  async getPendingVerificationPayments(): Promise<any[]> {
    const invoices = await this.invoiceModel
      .find({ status: InvoiceStatus.PENDING_VERIFICATION })
      .populate('shopId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    return invoices.map((inv: any) => ({
      id: inv._id.toString(),
      invoiceNumber: inv.invoiceNumber,
      shopId: inv.shopId?._id?.toString(),
      shopName: inv.shopId?.name || 'Unknown',
      shopEmail: inv.shopId?.email || '',
      shopPhone: inv.shopId?.phone || '',
      amount: inv.totalAmount,
      mpesaReceiptNumber: inv.mpesaReceiptNumber,
      submittedAt: inv.manualPayment?.submittedAt || inv.createdAt,
      description: inv.description,
    }));
  }

  /**
   * Verify a manual payment and activate subscription
   */
  async verifyAndActivatePayment(invoiceId: string, verifiedBy: string): Promise<void> {
    const invoice = await this.invoiceModel.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== InvoiceStatus.PENDING_VERIFICATION) {
      throw new BadRequestException('Invoice is not pending verification');
    }

    // Mark invoice as paid
    invoice.status = InvoiceStatus.PAID;
    invoice.paidAt = new Date();
    invoice.manualPayment = {
      ...invoice.manualPayment,
      pendingVerification: false,
      verifiedAt: new Date(),
      verifiedBy,
    };
    await invoice.save();

    // Activate subscription
    const subscription = await this.subscriptionModel.findById(invoice.subscriptionId);
    if (subscription) {
      const now = new Date();
      const periodEnd = new Date(now);
      
      if (subscription.billingCycle === BillingCycle.ANNUAL) {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.setupPaid = true;
      subscription.setupPaidAt = now;
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = periodEnd;
      subscription.nextBillingDate = periodEnd;
      subscription.lastPaymentDate = now;
      subscription.lastPaymentAmount = invoice.totalAmount;
      subscription.lastPaymentMethod = invoice.paymentMethod;
      subscription.lastPaymentReference = invoice.mpesaReceiptNumber || invoice.paymentReference;
      subscription.failedPaymentAttempts = 0;

      await subscription.save();
      this.logger.log(`Subscription activated for shop ${subscription.shopId} after payment verification`);
    }
  }

  /**
   * Reject a manual payment
   */
  async rejectPayment(invoiceId: string, reason: string): Promise<void> {
    const invoice = await this.invoiceModel.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== InvoiceStatus.PENDING_VERIFICATION) {
      throw new BadRequestException('Invoice is not pending verification');
    }

    // Mark invoice as failed
    invoice.status = InvoiceStatus.FAILED;
    invoice.lastPaymentError = reason;
    invoice.manualPayment = {
      ...invoice.manualPayment,
      pendingVerification: false,
      rejectedAt: new Date(),
      rejectionReason: reason,
    };
    await invoice.save();

    this.logger.log(`Payment rejected for invoice ${invoice.invoiceNumber}: ${reason}`);
  }

  // ============================================
  // USAGE TRACKING & LIMITS
  // ============================================

  /**
   * Check if shop can add more resources
   */
  async checkLimit(
    shopId: string,
    resource: 'shops' | 'employees' | 'products',
    increment = 1,
  ): Promise<{ allowed: boolean; current: number; limit: number; message?: string }> {
    const subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    if (!subscription) {
      return { allowed: false, current: 0, limit: 0, message: 'No active subscription' };
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE && 
        subscription.status !== SubscriptionStatus.TRIAL) {
      return { allowed: false, current: 0, limit: 0, message: 'Subscription is not active' };
    }

    const plan = await this.planModel.findById(subscription.planId);
    if (!plan) {
      return { allowed: false, current: 0, limit: 0, message: 'Plan not found' };
    }

    let current: number;
    let limit: number;

    switch (resource) {
      case 'shops':
        current = subscription.currentShopCount;
        limit = plan.maxShops;
        break;
      case 'employees':
        current = subscription.currentEmployeeCount;
        limit = plan.maxEmployees;
        break;
      case 'products':
        current = subscription.currentProductCount;
        limit = plan.maxProducts;
        break;
    }

    const allowed = current + increment <= limit;

    return {
      allowed,
      current,
      limit,
      message: allowed ? undefined : `${resource} limit reached. Upgrade your plan to add more.`,
    };
  }

  /**
   * Update usage count
   */
  async updateUsage(
    shopId: string,
    resource: 'shops' | 'employees' | 'products',
    count: number,
  ): Promise<void> {
    const update: any = {};
    switch (resource) {
      case 'shops':
        update.currentShopCount = count;
        break;
      case 'employees':
        update.currentEmployeeCount = count;
        break;
      case 'products':
        update.currentProductCount = count;
        break;
    }

    await this.subscriptionModel.updateOne(
      { shopId: new Types.ObjectId(shopId) },
      { $set: update },
    );
  }

  // ============================================
  // BACKGROUND JOBS
  // ============================================

  /**
   * Process expiring subscriptions (run daily)
   */
  async processExpiringSubscriptions(): Promise<void> {
    const now = new Date();
    const warningDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Find subscriptions expiring in 7 days
    const expiring = await this.subscriptionModel.find({
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
      currentPeriodEnd: { $lte: warningDate, $gt: now },
      autoRenew: true,
    });

    for (const subscription of expiring) {
      // Send reminder notification
      // TODO: Implement notification service
      this.logger.log(`Subscription ${subscription._id} expiring soon`);
    }

    // Find expired subscriptions
    const expired = await this.subscriptionModel.find({
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
      currentPeriodEnd: { $lte: now },
    });

    for (const subscription of expired) {
      if (subscription.autoRenew) {
        // Create renewal invoice
        const plan = await this.planModel.findById(subscription.planId);
        if (plan) {
          const periodStart = new Date();
          const periodEnd = new Date();
          if (subscription.billingCycle === BillingCycle.ANNUAL) {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          }

          await this.createInvoice(
            subscription.shopId.toString(),
            subscription._id.toString(),
            InvoiceType.SUBSCRIPTION,
            `${plan.name} Plan Renewal`,
            subscription.currentPrice,
            periodStart,
            periodEnd,
          );

          subscription.status = SubscriptionStatus.PAST_DUE;
          subscription.gracePeriodEndDate = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
        }
      } else {
        subscription.status = SubscriptionStatus.EXPIRED;
      }

      await subscription.save();
    }

    // Suspend subscriptions past grace period
    const pastGrace = await this.subscriptionModel.find({
      status: SubscriptionStatus.PAST_DUE,
      gracePeriodEndDate: { $lte: now },
    });

    for (const subscription of pastGrace) {
      subscription.status = SubscriptionStatus.SUSPENDED;
      await subscription.save();
      this.logger.log(`Suspended subscription ${subscription._id}`);
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private mapPlanToResponse(plan: SubscriptionPlanDocument): SubscriptionPlanResponseDto {
    const monthlyEquivalent = Math.round(plan.annualPrice / 12);
    const annualSavings = (plan.monthlyPrice * 12) - plan.annualPrice;

    return {
      code: plan.code,
      name: plan.name,
      description: plan.description,
      monthlyPrice: plan.monthlyPrice,
      annualPrice: plan.annualPrice,
      setupPrice: plan.setupPrice,
      maxShops: plan.maxShops,
      maxEmployees: plan.maxEmployees,
      maxProducts: plan.maxProducts,
      features: plan.features,
      setupIncludes: plan.setupIncludes,
      badge: plan.badge,
      colorTheme: plan.colorTheme,
      annualSavings,
      pricePerMonth: monthlyEquivalent,
    };
  }

  private mapSubscriptionToResponse(
    subscription: SubscriptionDocument,
    plan: SubscriptionPlanDocument,
  ): SubscriptionResponseDto {
    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((subscription.currentPeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    );

    return {
      id: subscription._id.toString(),
      shopId: subscription.shopId.toString(),
      planCode: subscription.planCode,
      planName: plan.name,
      billingCycle: subscription.billingCycle,
      status: subscription.status,
      currentPrice: subscription.currentPrice,
      startDate: subscription.startDate,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      nextBillingDate: subscription.nextBillingDate,
      daysRemaining,
      isTrialUsed: subscription.isTrialUsed,
      trialEndDate: subscription.trialEndDate,
      autoRenew: subscription.autoRenew,
      usage: {
        shops: { current: subscription.currentShopCount, limit: plan.maxShops },
        employees: { current: subscription.currentEmployeeCount, limit: plan.maxEmployees },
        products: { current: subscription.currentProductCount, limit: plan.maxProducts },
      },
      features: plan.features,
    };
  }

  private mapInvoiceToResponse(invoice: SubscriptionInvoiceDocument): InvoiceResponseDto {
    return {
      id: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      type: invoice.type,
      status: invoice.status,
      description: invoice.description,
      amount: invoice.amount,
      discount: invoice.discount,
      tax: invoice.tax,
      totalAmount: invoice.totalAmount,
      currency: invoice.currency,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      paymentMethod: invoice.paymentMethod,
      // Use mpesaReceiptNumber as paymentReference if available
      paymentReference: invoice.mpesaReceiptNumber || invoice.paymentReference,
      mpesaReceiptNumber: invoice.mpesaReceiptNumber,
      createdAt: invoice.createdAt!,
    };
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.invoiceModel.countDocuments({
      createdAt: { $gte: new Date(`${year}-01-01`) },
    });
    return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  private calculateProratedAmount(
    subscription: SubscriptionDocument,
    newPrice: number,
  ): number {
    const now = new Date();
    const periodStart = subscription.currentPeriodStart;
    const periodEnd = subscription.currentPeriodEnd;

    const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000));
    const remainingDays = Math.ceil((periodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    if (remainingDays <= 0) return 0;

    const dailyRate = newPrice / totalDays;
    const oldDailyRate = subscription.currentPrice / totalDays;
    const difference = dailyRate - oldDailyRate;

    return Math.max(0, Math.round(difference * remainingDays));
  }

  // ============================================
  // SUPER ADMIN METHODS
  // ============================================

  /**
   * Get all subscriptions with shop details (super admin)
   */
  async getAllSubscriptions(): Promise<any[]> {
    const subscriptions = await this.subscriptionModel
      .find()
      .populate('shopId', 'name email phone')
      .populate('planId', 'name code')
      .sort({ createdAt: -1 })
      .lean();

    return subscriptions.map((sub: any) => ({
      shopId: sub.shopId?._id?.toString() || sub.shopId?.toString(),
      shopName: sub.shopId?.name || 'Unknown Shop',
      shopEmail: sub.shopId?.email || '',
      planCode: sub.planCode,
      planName: sub.planId?.name || sub.planCode,
      status: sub.status,
      billingCycle: sub.billingCycle,
      currentPrice: sub.currentPrice,
      currentPeriodEnd: sub.currentPeriodEnd,
      daysRemaining: Math.ceil((new Date(sub.currentPeriodEnd).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
      usage: {
        shops: { current: sub.currentShopCount || 0, limit: sub.planId?.maxShops || 1 },
        employees: { current: sub.currentEmployeeCount || 0, limit: sub.planId?.maxEmployees || 2 },
        products: { current: sub.currentProductCount || 0, limit: sub.planId?.maxProducts || 500 },
      },
    }));
  }

  /**
   * Get subscription statistics (super admin)
   */
  async getSubscriptionStats(): Promise<any> {
    const [
      totalShops,
      activeCount,
      trialCount,
      expiredCount,
      planBreakdown,
      revenueData,
    ] = await Promise.all([
      this.subscriptionModel.countDocuments(),
      this.subscriptionModel.countDocuments({ status: SubscriptionStatus.ACTIVE }),
      this.subscriptionModel.countDocuments({ status: SubscriptionStatus.TRIAL }),
      this.subscriptionModel.countDocuments({ 
        status: { $in: [SubscriptionStatus.EXPIRED, SubscriptionStatus.CANCELLED] } 
      }),
      this.subscriptionModel.aggregate([
        { $match: { status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] } } },
        { $group: { _id: '$planCode', count: { $sum: 1 } } },
      ]),
      this.subscriptionModel.aggregate([
        { $match: { status: SubscriptionStatus.ACTIVE, billingCycle: 'monthly' } },
        { $group: { _id: null, total: { $sum: '$currentPrice' } } },
      ]),
    ]);

    const breakdown: Record<string, number> = {
      starter: 0,
      basic: 0,
      silver: 0,
      gold: 0,
    };

    planBreakdown.forEach((item: { _id: string; count: number }) => {
      if (breakdown.hasOwnProperty(item._id)) {
        breakdown[item._id] = item.count;
      }
    });

    return {
      totalShops,
      activeSubscriptions: activeCount,
      trialSubscriptions: trialCount,
      expiredSubscriptions: expiredCount,
      monthlyRevenue: revenueData[0]?.total || 0,
      planBreakdown: breakdown,
    };
  }

  // ============================================
  // SCHEDULER SUPPORT METHODS
  // ============================================

  /**
   * Get all past due subscriptions
   */
  async getPastDueSubscriptions(): Promise<SubscriptionDocument[]> {
    return this.subscriptionModel.find({
      status: SubscriptionStatus.PAST_DUE,
    }).exec();
  }

  /**
   * Generate recurring invoices for subscriptions due for renewal
   */
  async generateRecurringInvoices(): Promise<void> {
    const now = new Date();
    
    // Find subscriptions that need renewal (next billing date is today or past)
    const dueSubscriptions = await this.subscriptionModel.find({
      status: SubscriptionStatus.ACTIVE,
      autoRenew: true,
      nextBillingDate: { $lte: now },
    });

    for (const subscription of dueSubscriptions) {
      try {
        const plan = await this.planModel.findById(subscription.planId);
        if (!plan) continue;

        // Calculate new billing period
        const periodStart = new Date(subscription.currentPeriodEnd);
        const periodEnd = new Date(periodStart);
        
        if (subscription.billingCycle === BillingCycle.ANNUAL) {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        // Create renewal invoice
        await this.createInvoice(
          subscription.shopId.toString(),
          subscription._id.toString(),
          InvoiceType.SUBSCRIPTION,
          `${plan.name} Plan - ${subscription.billingCycle === BillingCycle.ANNUAL ? 'Annual' : 'Monthly'} Renewal`,
          subscription.currentPrice,
          periodStart,
          periodEnd,
        );

        // Update next billing date
        subscription.nextBillingDate = periodEnd;
        await subscription.save();

        this.logger.log(`Generated renewal invoice for shop ${subscription.shopId}`);
      } catch (error) {
        this.logger.error(`Failed to generate invoice for subscription ${subscription._id}:`, error);
      }
    }
  }

  /**
   * Sync usage counts for all subscriptions
   * This ensures data integrity by counting actual resources
   */
  async syncAllUsageCounts(): Promise<void> {
    const subscriptions = await this.subscriptionModel.find({
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL, SubscriptionStatus.PAST_DUE] },
    });

    for (const subscription of subscriptions) {
      try {
        // Count actual resources for this shop
        // Note: These counts would come from the respective services
        // For now, we'll just log that sync was attempted
        this.logger.log(`Syncing usage counts for shop ${subscription.shopId}`);
        
        // In a full implementation, you would:
        // 1. Count branches from branches collection
        // 2. Count employees from users collection
        // 3. Count products from products collection
        // 4. Update subscription with actual counts
      } catch (error) {
        this.logger.error(`Failed to sync counts for subscription ${subscription._id}:`, error);
      }
    }
  }

  /**
   * Check if a shop's subscription allows a specific action
   */
  async canPerformAction(shopId: string): Promise<{ allowed: boolean; reason?: string }> {
    const subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    if (!subscription) {
      return { allowed: false, reason: 'No subscription found' };
    }

    switch (subscription.status) {
      case SubscriptionStatus.ACTIVE:
      case SubscriptionStatus.TRIAL:
        return { allowed: true };
      
      case SubscriptionStatus.PAST_DUE:
        return { 
          allowed: true, 
          reason: 'Payment overdue - please pay to avoid service interruption' 
        };
      
      case SubscriptionStatus.SUSPENDED:
        return { 
          allowed: false, 
          reason: 'Subscription suspended due to non-payment' 
        };
      
      case SubscriptionStatus.EXPIRED:
        return { 
          allowed: false, 
          reason: 'Subscription has expired' 
        };
      
      case SubscriptionStatus.CANCELLED:
        return { 
          allowed: false, 
          reason: 'Subscription has been cancelled' 
        };
      
      default:
        return { allowed: false, reason: 'Unknown subscription status' };
    }
  }
}
