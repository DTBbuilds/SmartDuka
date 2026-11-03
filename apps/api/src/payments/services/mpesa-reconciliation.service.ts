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
import { MpesaMultiTenantService } from './mpesa-multi-tenant.service';

/**
 * M-Pesa Reconciliation Service
 *
 * Handles automatic reconciliation of M-Pesa transactions:
 * 1. Queries M-Pesa for pending transactions that haven't received callbacks
 * 2. Auto-expires transactions that have timed out
 * 3. Re-queries recently-expired transactions whose callback never arrived
 *    (a payment that succeeded just before expiry must still converge)
 * 4. Generates reconciliation reports
 *
 * This ensures no transaction gets "stuck" due to:
 * - Network issues preventing callback delivery
 * - Callback processing failures
 * - M-Pesa system delays
 * - Application restarts (pending work is picked up on the next tick)
 *
 * MPESA-P0 CONVERGENCE1:
 * - Settlement runs on the SHOP'S OWN Daraja credentials via
 *   MpesaMultiTenantService.querySTKStatus (merchant-specific credentials) —
 *   the previous direct DarajaService query used the platform's global
 *   credentials and could never resolve shop-specific CheckoutRequestIDs.
 * - The provider verdict is normalized there: ResultCode 0 → COMPLETED,
 *   definitive terminal codes → FAILED, everything else (1037 DS timeout,
 *   system busy, unknown, missing) stays UNRESOLVED — never silently success
 *   or failure.
 * - A provider-confirmed success ALWAYS converges the canonical order and
 *   payment record (deduped on CheckoutRequestID), with or without a receipt
 *   number. A missing receipt delays receipt bookkeeping, never the
 *   money→order binding.
 * - Terminal transitions are atomic status-preconditioned updates, so a
 *   concurrent callback always wins and no settlement is applied twice.
 */
@Injectable()
export class MpesaReconciliationService {
  private readonly logger = new Logger(MpesaReconciliationService.name);
  private readonly isEnabled: boolean;

  /** In-process overlap guard: cron ticks never stack on a slow run. */
  private isReconciling = false;
  private isExpiring = false;

  /** How long after expiry a callback-less transaction is still re-queried. */
  private static readonly POST_EXPIRY_WINDOW_MS = 24 * 60 * 60 * 1000;
  /** Max provider queries per expired transaction before giving up. */
  private static readonly MAX_POST_EXPIRY_QUERIES = 3;

  constructor(
    @InjectModel(MpesaTransaction.name)
    private readonly transactionModel: Model<MpesaTransactionDocument>,
    private readonly mpesaMultiTenantService: MpesaMultiTenantService,
    private readonly configService: ConfigService,
  ) {
    this.isEnabled =
      this.configService.get('MPESA_RECONCILIATION_ENABLED', 'true') === 'true';

    if (this.isEnabled) {
      this.logger.log('M-Pesa reconciliation service enabled');
    } else {
      this.logger.warn('M-Pesa reconciliation service disabled');
    }
  }

