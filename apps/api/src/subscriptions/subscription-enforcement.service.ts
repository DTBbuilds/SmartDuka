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
          // Check if subscription period has actually ended (especially important for daily plans)
          if (now > subscription.currentPeriodEnd) {
            // Period has ended - subscription should be expired/past due
            // For daily plans without auto-renew, block immediately
            if (subscription.billingCycle === 'daily' || !subscription.autoRenew) {
              return {
                accessLevel: SubscriptionAccessLevel.BLOCKED,
                status: SubscriptionStatus.EXPIRED,
                message: 'Your subscription period has ended. Please renew to continue using SmartDuka.',
                daysRemaining: 0,
                canMakePayment: true,
                subscription: subscriptionInfo,
              };
            }
            // For auto-renew subscriptions, give grace period (read-only access)
            return {
              accessLevel: SubscriptionAccessLevel.READ_ONLY,
              status: SubscriptionStatus.PAST_DUE,
              message: 'Your subscription payment is due. Please pay to continue full operations.',
              daysRemaining: 0,
              canMakePayment: true,
              subscription: subscriptionInfo,
            };
          }
          return {
            accessLevel: SubscriptionAccessLevel.FULL,
            status: subscription.status,
            message: 'Subscription active',
            daysRemaining,
            canMakePayment: false,
            subscription: subscriptionInfo,
          };

        case SubscriptionStatus.TRIAL:
          // Check if trial has expired (14 days)
          const trialEnd = subscription.trialEndDate || subscription.currentPeriodEnd;
          if (now > trialEnd) {
            // Trial has expired - BLOCK access until they upgrade
            return {
              accessLevel: SubscriptionAccessLevel.BLOCKED,
              status: subscription.status,
              message: 'Your 14-day trial has ended. Please upgrade to a paid plan to continue using SmartDuka.',
              daysRemaining: 0,
              canMakePayment: true,
              subscription: subscriptionInfo,
            };
          }
          // Trial still active
          const trialDaysRemaining = Math.max(
            0,
            Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
          );
          return {
            accessLevel: SubscriptionAccessLevel.FULL,
            status: subscription.status,
            message: `Trial period - ${trialDaysRemaining} days remaining`,
            daysRemaining: trialDaysRemaining,
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
          const activeDaysRemaining = Math.ceil(
            (subscription.currentPeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
          );
          const activeHoursRemaining = Math.ceil(
            (subscription.currentPeriodEnd.getTime() - now.getTime()) / (60 * 60 * 1000)
          );

          // Check if subscription has actually expired
          if (now > subscription.currentPeriodEnd) {
            warnings.push({
              type: 'expired',
              severity: 'critical',
              title: 'Subscription Expired',
              message: `Your ${planName} subscription has expired. Please renew to continue using SmartDuka.`,
              daysRemaining: 0,
              actionRequired: true,
              actionLabel: 'Renew Now',
              actionUrl: '/settings?tab=subscription',
            });
            break;
          }

          // Special handling for daily plans - warn in hours
          if (subscription.billingCycle === 'daily') {
            if (activeHoursRemaining <= 6 && activeHoursRemaining > 2) {
              warnings.push({
                type: 'expiring_soon',
                severity: 'warning',
                title: 'Daily Subscription Expiring',
                message: `Your daily subscription expires in ${activeHoursRemaining} hours. Renew to continue operations.`,
                daysRemaining: 0,
                actionRequired: true,
                actionLabel: 'Renew Now',
                actionUrl: '/settings?tab=subscription',
              });
            } else if (activeHoursRemaining <= 2) {
              warnings.push({
                type: 'expiring_soon',
                severity: 'critical',
                title: 'Daily Subscription Expiring Soon!',
                message: `Your daily subscription expires in ${activeHoursRemaining} hour${activeHoursRemaining !== 1 ? 's' : ''}! Renew immediately.`,
                daysRemaining: 0,
                actionRequired: true,
                actionLabel: 'Renew Now',
                actionUrl: '/settings?tab=subscription',
              });
            }
            break;
          }

          // Warning at 7 days (non-daily plans)
          if (activeDaysRemaining <= 7 && activeDaysRemaining > 3) {
            warnings.push({
              type: 'expiring_soon',
              severity: 'info',
              title: 'Subscription Expiring Soon',
              message: `Your ${planName} subscription expires in ${activeDaysRemaining} days. Renew now to avoid service interruption.`,
              daysRemaining: activeDaysRemaining,
              actionRequired: false,
              actionLabel: 'Renew Now',
              actionUrl: '/settings?tab=subscription',
            });
          }
          // Warning at 3 days
          else if (activeDaysRemaining <= 3 && activeDaysRemaining > 1) {
            warnings.push({
              type: 'expiring_soon',
              severity: 'warning',
              title: 'Subscription Expiring Very Soon',
              message: `Your ${planName} subscription expires in ${activeDaysRemaining} days. Renew immediately to continue operations.`,
              daysRemaining: activeDaysRemaining,
              actionRequired: true,
              actionLabel: 'Renew Now',
              actionUrl: '/settings?tab=subscription',
            });
          }
          // Critical at 1 day
          else if (activeDaysRemaining <= 1) {
            warnings.push({
              type: 'expiring_soon',
              severity: 'error',
              title: 'Subscription Expires Tomorrow',
              message: `Your ${planName} subscription expires tomorrow! Renew now to avoid losing access.`,
              daysRemaining: activeDaysRemaining,
              actionRequired: true,
              actionLabel: 'Renew Now',
              actionUrl: '/settings?tab=subscription',
            });
          }
          break;

        case SubscriptionStatus.TRIAL:
          // Calculate trial days remaining
          const trialEnd = subscription.trialEndDate || subscription.currentPeriodEnd;
          const trialDaysRemaining = Math.ceil(
            (trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
          );

          // Trial expired - critical warning
          if (trialDaysRemaining <= 0) {
            warnings.push({
              type: 'expired',
              severity: 'critical',
              title: 'Trial Period Ended',
              message: 'Your 14-day free trial has ended. Upgrade to a paid plan to continue using SmartDuka.',
              daysRemaining: 0,
              actionRequired: true,
              actionLabel: 'Upgrade Now',
              actionUrl: '/admin/subscription',
            });
          }
          // Trial ending soon - warning at 3 days
          else if (trialDaysRemaining <= 3 && trialDaysRemaining > 1) {
            warnings.push({
              type: 'expiring_soon',
              severity: 'warning',
              title: 'Trial Ending Soon',
              message: `Your free trial ends in ${trialDaysRemaining} days. Upgrade now to keep your data and continue using SmartDuka.`,
              daysRemaining: trialDaysRemaining,
              actionRequired: true,
              actionLabel: 'Upgrade Now',
              actionUrl: '/admin/subscription',
            });
          }
          // Trial ending tomorrow - error
          else if (trialDaysRemaining === 1) {
            warnings.push({
              type: 'expiring_soon',
              severity: 'error',
              title: 'Trial Ends Tomorrow',
              message: 'Your free trial ends tomorrow! Upgrade now to avoid losing access to your shop.',
              daysRemaining: 1,
              actionRequired: true,
              actionLabel: 'Upgrade Now',
              actionUrl: '/admin/subscription',
            });
          }
          // Trial info - show countdown at 7 days
          else if (trialDaysRemaining <= 7) {
            warnings.push({
              type: 'expiring_soon',
              severity: 'info',
              title: 'Trial Period',
              message: `You have ${trialDaysRemaining} days left in your free trial. Explore all features and upgrade when ready.`,
              daysRemaining: trialDaysRemaining,
              actionRequired: false,
              actionLabel: 'View Plans',
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
