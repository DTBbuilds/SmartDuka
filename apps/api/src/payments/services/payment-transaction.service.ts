import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaymentTransaction, PaymentTransactionDocument } from '../schemas/payment-transaction.schema';
import { MpesaTransaction, MpesaTransactionDocument } from '../schemas/mpesa-transaction.schema';

export interface CreatePaymentTransactionDto {
  shopId: string;
  orderId: string;
  orderNumber: string;
  cashierId: string;
  cashierName: string;
  branchId?: string;
  paymentMethod: 'cash' | 'card' | 'mpesa' | 'other';
  amount: number;
  status?: 'completed' | 'pending' | 'failed';
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  mpesaReceiptNumber?: string;
  mpesaTransactionId?: string;
  cardLastFour?: string;
  cardBrand?: string;
  amountTendered?: number;
  change?: number;
  referenceNumber?: string;
}

export interface PaymentStatsDto {
  totalTransactions: number;
  totalAmount: number;
  averageTransaction: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
  byMethod: {
    cash: { count: number; amount: number };
    card: { count: number; amount: number };
    mpesa: { count: number; amount: number };
    other: { count: number; amount: number };
  };
}

@Injectable()
export class PaymentTransactionService {
  constructor(
    @InjectModel(PaymentTransaction.name)
    private readonly paymentTransactionModel: Model<PaymentTransactionDocument>,
    @InjectModel(MpesaTransaction.name)
    private readonly mpesaTransactionModel: Model<MpesaTransactionDocument>,
  ) {}

