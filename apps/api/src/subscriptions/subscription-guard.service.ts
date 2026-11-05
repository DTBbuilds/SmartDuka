import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionStatus,
} from './schemas/subscription.schema';
import {
  SubscriptionPlan,
  SubscriptionPlanDocument,
} from './schemas/subscription-plan.schema';

export type ResourceType = 'shops' | 'employees' | 'products';

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  message?: string;
}

@Injectable()
export class SubscriptionGuardService {
  private readonly logger = new Logger(SubscriptionGuardService.name);

  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(SubscriptionPlan.name)
    private readonly planModel: Model<SubscriptionPlanDocument>,
  ) {}

  /**
   * Check if shop can add more of a resource type
   * Returns detailed limit information
   */
  async checkLimit(
    shopId: string,
    resource: ResourceType,
    increment = 1,
  ): Promise<LimitCheckResult> {
    const subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    // No subscription - use free tier limits (very restrictive)
    if (!subscription) {
      return {
        allowed: false,
        current: 0,
        limit: 0,
        remaining: 0,
        message: 'No active subscription. Please subscribe to a plan.',
      };
    }

    // Check if subscription is active
    if (
      subscription.status !== SubscriptionStatus.ACTIVE &&
      subscription.status !== SubscriptionStatus.TRIAL
    ) {
      // Get plan to show meaningful limits in error
      const plan = await this.planModel.findById(subscription.planId);
      const statusMessages: Record<string, string> = {
        [SubscriptionStatus.PENDING_PAYMENT]:
          'Payment required to activate your subscription.',
        [SubscriptionStatus.PAST_DUE]:
          'Your subscription payment is overdue. Please pay to restore access.',
        [SubscriptionStatus.SUSPENDED]:
          'Your subscription has been suspended. Contact support.',
        [SubscriptionStatus.CANCELLED]: 'Your subscription has been cancelled.',
        [SubscriptionStatus.EXPIRED]:
          'Your subscription has expired. Please renew to continue.',
      };
      return {
        allowed: false,
        current: subscription.currentProductCount || 0,
        limit: plan?.maxProducts || 0,
        remaining: 0,
        message:
          statusMessages[subscription.status] ||
          `Subscription status: ${subscription.status}. Please contact support.`,
      };
    }

    const plan = await this.planModel.findById(subscription.planId);
    if (!plan) {
      return {
        allowed: false,
        current: 0,
        limit: 0,
        remaining: 0,
        message: 'Subscription plan not found.',
      };
    }

    let current: number;
    let limit: number;
    let resourceName: string;

    switch (resource) {
      case 'shops':
        current = subscription.currentShopCount || 0;
        limit = plan.maxShops;
        resourceName = 'shops/branches';
        break;
      case 'employees':
        current = subscription.currentEmployeeCount || 0;
        limit = plan.maxEmployees;
        resourceName = 'employees';
        break;
      case 'products':
        current = subscription.currentProductCount || 0;
        limit = plan.maxProducts;
        resourceName = 'products';
        break;
    }

    // ERROR-UX-RELEASE-GATE1 Phase 2: a null/undefined plan limit means the
    // resource is UNLIMITED under that plan — the owner's policy lever
    // (e.g. the Free Plan — Full Access policy sets maxShops: null in the
    // plan CONFIG; no code change is needed to grant it). Accounting still
    // tracks usage; only enforcement is skipped. Numeric limits behave
    // exactly as before (backward-compatible).
    if (limit == null) {
      return {
        allowed: true,
        current,
        limit: null,
        remaining: null,
        message: undefined,
      };
    }

    const remaining = Math.max(0, limit - current);
    const allowed = current + increment <= limit;

    return {
      allowed,
      current,
      limit,
      remaining,
      message: allowed
        ? undefined
        : this.limitMessage(resource, resourceName, current, limit),
    };
  }

  /**
   * ERROR-UX-RELIABILITY1 (PR C): the limit message must explain what the
   * quota counts — for shops/branches the MAIN SHOP consumes one slot, so
   * "(1/1)" on a one-location plan is the main shop, not a malfunction.
   */
  private limitMessage(
    resource: ResourceType,
    resourceName: string,
    current: number,
    limit: number,
  ): string {
    if (resource === 'shops') {
      return current >= 1
        ? `Your plan includes ${limit} location${limit === 1 ? '' : 's'} — your main shop and any branches together count toward this limit (${current}/${limit} used). Upgrade your plan to add more.`
        : `You have reached your ${resourceName} limit (${current}/${limit}). Upgrade your plan to add more.`;
    }
    return `You have reached your ${resourceName} limit (${current}/${limit}). Upgrade your plan to add more.`;
  }

  /**
   * Enforce limit - throws ForbiddenException if limit exceeded
   */
  async enforceLimit(
    shopId: string,
    resource: ResourceType,
    increment = 1,
  ): Promise<void> {
    const result = await this.checkLimit(shopId, resource, increment);

    if (!result.allowed) {
      this.logger.warn(
        `Limit exceeded for shop ${shopId}: ${resource} (${result.current}/${result.limit})`,
      );
      throw new ForbiddenException(result.message);
    }
  }

  /**
   * ERROR-UX-RELIABILITY1 (PR C): ATOMIC usage claim for resource creation.
   *
   * The previous create path was check-then-act (`enforceLimit` → create →
   * `incrementUsage`): two concurrent creations both passed the check and
   * both incremented — the limit could be exceeded. The claim is a single
   * conditional update: the increment lands ONLY while the stored count
   * still has room, so exactly one of N concurrent creators wins.
   *
   * Callers MUST release the claim if the resource creation itself fails.
   */
  async claimUsage(
    shopId: string,
    resource: ResourceType,
    increment = 1,
  ): Promise<LimitCheckResult & { claimed: boolean }> {
    const base = await this.checkLimit(shopId, resource, increment);
    if (!base.allowed) {
      return { ...base, claimed: false };
    }

    const field =
      resource === 'shops'
        ? 'currentShopCount'
        : resource === 'employees'
          ? 'currentEmployeeCount'
          : 'currentProductCount';

    // ERROR-UX-RELEASE-GATE1 Phase 2: unlimited plans (null limit) claim
    // without a numeric precondition — the usage count still increments so
    // accounting/display stay truthful.
    if (base.limit == null) {
      const updated = await this.subscriptionModel
        .findOneAndUpdate(
          { shopId: new Types.ObjectId(shopId) },
          { $inc: { [field]: increment } },
          { new: true },
        )
        .exec();
      return {
        claimed: true,
        allowed: true,
        current: (updated as any)?.[field] || 0,
        limit: null,
        remaining: null,
      };
    }

    const updated = await this.subscriptionModel
      .findOneAndUpdate(
        {
          shopId: new Types.ObjectId(shopId),
          [field]: { $lte: base.limit - increment },
        },
        { $inc: { [field]: increment } },
        { new: true },
      )
      .exec();

    if (!updated) {
      // Lost a concurrent race — re-read for an honest message.
      const recheck = await this.checkLimit(shopId, resource, increment);
      return { ...recheck, claimed: false };
    }

    return {
      claimed: true,
      allowed: true,
      current: (updated as any)[field] || 0,
      limit: base.limit,
      remaining: Math.max(0, base.limit - ((updated as any)[field] || 0)),
    };
  }

  /**
   * Release a previously claimed usage slot (creation failed or the resource
   * was deleted). Floors at 0 — a deletion storm must never drive the count
   * negative (a negative count silently GRANTS extra quota).
   */
  async releaseUsage(
    shopId: string,
    resource: ResourceType,
    count = 1,
  ): Promise<void> {
    const field =
      resource === 'shops'
        ? 'currentShopCount'
        : resource === 'employees'
          ? 'currentEmployeeCount'
          : 'currentProductCount';

    await this.subscriptionModel
      .updateOne({ shopId: new Types.ObjectId(shopId) }, [
        {
          $set: {
            [field]: {
              $max: [0, { $subtract: [`$${field}`, count] }],
            },
          },
        },
      ])
      .exec();

    this.logger.log(
      `Released ${resource} count for shop ${shopId}: -${count} (floored at 0)`,
    );
  }

  /**
   * Update usage count after successful creation
   */
  async incrementUsage(
    shopId: string,
    resource: ResourceType,
    count = 1,
  ): Promise<void> {
    const update: Record<string, number> = {};

    switch (resource) {
      case 'shops':
        update.currentShopCount = count;
        break;
      case 'employees':
        update.currentEmployeeCount = count;
        break;
      case 'products':
        update.currentProductCount = count;
        break;
    }

    await this.subscriptionModel.updateOne(
      { shopId: new Types.ObjectId(shopId) },
      { $inc: update },
    );

    this.logger.log(`Updated ${resource} count for shop ${shopId}: +${count}`);
  }

  /**
   * Decrement usage count after deletion
   *
   * ERROR-UX-RELIABILITY1 (PR C): floored at 0 — the previous raw `$inc`
   * could drive counts negative, silently granting extra quota.
   */
  async decrementUsage(
    shopId: string,
    resource: ResourceType,
    count = 1,
  ): Promise<void> {
    return this.releaseUsage(shopId, resource, count);
  }

  /**
   * Sync actual counts from database (for data integrity)
   */
  async syncUsageCounts(
    shopId: string,
    counts: { shops?: number; employees?: number; products?: number },
  ): Promise<void> {
    const update: Record<string, number> = {};

    if (counts.shops !== undefined) update.currentShopCount = counts.shops;
    if (counts.employees !== undefined)
      update.currentEmployeeCount = counts.employees;
    if (counts.products !== undefined)
      update.currentProductCount = counts.products;

    if (Object.keys(update).length > 0) {
      await this.subscriptionModel.updateOne(
        { shopId: new Types.ObjectId(shopId) },
        { $set: update },
      );
      this.logger.log(`Synced usage counts for shop ${shopId}:`, update);
    }
  }

  /**
   * Get current usage for a shop
   */
  async getUsage(shopId: string): Promise<{
    shops: { current: number; limit: number };
    employees: { current: number; limit: number };
    products: { current: number; limit: number };
  } | null> {
    const subscription = await this.subscriptionModel.findOne({
      shopId: new Types.ObjectId(shopId),
    });

    if (!subscription) return null;

    const plan = await this.planModel.findById(subscription.planId);
    if (!plan) return null;

    return {
      shops: {
        current: subscription.currentShopCount || 0,
        limit: plan.maxShops,
      },
      employees: {
        current: subscription.currentEmployeeCount || 0,
        limit: plan.maxEmployees,
      },
      products: {
        current: subscription.currentProductCount || 0,
        limit: plan.maxProducts,
      },
    };
  }
}
