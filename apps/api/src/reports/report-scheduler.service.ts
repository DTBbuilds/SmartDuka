import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { ReportRun, ReportRunDocument } from './schemas/report-run.schema';
import { ReportPreferencesDocument, ReportPreferences } from './schemas/report-preferences.schema';
import { ReportPreferencesService } from './report-preferences.service';
import { ReportsService } from './reports.service';
import { ReportRendererService, ReportMetrics } from './report-renderer.service';
import { ReportNarrativeService } from './report-narrative.service';
import { EmailService } from '../notifications/email.service';
import { Shop } from '../shops/schemas/shop.schema';

/**
 * EMAIL-REPORTS-CORE1 (Phase D) — DURABLE, IDEMPOTENT REPORT SCHEDULER.
 *
 * Identity: runId = `${shopId}:${frequency}:${periodKey}:v${version}` —
 * unique index ⇒ the same logical report can only ever exist once, across
 * process restarts and multi-instance deployments.
 *
 * Claiming: an instance claims a run with an atomic
 * findOneAndUpdate({runId, status: 'queued'}, {status: 'processing',
 * claimedAt, claimedBy}) — exactly one instance wins; losers observe.
 *
 * Recovery: a claim older than STALE_CLAIM_MINUTES is considered abandoned
 * (crashed instance) and may be re-claimed; failed runs retry with backoff
 * up to MAX_ATTEMPTS; periods missed entirely (server down) are created
 * late on the next tick, flagged `late`, but never back-filled more than
 * MAX_LATE_DAYS (no flood after a long outage).
 *
 * Outcomes are explicit: queued → processing → accepted (provider
 * acceptance) → delivered (webhook) | failed | suppressed. A generated
 * report is NEVER marked delivered without provider evidence.
 *
 * Global flag REPORT_EMAILS_ENABLED (default FALSE) gates everything.
 */
