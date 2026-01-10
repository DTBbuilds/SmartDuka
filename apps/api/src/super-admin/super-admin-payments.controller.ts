import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import {
  SubscriptionInvoice,
  SubscriptionInvoiceDocument,
  InvoiceStatus,
} from '../subscriptions/schemas/subscription-invoice.schema';
import {
  PaymentAttempt,
  PaymentAttemptDocument,
  PaymentAttemptStatus,
} from '../subscriptions/schemas/payment-attempt.schema';
import { Subscription, SubscriptionDocument } from '../subscriptions/schemas/subscription.schema';
import { Shop, ShopDocument } from '../shops/schemas/shop.schema';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SystemAuditService } from './services/system-audit.service';

/**
 * Super Admin Payment Verification Controller
 * 
 * Allows super admins to:
 * 1. View all pending payment verifications
 * 2. Verify/approve manual payments
 * 3. Reject fraudulent payments
 * 4. View payment history and reports
 * 5. Monitor subscription upgrades
 */
@Controller('super-admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class SuperAdminPaymentsController {
  private readonly logger = new Logger(SuperAdminPaymentsController.name);

  constructor(
    @InjectModel(SubscriptionInvoice.name)
    private readonly invoiceModel: Model<SubscriptionInvoiceDocument>,
    @InjectModel(PaymentAttempt.name)
    private readonly attemptModel: Model<PaymentAttemptDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Shop.name)
    private readonly shopModel: Model<ShopDocument>,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly auditService: SystemAuditService,
  ) {}

  /**
   * Get dashboard stats for payment verification
   */
  @Get('stats')
  async getPaymentStats(): Promise<{
    pendingVerifications: number;
    pendingUpgrades: number;
    todayPayments: number;
    todayAmount: number;
    weekPayments: number;
    weekAmount: number;
  }> {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - 7));

    const [
      pendingVerifications,
      pendingUpgrades,
      todayStats,
      weekStats,
    ] = await Promise.all([
      this.invoiceModel.countDocuments({ status: 'pending_verification' }),
      this.subscriptionModel.countDocuments({ 'pendingUpgrade': { $exists: true, $ne: null } }),
      this.invoiceModel.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: todayStart } } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$totalAmount' } } },
      ]),
      this.invoiceModel.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: weekStart } } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$totalAmount' } } },
      ]),
    ]);

    return {
      pendingVerifications,
      pendingUpgrades,
      todayPayments: todayStats[0]?.count || 0,
      todayAmount: todayStats[0]?.total || 0,
      weekPayments: weekStats[0]?.count || 0,
      weekAmount: weekStats[0]?.total || 0,
    };
  }

  /**
   * Get all pending payment verifications
   */
  @Get('pending')
  async getPendingVerifications(
    @Query('limit') limit = 50,
    @Query('skip') skip = 0,
  ): Promise<{
    invoices: any[];
    total: number;
  }> {
    const [invoices, total] = await Promise.all([
      this.invoiceModel
        .find({ status: 'pending_verification' })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.invoiceModel.countDocuments({ status: 'pending_verification' }),
    ]);

    // Enrich with shop details
    const enriched = await Promise.all(
      invoices.map(async (invoice) => {
        const shop = await this.shopModel.findById(invoice.shopId).lean();
        const subscription = await this.subscriptionModel.findById(invoice.subscriptionId).lean();
        return {
          ...invoice,
          shopName: shop?.name || 'Unknown Shop',
          shopEmail: shop?.email,
          currentPlan: subscription?.planCode,
          pendingUpgrade: subscription?.pendingUpgrade,
        };
      }),
    );

    return { invoices: enriched, total };
  }

  /**
   * Get all pending subscription upgrades (awaiting payment)
   */
  @Get('pending-upgrades')
  async getPendingUpgrades(
    @Query('limit') limit = 50,
    @Query('skip') skip = 0,
  ): Promise<{
    upgrades: any[];
    total: number;
  }> {
    const [subscriptions, total] = await Promise.all([
      this.subscriptionModel
        .find({ 'pendingUpgrade': { $exists: true, $ne: null } })
        .sort({ 'pendingUpgrade.requestedAt': -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.subscriptionModel.countDocuments({ 'pendingUpgrade': { $exists: true, $ne: null } }),
    ]);

    // Enrich with shop details and invoice status
    const enriched = await Promise.all(
      subscriptions.map(async (sub) => {
        const shop = await this.shopModel.findById(sub.shopId).lean();
        const invoice = sub.pendingUpgrade?.invoiceId
          ? await this.invoiceModel.findById(sub.pendingUpgrade.invoiceId).lean()
          : null;
        return {
          subscriptionId: sub._id,
          shopId: sub.shopId,
          shopName: shop?.name || 'Unknown Shop',
          shopEmail: shop?.email,
          currentPlan: sub.planCode,
          pendingUpgrade: sub.pendingUpgrade,
          invoice: invoice ? {
            id: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            amount: invoice.totalAmount,
            mpesaReceiptNumber: invoice.mpesaReceiptNumber,
            manualPayment: invoice.manualPayment,
          } : null,
        };
      }),
    );

    return { upgrades: enriched, total };
  }

  /**
   * Verify and approve a manual payment
   * This will activate the pending upgrade if applicable
   */
  @Post('verify/:invoiceId')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() admin: JwtPayload,
    @Body() dto: { notes?: string },
  ): Promise<{
    success: boolean;
    message: string;
    upgradeActivated?: boolean;
  }> {
    this.logger.log(`Super admin ${admin.email} verifying payment for invoice ${invoiceId}`);

    const invoice = await this.invoiceModel.findById(invoiceId);
    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    if (invoice.status === 'paid') {
      return { success: false, message: 'Invoice is already marked as paid' };
    }

    if (invoice.status !== 'pending_verification') {
      return { success: false, message: `Cannot verify invoice with status: ${invoice.status}` };
    }

    // Update invoice as verified and paid
    await this.invoiceModel.updateOne(
      { _id: invoice._id },
      {
        $set: {
          status: InvoiceStatus.PAID,
          paidAt: new Date(),
          'manualPayment.verifiedAt': new Date(),
          'manualPayment.verifiedBy': admin.sub,
          'manualPayment.pendingVerification': false,
          'manualPayment.verificationNotes': dto.notes,
        },
      },
    );

    // Log the verification
    await this.auditService.log({
      category: 'payment' as any,
      actionType: 'verify' as any,
      action: 'payment_verified',
      description: `Verified payment for invoice ${invoice.invoiceNumber}`,
      actorId: admin.sub,
      actorEmail: admin.email,
      actorType: 'super_admin',
      targetType: 'invoice',
      targetId: invoiceId,
      shopId: invoice.shopId.toString(),
      metadata: {
        amount: invoice.totalAmount,
        mpesaReceiptNumber: invoice.mpesaReceiptNumber,
        notes: dto.notes,
      },
      status: 'success',
    });

    // Check if this is for a pending upgrade and activate it
    let upgradeActivated = false;
    if (invoice.type === 'upgrade') {
      const result = await this.subscriptionsService.activatePendingUpgrade(
        invoice.shopId.toString(),
        invoiceId,
      );
      if (result) {
        upgradeActivated = true;
        this.logger.log(`✅ Upgrade activated for shop ${invoice.shopId} after payment verification`);
      }
    }

    return {
      success: true,
      message: upgradeActivated
        ? 'Payment verified and subscription upgraded successfully!'
        : 'Payment verified successfully!',
      upgradeActivated,
    };
  }

  /**
   * Reject a fraudulent or invalid payment
   */
  @Post('reject/:invoiceId')
  @HttpCode(HttpStatus.OK)
  async rejectPayment(
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() admin: JwtPayload,
    @Body() dto: { reason: string },
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    if (!dto.reason || dto.reason.trim().length < 10) {
      throw new BadRequestException('Please provide a detailed reason for rejection (min 10 characters)');
    }

    this.logger.log(`Super admin ${admin.email} rejecting payment for invoice ${invoiceId}`);

    const invoice = await this.invoiceModel.findById(invoiceId);
    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    // Update invoice as rejected
    await this.invoiceModel.updateOne(
      { _id: invoice._id },
      {
        $set: {
          status: InvoiceStatus.FAILED,
          'manualPayment.verifiedAt': new Date(),
          'manualPayment.verifiedBy': admin.sub,
          'manualPayment.pendingVerification': false,
          'manualPayment.rejectionReason': dto.reason,
        },
      },
    );

    // Cancel the pending upgrade if this was for an upgrade
    if (invoice.type === 'upgrade') {
      await this.subscriptionsService.cancelPendingUpgrade(invoice.shopId.toString());
    }

    // Log the rejection
    await this.auditService.log({
      category: 'payment' as any,
      actionType: 'reject' as any,
      action: 'payment_rejected',
      description: `Rejected payment for invoice ${invoice.invoiceNumber}: ${dto.reason}`,
      actorId: admin.sub,
      actorEmail: admin.email,
      actorType: 'super_admin',
      targetType: 'invoice',
      targetId: invoiceId,
      shopId: invoice.shopId.toString(),
      metadata: {
        amount: invoice.totalAmount,
        mpesaReceiptNumber: invoice.mpesaReceiptNumber,
        reason: dto.reason,
      },
      status: 'success',
    });

    return {
      success: true,
      message: 'Payment rejected. The shop will be notified.',
    };
  }

  /**
   * Get payment history with filters
   */
  @Get('history')
  async getPaymentHistory(
    @Query('status') status?: string,
    @Query('method') method?: string,
    @Query('shopId') shopId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit = 50,
    @Query('skip') skip = 0,
  ): Promise<{
    invoices: any[];
    total: number;
  }> {
    const query: any = {};

    if (status) query.status = status;
    if (method) query.paymentMethod = method;
    if (shopId) query.shopId = new Types.ObjectId(shopId);
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [invoices, total] = await Promise.all([
      this.invoiceModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.invoiceModel.countDocuments(query),
    ]);

    // Enrich with shop details
    const enriched = await Promise.all(
      invoices.map(async (invoice) => {
        const shop = await this.shopModel.findById(invoice.shopId).lean();
        return {
          ...invoice,
          shopName: shop?.name || 'Unknown Shop',
        };
      }),
    );

    return { invoices: enriched, total };
  }

  /**
   * Get payment attempts for monitoring
   */
  @Get('attempts')
  async getPaymentAttempts(
    @Query('status') status?: string,
    @Query('method') method?: string,
    @Query('limit') limit = 100,
    @Query('skip') skip = 0,
  ): Promise<{
    attempts: any[];
    total: number;
  }> {
    const query: any = {};
    if (status) query.status = status;
    if (method) query.method = method;

    const [attempts, total] = await Promise.all([
      this.attemptModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.attemptModel.countDocuments(query),
    ]);

    // Enrich with shop details
    const enriched = await Promise.all(
      attempts.map(async (attempt) => {
        const shop = await this.shopModel.findById(attempt.shopId).lean();
        return {
          ...attempt,
          shopName: shop?.name || 'Unknown Shop',
        };
      }),
    );

    return { attempts: enriched, total };
  }

  /**
   * Force activate a pending upgrade (emergency use only)
   */
  @Post('force-activate-upgrade/:subscriptionId')
  @HttpCode(HttpStatus.OK)
  async forceActivateUpgrade(
    @Param('subscriptionId') subscriptionId: string,
    @CurrentUser() admin: JwtPayload,
    @Body() dto: { reason: string },
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    if (!dto.reason || dto.reason.trim().length < 20) {
      throw new BadRequestException('Please provide a detailed reason for force activation (min 20 characters)');
    }

    const subscription = await this.subscriptionModel.findById(subscriptionId);
    if (!subscription) {
      throw new BadRequestException('Subscription not found');
    }

    if (!subscription.pendingUpgrade) {
      throw new BadRequestException('No pending upgrade found for this subscription');
    }

    this.logger.warn(`⚠️ Super admin ${admin.email} FORCE activating upgrade for subscription ${subscriptionId}`);

    const result = await this.subscriptionsService.activatePendingUpgrade(
      subscription.shopId.toString(),
    );

    // Log the force activation
    await this.auditService.log({
      category: 'subscription' as any,
      actionType: 'update' as any,
      action: 'upgrade_force_activated',
      description: `Force activated upgrade for subscription ${subscriptionId}`,
      actorId: admin.sub,
      actorEmail: admin.email,
      actorType: 'super_admin',
      targetType: 'subscription',
      targetId: subscriptionId,
      shopId: subscription.shopId.toString(),
      metadata: {
        pendingUpgrade: subscription.pendingUpgrade,
        reason: dto.reason,
      },
      status: 'success',
    });

    return {
      success: !!result,
      message: result
        ? `Upgrade forcefully activated to ${result.planCode}`
        : 'Failed to activate upgrade',
    };
  }
}
