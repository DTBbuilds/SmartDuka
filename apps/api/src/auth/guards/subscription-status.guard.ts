import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subscription, SubscriptionDocument, SubscriptionStatus } from '../../subscriptions/schemas/subscription.schema';

/**
 * Decorator to skip subscription check for specific routes
 * Use this for routes that should be accessible regardless of subscription status:
 * - Auth routes (login, register, refresh)
 * - Subscription management routes (payment, plan selection)
 * - Health check routes
 */
export const SKIP_SUBSCRIPTION_CHECK = 'skipSubscriptionCheck';
export const SkipSubscriptionCheck = () => SetMetadata(SKIP_SUBSCRIPTION_CHECK, true);

/**
 * Decorator to mark routes as read-only accessible during grace period
 * Routes with this decorator will work during PAST_DUE status
 */
export const ALLOW_READ_ONLY = 'allowReadOnly';
export const AllowReadOnly = () => SetMetadata(ALLOW_READ_ONLY, true);

/**
 * Guard that checks if the shop's subscription is active
 * Blocks access when subscription is:
 * - SUSPENDED: Payment overdue past grace period
 * - EXPIRED: Subscription ended and not renewed
 * - CANCELLED: User cancelled the subscription
 * 
 * Allows access when subscription is:
 * - ACTIVE: Normal active subscription
 * - TRIAL: In trial period
 * - PAST_DUE: Payment overdue but within grace period (limited access)
 */
@Injectable()
export class SubscriptionStatusGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionStatusGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route should skip subscription check
    const skipCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_SUBSCRIPTION_CHECK,
      [context.getHandler(), context.getClass()],
    );

    if (skipCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // No user means not authenticated - let JwtAuthGuard handle this
    if (!user) {
      return true;
    }

    // Super admins bypass subscription checks
    if (user.role === 'super_admin') {
      return true;
    }

    // No shopId means this is a super admin or system request
    if (!user.shopId) {
      return true;
    }

    try {
      const subscription = await this.subscriptionModel.findOne({
        shopId: new Types.ObjectId(user.shopId),
      });

      // No subscription found - block access
      if (!subscription) {
        this.logger.warn(`No subscription found for shop ${user.shopId}`);
        throw new ForbiddenException({
          message: 'No active subscription found. Please subscribe to a plan to continue.',
          code: 'NO_SUBSCRIPTION',
          shopId: user.shopId,
        });
      }

      // Check subscription status
      switch (subscription.status) {
        case SubscriptionStatus.ACTIVE:
        case SubscriptionStatus.TRIAL:
          // Full access
          return true;

        case SubscriptionStatus.PAST_DUE:
          // Limited access during grace period
          // Add subscription info to request for downstream use
          request.subscriptionStatus = 'past_due';
          request.gracePeriodEndDate = subscription.gracePeriodEndDate;
          request.subscriptionAccessLevel = 'read_only';
          
          // Check if this route allows read-only access
          const allowReadOnly = this.reflector.getAllAndOverride<boolean>(
            ALLOW_READ_ONLY,
            [context.getHandler(), context.getClass()],
          );
          
          // Check HTTP method - allow GET requests, block mutations
          const httpMethod = request.method?.toUpperCase();
          const isReadOperation = httpMethod === 'GET' || httpMethod === 'HEAD' || httpMethod === 'OPTIONS';
          
          if (allowReadOnly || isReadOperation) {
            this.logger.warn(`Shop ${user.shopId} has past due subscription (read-only access), grace period ends ${subscription.gracePeriodEndDate}`);
            return true;
          }
          
          // Block write operations during grace period
          this.logger.warn(`Blocked write operation for past due shop ${user.shopId}`);
          throw new ForbiddenException({
            message: 'Your subscription payment is overdue. Write operations are disabled during the grace period. Please pay your outstanding invoice to restore full access.',
            code: 'SUBSCRIPTION_PAST_DUE_WRITE_BLOCKED',
            shopId: user.shopId,
            gracePeriodEndDate: subscription.gracePeriodEndDate,
          });

        case SubscriptionStatus.SUSPENDED:
          this.logger.warn(`Blocked access for suspended shop ${user.shopId}`);
          throw new ForbiddenException({
            message: 'Your subscription has been suspended due to non-payment. Please pay your outstanding invoice to restore access.',
            code: 'SUBSCRIPTION_SUSPENDED',
            shopId: user.shopId,
            requiresPayment: true,
          });

        case SubscriptionStatus.EXPIRED:
          this.logger.warn(`Blocked access for expired subscription shop ${user.shopId}`);
          throw new ForbiddenException({
            message: 'Your subscription has expired. Please renew your subscription to continue using SmartDuka.',
            code: 'SUBSCRIPTION_EXPIRED',
            shopId: user.shopId,
            requiresPayment: true,
          });

        case SubscriptionStatus.CANCELLED:
          this.logger.warn(`Blocked access for cancelled subscription shop ${user.shopId}`);
          throw new ForbiddenException({
            message: 'Your subscription has been cancelled. Please reactivate your subscription to continue.',
            code: 'SUBSCRIPTION_CANCELLED',
            shopId: user.shopId,
            requiresPayment: true,
          });

        case SubscriptionStatus.PENDING_PAYMENT:
          this.logger.warn(`Blocked access for pending payment shop ${user.shopId}`);
          throw new ForbiddenException({
            message: 'Your subscription is pending payment. Please complete payment to activate your account.',
            code: 'SUBSCRIPTION_PENDING_PAYMENT',
            shopId: user.shopId,
            requiresPayment: true,
          });

        default:
          this.logger.error(`Unknown subscription status: ${subscription.status} for shop ${user.shopId}`);
          throw new ForbiddenException({
            message: 'Unable to verify subscription status. Please contact support.',
            code: 'SUBSCRIPTION_ERROR',
            shopId: user.shopId,
          });
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error(`Error checking subscription status for shop ${user.shopId}:`, error);
      // On error, allow access but log - don't block users due to system errors
      return true;
    }
  }
}
