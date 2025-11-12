import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../sales/schemas/order.schema';

export interface ReconciliationRecord {
  shopId: string;
  date: Date;
  expectedCash: number;
  actualCash: number;
  variance: number;
  variancePercentage: number;
  status: 'pending' | 'reconciled' | 'variance_pending';
  reconciliationNotes?: string;
  reconcililedBy: string;
  reconciliationTime: Date;
}

@Injectable()
export class PaymentReconciliationService {
  private readonly logger = new Logger(PaymentReconciliationService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async reconcilePayments(
    shopId: string,
    date: Date,
    actualCash: number,
    reconcililedBy: string,
    notes?: string,
  ): Promise<ReconciliationRecord> {
    try {
      // Get start and end of day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all orders for the day
      const orders = await this.orderModel
        .find({
          shopId: new Types.ObjectId(shopId),
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          paymentStatus: { $in: ['paid', 'partial'] },
        })
        .exec();

      // Calculate expected cash from orders
      const expectedCash = orders.reduce((sum, order) => {
        const cashPayments = (order.payments || [])
          .filter((p) => p.method === 'cash')
          .reduce((s, p) => s + p.amount, 0);
        return sum + cashPayments;
      }, 0);

      // Calculate variance
      const variance = actualCash - expectedCash;
      const variancePercentage = expectedCash > 0 ? (variance / expectedCash) * 100 : 0;

      // Determine status
      let status: 'pending' | 'reconciled' | 'variance_pending' = 'reconciled';
      if (Math.abs(variance) > 100) {
        // Variance > 100 Ksh requires investigation
        status = 'variance_pending';
      }

      const reconciliation: ReconciliationRecord = {
        shopId,
        date,
        expectedCash,
        actualCash,
        variance,
        variancePercentage,
        status,
        reconciliationNotes: notes,
        reconcililedBy,
        reconciliationTime: new Date(),
      };

      this.logger.log(
        `Payment reconciliation for ${shopId} on ${date.toDateString()}: Expected: ${expectedCash}, Actual: ${actualCash}, Variance: ${variance}`,
      );

      return reconciliation;
    } catch (error: any) {
      this.logger.error('Payment reconciliation failed', error?.message);
      throw new BadRequestException('Failed to reconcile payments');
    }
  }

  async getReconciliationHistory(
    shopId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ReconciliationRecord[]> {
    try {
      // This would query a reconciliation collection
      // For now, return empty array - will be implemented with schema
      return [];
    } catch (error: any) {
      this.logger.error('Failed to get reconciliation history', error?.message);
      throw new BadRequestException('Failed to get reconciliation history');
    }
  }

  async getVarianceReport(
    shopId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalReconciliations: number;
    totalVariance: number;
    averageVariance: number;
    maxVariance: number;
    minVariance: number;
    variancePercentage: number;
  }> {
    try {
      // Calculate variance statistics
      // This would query reconciliation records
      return {
        totalReconciliations: 0,
        totalVariance: 0,
        averageVariance: 0,
        maxVariance: 0,
        minVariance: 0,
        variancePercentage: 0,
      };
    } catch (error: any) {
      this.logger.error('Failed to get variance report', error?.message);
      throw new BadRequestException('Failed to get variance report');
    }
  }

  async matchTransactions(
    shopId: string,
    orders: OrderDocument[],
    mpesaTransactions: any[],
  ): Promise<{
    matched: number;
    unmatched: number;
    discrepancies: any[];
  }> {
    try {
      const matched: any[] = [];
      const unmatched: any[] = [];
      const discrepancies: any[] = [];

      // Match M-Pesa transactions to orders
      for (const transaction of mpesaTransactions) {
        const matchedOrder = orders.some(
          (o) =>
            new Date((o as any).createdAt || new Date()).toDateString() === new Date(transaction.createdAt).toDateString() &&
            o.total === transaction.amount
        );

        if (matchedOrder) {
          const order = orders.find(
            (o) =>
              new Date((o as any).createdAt || new Date()).toDateString() === new Date(transaction.createdAt).toDateString() &&
              o.total === transaction.amount
          );
          matched.push({ order, transaction });
        } else {
          unmatched.push(transaction);
          discrepancies.push({
            type: 'unmatched_transaction',
            transaction,
            message: `M-Pesa transaction not matched to any order`,
          });
        }
      }

      // Find unmatched orders
      for (const order of orders) {
        const matchedTransaction = mpesaTransactions.some(
          (t) =>
            new Date(t.createdAt).toDateString() === new Date((order as any).createdAt || new Date()).toDateString() &&
            t.amount === order.total
        );

        if (!matchedTransaction) {
          discrepancies.push({
            type: 'unmatched_order',
            order,
            message: `Order not matched to any M-Pesa transaction`,
          });
        }
      }

      this.logger.log(
        `Transaction matching: ${matched.length} matched, ${unmatched.length} unmatched, ${discrepancies.length} discrepancies`,
      );

      return {
        matched: matched.length,
        unmatched: unmatched.length,
        discrepancies,
      };
    } catch (error: any) {
      this.logger.error('Transaction matching failed', error?.message);
      throw new BadRequestException('Failed to match transactions');
    }
  }
}
