import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shop, ShopDocument } from '../../shops/schemas/shop.schema';
import { Subscription, SubscriptionDocument } from '../../subscriptions/schemas/subscription.schema';
import { SubscriptionInvoice, SubscriptionInvoiceDocument } from '../../subscriptions/schemas/subscription-invoice.schema';
import { PaymentTransaction, PaymentTransactionDocument } from '../../payments/schemas/payment-transaction.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Invoice, InvoiceDocument } from '../../sales/schemas/invoice.schema';
import { PaymentAttempt, PaymentAttemptDocument, PaymentAttemptStatus } from '../../subscriptions/schemas/payment-attempt.schema';
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
    @InjectModel(SubscriptionInvoice.name) private readonly subscriptionInvoiceModel: Model<SubscriptionInvoiceDocument>,
    @InjectModel(PaymentTransaction.name) private readonly transactionModel: Model<PaymentTransactionDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Invoice.name) private readonly salesInvoiceModel: Model<InvoiceDocument>,
    @InjectModel(PaymentAttempt.name) private readonly paymentAttemptModel: Model<PaymentAttemptDocument>,
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
      this.subscriptionInvoiceModel.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]).exec(),
      this.subscriptionInvoiceModel.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]).exec(),
      this.subscriptionInvoiceModel.aggregate([
        { $match: { status: 'pending' } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$totalAmount' } } },
      ]).exec(),
      this.subscriptionInvoiceModel.countDocuments({ status: 'failed' }).exec(),
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
      this.subscriptionInvoiceModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('shopId', 'name email shopId')
        .exec(),
      this.subscriptionInvoiceModel.countDocuments(query).exec(),
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
      this.subscriptionInvoiceModel.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]).exec(),
      this.subscriptionInvoiceModel.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: groupFormat, date: '$paidAt' } },
            amount: { $sum: '$totalAmount' },
          },
        },
        { $sort: { _id: 1 } },
      ]).exec(),
      this.subscriptionInvoiceModel.aggregate([
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
   * Get all sales invoice payments across all shops
   * This includes payments made via send money, bank transfer, M-Pesa, etc.
   */
  async getSalesInvoicePayments(options: {
    paymentMethod?: string;
    paymentStatus?: string;
    shopId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    skip?: number;
  }): Promise<{
    payments: Array<{
      _id: string;
      invoiceId: string;
      invoiceNumber: string;
      shopId: string;
      shopName?: string;
      customerName?: string;
      customerPhone?: string;
      paymentDate: Date;
      paymentMethod: string;
      amount: number;
      reference?: string;
      notes?: string;
      invoiceTotal: number;
      invoiceStatus: string;
      paymentStatus: string;
    }>;
    total: number;
    stats: {
      totalAmount: number;
      byMethod: Record<string, number>;
      byStatus: Record<string, number>;
    };
  }> {
    const matchStage: any = {};
    
    // Filter by payment status
    if (options.paymentStatus && options.paymentStatus !== 'all') {
      matchStage.paymentStatus = options.paymentStatus;
    } else {
      // By default, show invoices with payments
      matchStage['payments.0'] = { $exists: true };
    }

    if (options.shopId) {
      matchStage.shopId = new Types.ObjectId(options.shopId);
    }

    if (options.startDate || options.endDate) {
      matchStage.updatedAt = {};
      if (options.startDate) matchStage.updatedAt.$gte = options.startDate;
      if (options.endDate) matchStage.updatedAt.$lte = options.endDate;
    }

    const limit = options.limit || 50;
    const skip = options.skip || 0;

    // Get invoices with payments
    const invoicesWithPayments = await this.salesInvoiceModel.aggregate([
      { $match: matchStage },
      { $unwind: '$payments' },
      ...(options.paymentMethod && options.paymentMethod !== 'all' 
        ? [{ $match: { 'payments.method': options.paymentMethod } }] 
        : []),
      {
        $lookup: {
          from: 'shops',
          localField: 'shopId',
          foreignField: '_id',
          as: 'shop',
        },
      },
      { $unwind: { path: '$shop', preserveNullAndEmptyArrays: true } },
      { $sort: { 'payments.date': -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: { $concat: [{ $toString: '$_id' }, '-', { $toString: '$payments.date' }] },
          invoiceId: '$_id',
          invoiceNumber: 1,
          shopId: 1,
          shopName: '$shop.name',
          customerName: 1,
          customerPhone: 1,
          paymentDate: '$payments.date',
          paymentMethod: '$payments.method',
          amount: '$payments.amount',
          reference: '$payments.reference',
          notes: '$payments.notes',
          invoiceTotal: '$total',
          invoiceStatus: '$status',
          paymentStatus: 1,
          approvalStatus: '$payments.approvalStatus',
          paymentId: '$payments.paymentId',
          approvedAt: '$payments.approvedAt',
          approvedBy: '$payments.approvedBy',
          rejectedAt: '$payments.rejectedAt',
          rejectedBy: '$payments.rejectedBy',
          rejectionReason: '$payments.rejectionReason',
        },
      },
    ]).exec();

    // Get total count
    const countResult = await this.salesInvoiceModel.aggregate([
      { $match: matchStage },
      { $unwind: '$payments' },
      ...(options.paymentMethod && options.paymentMethod !== 'all' 
        ? [{ $match: { 'payments.method': options.paymentMethod } }] 
        : []),
      { $count: 'total' },
    ]).exec();

    const total = countResult[0]?.total || 0;

    // Get stats
    const statsResult = await this.salesInvoiceModel.aggregate([
      { $match: { 'payments.0': { $exists: true } } },
      { $unwind: '$payments' },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$payments.amount' },
        },
      },
    ]).exec();

    const byMethodResult = await this.salesInvoiceModel.aggregate([
      { $match: { 'payments.0': { $exists: true } } },
      { $unwind: '$payments' },
      {
        $group: {
          _id: '$payments.method',
          amount: { $sum: '$payments.amount' },
        },
      },
    ]).exec();

    const byStatusResult = await this.salesInvoiceModel.aggregate([
      { $match: { 'payments.0': { $exists: true } } },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
        },
      },
    ]).exec();

    const byMethod: Record<string, number> = {};
    byMethodResult.forEach((r: any) => {
      byMethod[r._id] = r.amount;
    });

    const byStatus: Record<string, number> = {};
    byStatusResult.forEach((r: any) => {
      byStatus[r._id] = r.count;
    });

    return {
      payments: invoicesWithPayments,
      total,
      stats: {
        totalAmount: statsResult[0]?.totalAmount || 0,
        byMethod,
        byStatus,
      },
    };
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

  // ============================================
  // PAYMENT APPROVAL WORKFLOW
  // ============================================

  /**
   * Approve an invoice payment (super admin only)
   */
  async approveInvoicePayment(
    invoiceId: string,
    paymentId: string,
    approvedBy: string,
    approvedByEmail: string,
  ): Promise<InvoiceDocument> {
    const invoice = await this.salesInvoiceModel.findById(invoiceId).exec();
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const paymentIndex = invoice.payments.findIndex(p => p.paymentId === paymentId);
    if (paymentIndex === -1) {
      throw new NotFoundException('Payment not found');
    }

    const payment = invoice.payments[paymentIndex];
    if (payment.approvalStatus !== 'pending') {
      throw new BadRequestException('Payment is not pending approval');
    }

    // Update payment approval status
    invoice.payments[paymentIndex].approvalStatus = 'approved';
    invoice.payments[paymentIndex].approvedAt = new Date();
    invoice.payments[paymentIndex].approvedBy = approvedByEmail;

    // Now update the invoice amounts
    invoice.amountPaid += payment.amount;
    invoice.amountDue -= payment.amount;

    // Update payment status
    if (invoice.amountDue <= 0) {
      invoice.paymentStatus = 'paid';
      invoice.status = 'paid';
      invoice.paidAt = new Date();
    } else {
      invoice.paymentStatus = 'partial';
    }

    this.logger.log(`Invoice payment approved: ${invoiceId}/${paymentId} by ${approvedByEmail}`);
    return await invoice.save();
  }

  /**
   * Reject an invoice payment (super admin only)
   */
  async rejectInvoicePayment(
    invoiceId: string,
    paymentId: string,
    rejectedBy: string,
    rejectedByEmail: string,
    reason: string,
  ): Promise<InvoiceDocument> {
    const invoice = await this.salesInvoiceModel.findById(invoiceId).exec();
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const paymentIndex = invoice.payments.findIndex(p => p.paymentId === paymentId);
    if (paymentIndex === -1) {
      throw new NotFoundException('Payment not found');
    }

    const payment = invoice.payments[paymentIndex];
    if (payment.approvalStatus !== 'pending') {
      throw new BadRequestException('Payment is not pending approval');
    }

    // Update payment approval status
    invoice.payments[paymentIndex].approvalStatus = 'rejected';
    invoice.payments[paymentIndex].rejectedAt = new Date();
    invoice.payments[paymentIndex].rejectedBy = rejectedByEmail;
    invoice.payments[paymentIndex].rejectionReason = reason;

    this.logger.log(`Invoice payment rejected: ${invoiceId}/${paymentId} by ${rejectedByEmail}`);
    return await invoice.save();
  }

  /**
   * Approve a subscription payment attempt (super admin only)
   * Used for manual payments like bank transfer, send money
   */
  async approveSubscriptionPayment(
    paymentAttemptId: string,
    approvedBy: string,
    approvedByEmail: string,
  ): Promise<PaymentAttemptDocument> {
    const attempt = await this.paymentAttemptModel.findById(paymentAttemptId).exec();
    if (!attempt) {
      throw new NotFoundException('Payment attempt not found');
    }

    if (attempt.status !== PaymentAttemptStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Payment is not pending approval');
    }

    // Update payment status
    attempt.status = PaymentAttemptStatus.SUCCESS;
    attempt.approvedAt = new Date();
    attempt.approvedBy = approvedBy;
    attempt.approvedByEmail = approvedByEmail;
    attempt.completedAt = new Date();

    this.logger.log(`Subscription payment approved: ${paymentAttemptId} by ${approvedByEmail}`);
    
    // TODO: Activate subscription if this was a subscription payment
    // This would require injecting SubscriptionsService

    return await attempt.save();
  }

  /**
   * Reject a subscription payment attempt (super admin only)
   */
  async rejectSubscriptionPayment(
    paymentAttemptId: string,
    rejectedBy: string,
    rejectedByEmail: string,
    reason: string,
  ): Promise<PaymentAttemptDocument> {
    const attempt = await this.paymentAttemptModel.findById(paymentAttemptId).exec();
    if (!attempt) {
      throw new NotFoundException('Payment attempt not found');
    }

    if (attempt.status !== PaymentAttemptStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Payment is not pending approval');
    }

    // Update payment status
    attempt.status = PaymentAttemptStatus.REJECTED;
    attempt.rejectedAt = new Date();
    attempt.rejectedBy = rejectedBy;
    attempt.rejectedByEmail = rejectedByEmail;
    attempt.rejectionReason = reason;

    this.logger.log(`Subscription payment rejected: ${paymentAttemptId} by ${rejectedByEmail}`);
    return await attempt.save();
  }

  /**
   * Get pending approval payments (both invoice and subscription)
   */
  async getPendingApprovals(): Promise<{
    invoicePayments: Array<{
      invoiceId: string;
      invoiceNumber: string;
      paymentId: string;
      shopId: string;
      shopName?: string;
      customerName?: string;
      paymentDate: Date;
      paymentMethod: string;
      amount: number;
      reference?: string;
    }>;
    subscriptionPayments: PaymentAttemptDocument[];
  }> {
    // Get pending invoice payments
    const invoicesWithPendingPayments = await this.salesInvoiceModel.aggregate([
      { $match: { 'payments.approvalStatus': 'pending' } },
      { $unwind: '$payments' },
      { $match: { 'payments.approvalStatus': 'pending' } },
      {
        $lookup: {
          from: 'shops',
          localField: 'shopId',
          foreignField: '_id',
          as: 'shop',
        },
      },
      { $unwind: { path: '$shop', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          invoiceId: '$_id',
          invoiceNumber: 1,
          paymentId: '$payments.paymentId',
          shopId: 1,
          shopName: '$shop.name',
          customerName: 1,
          paymentDate: '$payments.date',
          paymentMethod: '$payments.method',
          amount: '$payments.amount',
          reference: '$payments.reference',
        },
      },
      { $sort: { paymentDate: -1 } },
    ]).exec();

    // Get pending subscription payments
    const pendingSubscriptionPayments = await this.paymentAttemptModel
      .find({ status: PaymentAttemptStatus.PENDING_APPROVAL })
      .sort({ createdAt: -1 })
      .exec();

    return {
      invoicePayments: invoicesWithPendingPayments,
      subscriptionPayments: pendingSubscriptionPayments,
    };
  }
}
