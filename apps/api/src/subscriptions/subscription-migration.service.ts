import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subscription, SubscriptionDocument, SubscriptionStatus, BillingCycle } from './schemas/subscription.schema';
import { SubscriptionPlan, SubscriptionPlanDocument } from './schemas/subscription-plan.schema';
import { Shop, ShopDocument } from '../shops/schemas/shop.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

/**
 * Migration Service for Subscription System
 * 
 * This service handles:
 * 1. Creating subscriptions for existing shops that don't have one
 * 2. Syncing usage counts (branches, employees, products)
 * 3. Updating shop subscription reference fields
 */
@Injectable()
export class SubscriptionMigrationService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionMigrationService.name);

  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(SubscriptionPlan.name)
    private readonly planModel: Model<SubscriptionPlanDocument>,
    @InjectModel(Shop.name)
    private readonly shopModel: Model<ShopDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async onModuleInit() {
    // Run migration on startup
    await this.migrateExistingShops();
  }

  /**
   * Migrate existing shops to have subscriptions
   */
  async migrateExistingShops(): Promise<void> {
    this.logger.log('Starting subscription migration for existing shops...');

    try {
      // Get all shops
      const shops = await this.shopModel.find().exec();
      this.logger.log(`Found ${shops.length} shops to check`);

      // Get default plan (starter)
      const defaultPlan = await this.planModel.findOne({ code: 'starter', status: 'active' });
      if (!defaultPlan) {
        this.logger.warn('No default plan found. Skipping migration.');
        return;
      }

      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const shop of shops) {
        try {
          // Check if shop already has a subscription
          const existingSubscription = await this.subscriptionModel.findOne({
            shopId: shop._id,
          });

          if (existingSubscription) {
            // Update usage counts for existing subscription
            await this.syncUsageCountsForShop(shop._id.toString(), existingSubscription);
            
            // Update shop reference fields
            await this.updateShopSubscriptionFields(shop, existingSubscription);
            
            updated++;
            continue;
          }

          // Create new subscription for shop
          const now = new Date();
          const trialEndDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days trial
          const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

          const subscription = new this.subscriptionModel({
            shopId: shop._id,
            planId: defaultPlan._id,
            planCode: defaultPlan.code,
            billingCycle: BillingCycle.MONTHLY,
            status: shop.status === 'active' ? SubscriptionStatus.ACTIVE : SubscriptionStatus.TRIAL,
            startDate: (shop as any).createdAt || now,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            nextBillingDate: periodEnd,
            isTrialUsed: shop.status === 'active', // If already active, trial was used
            trialEndDate: shop.status === 'active' ? undefined : trialEndDate,
            currentPrice: defaultPlan.monthlyPrice,
            autoRenew: true,
            currentShopCount: 1, // At least the main shop
            currentEmployeeCount: 0,
            currentProductCount: 0,
            notifications: {
              emailReminders: true,
              smsReminders: true,
              reminderDaysBefore: 7,
            },
          });

          const savedSubscription = await subscription.save();

          // Sync usage counts
          await this.syncUsageCountsForShop(shop._id.toString(), savedSubscription);

          // Update shop with subscription reference
          await this.updateShopSubscriptionFields(shop, savedSubscription);

          created++;
          this.logger.log(`Created subscription for shop: ${shop.name} (${shop.shopId})`);
        } catch (error) {
          this.logger.error(`Failed to migrate shop ${shop.shopId}:`, error);
          skipped++;
        }
      }

      this.logger.log(`Migration complete: ${created} created, ${updated} updated, ${skipped} skipped`);
    } catch (error) {
      this.logger.error('Migration failed:', error);
    }
  }

  /**
   * Sync usage counts for a shop's subscription
   */
  private async syncUsageCountsForShop(
    shopId: string,
    subscription: SubscriptionDocument,
  ): Promise<void> {
    try {
      // Count employees (non-admin users)
      const employeeCount = await this.userModel.countDocuments({
        shopId: new Types.ObjectId(shopId),
        role: { $ne: 'admin' },
      });

      // Count products - need to import Product model or use raw query
      // For now, we'll just update employee count
      // Product count should be synced by inventory service

      // Update subscription with actual counts
      subscription.currentEmployeeCount = employeeCount;
      subscription.currentShopCount = Math.max(1, subscription.currentShopCount); // At least 1
      
      await subscription.save();

      this.logger.debug(`Synced usage for shop ${shopId}: employees=${employeeCount}`);
    } catch (error) {
      this.logger.error(`Failed to sync usage for shop ${shopId}:`, error);
    }
  }

  /**
   * Update shop document with subscription reference fields
   */
  private async updateShopSubscriptionFields(
    shop: ShopDocument,
    subscription: SubscriptionDocument,
  ): Promise<void> {
    try {
      await this.shopModel.updateOne(
        { _id: shop._id },
        {
          $set: {
            subscriptionId: subscription._id,
            subscriptionPlan: subscription.planCode,
            subscriptionStatus: subscription.status,
            subscriptionExpiresAt: subscription.currentPeriodEnd,
            isSubscriptionActive: [
              SubscriptionStatus.ACTIVE,
              SubscriptionStatus.TRIAL,
              SubscriptionStatus.PAST_DUE,
            ].includes(subscription.status as SubscriptionStatus),
          },
        },
      );
    } catch (error) {
      this.logger.error(`Failed to update shop ${shop.shopId} subscription fields:`, error);
    }
  }

  /**
   * Manual migration trigger (can be called from admin endpoint)
   */
  async runMigration(): Promise<{
    created: number;
    updated: number;
    skipped: number;
    message: string;
  }> {
    this.logger.log('Manual migration triggered');
    
    const shops = await this.shopModel.find().exec();
    const defaultPlan = await this.planModel.findOne({ code: 'starter', status: 'active' });
    
    if (!defaultPlan) {
      return { created: 0, updated: 0, skipped: 0, message: 'No default plan found' };
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const shop of shops) {
      try {
        const existingSubscription = await this.subscriptionModel.findOne({
          shopId: shop._id,
        });

        if (existingSubscription) {
          await this.syncUsageCountsForShop(shop._id.toString(), existingSubscription);
          await this.updateShopSubscriptionFields(shop, existingSubscription);
          updated++;
        } else {
          // Create new subscription
          const now = new Date();
          const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

          const subscription = new this.subscriptionModel({
            shopId: shop._id,
            planId: defaultPlan._id,
            planCode: defaultPlan.code,
            billingCycle: BillingCycle.MONTHLY,
            status: shop.status === 'active' ? SubscriptionStatus.ACTIVE : SubscriptionStatus.TRIAL,
            startDate: (shop as any).createdAt || now,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            nextBillingDate: periodEnd,
            isTrialUsed: shop.status === 'active',
            currentPrice: defaultPlan.monthlyPrice,
            autoRenew: true,
            currentShopCount: 1,
            currentEmployeeCount: 0,
            currentProductCount: 0,
          });

          const saved = await subscription.save();
          await this.syncUsageCountsForShop(shop._id.toString(), saved);
          await this.updateShopSubscriptionFields(shop, saved);
          created++;
        }
      } catch (error) {
        this.logger.error(`Failed to process shop ${shop.shopId}:`, error);
        skipped++;
      }
    }

    return {
      created,
      updated,
      skipped,
      message: `Migration complete: ${created} created, ${updated} updated, ${skipped} skipped`,
    };
  }

  /**
   * Sync product counts for all subscriptions
   * This should be called after products are imported or bulk created
   */
  async syncAllProductCounts(): Promise<void> {
    this.logger.log('Syncing product counts for all subscriptions...');
    
    // This would need access to the Product model
    // For now, log a message
    this.logger.log('Product count sync should be triggered from inventory service');
  }
}
