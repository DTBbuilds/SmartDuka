import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SubscriptionInvoice,
  SubscriptionInvoiceDocument,
  InvoiceStatus,
} from '../schemas/subscription-invoice.schema';
import { InvoicePaymentAuthorityService } from './invoice-payment-authority.service';
import { SubscriptionMpesaService } from '../subscription-mpesa.service';
import { SubscriptionsService } from '../subscriptions.service';
import { EFFECT_CLAIM_LEASE_MS } from './invoice-effects.helper';

export interface ReconcileReport {
  scanned: number;
  processed: number;
  recovered: number;
  retried: number;
  skippedBackoff: number;
  exhausted: number;
  errors: string[];
}

/**
 * P0-11C2 — DURABLE PENDING-EFFECTS RECOVERY
 *
 * PAID invoices whose `billingEffects.status` is 'pending' (crash between
 * the atomic settlement claim and the subscription mutation) cannot depend
 * on webhook redelivery or user polling forever. This worker periodically
 * drains them through the same canonical idempotent primitives used by
 * settlement (InvoicePaymentAuthorityService.ensureBillingEffects for the
 * 'stripe' channel, SubscriptionMpesaService.ensureStkBillingEffects for
 * 'mpesa_stk').
 *
 * Guarantees:
 *  - Lease-based atomic claim (`billingEffects.recoveringAt`) so concurrent
 *    workers never apply the same invoice twice; a stale lease expires.
 *  - Exponential backoff on attempts; permanently failing records transition
 *    to 'failed' and are surfaced via listStuckBillingEffects().
 *  - Never initiates a provider charge; never trusts browser claims — it
 *    only completes effects for invoices already proven PAID.
 */
@Injectable()
export class BillingEffectsReconciliationService {
  private readonly logger = new Logger(
    BillingEffectsReconciliationService.name,
  );