  async createTransaction(dto: CreatePaymentTransactionDto): Promise<PaymentTransactionDocument> {
    try {
      const transaction = new this.paymentTransactionModel({
        shopId: new Types.ObjectId(dto.shopId),
        orderId: new Types.ObjectId(dto.orderId),
        orderNumber: dto.orderNumber,
        cashierId: new Types.ObjectId(dto.cashierId),
        cashierName: dto.cashierName,
        branchId: dto.branchId ? new Types.ObjectId(dto.branchId) : undefined,
        paymentMethod: dto.paymentMethod,
        amount: dto.amount,
        status: dto.status || 'completed',
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        notes: dto.notes,
        mpesaReceiptNumber: dto.mpesaReceiptNumber,
        mpesaTransactionId: dto.mpesaTransactionId,
        cardLastFour: dto.cardLastFour,
        cardBrand: dto.cardBrand,
        amountTendered: dto.amountTendered,
        change: dto.change,
        referenceNumber: dto.referenceNumber,
        processedAt: new Date(),
        completedAt: dto.status === 'completed' ? new Date() : undefined,
      });

      return await transaction.save();
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to create payment transaction: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  async getTransactions(
    shopId: string,
    filters?: {
      method?: string;
      status?: string;
      cashierId?: string;
      branchId?: string;
      from?: string;
      to?: string;
      limit?: number;
      skip?: number;
    },
  ): Promise<PaymentTransactionDocument[]> {
    try {
      const query: any = { shopId: new Types.ObjectId(shopId) };

      if (filters?.method && filters.method !== 'all') {
        query.paymentMethod = filters.method;
      }

      if (filters?.status && filters.status !== 'all') {
        query.status = filters.status;
      }

      if (filters?.cashierId) {
        query.cashierId = new Types.ObjectId(filters.cashierId);
      }

      if (filters?.branchId) {
        query.branchId = new Types.ObjectId(filters.branchId);
      }

      if (filters?.from || filters?.to) {
        query.createdAt = {};
        if (filters.from) {
          query.createdAt.$gte = new Date(filters.from);
        }
        if (filters.to) {
          query.createdAt.$lte = new Date(filters.to);
        }
      }

      const limit = filters?.limit || 100;
      const skip = filters?.skip || 0;

      return await this.paymentTransactionModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .exec();
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to fetch transactions: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  async getStats(shopId: string, filters?: { from?: string; to?: string; branchId?: string }): Promise<PaymentStatsDto> {
    try {
      const query: any = { shopId: new Types.ObjectId(shopId) };

      // Branch filter for multi-tenant isolation
      if (filters?.branchId) {
        query.branchId = new Types.ObjectId(filters.branchId);
      }

      if (filters?.from || filters?.to) {
        query.createdAt = {};
        if (filters.from) {
          query.createdAt.$gte = new Date(filters.from);
        }
        if (filters.to) {
          query.createdAt.$lte = new Date(filters.to);
        }
      }

      // Get all transactions for stats
      const transactions = await this.paymentTransactionModel.find(query).exec();

      // Calculate stats
      const totalTransactions = transactions.length;
      const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const averageTransaction = totalTransactions > 0 ? totalAmount / totalTransactions : 0;
      const completedCount = transactions.filter((t) => t.status === 'completed').length;
      const pendingCount = transactions.filter((t) => t.status === 'pending').length;
      const failedCount = transactions.filter((t) => t.status === 'failed').length;

      // Group by payment method
      const byMethod = {
        cash: { count: 0, amount: 0 },
        card: { count: 0, amount: 0 },
        mpesa: { count: 0, amount: 0 },
        other: { count: 0, amount: 0 },
      };

      transactions.forEach((t) => {
        const method = t.paymentMethod as keyof typeof byMethod;
        if (byMethod[method]) {
          byMethod[method].count += 1;
          byMethod[method].amount += t.amount || 0;
        }
      });

      return {
        totalTransactions,
        totalAmount,
        averageTransaction: Math.round(averageTransaction),
        completedCount,
        pendingCount,
        failedCount,
        byMethod,
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to calculate stats: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  async exportTransactions(
    shopId: string,
    filters?: { from?: string; to?: string; branchId?: string },
  ): Promise<string> {
    try {
      const transactions = await this.getTransactions(shopId, {
        limit: 10000,
        ...filters,
      });

      // Create CSV header
      const headers = [
        'Order Number',
        'Cashier Name',
        'Payment Method',
        'Amount',
        'Status',
        'Customer Name',
        'Date',
      ];

      // Create CSV rows
      const rows = transactions.map((t) => [
        t.orderNumber,
        t.cashierName,
        t.paymentMethod.toUpperCase(),
        t.amount.toLocaleString('en-KE'),
        t.status.toUpperCase(),
        t.customerName || '-',
        t.createdAt ? new Date(t.createdAt).toLocaleString('en-KE') : '-',
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.map((h) => `"${h}"`).join(','),
        ...rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      return csvContent;
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to export transactions: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  async updateTransactionStatus(
    transactionId: string,
    status: 'completed' | 'pending' | 'failed',
  ): Promise<PaymentTransactionDocument> {
    try {
      const transaction = await this.paymentTransactionModel.findByIdAndUpdate(
        new Types.ObjectId(transactionId),
        {
          status,
          completedAt: status === 'completed' ? new Date() : undefined,
        },
        { new: true },
      );

      if (!transaction) {
        throw new BadRequestException('Transaction not found');
      }

      return transaction;
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to update transaction: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  async getTransactionsByOrderId(orderId: string): Promise<PaymentTransactionDocument[]> {
    try {
      return await this.paymentTransactionModel
        .find({ orderId: new Types.ObjectId(orderId) })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to fetch transaction: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  async getCashierStats(shopId: string, cashierId: string): Promise<any> {
    try {
      const transactions = await this.paymentTransactionModel
        .find({
          shopId: new Types.ObjectId(shopId),
          cashierId: new Types.ObjectId(cashierId),
        })
        .exec();

      const totalTransactions = transactions.length;
      const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const completedCount = transactions.filter((t) => t.status === 'completed').length;

      return {
        cashierId,
        totalTransactions,
        totalAmount,
        completedCount,
        averageTransaction: totalTransactions > 0 ? Math.round(totalAmount / totalTransactions) : 0,
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to fetch cashier stats: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  async getPaymentsAnalytics(
    shopId: string,
    branchId?: string,
  ): Promise<any> {
    if (!shopId) {
      throw new BadRequestException('Shop ID is required for payment analytics');
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Build query with shop isolation (multi-tenant)
    const baseQuery: any = {
      shopId: new Types.ObjectId(shopId),
      createdAt: { $gte: monthAgo },
    };

    // Add branch filter if specified (branch-level analytics)
    if (branchId) {
      baseQuery.branchId = new Types.ObjectId(branchId);
    }

    // Get all transactions for the month with shop/branch isolation
    const monthTransactions = await this.paymentTransactionModel
      .find(baseQuery)
      .sort({ createdAt: -1 })
      .exec();

    const todayTransactions = monthTransactions.filter(t => {
      if (!t.createdAt) return false;
      return new Date(t.createdAt).getTime() >= today.getTime();
    });
    const weekTransactions = monthTransactions.filter(t => {
      if (!t.createdAt) return false;
      return new Date(t.createdAt).getTime() >= weekAgo.getTime();
    });

    // Calculate totals
    const todayTotal = todayTransactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const weekTotal = weekTransactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const monthTotal = monthTransactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Success rate
    const completedCount = monthTransactions.filter(t => t.status === 'completed').length;
    const failedCount = monthTransactions.filter(t => t.status === 'failed').length;
    const successRate = monthTransactions.length > 0 
      ? Math.round((completedCount / monthTransactions.length) * 1000) / 10 
      : 100;

    // Average transaction value
    const averageTransactionValue = completedCount > 0 
      ? Math.round(monthTotal / completedCount) 
      : 0;

    // Method breakdown
    const methodMap = new Map<string, { count: number; total: number }>();
    monthTransactions.filter(t => t.status === 'completed').forEach(t => {
      const method = t.paymentMethod || 'cash';
      const existing = methodMap.get(method) || { count: 0, total: 0 };
      existing.count += 1;
      existing.total += t.amount || 0;
      methodMap.set(method, existing);
    });

    const totalCompleted = completedCount;
    const methodBreakdown = Array.from(methodMap.entries()).map(([method, data]) => ({
      method: method === 'mpesa' ? 'M-Pesa' : method.charAt(0).toUpperCase() + method.slice(1),
      count: data.count,
      total: data.total,
      percentage: totalCompleted > 0 ? Math.round((data.count / totalCompleted) * 1000) / 10 : 0,
    }));

    // Daily trend for last 14 days
    const dailyTrend = Array.from({ length: 14 }, (_, i) => {
      const date = new Date(today.getTime() - (13 - i) * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      const dayTransactions = monthTransactions.filter(t => {
        if (!t.createdAt) return false;
        const txTime = new Date(t.createdAt).getTime();
        return txTime >= date.getTime() && txTime < nextDate.getTime() && t.status === 'completed';
      });
      return {
        date: date.toISOString().split('T')[0],
        total: dayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0),
        count: dayTransactions.length,
      };
    });

    // Get M-Pesa transactions for the month (includes failed/expired)
    const mpesaQuery: any = {
      shopId: new Types.ObjectId(shopId),
      createdAt: { $gte: monthAgo },
    };
    if (branchId) {
      mpesaQuery.branchId = new Types.ObjectId(branchId);
    }

    const mpesaTransactions = await this.mpesaTransactionModel
      .find(mpesaQuery)
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();

    // Map M-Pesa status to display status
    const mapMpesaStatus = (status: string): 'completed' | 'pending' | 'failed' => {
      switch (status) {
        case 'completed': return 'completed';
        case 'pending': return 'pending';
        case 'failed':
        case 'expired':
        case 'cancelled':
          return 'failed';
        default: return 'pending';
      }
    };

    // Combine payment transactions with M-Pesa transactions for recent list
    // This ensures we show failed M-Pesa attempts, not just successful payments
    const mpesaRecentTransactions = mpesaTransactions.slice(0, 10).map(t => ({
      id: t._id.toString(),
      amount: t.amount || 0,
      method: 'mpesa',
      status: mapMpesaStatus(t.status),
      reference: t.mpesaReceiptNumber || `TXN-${t._id.toString().slice(-8).toUpperCase()}`,
      timestamp: t.createdAt,
      orderNumber: t.orderNumber || `STK-${t._id.toString().slice(-8).toUpperCase()}`,
      mpesaStatus: t.status, // Include actual M-Pesa status for debugging
      errorCategory: t.errorCategory,
      lastError: t.lastError,
    }));

    // Get non-M-Pesa recent transactions
    const nonMpesaRecentTransactions = monthTransactions
      .filter(t => t.paymentMethod !== 'mpesa')
      .slice(0, 10)
      .map(t => ({
        id: t._id.toString(),
        amount: t.amount || 0,
        method: t.paymentMethod || 'cash',
        status: t.status as 'completed' | 'pending' | 'failed',
        reference: t.referenceNumber || `TXN-${t._id.toString().slice(-8).toUpperCase()}`,
        timestamp: t.createdAt,
        orderNumber: t.orderNumber,
      }));

    // Merge and sort by timestamp
    const recentTransactions = [...mpesaRecentTransactions, ...nonMpesaRecentTransactions]
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
      .slice(0, 10);

    // Failed transactions - include M-Pesa failures
    const mpesaFailedTransactions = mpesaTransactions
      .filter(t => t.status === 'failed' || t.status === 'expired')
      .slice(0, 5)
      .map(t => ({
        id: t._id.toString(),
        amount: t.amount || 0,
        method: 'mpesa',
        reason: t.lastError || t.mpesaResultDesc || 'M-Pesa transaction failed',
        timestamp: t.createdAt,
        errorCategory: t.errorCategory,
      }));

    const paymentFailedTransactions = monthTransactions
      .filter(t => t.status === 'failed')
      .slice(0, 5)
      .map(t => ({
        id: t._id.toString(),
        amount: t.amount || 0,
        method: t.paymentMethod || 'cash',
        reason: t.notes || 'Transaction failed',
        timestamp: t.createdAt,
      }));

    const failedTransactions = [...mpesaFailedTransactions, ...paymentFailedTransactions]
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
      .slice(0, 10);

    // Branch breakdown (for shop-level analytics showing per-branch stats)
    const branchMap = new Map<string, { count: number; total: number; branchId: string }>();
    monthTransactions.filter(t => t.status === 'completed').forEach(t => {
      const bId = t.branchId?.toString() || 'main';
      const existing = branchMap.get(bId) || { count: 0, total: 0, branchId: bId };
      existing.count += 1;
      existing.total += t.amount || 0;
      branchMap.set(bId, existing);
    });

    const branchBreakdown = Array.from(branchMap.entries()).map(([bId, data]) => ({
      branchId: bId,
      count: data.count,
      total: data.total,
      percentage: totalCompleted > 0 ? Math.round((data.count / totalCompleted) * 1000) / 10 : 0,
    }));

    return {
      // Identifiers for multi-tenant clarity
      shopId,
      branchId: branchId || null,
      // Time-based totals
      todayTotal,
      todayTransactions: todayTransactions.length,
      weekTotal,
      weekTransactions: weekTransactions.length,
      monthTotal,
      monthTransactions: monthTransactions.length,
      // Performance metrics
      successRate,
      averageTransactionValue,
      failedCount,
      // Breakdowns
      methodBreakdown,
      branchBreakdown,
      // Trend data
      dailyTrend,
      // Transaction lists
      recentTransactions,
      failedTransactions,
    };
  }

  /**
   * Get payment analytics for a specific branch
   */
  async getBranchPaymentsAnalytics(shopId: string, branchId: string): Promise<any> {
    if (!shopId || !branchId) {
      throw new BadRequestException('Shop ID and Branch ID are required');
    }
    return this.getPaymentsAnalytics(shopId, branchId);
  }

  /**
   * Get aggregated payment stats across all branches for a shop
   */
  async getShopPaymentsSummary(shopId: string): Promise<any> {
    if (!shopId) {
      throw new BadRequestException('Shop ID is required');
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Aggregation pipeline for efficient multi-branch summary
    const pipeline = [
      {
        $match: {
          shopId: new Types.ObjectId(shopId),
          createdAt: { $gte: monthAgo },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: '$branchId',
          totalAmount: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          avgTransaction: { $avg: '$amount' },
          methods: {
            $push: '$paymentMethod',
          },
        },
      },
      {
        $project: {
          branchId: '$_id',
          totalAmount: 1,
          transactionCount: 1,
          avgTransaction: { $round: ['$avgTransaction', 0] },
        },
      },
    ];

    const branchStats = await this.paymentTransactionModel.aggregate(pipeline).exec();

    // Calculate shop-wide totals
    const shopTotal = branchStats.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const shopTransactions = branchStats.reduce((sum, b) => sum + (b.transactionCount || 0), 0);

    return {
      shopId,
      shopTotal,
      shopTransactions,
      shopAvgTransaction: shopTransactions > 0 ? Math.round(shopTotal / shopTransactions) : 0,
      branchStats: branchStats.map(b => ({
        branchId: b.branchId?.toString() || 'main',
        totalAmount: b.totalAmount,
        transactionCount: b.transactionCount,
        avgTransaction: b.avgTransaction,
        percentageOfTotal: shopTotal > 0 ? Math.round((b.totalAmount / shopTotal) * 1000) / 10 : 0,
      })),
    };
  }
}
