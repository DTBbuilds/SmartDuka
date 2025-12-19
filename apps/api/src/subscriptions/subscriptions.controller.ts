import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionMigrationService } from './subscription-migration.service';
import { ActivityLogService } from './services/activity-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import {
  CreateSubscriptionDto,
  ChangePlanDto,
  CancelSubscriptionDto,
  SubscriptionResponseDto,
  SubscriptionPlanResponseDto,
  InvoiceResponseDto,
  BillingHistoryQueryDto,
} from './dto/subscription.dto';

@Controller('subscriptions')
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly migrationService: SubscriptionMigrationService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ============================================
  // PUBLIC ENDPOINTS (No Auth Required)
  // ============================================

  /**
   * Get all available subscription plans
   * Public endpoint for pricing page
   */
  @Get('plans')
  async getPlans(): Promise<SubscriptionPlanResponseDto[]> {
    return this.subscriptionsService.getPlans();
  }

  /**
   * Get a specific plan by code
   */
  @Get('plans/:code')
  async getPlanByCode(@Param('code') code: string): Promise<SubscriptionPlanResponseDto> {
    return this.subscriptionsService.getPlanByCode(code);
  }

  // ============================================
  // AUTHENTICATED ENDPOINTS
  // ============================================

  /**
   * Get current subscription for the authenticated shop
   */
  @UseGuards(JwtAuthGuard)
  @Get('current')
  async getCurrentSubscription(
    @CurrentUser() user: JwtPayload,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.getSubscription(user.shopId);
  }

  /**
   * Create a new subscription (for new shops)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(`Creating subscription for shop ${user.shopId} with plan ${dto.planCode}`);
    return this.subscriptionsService.createSubscription(user.shopId, dto);
  }

  /**
   * Change subscription plan (upgrade/downgrade)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('change-plan')
  async changePlan(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePlanDto,
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(`Changing plan for shop ${user.shopId} to ${dto.newPlanCode}`);
    return this.subscriptionsService.changePlan(user.shopId, dto);
  }

  /**
   * Cancel subscription
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelSubscription(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CancelSubscriptionDto,
  ): Promise<void> {
    this.logger.log(`Cancelling subscription for shop ${user.shopId}`);
    return this.subscriptionsService.cancelSubscription(user.shopId, dto);
  }

  /**
   * Reactivate cancelled subscription
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('reactivate')
  async reactivateSubscription(
    @CurrentUser() user: JwtPayload,
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(`Reactivating subscription for shop ${user.shopId}`);
    return this.subscriptionsService.reactivateSubscription(user.shopId);
  }

  // ============================================
  // BILLING ENDPOINTS
  // ============================================

  /**
   * Get billing history
   */
  @UseGuards(JwtAuthGuard)
  @Get('billing/history')
  async getBillingHistory(
    @CurrentUser() user: JwtPayload,
    @Query() query: BillingHistoryQueryDto,
  ): Promise<InvoiceResponseDto[]> {
    return this.subscriptionsService.getBillingHistory(
      user.shopId,
      query.limit,
      query.skip,
      query.status,
    );
  }

  /**
   * Get pending invoices
   */
  @UseGuards(JwtAuthGuard)
  @Get('billing/pending')
  async getPendingInvoices(
    @CurrentUser() user: JwtPayload,
  ): Promise<InvoiceResponseDto[]> {
    return this.subscriptionsService.getPendingInvoices(user.shopId);
  }

  /**
   * Get specific invoice
   */
  @UseGuards(JwtAuthGuard)
  @Get('billing/invoices/:id')
  async getInvoice(
    @CurrentUser() user: JwtPayload,
    @Param('id') invoiceId: string,
  ): Promise<InvoiceResponseDto> {
    return this.subscriptionsService.getInvoice(user.shopId, invoiceId);
  }

  // ============================================
  // USAGE & LIMITS ENDPOINTS
  // ============================================

  /**
   * Check if a resource limit allows adding more
   */
  @UseGuards(JwtAuthGuard)
  @Get('limits/:resource')
  async checkLimit(
    @CurrentUser() user: JwtPayload,
    @Param('resource') resource: 'shops' | 'employees' | 'products',
    @Query('increment') increment?: string,
  ): Promise<{ allowed: boolean; current: number; limit: number; message?: string }> {
    return this.subscriptionsService.checkLimit(
      user.shopId,
      resource,
      increment ? parseInt(increment) : 1,
    );
  }

  /**
   * Get activity history for the authenticated shop
   */
  @UseGuards(JwtAuthGuard)
  @Get('activity-history')
  async getActivityHistory(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit: number = 50,
    @Query('skip') skip: number = 0,
  ): Promise<any[]> {
    return this.activityLogService.getActivityHistory(user.shopId, limit, skip);
  }

  /**
   * Get activity summary for the authenticated shop
   */
  @UseGuards(JwtAuthGuard)
  @Get('activity-summary')
  async getActivitySummary(
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    return this.activityLogService.getActivitySummary(user.shopId);
  }

  // ============================================
  // SUPER ADMIN ENDPOINTS
  // ============================================

  /**
   * Get all subscriptions (super admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Get('admin/all')
  async getAllSubscriptions(): Promise<any[]> {
    return this.subscriptionsService.getAllSubscriptions();
  }

  /**
   * Get subscription stats (super admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Get('admin/stats')
  async getSubscriptionStats(): Promise<any> {
    return this.subscriptionsService.getSubscriptionStats();
  }

  /**
   * Update all plans with new setup pricing (super admin only)
   * Sets: KES 3,000 setup fee, 1 month training & support, optional
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Put('admin/update-plans-pricing')
  async updatePlansPricing(): Promise<{ updated: number; message: string }> {
    this.logger.log('Updating all subscription plans with new setup pricing');
    return this.subscriptionsService.updatePlansSetupPricing();
  }

  /**
   * Migrate existing shops to subscription system (super admin only)
   * Creates subscriptions for shops that don't have one and syncs usage counts
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post('admin/migrate-shops')
  async migrateShops(): Promise<{ created: number; updated: number; skipped: number; message: string }> {
    this.logger.log('Running subscription migration for existing shops');
    return this.migrationService.runMigration();
  }
}
