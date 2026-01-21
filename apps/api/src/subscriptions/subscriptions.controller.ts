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
  NotFoundException,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionMigrationService } from './subscription-migration.service';
import { ActivityLogService } from './services/activity-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SkipSubscriptionCheck } from '../auth/guards/subscription-status.guard';
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
@SkipSubscriptionCheck() // Subscription management routes should always be accessible
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
   * Returns null for super-admin users who don't have a shop context
   */
  @UseGuards(JwtAuthGuard)
  @Get('current')
  async getCurrentSubscription(
    @CurrentUser() user: JwtPayload,
  ): Promise<SubscriptionResponseDto | null> {
    // Super-admin users (platform managers) don't have shop context
    // Return null instead of throwing error to avoid noisy logs
    if (!user.shopId) {
      if (user.role === 'super_admin') {
        return null;
      }
      // For other users without shopId, this is unexpected
      this.logger.warn('getCurrentSubscription called without shopId for user:', user.email);
      throw new NotFoundException('Shop context required to fetch subscription');
    }
    
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
   * 
   * For UPGRADES: Returns requiresPayment=true with invoice details.
   * Plan is NOT changed until payment is confirmed.
   * 
   * For DOWNGRADES: Changes plan immediately.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('change-plan')
  async changePlan(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePlanDto,
  ): Promise<SubscriptionResponseDto & { requiresPayment?: boolean; invoiceId?: string; pendingUpgrade?: any }> {
    this.logger.log(`Changing plan for shop ${user.shopId} to ${dto.newPlanCode}`);
    return this.subscriptionsService.changePlan(user.shopId, dto);
  }

  /**
   * Get pending upgrade (if any)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('pending-upgrade')
  async getPendingUpgrade(
    @CurrentUser() user: JwtPayload,
  ): Promise<any | null> {
    return this.subscriptionsService.getPendingUpgrade(user.shopId);
  }

  /**
   * Cancel pending upgrade
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('pending-upgrade')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelPendingUpgrade(
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    this.logger.log(`Cancelling pending upgrade for shop ${user.shopId}`);
    return this.subscriptionsService.cancelPendingUpgrade(user.shopId);
  }

  /**
   * Get cancellation preview - shows what will happen if user cancels
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('cancel/preview')
  async getCancellationPreview(
    @CurrentUser() user: JwtPayload,
  ): Promise<{
    currentPlan: string;
    currentPeriodEnd: Date;
    daysRemaining: number;
    dataArchiveDate: Date;
    dataDeletionDate: Date;
    warnings: string[];
  }> {
    return this.subscriptionsService.getCancellationPreview(user.shopId);
  }

  /**
   * Cancel subscription
   * Returns data retention schedule instead of void
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CancelSubscriptionDto,
  ): Promise<{
    message: string;
    currentPeriodEnd: Date;
    dataArchiveDate: Date;
    dataDeletionDate: Date;
  }> {
    this.logger.log(`Cancelling subscription for shop ${user.shopId}`);
    return this.subscriptionsService.cancelSubscription(user.shopId, dto);
  }

  /**
   * Request account and data deletion
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('delete-account')
  async requestAccountDeletion(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { confirmation: string },
  ): Promise<{
    success: boolean;
    message: string;
    scheduledDeletionDate?: Date;
  }> {
    this.logger.warn(`Account deletion requested for shop ${user.shopId}`);
    return this.subscriptionsService.requestAccountDeletion(user.shopId, user.sub, dto.confirmation);
  }

  /**
   * Cancel account deletion request
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('delete-account')
  @HttpCode(HttpStatus.OK)
  async cancelAccountDeletion(
    @CurrentUser() user: JwtPayload,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log(`Account deletion cancelled for shop ${user.shopId}`);
    return this.subscriptionsService.cancelAccountDeletion(user.shopId);
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

  /**
   * Toggle auto-renew setting
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('auto-renew')
  async toggleAutoRenew(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { autoRenew: boolean },
  ): Promise<{ success: boolean; autoRenew: boolean; message: string }> {
    this.logger.log(`Toggling auto-renew for shop ${user.shopId} to ${dto.autoRenew}`);
    return this.subscriptionsService.toggleAutoRenew(user.shopId, dto.autoRenew);
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

  /**
   * Get invoice/receipt as PDF or HTML
   * @param type - 'invoice' for invoice, 'receipt' for payment receipt
   */
  @UseGuards(JwtAuthGuard)
  @Get('invoices/:id/pdf')
  async getInvoicePdf(
    @CurrentUser() user: JwtPayload,
    @Param('id') invoiceId: string,
    @Query('type') type: 'invoice' | 'receipt' = 'invoice',
    @Res() res: Response,
  ): Promise<void> {
    const invoice = await this.subscriptionsService.getInvoice(user.shopId, invoiceId);
    
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // For receipts, invoice must be paid
    if (type === 'receipt' && invoice.status !== 'paid') {
      throw new NotFoundException('Receipt not available - invoice not paid');
    }

    // Generate HTML document
    const html = this.generateInvoiceHtml(invoice, type);
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename="${type}-${invoice.invoiceNumber}.html"`);
    res.send(html);
  }

  /**
   * Generate invoice/receipt HTML
   */
  private generateInvoiceHtml(invoice: InvoiceResponseDto, type: 'invoice' | 'receipt'): string {
    const isReceipt = type === 'receipt';
    const title = isReceipt ? 'Payment Receipt' : 'Invoice';
    const statusColor = invoice.status === 'paid' ? '#10b981' : invoice.status === 'pending' ? '#f59e0b' : '#ef4444';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 32px; }
    .header h1 { font-size: 28px; font-weight: 700; }
    .header p { opacity: 0.8; margin-top: 4px; }
    .badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; background: ${statusColor}; color: white; margin-top: 12px; }
    .content { padding: 32px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .info-box { background: #f8fafc; padding: 16px; border-radius: 8px; }
    .info-box h3 { font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 8px; letter-spacing: 0.5px; }
    .info-box p { color: #1e293b; font-weight: 500; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .table th { background: #f1f5f9; padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b; }
    .table td { padding: 16px; border-bottom: 1px solid #e2e8f0; }
    .table .amount { text-align: right; font-weight: 600; }
    .total-row { background: #f8fafc; }
    .total-row td { font-weight: 700; font-size: 18px; color: #1e293b; }
    .footer { background: #f8fafc; padding: 24px 32px; text-align: center; color: #64748b; font-size: 14px; }
    .footer a { color: #3b82f6; text-decoration: none; }
    @media print { body { background: white; padding: 0; } .container { box-shadow: none; } }
    @media (max-width: 600px) { .info-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SmartDuka</h1>
      <p>${title}</p>
      <span class="badge">${invoice.status.toUpperCase()}</span>
    </div>
    
    <div class="content">
      <div class="info-grid">
        <div class="info-box">
          <h3>${isReceipt ? 'Receipt Number' : 'Invoice Number'}</h3>
          <p>${invoice.invoiceNumber}</p>
        </div>
        <div class="info-box">
          <h3>${isReceipt ? 'Payment Date' : 'Due Date'}</h3>
          <p>${isReceipt && invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date(invoice.dueDate).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        ${invoice.mpesaReceiptNumber ? `
        <div class="info-box">
          <h3>M-Pesa Receipt</h3>
          <p>${invoice.mpesaReceiptNumber}</p>
        </div>
        ` : ''}
        <div class="info-box">
          <h3>Payment Method</h3>
          <p>${invoice.paymentMethod ? invoice.paymentMethod.replace('_', ' ').toUpperCase() : 'Pending'}</p>
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${invoice.description}</td>
            <td class="amount">KES ${invoice.totalAmount.toLocaleString()}</td>
          </tr>
          <tr class="total-row">
            <td>Total ${isReceipt ? 'Paid' : 'Due'}</td>
            <td class="amount">KES ${invoice.totalAmount.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>Thank you for using SmartDuka!</p>
      <p style="margin-top: 8px;">Questions? Contact us at <a href="mailto:smartdukainfo@gmail.com">smartdukainfo@gmail.com</a></p>
    </div>
  </div>
</body>
</html>
    `.trim();
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

  /**
   * Send invoice email to a shop (super admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post('admin/:shopId/send-invoice')
  async adminSendInvoiceToShop(
    @Param('shopId') shopId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Super admin ${user.email} sending invoice to shop ${shopId}`);
    return this.subscriptionsService.sendInvoiceEmailToShop(shopId);
  }

  /**
   * Manually update a shop's subscription (super admin only)
   * Allows changing plan, status, billing cycle, and period dates
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Put('admin/:shopId/update')
  async adminUpdateSubscription(
    @Param('shopId') shopId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      planCode?: string;
      status?: string;
      billingCycle?: string;
      currentPeriodEnd?: string;
      currentPrice?: number;
    },
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Super admin ${user.email} updating subscription for shop ${shopId}`);
    return this.subscriptionsService.adminUpdateSubscription(shopId, dto);
  }

  /**
   * Grant grace period to a shop's subscription (super admin only)
   * Extends subscription period and optionally sends notification email
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post('admin/:shopId/grace-period')
  async adminGrantGracePeriod(
    @Param('shopId') shopId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: {
      days: number;
      reason?: string;
      sendEmail?: boolean;
    },
  ): Promise<{ success: boolean; message: string; newExpiryDate: string }> {
    this.logger.log(`Super admin ${user.email} granting ${dto.days} days grace period to shop ${shopId}`);
    return this.subscriptionsService.adminGrantGracePeriod(shopId, dto);
  }

  /**
   * Suspend a shop's subscription (super admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post('admin/:shopId/suspend')
  async adminSuspendSubscription(
    @Param('shopId') shopId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Super admin ${user.email} suspending subscription for shop ${shopId}`);
    return this.subscriptionsService.adminSuspendSubscription(shopId);
  }

  /**
   * Reactivate a shop's subscription (super admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post('admin/:shopId/reactivate')
  async adminReactivateSubscription(
    @Param('shopId') shopId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Super admin ${user.email} reactivating subscription for shop ${shopId}`);
    return this.subscriptionsService.adminReactivateSubscription(shopId);
  }

  /**
   * Fix daily subscription periods that were incorrectly set (super admin only)
   * This corrects subscriptions where billingCycle is 'daily' but period is monthly
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post('admin/fix-daily-subscriptions')
  async fixDailySubscriptions(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ fixed: number; skipped: number; errors: number; details: string[] }> {
    this.logger.log(`Super admin ${user.email} fixing daily subscription periods`);
    return this.migrationService.fixDailySubscriptionPeriods();
  }

  /**
   * Fix trial subscriptions with wrong period dates (super admin only)
   * Trial should be 14 days from subscription creation date
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post('admin/fix-trial-subscriptions')
  async fixTrialSubscriptions(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ fixed: number; skipped: number; details: string[] }> {
    this.logger.log(`Super admin ${user.email} fixing trial subscription periods`);
    return this.subscriptionsService.fixTrialSubscriptionPeriods();
  }

  /**
   * Audit and fix subscription mismatches (super admin only)
   * Checks for status mismatches, past_due accounts that should be suspended, etc.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post('admin/audit-subscriptions')
  async auditSubscriptions(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ audited: number; fixed: number; issues: string[] }> {
    this.logger.log(`Super admin ${user.email} auditing subscriptions`);
    return this.subscriptionsService.auditAndFixSubscriptions();
  }
}