@Injectable()
export class ReportSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(ReportSchedulerService.name);
  private readonly instanceId = randomUUID().slice(0, 8);
  private enabled = false;

  private static readonly MAX_ATTEMPTS = 3;
  private static readonly RETRY_BACKOFF_MINUTES = 15;
  private static readonly STALE_CLAIM_MINUTES = 15;
  private static readonly MAX_LATE_DAYS = 3;
  private static readonly MAX_SENDS_PER_TICK = 20;

  constructor(
    @InjectModel(ReportRun.name) private readonly runModel: Model<ReportRunDocument>,
    @InjectModel(ReportPreferences.name) private readonly prefsModel: Model<ReportPreferencesDocument>,
    @InjectModel(Shop.name) private readonly shopModel: Model<any>,
    private readonly configService: ConfigService,
    private readonly preferencesService: ReportPreferencesService,
    private readonly reportsService: ReportsService,
    private readonly renderer: ReportRendererService,
    private readonly narrative: ReportNarrativeService,
    private readonly emailService: EmailService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.enabled = this.configService.get<string>('REPORT_EMAILS_ENABLED', 'false') === 'true';
    this.logger.log(
      `Report scheduler ${this.enabled ? 'ENABLED' : 'DISABLED (REPORT_EMAILS_ENABLED=false)'} — instance ${this.instanceId}`,
    );
  }

  /** Health snapshot for the Super Admin monitoring surface. */
  async schedulerHealth(): Promise<{
    enabled: boolean;
    instanceId: string;
    queued: number;
    processing: number;
    accepted: number;
    delivered: number;
    failed: number;
    suppressed: number;
    staleClaims: number;
  }> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [queued, processing, accepted, delivered, failed, suppressed, staleClaims] =
      await Promise.all([
        this.runModel.countDocuments({ status: 'queued' }),
        this.runModel.countDocuments({ status: 'processing' }),
        this.runModel.countDocuments({ status: 'accepted', createdAt: { $gte: since } }),
        this.runModel.countDocuments({ status: 'delivered', createdAt: { $gte: since } }),
        this.runModel.countDocuments({ status: 'failed', createdAt: { $gte: since } }),
        this.runModel.countDocuments({ status: 'suppressed', createdAt: { $gte: since } }),
        this.runModel.countDocuments({
          status: 'processing',
          claimedAt: { $lt: new Date(Date.now() - ReportSchedulerService.STALE_CLAIM_MINUTES * 60_000) },
        }),
      ]);
    return {
      enabled: this.enabled,
      instanceId: this.instanceId,
      queued,
      processing,
      accepted,
      delivered,
      failed,
      suppressed,
      staleClaims,
    };
  }

  /** Recent runs for the Super Admin monitoring surface. */
  async recentRuns(limit = 50): Promise<ReportRunDocument[]> {
    return this.runModel.find({}).sort({ createdAt: -1 }).limit(Math.min(limit, 200)).exec();
  }

  // ==================== SCHEDULING TICK ====================

  /** Every 15 minutes: create due runs, recover stale/failed runs, deliver. */
  @Cron('*/15 * * * *')
  async tick(): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.createDueRuns();
      await this.recoverStaleClaims();
      await this.deliverPendingRuns();
    } catch (error: any) {
      this.logger.error(`Scheduler tick failed: ${error.message}`);
    }
  }

  /**
   * Create run records for every due period of every eligible shop. The
   * unique runId makes creation idempotent — a duplicate tick is a no-op.
   */
  async createDueRuns(): Promise<number> {
    const prefs = await this.prefsModel
      .find({
        paused: false,
        unsubscribedAt: { $exists: false },
        $or: [
          { 'daily.enabled': true },
          { 'weekly.enabled': true },
          { 'monthly.enabled': true },
        ],
      })
      .lean();
    if (prefs.length === 0) return 0;

    const now = new Date();
    let created = 0;

    for (const p of prefs) {
      const shopId = String(p.shopId);
      const tz = p.timezone || 'Africa/Nairobi';
      const eligible = await this.preferencesService.isEligible(shopId);
      if (!eligible.eligible) continue;

      const due: Array<{ frequency: 'daily' | 'weekly' | 'monthly'; periodStart: Date; periodEnd: Date; periodKey: string; scheduledAt: Date }> = [];
      this.computeDuePeriods(p, tz, now, due);

      for (const d of due) {
        const late = now.getTime() - d.scheduledAt.getTime() > 60_000;
        if (late && now.getTime() - d.scheduledAt.getTime() > ReportSchedulerService.MAX_LATE_DAYS * 86_400_000) {
          continue; // never flood after a long outage
        }
        const runId = this.buildRunId(shopId, d.frequency, d.periodKey);
        try {
          await this.runModel.create({
            runId,
            shopId: new Types.ObjectId(shopId),
            frequency: d.frequency,
            periodKey: d.periodKey,
            periodStart: d.periodStart,
            periodEnd: d.periodEnd,
            timezone: tz,
            status: 'queued',
            late,
          });
          created++;
        } catch (error: any) {
          if (error?.code !== 11000) {
            this.logger.warn(`Run creation failed for ${runId}: ${error.message}`);
          }
          // 11000 = already exists (idempotent) — expected on re-ticks.
        }
      }
    }
    if (created > 0) this.logger.log(`Created ${created} report run(s)`);
    return created;
  }

  /**
   * Due periods for one shop's preferences, evaluated in SHOP-LOCAL time.
   * A period is due when its scheduled send instant (local hour) has passed
   * and no run exists yet (existence enforced by the unique runId).
   */
  private computeDuePeriods(
    prefs: any,
    tz: string,
    now: Date,
    out: Array<{ frequency: 'daily' | 'weekly' | 'monthly'; periodStart: Date; periodEnd: Date; periodKey: string; scheduledAt: Date }>,
  ): void {
    const localNowYmd = this.localYmd(now, tz);
    const localNowH = Number(
      new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(now),
    );

    // DAILY: report for YESTERDAY (shop-local), sent today at hourLocal.
    if (prefs.daily?.enabled) {
      const yesterday = this.shiftYmd(localNowYmd, -1);
      const scheduledAt = this.localInstant(`${this.todayYmd(now, tz)}T${String(prefs.daily.hourLocal ?? 20).padStart(2, '0')}:00`, tz);
      if (now >= scheduledAt) {
        const { start, end } = this.ymdRangeUtc(yesterday, tz);
        out.push({ frequency: 'daily', periodStart: start, periodEnd: end, periodKey: yesterday, scheduledAt });
      }
    }

    // WEEKLY: report for the LAST COMPLETE local week, sent on
    // dayOfWeekLocal at hourLocal.
    if (prefs.weekly?.enabled) {
      const targetDow = prefs.weekly.dayOfWeekLocal ?? 1;
      const todayDow = this.dowInZone(now, tz);
      let daysSinceTarget = (todayDow - targetDow + 7) % 7;
      if (daysSinceTarget === 0 && localNowH < (prefs.weekly.hourLocal ?? 20)) {
        daysSinceTarget = 7; // scheduled time not reached today → last week's send was 7 days ago
      }
      const sendDayYmd = this.shiftYmd(localNowYmd, -daysSinceTarget);
      const scheduledAt = this.localInstant(`${sendDayYmd}T${String(prefs.weekly.hourLocal ?? 20).padStart(2, '0')}:00`, tz);
      if (now >= scheduledAt) {
        // The reported week ENDS on the send day: period = [sendDay-6 .. sendDay] local.
        const startYmd = this.shiftYmd(sendDayYmd, -6);
        const { start } = this.ymdRangeUtc(startYmd, tz);
        const { end } = this.ymdRangeUtc(sendDayYmd, tz);
        out.push({
          frequency: 'weekly',
          periodStart: start,
          periodEnd: end,
          periodKey: `${startYmd}..${sendDayYmd}`,
          scheduledAt,
        });
      }
    }

    // MONTHLY: report for the LAST COMPLETE local month, sent on
    // dayOfMonthLocal at hourLocal.
    if (prefs.monthly?.enabled) {
      const dayOfMonth = Number(localNowYmd.slice(8, 10));
      const targetDay = Math.min(prefs.monthly.dayOfMonthLocal ?? 1, 28);
      const scheduledToday = dayOfMonth === targetDay && localNowH >= (prefs.monthly.hourLocal ?? 9);
      const sendYmd = scheduledToday || dayOfMonth > targetDay
        ? `${localNowYmd.slice(0, 7)}-${String(targetDay).padStart(2, '0')}`
        : this.shiftYmd(`${localNowYmd.slice(0, 7)}-01`, -1); // previous month's target day
      const scheduledAt = this.localInstant(`${sendYmd}T${String(prefs.monthly.hourLocal ?? 9).padStart(2, '0')}:00`, tz);
      if (now >= scheduledAt) {
        // Report the PREVIOUS calendar month (complete).
        const monthOfSend = Number(sendYmd.slice(5, 7));
        const prevMonth = monthOfSend === 1 ? 12 : monthOfSend - 1;
        const prevYear = monthOfSend === 1 ? Number(sendYmd.slice(0, 4)) - 1 : Number(sendYmd.slice(0, 4));
        const startYmd = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
        const nextM = prevMonth === 12 ? 1 : prevMonth + 1;
        const nextY = prevMonth === 12 ? prevYear + 1 : prevYear;
        const { start } = this.ymdRangeUtc(startYmd, tz);
        const { start: end } = this.ymdRangeUtc(`${nextY}-${String(nextM).padStart(2, '0')}-01`, tz);
        out.push({
          frequency: 'monthly',
          periodStart: start,
          periodEnd: end,
          periodKey: `${prevYear}-${String(prevMonth).padStart(2, '0')}`,
          scheduledAt,
        });
      }
    }
  }

  // ==================== DELIVERY ====================

  /** Claim queued runs atomically and deliver, rate-limited per tick.
   *  Failed runs retry on a LATER tick (15-minute backoff) — never 3
   *  instant attempts inside one tick. */
  async deliverPendingRuns(): Promise<number> {
    let delivered = 0;
    const backoffCutoff = new Date(
      Date.now() - ReportSchedulerService.RETRY_BACKOFF_MINUTES * 60_000,
    );
    for (let i = 0; i < ReportSchedulerService.MAX_SENDS_PER_TICK; i++) {
      const claim = await this.runModel
        .findOneAndUpdate(
          {
            $and: [
              {
                $or: [
                  { status: 'queued' },
                  { status: 'failed', attempts: { $lt: ReportSchedulerService.MAX_ATTEMPTS } },
                ],
              },
              {
                // Fresh queued runs have no lastAttemptAt; failed retries
                // must be older than the backoff window.
                $or: [
                  { lastAttemptAt: { $exists: false } },
                  { lastAttemptAt: { $lt: backoffCutoff } },
                ],
              },
            ],
          },
          {
            $set: {
              status: 'processing',
              claimedAt: new Date(),
              claimedBy: this.instanceId,
              lastAttemptAt: new Date(),
            },
            $inc: { attempts: 1 },
          },
          { new: true, sort: { createdAt: 1 } },
        )
        .exec();
      if (!claim) break;

      try {
        await this.deliverRun(claim);
        delivered++;
      } catch (error: any) {
        await this.markFailed(claim, error?.message || 'delivery failed');
      }
    }
    return delivered;
  }

  private async deliverRun(run: ReportRunDocument): Promise<void> {
    const shopId = String(run.shopId);
    const shop = (await this.shopModel.findById(run.shopId).select('name currency ownerId').lean().exec()) as any;
    if (!shop) {
      await this.suppress(run, 'shop_not_found');
      return;
    }

    // Eligibility re-checked at delivery time (preferences may have changed
    // between queueing and sending).
    const eligible = await this.preferencesService.isEligible(shopId);
    if (!eligible.eligible) {
      await this.suppress(run, eligible.reason || 'not_eligible');
      return;
    }
    const recipients = await this.preferencesService.resolveRecipients(shopId);
    if (recipients.length === 0) {
      await this.suppress(run, 'no_verified_recipients');
      return;
    }

    // Canonical metrics for the run's explicit period (never re-derived
    // from "now" — the period is immutable on the run).
    const metrics = await this.buildMetrics(run, shop);
    const withNarrative = await this.narrative.buildAiNarrativeIfEnabled(metrics);
    metrics.insights = withNarrative;

    const html = this.renderer.html(metrics);
    const text = this.renderer.text(metrics);
    const pdf = await this.renderer.pdf(metrics);

    const periodLabel = run.periodKey;
    const send = await this.emailService.sendEmail({
      to: recipients.map((r) => r.email),
      subject: this.renderer.subject(metrics),
      html,
      text,
      attachments: [
        {
          filename: `smartduka-${run.frequency}-report-${periodLabel}.pdf`,
          content: pdf,
          contentType: 'application/pdf',
        },
      ],
      shopId,
      shopName: metrics.shopName,
      category: 'notification',
      templateName: `${run.frequency}_business_digest`,
      triggeredBy: 'report_scheduler',
      idempotencyKey: run.runId, // one send per logical report — ever
    });

    if (send.success) {
      await this.runModel.updateOne(
        { _id: run._id, status: 'processing' },
        {
          $set: {
            status: 'accepted', // provider acceptance — delivery via webhook
            recipients: recipients.map((r) => r.email),
            emailLogId: send.emailLogId,
            messageId: send.messageId,
            provider: 'resend|smtp',
            metricsSummary: {
              billedRevenue: metrics.billedRevenue,
              collectedPayments: metrics.collectedPayments,
              outstanding: metrics.outstanding,
              orders: metrics.orders,
              currency: metrics.currency,
            },
          },
        },
      );
      this.logger.log(`Report run ${run.runId} accepted by provider (${recipients.length} recipient(s))`);
    } else {
      throw new Error(send.error || 'provider rejected the send');
    }
  }

  private async buildMetrics(run: ReportRunDocument, shop: any): Promise<ReportMetrics> {
    const shopId = String(run.shopId);
    const base: Omit<ReportMetrics, 'insights'> = {
      shopName: shop.name,
      frequency: run.frequency,
      periodLabel: this.periodLabel(run),
      periodStart: run.periodStart,
      periodEnd: run.periodEnd,
      timezone: run.timezone,
      currency: shop.currency,
      billedRevenue: 0,
      collectedPayments: 0,
      outstanding: 0,
      refunds: 0,
      tax: 0,
      discounts: 0,
      orders: 0,
      itemsSold: 0,
      averageOrderValue: 0,
      paymentMethods: [],
      topProducts: [],
      lowStock: [],
      dashboardUrl: `${process.env.FRONTEND_URL || 'https://www.smartduka.org'}/admin/dashboard`,
      preferencesUrl: `${process.env.FRONTEND_URL || 'https://www.smartduka.org'}/settings?tab=reports`,
      generatedAt: new Date(),
    };

    // Canonical metrics from the authoritative ReportsService for the run's
    // EXPLICIT period (shop-local boundaries already baked into the run's
    // UTC instants).
    const orders = await this.reportsService.factsForRange(shopId, run.periodStart, run.periodEnd);
    base.billedRevenue = orders.billedRevenue;
    base.collectedPayments = orders.collectedPayments;
    base.outstanding = Math.round((orders.billedRevenue - orders.collectedPayments) * 100) / 100;
    base.refunds = orders.refunds;
    base.tax = orders.tax;
    base.discounts = orders.discounts;
    base.orders = orders.orders;
    base.itemsSold = orders.itemsSold;
    base.averageOrderValue = orders.orders > 0 ? Math.round((orders.billedRevenue / orders.orders) * 100) / 100 : 0;
    base.paymentMethods = Array.from(orders.paymentMethods.entries())
      .map(([method, amount]) => ({ method, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount);
    base.topProducts = Array.from(orders.productMap.entries())
      .map(([productId, d]) => ({ productId, productName: d.name, quantity: d.quantity, revenue: Math.round(d.revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    base.currency = (Array.from(orders.currencies.entries()).filter(([c]) => c !== '(unlabelled)').sort((a, b) => b[1] - a[1])[0]?.[0]) || shop.currency;

    // Previous comparable period for the change indicator.
    const span = run.periodEnd.getTime() - run.periodStart.getTime();
    const prev = await this.reportsService.factsForRange(
      shopId,
      new Date(run.periodStart.getTime() - span),
      run.periodStart,
    );
    base.previousPeriod = { billedRevenue: prev.billedRevenue, orders: prev.orders };

    // Low stock (current, not period-bound).
    base.lowStock = await this.lowStock(shopId);
    return { ...base, insights: [] } as ReportMetrics;
  }

  private async lowStock(shopId: string): Promise<Array<{ name: string; stock: number; reorderPoint: number }>> {
    try {
      const products = await this.shopModel.db
        .collection('products')
        .find({
          shopId: new Types.ObjectId(shopId),
          deletedAt: { $exists: false },
          $expr: { $and: [{ $lte: ['$stock', '$reorderLevel'] }, { $gt: ['$reorderLevel', 0] }] },
        })
        .project({ name: 1, stock: 1, reorderLevel: 1 })
        .limit(8)
        .toArray();
      return products.map((p: any) => ({ name: p.name, stock: p.stock || 0, reorderPoint: p.reorderLevel || 0 }));
    } catch {
      return [];
    }
  }

  private periodLabel(run: ReportRunDocument): string {
    try {
      const fmtLocal = new Intl.DateTimeFormat('en-GB', {
        timeZone: run.timezone,
        ...(run.frequency === 'daily'
          ? { dateStyle: 'full' }
          : { day: 'numeric', month: 'short', year: 'numeric' }),
      });
      if (run.frequency === 'daily') return fmtLocal.format(run.periodStart);
      return `${fmtLocal.format(run.periodStart)} – ${new Intl.DateTimeFormat('en-GB', { timeZone: run.timezone, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(run.periodEnd.getTime() - 1))}`;
    } catch {
      return run.periodKey;
    }
  }

  private async markFailed(run: ReportRunDocument, error: string): Promise<void> {
    const exhausted = run.attempts >= ReportSchedulerService.MAX_ATTEMPTS;
    await this.runModel.updateOne(
      { _id: run._id, status: 'processing' },
      {
        $set: {
          status: exhausted ? 'failed' : 'failed',
          lastError: String(error).slice(0, 500),
        },
      },
    );
    this.logger.warn(`Report run ${run.runId} attempt ${run.attempts} failed: ${error}`);
  }

  private async suppress(run: ReportRunDocument, reason: string): Promise<void> {
    await this.runModel.updateOne(
      { _id: run._id, status: 'processing' },
      { $set: { status: 'suppressed', lastError: reason } },
    );
    this.logger.log(`Report run ${run.runId} suppressed: ${reason}`);
  }

  /** Re-claim runs whose owning instance crashed mid-delivery. */
  private async recoverStaleClaims(): Promise<void> {
    const cutoff = new Date(Date.now() - ReportSchedulerService.STALE_CLAIM_MINUTES * 60_000);
    const result = await this.runModel
      .updateMany(
        { status: 'processing', claimedAt: { $lt: cutoff } },
        { $set: { status: 'queued', claimedAt: null, claimedBy: null } },
      )
      .exec();
    if (result.modifiedCount > 0) {
      this.logger.warn(`Recovered ${result.modifiedCount} stale report claim(s)`);
    }
  }

  // ==================== TIME HELPERS (shop-local correctness) ====================

  private buildRunId(shopId: string, frequency: string, periodKey: string): string {
    return `${shopId}:${frequency}:${periodKey}:v1`;
  }

  private todayYmd(now: Date, tz: string): string {
    return this.localYmd(now, tz);
  }

  private localYmd(instant: Date, tz: string): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
  }

  private dowInZone(instant: Date, tz: string): number {
    const ymd = this.localYmd(instant, tz);
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  }

  private shiftYmd(ymd: string, days: number): string {
    const [y, m, d] = ymd.split('-').map(Number);
    const shifted = new Date(Date.UTC(y, m - 1, d + days));
    return shifted.toISOString().slice(0, 10);
  }

  /** UTC instant of a shop-local wall-clock time (noon-probe offset method). */
  private localInstant(localIso: string, tz: string): Date {
    const [datePart, timePart] = localIso.split('T');
    const probe = new Date(`${datePart}T12:00:00Z`);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(probe);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
    const offsetMs = asUtc - probe.getTime();
    return new Date(new Date(`${datePart}T${timePart}Z`).getTime() - offsetMs);
  }

  private ymdRangeUtc(ymd: string, tz: string): { start: Date; end: Date } {
    const start = this.localInstant(`${ymd}T00:00:00`, tz);
    const end = this.localInstant(`${ymd}T24:00:00`, tz);
    return { start, end };
  }
}
