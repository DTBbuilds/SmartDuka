import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subscription, SubscriptionDocument, SubscriptionStatus } from './schemas/subscription.schema';
import { SubscriptionPlan, SubscriptionPlanDocument } from './schemas/subscription-plan.schema';

/**
 * Subscription Access Levels
 * - FULL: All operations allowed (ACTIVE, TRIAL)
 * - READ_ONLY: Can view data but not create/update/delete (PAST_DUE during grace period)
 * - BLOCKED: No access to shop operations (SUSPENDED, EXPIRED, CANCELLED)
 * - NONE: No subscription found
 */
export enum SubscriptionAccessLevel {
  FULL = 'full',
  READ_ONLY = 'read_only',
  BLOCKED = 'blocked',
  NONE = 'none',
}

export interface SubscriptionAccessResult {
  accessLevel: SubscriptionAccessLevel;
  status: SubscriptionStatus | null;
  message: string;
  daysRemaining: number;
  daysUntilSuspension?: number;
  gracePeriodEndDate?: Date;
  canMakePayment: boolean;
  subscription?: {
    id: string;
    planCode: string;
    planName: string;
    currentPeriodEnd: Date;
    currentPrice: number;
  };
}

export interface SubscriptionWarning {
  type: 'expiring_soon' | 'past_due' | 'suspended' | 'expired';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  daysRemaining?: number;
  daysUntilSuspension?: number;
  actionRequired: boolean;
  actionLabel?: string;
  actionUrl?: string;
}

