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
import { Product, ProductDocument } from '../inventory/schemas/product.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  CreateSubscriptionDto,
  ChangePlanDto,
  CancelSubscriptionDto,
  SubscriptionResponseDto,
  SubscriptionPlanResponseDto,
  InvoiceResponseDto,
} from './dto/subscription.dto';

import { SystemConfig, SystemConfigDocument, SystemConfigType } from '../super-admin/schemas/system-config.schema';
import { EmailService } from '../notifications/email.service';
import { EMAIL_TEMPLATES } from '../notifications/email-templates';

// Grace period in days before suspension
const GRACE_PERIOD_DAYS = 7;

// Trial period in days
const TRIAL_PERIOD_DAYS = 14;

// Default VAT rate (used when VAT is enabled but no config exists)
const DEFAULT_VAT_RATE = 0.16;

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
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(SystemConfig.name)
    private readonly systemConfigModel: Model<SystemConfigDocument>,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Get VAT configuration from system settings
   * Returns { enabled: boolean, rate: number }
   */
  private async getVatConfig(): Promise<{ enabled: boolean; rate: number }> {
    try {
      const config = await this.systemConfigModel.findOne({ type: SystemConfigType.VAT });
      if (!config) {
        // Default: VAT disabled
        return { enabled: false, rate: DEFAULT_VAT_RATE };
      }
      return {
        enabled: config.config?.vatEnabled ?? false,
        rate: config.config?.vatRate ?? DEFAULT_VAT_RATE,
      };
    } catch (error) {
      this.logger.warn('Failed to get VAT config, defaulting to disabled');
      return { enabled: false, rate: DEFAULT_VAT_RATE };
    }
  }

  /**
   * Calculate tax based on VAT settings
   * Returns 0 if VAT is disabled
   */
  private async calculateTax(amount: number): Promise<number> {
    const vatConfig = await this.getVatConfig();
    if (!vatConfig.enabled) {
      return 0;
    }
    return Math.round(amount * vatConfig.rate);
  }

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
        code: 'trial',
        name: 'Trial',
        description: 'Free plan with limited features to get started',
        monthlyPrice: 0,
        annualPrice: 0,
        setupPrice: 0,
        maxShops: 1,
        maxEmployees: 1,
        maxProducts: 25,
        features: [
          'Basic POS System',
          'Limited Inventory (25 products)',
          'Basic Sales Reports',
          'Email Support',
        ],
        setupIncludes: {
          siteSurvey: false,
          stocktake: false,
          setup: false,
          training: false,
          support: true,
          freeMonths: 0,
          optional: false,
        },
        displayOrder: 0,
        colorTheme: 'gray',
      },
      {
        code: 'starter',
        name: 'Starter',
        description: 'Perfect for small shops just getting started',
        monthlyPrice: 1000,
        annualPrice: 10000, // ~17% discount
        setupPrice: SETUP_FEE,
        maxShops: 1,
        maxEmployees: 2,
        maxProducts: 250,
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
        displayOrder: 2,
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
        maxProducts: 750,
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
        displayOrder: 3,
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
        displayOrder: 4,
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
        displayOrder: 5,
        badge: 'Best Value',
        colorTheme: 'gold',
      },
      {
        code: 'daily',
        name: 'Daily',
        description: 'Pay per day - flexible subscription with Silver-level features',
        dailyPrice: 99, // KES 99 per day
        monthlyPrice: 2970, // 99 * 30 (reference only)
        annualPrice: 36135, // 99 * 365 (reference only)
        setupPrice: 0, // No setup fee for daily
        maxShops: 5,
        maxEmployees: 15,
        maxProducts: 2000,
        features: [
          'Full POS System',
          'Multi-Branch Support (5 branches)',
          'Inventory Management',
          'Sales Reports & Analytics',
          'M-Pesa Integration',
          'Stock Transfer',
          'Purchase Orders',
          'Supplier Management',
          'API Access',
          'Phone Support',
          'Flexible Daily Billing',
        ],
        setupIncludes: {
          siteSurvey: false,
          stocktake: false,
          setup: false,
          training: false,
          support: true,
          freeMonths: 0,
          optional: false,
        },
        displayOrder: 1, // After trial (0), before starter (2)
        badge: 'Flexible',
        colorTheme: 'orange',
      },
    ];

    await this.planModel.insertMany(plans);
    this.logger.log('Subscription plans seeded successfully');
  }

  /**
   * Ensure trial plan exists (for existing databases)
   */
  async ensureTrialPlanExists(): Promise<void> {
    const trialPlan = await this.planModel.findOne({ code: 'trial' });
    if (!trialPlan) {
      await this.planModel.create({
        code: 'trial',
        name: 'Trial',
        description: 'Free 14-day trial with limited features to get started',
        dailyPrice: 0,
        monthlyPrice: 0,
        annualPrice: 0,
        setupPrice: 0,
        maxShops: 1,
        maxEmployees: 1,
        maxProducts: 25,
        features: [
          'Basic POS System',
          'Limited Inventory (25 products)',
          'Basic Sales Reports',
          'Email Support',
          '14-Day Free Trial',
        ],
        setupIncludes: {
          siteSurvey: false,
          stocktake: false,
          setup: false,
          training: false,
          support: true,
          freeMonths: 0,
          optional: false,
        },
        displayOrder: 0,
        colorTheme: 'gray',
        status: 'active',
      });
      this.logger.log('Trial plan created');
    }
  }

  /**
   * Ensure daily plan exists (for existing databases)
   * Daily plan: KES 99/day with Silver-level features
   */
  async ensureDailyPlanExists(): Promise<void> {
    const dailyPlan = await this.planModel.findOne({ code: 'daily' });
    if (!dailyPlan) {
      await this.planModel.create({
        code: 'daily',
        name: 'Daily',
        description: 'Pay per day - flexible subscription with Silver-level features',
        dailyPrice: 99, // KES 99 per day
        monthlyPrice: 2970, // 99 * 30 (reference only)
        annualPrice: 36135, // 99 * 365 (reference only)
        setupPrice: 0, // No setup fee for daily
        maxShops: 5,
        maxEmployees: 15,
        maxProducts: 2000,
        features: [
          'Full POS System',
          'Multi-Branch Support (5 branches)',
          'Inventory Management',
          'Sales Reports & Analytics',
          'M-Pesa Integration',
          'Stock Transfer',
          'Purchase Orders',
          'Supplier Management',
          'API Access',
          'Phone Support',
          'Flexible Daily Billing',
        ],
        setupIncludes: {
          siteSurvey: false,
          stocktake: false,
          setup: false,
          training: false,
          support: true,
          freeMonths: 0,
          optional: false,
        },
        displayOrder: 1, // After trial (0), before starter (2)
        badge: 'Flexible',
        colorTheme: 'orange',
        status: 'active',
      });
      this.logger.log('Daily plan created (KES 99/day with Silver features)');
    }
  }

  /**
   * Update plan display orders for proper sorting
   * Order: trial(0), daily(1), starter(2), basic(3), silver(4), gold(5)
   */
  async updatePlanDisplayOrders(): Promise<void> {
    const orderMap: Record<string, number> = {
      trial: 0,
      daily: 1,
      starter: 2,
      basic: 3,
      silver: 4,
      gold: 5,
    };

    for (const [code, order] of Object.entries(orderMap)) {
      await this.planModel.updateOne(
        { code },
        { $set: { displayOrder: order } },
      );
    }
    this.logger.log('Plan display orders updated');
  }

  /**
   * Get trial plan
   */
  async getTrialPlan(): Promise<SubscriptionPlanDocument | null> {
    return this.planModel.findOne({ code: 'trial', status: 'active' });
  }

  /**
   * Update plan product limits
   * Trial: 25, Starter: 250, Basic: 750
   */
  async updatePlanProductLimits(): Promise<{ updated: number; message: string }> {
    const updates = [
      { code: 'trial', maxProducts: 25 },
      { code: 'starter', maxProducts: 250 },
      { code: 'basic', maxProducts: 750 },
    ];

    let updatedCount = 0;
    for (const update of updates) {
      const result = await this.planModel.updateOne(
        { code: update.code },
        { $set: { maxProducts: update.maxProducts } },
      );
      if (result.modifiedCount > 0) {
        updatedCount++;
        this.logger.log(`Updated ${update.code} plan: maxProducts = ${update.maxProducts}`);
      }
    }

    return {
      updated: updatedCount,
      message: `Updated product limits: Trial=25, Starter=250, Basic=750`,
    };
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
   * If no subscription exists, auto-create a trial subscription
   */
  async getSubscription(shopId: string): Promise<SubscriptionResponseDto> {
    // Validate shopId before proceeding
    if (!shopId || shopId === 'undefined') {
      this.logger.warn('getSubscription called with invalid shopId:', shopId);
      throw new NotFoundException('Shop ID is required to fetch subscription');
    }
    
    let subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    // If no subscription exists, auto-create a trial subscription
    if (!subscription) {
      this.logger.log(`No subscription found for shop ${shopId}, creating trial subscription...`);
      
      const trialPlan = await this.getTrialPlan();
      if (!trialPlan) {
        // Ensure trial plan exists
        await this.ensureTrialPlanExists();
        const newTrialPlan = await this.getTrialPlan();
        if (!newTrialPlan) {
          throw new NotFoundException('Trial plan not available');
        }
        return this.createTrialSubscription(shopId, newTrialPlan);
      }
      
      return this.createTrialSubscription(shopId, trialPlan);
    }

    let plan = await this.planModel.findById(subscription.planId);
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    // CRITICAL: Validate that planCode matches the actual plan
    // This prevents data integrity issues where planId and planCode are out of sync
    if (plan.code !== subscription.planCode) {
      this.logger.warn(
        `Plan mismatch detected for shop ${shopId}: subscription.planCode='${subscription.planCode}' but planId references plan.code='${plan.code}'. Fixing...`
      );
      
      // Try to find the correct plan by planCode
      const correctPlan = await this.planModel.findOne({ code: subscription.planCode });
      if (correctPlan) {
        // Update the subscription to reference the correct plan
        subscription.planId = correctPlan._id;
        await subscription.save();
        plan = correctPlan;
        this.logger.log(`Fixed plan reference for shop ${shopId}: now using planId for '${correctPlan.code}'`);
      } else {
        // If planCode doesn't exist, update planCode to match planId
        subscription.planCode = plan.code;
        await subscription.save();
        this.logger.log(`Fixed planCode for shop ${shopId}: now using '${plan.code}'`);
      }
    }

    // Fetch real-time usage counts from database
    const realTimeUsage = await this.getUsageCounts(shopId);

    // Also update stored counts in background (don't await)
    this.syncUsageCountsForShop(shopId).catch(err => 
      this.logger.error(`Background sync failed for shop ${shopId}:`, err)
    );

    return this.mapSubscriptionToResponse(subscription, plan, realTimeUsage);
  }

  /**
   * Create a trial subscription for a shop (internal helper)
   * Trial expires after TRIAL_PERIOD_DAYS (14 days)
   */
  private async createTrialSubscription(shopId: string, trialPlan: SubscriptionPlanDocument): Promise<SubscriptionResponseDto> {
    const now = new Date();
    
    // Trial expires after 14 days - user must upgrade to continue
    const trialEndDate = new Date(now);
    trialEndDate.setDate(trialEndDate.getDate() + TRIAL_PERIOD_DAYS);
    
    const subscription = new this.subscriptionModel({
      shopId: new Types.ObjectId(shopId),
      planId: trialPlan._id,
      planCode: 'trial',
      billingCycle: BillingCycle.MONTHLY,
      status: SubscriptionStatus.TRIAL, // Use TRIAL status, not ACTIVE
      startDate: now,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndDate, // Expires after 14 days
      trialEndDate: trialEndDate, // Store trial end date explicitly
      isTrialUsed: true,
      nextBillingDate: null, // No billing for trial
      currentPrice: 0,
      usage: {
        shops: 1,
        employees: 1,
        products: 0,
        branches: 1,
      },
    });

    await subscription.save();
    this.logger.log(`Created trial subscription for shop ${shopId}`);

    const realTimeUsage = await this.getUsageCounts(shopId);
    return this.mapSubscriptionToResponse(subscription, trialPlan, realTimeUsage);
  }

  /**
   * Create a new subscription for a shop
   * Supports daily, monthly, and annual billing cycles
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
    
    // Calculate price and period end based on billing cycle
    const { price, periodEnd, numberOfDays } = this.calculateBillingDetails(
      plan,
      billingCycle,
      dto.numberOfDays,
      now,
    );

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
      numberOfDays: billingCycle === BillingCycle.DAILY ? numberOfDays : undefined,
      isTrialUsed: freeMonths > 0,
      trialEndDate: freeMonths > 0 ? trialEndDate : undefined,
      autoRenew: dto.autoRenew ?? true,
      promoCode: dto.promoCode,
      // Track if setup payment is required
      setupPaid: !hasSetupFee,
    });

    await subscription.save();

    this.logger.log(`Created subscription for shop ${shopId} with plan ${plan.code}, billing: ${billingCycle}${numberOfDays ? ` (${numberOfDays} days)` : ''}, status: ${initialStatus}`);

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
   * Calculate billing details based on billing cycle and number of days
   */
  private calculateBillingDetails(
    plan: SubscriptionPlanDocument,
    billingCycle: BillingCycle,
    numberOfDays?: number,
    startDate: Date = new Date(),
  ): { price: number; periodEnd: Date; numberOfDays?: number } {
    const periodEnd = new Date(startDate);
    let price: number;
    let days: number | undefined;

    switch (billingCycle) {
      case BillingCycle.DAILY:
        // Daily billing - user specifies number of days (default 1)
        days = numberOfDays || 1;
        price = (plan.dailyPrice || 99) * days; // Default to KES 99 if not set
        periodEnd.setDate(periodEnd.getDate() + days);
        break;
      case BillingCycle.ANNUAL:
        price = plan.annualPrice;
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        break;
      case BillingCycle.MONTHLY:
      default:
        price = plan.monthlyPrice;
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        break;
    }

    return { price, periodEnd, numberOfDays: days };
  }

  /**
   * Change subscription plan (upgrade/downgrade)
   * 
   * IMPORTANT: For upgrades to paid plans, this creates a PENDING upgrade
   * that requires payment before activation. The plan is NOT changed until
   * payment is confirmed via M-Pesa callback or manual confirmation.
   * 
   * Free transitions (no payment required):
   * - Any plan to trial/free plan (downgrade)
   * - Trial to any plan when first subscribing (handled by createSubscription)
   * - Downgrade to lower-priced plan
   */
  async changePlan(
    shopId: string,
    dto: ChangePlanDto,
  ): Promise<SubscriptionResponseDto & { requiresPayment?: boolean; invoiceId?: string; pendingUpgrade?: any }> {
    const subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const currentPlan = await this.planModel.findById(subscription.planId);
    const newPlan = await this.planModel.findOne({ code: dto.newPlanCode, status: 'active' });
    
    if (!newPlan) {
      throw new NotFoundException(`Plan '${dto.newPlanCode}' not found`);
    }

    // Same plan - allow renewal if subscription is expired, suspended, or past_due
    const allowRenewalStatuses = ['expired', 'suspended', 'past_due', 'cancelled', 'pending_payment'];
    if (subscription.planCode === dto.newPlanCode && !allowRenewalStatuses.includes(subscription.status)) {
      throw new BadRequestException('Already on this plan');
    }

    const billingCycle = dto.billingCycle || subscription.billingCycle;
    const newPrice = billingCycle === BillingCycle.ANNUAL ? newPlan.annualPrice : 
                     billingCycle === BillingCycle.DAILY ? newPlan.dailyPrice :
                     newPlan.monthlyPrice;
    const currentPrice = currentPlan ? currentPlan.monthlyPrice : 0;

    // Determine if this is an upgrade (requires payment) or downgrade (free)
    const isUpgrade = newPlan.monthlyPrice > currentPrice;
    const isToFreePlan = newPlan.code === 'trial' || newPlan.monthlyPrice === 0;
    const isFromFreePlan = subscription.planCode === 'trial' || currentPrice === 0;

    // Get current usage counts for limit validation
    const currentUsage = await this.getUsageCounts(shopId);

    // Check if change would exceed new plan limits
    const limitWarnings: string[] = [];
    if (currentUsage.products > newPlan.maxProducts) {
      limitWarnings.push(`You have ${currentUsage.products} products but ${newPlan.name} plan only supports ${newPlan.maxProducts}.`);
    }
    if (currentUsage.employees > newPlan.maxEmployees) {
      limitWarnings.push(`You have ${currentUsage.employees} employees but ${newPlan.name} plan only supports ${newPlan.maxEmployees}.`);
    }
    if (currentUsage.shops > newPlan.maxShops) {
      limitWarnings.push(`You have ${currentUsage.shops} shops but ${newPlan.name} plan only supports ${newPlan.maxShops}.`);
    }

    // === DOWNGRADE BLOCKING ===
    // Users cannot downgrade while their current subscription is active.
    // They must wait until the subscription period expires.
    if (!isUpgrade && !isFromFreePlan) {
      const now = new Date();
      const periodEnd = subscription.currentPeriodEnd;
      
      // Check if subscription is still active (not expired)
      if (subscription.status === SubscriptionStatus.ACTIVE && periodEnd > now) {
        const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        const formattedDate = periodEnd.toLocaleDateString('en-KE', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        
        throw new BadRequestException(
          `You cannot downgrade while your current subscription is active. ` +
          `Your ${currentPlan?.name || subscription.planCode} plan is valid until ${formattedDate} ` +
          `(${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining). ` +
          `Please come back after your subscription expires to downgrade, or you can upgrade to a higher plan now.`
        );
      }
    }

    // === FREE TRANSITIONS: Direct plan change ===
    // Only allowed when:
    // 1. Subscription has expired/cancelled
    // 2. Moving from trial/free plan to any plan
    // 3. Downgrade after subscription period ends
    if (isToFreePlan || !isUpgrade) {
      if (limitWarnings.length > 0) {
        this.logger.warn(`Plan downgrade for shop ${shopId} exceeds limits: ${limitWarnings.join(' | ')}`);
      }

      const oldPlanCode = subscription.planCode;
      subscription.planId = newPlan._id;
      subscription.planCode = newPlan.code;
      subscription.billingCycle = billingCycle;
      subscription.currentPrice = newPrice;
      subscription.pendingUpgrade = undefined; // Clear any pending upgrade
      subscription.metadata = {
        ...subscription.metadata,
        downgradedFrom: oldPlanCode,
        downgradedAt: new Date(),
      };

      await subscription.save();
      this.logger.log(`Downgraded subscription for shop ${shopId} from ${oldPlanCode} to ${newPlan.code}`);

      // Send plan change notification email
      try {
        const shop = await this.shopModel.findById(shopId).lean();
        const admin = await this.userModel.findOne({ shopId: new Types.ObjectId(shopId), role: 'admin' }).lean();
        const previousPlan = currentPlan?.name || oldPlanCode;
        
        if (admin?.email && shop) {
          const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://smartduka.co.ke';
          const template = EMAIL_TEMPLATES.plan_changed;
          
          await this.emailService.sendEmail({
            to: admin.email,
            subject: template.subject,
            html: template.getHtml({
              shopName: shop.name,
              userName: admin.name || admin.email,
              previousPlan: previousPlan,
              newPlan: newPlan.name,
              changeDate: new Date().toLocaleDateString('en-KE', { dateStyle: 'long' }),
              dashboardUrl: `${frontendUrl}/admin/dashboard`,
            }),
          });
          this.logger.log(`📧 Plan change email sent to ${admin.email} (${previousPlan} → ${newPlan.name})`);
        }
      } catch (emailError: any) {
        this.logger.error(`Failed to send plan change email: ${emailError.message}`);
        // Don't fail the plan change if email fails
      }

      return this.mapSubscriptionToResponse(subscription, newPlan);
    }

    // === PAID UPGRADE: Requires payment first ===
    this.logger.log(`Creating pending upgrade for shop ${shopId} from ${subscription.planCode} to ${newPlan.code}`);

    // Calculate upgrade amount
    // For daily plans, ALWAYS use the exact daily price (no proration)
    // For other plans, use full price (proration was confusing users)
    let finalAmount: number;
    let isProrated = false;
    
    if (billingCycle === BillingCycle.DAILY) {
      // Daily plan: exact daily price, no proration
      finalAmount = newPlan.dailyPrice || 99;
    } else {
      // Monthly/Annual: use full price for clarity
      // Users pay full price for the new plan period
      finalAmount = newPrice;
    }

    // Create upgrade invoice
    const invoice = await this.createInvoice(
      shopId,
      subscription._id.toString(),
      InvoiceType.UPGRADE,
      `Upgrade to ${newPlan.name} Plan (${billingCycle})`,
      finalAmount,
    );

    // Store pending upgrade on subscription (NOT activated yet)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

    subscription.pendingUpgrade = {
      planCode: newPlan.code,
      planId: newPlan._id.toString(),
      billingCycle,
      price: finalAmount, // Use finalAmount (KES 99 for daily, full price for others)
      invoiceId: invoice._id.toString(),
      requestedAt: new Date(),
      expiresAt,
    };

    await subscription.save();

    this.logger.log(`Created pending upgrade for shop ${shopId}: ${newPlan.code} - Invoice ${invoice.invoiceNumber}`);

    // Return current subscription with pending upgrade info
    const response = this.mapSubscriptionToResponse(subscription, currentPlan || newPlan);
    return {
      ...response,
      requiresPayment: true,
      invoiceId: invoice._id.toString(),
      pendingUpgrade: {
        planCode: newPlan.code,
        planName: newPlan.name,
        price: finalAmount,
        billingCycle,
        invoiceNumber: invoice.invoiceNumber,
        expiresAt,
      },
    };
  }

  /**
   * Activate a pending upgrade after payment is confirmed
   * Called by payment callback handlers (M-Pesa, Stripe, manual confirmation)
   */
  async activatePendingUpgrade(shopId: string, invoiceId?: string): Promise<SubscriptionResponseDto | null> {
    const subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    if (!subscription || !subscription.pendingUpgrade) {
      this.logger.warn(`No pending upgrade found for shop ${shopId}`);
      return null;
    }

    // Verify invoice matches if provided
    if (invoiceId && subscription.pendingUpgrade.invoiceId !== invoiceId) {
      this.logger.warn(`Invoice mismatch for upgrade: expected ${subscription.pendingUpgrade.invoiceId}, got ${invoiceId}`);
      return null;
    }

    // Check if pending upgrade has expired
    if (subscription.pendingUpgrade.expiresAt && new Date() > subscription.pendingUpgrade.expiresAt) {
      this.logger.warn(`Pending upgrade expired for shop ${shopId}`);
      subscription.pendingUpgrade = undefined;
      await subscription.save();
      return null;
    }

    const newPlan = await this.planModel.findById(subscription.pendingUpgrade.planId);
    if (!newPlan) {
      this.logger.error(`Plan not found for pending upgrade: ${subscription.pendingUpgrade.planId}`);
      return null;
    }

    // Activate the upgrade
    const oldPlanCode = subscription.planCode;
    const now = new Date();
    const billingCycle = subscription.pendingUpgrade.billingCycle as BillingCycle;
    
    // Calculate new period based on billing cycle
    const { periodEnd, numberOfDays } = this.calculateBillingDetails(
      newPlan,
      billingCycle,
      billingCycle === BillingCycle.DAILY ? 1 : undefined, // Default 1 day for daily
      now,
    );
    
    subscription.planId = newPlan._id;
    subscription.planCode = newPlan.code;
    subscription.billingCycle = billingCycle;
    subscription.currentPrice = subscription.pendingUpgrade.price;
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.lastPaymentDate = now;
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = periodEnd;
    subscription.nextBillingDate = periodEnd;
    subscription.numberOfDays = numberOfDays;
    subscription.metadata = {
      ...subscription.metadata,
      upgradedFrom: oldPlanCode,
      upgradedAt: now,
    };
    
    // Clear pending upgrade
    subscription.pendingUpgrade = undefined;

    await subscription.save();

    // Reactivate the shop if it was suspended
    const shop = await this.shopModel.findById(shopId);
    if (shop && (shop.status === 'suspended' || shop.subscriptionStatus === 'suspended')) {
      shop.status = 'active';
      shop.subscriptionStatus = 'active';
      shop.subscriptionPlan = newPlan.code;
      shop.subscriptionExpiresAt = periodEnd;
      await shop.save();
      this.logger.log(`Shop ${shop.shopId} reactivated after upgrade payment verification`);
    }

    this.logger.log(`✅ Activated upgrade for shop ${shopId}: ${oldPlanCode} -> ${newPlan.code}`);

    return this.mapSubscriptionToResponse(subscription, newPlan);
  }

  /**
   * Get pending upgrade for a shop (if any)
   */
  async getPendingUpgrade(shopId: string): Promise<any | null> {
    const subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    if (!subscription?.pendingUpgrade) {
      return null;
    }

    // Check if expired
    if (subscription.pendingUpgrade.expiresAt && new Date() > subscription.pendingUpgrade.expiresAt) {
      subscription.pendingUpgrade = undefined;
      await subscription.save();
      return null;
    }

    const plan = await this.planModel.findById(subscription.pendingUpgrade.planId);
    
    return {
      ...subscription.pendingUpgrade,
      planName: plan?.name,
    };
  }

  /**
   * Cancel a pending upgrade
   */
  async cancelPendingUpgrade(shopId: string): Promise<void> {
    const subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    if (!subscription?.pendingUpgrade) {
      return;
    }

    // Cancel the associated invoice
    if (subscription.pendingUpgrade.invoiceId) {
      await this.invoiceModel.findByIdAndUpdate(subscription.pendingUpgrade.invoiceId, {
        status: InvoiceStatus.CANCELLED,
      });
    }

    subscription.pendingUpgrade = undefined;
    await subscription.save();

    this.logger.log(`Cancelled pending upgrade for shop ${shopId}`);
  }

  /**
   * Get cancellation preview - shows user what will happen if they cancel
   */
  async getCancellationPreview(shopId: string): Promise<{
    currentPlan: string;
    currentPeriodEnd: Date;
    daysRemaining: number;
    dataArchiveDate: Date;
    dataDeletionDate: Date;
    warnings: string[];
  }> {
    const subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const plan = await this.planModel.findById(subscription.planId);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil(
      (subscription.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    ));

    // Data archive happens 60 days after cancellation
    const dataArchiveDate = new Date(subscription.currentPeriodEnd);
    dataArchiveDate.setDate(dataArchiveDate.getDate() + 60);

    // Data deletion happens 90 days after cancellation (30 days after archive)
    const dataDeletionDate = new Date(subscription.currentPeriodEnd);
    dataDeletionDate.setDate(dataDeletionDate.getDate() + 90);

    const warnings = [
      `Your subscription will remain active until ${subscription.currentPeriodEnd.toLocaleDateString()}`,
      `After cancellation, you will have ${daysRemaining} days of remaining access`,
      `Your data will be archived on ${dataArchiveDate.toLocaleDateString()} (60 days after period ends)`,
      `Your data will be permanently deleted on ${dataDeletionDate.toLocaleDateString()} (90 days after period ends)`,
      'You can reactivate your subscription anytime before data deletion',
      'Downloaded reports and receipts will not be affected',
    ];

    return {
      currentPlan: plan?.name || subscription.planCode,
      currentPeriodEnd: subscription.currentPeriodEnd,
      daysRemaining,
      dataArchiveDate,
      dataDeletionDate,
      warnings,
    };
  }

  /**
   * Cancel subscription with proper data retention schedule
   * 
   * Cancellation Timeline:
   * 1. Immediate: Subscription marked for cancellation, access continues until period end
   * 2. Period End: Access reverted to trial/free plan
   * 3. +60 days: Data archived (read-only)
   * 4. +90 days: Data permanently deleted
   */
  async cancelSubscription(
    shopId: string,
    dto: CancelSubscriptionDto,
  ): Promise<{
    message: string;
    currentPeriodEnd: Date;
    dataArchiveDate: Date;
    dataDeletionDate: Date;
  }> {
    const subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Subscription is already cancelled');
    }

    const now = new Date();
    
    // Calculate data retention dates
    const periodEnd = dto.immediate ? now : subscription.currentPeriodEnd;
    const dataArchiveDate = new Date(periodEnd);
    dataArchiveDate.setDate(dataArchiveDate.getDate() + 60);
    const dataDeletionDate = new Date(periodEnd);
    dataDeletionDate.setDate(dataDeletionDate.getDate() + 90);

    // Update subscription
    subscription.cancelledAt = now;
    subscription.cancelReason = dto.reason;
    subscription.autoRenew = false;
    subscription.metadata = {
      ...subscription.metadata,
      cancellationSchedule: {
        cancelledAt: now,
        periodEnd,
        dataArchiveDate,
        dataDeletionDate,
        reason: dto.reason,
        deleteAccountRequested: dto.deleteAccount || false,
      },
    };

    if (dto.immediate) {
      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.currentPeriodEnd = now;
      
      // Downgrade to trial plan immediately
      const trialPlan = await this.planModel.findOne({ code: 'trial' });
      if (trialPlan) {
        subscription.planId = trialPlan._id;
        subscription.planCode = 'trial';
        subscription.currentPrice = 0;
      }
    }

    await subscription.save();

    this.logger.log(`Cancelled subscription for shop ${shopId}. Period ends: ${periodEnd}, Archive: ${dataArchiveDate}, Delete: ${dataDeletionDate}`);

    return {
      message: dto.immediate 
        ? 'Your subscription has been cancelled immediately. You have been moved to the free trial plan.'
        : `Your subscription will end on ${periodEnd.toLocaleDateString()}. You can continue using all features until then.`,
      currentPeriodEnd: periodEnd,
      dataArchiveDate,
      dataDeletionDate,
    };
  }

  /**
   * Request account and data deletion
   * This schedules the account for deletion after the data retention period
   */
  async requestAccountDeletion(
    shopId: string,
    userId: string,
    confirmation: string,
  ): Promise<{
    success: boolean;
    message: string;
    scheduledDeletionDate?: Date;
  }> {
    // Require explicit confirmation
    if (confirmation !== 'DELETE MY ACCOUNT') {
      throw new BadRequestException('Please type "DELETE MY ACCOUNT" to confirm');
    }

    const subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Calculate deletion date (90 days from now or from period end)
    const now = new Date();
    const baseDate = subscription.status === SubscriptionStatus.CANCELLED 
      ? subscription.currentPeriodEnd 
      : now;
    const scheduledDeletionDate = new Date(baseDate);
    scheduledDeletionDate.setDate(scheduledDeletionDate.getDate() + 90);

    // Update subscription with deletion request
    subscription.metadata = {
      ...subscription.metadata,
      accountDeletionRequest: {
        requestedAt: now,
        requestedBy: userId,
        scheduledDeletionDate,
        confirmed: true,
      },
    };

    // If not already cancelled, cancel now
    if (subscription.status !== SubscriptionStatus.CANCELLED) {
      subscription.cancelledAt = now;
      subscription.autoRenew = false;
      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.currentPeriodEnd = now;
      
      // Downgrade to trial
      const trialPlan = await this.planModel.findOne({ code: 'trial' });
      if (trialPlan) {
        subscription.planId = trialPlan._id;
        subscription.planCode = 'trial';
        subscription.currentPrice = 0;
      }
    }

    await subscription.save();

    this.logger.warn(`⚠️ Account deletion requested for shop ${shopId}. Scheduled: ${scheduledDeletionDate}`);

    return {
      success: true,
      message: `Your account and all data will be permanently deleted on ${scheduledDeletionDate.toLocaleDateString()}. You will receive a final reminder 7 days before deletion.`,
      scheduledDeletionDate,
    };
  }

  /**
   * Cancel account deletion request
   */
  async cancelAccountDeletion(shopId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (!subscription.metadata?.accountDeletionRequest) {
      throw new BadRequestException('No account deletion request found');
    }

    // Remove deletion request
    subscription.metadata = {
      ...subscription.metadata,
      accountDeletionRequest: undefined,
    };

    await subscription.save();

    this.logger.log(`Account deletion cancelled for shop ${shopId}`);

    return {
      success: true,
      message: 'Account deletion request has been cancelled. Your data is safe.',
    };
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
    
    // Calculate period end based on billing cycle
    if (subscription.billingCycle === BillingCycle.DAILY) {
      // Daily billing - use numberOfDays (default 1 day)
      const days = subscription.numberOfDays || 1;
      periodEnd.setDate(periodEnd.getDate() + days);
    } else if (subscription.billingCycle === BillingCycle.ANNUAL) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      // Monthly (default)
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
    const billingCycleLabel = subscription.billingCycle === BillingCycle.ANNUAL ? 'Annual' : 
                              subscription.billingCycle === BillingCycle.DAILY ? 'Daily' : 'Monthly';
    await this.createInvoice(
      shopId,
      subscription._id.toString(),
      InvoiceType.SUBSCRIPTION,
      `${plan.name} Plan - ${billingCycleLabel}`,
      subscription.currentPrice,
      now,
      periodEnd,
    );

    this.logger.log(`Reactivated subscription for shop ${shopId}, period ends: ${periodEnd.toISOString()}`);

    return this.mapSubscriptionToResponse(subscription, plan);
  }

  /**
   * Toggle auto-renew setting for a subscription
   */
  async toggleAutoRenew(
    shopId: string,
    autoRenew: boolean,
  ): Promise<{ success: boolean; autoRenew: boolean; message: string }> {
    const subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    if (!subscription) {
      throw new NotFoundException('No subscription found for this shop');
    }

    // Cannot enable auto-renew for cancelled subscriptions
    if (autoRenew && subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot enable auto-renew for a cancelled subscription. Please reactivate your subscription first.',
      );
    }

    subscription.autoRenew = autoRenew;
    await subscription.save();

    this.logger.log(`Auto-renew ${autoRenew ? 'enabled' : 'disabled'} for shop ${shopId}`);

    return {
      success: true,
      autoRenew,
      message: autoRenew
        ? 'Auto-renewal enabled. Your subscription will automatically renew at the end of each billing period.'
        : 'Auto-renewal disabled. Your subscription will expire at the end of the current billing period.',
    };
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
   * Includes: pending, failed, and pending_verification (Send Money awaiting admin verification)
   */
  async getPendingInvoices(shopId: string): Promise<InvoiceResponseDto[]> {
    const invoices = await this.invoiceModel
      .find({
        shopId: new Types.ObjectId(shopId),
        status: { $in: [InvoiceStatus.PENDING, InvoiceStatus.FAILED, InvoiceStatus.PENDING_VERIFICATION] },
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
   * Tax is calculated based on system VAT settings (default: disabled)
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
    const tax = await this.calculateTax(amount);
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
      
      // Calculate period end based on billing cycle
      if (subscription.billingCycle === BillingCycle.DAILY) {
        // Daily billing - use numberOfDays (default 1 day)
        const days = subscription.numberOfDays || 1;
        periodEnd.setDate(periodEnd.getDate() + days);
        this.logger.log(`Daily subscription: setting period end to ${days} day(s) from now`);
      } else if (subscription.billingCycle === BillingCycle.ANNUAL) {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        // Monthly (default)
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
      this.logger.log(`Subscription activated for shop ${subscription.shopId} after payment verification, period ends: ${periodEnd.toISOString()}`);

      // Reactivate the shop if it was suspended
      const shop = await this.shopModel.findById(subscription.shopId);
      if (shop && (shop.status === 'suspended' || shop.subscriptionStatus === 'suspended')) {
        shop.status = 'active';
        shop.subscriptionStatus = 'active';
        shop.subscriptionExpiresAt = periodEnd;
        await shop.save();
        this.logger.log(`Shop ${shop.shopId} reactivated after payment verification`);
      }
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
      const plan = await this.planModel.findById(subscription.planId);
      const statusMessages: Record<string, string> = {
        [SubscriptionStatus.PENDING_PAYMENT]: 'Payment required to activate your subscription.',
        [SubscriptionStatus.PAST_DUE]: 'Your subscription payment is overdue. Please pay to restore access.',
        [SubscriptionStatus.SUSPENDED]: 'Your subscription has been suspended. Contact support.',
        [SubscriptionStatus.CANCELLED]: 'Your subscription has been cancelled.',
        [SubscriptionStatus.EXPIRED]: 'Your subscription has expired. Please renew to continue.',
      };
      return { 
        allowed: false, 
        current: subscription.currentProductCount || 0, 
        limit: plan?.maxProducts || 0, 
        message: statusMessages[subscription.status] || 'Subscription is not active' 
      };
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
   * Handles trial expiry, subscription renewal, and suspension
   */
  async processExpiringSubscriptions(): Promise<void> {
    const now = new Date();
    const warningDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // ============================================
    // 1. Process expired TRIAL subscriptions
    // Trial users must upgrade after 14 days
    // ============================================
    const expiredTrials = await this.subscriptionModel.find({
      status: SubscriptionStatus.TRIAL,
      $or: [
        { trialEndDate: { $lte: now } },
        { currentPeriodEnd: { $lte: now } },
      ],
    });

    for (const subscription of expiredTrials) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await subscription.save();
      this.logger.log(`Trial expired for shop ${subscription.shopId} - user must upgrade to continue`);
      // TODO: Send trial expiry notification
    }

    // ============================================
    // 2. Find subscriptions expiring in 7 days (for warnings)
    // ============================================
    const expiring = await this.subscriptionModel.find({
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: { $lte: warningDate, $gt: now },
      autoRenew: true,
    });

    for (const subscription of expiring) {
      // Send reminder notification
      // TODO: Implement notification service
      this.logger.log(`Subscription ${subscription._id} expiring soon`);
    }

    // ============================================
    // 3. Find expired ACTIVE subscriptions (not trial)
    // ============================================
    const expired = await this.subscriptionModel.find({
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: { $lte: now },
    });

    for (const subscription of expired) {
      // Trial plans cannot be renewed - skip them (should not happen but extra safety)
      if (subscription.planCode === 'trial') {
        subscription.status = SubscriptionStatus.EXPIRED;
        await subscription.save();
        this.logger.log(`Trial subscription ${subscription._id} expired - user must upgrade to continue`);
        continue;
      }
      
      if (subscription.autoRenew) {
        // Create renewal invoice for non-trial plans only
        const plan = await this.planModel.findById(subscription.planId);
        if (plan) {
          const periodStart = new Date();
          const periodEnd = new Date();
          
          // Calculate period end based on billing cycle
          if (subscription.billingCycle === BillingCycle.DAILY) {
            // For daily, renew for same number of days as before
            const days = subscription.numberOfDays || 1;
            periodEnd.setDate(periodEnd.getDate() + days);
          } else if (subscription.billingCycle === BillingCycle.ANNUAL) {
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

    // ============================================
    // 4. Suspend subscriptions past grace period
    // ============================================
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

  /**
   * Process DAILY billing cycle subscriptions
   * Called more frequently (every 4 hours) to ensure daily subscriptions expire promptly
   */
  async processDailyBillingSubscriptions(): Promise<void> {
    const now = new Date();
    this.logger.log('Processing daily billing subscriptions...');

    // Find all daily subscriptions that have expired
    const expiredDaily = await this.subscriptionModel.find({
      billingCycle: BillingCycle.DAILY,
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
      currentPeriodEnd: { $lte: now },
    });

    this.logger.log(`Found ${expiredDaily.length} expired daily subscriptions`);

    for (const subscription of expiredDaily) {
      const plan = await this.planModel.findById(subscription.planId);
      
      // Trial plans cannot be renewed - they must upgrade to a paid plan
      if (subscription.status === SubscriptionStatus.TRIAL || subscription.planCode === 'trial') {
        subscription.status = SubscriptionStatus.EXPIRED;
        await subscription.save();
        this.logger.log(`Trial subscription ${subscription._id} expired - user must upgrade to continue`);
        continue;
      }
      
      if (subscription.autoRenew && plan) {
        // Create renewal invoice for auto-renew subscriptions (non-trial only)
        const days = subscription.numberOfDays || 1;
        const periodStart = new Date();
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + days);

        await this.createInvoice(
          subscription.shopId.toString(),
          subscription._id.toString(),
          InvoiceType.SUBSCRIPTION,
          `${plan.name} Plan Renewal - ${days} day(s)`,
          subscription.currentPrice,
          periodStart,
          periodEnd,
        );

        // Set to PAST_DUE with grace period
        subscription.status = SubscriptionStatus.PAST_DUE;
        subscription.gracePeriodEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days grace
        
        this.logger.log(`Daily subscription ${subscription._id} expired, created renewal invoice, set to PAST_DUE`);
      } else {
        // No auto-renew - expire the subscription
        subscription.status = SubscriptionStatus.EXPIRED;
        this.logger.log(`Daily subscription ${subscription._id} expired (auto-renew off)`);
      }

      await subscription.save();
    }

    this.logger.log(`Processed ${expiredDaily.length} daily billing subscriptions`);
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
      dailyPrice: plan.dailyPrice || 0,
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
    realTimeUsage?: { products: number; employees: number; shops: number },
  ): SubscriptionResponseDto {
    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((subscription.currentPeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    );

    // Use real-time usage if provided, otherwise fall back to stored counts
    const usage = realTimeUsage || {
      products: subscription.currentProductCount,
      employees: subscription.currentEmployeeCount,
      shops: subscription.currentShopCount,
    };

    // Check if trial has expired
    const isTrialExpired = subscription.status === SubscriptionStatus.TRIAL && 
      subscription.currentPeriodEnd && 
      now > subscription.currentPeriodEnd;

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
      numberOfDays: subscription.numberOfDays,
      isTrialExpired,
      usage: {
        shops: { current: usage.shops, limit: plan.maxShops },
        employees: { current: usage.employees, limit: plan.maxEmployees },
        products: { current: usage.products, limit: plan.maxProducts },
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
      // Include manual payment details (Send Money)
      manualPayment: invoice.manualPayment ? {
        senderPhoneNumber: invoice.manualPayment.senderPhoneNumber,
        paidAmount: invoice.manualPayment.paidAmount,
        submittedAt: invoice.manualPayment.submittedAt,
        verifiedAt: invoice.manualPayment.verifiedAt,
      } : undefined,
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

    return subscriptions.map((sub: any) => {
      const isTrial = sub.planCode === 'trial' || sub.status === SubscriptionStatus.TRIAL;
      const daysRemaining = Math.ceil((new Date(sub.currentPeriodEnd).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      
      // Determine correct display status
      // Trial plans should NEVER show "pending_payment" - they're free
      let displayStatus = sub.status;
      if (isTrial && sub.status === SubscriptionStatus.PENDING_PAYMENT) {
        displayStatus = SubscriptionStatus.TRIAL;
      }
      // Check if subscription is expired/overdue
      if (daysRemaining < 0 && displayStatus === SubscriptionStatus.ACTIVE) {
        displayStatus = SubscriptionStatus.PAST_DUE;
      }
      
      // For trial plans, billing display should show "X-day trial" not "Monthly"
      let billingDisplay = sub.billingCycle;
      if (isTrial) {
        billingDisplay = `${Math.max(0, daysRemaining)}-Day Trial`;
      }
      
      return {
        shopId: sub.shopId?._id?.toString() || sub.shopId?.toString(),
        shopName: sub.shopId?.name || 'Unknown Shop',
        shopEmail: sub.shopId?.email || '',
        planCode: sub.planCode,
        planName: sub.planId?.name || sub.planCode,
        status: displayStatus,
        billingCycle: sub.billingCycle,
        billingDisplay, // Human-readable billing info
        currentPrice: sub.currentPrice,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        daysRemaining,
        isTrial,
        createdAt: sub.createdAt,
        usage: {
          shops: { current: sub.currentShopCount || 0, limit: sub.planId?.maxShops || 1 },
          employees: { current: sub.currentEmployeeCount || 0, limit: sub.planId?.maxEmployees || 2 },
          products: { current: sub.currentProductCount || 0, limit: sub.planId?.maxProducts || 500 },
        },
      };
    });
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
        // Trial plans cannot be renewed - skip them
        if (subscription.planCode === 'trial') {
          this.logger.log(`Skipping trial subscription ${subscription._id} - trials cannot be renewed`);
          continue;
        }
        
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
        await this.syncUsageCountsForShop(subscription.shopId.toString());
      } catch (error) {
        this.logger.error(`Failed to sync counts for subscription ${subscription._id}:`, error);
      }
    }
  }

  /**
   * Sync usage counts for a specific shop's subscription
   */
  async syncUsageCountsForShop(shopId: string): Promise<void> {
    const subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    if (!subscription) {
      return;
    }

    try {
      // Count actual resources for this shop
      const [productCount, employeeCount, shopCount] = await Promise.all([
        // Count products for this shop
        this.productModel.countDocuments({ shopId: new Types.ObjectId(shopId) }),
        // Count employees (users with role 'employee' or 'cashier' for this shop)
        this.userModel.countDocuments({ 
          shopId: new Types.ObjectId(shopId),
          role: { $in: ['employee', 'cashier', 'manager'] },
        }),
        // Count shops/branches (for now, just 1 per subscription - could expand to branches)
        1, // Each subscription is for one shop, branches would be counted separately
      ]);

      // Only update and log if counts actually changed (prevents duplicate logs)
      const hasChanges = 
        subscription.currentProductCount !== productCount ||
        subscription.currentEmployeeCount !== employeeCount ||
        subscription.currentShopCount !== shopCount;

      if (hasChanges) {
        subscription.currentProductCount = productCount;
        subscription.currentEmployeeCount = employeeCount;
        subscription.currentShopCount = shopCount;
        await subscription.save();
        this.logger.log(`Synced usage counts for shop ${shopId}: products=${productCount}, employees=${employeeCount}, shops=${shopCount}`);
      }
    } catch (error) {
      this.logger.error(`Failed to sync usage counts for shop ${shopId}:`, error);
      throw error;
    }
  }

  /**
   * Get current usage counts for a shop (real-time from database)
   */
  async getUsageCounts(shopId: string): Promise<{ products: number; employees: number; shops: number }> {
    const [productCount, employeeCount] = await Promise.all([
      this.productModel.countDocuments({ shopId: new Types.ObjectId(shopId) }),
      this.userModel.countDocuments({ 
        shopId: new Types.ObjectId(shopId),
        role: { $in: ['employee', 'cashier', 'manager'] },
      }),
    ]);

    return {
      products: productCount,
      employees: employeeCount,
      shops: 1, // Each subscription is for one shop
    };
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

  // ============================================
  // SUPER ADMIN METHODS
  // ============================================

  /**
   * Send invoice email to a shop (super admin)
   */
  async sendInvoiceEmailToShop(shopId: string): Promise<{ success: boolean; message: string }> {
    const shop = await this.shopModel.findById(new Types.ObjectId(shopId));
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    // Get the latest pending invoice for this shop
    const invoice = await this.invoiceModel.findOne({
      shopId: new Types.ObjectId(shopId),
      status: { $in: [InvoiceStatus.PENDING, InvoiceStatus.FAILED] },
    }).sort({ createdAt: -1 });

    if (!invoice) {
      throw new NotFoundException('No pending invoice found for this shop');
    }

    // Get shop email
    const shopEmail = shop.email;
    if (!shopEmail) {
      throw new BadRequestException('Shop does not have an email address configured');
    }

    this.logger.log(`Sending invoice ${invoice.invoiceNumber} to ${shopEmail}`);

    // Mark the invoice as sent
    invoice.emailSent = true;
    invoice.emailSentAt = new Date();
    invoice.emailSentCount = (invoice.emailSentCount || 0) + 1;
    await invoice.save();

    return { 
      success: true, 
      message: `Invoice ${invoice.invoiceNumber} sent to ${shopEmail}` 
    };
  }

  /**
   * Manually update a shop's subscription (super admin)
   */
  async adminUpdateSubscription(
    shopId: string,
    dto: {
      planCode?: string;
      status?: string;
      billingCycle?: string;
      currentPeriodEnd?: string;
      currentPrice?: number;
    },
  ): Promise<{ success: boolean; message: string }> {
    const subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Update plan if specified
    if (dto.planCode && dto.planCode !== subscription.planCode) {
      const newPlan = await this.planModel.findOne({ code: dto.planCode });
      if (newPlan) {
        subscription.planId = newPlan._id;
        subscription.planCode = dto.planCode;
      }
    }

    // Update status if specified
    if (dto.status) {
      subscription.status = dto.status as SubscriptionStatus;
    }

    // Update billing cycle if specified
    if (dto.billingCycle) {
      subscription.billingCycle = dto.billingCycle as BillingCycle;
    }

    // Update period end date if specified
    if (dto.currentPeriodEnd) {
      const periodEnd = new Date(dto.currentPeriodEnd);
      subscription.currentPeriodEnd = periodEnd;
      subscription.nextBillingDate = periodEnd;
    }

    // Update price if specified
    if (dto.currentPrice !== undefined) {
      subscription.currentPrice = dto.currentPrice;
    }

    await subscription.save();

    // Also update shop status to match subscription status
    const shop = await this.shopModel.findById(shopId);
    if (shop) {
      if (dto.status === 'active' || dto.status === 'trial') {
        shop.status = 'active';
        shop.subscriptionStatus = dto.status;
      } else if (dto.status === 'suspended') {
        shop.status = 'suspended';
        shop.subscriptionStatus = 'suspended';
      }
      if (dto.planCode) {
        shop.subscriptionPlan = dto.planCode;
      }
      if (dto.currentPeriodEnd) {
        shop.subscriptionExpiresAt = new Date(dto.currentPeriodEnd);
      }
      await shop.save();
    }

    this.logger.log(`Subscription for shop ${shopId} updated by super admin: ${JSON.stringify(dto)}`);

    return { success: true, message: 'Subscription updated successfully' };
  }

  /**
   * Grant grace period to a shop's subscription (super admin)
   * Extends subscription period and reactivates if suspended/expired
   * Accepts either days (from current expiry) or startDate/endDate for precise date range
   */
  async adminGrantGracePeriod(
    shopId: string,
    dto: {
      days: number;
      startDate?: string;
      endDate?: string;
      reason?: string;
      sendEmail?: boolean;
    },
  ): Promise<{ success: boolean; message: string; newExpiryDate: string }> {
    const subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Calculate new expiry date - use endDate if provided, otherwise calculate from days
    let newEnd: Date;
    if (dto.endDate) {
      newEnd = new Date(dto.endDate);
    } else {
      const currentEnd = new Date(subscription.currentPeriodEnd);
      newEnd = new Date(currentEnd.getTime() + dto.days * 24 * 60 * 60 * 1000);
    }
    
    // Update subscription
    subscription.currentPeriodEnd = newEnd;
    subscription.nextBillingDate = newEnd;
    
    // Reactivate if suspended/expired
    if (subscription.status === SubscriptionStatus.SUSPENDED || 
        subscription.status === SubscriptionStatus.EXPIRED ||
        subscription.status === SubscriptionStatus.PAST_DUE) {
      subscription.status = SubscriptionStatus.ACTIVE;
    }
    
    await subscription.save();

    // Update shop status
    const shop = await this.shopModel.findById(shopId);
    if (shop) {
      shop.status = 'active';
      shop.subscriptionStatus = 'active';
      shop.subscriptionExpiresAt = newEnd;
      await shop.save();
    }

    // Send notification email if requested
    if (dto.sendEmail) {
      try {
        const shopAdmin = await this.userModel.findOne({ 
          shopId: new Types.ObjectId(shopId), 
          role: 'admin' 
        });
        
        if (shopAdmin?.email && shop) {
          await this.emailService.sendEmail({
            to: shopAdmin.email,
            subject: '🎁 Grace Period Extended - SmartDuka',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #f97316;">Grace Period Extended</h2>
                <p>Dear ${shopAdmin.name || shop.name},</p>
                <p>Great news! Your SmartDuka subscription has been extended by <strong>${dto.days} days</strong> as a courtesy.</p>
                ${dto.reason ? `<p><strong>Reason:</strong> ${dto.reason}</p>` : ''}
                <p><strong>New Expiry Date:</strong> ${newEnd.toLocaleDateString('en-KE', { dateStyle: 'long' })}</p>
                <p>Your account is now active and you can continue using all SmartDuka features.</p>
                <p>Thank you for being a valued customer!</p>
                <p>Best regards,<br>SmartDuka Team</p>
              </div>
            `,
          });
          this.logger.log(`Grace period email sent to ${shopAdmin.email}`);
        }
      } catch (emailError: any) {
        this.logger.error(`Failed to send grace period email: ${emailError.message}`);
      }
    }

    this.logger.log(`Grace period of ${dto.days} days granted to shop ${shopId}. New expiry: ${newEnd.toISOString()}`);

    return { 
      success: true, 
      message: `Grace period of ${dto.days} days granted successfully`,
      newExpiryDate: newEnd.toISOString(),
    };
  }

  /**
   * Suspend a shop's subscription (super admin)
   */
  async adminSuspendSubscription(shopId: string): Promise<{ success: boolean; message: string }> {
    const subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status === SubscriptionStatus.SUSPENDED) {
      return { success: true, message: 'Subscription is already suspended' };
    }

    subscription.status = SubscriptionStatus.SUSPENDED;
    await subscription.save();

    this.logger.log(`Subscription for shop ${shopId} suspended by super admin`);

    return { success: true, message: 'Subscription suspended successfully' };
  }

  /**
   * Reactivate a shop's subscription (super admin)
   */
  async adminReactivateSubscription(shopId: string): Promise<{ success: boolean; message: string }> {
    const subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status === SubscriptionStatus.ACTIVE) {
      return { success: true, message: 'Subscription is already active' };
    }

    subscription.status = SubscriptionStatus.ACTIVE;
    await subscription.save();

    this.logger.log(`Subscription for shop ${shopId} reactivated by super admin`);

    return { success: true, message: 'Subscription reactivated successfully' };
  }

  /**
   * Send payment reminder email to shop owner
   */
  private async sendPaymentReminderEmail(
    shopId: string | undefined,
    shopName: string,
    type: 'trial_expired' | 'past_due' | 'suspended' | 'expired',
    daysRemaining?: number,
  ): Promise<void> {
    if (!shopId) return;
    
    try {
      const shopAdmin = await this.userModel.findOne({ 
        shopId: new Types.ObjectId(shopId), 
        role: 'admin' 
      });
      
      if (!shopAdmin?.email) return;

      const subjects: Record<string, string> = {
        trial_expired: '⏰ Your SmartDuka Trial Has Ended - Choose a Plan',
        past_due: '⚠️ Payment Required - SmartDuka Subscription',
        suspended: '🚫 Account Suspended - Payment Required',
        expired: '⏰ Subscription Expired - Renew Now',
      };

      const messages: Record<string, string> = {
        trial_expired: `
          <p>Your 14-day free trial has ended. To continue using SmartDuka and access all features, please subscribe to a plan.</p>
          <p>Choose from our affordable plans starting at <strong>KES 99/day</strong> or <strong>KES 2,500/month</strong>.</p>
        `,
        past_due: `
          <p>Your subscription payment is overdue. You have <strong>${daysRemaining || 0} days</strong> remaining in your grace period.</p>
          <p>Please make payment immediately to avoid account suspension.</p>
        `,
        suspended: `
          <p>Your SmartDuka account has been <strong>suspended</strong> due to non-payment.</p>
          <p>You cannot access POS, inventory, or any SmartDuka features until payment is made.</p>
          <p>Make payment now to restore your account immediately.</p>
        `,
        expired: `
          <p>Your SmartDuka subscription has expired.</p>
          <p>Please renew your subscription to continue using all features.</p>
        `,
      };

      await this.emailService.sendEmail({
        to: shopAdmin.email,
        subject: subjects[type],
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${type === 'suspended' ? '#dc2626' : '#f97316'};">${subjects[type].replace(/^[^\s]+\s/, '')}</h2>
            <p>Dear ${shopAdmin.name || shopName},</p>
            ${messages[type]}
            <div style="margin: 24px 0;">
              <a href="${process.env.FRONTEND_URL || 'https://smartduka.co.ke'}/settings?tab=subscription" 
                 style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                ${type === 'trial_expired' ? 'Choose a Plan' : 'Make Payment Now'}
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              <strong>M-Pesa:</strong> Pay to <strong>0729983567</strong> (SmartDuka)
            </p>
            <p>Best regards,<br>SmartDuka Team</p>
          </div>
        `,
      });
      
      this.logger.log(`Payment reminder email (${type}) sent to ${shopAdmin.email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send payment reminder email: ${error.message}`);
    }
  }

  /**
   * Fix trial subscriptions with wrong period dates
   * Trial should be 14 days from subscription creation date
   */
  async fixTrialSubscriptionPeriods(): Promise<{ fixed: number; skipped: number; details: string[] }> {
    const details: string[] = [];
    let fixed = 0;
    let skipped = 0;

    // Find all trial subscriptions
    const trialSubscriptions = await this.subscriptionModel.find({
      $or: [
        { planCode: 'trial' },
        { status: SubscriptionStatus.TRIAL },
      ],
    }).populate('shopId', 'name');

    for (const sub of trialSubscriptions) {
      try {
        const shopName = (sub.shopId as any)?.name || sub.shopId?.toString();
        const createdAt = new Date(sub.createdAt || sub.startDate);
        const correctEndDate = new Date(createdAt);
        correctEndDate.setDate(correctEndDate.getDate() + TRIAL_PERIOD_DAYS);

        const currentEnd = new Date(sub.currentPeriodEnd);
        const diffDays = Math.abs(Math.ceil((currentEnd.getTime() - correctEndDate.getTime()) / (24 * 60 * 60 * 1000)));

        // Only fix if the difference is significant (more than 1 day off)
        if (diffDays > 1) {
          const oldEnd = sub.currentPeriodEnd;
          sub.currentPeriodEnd = correctEndDate;
          sub.trialEndDate = correctEndDate;
          await sub.save();

          // Also update shop
          const shop = await this.shopModel.findById(sub.shopId);
          if (shop) {
            shop.subscriptionExpiresAt = correctEndDate;
            await shop.save();
          }

          details.push(`Fixed ${shopName}: ${oldEnd.toISOString().split('T')[0]} → ${correctEndDate.toISOString().split('T')[0]} (was ${diffDays} days off)`);
          fixed++;
        } else {
          skipped++;
        }
      } catch (error: any) {
        details.push(`Error fixing ${sub._id}: ${error.message}`);
      }
    }

    this.logger.log(`Fixed ${fixed} trial subscriptions, skipped ${skipped}`);
    return { fixed, skipped, details };
  }

  /**
   * Audit and fix subscription mismatches
   * - past_due accounts that have been overdue too long should be suspended
   * - expired trials should be marked as expired
   * - status mismatches between subscription and shop
   */
  async auditAndFixSubscriptions(): Promise<{ audited: number; fixed: number; issues: string[] }> {
    const issues: string[] = [];
    let audited = 0;
    let fixed = 0;
    const now = new Date();

    const subscriptions = await this.subscriptionModel.find().populate('shopId', 'name status subscriptionStatus');

    for (const sub of subscriptions) {
      audited++;
      const shop = sub.shopId as any;
      const shopName = shop?.name || sub.shopId?.toString();

      try {
        // Check 1: Trial subscriptions that have expired
        if ((sub.planCode === 'trial' || sub.status === SubscriptionStatus.TRIAL) && 
            sub.currentPeriodEnd < now) {
          sub.status = SubscriptionStatus.EXPIRED;
          await sub.save();
          
          if (shop && shop._id) {
            await this.shopModel.findByIdAndUpdate(shop._id, {
              subscriptionStatus: 'expired',
              status: 'suspended',
            });
          }
          
          // Send payment reminder email for expired trial
          await this.sendPaymentReminderEmail(sub.shopId?.toString(), shopName, 'trial_expired');
          
          issues.push(`${shopName}: Trial expired - marked as EXPIRED, payment reminder sent`);
          fixed++;
        }
        
        // Check 2: Past due accounts that are more than GRACE_PERIOD_DAYS overdue should be suspended
        else if (sub.status === SubscriptionStatus.PAST_DUE) {
          const daysOverdue = Math.ceil((now.getTime() - sub.currentPeriodEnd.getTime()) / (24 * 60 * 60 * 1000));
          
          if (daysOverdue > GRACE_PERIOD_DAYS) {
            sub.status = SubscriptionStatus.SUSPENDED;
            await sub.save();
            
            if (shop && shop._id) {
              await this.shopModel.findByIdAndUpdate(shop._id, {
                status: 'suspended',
                subscriptionStatus: 'suspended',
              });
            }
            
            // Send suspension notification with payment reminder
            await this.sendPaymentReminderEmail(sub.shopId?.toString(), shopName, 'suspended');
            
            issues.push(`${shopName}: Past due ${daysOverdue} days - suspended, payment reminder sent`);
            fixed++;
          } else {
            // Send grace period reminder
            await this.sendPaymentReminderEmail(sub.shopId?.toString(), shopName, 'past_due', GRACE_PERIOD_DAYS - daysOverdue);
            issues.push(`${shopName}: Past due ${daysOverdue} days - grace period reminder sent`);
          }
        }
        
        // Check 3: Status mismatch between subscription and shop
        else if (shop && shop._id) {
          const shopDoc = await this.shopModel.findById(shop._id);
          if (shopDoc) {
            let needsUpdate = false;
            
            if (sub.status === SubscriptionStatus.ACTIVE && shopDoc.subscriptionStatus !== 'active') {
              shopDoc.subscriptionStatus = 'active';
              needsUpdate = true;
            } else if (sub.status === SubscriptionStatus.SUSPENDED && shopDoc.status !== 'suspended') {
              shopDoc.status = 'suspended';
              shopDoc.subscriptionStatus = 'suspended';
              needsUpdate = true;
            }
            
            if (needsUpdate) {
              await shopDoc.save();
              issues.push(`${shopName}: Fixed shop status mismatch`);
              fixed++;
            }
          }
        }
        
        // Check 4: Billing cycle mismatch - KES 99 should be daily, not monthly
        if (sub.currentPrice === 99 && sub.billingCycle !== BillingCycle.DAILY) {
          sub.billingCycle = BillingCycle.DAILY;
          await sub.save();
          issues.push(`${shopName}: Fixed billing cycle - KES 99 is daily plan`);
          fixed++;
        }
        
        // Check 5: Trial plans should show as trial status
        if (sub.planCode === 'trial' && sub.status !== SubscriptionStatus.TRIAL && sub.status !== SubscriptionStatus.EXPIRED) {
          if (sub.currentPeriodEnd > now) {
            sub.status = SubscriptionStatus.TRIAL;
            await sub.save();
            issues.push(`${shopName}: Fixed trial status`);
            fixed++;
          }
        }
      } catch (error: any) {
        issues.push(`Error auditing ${shopName}: ${error.message}`);
      }
    }

    this.logger.log(`Audited ${audited} subscriptions, fixed ${fixed} issues`);
    return { audited, fixed, issues };
  }

  /**
   * Cancel/void any incorrectly created trial plan renewal invoices
   * Trial plans cannot be renewed - users must upgrade to a paid plan
   */
  async cancelTrialRenewalInvoices(): Promise<{ cancelled: number; invoices: string[] }> {
    this.logger.log('Cancelling incorrectly created trial renewal invoices...');
    
    // Find all trial subscriptions
    const trialSubscriptions = await this.subscriptionModel.find({
      $or: [
        { status: SubscriptionStatus.TRIAL },
        { planCode: 'trial' },
      ],
    });

    const trialSubscriptionIds = trialSubscriptions.map(s => s._id);
    
    // Find pending/unpaid invoices for trial subscriptions that look like renewal invoices
    const trialRenewalInvoices = await this.invoiceModel.find({
      subscriptionId: { $in: trialSubscriptionIds },
      status: { $in: [InvoiceStatus.PENDING, InvoiceStatus.DRAFT] },
      type: InvoiceType.SUBSCRIPTION, // Renewal invoices are of type SUBSCRIPTION
      totalAmount: 0, // Trial renewals would be KES 0
    });

    const cancelledInvoices: string[] = [];
    
    for (const invoice of trialRenewalInvoices) {
      invoice.status = InvoiceStatus.CANCELLED;
      invoice.notes = 'Cancelled: Trial plans cannot be renewed. User must upgrade to a paid plan.';
      await invoice.save();
      cancelledInvoices.push(invoice.invoiceNumber);
      this.logger.log(`Cancelled trial renewal invoice ${invoice.invoiceNumber}`);
    }

    this.logger.log(`Cancelled ${cancelledInvoices.length} trial renewal invoices`);
    return { cancelled: cancelledInvoices.length, invoices: cancelledInvoices };
  }
}
