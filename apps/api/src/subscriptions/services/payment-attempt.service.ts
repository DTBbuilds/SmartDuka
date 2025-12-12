import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PaymentAttempt,
  PaymentAttemptDocument,
  PaymentMethod,
  PaymentAttemptStatus,
  PaymentAttemptType,
} from '../schemas/payment-attempt.schema';

/**
 * Payment Attempt Service
 * 
 * Tracks all payment attempts for subscriptions.
 * Provides data for super admin dashboard.
 */
@Injectable()
export class PaymentAttemptService {
  private readonly logger = new Logger(PaymentAttemptService.name);

  constructor(
    @InjectModel(PaymentAttempt.name)
    private readonly attemptModel: Model<PaymentAttemptDocument>,
  ) {}

  /**
   * Create a new payment attempt record
   */
  async createAttempt(data: {
    shopId: string;
    userId?: string;
    userEmail?: string;
    shopName?: string;
    method: PaymentMethod;
    type: PaymentAttemptType;
    amount: number;
    currency?: string;
    planCode?: string;
    billingCycle?: string;
    invoiceId?: string;
    invoiceNumber?: string;
    phoneNumber?: string;
    metadata?: Record<string, any>;
  }): Promise<PaymentAttemptDocument> {
    const attempt = new this.attemptModel({
      shopId: new Types.ObjectId(data.shopId),
      userId: data.userId ? new Types.ObjectId(data.userId) : undefined,
      userEmail: data.userEmail,
      shopName: data.shopName,
      method: data.method,
      type: data.type,
      status: PaymentAttemptStatus.INITIATED,
      amount: data.amount,
      currency: data.currency || 'KES',
      planCode: data.planCode,
      billingCycle: data.billingCycle,
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      phoneNumber: data.phoneNumber,
      initiatedAt: new Date(),
      metadata: data.metadata || {},
    });

    await attempt.save();
    this.logger.log(`Payment attempt created: ${attempt._id} - ${data.method} - KES ${data.amount}`);
    return attempt;
  }

  /**
   * Update payment attempt with M-Pesa STK push details
   */
  async updateWithStkDetails(
    attemptId: string,
    checkoutRequestId: string,
    merchantRequestId: string,
  ): Promise<void> {
    await this.attemptModel.findByIdAndUpdate(attemptId, {
      $set: {
        checkoutRequestId,
        merchantRequestId,
        status: PaymentAttemptStatus.PENDING,
      },
    });
  }

  /**
   * Update payment attempt with Stripe details
   */
  async updateWithStripeDetails(
    attemptId: string,
    paymentIntentId: string,
    clientSecret?: string,
  ): Promise<void> {
    await this.attemptModel.findByIdAndUpdate(attemptId, {
      $set: {
        paymentIntentId,
        clientSecret,
        status: PaymentAttemptStatus.PENDING,
      },
    });
  }

  /**
   * Mark attempt as successful
   */
  async markSuccess(
    attemptId: string,
    receiptNumber?: string,
  ): Promise<void> {
    await this.attemptModel.findByIdAndUpdate(attemptId, {
      $set: {
        status: PaymentAttemptStatus.SUCCESS,
        mpesaReceiptNumber: receiptNumber,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Mark attempt as failed
   */
  async markFailed(
    attemptId: string,
    errorCode?: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.attemptModel.findByIdAndUpdate(attemptId, {
      $set: {
        status: PaymentAttemptStatus.FAILED,
        errorCode,
        errorMessage,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Find attempt by checkout request ID (M-Pesa)
   */
  async findByCheckoutRequestId(checkoutRequestId: string): Promise<PaymentAttemptDocument | null> {
    return this.attemptModel.findOne({ checkoutRequestId });
  }

  /**
   * Find attempt by payment intent ID (Stripe)
   */
  async findByPaymentIntentId(paymentIntentId: string): Promise<PaymentAttemptDocument | null> {
    return this.attemptModel.findOne({ paymentIntentId });
  }

  /**
   * Get all payment attempts (for super admin)
   */
  async getAllAttempts(options: {
    status?: PaymentAttemptStatus;
    method?: PaymentMethod;
    shopId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    skip?: number;
  } = {}): Promise<{ attempts: PaymentAttemptDocument[]; total: number }> {
    const query: any = {};

    if (options.status) query.status = options.status;
    if (options.method) query.method = options.method;
    if (options.shopId) query.shopId = new Types.ObjectId(options.shopId);
    if (options.startDate || options.endDate) {
      query.createdAt = {};
      if (options.startDate) query.createdAt.$gte = options.startDate;
      if (options.endDate) query.createdAt.$lte = options.endDate;
    }

    const [attempts, total] = await Promise.all([
      this.attemptModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0),
      this.attemptModel.countDocuments(query),
    ]);

    return { attempts, total };
  }

  /**
   * Get payment attempt statistics (for super admin dashboard)
   */
  async getStatistics(startDate?: Date, endDate?: Date): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byMethod: Record<string, number>;
    totalAmount: number;
    successAmount: number;
    successRate: number;
  }> {
    const dateQuery: any = {};
    if (startDate) dateQuery.$gte = startDate;
    if (endDate) dateQuery.$lte = endDate;

    const matchStage: any = {};
    if (startDate || endDate) matchStage.createdAt = dateQuery;

    const [statusAgg, methodAgg, amountAgg] = await Promise.all([
      this.attemptModel.aggregate([
        { $match: matchStage },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.attemptModel.aggregate([
        { $match: matchStage },
        { $group: { _id: '$method', count: { $sum: 1 } } },
      ]),
      this.attemptModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            successAmount: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0] },
            },
            successCount: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const byStatus: Record<string, number> = {};
    statusAgg.forEach((s: any) => {
      byStatus[s._id] = s.count;
    });

    const byMethod: Record<string, number> = {};
    methodAgg.forEach((m: any) => {
      byMethod[m._id] = m.count;
    });

    const amounts = amountAgg[0] || { total: 0, totalAmount: 0, successAmount: 0, successCount: 0 };

    return {
      total: amounts.total,
      byStatus,
      byMethod,
      totalAmount: amounts.totalAmount,
      successAmount: amounts.successAmount,
      successRate: amounts.total > 0 ? (amounts.successCount / amounts.total) * 100 : 0,
    };
  }

  /**
   * Get recent attempts for a shop
   */
  async getShopAttempts(shopId: string, limit = 10): Promise<PaymentAttemptDocument[]> {
    return this.attemptModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}
