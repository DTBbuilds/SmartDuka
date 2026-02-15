import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StripeService } from '../stripe.service';
import { StripePayment, StripePaymentDocument, StripePaymentStatus, StripePaymentType } from '../schemas/stripe-payment.schema';
import { StripeSubscription, StripeSubscriptionDocument, StripeSubscriptionStatus } from '../schemas/stripe-subscription.schema';

/**
 * Stripe Analytics Service
 * 
 * Provides analytics and reporting for Stripe payments.
 * Supports super admin dashboard and shop-level analytics.
 */
@Injectable()
export class StripeAnalyticsService {
  private readonly logger = new Logger(StripeAnalyticsService.name);

  constructor(
    private readonly stripeService: StripeService,
    @InjectModel(StripePayment.name)
    private readonly paymentModel: Model<StripePaymentDocument>,
    @InjectModel(StripeSubscription.name)
    private readonly subscriptionModel: Model<StripeSubscriptionDocument>,
  ) {}

  /**
   * Get payment statistics for a shop
   */
  async getShopPaymentStats(
    shopId: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    successfulPayments: number;
    failedPayments: number;
    refundedAmount: number;
    averageTransactionValue: number;
    byPaymentType: Record<string, { count: number; amount: number }>;
    byStatus: Record<string, number>;
  }> {
    const query: any = { shopId: new Types.ObjectId(shopId) };

    if (dateRange) {
      query.createdAt = {
        $gte: dateRange.from,
        $lte: dateRange.to,
      };
    }

    const payments = await this.paymentModel.find(query).exec();

    const stats = {
      totalRevenue: 0,
      totalTransactions: payments.length,
      successfulPayments: 0,
      failedPayments: 0,
      refundedAmount: 0,
      averageTransactionValue: 0,
      byPaymentType: {} as Record<string, { count: number; amount: number }>,
      byStatus: {} as Record<string, number>,
    };

    payments.forEach((payment) => {
      // Count by status
      stats.byStatus[payment.status] = (stats.byStatus[payment.status] || 0) + 1;

      if (payment.status === StripePaymentStatus.SUCCEEDED) {
        stats.successfulPayments++;
        stats.totalRevenue += payment.amount;
      } else if (payment.status === StripePaymentStatus.FAILED) {
        stats.failedPayments++;
      }

      if (payment.refundedAmount) {
        stats.refundedAmount += payment.refundedAmount;
      }

      // Group by payment type
      if (!stats.byPaymentType[payment.paymentType]) {
        stats.byPaymentType[payment.paymentType] = { count: 0, amount: 0 };
      }
      stats.byPaymentType[payment.paymentType].count++;
      if (payment.status === StripePaymentStatus.SUCCEEDED) {
        stats.byPaymentType[payment.paymentType].amount += payment.amount;
      }
    });

    stats.averageTransactionValue = stats.successfulPayments > 0
      ? Math.round(stats.totalRevenue / stats.successfulPayments)
      : 0;

    return stats;
  }

  /**
   * Get subscription analytics for super admin
   */
  async getSubscriptionAnalytics(): Promise<{
    totalActiveSubscriptions: number;
    totalTrialSubscriptions: number;
    totalCanceledSubscriptions: number;
    monthlyRecurringRevenue: number;
    annualRecurringRevenue: number;
    byPlan: Record<string, { count: number; mrr: number }>;
    byStatus: Record<string, number>;
    churnRate: number;
  }> {
    const subscriptions = await this.subscriptionModel.find().exec();

    const stats = {
      totalActiveSubscriptions: 0,
      totalTrialSubscriptions: 0,
      totalCanceledSubscriptions: 0,
      monthlyRecurringRevenue: 0,
      annualRecurringRevenue: 0,
      byPlan: {} as Record<string, { count: number; mrr: number }>,
      byStatus: {} as Record<string, number>,
      churnRate: 0,
    };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    let canceledLast30Days = 0;
    let activeLast30Days = 0;

    subscriptions.forEach((sub) => {
      // Count by status
      stats.byStatus[sub.status] = (stats.byStatus[sub.status] || 0) + 1;

      if (sub.status === StripeSubscriptionStatus.ACTIVE) {
        stats.totalActiveSubscriptions++;
        
        // Calculate MRR
        let monthlyAmount = sub.amount;
        if (sub.interval === 'year') {
          monthlyAmount = Math.round(sub.amount / 12);
        } else if (sub.interval === 'week') {
          monthlyAmount = sub.amount * 4;
        }
        stats.monthlyRecurringRevenue += monthlyAmount;
      } else if (sub.status === StripeSubscriptionStatus.TRIALING) {
        stats.totalTrialSubscriptions++;
      } else if (sub.status === StripeSubscriptionStatus.CANCELED) {
        stats.totalCanceledSubscriptions++;
      }

      // Group by plan
      const planCode = sub.planCode || 'unknown';
      if (!stats.byPlan[planCode]) {
        stats.byPlan[planCode] = { count: 0, mrr: 0 };
      }
      stats.byPlan[planCode].count++;
      if (sub.status === StripeSubscriptionStatus.ACTIVE) {
        let monthlyAmount = sub.amount;
        if (sub.interval === 'year') {
          monthlyAmount = Math.round(sub.amount / 12);
        }
        stats.byPlan[planCode].mrr += monthlyAmount;
      }

      // Churn calculation
      if (sub.canceledAt && sub.canceledAt >= thirtyDaysAgo) {
        canceledLast30Days++;
      }
      if (sub.createdAt && sub.createdAt < thirtyDaysAgo && 
          (sub.status === StripeSubscriptionStatus.ACTIVE || sub.canceledAt)) {
        activeLast30Days++;
      }
    });

    stats.annualRecurringRevenue = stats.monthlyRecurringRevenue * 12;
    stats.churnRate = activeLast30Days > 0
      ? Math.round((canceledLast30Days / activeLast30Days) * 100 * 100) / 100
      : 0;

    return stats;
  }

