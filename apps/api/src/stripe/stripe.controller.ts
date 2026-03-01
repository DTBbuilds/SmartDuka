import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StripeService } from './stripe.service';
import { StripeCustomerService } from './services/stripe-customer.service';
import { StripePaymentService } from './services/stripe-payment.service';
import { StripeSubscriptionService } from './services/stripe-subscription.service';
import { StripeAnalyticsService } from './services/stripe-analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

/**
 * Stripe Controller
 * 
 * Handles all Stripe payment operations including:
 * - Payment intents for POS and subscriptions
 * - Customer management
 * - Subscription management
 * - Analytics and reporting
 * 
 * Mobile-first design with support for Kenyan and global users.
 */
@ApiTags('Stripe Payments')
@Controller('stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly customerService: StripeCustomerService,
    private readonly paymentService: StripePaymentService,
    private readonly subscriptionService: StripeSubscriptionService,
    private readonly analyticsService: StripeAnalyticsService,
  ) {}

  // ============================================
  // CONFIGURATION
  // ============================================

  /**
   * Get Stripe publishable key for frontend
   */
  @Get('config')
  @ApiOperation({ summary: 'Get Stripe configuration for frontend' })
  async getConfig(): Promise<{
    publishableKey: string;
    isConfigured: boolean;
  }> {
    return {
      publishableKey: this.stripeService.getPublishableKey(),
      isConfigured: this.stripeService.isStripeConfigured(),
    };
  }

  // ============================================
  // DONATIONS
  // ============================================

  /**
   * Create payment intent for a donation (no auth required)
   */
  @Post('donation/create-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create payment intent for donation' })
  async createDonationPayment(
    @Body()
    dto: {
      amount: number;
      currency?: string;
      donorEmail?: string;
      donorName?: string;
      message?: string;
    },
  ): Promise<{
    success: boolean;
    paymentIntentId: string;
    clientSecret: string;
    amount: number;
    currency: string;
  }> {
    if (!this.stripeService.isStripeConfigured()) {
      throw new BadRequestException('Stripe is not configured');
    }

    const currency = (dto.currency || 'usd').toLowerCase();
    const amount = Math.round(dto.amount);

    if (amount < 100) {
      throw new BadRequestException('Minimum donation is $1.00 (100 cents)');
    }

    const stripe = this.stripeService.getClient();
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: {
        type: 'donation',
        donorEmail: dto.donorEmail || '',
        donorName: dto.donorName || '',
        message: dto.message || '',
      },
      description: `SmartDuka Donation${dto.donorName ? ` from ${dto.donorName}` : ''}`,
      receipt_email: dto.donorEmail || undefined,
    });

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  }

  // ============================================
  // POS PAYMENTS
  // ============================================

  /**
   * Create payment intent for POS sale
   * Also aliased as /create-payment-intent for backwards compatibility
   */
  @UseGuards(JwtAuthGuard)
  @Post('pos/create-payment')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment intent for POS sale' })
  async createPOSPayment(
    @CurrentUser() user: JwtPayload,
    @Body()
    dto: {
      orderId: string;
      orderNumber: string;
      amount: number;
      currency?: string;
      customerEmail?: string;
      customerName?: string;
      description?: string;
    },
  ): Promise<{
    success: boolean;
    paymentIntentId: string;
    clientSecret: string;
    amount: number;
    currency: string;
  }> {
    if (!this.stripeService.isStripeConfigured()) {
      throw new BadRequestException('Stripe is not configured');
    }

    const result = await this.paymentService.createPOSPayment({
      shopId: user.shopId,
      orderId: dto.orderId,
      orderNumber: dto.orderNumber,
      amount: dto.amount,
      currency: dto.currency,
      customerEmail: dto.customerEmail,
      customerName: dto.customerName,
      description: dto.description,
    });

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Backwards-compatible alias for create-payment-intent
   * Some older clients may call this endpoint
   */
  @UseGuards(JwtAuthGuard)
  @Post('create-payment-intent')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment intent (alias for pos/create-payment)' })
  async createPaymentIntentAlias(
    @CurrentUser() user: JwtPayload,
    @Body()
    dto: {
      orderId?: string;
      orderNumber?: string;
      amount: number;
      currency?: string;
      customerEmail?: string;
      customerName?: string;
      description?: string;
    },
  ): Promise<{
    success: boolean;
    paymentIntentId: string;
    clientSecret: string;
    amount: number;
    currency: string;
  }> {
    if (!this.stripeService.isStripeConfigured()) {
      throw new BadRequestException('Stripe is not configured. Please configure Stripe in your shop settings or contact support.');
    }

    const result = await this.paymentService.createPOSPayment({
      shopId: user.shopId,
      orderId: dto.orderId || `pos-${Date.now()}`,
      orderNumber: dto.orderNumber || `POS-${Date.now()}`,
      amount: dto.amount,
      currency: dto.currency,
      customerEmail: dto.customerEmail,
      customerName: dto.customerName,
      description: dto.description,
    });

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get payment status
   */
  @UseGuards(JwtAuthGuard)
  @Get('payment/:paymentIntentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment status' })
  async getPaymentStatus(
    @Param('paymentIntentId') paymentIntentId: string,
  ): Promise<{
    success: boolean;
    payment: any;
  }> {
    const payment = await this.paymentService.syncPaymentStatus(paymentIntentId);

    return {
      success: true,
      payment: {
        id: payment.stripePaymentIntentId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        paidAt: payment.paidAt,
        receiptUrl: payment.receiptUrl,
      },
    };
  }

  // ============================================
  // SUBSCRIPTION PAYMENTS
  // ============================================

  /**
   * Create payment intent for subscription invoice
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('subscription/create-payment')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment intent for subscription' })
  async createSubscriptionPayment(
    @CurrentUser() user: JwtPayload,
    @Body()
    dto: {
      invoiceId: string;
      invoiceNumber: string;
      amount: number;
      currency?: string;
      description?: string;
    },
  ): Promise<{
    success: boolean;
    paymentIntentId: string;
    clientSecret: string;
    amount: number;
    currency: string;
  }> {
    if (!this.stripeService.isStripeConfigured()) {
      throw new BadRequestException('Stripe is not configured');
    }

    const result = await this.paymentService.createSubscriptionPayment({
      shopId: user.shopId,
      invoiceId: dto.invoiceId,
      invoiceNumber: dto.invoiceNumber,
      amount: dto.amount,
      currency: dto.currency,
      customerEmail: user.email,
      description: dto.description,
    });

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Create a Stripe subscription
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('subscription/create')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe subscription' })
  async createSubscription(
    @CurrentUser() user: JwtPayload,
    @Body()
    dto: {
      priceId: string;
      planCode: string;
      trialDays?: number;
    },
  ): Promise<{
    success: boolean;
    subscriptionId: string;
    clientSecret?: string;
    status: string;
  }> {
    if (!this.stripeService.isStripeConfigured()) {
      throw new BadRequestException('Stripe is not configured');
    }

    const result = await this.subscriptionService.createSubscription({
      shopId: user.shopId,
      email: user.email,
      priceId: dto.priceId,
      planCode: dto.planCode,
      trialDays: dto.trialDays,
    });

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get current subscription
   */
  @UseGuards(JwtAuthGuard)
  @Get('subscription/current')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current subscription' })
  async getCurrentSubscription(
    @CurrentUser() user: JwtPayload,
  ): Promise<{
    success: boolean;
    subscription: any;
  }> {
    const subscription = await this.subscriptionService.getSubscriptionByShopId(user.shopId);

    return {
      success: true,
      subscription: subscription
        ? {
            id: subscription.stripeSubscriptionId,
            status: subscription.status,
            planCode: subscription.planCode,
            amount: subscription.amount,
            currency: subscription.currency,
            interval: subscription.interval,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }
        : null,
    };
  }

  /**
   * Cancel subscription
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('subscription/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancelSubscription(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { cancelAtPeriodEnd?: boolean },
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const subscription = await this.subscriptionService.getSubscriptionByShopId(user.shopId);

    if (!subscription) {
      throw new BadRequestException('No active subscription found');
    }

    await this.subscriptionService.cancelSubscription(
      subscription.stripeSubscriptionId,
      dto.cancelAtPeriodEnd !== false,
    );

    return {
      success: true,
      message: dto.cancelAtPeriodEnd !== false
        ? 'Subscription will be canceled at the end of the billing period'
        : 'Subscription canceled immediately',
    };
  }

  // ============================================
  // CUSTOMER MANAGEMENT
  // ============================================

  /**
   * Get or create customer
   */
  @UseGuards(JwtAuthGuard)
  @Post('customer')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get or create Stripe customer' })
  async getOrCreateCustomer(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { name?: string; phone?: string },
  ): Promise<{
    success: boolean;
    customerId: string;
  }> {
    if (!this.stripeService.isStripeConfigured()) {
      throw new BadRequestException('Stripe is not configured');
    }

    const customer = await this.customerService.getOrCreateCustomer({
      shopId: user.shopId,
      email: user.email,
      name: dto.name,
      phone: dto.phone,
    });

    return {
      success: true,
      customerId: customer.stripeCustomerId,
    };
  }

  /**
   * Create setup intent for saving payment methods
   */
  @UseGuards(JwtAuthGuard)
  @Post('customer/setup-intent')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create setup intent for saving payment method' })
  async createSetupIntent(
    @CurrentUser() user: JwtPayload,
  ): Promise<{
    success: boolean;
    clientSecret: string;
  }> {
    const customer = await this.customerService.getCustomerByShopId(user.shopId);

    if (!customer) {
      throw new BadRequestException('Customer not found. Create customer first.');
    }

    const setupIntent = await this.customerService.createSetupIntent(customer.stripeCustomerId);

    return {
      success: true,
      clientSecret: setupIntent.client_secret!,
    };
  }

  /**
   * List saved payment methods
   */
  @UseGuards(JwtAuthGuard)
  @Get('customer/payment-methods')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List saved payment methods' })
  async listPaymentMethods(
    @CurrentUser() user: JwtPayload,
  ): Promise<{
    success: boolean;
    paymentMethods: any[];
  }> {
    const customer = await this.customerService.getCustomerByShopId(user.shopId);

    if (!customer) {
      return { success: true, paymentMethods: [] };
    }

    const methods = await this.customerService.listPaymentMethods(customer.stripeCustomerId);

    return {
      success: true,
      paymentMethods: methods.map((pm) => ({
        id: pm.id,
        type: pm.type,
        card: pm.card
          ? {
              brand: pm.card.brand,
              last4: pm.card.last4,
              expMonth: pm.card.exp_month,
              expYear: pm.card.exp_year,
            }
          : null,
        isDefault: pm.id === customer.defaultPaymentMethodId,
      })),
    };
  }

  /**
   * Attach payment method to customer
   */
  @UseGuards(JwtAuthGuard)
  @Post('customer/attach-payment-method')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Attach payment method to customer' })
  async attachPaymentMethod(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { paymentMethodId: string; setAsDefault?: boolean },
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const customer = await this.customerService.getCustomerByShopId(user.shopId);

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    await this.customerService.attachPaymentMethod(
      customer.stripeCustomerId,
      dto.paymentMethodId,
      dto.setAsDefault,
    );

    return {
      success: true,
      message: 'Payment method attached successfully',
    };
  }

  /**
   * Detach payment method
   */
  @UseGuards(JwtAuthGuard)
  @Post('customer/detach-payment-method')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detach payment method from customer' })
  async detachPaymentMethod(
    @Body() dto: { paymentMethodId: string },
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.customerService.detachPaymentMethod(dto.paymentMethodId);

    return {
      success: true,
      message: 'Payment method removed successfully',
    };
  }

  // ============================================
  // REFUNDS
  // ============================================

  /**
   * Process refund
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('refund')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process refund for a payment' })
  async processRefund(
    @Body()
    dto: {
      paymentIntentId: string;
      amount?: number;
      reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    },
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.paymentService.refundPayment({
      paymentIntentId: dto.paymentIntentId,
      amount: dto.amount,
      reason: dto.reason,
    });

    return {
      success: true,
      message: 'Refund processed successfully',
    };
  }

  // ============================================
  // ANALYTICS
  // ============================================

  /**
   * Get shop payment statistics
   */
  @UseGuards(JwtAuthGuard)
  @Get('analytics/shop')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get shop payment statistics' })
  async getShopStats(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<{
    success: boolean;
    stats: any;
  }> {
    const dateRange = from && to
      ? { from: new Date(from), to: new Date(to) }
      : undefined;

    const stats = await this.analyticsService.getShopPaymentStats(user.shopId, dateRange);

    return {
      success: true,
      stats,
    };
  }

  /**
   * Get revenue trends
   */
  @UseGuards(JwtAuthGuard)
  @Get('analytics/trends')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get revenue trends' })
  async getRevenueTrends(
    @CurrentUser() user: JwtPayload,
    @Query('period') period?: 'day' | 'week' | 'month',
    @Query('days') days?: string,
  ): Promise<{
    success: boolean;
    trends: any[];
  }> {
    const trends = await this.analyticsService.getRevenueTrends(
      user.shopId,
      period || 'day',
      days ? parseInt(days) : 30,
    );

    return {
      success: true,
      trends,
    };
  }

  /**
   * Get recent transactions
   */
  @UseGuards(JwtAuthGuard)
  @Get('analytics/recent')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent transactions' })
  async getRecentTransactions(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
  ): Promise<{
    success: boolean;
    transactions: any[];
  }> {
    const transactions = await this.analyticsService.getRecentTransactions(
      user.shopId,
      limit ? parseInt(limit) : 10,
    );

    return {
      success: true,
      transactions: transactions.map((t) => ({
        id: t.stripePaymentIntentId,
        type: t.paymentType,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        createdAt: t.createdAt,
        paidAt: t.paidAt,
      })),
    };
  }

  // ============================================
  // SUPER ADMIN ANALYTICS
  // ============================================

  /**
   * Get subscription analytics (Super Admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Get('admin/subscription-analytics')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription analytics (Super Admin)' })
  async getSubscriptionAnalytics(): Promise<{
    success: boolean;
    analytics: any;
  }> {
    const analytics = await this.analyticsService.getSubscriptionAnalytics();

    return {
      success: true,
      analytics,
    };
  }

  /**
   * Get Stripe balance (Super Admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Get('admin/balance')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Stripe balance (Super Admin)' })
  async getStripeBalance(): Promise<{
    success: boolean;
    balance: any;
  }> {
    const balance = await this.analyticsService.getStripeBalance();

    return {
      success: true,
      balance,
    };
  }

  /**
   * Get all recent transactions (Super Admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Get('admin/transactions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all recent transactions (Super Admin)' })
  async getAllTransactions(
    @Query('limit') limit?: string,
  ): Promise<{
    success: boolean;
    transactions: any[];
  }> {
    const transactions = await this.analyticsService.getRecentTransactions(
      undefined,
      limit ? parseInt(limit) : 50,
    );

    return {
      success: true,
      transactions: transactions.map((t) => ({
        id: t.stripePaymentIntentId,
        shopId: t.shopId?.toString(),
        type: t.paymentType,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        createdAt: t.createdAt,
        paidAt: t.paidAt,
      })),
    };
  }

  /**
   * Get payment method distribution (Super Admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Get('admin/payment-methods')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment method distribution (Super Admin)' })
  async getPaymentMethodDistribution(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<{
    success: boolean;
    distribution: any;
  }> {
    const dateRange = from && to
      ? { from: new Date(from), to: new Date(to) }
      : undefined;

    const distribution = await this.analyticsService.getPaymentMethodDistribution(
      undefined,
      dateRange,
    );

    return {
      success: true,
      distribution,
    };
  }
}
