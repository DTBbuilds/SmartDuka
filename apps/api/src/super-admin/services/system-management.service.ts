import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shop, ShopDocument } from '../../shops/schemas/shop.schema';
import { Subscription, SubscriptionDocument } from '../../subscriptions/schemas/subscription.schema';
import { SubscriptionInvoice, SubscriptionInvoiceDocument } from '../../subscriptions/schemas/subscription-invoice.schema';
import { PaymentTransaction, PaymentTransactionDocument } from '../../payments/schemas/payment-transaction.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { SystemAuditService } from './system-audit.service';
import { EmailLogService } from './email-log.service';

/**
 * System Management Service
 * 
 * Provides comprehensive system-wide data for super admin dashboard.
 * Aggregates data from all modules for unified oversight.
 */
@Injectable()
export class SystemManagementService {
  private readonly logger = new Logger(SystemManagementService.name);

  constructor(
    @InjectModel(Shop.name) private readonly shopModel: Model<ShopDocument>,
    @InjectModel(Subscription.name) private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(SubscriptionInvoice.name) private readonly invoiceModel: Model<SubscriptionInvoiceDocument>,
    @InjectModel(PaymentTransaction.name) private readonly transactionModel: Model<PaymentTransactionDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly auditService: SystemAuditService,
    private readonly emailLogService: EmailLogService,
  ) {}

  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(): Promise<{
    shops: {
      total: number;
      active: number;
      pending: number;
      suspended: number;
      flagged: number;
      newThisMonth: number;
    };
    subscriptions: {
      total: number;
      active: number;
      trial: number;
      pastDue: number;
      suspended: number;
      expired: number;
      mrr: number; // Monthly Recurring Revenue
    };
    payments: {
      totalRevenue: number;
      thisMonth: number;
      pendingInvoices: number;
      pendingAmount: number;
      failedPayments: number;
    };
    users: {
      total: number;
      admins: number;
      employees: number;
      activeToday: number;
    };
    system: {
      recentFailures: number;
      emailsSentToday: number;
      emailFailures: number;
    };
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      // Shop stats
      totalShops,
      activeShops,
      pendingShops,
      suspendedShops,
      flaggedShops,
      newShopsThisMonth,
      // Subscription stats
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      pastDueSubscriptions,
      suspendedSubscriptions,
      expiredSubscriptions,
      mrrData,
      // Payment stats
      totalRevenue,
      revenueThisMonth,
      pendingInvoices,
      failedPayments,
      // User stats
      totalUsers,
      adminUsers,
      activeUsersToday,
      // System stats
      auditStats,
      emailStats,
    ] = await Promise.all([
      // Shops
      this.shopModel.countDocuments().exec(),
      this.shopModel.countDocuments({ status: 'active' }).exec(),
      this.shopModel.countDocuments({ status: 'pending' }).exec(),
      this.shopModel.countDocuments({ status: 'suspended' }).exec(),
      this.shopModel.countDocuments({ isFlagged: true }).exec(),
      this.shopModel.countDocuments({ createdAt: { $gte: startOfMonth } }).exec(),
      // Subscriptions
      this.subscriptionModel.countDocuments().exec(),
      this.subscriptionModel.countDocuments({ status: 'active' }).exec(),
      this.subscriptionModel.countDocuments({ status: 'trial' }).exec(),
      this.subscriptionModel.countDocuments({ status: 'past_due' }).exec(),
      this.subscriptionModel.countDocuments({ status: 'suspended' }).exec(),
      this.subscriptionModel.countDocuments({ status: 'expired' }).exec(),
      this.subscriptionModel.aggregate([
        { $match: { status: { $in: ['active', 'trial'] } } },
        { $group: { _id: null, total: { $sum: '$currentPrice' } } },
      ]).exec(),
      // Payments
      this.invoiceModel.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]).exec(),
      this.invoiceModel.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]).exec(),
      this.invoiceModel.aggregate([
        { $match: { status: 'pending' } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$totalAmount' } } },
      ]).exec(),
      this.invoiceModel.countDocuments({ status: 'failed' }).exec(),
      // Users
      this.userModel.countDocuments().exec(),
      this.userModel.countDocuments({ role: 'admin' }).exec(),
      this.userModel.countDocuments({ lastLoginAt: { $gte: startOfDay } }).exec(),
      // System
      this.auditService.getStats(startOfDay),
      this.emailLogService.getStats(startOfDay),
    ]);

    return {
      shops: {
        total: totalShops,
        active: activeShops,
        pending: pendingShops,
        suspended: suspendedShops,
        flagged: flaggedShops,
        newThisMonth: newShopsThisMonth,
      },
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
        trial: trialSubscriptions,
        pastDue: pastDueSubscriptions,
        suspended: suspendedSubscriptions,
        expired: expiredSubscriptions,
        mrr: mrrData[0]?.total || 0,
      },
      payments: {
        totalRevenue: totalRevenue[0]?.total || 0,
        thisMonth: revenueThisMonth[0]?.total || 0,
        pendingInvoices: pendingInvoices[0]?.count || 0,
        pendingAmount: pendingInvoices[0]?.total || 0,
        failedPayments,
      },
      users: {
        total: totalUsers,
        admins: adminUsers,
        employees: totalUsers - adminUsers,
        activeToday: activeUsersToday,
      },
      system: {
        recentFailures: auditStats.recentFailures,
        emailsSentToday: emailStats.sent + emailStats.delivered,
        emailFailures: emailStats.failed,
      },
    };
  }

  /**
   * Get all subscription invoices (payments)
   */
  async getAllInvoices(options: {
    status?: string;
    shopId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    skip?: number;
  }): Promise<{
    invoices: SubscriptionInvoiceDocument[];
    total: number;
  }> {
    const query: any = {};

    if (options.status) query.status = options.status;
    if (options.shopId) query.shopId = new Types.ObjectId(options.shopId);
    if (options.startDate || options.endDate) {
      query.createdAt = {};
      if (options.startDate) query.createdAt.$gte = options.startDate;
      if (options.endDate) query.createdAt.$lte = options.endDate;
    }

    const limit = options.limit || 50;
    const skip = options.skip || 0;

    const [invoices, total] = await Promise.all([
      this.invoiceModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('shopId', 'name email shopId')
        .exec(),
      this.invoiceModel.countDocuments(query).exec(),
    ]);

    return { invoices, total };
  }

  /**
   * Get all payment transactions across all shops
   */
  async getAllTransactions(options: {
    paymentMethod?: string;
    status?: string;
    shopId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    skip?: number;
  }): Promise<{
    transactions: PaymentTransactionDocument[];
    total: number;
  }> {
    const query: any = {};

    if (options.paymentMethod) query.paymentMethod = options.paymentMethod;
    if (options.status) query.status = options.status;
    if (options.shopId) query.shopId = new Types.ObjectId(options.shopId);
    if (options.startDate || options.endDate) {
      query.createdAt = {};
      if (options.startDate) query.createdAt.$gte = options.startDate;
      if (options.endDate) query.createdAt.$lte = options.endDate;
    }

    const limit = options.limit || 50;
    const skip = options.skip || 0;

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('shopId', 'name shopId')
        .exec(),
      this.transactionModel.countDocuments(query).exec(),
    ]);

    return { transactions, total };
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<{
    total: number;
    byPeriod: Array<{ date: string; amount: number }>;
    byPaymentMethod: Record<string, number>;
    byPlan: Record<string, number>;
  }> {
    const now = new Date();
    let startDate: Date;
    let groupFormat: string;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        groupFormat = '%Y-%m-%d %H:00';
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupFormat = '%Y-%m-%d';
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        groupFormat = '%Y-%m';
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        groupFormat = '%Y-%m-%d';
    }

    const [totalResult, byPeriod, byPaymentMethod, byPlan] = await Promise.all([
      this.invoiceModel.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]).exec(),
      this.invoiceModel.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: groupFormat, date: '$paidAt' } },
            amount: { $sum: '$totalAmount' },
          },
        },
        { $sort: { _id: 1 } },
      ]).exec(),
      this.invoiceModel.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: startDate } } },
        { $group: { _id: '$paymentMethod', amount: { $sum: '$totalAmount' } } },
      ]).exec(),
      this.subscriptionModel.aggregate([
        { $match: { status: { $in: ['active', 'trial'] } } },
        { $group: { _id: '$planCode', count: { $sum: 1 }, revenue: { $sum: '$currentPrice' } } },
      ]).exec(),
    ]);

    return {
      total: totalResult[0]?.total || 0,
      byPeriod: byPeriod.map(item => ({ date: item._id, amount: item.amount })),
      byPaymentMethod: byPaymentMethod.reduce((acc, item) => {
        acc[item._id || 'unknown'] = item.amount;
        return acc;
      }, {} as Record<string, number>),
      byPlan: byPlan.reduce((acc, item) => {
        acc[item._id] = item.revenue;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Get all subscriptions with shop details
   */
  async getAllSubscriptions(options: {
    status?: string;
    planCode?: string;
    limit?: number;
    skip?: number;
  }): Promise<{
    subscriptions: SubscriptionDocument[];
    total: number;
  }> {
    const query: any = {};

    if (options.status) query.status = options.status;
    if (options.planCode) query.planCode = options.planCode;

    const limit = options.limit || 50;
    const skip = options.skip || 0;

    const [subscriptions, total] = await Promise.all([
      this.subscriptionModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('shopId', 'name email shopId status')
        .populate('planId', 'name code monthlyPrice')
        .exec(),
      this.subscriptionModel.countDocuments(query).exec(),
    ]);

    return { subscriptions, total };
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(): Promise<{
    database: { status: string; latency: number };
    services: Record<string, { status: string; lastCheck: Date }>;
    errors: { last24h: number; lastHour: number };
  }> {
    const startTime = Date.now();
    
    // Simple database health check
    try {
      await this.shopModel.findOne().limit(1).exec();
    } catch (error) {
      return {
        database: { status: 'error', latency: -1 },
        services: {},
        errors: { last24h: 0, lastHour: 0 },
      };
    }

    const dbLatency = Date.now() - startTime;
    const now = new Date();
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [errorsLast24h, errorsLastHour] = await Promise.all([
      this.auditService.query({ status: 'failure', startDate: last24h, limit: 1 }),
      this.auditService.query({ status: 'failure', startDate: lastHour, limit: 1 }),
    ]);

    return {
      database: { status: 'healthy', latency: dbLatency },
      services: {
        api: { status: 'running', lastCheck: now },
        scheduler: { status: 'running', lastCheck: now },
        email: { status: 'running', lastCheck: now },
      },
      errors: {
        last24h: errorsLast24h.total,
        lastHour: errorsLastHour.total,
      },
    };
  }
}
