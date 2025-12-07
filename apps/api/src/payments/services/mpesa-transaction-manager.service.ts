import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter } from 'events';
import {
  MpesaTransaction,
  MpesaTransactionDocument,
  MpesaTransactionStatus,
  MpesaResultCode,
} from '../schemas/mpesa-transaction.schema';
import { DarajaService } from '../daraja.service';

/**
 * M-Pesa Transaction Timing Configuration
 * Based on Safaricom's documented behavior and best practices
 */
export const MPESA_TIMING = {
  // STK Push prompt appears on phone within 1-5 seconds
  STK_PROMPT_TIMEOUT_MS: 10_000, // 10 seconds to show prompt
  
  // User has up to 60 seconds to enter PIN after prompt appears
  USER_INPUT_TIMEOUT_MS: 60_000, // 60 seconds for PIN entry
  
  // Total transaction timeout (prompt + PIN entry + processing)
  TRANSACTION_TIMEOUT_MS: 120_000, // 2 minutes total
  
  // Grace period after timeout before marking as expired
  GRACE_PERIOD_MS: 30_000, // 30 seconds grace
  
  // Minimum time to wait before first status query
  MIN_QUERY_DELAY_MS: 5_000, // 5 seconds
  
  // Interval between status queries during polling
  POLL_INTERVAL_MS: 3_000, // 3 seconds
  
  // Maximum number of status queries per transaction
  MAX_POLL_ATTEMPTS: 20,
  
  // Delay between retry attempts (base for exponential backoff)
  RETRY_BASE_DELAY_MS: 2_000, // 2 seconds
  
  // Maximum retry delay
  RETRY_MAX_DELAY_MS: 30_000, // 30 seconds
  
  // Callback expected within this time after STK push
  CALLBACK_EXPECTED_MS: 90_000, // 90 seconds
};

/**
 * Transaction Error Categories
 */
export enum MpesaErrorCategory {
  USER_ACTION = 'user_action',       // User cancelled, wrong PIN
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  LIMIT_EXCEEDED = 'limit_exceeded',
  INVALID_INPUT = 'invalid_input',   // Invalid phone, amount
  SYSTEM_ERROR = 'system_error',     // M-Pesa system issues
  NETWORK_ERROR = 'network_error',   // Connectivity issues
  TIMEOUT = 'timeout',               // Transaction timed out
  UNKNOWN = 'unknown',
}

/**
 * Enhanced error information
 */
export interface MpesaErrorInfo {
  category: MpesaErrorCategory;
  code: number;
  message: string;
  userMessage: string;
  isRetryable: boolean;
  suggestedAction: string;
  waitBeforeRetry?: number; // milliseconds
}

/**
 * Transaction state with timing info
 */
export interface TransactionState {
  transactionId: string;
  status: MpesaTransactionStatus;
  phase: 'initiating' | 'waiting_prompt' | 'waiting_pin' | 'processing' | 'completed' | 'failed' | 'expired';
  progress: number; // 0-100
  timeElapsed: number; // seconds
  timeRemaining: number; // seconds
  message: string;
  canCancel: boolean;
  canRetry: boolean;
  error?: MpesaErrorInfo;
}

/**
 * M-Pesa Transaction Manager Service
 * 
 * Provides robust transaction lifecycle management with:
 * - Accurate timing and timeout handling
 * - Real-time status polling
 * - Comprehensive error handling
 * - Automatic recovery mechanisms
 * - Event-driven updates for real-time UI
 */
@Injectable()
export class MpesaTransactionManagerService {
  private readonly logger = new Logger(MpesaTransactionManagerService.name);
  
  // Active polling sessions
  private readonly activePollers = new Map<string, NodeJS.Timeout>();
  
  // Transaction state cache for quick access
  private readonly stateCache = new Map<string, TransactionState>();

  // Event emitter for transaction state changes
  private readonly events = new EventEmitter();

