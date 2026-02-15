import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  Logger,
  Res,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { SystemManagementService } from './services/system-management.service';
import { SystemAuditService } from './services/system-audit.service';
import { EmailLogService } from './services/email-log.service';
import { SystemConfigService } from './services/system-config.service';
import { PaymentAttemptService } from '../subscriptions/services/payment-attempt.service';
import { PaymentAttemptStatus, PaymentMethod } from '../subscriptions/schemas/payment-attempt.schema';
import { AuditActionCategory } from './schemas/system-audit-log.schema';

/**
 * System Management Controller
 * 
 * Super Admin endpoints for comprehensive system oversight:
 * - Dashboard statistics
 * - Transaction history
 * - Email logs
 * - Audit logs
 * - Revenue analytics
 * - System health
 */
@Controller('super-admin/system')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class SystemManagementController {
  private readonly logger = new Logger(SystemManagementController.name);

  constructor(
    private readonly systemService: SystemManagementService,
    private readonly auditService: SystemAuditService,
    private readonly emailLogService: EmailLogService,
    private readonly configService: SystemConfigService,
    private readonly paymentAttemptService: PaymentAttemptService,
  ) {}

  // ============================================
  // DASHBOARD
  // ============================================

  /**
   * Get comprehensive dashboard statistics
   */
  @Get('dashboard')
  async getDashboard() {
    this.logger.log('Fetching system dashboard stats');
    return this.systemService.getDashboardStats();
  }

  /**
   * Get system health metrics
   */
  @Get('health')
  async getSystemHealth() {
    return this.systemService.getSystemHealth();
  }

  // ============================================
  // TRANSACTIONS & PAYMENTS
  // ============================================

  /**
   * Get all subscription invoices/payments
   */
  @Get('invoices')
  async getAllInvoices(
    @Query('status') status?: string,
    @Query('shopId') shopId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.systemService.getAllInvoices({
      status,
      shopId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 50,
      skip: skip ? parseInt(skip) : 0,
    });
  }

  /**
   * Get all sales invoice payments (send money, bank transfer, M-Pesa, etc.)
   */
  @Get('invoice-payments')
  async getSalesInvoicePayments(
    @Query('paymentMethod') paymentMethod?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('shopId') shopId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.systemService.getSalesInvoicePayments({
      paymentMethod,
      paymentStatus,
      shopId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 50,
      skip: skip ? parseInt(skip) : 0,
    });
  }

  /**
   * Get all payment transactions (shop sales)
   */
  @Get('transactions')
  async getAllTransactions(
    @Query('paymentMethod') paymentMethod?: string,
    @Query('status') status?: string,
    @Query('shopId') shopId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.systemService.getAllTransactions({
      paymentMethod,
      status,
      shopId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 50,
      skip: skip ? parseInt(skip) : 0,
    });
  }

  /**
   * Get revenue analytics
   */
  @Get('revenue')
  async getRevenueAnalytics(
    @Query('period') period?: 'day' | 'week' | 'month' | 'year',
  ) {
    return this.systemService.getRevenueAnalytics(period || 'month');
  }

  // ============================================
  // SUBSCRIPTIONS
  // ============================================

  /**
   * Get all subscriptions
   */
  @Get('subscriptions')
  async getAllSubscriptions(
    @Query('status') status?: string,
    @Query('planCode') planCode?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.systemService.getAllSubscriptions({
      status,
      planCode,
      limit: limit ? parseInt(limit) : 50,
      skip: skip ? parseInt(skip) : 0,
    });
  }

  // ============================================
  // AUDIT LOGS
  // ============================================

  /**
   * Get system audit logs
   */
  @Get('audit-logs')
  async getAuditLogs(
    @Query('category') category?: AuditActionCategory,
    @Query('action') action?: string,
    @Query('actorEmail') actorEmail?: string,
    @Query('shopId') shopId?: string,
    @Query('status') status?: 'success' | 'failure' | 'warning',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.auditService.query({
      category,
      action,
      actorEmail,
      shopId,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 50,
      skip: skip ? parseInt(skip) : 0,
    });
  }

  /**
   * Get recent activity
   */
  @Get('audit-logs/recent')
  async getRecentActivity(@Query('limit') limit?: string) {
    return this.auditService.getRecentActivity(limit ? parseInt(limit) : 20);
  }

  /**
   * Get failed actions
   */
  @Get('audit-logs/failures')
  async getFailedActions(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.auditService.getFailedActions(
      limit ? parseInt(limit) : 50,
      skip ? parseInt(skip) : 0,
    );
  }

  /**
   * Get audit log statistics
   */
  @Get('audit-logs/stats')
  async getAuditStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.getStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * Export audit logs to CSV
   */
  @Get('audit-logs/export')
  async exportAuditLogs(
    @Res() res: Response,
    @Query('category') category?: AuditActionCategory,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const csv = await this.auditService.exportToCsv({
      category,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  }

  // ============================================
  // EMAIL LOGS
  // ============================================

  /**
   * Get email logs
   */
  @Get('emails')
  async getEmailLogs(
    @Query('to') to?: string,
    @Query('shopId') shopId?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('templateName') templateName?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.emailLogService.query({
      to,
      shopId,
      status,
      category,
      templateName,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 50,
      skip: skip ? parseInt(skip) : 0,
    });
  }

  /**
   * Get recent emails
   */
  @Get('emails/recent')
  async getRecentEmails(@Query('limit') limit?: string) {
    return this.emailLogService.getRecent(limit ? parseInt(limit) : 20);
  }

  /**
   * Get failed emails
   */
  @Get('emails/failed')
  async getFailedEmails(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.emailLogService.getFailed(
      limit ? parseInt(limit) : 50,
      skip ? parseInt(skip) : 0,
    );
  }

  /**
   * Get email statistics
   */
  @Get('emails/stats')
  async getEmailStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.emailLogService.getStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }


  /**
   * Get emails for a specific shop
   */
  @Get('emails/shop/:shopId')
  async getShopEmails(
    @Param('shopId') shopId: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.emailLogService.getByShop(
      shopId,
      limit ? parseInt(limit) : 50,
      skip ? parseInt(skip) : 0,
    );
  }

  /**
   * Get failed emails for a specific user email
   */
  @Get('emails/failed/user/:email')
  async getFailedEmailsByUser(
    @Param('email') email: string,
    @Query('limit') limit?: string,
  ) {
    return this.emailLogService.query({
      to: email,
      status: 'failed',
      limit: limit ? parseInt(limit) : 10,
    });
  }

  /**
   * Retry a failed email
   */
  @Post('emails/:id/retry')
  async retryEmail(@Param('id') emailId: string) {
    return this.emailLogService.retryFailedEmail(emailId);
  }

  /**
   * Delete an email log entry
   */
  @Delete('emails/:id')
  async deleteEmailLog(@Param('id') emailId: string) {
    return this.emailLogService.delete(emailId);
  }

  // ============================================
  // SYSTEM CONFIGURATION (M-Pesa, Stripe, etc.)
  // ============================================

  /**
   * Get M-Pesa configuration for display (masked credentials)
   */
  @Get('config/mpesa')
  async getMpesaConfig() {
    this.logger.log('Fetching M-Pesa system configuration');
    return this.configService.getMpesaConfigForDisplay();
  }

  /**
   * Save M-Pesa configuration
   */
  @Put('config/mpesa')
  async saveMpesaConfig(
    @CurrentUser() user: any,
    @Body() body: {
      environment: 'sandbox' | 'production';
      shortCode: string;
      consumerKey: string;
      consumerSecret: string;
      passkey: string;
      callbackUrl?: string;
      isActive?: boolean;
    },
  ) {
    this.logger.log(`Saving M-Pesa configuration by ${user.email}`);
    return this.configService.saveMpesaConfig({
      ...body,
      updatedByEmail: user.email,
    });
  }

  /**
   * Test M-Pesa configuration
   */
  @Post('config/mpesa/test')
  async testMpesaConfig() {
    this.logger.log('Testing M-Pesa configuration');
    return this.configService.testMpesaConfig();
  }

  /**
   * Toggle M-Pesa active status
   */
  @Put('config/mpesa/toggle')
  async toggleMpesaActive(
    @Body() body: { isActive: boolean },
  ) {
    this.logger.log(`Toggling M-Pesa active status to ${body.isActive}`);
    return this.configService.toggleMpesaActive(body.isActive);
  }

  // ============================================
  // PAYMENT ATTEMPTS (All payment methods)
  // ============================================

  /**
   * Get payment attempt statistics
   * Note: This route MUST come before the general /payment-attempts route
   */
  @Get('payment-attempts/stats')
  async getPaymentAttemptStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    this.logger.log('Fetching payment attempt statistics');
    return this.paymentAttemptService.getStatistics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * Get all payment attempts with filtering
   */
  @Get('payment-attempts')
  async getPaymentAttempts(
    @Query('status') status?: string,
    @Query('method') method?: string,
    @Query('shopId') shopId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    this.logger.log('Fetching payment attempts');
    return this.paymentAttemptService.getAllAttempts({
      status: status as PaymentAttemptStatus,
      method: method as PaymentMethod,
      shopId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 50,
      skip: skip ? parseInt(skip) : 0,
    });
  }

  // ============================================
  // VAT CONFIGURATION
  // ============================================

  /**
   * Get VAT configuration
   */
  @Get('vat-config')
  async getVatConfig() {
    this.logger.log('Fetching VAT configuration');
    return this.configService.getVatConfig();
  }

  /**
   * Update VAT configuration
   */
  @Put('vat-config')
  async updateVatConfig(
    @CurrentUser() user: any,
    @Body() body: { enabled: boolean; rate?: number; name?: string; description?: string },
  ) {
    this.logger.log(`Updating VAT config: enabled=${body.enabled}`);
    await this.configService.saveVatConfig({
      enabled: body.enabled,
      rate: body.rate,
      name: body.name,
      description: body.description,
      updatedByEmail: user.email,
    });
    return this.configService.getVatConfig();
  }

  /**
   * Toggle VAT enabled/disabled
   */
  @Post('vat-config/toggle')
  async toggleVat(
    @CurrentUser() user: any,
    @Body() body: { enabled: boolean },
  ) {
    this.logger.log(`Toggling VAT: enabled=${body.enabled}`);
    await this.configService.toggleVatEnabled(body.enabled, user.email);
    return this.configService.getVatConfig();
  }

  // ============================================
  // PAYMENT APPROVAL WORKFLOW
  // ============================================

  /**
   * Get all pending payment approvals (invoice and subscription)
   */
  @Get('pending-approvals')
  async getPendingApprovals() {
    this.logger.log('Fetching pending payment approvals');
    return this.systemService.getPendingApprovals();
  }

  /**
   * Approve an invoice payment
   */
  @Post('invoice-payments/:invoiceId/:paymentId/approve')
  async approveInvoicePayment(
    @CurrentUser() user: JwtPayload,
    @Param('invoiceId') invoiceId: string,
    @Param('paymentId') paymentId: string,
  ) {
    this.logger.log(`Approving invoice payment: ${invoiceId}/${paymentId} by ${user.email}`);
    return this.systemService.approveInvoicePayment(
      invoiceId,
      paymentId,
      user.sub,
      user.email,
    );
  }

  /**
   * Reject an invoice payment
   */
  @Post('invoice-payments/:invoiceId/:paymentId/reject')
  async rejectInvoicePayment(
    @CurrentUser() user: JwtPayload,
    @Param('invoiceId') invoiceId: string,
    @Param('paymentId') paymentId: string,
    @Body() body: { reason: string },
  ) {
    this.logger.log(`Rejecting invoice payment: ${invoiceId}/${paymentId} by ${user.email}`);
    return this.systemService.rejectInvoicePayment(
      invoiceId,
      paymentId,
      user.sub,
      user.email,
      body.reason,
    );
  }

  /**
   * Approve a subscription payment
   */
  @Post('subscription-payments/:paymentAttemptId/approve')
  async approveSubscriptionPayment(
    @CurrentUser() user: JwtPayload,
    @Param('paymentAttemptId') paymentAttemptId: string,
  ) {
    this.logger.log(`Approving subscription payment: ${paymentAttemptId} by ${user.email}`);
    return this.systemService.approveSubscriptionPayment(
      paymentAttemptId,
      user.sub,
      user.email,
    );
  }

  /**
   * Reject a subscription payment
   */
  @Post('subscription-payments/:paymentAttemptId/reject')
  async rejectSubscriptionPayment(
    @CurrentUser() user: JwtPayload,
    @Param('paymentAttemptId') paymentAttemptId: string,
    @Body() body: { reason: string },
  ) {
    this.logger.log(`Rejecting subscription payment: ${paymentAttemptId} by ${user.email}`);
    return this.systemService.rejectSubscriptionPayment(
      paymentAttemptId,
      user.sub,
      user.email,
      body.reason,
    );
  }
}