  constructor(
    @InjectModel(SubscriptionInvoice.name)
    private readonly invoiceModel: Model<SubscriptionInvoiceDocument>,
    private readonly invoicePaymentAuthority: InvoicePaymentAuthorityService,
    private readonly mpesaService: SubscriptionMpesaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  private readonly BATCH_LIMIT = 25;
  private readonly LEASE_MS = 10 * 60 * 1000; // crashed worker lease expires
  private readonly MAX_ATTEMPTS = 20;

  private backoffMs(attempts: number): number {
    return Math.min(Math.max(attempts, 1), 10) * 60 * 1000;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduledReconcile(): Promise<void> {
    try {
      const report = await this.reconcilePendingBillingEffects();
      if (report.recovered || report.exhausted || report.errors.length) {
        this.logger.log(
          `Billing-effects reconciliation: ${JSON.stringify(report)}`,
        );
      }
    } catch (error: any) {
      this.logger.error(`Reconciliation sweep failed: ${error?.message}`);
    }
  }

  /**
   * Drain PAID invoices with pending billing effects. Claim → apply through
   * the canonical primitive → the primitive itself records 'applied' only
   * after effects are durable.
   */
  async reconcilePendingBillingEffects(
    opts: {
      batchLimit?: number;
      maxAttempts?: number;
      backoffMs?: (attempts: number) => number;
    } = {},
  ): Promise<ReconcileReport> {
    const batchLimit = opts.batchLimit ?? this.BATCH_LIMIT;
    const maxAttempts = opts.maxAttempts ?? this.MAX_ATTEMPTS;
    const backoffMs = opts.backoffMs ?? ((a: number) => this.backoffMs(a));
    const report: ReconcileReport = {
      scanned: 0,
      processed: 0,
      recovered: 0,
      retried: 0,
      skippedBackoff: 0,
      exhausted: 0,
      errors: [],
    };

    const candidates = await this.invoiceModel
      .find({
        status: InvoiceStatus.PAID,
        // 'pending' = awaiting application; 'applying' = a crashed
        // application whose per-invoice lease may have expired (P0-11C3).
        'billingEffects.status': { $in: ['pending', 'applying'] },
      })
      .limit(batchLimit)
      .exec();
    report.scanned = candidates.length;

    const staleClaim = new Date(Date.now() - EFFECT_CLAIM_LEASE_MS);

    const now = Date.now();
    const staleLease = new Date(now - this.LEASE_MS);

    for (const invoice of candidates) {
      // An 'applying' record with a LIVE claim is being applied by another
      // reconciler — skip; only a stale claim (crashed applier) is retried.
      if (
        invoice.billingEffects?.status === 'applying' &&
        invoice.billingEffects?.claimedAt &&
        new Date(invoice.billingEffects.claimedAt) > staleClaim
      ) {
        report.skippedBackoff += 1;
        continue;
      }

      const attempts = invoice.billingEffects?.attempts || 0;
      if (attempts >= maxAttempts) {
        // Exhausted — surface for operator action; stop auto-retry.
        await this.invoiceModel.updateOne(
          {
            _id: invoice._id,
            'billingEffects.status': 'pending',
          },
          { $set: { 'billingEffects.status': 'failed' } },
        );
        report.exhausted += 1;
        continue;
      }

      const recoveringAt = invoice.billingEffects?.recoveringAt
        ? new Date(invoice.billingEffects.recoveringAt).getTime()
        : 0;
      if (recoveringAt && now - recoveringAt < backoffMs(attempts)) {
        report.skippedBackoff += 1;
        continue;
      }

      // Atomic lease claim — concurrent workers cannot double-apply.
      const claimed = await this.invoiceModel.findOneAndUpdate(
        {
          _id: invoice._id,
          status: InvoiceStatus.PAID,
          'billingEffects.status': { $in: ['pending', 'applying'] },
          $or: [
            { 'billingEffects.recoveringAt': { $exists: false } },
            { 'billingEffects.recoveringAt': { $lte: staleLease } },
            {
              'billingEffects.recoveringAt': {
                $lte: new Date(now - backoffMs(attempts)),
              },
            },
          ],
        },
        { $set: { 'billingEffects.recoveringAt': new Date(now) } },
        { new: true },
      );
      if (!claimed) {
        report.skippedBackoff += 1;
        continue;
      }

      report.processed += 1;
      try {
        // P0-11C3: dispatch on the recorded settlement channel — never
        // assume every non-Stripe invoice is an STK payment.
        const channel = claimed.billingEffects?.channel;
        if (channel === 'stripe') {
          await this.invoicePaymentAuthority.ensureBillingEffects(
            claimed._id.toString(),
            claimed.shopId.toString(),
          );
        } else if (channel === 'mpesa_stk') {
          await this.mpesaService.ensureStkBillingEffects(
            claimed._id.toString(),
          );
        } else if (channel === 'manual') {
          await this.subscriptionsService.ensureManualBillingEffects(
            claimed._id.toString(),
          );
        } else {
          throw new Error(
            `unknown billing-effects channel '${channel}' — operator review required`,
          );
        }
        report.recovered += 1;
      } catch (error: any) {
        report.retried += 1;
        report.errors.push(
          `${claimed.invoiceNumber}: ${error?.message || 'unknown'}`,
        );
        if (attempts + 1 >= maxAttempts) {
          await this.invoiceModel
            .updateOne(
              {
                _id: claimed._id,
                'billingEffects.status': 'pending',
              },
              { $set: { 'billingEffects.status': 'failed' } },
            )
            .catch(() => undefined);
          report.exhausted += 1;
        }
      }
    }

    return report;
  }

  /**
   * Read-only operational report — PAID invoices whose required billing
   * effects are pending (recovering) or failed (needs operator action).
   */
  async listStuckBillingEffects(): Promise<
    Array<{
      _id: any;
      shopId: any;
      invoiceNumber?: string;
      channel?: string;
      effectsStatus?: string;
      attempts?: number;
      lastError?: string;
      paidAt?: Date;
      recoveringAt?: Date;
    }>
  > {
    const stuck = await this.invoiceModel
      .find({
        status: InvoiceStatus.PAID,
        'billingEffects.status': { $in: ['pending', 'failed'] },
      })
      .sort({ 'billingEffects.recoveringAt': 1 })
      .limit(200)
      .lean()
      .exec();
    return stuck.map((i: any) => ({
      _id: i._id,
      shopId: i.shopId,
      invoiceNumber: i.invoiceNumber,
      channel: i.billingEffects?.channel,
      effectsStatus: i.billingEffects?.status,
      attempts: i.billingEffects?.attempts,
      lastError: i.billingEffects?.lastError,
      paidAt: i.paidAt,
      recoveringAt: i.billingEffects?.recoveringAt,
    }));
  }
}
