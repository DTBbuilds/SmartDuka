import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import {
  MpesaTransaction,
  MpesaTransactionDocument,
  MpesaTransactionStatus,
} from '../schemas/mpesa-transaction.schema';
import { DarajaService } from '../daraja.service';
import { PaymentTransactionService } from './payment-transaction.service';

/**
 * M-Pesa Reconciliation Service
 * 
 * Handles automatic reconciliation of M-Pesa transactions:
 * 1. Queries M-Pesa for pending transactions that haven't received callbacks
 * 2. Auto-expires transactions that have timed out
 * 3. Generates reconciliation reports
 * 
 * This ensures no transaction gets "stuck" due to:
 * - Network issues preventing callback delivery
 * - Callback processing failures
 * - M-Pesa system delays
 */
@Injectable()
export class MpesaReconciliationService {
  private readonly logger = new Logger(MpesaReconciliationService.name);
  private readonly isEnabled: boolean;

  constructor(
    @InjectModel(MpesaTransaction.name)
    private readonly transactionModel: Model<MpesaTransactionDocument>,
    private readonly darajaService: DarajaService,
    private readonly paymentTransactionService: PaymentTransactionService,
    private readonly configService: ConfigService,
  ) {
    this.isEnabled = this.configService.get('MPESA_RECONCILIATION_ENABLED', 'true') === 'true';
    
    if (this.isEnabled) {
      this.logger.log('M-Pesa reconciliation service enabled');
    } else {
      this.logger.warn('M-Pesa reconciliation service disabled');
    }
  }

