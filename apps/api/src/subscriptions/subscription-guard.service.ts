import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subscription, SubscriptionDocument, SubscriptionStatus } from './schemas/subscription.schema';
import { SubscriptionPlan, SubscriptionPlanDocument } from './schemas/subscription-plan.schema';

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
    @InjectModel(Subscription.name) private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(SubscriptionPlan.name) private readonly planModel: Model<SubscriptionPlanDocument>,
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
    if (subscription.status !== SubscriptionStatus.ACTIVE && 
        subscription.status !== SubscriptionStatus.TRIAL) {
      // Get plan to show meaningful limits in error
      const plan = await this.planModel.findById(subscription.planId);
      const statusMessages: Record<string, string> = {
        [SubscriptionStatus.PENDING_PAYMENT]: 'Payment required to activate your subscription.',
        [SubscriptionStatus.PAST_DUE]: 'Your subscription payment is overdue. Please pay to restore access.',
        [SubscriptionStatus.SUSPENDED]: 'Your subscription has been suspended. Contact support.',
        [SubscriptionStatus.CANCELLED]: 'Your subscription has been cancelled.',
        [SubscriptionStatus.EXPIRED]: 'Your subscription has expired. Please renew to continue.',
      };
      return {
        allowed: false,
        current: subscription.currentProductCount || 0,
        limit: plan?.maxProducts || 0,
        remaining: 0,
        message: statusMessages[subscription.status] || `Subscription status: ${subscription.status}. Please contact support.`,
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

    const remaining = Math.max(0, limit - current);
    const allowed = current + increment <= limit;

    return {
      allowed,
      current,
      limit,
      remaining,
      message: allowed 
        ? undefined 
        : `You have reached your ${resourceName} limit (${current}/${limit}). Upgrade your plan to add more.`,
    };
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
      this.logger.warn(`Limit exceeded for shop ${shopId}: ${resource} (${result.current}/${result.limit})`);
      throw new ForbiddenException(result.message);
    }
  }

  /**
   * Update usage count after successful creation
   */
  async incrementUsage(shopId: string, resource: ResourceType, count = 1): Promise<void> {
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
   */
  async decrementUsage(shopId: string, resource: ResourceType, count = 1): Promise<void> {
    const update: Record<string, number> = {};
    
    switch (resource) {
      case 'shops':
        update.currentShopCount = -count;
        break;
      case 'employees':
        update.currentEmployeeCount = -count;
        break;
      case 'products':
        update.currentProductCount = -count;
        break;
    }

    await this.subscriptionModel.updateOne(
      { shopId: new Types.ObjectId(shopId) },
      { $inc: update },
    );

    this.logger.log(`Updated ${resource} count for shop ${shopId}: -${count}`);
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
    if (counts.employees !== undefined) update.currentEmployeeCount = counts.employees;
    if (counts.products !== undefined) update.currentProductCount = counts.products;

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
        limit: plan.maxShops 
      },
      employees: { 
        current: subscription.currentEmployeeCount || 0, 
        limit: plan.maxEmployees 
      },
      products: { 
        current: subscription.currentProductCount || 0, 
        limit: plan.maxProducts 
      },
    };
  }
}