  constructor(
    @InjectModel(MpesaTransaction.name)
    private readonly transactionModel: Model<MpesaTransactionDocument>,
    private readonly darajaService: DarajaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get comprehensive error information for M-Pesa result code
   */
  getErrorInfo(resultCode: number): MpesaErrorInfo {
    const errorMap: Record<number, Partial<MpesaErrorInfo>> = {
      [MpesaResultCode.SUCCESS]: {
        category: MpesaErrorCategory.USER_ACTION,
        message: 'Success',
        userMessage: 'Payment completed successfully',
        isRetryable: false,
        suggestedAction: 'none',
      },
      [MpesaResultCode.INSUFFICIENT_BALANCE]: {
        category: MpesaErrorCategory.INSUFFICIENT_FUNDS,
        message: 'Insufficient balance',
        userMessage: 'Your M-Pesa balance is insufficient for this payment',
        isRetryable: true,
        suggestedAction: 'Top up your M-Pesa account and try again',
        waitBeforeRetry: 0,
      },
      [MpesaResultCode.LESS_THAN_MIN]: {
        category: MpesaErrorCategory.INVALID_INPUT,
        message: 'Amount less than minimum',
        userMessage: 'The payment amount is below the minimum allowed',
        isRetryable: false,
        suggestedAction: 'Increase the payment amount',
      },
      [MpesaResultCode.MORE_THAN_MAX]: {
        category: MpesaErrorCategory.LIMIT_EXCEEDED,
        message: 'Amount exceeds maximum',
        userMessage: 'The payment amount exceeds the maximum allowed',
        isRetryable: false,
        suggestedAction: 'Split the payment into smaller amounts',
      },
      [MpesaResultCode.DAILY_LIMIT_EXCEEDED]: {
        category: MpesaErrorCategory.LIMIT_EXCEEDED,
        message: 'Daily limit exceeded',
        userMessage: 'You have exceeded your daily M-Pesa transaction limit',
        isRetryable: true,
        suggestedAction: 'Try again tomorrow or use a different payment method',
        waitBeforeRetry: 24 * 60 * 60 * 1000, // 24 hours
      },
      [MpesaResultCode.REQUEST_CANCELLED]: {
        category: MpesaErrorCategory.USER_ACTION,
        message: 'Request cancelled by user',
        userMessage: 'You cancelled the payment request',
        isRetryable: true,
        suggestedAction: 'Try again when ready to complete payment',
        waitBeforeRetry: 0,
      },
      [MpesaResultCode.DS_TIMEOUT]: {
        category: MpesaErrorCategory.TIMEOUT,
        message: 'Request timed out',
        userMessage: 'The payment request timed out. You may not have entered your PIN in time.',
        isRetryable: true,
        suggestedAction: 'Try again and enter your M-Pesa PIN promptly',
        waitBeforeRetry: 5000,
      },
      [MpesaResultCode.WRONG_PIN]: {
        category: MpesaErrorCategory.USER_ACTION,
        message: 'Wrong PIN entered',
        userMessage: 'You entered an incorrect M-Pesa PIN',
        isRetryable: true,
        suggestedAction: 'Try again with the correct PIN',
        waitBeforeRetry: 0,
      },
      [MpesaResultCode.SYSTEM_BUSY]: {
        category: MpesaErrorCategory.SYSTEM_ERROR,
        message: 'M-Pesa system busy',
        userMessage: 'M-Pesa is currently experiencing high traffic',
        isRetryable: true,
        suggestedAction: 'Please wait a moment and try again',
        waitBeforeRetry: 10000,
      },
    };

    const info = errorMap[resultCode] || {
      category: MpesaErrorCategory.UNKNOWN,
      message: `Unknown error (code: ${resultCode})`,
      userMessage: 'An unexpected error occurred with your payment',
      isRetryable: true,
      suggestedAction: 'Please try again or contact support',
      waitBeforeRetry: 5000,
    };

    return {
      code: resultCode,
      ...info,
    } as MpesaErrorInfo;
  }

  /**
   * Calculate current transaction state with timing information
   */
  async getTransactionState(transactionId: string): Promise<TransactionState> {
    const transaction = await this.transactionModel.findById(transactionId);
    
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const now = Date.now();
    const createdAt = transaction.createdAt?.getTime() || now;
    const stkSentAt = transaction.stkPushSentAt?.getTime() || createdAt;
    const expiresAt = transaction.expiresAt.getTime();
    
    const timeElapsed = Math.floor((now - createdAt) / 1000);
    const timeRemaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
    
    let phase: TransactionState['phase'];
    let progress: number;
    let message: string;

    switch (transaction.status) {
      case MpesaTransactionStatus.CREATED:
        phase = 'initiating';
        progress = 10;
        message = 'Initiating payment request...';
        break;
        
      case MpesaTransactionStatus.PENDING:
        const timeSinceStk = now - stkSentAt;
        
        if (timeSinceStk < MPESA_TIMING.STK_PROMPT_TIMEOUT_MS) {
          phase = 'waiting_prompt';
          progress = 20 + Math.floor((timeSinceStk / MPESA_TIMING.STK_PROMPT_TIMEOUT_MS) * 10);
          message = 'Check your phone for the M-Pesa prompt...';
        } else if (timeSinceStk < MPESA_TIMING.USER_INPUT_TIMEOUT_MS) {
          phase = 'waiting_pin';
          progress = 30 + Math.floor(((timeSinceStk - MPESA_TIMING.STK_PROMPT_TIMEOUT_MS) / MPESA_TIMING.USER_INPUT_TIMEOUT_MS) * 40);
          message = 'Enter your M-Pesa PIN to complete payment';
        } else {
          phase = 'processing';
          progress = 70 + Math.floor(((timeSinceStk - MPESA_TIMING.USER_INPUT_TIMEOUT_MS) / MPESA_TIMING.GRACE_PERIOD_MS) * 20);
          message = 'Processing your payment...';
        }
        break;
        
      case MpesaTransactionStatus.COMPLETED:
        phase = 'completed';
        progress = 100;
        message = `Payment successful! Receipt: ${transaction.mpesaReceiptNumber}`;
        break;
        
      case MpesaTransactionStatus.FAILED:
        phase = 'failed';
        progress = 0;
        message = transaction.lastError || 'Payment failed';
        break;
        
      case MpesaTransactionStatus.EXPIRED:
        phase = 'expired';
        progress = 0;
        message = 'Payment request expired';
        break;
        
      default:
        phase = 'processing';
        progress = 50;
        message = 'Processing...';
    }

    const state: TransactionState = {
      transactionId: transaction._id.toString(),
      status: transaction.status,
      phase,
      progress: Math.min(100, Math.max(0, progress)),
      timeElapsed,
      timeRemaining,
      message,
      canCancel: [MpesaTransactionStatus.CREATED, MpesaTransactionStatus.PENDING].includes(transaction.status),
      canRetry: transaction.status === MpesaTransactionStatus.FAILED && 
                transaction.retryCount < transaction.maxRetries,
    };

    // Add error info if failed
    if (transaction.status === MpesaTransactionStatus.FAILED && transaction.mpesaResultCode) {
      state.error = this.getErrorInfo(transaction.mpesaResultCode);
    }

    // Cache the state
    this.stateCache.set(transactionId, state);

    return state;
  }

  /**
   * Start real-time polling for a transaction
   * Emits events as status changes
   */
  startPolling(transactionId: string): void {
    // Don't start if already polling
    if (this.activePollers.has(transactionId)) {
      return;
    }

    this.logger.debug(`Starting polling for transaction ${transactionId}`);

    let pollCount = 0;
    
    const poll = async () => {
      pollCount++;
      
      if (pollCount > MPESA_TIMING.MAX_POLL_ATTEMPTS) {
        this.stopPolling(transactionId);
        return;
      }

      try {
        const state = await this.getTransactionState(transactionId);
        
        // Emit state update event
        this.events.emit('mpesa.transaction.state', {
          transactionId,
          state,
        });

        // Stop polling if terminal state reached
        if (['completed', 'failed', 'expired'].includes(state.phase)) {
          this.stopPolling(transactionId);
          
          // Emit final event
          this.events.emit(`mpesa.transaction.${state.phase}`, {
            transactionId,
            state,
          });
          return;
        }

        // Query M-Pesa for status if waiting too long for callback
        if (state.phase === 'processing' && pollCount > 5) {
          await this.queryMpesaStatus(transactionId);
        }

      } catch (error: any) {
        this.logger.error(`Polling error for ${transactionId}: ${error.message}`);
      }
    };

    // Initial poll after delay
    setTimeout(poll, MPESA_TIMING.MIN_QUERY_DELAY_MS);

    // Set up interval
    const interval = setInterval(poll, MPESA_TIMING.POLL_INTERVAL_MS);
    this.activePollers.set(transactionId, interval);
  }

  /**
   * Stop polling for a transaction
   */
  stopPolling(transactionId: string): void {
    const interval = this.activePollers.get(transactionId);
    if (interval) {
      clearInterval(interval);
      this.activePollers.delete(transactionId);
      this.logger.debug(`Stopped polling for transaction ${transactionId}`);
    }
  }

  /**
   * Query M-Pesa directly for transaction status
   */
  async queryMpesaStatus(transactionId: string): Promise<TransactionState> {
    const transaction = await this.transactionModel.findById(transactionId);
    
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (!transaction.checkoutRequestId) {
      throw new BadRequestException('Transaction has no checkout request ID');
    }

    // Only query if still pending
    if (transaction.status !== MpesaTransactionStatus.PENDING) {
      return this.getTransactionState(transactionId);
    }

    try {
      const result = await this.darajaService.queryStkStatus(
        transaction.checkoutRequestId,
        transaction.merchantRequestId || '',
      );

      this.logger.debug(`STK query result for ${transactionId}: ${JSON.stringify(result)}`);

      if (result.resultCode === 0) {
        // Success
        transaction.previousStatus = transaction.status;
        transaction.status = MpesaTransactionStatus.COMPLETED;
        transaction.mpesaResultCode = result.resultCode;
        transaction.mpesaResultDesc = result.resultDesc;
        transaction.completedAt = new Date();
        await transaction.save();

        this.events.emit('mpesa.transaction.completed', {
          transactionId,
          receipt: transaction.mpesaReceiptNumber,
        });

      } else if (result.resultCode === MpesaResultCode.DS_TIMEOUT) {
        // Still processing - don't change status
        this.logger.debug(`Transaction ${transactionId} still processing`);
        
      } else if (result.resultCode !== undefined) {
        // Failed
        transaction.previousStatus = transaction.status;
        transaction.status = MpesaTransactionStatus.FAILED;
        transaction.mpesaResultCode = result.resultCode;
        transaction.mpesaResultDesc = result.resultDesc;
        transaction.lastError = this.getErrorInfo(result.resultCode).userMessage;
        await transaction.save();

        this.events.emit('mpesa.transaction.failed', {
          transactionId,
          error: this.getErrorInfo(result.resultCode),
        });
      }

    } catch (error: any) {
      this.logger.warn(`STK query failed for ${transactionId}: ${error.message}`);
      // Don't change status on query failure
    }

    return this.getTransactionState(transactionId);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(retryCount: number): number {
    const delay = MPESA_TIMING.RETRY_BASE_DELAY_MS * Math.pow(2, retryCount);
    return Math.min(delay, MPESA_TIMING.RETRY_MAX_DELAY_MS);
  }

  /**
   * Check if a transaction can be retried
   */
  async canRetry(transactionId: string): Promise<{
    canRetry: boolean;
    reason?: string;
    waitTime?: number;
  }> {
    const transaction = await this.transactionModel.findById(transactionId);
    
    if (!transaction) {
      return { canRetry: false, reason: 'Transaction not found' };
    }

    if (transaction.status !== MpesaTransactionStatus.FAILED) {
      return { canRetry: false, reason: `Transaction is ${transaction.status}` };
    }

    if (transaction.retryCount >= transaction.maxRetries) {
      return { canRetry: false, reason: 'Maximum retries exceeded' };
    }

    // Check if we need to wait before retry
    if (transaction.mpesaResultCode) {
      const errorInfo = this.getErrorInfo(transaction.mpesaResultCode);
      
      if (!errorInfo.isRetryable) {
        return { canRetry: false, reason: errorInfo.suggestedAction };
      }

      if (errorInfo.waitBeforeRetry && transaction.lastRetryAt) {
        const timeSinceLastRetry = Date.now() - transaction.lastRetryAt.getTime();
        if (timeSinceLastRetry < errorInfo.waitBeforeRetry) {
          return {
            canRetry: true,
            waitTime: errorInfo.waitBeforeRetry - timeSinceLastRetry,
          };
        }
      }
    }

    return { canRetry: true };
  }

  /**
   * Increment retry count and update timestamp
   */
  async recordRetryAttempt(transactionId: string): Promise<void> {
    await this.transactionModel.updateOne(
      { _id: new Types.ObjectId(transactionId) },
      {
        $inc: { retryCount: 1 },
        $set: { lastRetryAt: new Date() },
      },
    );
  }

  /**
   * Handle transaction timeout
   */
  async handleTimeout(transactionId: string): Promise<void> {
    const transaction = await this.transactionModel.findById(transactionId);
    
    if (!transaction) return;

    // Only timeout pending transactions
    if (transaction.status !== MpesaTransactionStatus.PENDING) return;

    // Check if actually expired
    if (new Date() <= transaction.expiresAt) return;

    // First, try to query M-Pesa for actual status
    try {
      const result = await this.darajaService.queryStkStatus(
        transaction.checkoutRequestId || '',
        transaction.merchantRequestId || '',
      );

      if (result.resultCode === 0) {
        // Actually completed - callback was missed
        transaction.previousStatus = transaction.status;
        transaction.status = MpesaTransactionStatus.COMPLETED;
        transaction.mpesaResultCode = result.resultCode;
        transaction.mpesaResultDesc = result.resultDesc;
        transaction.completedAt = new Date();
        await transaction.save();

        this.events.emit('mpesa.transaction.completed', {
          transactionId,
          recoveredFromTimeout: true,
        });
        return;
      }
    } catch (error) {
      // Query failed, proceed with timeout
    }

    // Mark as expired
    transaction.previousStatus = transaction.status;
    transaction.status = MpesaTransactionStatus.EXPIRED;
    transaction.lastError = 'Transaction timed out - no response received';
    await transaction.save();

    this.events.emit('mpesa.transaction.expired', {
      transactionId,
    });

    this.logger.log(`Transaction ${transactionId} marked as expired`);
  }

  /**
   * Scheduled job to handle timeouts
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async processTimeouts(): Promise<void> {
    const expiredTransactions = await this.transactionModel.find({
      status: MpesaTransactionStatus.PENDING,
      expiresAt: { $lt: new Date() },
    }).limit(50);

    for (const transaction of expiredTransactions) {
      await this.handleTimeout(transaction._id.toString());
    }
  }

  /**
   * Get transaction statistics for monitoring
   */
  async getTransactionMetrics(shopId: string, hours = 24): Promise<{
    total: number;
    completed: number;
    failed: number;
    expired: number;
    pending: number;
    successRate: number;
    averageCompletionTime: number;
    failureReasons: Record<string, number>;
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [statusStats, completionTimes, failureReasons] = await Promise.all([
      // Status counts
      this.transactionModel.aggregate([
        {
          $match: {
            shopId: new Types.ObjectId(shopId),
            createdAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      // Average completion time
      this.transactionModel.aggregate([
        {
          $match: {
            shopId: new Types.ObjectId(shopId),
            status: MpesaTransactionStatus.COMPLETED,
            createdAt: { $gte: since },
            completedAt: { $exists: true },
          },
        },
        {
          $project: {
            completionTime: {
              $subtract: ['$completedAt', '$createdAt'],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$completionTime' },
          },
        },
      ]),

      // Failure reasons
      this.transactionModel.aggregate([
        {
          $match: {
            shopId: new Types.ObjectId(shopId),
            status: MpesaTransactionStatus.FAILED,
            createdAt: { $gte: since },
            mpesaResultCode: { $exists: true },
          },
        },
        {
          $group: {
            _id: '$mpesaResultCode',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const metrics = {
      total: 0,
      completed: 0,
      failed: 0,
      expired: 0,
      pending: 0,
      successRate: 0,
      averageCompletionTime: 0,
      failureReasons: {} as Record<string, number>,
    };

    for (const stat of statusStats) {
      metrics.total += stat.count;
      switch (stat._id) {
        case MpesaTransactionStatus.COMPLETED:
          metrics.completed = stat.count;
          break;
        case MpesaTransactionStatus.FAILED:
          metrics.failed = stat.count;
          break;
        case MpesaTransactionStatus.EXPIRED:
          metrics.expired = stat.count;
          break;
        case MpesaTransactionStatus.PENDING:
        case MpesaTransactionStatus.CREATED:
          metrics.pending += stat.count;
          break;
      }
    }

    const completedOrFailed = metrics.completed + metrics.failed;
    if (completedOrFailed > 0) {
      metrics.successRate = Math.round((metrics.completed / completedOrFailed) * 100);
    }

    if (completionTimes.length > 0) {
      metrics.averageCompletionTime = Math.round(completionTimes[0].avgTime / 1000);
    }

    for (const reason of failureReasons) {
      const errorInfo = this.getErrorInfo(reason._id);
      metrics.failureReasons[errorInfo.message] = reason.count;
    }

    return metrics;
  }

  /**
   * Subscribe to transaction events
   * 
   * Events:
   * - mpesa.transaction.state: Emitted on every state update
   * - mpesa.transaction.completed: Emitted when transaction completes
   * - mpesa.transaction.failed: Emitted when transaction fails
   * - mpesa.transaction.expired: Emitted when transaction expires
   */
  on(event: string, listener: (...args: any[]) => void): void {
    this.events.on(event, listener);
  }

  /**
   * Unsubscribe from transaction events
   */
  off(event: string, listener: (...args: any[]) => void): void {
    this.events.off(event, listener);
  }

  /**
   * Get the event emitter for direct access
   */
  getEventEmitter(): EventEmitter {
    return this.events;
  }

  /**
   * Cleanup on service destroy
   */
  onModuleDestroy(): void {
    // Clear all active pollers
    for (const [transactionId, interval] of this.activePollers) {
      clearInterval(interval);
    }
    this.activePollers.clear();
    this.stateCache.clear();
    this.events.removeAllListeners();
  }
}
