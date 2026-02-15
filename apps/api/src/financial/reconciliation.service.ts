import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reconciliation, ReconciliationDocument } from './reconciliation.schema';
import { Order, OrderDocument } from '../sales/schemas/order.schema';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    @InjectModel(Reconciliation.name)
    private reconciliationModel: Model<ReconciliationDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async createDailyReconciliation(
    shopId: string,
    date: Date,
    actualCash: number,
    reconciledBy: string,
    notes?: string,
  ): Promise<ReconciliationDocument> {
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
        status = 'variance_pending';
      }

      const reconciliation = new this.reconciliationModel({
        shopId: new Types.ObjectId(shopId),
        reconciliationDate: date,
        expectedCash,
        actualCash,
        variance,
        variancePercentage,
        status,
        reconciliationNotes: notes,
        reconciledBy,
        reconciliationTime: new Date(),
      });

      await reconciliation.save();

      this.logger.log(
        `Daily reconciliation created for ${shopId} on ${date.toDateString()}: Expected: ${expectedCash}, Actual: ${actualCash}, Variance: ${variance}`,
      );

      return reconciliation;
    } catch (error: any) {
      this.logger.error('Daily reconciliation creation failed', error?.message);
      throw new BadRequestException('Failed to create daily reconciliation');
    }
  }

  async getReconciliationHistory(
    shopId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ReconciliationDocument[]> {
    try {
      const query: any = { shopId: new Types.ObjectId(shopId) };

      if (startDate || endDate) {
        query.reconciliationDate = {};
        if (startDate) query.reconciliationDate.$gte = startDate;
        if (endDate) query.reconciliationDate.$lte = endDate;
      }

      return this.reconciliationModel
        .find(query)
        .sort({ reconciliationDate: -1 })
        .exec();
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
    pendingVariances: number;
  }> {
    try {
      const reconciliations = await this.reconciliationModel
        .find({
          shopId: new Types.ObjectId(shopId),
          reconciliationDate: { $gte: startDate, $lte: endDate },
        })
        .exec();

      if (reconciliations.length === 0) {
        return {
          totalReconciliations: 0,
          totalVariance: 0,
          averageVariance: 0,
          maxVariance: 0,
          minVariance: 0,
          variancePercentage: 0,
          pendingVariances: 0,
        };
      }

      const variances = reconciliations.map((r) => r.variance);
      const totalVariance = variances.reduce((sum, v) => sum + Math.abs(v), 0);
      const pendingVariances = reconciliations.filter((r) => r.status === 'variance_pending').length;

      return {
        totalReconciliations: reconciliations.length,
        totalVariance,
        averageVariance: totalVariance / reconciliations.length,
        maxVariance: Math.max(...variances.map((v) => Math.abs(v))),
        minVariance: Math.min(...variances.map((v) => Math.abs(v))),
        variancePercentage: (totalVariance / reconciliations.length) * 100,
        pendingVariances,
      };
    } catch (error: any) {
      this.logger.error('Failed to get variance report', error?.message);
      throw new BadRequestException('Failed to get variance report');
    }
  }

  async approveReconciliation(
    reconciliationId: string,
    approvedBy: string,
  ): Promise<ReconciliationDocument | null> {
    try {
      return this.reconciliationModel
        .findByIdAndUpdate(
          reconciliationId,
          {
            approvedBy,
            approvalTime: new Date(),
            status: 'reconciled',
          },
          { new: true },
        )
        .exec();
    } catch (error: any) {
      this.logger.error('Failed to approve reconciliation', error?.message);
      throw new BadRequestException('Failed to approve reconciliation');
    }
  }

  async investigateVariance(
    reconciliationId: string,
    varianceType: string,
    investigationNotes: string,
  ): Promise<ReconciliationDocument | null> {
    try {
      const reconciliation = await this.reconciliationModel.findById(reconciliationId).exec();

      if (!reconciliation) {
        throw new BadRequestException('Reconciliation not found');
      }

      if (!reconciliation.variances) {
        reconciliation.variances = [];
      }

      reconciliation.variances.push({
        type: varianceType as any,
        amount: reconciliation.variance,
        investigationNotes,
        status: 'investigated',
      });

      await reconciliation.save();

      this.logger.log(`Variance investigation recorded for reconciliation ${reconciliationId}`);

      return reconciliation;
    } catch (error: any) {
      this.logger.error('Failed to investigate variance', error?.message);
      throw error;
    }
  }

  async getReconciliationStats(shopId: string): Promise<{
    totalReconciliations: number;
    reconciled: number;
    pendingVariances: number;
    averageVariance: number;
    lastReconciliation?: Date;
  }> {
    try {
      const reconciliations = await this.reconciliationModel
        .find({ shopId: new Types.ObjectId(shopId) })
        .sort({ reconciliationDate: -1 })
        .exec();

      if (reconciliations.length === 0) {
        return {
          totalReconciliations: 0,
          reconciled: 0,
          pendingVariances: 0,
          averageVariance: 0,
        };
      }

      const reconciled = reconciliations.filter((r) => r.status === 'reconciled').length;
      const pendingVariances = reconciliations.filter((r) => r.status === 'variance_pending').length;
      const averageVariance =
        reconciliations.reduce((sum, r) => sum + Math.abs(r.variance), 0) / reconciliations.length;

      return {
        totalReconciliations: reconciliations.length,
        reconciled,
        pendingVariances,
        averageVariance,
        lastReconciliation: reconciliations[0]?.reconciliationDate,
      };
    } catch (error: any) {
      this.logger.error('Failed to get reconciliation stats', error?.message);
      throw new BadRequestException('Failed to get reconciliation stats');
    }
  }
}
