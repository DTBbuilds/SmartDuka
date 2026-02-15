import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionStatus,
  BillingCycle,
} from './schemas/subscription.schema';
import { SubscriptionPlan, SubscriptionPlanDocument } from './schemas/subscription-plan.schema';
import { Shop, ShopDocument } from '../shops/schemas/shop.schema';

/**
 * Subscription Audit Service
 * 
 * Provides comprehensive auditing and fixing of subscription data:
 * - Identify daily subscriptions with incorrect end dates
 * - Find expired trials that are still marked as active
 * - Find shops with active status but expired period
 * - Fix subscription mismatches across all billing cycles
 */
@Injectable()
export class SubscriptionAuditService {
  private readonly logger = new Logger(SubscriptionAuditService.name);

  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(SubscriptionPlan.name)
    private readonly planModel: Model<SubscriptionPlanDocument>,
    @InjectModel(Shop.name)
    private readonly shopModel: Model<ShopDocument>,
  ) {}

  /**
   * Run complete subscription audit
   * Returns detailed report of all issues found and fixed
   */
  async runFullAudit(dryRun = true): Promise<{
    summary: {
      totalSubscriptions: number;
      issuesFound: number;
      issuesFixed: number;
      dryRun: boolean;
    };
    dailySubscriptionIssues: any[];
    expiredTrials: any[];
    expiredActiveSubscriptions: any[];
    orphanedShops: any[];
    statusMismatches: any[];
  }> {
    this.logger.log(`=== STARTING SUBSCRIPTION AUDIT (${dryRun ? 'DRY RUN' : 'LIVE FIX'}) ===`);

    const results = {
      summary: {
        totalSubscriptions: 0,
        issuesFound: 0,
        issuesFixed: 0,
        dryRun,
      },
      dailySubscriptionIssues: [] as any[],
      expiredTrials: [] as any[],
      expiredActiveSubscriptions: [] as any[],
      orphanedShops: [] as any[],
      statusMismatches: [] as any[],
    };

    // Count total subscriptions
    results.summary.totalSubscriptions = await this.subscriptionModel.countDocuments();

    // 1. Audit daily subscriptions
    const dailyIssues = await this.auditDailySubscriptions(dryRun);
    results.dailySubscriptionIssues = dailyIssues.issues;
    results.summary.issuesFound += dailyIssues.issues.length;
    results.summary.issuesFixed += dailyIssues.fixed;

    // 2. Audit expired trials
    const trialIssues = await this.auditExpiredTrials(dryRun);
    results.expiredTrials = trialIssues.issues;
    results.summary.issuesFound += trialIssues.issues.length;
    results.summary.issuesFixed += trialIssues.fixed;

    // 3. Audit expired active subscriptions
    const expiredIssues = await this.auditExpiredActiveSubscriptions(dryRun);
    results.expiredActiveSubscriptions = expiredIssues.issues;
    results.summary.issuesFound += expiredIssues.issues.length;
    results.summary.issuesFixed += expiredIssues.fixed;

    // 4. Audit orphaned shops (shops without subscriptions)
    const orphanedIssues = await this.auditOrphanedShops(dryRun);
    results.orphanedShops = orphanedIssues.issues;
    results.summary.issuesFound += orphanedIssues.issues.length;
    results.summary.issuesFixed += orphanedIssues.fixed;

    // 5. Audit status mismatches
    const statusIssues = await this.auditStatusMismatches(dryRun);
    results.statusMismatches = statusIssues.issues;
    results.summary.issuesFound += statusIssues.issues.length;
    results.summary.issuesFixed += statusIssues.fixed;

    this.logger.log(`=== AUDIT COMPLETE ===`);
    this.logger.log(`Total subscriptions: ${results.summary.totalSubscriptions}`);
    this.logger.log(`Issues found: ${results.summary.issuesFound}`);
    this.logger.log(`Issues fixed: ${results.summary.issuesFixed}`);

    return results;
  }

  /**
   * Audit daily subscriptions for incorrect end dates
   * Daily subscriptions should expire after numberOfDays (default 1), not 30 days
   */
  async auditDailySubscriptions(dryRun = true): Promise<{ issues: any[]; fixed: number }> {
    this.logger.log('Auditing daily subscriptions...');
    const issues: any[] = [];
    let fixed = 0;

    const dailySubscriptions = await this.subscriptionModel.find({
      billingCycle: BillingCycle.DAILY,
    }).exec();

    for (const subscription of dailySubscriptions) {
      const lastPayment = subscription.lastPaymentDate || subscription.currentPeriodStart;
      const currentEnd = subscription.currentPeriodEnd;
      const numberOfDays = subscription.numberOfDays || 1;

      // Calculate expected end date
      const expectedEnd = new Date(lastPayment);
      expectedEnd.setDate(expectedEnd.getDate() + numberOfDays);

      // Calculate days between last payment and period end
      const actualDays = Math.ceil(
        (currentEnd.getTime() - lastPayment.getTime()) / (24 * 60 * 60 * 1000)
      );

      // If actual duration is more than expected (with 1 day tolerance), flag as issue
      if (actualDays > numberOfDays + 1) {
        const issue = {
          subscriptionId: subscription._id.toString(),
          shopId: subscription.shopId.toString(),
          planCode: subscription.planCode,
          numberOfDays,
          actualDays,
          lastPaymentDate: lastPayment,
          currentPeriodEnd: currentEnd,
          expectedPeriodEnd: expectedEnd,
          status: subscription.status,
          action: 'PERIOD_END_MISMATCH',
        };
        issues.push(issue);

        if (!dryRun) {
          // Fix the subscription
          const now = new Date();
          const newStatus = now > expectedEnd ? SubscriptionStatus.EXPIRED : subscription.status;
          
          await this.subscriptionModel.updateOne(
            { _id: subscription._id },
            {
              $set: {
                currentPeriodEnd: expectedEnd,
                nextBillingDate: expectedEnd,
                status: newStatus,
                numberOfDays: numberOfDays,
              },
            },
          );
          fixed++;
          this.logger.log(`Fixed daily subscription ${subscription._id}: ${actualDays} days -> ${numberOfDays} days`);
        }
      }
    }

    this.logger.log(`Daily subscription audit: ${issues.length} issues found, ${fixed} fixed`);
    return { issues, fixed };
  }

  /**
   * Audit expired trials that are still marked as TRIAL status
   */
  async auditExpiredTrials(dryRun = true): Promise<{ issues: any[]; fixed: number }> {
    this.logger.log('Auditing expired trials...');
    const issues: any[] = [];
    let fixed = 0;
    const now = new Date();

    const expiredTrials = await this.subscriptionModel.find({
      status: SubscriptionStatus.TRIAL,
      $or: [
        { trialEndDate: { $lte: now } },
        { currentPeriodEnd: { $lte: now } },
      ],
    }).exec();

    for (const subscription of expiredTrials) {
      const issue = {
        subscriptionId: subscription._id.toString(),
        shopId: subscription.shopId.toString(),
        planCode: subscription.planCode,
        trialEndDate: subscription.trialEndDate,
        currentPeriodEnd: subscription.currentPeriodEnd,
        status: subscription.status,
        action: 'TRIAL_EXPIRED',
      };
      issues.push(issue);

      if (!dryRun) {
        await this.subscriptionModel.updateOne(
          { _id: subscription._id },
          { $set: { status: SubscriptionStatus.EXPIRED } },
        );
        fixed++;
        this.logger.log(`Expired trial marked as EXPIRED: shop ${subscription.shopId}`);
      }
    }

    this.logger.log(`Expired trials audit: ${issues.length} issues found, ${fixed} fixed`);
    return { issues, fixed };
  }

  /**
   * Audit active subscriptions that have actually expired (period end has passed)
   */
  async auditExpiredActiveSubscriptions(dryRun = true): Promise<{ issues: any[]; fixed: number }> {
    this.logger.log('Auditing expired active subscriptions...');
    const issues: any[] = [];
    let fixed = 0;
    const now = new Date();

    const expiredActive = await this.subscriptionModel.find({
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: { $lte: now },
    }).exec();

    for (const subscription of expiredActive) {
      const daysSinceExpiry = Math.ceil(
        (now.getTime() - subscription.currentPeriodEnd.getTime()) / (24 * 60 * 60 * 1000)
      );

      const issue = {
        subscriptionId: subscription._id.toString(),
        shopId: subscription.shopId.toString(),
        planCode: subscription.planCode,
        billingCycle: subscription.billingCycle,
        currentPeriodEnd: subscription.currentPeriodEnd,
        daysSinceExpiry,
        autoRenew: subscription.autoRenew,
        status: subscription.status,
        action: daysSinceExpiry > 7 ? 'SHOULD_BE_EXPIRED' : 'SHOULD_BE_PAST_DUE',
      };
      issues.push(issue);

      if (!dryRun) {
        // Determine new status based on days since expiry
        let newStatus: SubscriptionStatus;
        if (daysSinceExpiry > 7) {
          // Past grace period - suspend or expire
          newStatus = subscription.autoRenew ? SubscriptionStatus.SUSPENDED : SubscriptionStatus.EXPIRED;
        } else {
          // Within grace period
          newStatus = SubscriptionStatus.PAST_DUE;
        }

        const gracePeriodEnd = new Date(subscription.currentPeriodEnd);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

        await this.subscriptionModel.updateOne(
          { _id: subscription._id },
          {
            $set: {
              status: newStatus,
              gracePeriodEndDate: daysSinceExpiry <= 7 ? gracePeriodEnd : null,
            },
          },
        );
        fixed++;
        this.logger.log(`Updated expired active subscription ${subscription._id}: ${subscription.status} -> ${newStatus}`);
      }
    }

    this.logger.log(`Expired active subscriptions audit: ${issues.length} issues found, ${fixed} fixed`);
    return { issues, fixed };
  }

  /**
   * Audit shops without subscriptions
   */
  async auditOrphanedShops(dryRun = true): Promise<{ issues: any[]; fixed: number }> {
    this.logger.log('Auditing orphaned shops...');
    const issues: any[] = [];
    let fixed = 0;

    // Get all shop IDs
    const shops = await this.shopModel.find({}, { _id: 1, name: 1 }).exec();
    
    // Get all subscription shop IDs
    const subscriptions = await this.subscriptionModel.find({}, { shopId: 1 }).exec();
    const subscribedShopIds = new Set(subscriptions.map(s => s.shopId.toString()));

    for (const shop of shops) {
      if (!subscribedShopIds.has(shop._id.toString())) {
        const issue = {
          shopId: shop._id.toString(),
          shopName: shop.name,
          action: 'NO_SUBSCRIPTION',
        };
        issues.push(issue);

        if (!dryRun) {
          // Create a trial subscription for orphaned shops
          const trialPlan = await this.planModel.findOne({ code: 'trial', status: 'active' });
          if (trialPlan) {
            const now = new Date();
            const trialEnd = new Date(now);
            trialEnd.setDate(trialEnd.getDate() + 14);

            await this.subscriptionModel.create({
              shopId: shop._id,
              planId: trialPlan._id,
              planCode: 'trial',
              billingCycle: BillingCycle.MONTHLY,
              status: SubscriptionStatus.TRIAL,
              startDate: now,
              currentPeriodStart: now,
              currentPeriodEnd: trialEnd,
              trialEndDate: trialEnd,
              isTrialUsed: true,
              currentPrice: 0,
            });
            fixed++;
            this.logger.log(`Created trial subscription for orphaned shop ${shop._id}`);
          }
        }
      }
    }

    this.logger.log(`Orphaned shops audit: ${issues.length} issues found, ${fixed} fixed`);
    return { issues, fixed };
  }

  /**
   * Audit status mismatches (e.g., planCode doesn't match planId)
   */
  async auditStatusMismatches(dryRun = true): Promise<{ issues: any[]; fixed: number }> {
    this.logger.log('Auditing status mismatches...');
    const issues: any[] = [];
    let fixed = 0;

    const subscriptions = await this.subscriptionModel.find().populate('planId').exec();

    for (const subscription of subscriptions) {
      const plan = await this.planModel.findById(subscription.planId);
      
      if (!plan) {
        issues.push({
          subscriptionId: subscription._id.toString(),
          shopId: subscription.shopId.toString(),
          planCode: subscription.planCode,
          planId: subscription.planId?.toString(),
          action: 'PLAN_NOT_FOUND',
        });
        continue;
      }

      if (plan.code !== subscription.planCode) {
        const issue = {
          subscriptionId: subscription._id.toString(),
          shopId: subscription.shopId.toString(),
          storedPlanCode: subscription.planCode,
          actualPlanCode: plan.code,
          planId: subscription.planId?.toString(),
          action: 'PLAN_CODE_MISMATCH',
        };
        issues.push(issue);

        if (!dryRun) {
          // Fix by updating planCode to match the referenced plan
          await this.subscriptionModel.updateOne(
            { _id: subscription._id },
            { $set: { planCode: plan.code } },
          );
          fixed++;
          this.logger.log(`Fixed plan code mismatch: ${subscription.planCode} -> ${plan.code}`);
        }
      }
    }

    this.logger.log(`Status mismatches audit: ${issues.length} issues found, ${fixed} fixed`);
    return { issues, fixed };
  }

  /**
   * Get subscription statistics for dashboard
   */
  async getSubscriptionStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPlan: Record<string, number>;
    byBillingCycle: Record<string, number>;
    expiringIn7Days: number;
    expiredButActive: number;
  }> {
    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const subscriptions = await this.subscriptionModel.find().exec();

    const stats = {
      total: subscriptions.length,
      byStatus: {} as Record<string, number>,
      byPlan: {} as Record<string, number>,
      byBillingCycle: {} as Record<string, number>,
      expiringIn7Days: 0,
      expiredButActive: 0,
    };

    for (const sub of subscriptions) {
      // Count by status
      stats.byStatus[sub.status] = (stats.byStatus[sub.status] || 0) + 1;

      // Count by plan
      stats.byPlan[sub.planCode] = (stats.byPlan[sub.planCode] || 0) + 1;

      // Count by billing cycle
      stats.byBillingCycle[sub.billingCycle] = (stats.byBillingCycle[sub.billingCycle] || 0) + 1;

      // Count expiring in 7 days
      if (sub.currentPeriodEnd <= sevenDaysFromNow && sub.currentPeriodEnd > now) {
        stats.expiringIn7Days++;
      }

      // Count expired but still active
      if (sub.currentPeriodEnd <= now && sub.status === SubscriptionStatus.ACTIVE) {
        stats.expiredButActive++;
      }
    }

    return stats;
  }
}