  /**
   * Reconcile pending transactions every 5 minutes
   *
   * Finds transactions that:
   * - Are in PENDING status
   * - Were sent more than 30 seconds ago (callback should have arrived)
   * - Haven't expired yet
   *
   * Then queries M-Pesa (shop credentials) for their actual status.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async reconcilePendingTransactions(): Promise<void> {
    if (!this.isEnabled || this.isReconciling) return;
    this.isReconciling = true;

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

      this.logger.log(
        `Reconciling ${pendingTransactions.length} pending transactions`,
      );

      let reconciled = 0;
      let failed = 0;

      for (const transaction of pendingTransactions) {
        try {
          const wasReconciled = await this.settleViaProviderQuery(transaction);
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
    } finally {
      this.isReconciling = false;
    }
  }

  /**
   * Auto-expire old pending transactions every 5 minutes
   *
   * Transactions that have passed their expiry time are marked as EXPIRED.
   * This prevents them from being processed if a very late callback arrives.
   *
   * A transaction expired here is NOT a financial verdict — the post-expiry
   * pass below keeps querying the provider for recently expired transactions
   * so a payment that succeeded around the expiry boundary still converges.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireOldTransactions(): Promise<void> {
    if (!this.isEnabled || this.isExpiring) return;
    this.isExpiring = true;

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
        this.logger.log(
          `Expired ${result.modifiedCount} old pending transactions`,
        );
      }
    } catch (error: any) {
      this.logger.error(`Expiry job error: ${error.message}`);
    } finally {
      this.isExpiring = false;
    }
  }

  /**
   * MPESA-P0 CONVERGENCE1 — post-expiry reconciliation (every 5 minutes).
   *
   * A transaction can expire while its payment actually succeeded (missed
   * callback, Daraja delay, app restart at the wrong moment). Expiry is a
   * local housekeeping state, not provider truth — so recently expired
   * callback-less transactions are re-queried against the provider (bounded:
   * within 24h of expiry, max 3 queries) and settled if the provider
   * confirms an outcome. Anything still unresolved after the bound is left
   * EXPIRED for manual review — never guessed.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async reconcileRecentlyExpiredTransactions(): Promise<void> {
    if (!this.isEnabled || this.isReconciling) return;
    this.isReconciling = true;

    try {
      const windowStart = new Date(
        Date.now() - MpesaReconciliationService.POST_EXPIRY_WINDOW_MS,
      );
      const candidates = await this.transactionModel
        .find({
          status: MpesaTransactionStatus.EXPIRED,
          callbackReceived: { $ne: true },
          recoveredViaQuery: { $ne: true },
          queryCount: {
            $lt: MpesaReconciliationService.MAX_POST_EXPIRY_QUERIES,
          },
          expiresAt: { $gt: windowStart },
          checkoutRequestId: { $exists: true, $ne: '' },
        })
        .sort({ expiresAt: -1 })
        .limit(20)
        .exec();

      if (candidates.length === 0) return;

      this.logger.log(
        `Post-expiry reconciliation: querying ${candidates.length} recently expired transactions`,
      );

      let settled = 0;
      for (const transaction of candidates) {
        try {
          const wasSettled = await this.settleViaProviderQuery(transaction);
          if (wasSettled) settled++;
        } catch (error: any) {
          this.logger.error(
            `Post-expiry reconciliation failed for ${transaction._id}: ${error.message}`,
          );
        }
        await this.delay(500);
      }

      if (settled > 0) {
        this.logger.log(
          `Post-expiry reconciliation settled ${settled} transaction(s) that expired without a callback`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Post-expiry reconciliation job error: ${error.message}`,
      );
    } finally {
      this.isReconciling = false;
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
        stats: stats.reduce(
          (acc, s) => {
            acc[s._id] = { count: s.count, totalAmount: s.totalAmount };
            return acc;
          },
          {} as Record<string, { count: number; totalAmount: number }>,
        ),
      };

      this.logger.log(`Daily M-Pesa Report: ${JSON.stringify(report)}`);

      // TODO: Send report via email or store in database
    } catch (error: any) {
      this.logger.error(`Daily report generation error: ${error.message}`);
    }
  }

  /**
   * Query the provider (shop credentials) for a transaction's outcome and let
   * MpesaMultiTenantService.querySTKStatus settle it atomically and converge
   * the canonical order/payment record.
   *
   * Returns true only when the transaction reached a TERMINAL state
   * (COMPLETED or FAILED). Unresolved verdicts (provider unreachable, still
   * processing, missing result code) leave the transaction untouched.
   */
  private async settleViaProviderQuery(
    transaction: MpesaTransactionDocument,
  ): Promise<boolean> {
    if (!transaction.checkoutRequestId) {
      this.logger.warn(
        `Transaction ${transaction._id} has no checkoutRequestId`,
      );
      return false;
    }

    // Track the query attempt itself (bounded retries for the post-expiry
    // pass) — independent of the outcome.
    await this.transactionModel
      .updateOne(
        { _id: transaction._id },
        { $inc: { queryCount: 1 }, $set: { lastQueryAt: new Date() } },
      )
      .exec();

    const verdict = await this.mpesaMultiTenantService.querySTKStatus(
      transaction.shopId.toString(),
      transaction.checkoutRequestId,
      { converge: true },
    );

    this.logger.debug(
      `STK Query result for ${transaction._id}: ${JSON.stringify(verdict)}`,
    );

    return verdict.status === 'COMPLETED' || verdict.status === 'FAILED';
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

    if (
      transaction.status !== MpesaTransactionStatus.PENDING &&
      transaction.status !== MpesaTransactionStatus.EXPIRED
    ) {
      return {
        success: false,
        status: transaction.status,
        message: `Transaction is already ${transaction.status}`,
      };
    }

    const wasReconciled = await this.settleViaProviderQuery(transaction);

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
      result.successRate = Math.round(
        (result.completed / completedOrFailed) * 100,
      );
    }

    return result;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
