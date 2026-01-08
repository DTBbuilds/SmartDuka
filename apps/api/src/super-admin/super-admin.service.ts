import { Injectable, Logger, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shop, ShopDocument } from '../shops/schemas/shop.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Subscription, SubscriptionDocument, SubscriptionStatus } from '../subscriptions/schemas/subscription.schema';
import { SubscriptionPlan, SubscriptionPlanDocument } from '../subscriptions/schemas/subscription-plan.schema';
import { ShopAuditLogService } from '../shops/services/shop-audit-log.service';
import { EmailService } from '../notifications/email.service';
import { EMAIL_TEMPLATES } from '../notifications/email-templates';

const GRACE_PERIOD_DAYS = 7;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://smartduka.co.ke';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    @InjectModel(Shop.name) private readonly shopModel: Model<ShopDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Subscription.name) private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(SubscriptionPlan.name) private readonly planModel: Model<SubscriptionPlanDocument>,
    private readonly auditLogService: ShopAuditLogService,
    @Optional() private readonly emailService?: EmailService,
  ) {}

  /**
   * Get all pending shops
   */
  async getPendingShops(limit: number = 50, skip: number = 0): Promise<ShopDocument[]> {
    return this.shopModel
      .find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get all verified shops
   */
  async getVerifiedShops(limit: number = 50, skip: number = 0): Promise<ShopDocument[]> {
    return this.shopModel
      .find({ status: 'verified' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get all active shops
   */
  async getActiveShops(limit: number = 50, skip: number = 0): Promise<ShopDocument[]> {
    return this.shopModel
      .find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get all suspended shops
   */
  async getSuspendedShops(limit: number = 50, skip: number = 0): Promise<ShopDocument[]> {
    return this.shopModel
      .find({ status: 'suspended' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get all flagged shops
   */
  async getFlaggedShops(limit: number = 50, skip: number = 0): Promise<ShopDocument[]> {
    return this.shopModel
      .find({ isFlagged: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get all shops with optional status filter
   */
  async getAllShops(limit: number = 50, skip: number = 0, status?: string): Promise<ShopDocument[]> {
    const query: any = {};
    if (status && status !== 'all') {
      if (status === 'flagged') {
        query.isFlagged = true;
      } else {
        query.status = status;
      }
    }
    return this.shopModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get count of all shops with optional status filter
   */
  async getAllShopsCount(status?: string): Promise<number> {
    const query: any = {};
    if (status && status !== 'all') {
      if (status === 'flagged') {
        query.isFlagged = true;
      } else {
        query.status = status;
      }
    }
    return this.shopModel.countDocuments(query).exec();
  }

  /**
   * Get shop details
   */
  async getShopDetails(shopId: string): Promise<ShopDocument> {
    const shop = await this.shopModel.findById(new Types.ObjectId(shopId)).exec();
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    return shop;
  }

  /**
   * Verify a shop - automatically activates it
   */
  async verifyShop(
    shopId: string,
    superAdminId: string,
    notes?: string,
  ): Promise<ShopDocument> {
    const shop = await this.getShopDetails(shopId);

    if (shop.status !== 'pending') {
      throw new BadRequestException(`Cannot verify shop with status: ${shop.status}`);
    }

    const oldValue = { status: shop.status };

    const updatedShop = await this.shopModel
      .findByIdAndUpdate(
        new Types.ObjectId(shopId),
        {
          status: 'active',  // ✅ Changed from 'verified' to 'active'
          verificationBy: new Types.ObjectId(superAdminId),
          verificationDate: new Date(),
          verificationNotes: notes,
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    // Log the action
    await this.auditLogService.create({
      shopId,
      performedBy: superAdminId,
      action: 'verify',
      oldValue,
      newValue: { status: 'active' },  // ✅ Updated to reflect 'active' status
      reason: 'Shop verified and activated by super admin',
      notes,
    });

    this.logger.log(`Shop ${shopId} verified and activated by ${superAdminId}`);
    if (!updatedShop) {
      throw new NotFoundException('Shop not found after update');
    }

    // Send verification email to shop owner
    if (this.emailService && updatedShop.email) {
      try {
        await this.emailService.sendTemplateEmail({
          to: updatedShop.email,
          templateName: 'shop_verified',
          variables: {
            shopName: updatedShop.name,
            verificationDate: new Date().toLocaleDateString('en-KE', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
            dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin`,
          },
        });
        this.logger.log(`Verification email sent to ${updatedShop.email}`);
      } catch (err) {
        this.logger.error(`Failed to send verification email: ${err}`);
        // Don't fail the verification if email fails
      }
    }

    return updatedShop;
  }

  /**
   * Reject a shop
   */
  async rejectShop(
    shopId: string,
    superAdminId: string,
    reason: string,
    notes?: string,
  ): Promise<ShopDocument> {
    const shop = await this.getShopDetails(shopId);

    if (shop.status !== 'pending') {
      throw new BadRequestException(`Cannot reject shop with status: ${shop.status}`);
    }

    const oldValue = { status: shop.status };

    const updatedShop = await this.shopModel
      .findByIdAndUpdate(
        new Types.ObjectId(shopId),
        {
          status: 'rejected',
          rejectionDate: new Date(),
          rejectionReason: reason,
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    // Log the action
    await this.auditLogService.create({
      shopId,
      performedBy: superAdminId,
      action: 'reject',
      oldValue,
      newValue: { status: 'rejected' },
      reason,
      notes,
    });

    this.logger.log(`Shop ${shopId} rejected by ${superAdminId}`);
    if (!updatedShop) {
      throw new NotFoundException('Shop not found after update');
    }

    // Send rejection email to shop owner
    if (this.emailService && updatedShop.email) {
      try {
        await this.emailService.sendTemplateEmail({
          to: updatedShop.email,
          templateName: 'shop_rejected',
          variables: {
            shopName: updatedShop.name,
            rejectionReason: reason,
            supportEmail: 'smartdukainfo@gmail.com',
          },
        });
        this.logger.log(`Rejection email sent to ${updatedShop.email}`);
      } catch (err) {
        this.logger.error(`Failed to send rejection email: ${err}`);
      }
    }

    return updatedShop;
  }

  /**
   * Suspend a shop
   */
  async suspendShop(
    shopId: string,
    superAdminId: string,
    reason: string,
    notes?: string,
  ): Promise<ShopDocument> {
    const shop = await this.getShopDetails(shopId);

    if (!['active', 'verified'].includes(shop.status)) {
      throw new BadRequestException(`Cannot suspend shop with status: ${shop.status}`);
    }

    const oldValue = { status: shop.status };

    const updatedShop = await this.shopModel
      .findByIdAndUpdate(
        new Types.ObjectId(shopId),
        {
          status: 'suspended',
          suspensionDate: new Date(),
          suspensionReason: reason,
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    // Log the action
    await this.auditLogService.create({
      shopId,
      performedBy: superAdminId,
      action: 'suspend',
      oldValue,
      newValue: { status: 'suspended' },
      reason,
      notes,
    });

    this.logger.log(`Shop ${shopId} suspended by ${superAdminId}`);
    if (!updatedShop) {
      throw new NotFoundException('Shop not found after update');
    }

    // Send suspension email to shop owner
    if (this.emailService && updatedShop.email) {
      try {
        await this.emailService.sendTemplateEmail({
          to: updatedShop.email,
          templateName: 'shop_suspended',
          variables: {
            shopName: updatedShop.name,
            suspensionReason: reason,
            supportEmail: 'smartdukainfo@gmail.com',
          },
        });
        this.logger.log(`Suspension email sent to ${updatedShop.email}`);
      } catch (err) {
        this.logger.error(`Failed to send suspension email: ${err}`);
      }
    }

    return updatedShop;
  }

  /**
   * Reactivate a shop
   */
  async reactivateShop(
    shopId: string,
    superAdminId: string,
    notes?: string,
  ): Promise<ShopDocument> {
    const shop = await this.getShopDetails(shopId);

    if (shop.status !== 'suspended') {
      throw new BadRequestException(`Cannot reactivate shop with status: ${shop.status}`);
    }

    const oldValue = { status: shop.status };

    const updatedShop = await this.shopModel
      .findByIdAndUpdate(
        new Types.ObjectId(shopId),
        {
          status: 'active',
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    // Log the action
    await this.auditLogService.create({
      shopId,
      performedBy: superAdminId,
      action: 'reactivate',
      oldValue,
      newValue: { status: 'active' },
      reason: 'Shop reactivated by super admin',
      notes,
    });

    this.logger.log(`Shop ${shopId} reactivated by ${superAdminId}`);
    if (!updatedShop) {
      throw new NotFoundException('Shop not found after update');
    }
    return updatedShop;
  }

  /**
   * Flag a shop for review
   */
  async flagShop(
    shopId: string,
    superAdminId: string,
    reason: string,
    notes?: string,
  ): Promise<ShopDocument> {
    const shop = await this.getShopDetails(shopId);

    const updatedShop = await this.shopModel
      .findByIdAndUpdate(
        new Types.ObjectId(shopId),
        {
          isFlagged: true,
          flagReason: reason,
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    // Log the action
    await this.auditLogService.create({
      shopId,
      performedBy: superAdminId,
      action: 'flag',
      oldValue: { isFlagged: shop.isFlagged },
      newValue: { isFlagged: true },
      reason,
      notes,
    });

    this.logger.log(`Shop ${shopId} flagged by ${superAdminId}`);
    if (!updatedShop) {
      throw new NotFoundException('Shop not found after update');
    }
    return updatedShop;
  }

  /**
   * Unflag a shop
   */
  async unflagShop(
    shopId: string,
    superAdminId: string,
    notes?: string,
  ): Promise<ShopDocument> {
    const shop = await this.getShopDetails(shopId);

    const updatedShop = await this.shopModel
      .findByIdAndUpdate(
        new Types.ObjectId(shopId),
        {
          isFlagged: false,
          flagReason: undefined,
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    // Log the action
    await this.auditLogService.create({
      shopId,
      performedBy: superAdminId,
      action: 'unflag',
      oldValue: { isFlagged: shop.isFlagged },
      newValue: { isFlagged: false },
      reason: 'Shop unflagged by super admin',
      notes,
    });

    this.logger.log(`Shop ${shopId} unflagged by ${superAdminId}`);
    if (!updatedShop) {
      throw new NotFoundException('Shop not found after update');
    }
    return updatedShop;
  }

  /**
   * Get shop audit log
   */
  async getShopAuditLog(shopId: string, limit: number = 50, skip: number = 0) {
    return this.auditLogService.getShopAuditLog(shopId, limit, skip);
  }

  /**
   * Get verification history
   */
  async getVerificationHistory(shopId: string) {
    return this.auditLogService.getVerificationHistory(shopId);
  }

  /**
   * Get shop statistics
   */
  async getShopStats(shopId: string) {
    const shop = await this.getShopDetails(shopId);
    return {
      id: shop._id,
      name: shop.name,
      email: shop.email,
      phone: shop.phone,
      status: shop.status,
      complianceScore: shop.complianceScore,
      chargebackRate: shop.chargebackRate,
      refundRate: shop.refundRate,
      violationCount: shop.violationCount,
      cashierCount: shop.cashierCount,
      totalSales: shop.totalSales,
      totalOrders: shop.totalOrders,
      lastActivityDate: shop.lastActivityDate,
      isFlagged: shop.isFlagged,
      isMonitored: shop.isMonitored,
      verificationDate: shop.verificationDate,
      suspensionDate: shop.suspensionDate,
      createdAt: (shop as any).createdAt,
      updatedAt: (shop as any).updatedAt,
    };
  }

  /**
   * Get pending shops count
   */
  async getPendingShopsCount(): Promise<number> {
    return this.shopModel.countDocuments({ status: 'pending' });
  }

  /**
   * Get flagged shops count
   */
  async getFlaggedShopsCount(): Promise<number> {
    return this.shopModel.countDocuments({ isFlagged: true });
  }

  /**
   * Get suspended shops count
   */
  async getSuspendedShopsCount(): Promise<number> {
    return this.shopModel.countDocuments({ status: 'suspended' });
  }

  /**
   * Get verified shops count
   */
  async getVerifiedShopsCount(): Promise<number> {
    return this.shopModel.countDocuments({ status: 'verified' });
  }

  /**
   * Get active shops count
   */
  async getActiveShopsCount(): Promise<number> {
    return this.shopModel.countDocuments({ status: 'active' });
  }

  /**
   * Soft delete a shop
   * This marks the shop as deleted without removing data from the database
   * All related data remains but the shop becomes inaccessible
   */
  async softDeleteShop(
    shopId: string,
    superAdminId: string,
    reason: string,
  ): Promise<ShopDocument> {
    const shop = await this.getShopDetails(shopId);

    // Check if already deleted
    if (shop.deletedAt) {
      throw new BadRequestException('Shop is already deleted');
    }

    const oldValue = { 
      status: shop.status,
      deletedAt: null,
    };

    const updatedShop = await this.shopModel
      .findByIdAndUpdate(
        new Types.ObjectId(shopId),
        {
          status: 'suspended', // Change status to suspended
          deletedAt: new Date(),
          deletedBy: new Types.ObjectId(superAdminId),
          deletionReason: reason,
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    // Log the action
    await this.auditLogService.create({
      shopId,
      performedBy: superAdminId,
      action: 'delete',
      oldValue,
      newValue: { 
        status: 'suspended',
        deletedAt: new Date(),
      },
      reason,
      notes: `Shop soft deleted by super admin. Reason: ${reason}`,
    });

    this.logger.log(`Shop ${shopId} soft deleted by ${superAdminId}. Reason: ${reason}`);
    
    if (!updatedShop) {
      throw new NotFoundException('Shop not found after update');
    }

    return updatedShop;
  }

  /**
   * Restore a soft-deleted shop
   */
  async restoreShop(
    shopId: string,
    superAdminId: string,
    notes?: string,
  ): Promise<ShopDocument> {
    const shop = await this.shopModel.findById(new Types.ObjectId(shopId)).exec();
    
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (!shop.deletedAt) {
      throw new BadRequestException('Shop is not deleted');
    }

    const oldValue = { 
      status: shop.status,
      deletedAt: shop.deletedAt,
    };

    const updatedShop = await this.shopModel
      .findByIdAndUpdate(
        new Types.ObjectId(shopId),
        {
          status: 'active', // Restore to active status
          $unset: { 
            deletedAt: 1,
            deletedBy: 1,
            deletionReason: 1,
          },
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    // Log the action
    await this.auditLogService.create({
      shopId,
      performedBy: superAdminId,
      action: 'reactivate',
      oldValue,
      newValue: { 
        status: 'active',
        deletedAt: null,
      },
      reason: 'Shop restored by super admin',
      notes,
    });

    this.logger.log(`Shop ${shopId} restored by ${superAdminId}`);
    
    if (!updatedShop) {
      throw new NotFoundException('Shop not found after update');
    }

    return updatedShop;
  }

  /**
   * Get deleted shops
   */
  async getDeletedShops(limit: number = 50, skip: number = 0): Promise<ShopDocument[]> {
    return this.shopModel
      .find({ deletedAt: { $ne: null } })
      .sort({ deletedAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get deleted shops count
   */
  async getDeletedShopsCount(): Promise<number> {
    return this.shopModel.countDocuments({ deletedAt: { $ne: null } });
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats() {
    const [
      totalSubscriptions,
      activeCount,
      trialCount,
      pastDueCount,
      suspendedCount,
      expiredCount,
      cancelledCount,
    ] = await Promise.all([
      this.subscriptionModel.countDocuments(),
      this.subscriptionModel.countDocuments({ status: SubscriptionStatus.ACTIVE }),
      this.subscriptionModel.countDocuments({ status: SubscriptionStatus.TRIAL }),
      this.subscriptionModel.countDocuments({ status: SubscriptionStatus.PAST_DUE }),
      this.subscriptionModel.countDocuments({ status: SubscriptionStatus.SUSPENDED }),
      this.subscriptionModel.countDocuments({ status: SubscriptionStatus.EXPIRED }),
      this.subscriptionModel.countDocuments({ status: SubscriptionStatus.CANCELLED }),
    ]);

    return {
      total: totalSubscriptions,
      active: activeCount,
      trial: trialCount,
      pastDue: pastDueCount,
      suspended: suspendedCount,
      expired: expiredCount,
      cancelled: cancelledCount,
      healthy: activeCount + trialCount,
      atRisk: pastDueCount,
      blocked: suspendedCount + expiredCount + cancelledCount,
    };
  }

  /**
   * Process all expired subscriptions
   * Updates status and sends reminder emails
   */
  async processExpiredSubscriptions(superAdminId: string) {
    const now = new Date();
    const results = {
      processed: 0,
      expired: 0,
      pastDue: 0,
      suspended: 0,
      emailsSent: 0,
      errors: [] as string[],
    };

    this.logger.log(`Processing expired subscriptions triggered by ${superAdminId}`);

    try {
      // 1. Expire subscriptions (no auto-renew, period ended)
      const toExpire = await this.subscriptionModel.find({
        status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
        currentPeriodEnd: { $lt: now },
        autoRenew: false,
      });

      for (const sub of toExpire) {
        sub.status = SubscriptionStatus.EXPIRED;
        await sub.save();
        results.expired++;
        await this.sendSubscriptionEmail(sub, 'expired');
        results.emailsSent++;
      }

      // 2. Set to PAST_DUE (auto-renew, period ended)
      const toPastDue = await this.subscriptionModel.find({
        status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
        currentPeriodEnd: { $lt: now },
        autoRenew: true,
      });

      for (const sub of toPastDue) {
        sub.status = SubscriptionStatus.PAST_DUE;
        sub.gracePeriodEndDate = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
        await sub.save();
        results.pastDue++;
        await this.sendSubscriptionEmail(sub, 'past_due');
        results.emailsSent++;
      }

      // 3. Suspend (grace period ended)
      const toSuspend = await this.subscriptionModel.find({
        status: SubscriptionStatus.PAST_DUE,
        gracePeriodEndDate: { $lt: now },
      });

      for (const sub of toSuspend) {
        sub.status = SubscriptionStatus.SUSPENDED;
        await sub.save();
        results.suspended++;
        await this.sendSubscriptionEmail(sub, 'suspended');
        results.emailsSent++;
      }

      // 4. Send reminders to existing PAST_DUE, SUSPENDED, EXPIRED
      const needReminders = await this.subscriptionModel.find({
        status: { $in: [SubscriptionStatus.PAST_DUE, SubscriptionStatus.SUSPENDED, SubscriptionStatus.EXPIRED] },
      });

      for (const sub of needReminders) {
        // Skip if we already processed this subscription above
        if (toExpire.some(s => s._id.equals(sub._id)) ||
            toPastDue.some(s => s._id.equals(sub._id)) ||
            toSuspend.some(s => s._id.equals(sub._id))) {
          continue;
        }
        await this.sendSubscriptionEmail(sub, sub.status);
        results.emailsSent++;
      }

      results.processed = toExpire.length + toPastDue.length + toSuspend.length + needReminders.length;

    } catch (error: any) {
      this.logger.error('Error processing subscriptions:', error);
      results.errors.push(error.message);
    }

    this.logger.log(`Subscription processing complete: ${JSON.stringify(results)}`);
    return results;
  }

  /**
   * Send subscription status email
   */
  private async sendSubscriptionEmail(subscription: SubscriptionDocument, status: string): Promise<boolean> {
    if (!this.emailService) return false;

    const shop = await this.shopModel.findById(subscription.shopId);
    const admin = await this.userModel.findOne({ shopId: subscription.shopId, role: 'admin' });
    const plan = await this.planModel.findById(subscription.planId);

    if (!shop || !admin?.email) return false;

    let template: any;
    let vars: Record<string, any> = {
      shopName: shop.name,
      userName: admin.name || admin.email,
      planName: plan?.name || subscription.planCode,
      amount: subscription.currentPrice.toLocaleString(),
      payUrl: `${FRONTEND_URL}/admin/subscription`,
      renewUrl: `${FRONTEND_URL}/admin/subscription`,
    };

    switch (status) {
      case SubscriptionStatus.EXPIRED:
      case 'expired':
        template = EMAIL_TEMPLATES.subscription_expired;
        vars.gracePeriodDays = '30';
        break;
      case SubscriptionStatus.PAST_DUE:
      case 'past_due':
        template = EMAIL_TEMPLATES.subscription_past_due_day1;
        const daysUntil = subscription.gracePeriodEndDate
          ? Math.ceil((subscription.gracePeriodEndDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
          : GRACE_PERIOD_DAYS;
        vars.daysUntilSuspension = daysUntil.toString();
        break;
      case SubscriptionStatus.SUSPENDED:
      case 'suspended':
        template = EMAIL_TEMPLATES.subscription_suspended_notice;
        vars.dataRetentionDays = '30';
        break;
      default:
        return false;
    }

    if (!template) return false;

    try {
      const result = await this.emailService.sendEmail({
        to: admin.email,
        subject: template.subject.replace('{{shopName}}', shop.name),
        html: template.getHtml(vars),
      });
      return result.success;
    } catch (error) {
      this.logger.error(`Failed to send email to ${admin.email}:`, error);
      return false;
    }
  }
}
