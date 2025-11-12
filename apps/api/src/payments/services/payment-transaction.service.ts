import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaymentTransaction, PaymentTransactionDocument } from '../schemas/payment-transaction.schema';

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

  async getStats(shopId: string, filters?: { from?: string; to?: string }): Promise<PaymentStatsDto> {
    try {
      const query: any = { shopId: new Types.ObjectId(shopId) };

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
    filters?: { from?: string; to?: string },
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
}