  /**
   * Reconcile pending transactions every 2 minutes
   * 
   * Finds transactions that:
   * - Are in PENDING status
   * - Were sent more than 30 seconds ago (callback should have arrived)
   * - Haven't expired yet
   * 
   * Then queries M-Pesa for their actual status
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async reconcilePendingTransactions(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      // Find transactions pending for more than 30 seconds but not expired
      const cutoffTime = new Date(Date.now() - 30 * 1000);
      const pendingTransactions = await this.transactionModel
        .find({
          status: MpesaTransactionStatus.PENDING,
          stkPushSentAt: { $lt: cutoffTime },
          expiresAt: { $gt: new Date() },
        })
        .sort({ stkPushSentAt: 1 })
        .limit(20) // Process max 20 per run to avoid API rate limits
        .exec();

      if (pendingTransactions.length === 0) {
        // Only log at debug level when nothing to do - reduces log noise
        return;
      }

      this.logger.log(`Reconciling ${pendingTransactions.length} pending transactions`);

      let reconciled = 0;
      let failed = 0;

      for (const transaction of pendingTransactions) {
        try {
          const wasReconciled = await this.queryAndUpdateTransaction(transaction);
          if (wasReconciled) reconciled++;
        } catch (error: any) {
          this.logger.error(
            `Reconciliation failed for ${transaction._id}: ${error.message}`,
          );
          failed++;
        }

        // Small delay between queries to avoid rate limiting
        await this.delay(500);
      }

      this.logger.log(
        `Reconciliation complete: ${reconciled} reconciled, ${failed} failed`,
      );
    } catch (error: any) {
      this.logger.error(`Reconciliation job error: ${error.message}`);
    }
  }

  /**
   * Auto-expire old pending transactions every 5 minutes
   * 
   * Transactions that have passed their expiry time are marked as EXPIRED.
   * This prevents them from being processed if a very late callback arrives.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireOldTransactions(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const result = await this.transactionModel.updateMany(
        {
          status: MpesaTransactionStatus.PENDING,
          expiresAt: { $lt: new Date() },
        },
        {
          $set: {
            status: MpesaTransactionStatus.EXPIRED,
            previousStatus: MpesaTransactionStatus.PENDING,
            lastError: 'Transaction expired - no response received',
          },
        },
      );

      if (result.modifiedCount > 0) {
        this.logger.log(`Expired ${result.modifiedCount} old pending transactions`);
      }
    } catch (error: any) {
      this.logger.error(`Expiry job error: ${error.message}`);
    }
  }

  /**
   * Generate daily reconciliation report (runs at 6 AM)
   */
  @Cron('0 6 * * *')
  async generateDailyReport(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = await this.transactionModel.aggregate([
        {
          $match: {
            createdAt: { $gte: yesterday, $lt: today },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]);

      const report = {
        date: yesterday.toISOString().split('T')[0],
        stats: stats.reduce((acc, s) => {
          acc[s._id] = { count: s.count, totalAmount: s.totalAmount };
          return acc;
        }, {} as Record<string, { count: number; totalAmount: number }>),
      };

      this.logger.log(`Daily M-Pesa Report: ${JSON.stringify(report)}`);

      // TODO: Send report via email or store in database
    } catch (error: any) {
      this.logger.error(`Daily report generation error: ${error.message}`);
    }
  }

  /**
   * Query M-Pesa for transaction status and update local record
   */
  private async queryAndUpdateTransaction(
    transaction: MpesaTransactionDocument,
  ): Promise<boolean> {
    if (!transaction.checkoutRequestId) {
      this.logger.warn(`Transaction ${transaction._id} has no checkoutRequestId`);
      return false;
    }

    try {
      const result = await this.darajaService.queryStkStatus(
        transaction.checkoutRequestId,
        transaction.merchantRequestId || '',
      );

      this.logger.debug(
        `STK Query result for ${transaction._id}: ${JSON.stringify(result)}`,
      );

      // Handle based on result code (lowercase property from DarajaService)
      if (result.resultCode === 0) {
        // Payment successful
        await this.markTransactionCompleted(transaction, result);
        return true;
      } else if (result.resultCode === 1037) {
        // DS Timeout - transaction still processing, leave as pending
        this.logger.debug(`Transaction ${transaction._id} still processing (DS timeout)`);
        return false;
      } else if (result.resultCode !== undefined) {
        // Payment failed
        await this.markTransactionFailed(transaction, result);
        return true;
      }

      return false;
    } catch (error: any) {
      // Query failed - might be network issue, don't change status
      this.logger.warn(
        `STK query failed for ${transaction._id}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Mark transaction as completed and create payment record
   */
  private async markTransactionCompleted(
    transaction: MpesaTransactionDocument,
    result: any,
  ): Promise<void> {
    transaction.previousStatus = transaction.status;
    transaction.status = MpesaTransactionStatus.COMPLETED;
    transaction.mpesaResultCode = parseInt(result.ResultCode);
    transaction.mpesaResultDesc = result.ResultDesc || 'Success';
    transaction.completedAt = new Date();

    // Try to extract receipt number from result
    if (result.MpesaReceiptNumber) {
      transaction.mpesaReceiptNumber = result.MpesaReceiptNumber;
    }

    await transaction.save();

    this.logger.log(
      `Reconciled transaction ${transaction._id} as COMPLETED`,
    );

    // Create payment transaction record if we have receipt number
    if (transaction.mpesaReceiptNumber) {
      try {
        await this.paymentTransactionService.createTransaction({
          shopId: transaction.shopId.toString(),
          orderId: transaction.orderId.toString(),
          orderNumber: transaction.orderNumber,
          cashierId: transaction.cashierId.toString(),
          cashierName: transaction.cashierName,
          branchId: transaction.branchId?.toString(),
          paymentMethod: 'mpesa',
          amount: transaction.amount,
          status: 'completed',
          customerName: transaction.customerName,
          customerPhone: transaction.phoneNumber,
          mpesaReceiptNumber: transaction.mpesaReceiptNumber,
          mpesaTransactionId: transaction.checkoutRequestId,
          referenceNumber: transaction.mpesaReceiptNumber,
          notes: 'Reconciled via STK query',
        });
      } catch (error: any) {
        this.logger.error(
          `Failed to create payment record for reconciled transaction ${transaction._id}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Mark transaction as failed
   */
  private async markTransactionFailed(
    transaction: MpesaTransactionDocument,
    result: any,
  ): Promise<void> {
    transaction.previousStatus = transaction.status;
    transaction.status = MpesaTransactionStatus.FAILED;
    transaction.mpesaResultCode = parseInt(result.ResultCode);
    transaction.mpesaResultDesc = result.ResultDesc || 'Payment failed';
    transaction.lastError = this.getErrorMessage(parseInt(result.ResultCode));

    await transaction.save();

    this.logger.log(
      `Reconciled transaction ${transaction._id} as FAILED: ${transaction.lastError}`,
    );
  }

  /**
   * Get user-friendly error message for M-Pesa result code
   */
  private getErrorMessage(resultCode: number): string {
    const errorMessages: Record<number, string> = {
      1: 'Insufficient balance in M-Pesa account',
      2: 'Amount is less than minimum allowed',
      3: 'Amount exceeds maximum allowed',
      4: 'Daily transaction limit exceeded',
      5: 'Invalid amount',
      6: 'Invalid account number',
      7: 'Invalid sender phone number',
      8: 'Invalid receiver number',
      9: 'Duplicate request',
      10: 'Invalid initiator',
      11: 'Invalid security credential',
      12: 'Invalid shortcode',
      17: 'M-Pesa system busy, please try again',
      1032: 'Payment cancelled by user',
      1037: 'Request timeout - please try again',
      2001: 'Wrong M-Pesa PIN entered',
    };

    return errorMessages[resultCode] || `Payment failed (code: ${resultCode})`;
  }

  /**
   * Manual reconciliation for a specific transaction
   */
  async reconcileTransaction(transactionId: string): Promise<{
    success: boolean;
    status?: string;
    message: string;
  }> {
    const transaction = await this.transactionModel.findById(transactionId);

    if (!transaction) {
      return { success: false, message: 'Transaction not found' };
    }

    if (transaction.status !== MpesaTransactionStatus.PENDING) {
      return {
        success: false,
        status: transaction.status,
        message: `Transaction is already ${transaction.status}`,
      };
    }

    const wasReconciled = await this.queryAndUpdateTransaction(transaction);

    if (wasReconciled) {
      const updated = await this.transactionModel.findById(transactionId);
      return {
        success: true,
        status: updated?.status,
        message: `Transaction reconciled as ${updated?.status}`,
      };
    }

    return {
      success: false,
      status: transaction.status,
      message: 'Transaction still pending - no update from M-Pesa',
    };
  }

  /**
   * Get reconciliation statistics
   */
  async getReconciliationStats(shopId?: string): Promise<{
    pending: number;
    completed: number;
    failed: number;
    expired: number;
    totalAmount: number;
    successRate: number;
  }> {
    const matchStage: any = {};
    if (shopId) {
      matchStage.shopId = new Types.ObjectId(shopId);
    }

    const stats = await this.transactionModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const result = {
      pending: 0,
      completed: 0,
      failed: 0,
      expired: 0,
      totalAmount: 0,
      successRate: 0,
    };

    let totalTransactions = 0;

    for (const stat of stats) {
      totalTransactions += stat.count;
      result.totalAmount += stat.totalAmount;

      switch (stat._id) {
        case MpesaTransactionStatus.PENDING:
        case MpesaTransactionStatus.CREATED:
          result.pending += stat.count;
          break;
        case MpesaTransactionStatus.COMPLETED:
          result.completed += stat.count;
          break;
        case MpesaTransactionStatus.FAILED:
          result.failed += stat.count;
          break;
        case MpesaTransactionStatus.EXPIRED:
          result.expired += stat.count;
          break;
      }
    }

    const completedOrFailed = result.completed + result.failed;
    if (completedOrFailed > 0) {
      result.successRate = Math.round((result.completed / completedOrFailed) * 100);
    }

    return result;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