@Injectable()
export class SubscriptionEnforcementService {
  private readonly logger = new Logger(SubscriptionEnforcementService.name);

  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(SubscriptionPlan.name)
    private readonly planModel: Model<SubscriptionPlanDocument>,
  ) {}

  /**
   * Check subscription access level for a shop
   * This is the main method used by guards and frontend
   */
  async checkAccess(shopId: string): Promise<SubscriptionAccessResult> {
    try {
      const subscription = await this.subscriptionModel.findOne({
        shopId: new Types.ObjectId(shopId),
      });

      if (!subscription) {
        return {
          accessLevel: SubscriptionAccessLevel.NONE,
          status: null,
          message: 'No subscription found. Please subscribe to a plan to continue.',
          daysRemaining: 0,
          canMakePayment: true,
        };
      }

      const plan = await this.planModel.findById(subscription.planId);
      const planName = plan?.name || subscription.planCode;

      const now = new Date();
      const daysRemaining = Math.max(
        0,
        Math.ceil((subscription.currentPeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      );

      const subscriptionInfo = {
        id: subscription._id.toString(),
        planCode: subscription.planCode,
        planName,
        currentPeriodEnd: subscription.currentPeriodEnd,
        currentPrice: subscription.currentPrice,
      };

      switch (subscription.status) {
        case SubscriptionStatus.ACTIVE:
        case SubscriptionStatus.TRIAL:
          return {
            accessLevel: SubscriptionAccessLevel.FULL,
            status: subscription.status,
            message: subscription.status === SubscriptionStatus.TRIAL 
              ? `Trial period - ${daysRemaining} days remaining`
              : 'Subscription active',
            daysRemaining,
            canMakePayment: false,
            subscription: subscriptionInfo,
          };

        case SubscriptionStatus.PAST_DUE:
          const daysUntilSuspension = subscription.gracePeriodEndDate
            ? Math.max(0, Math.ceil((subscription.gracePeriodEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
            : 0;

          return {
            accessLevel: SubscriptionAccessLevel.READ_ONLY,
            status: subscription.status,
            message: `Payment overdue. ${daysUntilSuspension} days until suspension. Please pay to continue operations.`,
            daysRemaining: 0,
            daysUntilSuspension,
            gracePeriodEndDate: subscription.gracePeriodEndDate,
            canMakePayment: true,
            subscription: subscriptionInfo,
          };

        case SubscriptionStatus.SUSPENDED:
          return {
            accessLevel: SubscriptionAccessLevel.BLOCKED,
            status: subscription.status,
            message: 'Your subscription has been suspended due to non-payment. Please pay your outstanding invoice to restore access.',
            daysRemaining: 0,
            canMakePayment: true,
            subscription: subscriptionInfo,
          };

        case SubscriptionStatus.EXPIRED:
          return {
            accessLevel: SubscriptionAccessLevel.BLOCKED,
            status: subscription.status,
            message: 'Your subscription has expired. Please renew to continue using SmartDuka.',
            daysRemaining: 0,
            canMakePayment: true,
            subscription: subscriptionInfo,
          };

        case SubscriptionStatus.CANCELLED:
          return {
            accessLevel: SubscriptionAccessLevel.BLOCKED,
            status: subscription.status,
            message: 'Your subscription has been cancelled. Please reactivate to continue.',
            daysRemaining: 0,
            canMakePayment: true,
            subscription: subscriptionInfo,
          };

        case SubscriptionStatus.PENDING_PAYMENT:
          return {
            accessLevel: SubscriptionAccessLevel.BLOCKED,
            status: subscription.status,
            message: 'Your subscription is pending payment. Please complete payment to activate.',
            daysRemaining: 0,
            canMakePayment: true,
            subscription: subscriptionInfo,
          };

        default:
          this.logger.error(`Unknown subscription status: ${subscription.status}`);
          return {
            accessLevel: SubscriptionAccessLevel.BLOCKED,
            status: subscription.status,
            message: 'Unable to verify subscription status. Please contact support.',
            daysRemaining: 0,
            canMakePayment: true,
            subscription: subscriptionInfo,
          };
      }
    } catch (error) {
      this.logger.error(`Error checking subscription access for shop ${shopId}:`, error);
      // On error, allow access but log - don't block users due to system errors
      return {
        accessLevel: SubscriptionAccessLevel.FULL,
        status: null,
        message: 'Unable to verify subscription. Please try again.',
        daysRemaining: 0,
        canMakePayment: false,
      };
    }
  }

  /**
   * Get warnings for a shop's subscription
   * Used for displaying alerts in the UI
   */
  async getWarnings(shopId: string): Promise<SubscriptionWarning[]> {
    const warnings: SubscriptionWarning[] = [];

    try {
      const subscription = await this.subscriptionModel.findOne({
        shopId: new Types.ObjectId(shopId),
      });

      if (!subscription) {
        warnings.push({
          type: 'expired',
          severity: 'critical',
          title: 'No Subscription',
          message: 'You need an active subscription to use SmartDuka.',
          actionRequired: true,
          actionLabel: 'Choose a Plan',
          actionUrl: '/select-plan',
        });
        return warnings;
      }

      const plan = await this.planModel.findById(subscription.planId);
      const planName = plan?.name || subscription.planCode;
      const now = new Date();

      switch (subscription.status) {
        case SubscriptionStatus.ACTIVE:
        case SubscriptionStatus.TRIAL:
          const daysRemaining = Math.ceil(
            (subscription.currentPeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
          );

          // Warning at 7 days
          if (daysRemaining <= 7 && daysRemaining > 3) {
            warnings.push({
              type: 'expiring_soon',
              severity: 'info',
              title: 'Subscription Expiring Soon',
              message: `Your ${planName} subscription expires in ${daysRemaining} days. Renew now to avoid service interruption.`,
              daysRemaining,
              actionRequired: false,
              actionLabel: 'Renew Now',
              actionUrl: '/admin/subscription',
            });
          }
          // Warning at 3 days
          else if (daysRemaining <= 3 && daysRemaining > 1) {
            warnings.push({
              type: 'expiring_soon',
              severity: 'warning',
              title: 'Subscription Expiring Very Soon',
              message: `Your ${planName} subscription expires in ${daysRemaining} days. Renew immediately to continue operations.`,
              daysRemaining,
              actionRequired: true,
              actionLabel: 'Renew Now',
              actionUrl: '/admin/subscription',
            });
          }
          // Critical at 1 day
          else if (daysRemaining <= 1) {
            warnings.push({
              type: 'expiring_soon',
              severity: 'error',
              title: 'Subscription Expires Tomorrow',
              message: `Your ${planName} subscription expires tomorrow! Renew now to avoid losing access.`,
              daysRemaining,
              actionRequired: true,
              actionLabel: 'Renew Now',
              actionUrl: '/admin/subscription',
            });
          }
          break;

        case SubscriptionStatus.PAST_DUE:
          const daysUntilSuspension = subscription.gracePeriodEndDate
            ? Math.max(0, Math.ceil((subscription.gracePeriodEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
            : 0;

          warnings.push({
            type: 'past_due',
            severity: daysUntilSuspension <= 2 ? 'critical' : 'error',
            title: 'Payment Overdue',
            message: daysUntilSuspension > 0
              ? `Your payment is overdue. You have ${daysUntilSuspension} days to pay before your account is suspended. During this time, you can only view data.`
              : 'Your payment is overdue. Your account will be suspended soon.',
            daysUntilSuspension,
            actionRequired: true,
            actionLabel: 'Pay Now',
            actionUrl: '/admin/subscription',
          });
          break;

        case SubscriptionStatus.SUSPENDED:
          warnings.push({
            type: 'suspended',
            severity: 'critical',
            title: 'Account Suspended',
            message: 'Your account has been suspended due to non-payment. All shop operations are disabled. Pay now to restore access.',
            actionRequired: true,
            actionLabel: 'Pay Now',
            actionUrl: '/admin/subscription',
          });
          break;

        case SubscriptionStatus.EXPIRED:
          warnings.push({
            type: 'expired',
            severity: 'critical',
            title: 'Subscription Expired',
            message: 'Your subscription has expired. Renew now to continue using SmartDuka.',
            actionRequired: true,
            actionLabel: 'Renew Subscription',
            actionUrl: '/admin/subscription',
          });
          break;

        case SubscriptionStatus.CANCELLED:
          warnings.push({
            type: 'expired',
            severity: 'critical',
            title: 'Subscription Cancelled',
            message: 'Your subscription has been cancelled. Reactivate to continue using SmartDuka.',
            actionRequired: true,
            actionLabel: 'Reactivate',
            actionUrl: '/admin/subscription',
          });
          break;

        case SubscriptionStatus.PENDING_PAYMENT:
          warnings.push({
            type: 'expired',
            severity: 'critical',
            title: 'Payment Required',
            message: 'Complete your payment to activate your subscription and start using SmartDuka.',
            actionRequired: true,
            actionLabel: 'Complete Payment',
            actionUrl: '/admin/subscription',
          });
          break;
      }

      return warnings;
    } catch (error) {
      this.logger.error(`Error getting subscription warnings for shop ${shopId}:`, error);
      return [];
    }
  }

  /**
   * Check if a specific operation is allowed based on subscription status
   * Used for fine-grained access control
   */
  async isOperationAllowed(
    shopId: string,
    operation: 'read' | 'write' | 'delete' | 'pos' | 'reports',
  ): Promise<{ allowed: boolean; reason?: string }> {
    const access = await this.checkAccess(shopId);

    switch (access.accessLevel) {
      case SubscriptionAccessLevel.FULL:
        return { allowed: true };

      case SubscriptionAccessLevel.READ_ONLY:
        if (operation === 'read' || operation === 'reports') {
          return { allowed: true };
        }
        return {
          allowed: false,
          reason: `${operation} operations are disabled during grace period. Please pay your outstanding invoice.`,
        };

      case SubscriptionAccessLevel.BLOCKED:
      case SubscriptionAccessLevel.NONE:
        return {
          allowed: false,
          reason: access.message,
        };

      default:
        return { allowed: false, reason: 'Unknown access level' };
    }
  }
}
