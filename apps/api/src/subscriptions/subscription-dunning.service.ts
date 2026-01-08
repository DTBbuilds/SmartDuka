import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Subscription, SubscriptionDocument, SubscriptionStatus } from './schemas/subscription.schema';
import { SubscriptionPlan, SubscriptionPlanDocument } from './schemas/subscription-plan.schema';
import { SubscriptionInvoice, SubscriptionInvoiceDocument, InvoiceStatus } from './schemas/subscription-invoice.schema';
import { Shop, ShopDocument } from '../shops/schemas/shop.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../notifications/email.service';
import { EMAIL_TEMPLATES } from '../notifications/email-templates';

// Grace period in days before suspension
const GRACE_PERIOD_DAYS = 7;

// Data retention period after suspension (days)
const DATA_RETENTION_DAYS = 30;

export interface DunningResult {
  shopId: string;
  shopName: string;
  action: string;
  success: boolean;
  error?: string;
}

@Injectable()
export class SubscriptionDunningService {
  private readonly logger = new Logger(SubscriptionDunningService.name);
  private readonly frontendUrl: string;

  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(SubscriptionPlan.name)
    private readonly planModel: Model<SubscriptionPlanDocument>,
    @InjectModel(SubscriptionInvoice.name)
    private readonly invoiceModel: Model<SubscriptionInvoiceDocument>,
    @InjectModel(Shop.name)
    private readonly shopModel: Model<ShopDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://smartduka.co.ke';
  }

  /**
   * Process all dunning notifications
   * This should be called daily by the scheduler
   */
  async processDunningNotifications(): Promise<DunningResult[]> {
    const results: DunningResult[] = [];

    try {
      // 1. Send expiry warnings (7, 3, 1 days before)
      const expiryResults = await this.sendExpiryWarnings();
      results.push(...expiryResults);

      // 2. Send grace period reminders (day 1, 3, 5)
      const graceResults = await this.sendGracePeriodReminders();
      results.push(...graceResults);

      // 3. Send suspension notices
      const suspensionResults = await this.sendSuspensionNotices();
      results.push(...suspensionResults);

      this.logger.log(`Dunning process completed: ${results.length} notifications processed`);
    } catch (error) {
      this.logger.error('Error processing dunning notifications:', error);
    }

    return results;
  }

  /**
   * Send expiry warnings for subscriptions expiring in 7, 3, or 1 days
   */
  private async sendExpiryWarnings(): Promise<DunningResult[]> {
    const results: DunningResult[] = [];
    const now = new Date();

    // Find subscriptions expiring in exactly 7, 3, or 1 days
    const warningDays = [7, 3, 1];

    for (const days of warningDays) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + days);
      
      // Set to start and end of day
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const subscriptions = await this.subscriptionModel.find({
        status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
        currentPeriodEnd: { $gte: startOfDay, $lte: endOfDay },
        autoRenew: true,
      });

      for (const subscription of subscriptions) {
        try {
          const result = await this.sendExpiryWarningEmail(subscription, days);
          results.push(result);
        } catch (error) {
          this.logger.error(`Failed to send ${days}-day expiry warning for shop ${subscription.shopId}:`, error);
          results.push({
            shopId: subscription.shopId.toString(),
            shopName: 'Unknown',
            action: `expiry_warning_${days}days`,
            success: false,
            error: error.message,
          });
        }
      }
    }

    return results;
  }

  /**
   * Send grace period reminders for past due subscriptions
   */
  private async sendGracePeriodReminders(): Promise<DunningResult[]> {
    const results: DunningResult[] = [];
    const now = new Date();

    // Find past due subscriptions
    const pastDueSubscriptions = await this.subscriptionModel.find({
      status: SubscriptionStatus.PAST_DUE,
      gracePeriodEndDate: { $gt: now },
    });

    for (const subscription of pastDueSubscriptions) {
      try {
        const daysUntilSuspension = Math.ceil(
          (subscription.gracePeriodEndDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );
        const dayInGracePeriod = GRACE_PERIOD_DAYS - daysUntilSuspension;

        // Send reminders on day 1, 3, and 5 of grace period
        if ([1, 3, 5].includes(dayInGracePeriod)) {
          // Check if we already sent a reminder today
          const lastReminderSent = subscription.notifications?.lastReminderSent;
          if (lastReminderSent) {
            const lastReminderDate = new Date(lastReminderSent);
            if (lastReminderDate.toDateString() === now.toDateString()) {
              continue; // Already sent today
            }
          }

          const result = await this.sendGracePeriodReminderEmail(subscription, daysUntilSuspension, dayInGracePeriod);
          results.push(result);

          // Update last reminder sent
          await this.subscriptionModel.updateOne(
            { _id: subscription._id },
            { 'notifications.lastReminderSent': now }
          );
        }
      } catch (error) {
        this.logger.error(`Failed to send grace period reminder for shop ${subscription.shopId}:`, error);
        results.push({
          shopId: subscription.shopId.toString(),
          shopName: 'Unknown',
          action: 'grace_period_reminder',
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Send suspension notices for newly suspended subscriptions
   */
  private async sendSuspensionNotices(): Promise<DunningResult[]> {
    const results: DunningResult[] = [];
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find subscriptions that were suspended in the last 24 hours
    const suspendedSubscriptions = await this.subscriptionModel.find({
      status: SubscriptionStatus.SUSPENDED,
      updatedAt: { $gte: oneDayAgo },
    });

    for (const subscription of suspendedSubscriptions) {
      try {
        // Check if we already sent a suspension notice
        const metadata = subscription.metadata as any;
        if (metadata?.suspensionNoticeSent) {
          continue;
        }

        const result = await this.sendSuspensionNoticeEmail(subscription);
        results.push(result);

        // Mark suspension notice as sent
        await this.subscriptionModel.updateOne(
          { _id: subscription._id },
          { 'metadata.suspensionNoticeSent': true, 'metadata.suspensionNoticeDate': now }
        );
      } catch (error) {
        this.logger.error(`Failed to send suspension notice for shop ${subscription.shopId}:`, error);
        results.push({
          shopId: subscription.shopId.toString(),
          shopName: 'Unknown',
          action: 'suspension_notice',
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Send expiry warning email
   */
  private async sendExpiryWarningEmail(subscription: SubscriptionDocument, daysRemaining: number): Promise<DunningResult> {
    const shop = await this.shopModel.findById(subscription.shopId);
    const admin = await this.userModel.findOne({ shopId: subscription.shopId, role: 'admin' });
    const plan = await this.planModel.findById(subscription.planId);

    if (!shop || !admin) {
      return {
        shopId: subscription.shopId.toString(),
        shopName: shop?.name || 'Unknown',
        action: `expiry_warning_${daysRemaining}days`,
        success: false,
        error: 'Shop or admin not found',
      };
    }

    const templateName = daysRemaining === 7 
      ? 'subscription_expiring_7days'
      : daysRemaining === 3 
        ? 'subscription_expiring_3days'
        : 'subscription_expiring_1day';

    const template = EMAIL_TEMPLATES[templateName];
    if (!template) {
      return {
        shopId: subscription.shopId.toString(),
        shopName: shop.name,
        action: `expiry_warning_${daysRemaining}days`,
        success: false,
        error: 'Email template not found',
      };
    }

    const vars = {
      shopName: shop.name,
      userName: admin.name || admin.email,
      planName: plan?.name || subscription.planCode,
      expiryDate: subscription.currentPeriodEnd.toLocaleDateString('en-KE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      renewUrl: `${this.frontendUrl}/admin/subscription`,
      amount: subscription.currentPrice.toLocaleString(),
    };

    try {
      await this.emailService.sendEmail({
        to: admin.email,
        subject: template.subject.replace('{{shopName}}', shop.name),
        html: template.getHtml(vars),
      });

      // Create in-app notification
      await this.notificationsService.create({
        shopId: subscription.shopId.toString(),
        userId: admin._id.toString(),
        type: 'subscription' as any,
        title: `Subscription expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`,
        message: `Your ${plan?.name || subscription.planCode} subscription will expire on ${vars.expiryDate}. Renew now to avoid service interruption.`,
        channels: ['in_app', 'email'] as any,
        data: { daysRemaining, renewUrl: vars.renewUrl },
      });

      this.logger.log(`Sent ${daysRemaining}-day expiry warning to ${shop.name} (${admin.email})`);

      return {
        shopId: subscription.shopId.toString(),
        shopName: shop.name,
        action: `expiry_warning_${daysRemaining}days`,
        success: true,
      };
    } catch (error) {
      this.logger.error(`Failed to send expiry warning email to ${admin.email}:`, error);
      return {
        shopId: subscription.shopId.toString(),
        shopName: shop.name,
        action: `expiry_warning_${daysRemaining}days`,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send grace period reminder email
   */
  private async sendGracePeriodReminderEmail(
    subscription: SubscriptionDocument, 
    daysUntilSuspension: number,
    dayInGracePeriod: number
  ): Promise<DunningResult> {
    const shop = await this.shopModel.findById(subscription.shopId);
    const admin = await this.userModel.findOne({ shopId: subscription.shopId, role: 'admin' });
    const plan = await this.planModel.findById(subscription.planId);

    if (!shop || !admin) {
      return {
        shopId: subscription.shopId.toString(),
        shopName: shop?.name || 'Unknown',
        action: `grace_period_day${dayInGracePeriod}`,
        success: false,
        error: 'Shop or admin not found',
      };
    }

    // Use day 1 or day 5 template based on urgency
    const templateName = dayInGracePeriod >= 5 
      ? 'subscription_past_due_day5'
      : 'subscription_past_due_day1';

    const template = EMAIL_TEMPLATES[templateName];
    if (!template) {
      return {
        shopId: subscription.shopId.toString(),
        shopName: shop.name,
        action: `grace_period_day${dayInGracePeriod}`,
        success: false,
        error: 'Email template not found',
      };
    }

    const suspensionDate = subscription.gracePeriodEndDate?.toLocaleDateString('en-KE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const vars = {
      shopName: shop.name,
      userName: admin.name || admin.email,
      planName: plan?.name || subscription.planCode,
      amount: subscription.currentPrice.toLocaleString(),
      daysUntilSuspension: daysUntilSuspension.toString(),
      suspensionDate,
      payUrl: `${this.frontendUrl}/admin/subscription`,
    };

    try {
      await this.emailService.sendEmail({
        to: admin.email,
        subject: template.subject
          .replace('{{shopName}}', shop.name)
          .replace('{{daysUntilSuspension}}', daysUntilSuspension.toString()),
        html: template.getHtml(vars),
      });

      // Create in-app notification
      await this.notificationsService.create({
        shopId: subscription.shopId.toString(),
        userId: admin._id.toString(),
        type: 'subscription' as any,
        title: `Payment Overdue - ${daysUntilSuspension} days until suspension`,
        message: `Your subscription payment is overdue. Pay now to avoid account suspension on ${suspensionDate}.`,
        channels: ['in_app', 'email'] as any,
        data: { daysUntilSuspension, payUrl: vars.payUrl },
      });

      this.logger.log(`Sent grace period reminder (day ${dayInGracePeriod}) to ${shop.name} (${admin.email})`);

      return {
        shopId: subscription.shopId.toString(),
        shopName: shop.name,
        action: `grace_period_day${dayInGracePeriod}`,
        success: true,
      };
    } catch (error) {
      this.logger.error(`Failed to send grace period reminder to ${admin.email}:`, error);
      return {
        shopId: subscription.shopId.toString(),
        shopName: shop.name,
        action: `grace_period_day${dayInGracePeriod}`,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send suspension notice email
   */
  private async sendSuspensionNoticeEmail(subscription: SubscriptionDocument): Promise<DunningResult> {
    const shop = await this.shopModel.findById(subscription.shopId);
    const admin = await this.userModel.findOne({ shopId: subscription.shopId, role: 'admin' });
    const plan = await this.planModel.findById(subscription.planId);

    if (!shop || !admin) {
      return {
        shopId: subscription.shopId.toString(),
        shopName: shop?.name || 'Unknown',
        action: 'suspension_notice',
        success: false,
        error: 'Shop or admin not found',
      };
    }

    const template = EMAIL_TEMPLATES.subscription_suspended_notice;
    if (!template) {
      return {
        shopId: subscription.shopId.toString(),
        shopName: shop.name,
        action: 'suspension_notice',
        success: false,
        error: 'Email template not found',
      };
    }

    const vars = {
      shopName: shop.name,
      userName: admin.name || admin.email,
      planName: plan?.name || subscription.planCode,
      amount: subscription.currentPrice.toLocaleString(),
      payUrl: `${this.frontendUrl}/admin/subscription`,
      dataRetentionDays: DATA_RETENTION_DAYS.toString(),
    };

    try {
      await this.emailService.sendEmail({
        to: admin.email,
        subject: template.subject.replace('{{shopName}}', shop.name),
        html: template.getHtml(vars),
      });

      // Create in-app notification
      await this.notificationsService.create({
        shopId: subscription.shopId.toString(),
        userId: admin._id.toString(),
        type: 'subscription' as any,
        title: 'Account Suspended',
        message: `Your SmartDuka account has been suspended due to non-payment. Pay now to restore access.`,
        channels: ['in_app', 'email'] as any,
        data: { payUrl: vars.payUrl },
      });

      this.logger.log(`Sent suspension notice to ${shop.name} (${admin.email})`);

      return {
        shopId: subscription.shopId.toString(),
        shopName: shop.name,
        action: 'suspension_notice',
        success: true,
      };
    } catch (error) {
      this.logger.error(`Failed to send suspension notice to ${admin.email}:`, error);
      return {
        shopId: subscription.shopId.toString(),
        shopName: shop.name,
        action: 'suspension_notice',
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send reactivation confirmation email
   */
  async sendReactivationEmail(shopId: string): Promise<DunningResult> {
    const subscription = await this.subscriptionModel.findOne({ shopId: new Types.ObjectId(shopId) });
    const shop = await this.shopModel.findById(shopId);
    const admin = await this.userModel.findOne({ shopId: new Types.ObjectId(shopId), role: 'admin' });
    const plan = subscription ? await this.planModel.findById(subscription.planId) : null;

    if (!subscription || !shop || !admin) {
      return {
        shopId,
        shopName: shop?.name || 'Unknown',
        action: 'reactivation_confirmation',
        success: false,
        error: 'Subscription, shop, or admin not found',
      };
    }

    const template = EMAIL_TEMPLATES.subscription_reactivated;
    if (!template) {
      return {
        shopId,
        shopName: shop.name,
        action: 'reactivation_confirmation',
        success: false,
        error: 'Email template not found',
      };
    }

    const vars = {
      shopName: shop.name,
      userName: admin.name || admin.email,
      planName: plan?.name || subscription.planCode,
      nextBillingDate: subscription.nextBillingDate?.toLocaleDateString('en-KE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }) || 'N/A',
      dashboardUrl: `${this.frontendUrl}/admin/dashboard`,
    };

    try {
      await this.emailService.sendEmail({
        to: admin.email,
        subject: template.subject.replace('{{shopName}}', shop.name),
        html: template.getHtml(vars),
      });

      // Create in-app notification
      await this.notificationsService.create({
        shopId,
        userId: admin._id.toString(),
        type: 'subscription' as any,
        title: 'Subscription Reactivated!',
        message: `Your ${plan?.name || subscription.planCode} subscription has been reactivated. Welcome back!`,
        channels: ['in_app', 'email'] as any,
        data: { dashboardUrl: vars.dashboardUrl },
      });

      this.logger.log(`Sent reactivation confirmation to ${shop.name} (${admin.email})`);

      return {
        shopId,
        shopName: shop.name,
        action: 'reactivation_confirmation',
        success: true,
      };
    } catch (error) {
      this.logger.error(`Failed to send reactivation email to ${admin.email}:`, error);
      return {
        shopId,
        shopName: shop.name,
        action: 'reactivation_confirmation',
        success: false,
        error: error.message,
      };
    }
  }
}
