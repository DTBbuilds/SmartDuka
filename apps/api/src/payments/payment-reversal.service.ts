import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../sales/schemas/order.schema';
import { DarajaService } from './daraja.service';

export interface PaymentReversal {
  _id?: string;
  shopId: string;
  orderId: string;
  paymentId: string;
  originalAmount: number;
  reversalAmount: number;
  reason: string;
  status: 'pending' | 'completed' | 'failed';
  mpesaReversalId?: string;
  reversedBy: string;
  reversalTime: Date;
  notes?: string;
}

@Injectable()
export class PaymentReversalService {
  private readonly logger = new Logger(PaymentReversalService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private darajaService: DarajaService,
  ) {}

  async reversePayment(
    shopId: string,
    orderId: string,
    paymentId: string,
    reason: string,
    reversedBy: string,
    notes?: string,
  ): Promise<PaymentReversal> {
    try {
      // Get order
      const order = await this.orderModel.findById(orderId).exec();
      if (!order) {
        throw new BadRequestException('Order not found');
      }

      // Verify order belongs to shop
      if (order.shopId.toString() !== shopId) {
        throw new BadRequestException('Order does not belong to this shop');
      }

      // Find payment record
      const payment = order.payments?.find((p) => (p as any)._id?.toString() === paymentId);
      if (!payment) {
        throw new BadRequestException('Payment not found');
      }

      // Validate payment can be reversed
      if (payment.status !== 'completed') {
        throw new BadRequestException('Only completed payments can be reversed');
      }

      // If M-Pesa payment, call reversal API
      if (payment.method === 'mpesa' && payment.mpesaReceiptNumber) {
        try {
          const reversalResult = await this.darajaService.reverseTransaction(
            payment.mpesaReceiptNumber,
            payment.amount,
            reason,
          );

          // Update order payment status
          payment.status = 'reversed';
          payment.reversalReason = reason;
          payment.reversalTime = new Date();

          await order.save();

          this.logger.log(
            `Payment reversed for order ${orderId}: Amount: ${payment.amount}, Reason: ${reason}`,
          );

          return {
            shopId,
            orderId,
            paymentId,
            originalAmount: payment.amount,
            reversalAmount: payment.amount,
            reason,
            status: 'completed',
            mpesaReversalId: reversalResult.reversalId,
            reversedBy,
            reversalTime: new Date(),
            notes,
          };
        } catch (error: any) {
          this.logger.error('M-Pesa reversal failed', error?.message);
          throw new BadRequestException('M-Pesa reversal failed');
        }
      } else if (payment.method === 'cash') {
        // For cash, just mark as reversed
        payment.status = 'reversed';
        payment.reversalReason = reason;
        payment.reversalTime = new Date();

        await order.save();

        this.logger.log(`Cash payment reversed for order ${orderId}: Amount: ${payment.amount}`);

        return {
          shopId,
          orderId,
          paymentId,
          originalAmount: payment.amount,
          reversalAmount: payment.amount,
          reason,
          status: 'completed',
          reversedBy,
          reversalTime: new Date(),
          notes,
        };
      } else {
        throw new BadRequestException('Payment method does not support reversal');
      }
    } catch (error: any) {
      this.logger.error('Payment reversal failed', error?.message);
      throw error;
    }
  }

  async getReversalHistory(
    shopId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<PaymentReversal[]> {
    try {
      // Query orders with reversed payments
      const query: any = { shopId: new Types.ObjectId(shopId) };

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = startDate;
        if (endDate) query.createdAt.$lte = endDate;
      }

      const orders = await this.orderModel.find(query).exec();

      const reversals: PaymentReversal[] = [];
      for (const order of orders) {
        const reversedPayments = order.payments?.filter((p) => p.status === 'reversed') || [];
        for (const payment of reversedPayments) {
          reversals.push({
            shopId,
            orderId: order._id.toString(),
            paymentId: (payment as any)._id?.toString() || '',
            originalAmount: payment.amount,
            reversalAmount: payment.amount,
            reason: payment.reversalReason || 'Unknown',
            status: 'completed',
            reversedBy: 'Unknown',
            reversalTime: payment.reversalTime || new Date(),
          });
        }
      }

      return reversals;
    } catch (error: any) {
      this.logger.error('Failed to get reversal history', error?.message);
      throw new BadRequestException('Failed to get reversal history');
    }
  }

  async getReversalStats(shopId: string): Promise<{
    totalReversals: number;
    totalReversalAmount: number;
    averageReversalAmount: number;
    reversalsByReason: Record<string, number>;
    reversalsByPaymentMethod: Record<string, number>;
  }> {
    try {
      const orders = await this.orderModel
        .find({ shopId: new Types.ObjectId(shopId) })
        .exec();

      let totalReversals = 0;
      let totalReversalAmount = 0;
      const reversalsByReason: Record<string, number> = {};
      const reversalsByPaymentMethod: Record<string, number> = {};

      for (const order of orders) {
        const reversedPayments = order.payments?.filter((p) => p.status === 'reversed') || [];
        for (const payment of reversedPayments) {
          totalReversals++;
          totalReversalAmount += payment.amount;

          const reason = payment.reversalReason || 'Unknown';
          reversalsByReason[reason] = (reversalsByReason[reason] || 0) + 1;

          const method = payment.method || 'Unknown';
          reversalsByPaymentMethod[method] = (reversalsByPaymentMethod[method] || 0) + 1;
        }
      }

      return {
        totalReversals,
        totalReversalAmount,
        averageReversalAmount: totalReversals > 0 ? totalReversalAmount / totalReversals : 0,
        reversalsByReason,
        reversalsByPaymentMethod,
      };
    } catch (error: any) {
      this.logger.error('Failed to get reversal stats', error?.message);
      throw new BadRequestException('Failed to get reversal stats');
    }
  }
}