  /**
   * Get revenue trends over time
   */
  async getRevenueTrends(
    shopId?: string,
    period: 'day' | 'week' | 'month' = 'day',
    days = 30,
  ): Promise<Array<{ date: string; revenue: number; count: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query: any = {
      status: StripePaymentStatus.SUCCEEDED,
      createdAt: { $gte: startDate },
    };

    if (shopId) {
      query.shopId = new Types.ObjectId(shopId);
    }

    const payments = await this.paymentModel.find(query).sort({ createdAt: 1 }).exec();

    // Group by period
    const grouped = new Map<string, { revenue: number; count: number }>();

    payments.forEach((payment) => {
      let dateKey: string;
      const date = payment.createdAt!;

      if (period === 'day') {
        dateKey = date.toISOString().split('T')[0];
      } else if (period === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        dateKey = weekStart.toISOString().split('T')[0];
      } else {
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, { revenue: 0, count: 0 });
      }

      const current = grouped.get(dateKey)!;
      current.revenue += payment.amount;
      current.count++;
    });

    return Array.from(grouped.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      count: data.count,
    }));
  }

  /**
   * Get Stripe balance (for super admin)
   */
  async getStripeBalance(): Promise<{
    available: Array<{ amount: number; currency: string }>;
    pending: Array<{ amount: number; currency: string }>;
  }> {
    if (!this.stripeService.isStripeConfigured()) {
      return { available: [], pending: [] };
    }

    const balance = await this.stripeService.getBalance();

    return {
      available: balance.available.map((b) => ({
        amount: b.amount,
        currency: b.currency.toUpperCase(),
      })),
      pending: balance.pending.map((b) => ({
        amount: b.amount,
        currency: b.currency.toUpperCase(),
      })),
    };
  }

  /**
   * Get recent transactions for dashboard
   */
  async getRecentTransactions(
    shopId?: string,
    limit = 10,
  ): Promise<StripePaymentDocument[]> {
    const query: any = {};

    if (shopId) {
      query.shopId = new Types.ObjectId(shopId);
    }

    return this.paymentModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get payment method distribution
   */
  async getPaymentMethodDistribution(
    shopId?: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<Record<string, { count: number; amount: number; percentage: number }>> {
    const query: any = { status: StripePaymentStatus.SUCCEEDED };

    if (shopId) {
      query.shopId = new Types.ObjectId(shopId);
    }

    if (dateRange) {
      query.createdAt = {
        $gte: dateRange.from,
        $lte: dateRange.to,
      };
    }

    const payments = await this.paymentModel.find(query).exec();

    const distribution: Record<string, { count: number; amount: number }> = {};
    let totalCount = 0;

    payments.forEach((payment) => {
      const method = payment.paymentMethodType || 'unknown';
      if (!distribution[method]) {
        distribution[method] = { count: 0, amount: 0 };
      }
      distribution[method].count++;
      distribution[method].amount += payment.amount;
      totalCount++;
    });

    // Calculate percentages
    const result: Record<string, { count: number; amount: number; percentage: number }> = {};
    Object.entries(distribution).forEach(([method, data]) => {
      result[method] = {
        ...data,
        percentage: totalCount > 0 ? Math.round((data.count / totalCount) * 100 * 100) / 100 : 0,
      };
    });

    return result;
  }
}
