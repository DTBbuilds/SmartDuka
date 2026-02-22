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
import { User, UserDocument } from '../users/schemas/user.schema';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SystemAuditService } from './services/system-audit.service';
import { EmailService } from '../notifications/email.service';
import { EMAIL_TEMPLATES } from '../notifications/email-templates';
import { EventsGateway } from '../events/events.gateway';

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
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly auditService: SystemAuditService,
    private readonly emailService: EmailService,
    private readonly eventsGateway: EventsGateway,
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
   * Optimized with $lookup aggregation to avoid N+1 queries
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
      this.invoiceModel.aggregate([
        { $match: { status: 'pending_verification' } },
        { $sort: { updatedAt: -1 } },
        { $skip: Number(skip) },
        { $limit: Number(limit) },
        {
          $lookup: {
            from: 'shops',
            localField: 'shopId',
            foreignField: '_id',
            as: 'shop',
            pipeline: [{ $project: { name: 1, email: 1 } }],
          },
        },
        {
          $lookup: {
            from: 'subscriptions',
            localField: 'subscriptionId',
            foreignField: '_id',
            as: 'subscription',
            pipeline: [{ $project: { planCode: 1, pendingUpgrade: 1 } }],
          },
        },
        { $unwind: { path: '$shop', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$subscription', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            shopName: { $ifNull: ['$shop.name', 'Unknown Shop'] },
            shopEmail: '$shop.email',
            currentPlan: '$subscription.planCode',
            pendingUpgrade: '$subscription.pendingUpgrade',
          },
        },
        { $project: { shop: 0, subscription: 0 } },
      ]),
      this.invoiceModel.countDocuments({ status: 'pending_verification' }),
    ]);

    return { invoices, total };
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
    const [upgrades, total] = await Promise.all([
      this.subscriptionModel.aggregate([
        { $match: { pendingUpgrade: { $exists: true, $ne: null } } },
        { $sort: { 'pendingUpgrade.requestedAt': -1 } },
        { $skip: Number(skip) },
        { $limit: Number(limit) },
        {
          $lookup: {
            from: 'shops',
            localField: 'shopId',
            foreignField: '_id',
            as: 'shop',
            pipeline: [{ $project: { name: 1, email: 1 } }],
          },
        },
        {
          $lookup: {
            from: 'subscriptioninvoices',
            let: { invoiceId: { $toObjectId: '$pendingUpgrade.invoiceId' } },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$invoiceId'] } } },
              { $project: { invoiceNumber: 1, status: 1, totalAmount: 1, mpesaReceiptNumber: 1, manualPayment: 1 } },
            ],
            as: 'invoice',
          },
        },
        { $unwind: { path: '$shop', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$invoice', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            subscriptionId: '$_id',
            shopId: 1,
            shopName: { $ifNull: ['$shop.name', 'Unknown Shop'] },
            shopEmail: '$shop.email',
            currentPlan: '$planCode',
            pendingUpgrade: 1,
            invoice: {
              $cond: {
                if: '$invoice',
                then: {
                  id: '$invoice._id',
                  invoiceNumber: '$invoice.invoiceNumber',
                  status: '$invoice.status',
                  amount: '$invoice.totalAmount',
                  mpesaReceiptNumber: '$invoice.mpesaReceiptNumber',
                  manualPayment: '$invoice.manualPayment',
                },
                else: null,
              },
            },
          },
        },
      ]),
      this.subscriptionModel.countDocuments({ pendingUpgrade: { $exists: true, $ne: null } }),
    ]);

    return { upgrades, total };
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

    // Update the PaymentAttempt record if it exists (for Send Money payments)
    await this.attemptModel.updateOne(
      { invoiceId: invoiceId },
      {
        $set: {
          status: PaymentAttemptStatus.SUCCESS,
          completedAt: new Date(),
          approvedAt: new Date(),
          approvedBy: admin.sub,
          approvedByEmail: admin.email,
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
    let subscriptionActivated = false;
    
    if (invoice.type === 'upgrade') {
      const result = await this.subscriptionsService.activatePendingUpgrade(
        invoice.shopId.toString(),
        invoiceId,
      );
      if (result) {
        upgradeActivated = true;
        this.logger.log(`✅ Upgrade activated for shop ${invoice.shopId} after payment verification`);
      }
    } else {
      // For regular subscription invoices (renewal, new subscription), activate the subscription
      try {
        await this.subscriptionsService.verifyAndActivatePayment(invoiceId, admin.sub);
        subscriptionActivated = true;
        this.logger.log(`✅ Subscription activated for shop ${invoice.shopId} after payment verification`);
      } catch (activationError: any) {
        this.logger.warn(`Subscription activation skipped or failed: ${activationError.message}`);
        // Continue - invoice is already marked as paid
      }
    }

    // Emit refresh events for instant UI updates
    this.emitPaymentVerifiedEvents(invoice.shopId.toString(), invoiceId, upgradeActivated || subscriptionActivated);

    // Send payment confirmation email
    try {
      const shop = await this.shopModel.findById(invoice.shopId).lean();
      const shopAdmin = await this.userModel.findOne({ 
        shopId: invoice.shopId, 
        role: 'admin' 
      }).lean();
      const subscription = await this.subscriptionModel.findById(invoice.subscriptionId).lean();

      if (shopAdmin?.email && shop) {
        const template = EMAIL_TEMPLATES.payment_successful;
        const frontendUrl = process.env.FRONTEND_URL || 'https://www.smartduka.org';
        const apiUrl = process.env.API_URL || 'https://smarduka.onrender.com';
        
        // Format sender phone if available
        const senderPhone = invoice.manualPayment?.senderPhoneNumber;
        const formattedPhone = senderPhone ? 
          senderPhone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3') : null;
        
        await this.emailService.sendEmail({
          to: shopAdmin.email,
          subject: template.subject
            .replace('{{amount}}', `KES ${invoice.totalAmount.toLocaleString()}`)
            .replace('{{currency}}', 'KES'),
          html: template.getHtml({
            shopName: shop.name,
            userName: shopAdmin.name || shopAdmin.email,
            amount: `KES ${invoice.totalAmount.toLocaleString()}`,
            currency: 'KES',
            paymentMethod: formattedPhone ? `M-Pesa Send Money (${formattedPhone})` : 'M-Pesa Send Money',
            transactionId: invoice.mpesaReceiptNumber || invoice.invoiceNumber,
            planName: subscription?.planCode || 'Subscription',
            receiptUrl: `${frontendUrl}/settings/billing`,
            date: new Date().toLocaleDateString('en-KE', { 
              dateStyle: 'long' 
            }),
          }),
          templateName: 'payment_confirmed',
          category: 'billing',
        });

        this.logger.log(`📧 Payment confirmation email sent to ${shopAdmin.email}`);
      }
    } catch (emailError: any) {
      this.logger.error(`Failed to send payment confirmation email: ${emailError.message}`);
      // Don't fail the verification if email fails
    }

    return {
      success: true,
      message: upgradeActivated
        ? 'Payment verified and subscription upgraded successfully!'
        : subscriptionActivated
        ? 'Payment verified and subscription activated successfully!'
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

  /**
   * Emit refresh events for instant UI updates after payment verification
   */
  private emitPaymentVerifiedEvents(shopId: string, invoiceId: string, subscriptionActivated: boolean): void {
    try {
      this.logger.log(`🔄 Payment verified for shop ${shopId}, invoice ${invoiceId}${subscriptionActivated ? ' - subscription activated' : ''}`);
      
      // Emit real-time WebSocket events for instant UI updates
      this.eventsGateway.emitPaymentVerified({
        shopId,
        invoiceId,
        status: subscriptionActivated ? 'subscription_activated' : 'payment_verified',
        data: {
          subscriptionActivated,
          timestamp: new Date().toISOString(),
        },
      });

      if (subscriptionActivated) {
        // Also emit subscription updated event
        this.eventsGateway.emitSubscriptionUpdated({
          shopId,
          subscriptionId: undefined, // Will be populated by the gateway if needed
          status: 'subscription_activated',
          data: {
            activatedAt: new Date().toISOString(),
            trigger: 'payment_verification',
          },
        });
      }

      this.logger.log(`📡 Real-time events emitted for instant UI refresh`);
    } catch (error) {
      this.logger.warn(`Failed to emit payment verification events: ${error.message}`);
      // Don't fail payment verification if WebSocket fails
    }
  }
}
