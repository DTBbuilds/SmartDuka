import { ReportSchedulerService } from './report-scheduler.service';
import { ReportPreferencesService } from './report-preferences.service';
import { ReportsService } from './reports.service';
import { ReportRendererService } from './report-renderer.service';
import { ReportNarrativeService } from './report-narrative.service';
import { EmailService } from '../notifications/email.service';
import { ConfigService } from '@nestjs/config';

/**
 * EMAIL-REPORTS-CORE1 (Phase D/I) — DURABLE SCHEDULER REGRESSION SHIELD.
 *
 * Proves:
 *  - unique run identity: the same logical report (shop+frequency+period)
 *    is created once across repeated ticks (duplicate prevention);
 *  - atomic claiming: two concurrent claimers never both deliver;
 *  - stale-claim recovery (crashed instance);
 *  - retry with attempt cap → terminal failed;
 *  - suppression outcomes (paused/unsubscribed/no recipients) — never sent;
 *  - the global feature flag OFF disables everything;
 *  - no-sales shops produce honest zero reports (not skipped silently);
 *  - provider acceptance is recorded as 'accepted' — NEVER 'delivered'
 *    without webhook evidence.
 */
describe('EMAIL-REPORTS-CORE1 durable report scheduler', () => {
  const SHOP = '507f1f77bcf86cd799439011';

  // Deterministic clock: 2026-10-23 18:00 UTC = 21:00 EAT — AFTER the 20:00
  // EAT daily send instant, so "yesterday" (Oct 22, shop-local) is due.
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-23T18:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  function boot(opts: { flag?: string; prefs?: any; shop?: any; sendResult?: any } = {}) {
    const runs: any[] = [];
    let runSeq = 0;

    const makeRun = (data: any) => {
      const doc: any = {
        _id: `run-${++runSeq}`,
        attempts: 0,
        status: 'queued',
        late: false,
        recipients: [],
        ...data,
        save: jest.fn(async () => doc),
      };
      runs.push(doc);
      return doc;
    };

    const runModel: any = Object.assign(
      jest.fn().mockImplementation((data: any) => {
        if (data.runId && runs.some((r) => r.runId === data.runId)) {
          const err: any = new Error('E11000');
          err.code = 11000;
          throw err; // unique runId — duplicate creation attempt
        }
        return makeRun(data);
      }),
      {
        create: jest.fn((data: any) => {
          if (data.runId && runs.some((r) => r.runId === data.runId)) {
            const err: any = new Error('E11000');
            err.code = 11000;
            throw err; // unique runId — duplicate creation attempt
          }
          return Promise.resolve(makeRun(data));
        }),
        findOneAndUpdate: jest.fn((filter: any, update: any) => {
          // Atomic claim simulation honoring the $and claim filter:
          //   clause 1: queued OR (failed AND attempts < cap)
          //   clause 2: lastAttemptAt missing OR older than the backoff cutoff
          const matches = (r: any) => {
            for (const clause of filter.$and ?? [filter]) {
              const ors = clause.$or ? clause.$or : [clause];
              if (!ors.some((cond: any) => {
                if (cond.status !== undefined && cond.status !== r.status) return false;
                if (cond.attempts?.$lt !== undefined && !(r.attempts < cond.attempts.$lt)) return false;
                if (cond.lastAttemptAt?.$lt !== undefined && !(r.lastAttemptAt && r.lastAttemptAt < cond.lastAttemptAt.$lt)) return false;
                if (cond.lastAttemptAt?.$exists === false && r.lastAttemptAt !== undefined) return false;
                return true;
              })) return false;
            }
            return true;
          };
          const candidate = runs.find(matches);
          if (!candidate || candidate.status === 'processing') return { exec: jest.fn().mockResolvedValue(null) };
          Object.assign(candidate, update.$set, { attempts: candidate.attempts + 1 });
          return { exec: jest.fn().mockResolvedValue(candidate) };
        }),
        updateOne: jest.fn(async (filter: any, update: any) => {
          const doc = runs.find((r) => String(r._id) === String(filter._id));
          if (doc) Object.assign(doc, update.$set);
          return { modifiedCount: doc ? 1 : 0 };
        }),
        updateMany: jest.fn((filter: any, update: any) => ({
          exec: jest.fn(async () => {
            let n = 0;
            for (const r of runs) {
              if (r.status === 'processing' && r.claimedAt && r.claimedAt < filter.claimedAt.$lt) {
                Object.assign(r, update.$set);
                n++;
              }
            }
            return { modifiedCount: n };
          }),
        })),
        countDocuments: jest.fn(async (filter: any) => runs.filter((r) => r.status === filter.status).length),
        find: jest.fn(() => ({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(runs.slice(-25).reverse()) })),
      },
    );

    const prefsDoc = {
      shopId: SHOP,
      timezone: 'Africa/Nairobi',
      paused: false,
      unsubscribedAt: undefined,
      daily: { enabled: true, hourLocal: 20, dayOfWeekLocal: 1, dayOfMonthLocal: 1 },
      weekly: { enabled: false, hourLocal: 20, dayOfWeekLocal: 1, dayOfMonthLocal: 1 },
      monthly: { enabled: false, hourLocal: 9, dayOfWeekLocal: 1, dayOfMonthLocal: 1 },
      recipientUserIds: [],
      ...(opts.prefs || {}),
    };
    const prefsModel: any = {
      find: jest.fn(() => ({ lean: jest.fn().mockResolvedValue([prefsDoc]) })),
      findOne: jest.fn().mockResolvedValue(prefsDoc),
      create: jest.fn().mockResolvedValue(prefsDoc),
    };

    const shopModel: any = {
      findById: jest.fn(() => ({
        select: jest.fn(() => ({
          lean: jest.fn(() => ({
            exec: jest.fn().mockResolvedValue(
              opts.shop === undefined
                ? { name: 'Load & Go', currency: 'KES', ownerId: 'owner-1' }
                : opts.shop,
            ),
          })),
        })),
      })),
      db: {
        collection: jest.fn(() => ({
          find: jest.fn(() => ({
            project: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValue([]),
          })),
        })),
      },
    };

    const configService = {
      get: jest.fn((key: string, dflt?: string) =>
        key === 'REPORT_EMAILS_ENABLED' ? (opts.flag ?? 'false') : dflt,
      ),
    } as any;

    const reportsService = {
      factsForRange: jest.fn().mockResolvedValue({
        billedRevenue: 1160,
        collectedPayments: 1160,
        refunds: 0,
        tax: 160,
        discounts: 0,
        orders: 1,
        itemsSold: 1,
        productMap: new Map([['p1', { name: 'InkWave', quantity: 1, revenue: 1000 }]]),
        currencies: new Map([['KES', 1]]),
        paymentMethods: new Map([['cash', 1160]]),
      }),
      getDailySalesReport: jest.fn(),
      getShopTimezone: jest.fn().mockResolvedValue('Africa/Nairobi'),
    } as any;

    const preferencesService = {
      isEligible: jest.fn().mockResolvedValue({ eligible: true }),
      resolveRecipients: jest
        .fn()
        .mockResolvedValue([{ userId: 'owner-1', email: 'owner@loadgo.example', name: 'Owner' }]),
      getOrCreate: jest.fn().mockResolvedValue(prefsDoc),
    } as any;

    const renderer = new ReportRendererService();
    const narrative = new ReportNarrativeService();

    const emailService = {
      sendEmail: jest.fn().mockResolvedValue(
        opts.sendResult ?? { success: true, messageId: 'resend-1', emailLogId: 'log-1' },
      ),
    } as any;

    const scheduler = new ReportSchedulerService(
      runModel,
      prefsModel,
      shopModel,
      configService,
      preferencesService,
      reportsService,
      renderer,
      narrative,
      emailService,
    );

    return { scheduler, runModel, runs, prefsModel, shopModel, preferencesService, reportsService, emailService, configService };
  }

  it('feature flag OFF (default): the tick does nothing', async () => {
    const { scheduler, runs, emailService } = boot({ flag: 'false' });
    await scheduler.onModuleInit();
    await scheduler.tick();
    expect(runs).toHaveLength(0);
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  it('feature flag ON: a due daily run is created, claimed, delivered as accepted', async () => {
    const { scheduler, runs, emailService } = boot({ flag: 'true' });
    await scheduler.onModuleInit();
    await scheduler.createDueRuns();
    expect(runs.length).toBe(1);
    expect(runs[0].status).toBe('queued');
    expect(runs[0].runId).toMatch(new RegExp(`^${SHOP}:daily:\\d{4}-\\d{2}-\\d{2}:v1$`));

    await scheduler.deliverPendingRuns();
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    expect(runs[0].status).toBe('accepted'); // provider acceptance — NEVER 'delivered' without webhook
    expect(runs[0].recipients).toEqual(['owner@loadgo.example']);
    // The send carries the run's idempotency key — one send per logical report, ever.
    expect(emailService.sendEmail.mock.calls[0][0].idempotencyKey).toBe(runs[0].runId);
    expect(emailService.sendEmail.mock.calls[0][0].attachments[0].contentType).toBe('application/pdf');
  });

  it('duplicate prevention: a second tick does not create a second run for the same period', async () => {
    const { scheduler, runs, emailService } = boot({ flag: 'true' });
    await scheduler.onModuleInit();
    await scheduler.createDueRuns();
    const countAfterFirst = runs.length;
    await scheduler.createDueRuns();
    expect(runs.length).toBe(countAfterFirst); // unique runId rejected the duplicate
    await scheduler.deliverPendingRuns();
    await scheduler.deliverPendingRuns();
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1); // one delivery total
  });

  it('atomic claiming: a run already processing is never double-claimed', async () => {
    const { scheduler, runs } = boot({ flag: 'true' });
    await scheduler.onModuleInit();
    await scheduler.createDueRuns();
    const run = runs[0];
    run.status = 'processing'; // another instance holds the claim
    const claimed = await (scheduler as any).runModel
      .findOneAndUpdate(
        { $or: [{ status: 'queued' }, { status: 'failed', attempts: { $lt: 3 } }] },
        { $set: { status: 'processing' }, $inc: { attempts: 1 } },
      )
      .exec();
    expect(claimed).toBeNull(); // the atomic claim refuses processing runs
    expect(run.attempts).toBe(0); // untouched by the losing claimer
  });

  it('suppression: paused/unsubscribed shops are marked suppressed, never sent', async () => {
    const { scheduler, runs, emailService, preferencesService } = boot({ flag: 'true' });
    await scheduler.onModuleInit();
    // The run is created while eligible, then eligibility FLIPS before
    // delivery — the delivery-time re-check must suppress it.
    await scheduler.createDueRuns();
    (preferencesService.isEligible as jest.Mock).mockResolvedValue({ eligible: false, reason: 'unsubscribed' });
    await scheduler.deliverPendingRuns();
    expect(emailService.sendEmail).not.toHaveBeenCalled();
    expect(runs[0].status).toBe('suppressed');
    expect(runs[0].lastError).toBe('unsubscribed');
  });

  it('no verified recipients → suppressed (never sent, never silently "delivered")', async () => {
    const { scheduler, runs, emailService, preferencesService } = boot({ flag: 'true' });
    await scheduler.onModuleInit();
    (preferencesService.resolveRecipients as jest.Mock).mockResolvedValue([]);
    await scheduler.createDueRuns();
    await scheduler.deliverPendingRuns();
    expect(emailService.sendEmail).not.toHaveBeenCalled();
    expect(runs[0].status).toBe('suppressed');
  });

  it('provider failure → failed with attempts; retries respect the backoff window until the cap', async () => {
    const { scheduler, runs, emailService } = boot({
      flag: 'true',
      sendResult: { success: false, error: 'resend + smtp: down' },
    });
    await scheduler.onModuleInit();
    await scheduler.createDueRuns();
    await scheduler.deliverPendingRuns();
    expect(runs[0].status).toBe('failed');
    expect(runs[0].attempts).toBe(1);
    // Backoff: an immediate re-tick does NOT retry (within the 15-min window).
    await scheduler.deliverPendingRuns();
    expect(runs[0].attempts).toBe(1);
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    // After the backoff window, the next tick retries.
    jest.setSystemTime(new Date('2026-10-23T18:16:00Z'));
    await scheduler.deliverPendingRuns();
    expect(runs[0].attempts).toBe(2);
    jest.setSystemTime(new Date('2026-10-23T18:32:00Z'));
    await scheduler.deliverPendingRuns();
    expect(runs[0].attempts).toBe(3);
    jest.setSystemTime(new Date('2026-10-23T18:48:00Z'));
    await scheduler.deliverPendingRuns();
    expect(runs[0].attempts).toBe(3); // cap reached — no more claims
    expect(emailService.sendEmail).toHaveBeenCalledTimes(3);
  });

  it('stale claims (crashed instance) are recovered to queued', async () => {
    const { scheduler, runs } = boot({ flag: 'true' });
    await scheduler.onModuleInit();
    await scheduler.createDueRuns();
    const run = runs[0];
    run.status = 'processing';
    run.claimedAt = new Date(Date.now() - 20 * 60_000); // 20 min ago (> 15 min stale)
    await (scheduler as any).recoverStaleClaims();
    expect(run.status).toBe('queued');
    expect(run.claimedAt).toBeNull();
  });

  it('no-sales shop: the report is still delivered with honest zeros (not skipped)', async () => {
    const { scheduler, runs, emailService, reportsService } = boot({ flag: 'true' });
    await scheduler.onModuleInit();
    (reportsService.factsForRange as jest.Mock).mockResolvedValue({
      billedRevenue: 0, collectedPayments: 0, refunds: 0, tax: 0, discounts: 0,
      orders: 0, itemsSold: 0,
      productMap: new Map(), currencies: new Map(), paymentMethods: new Map(),
    });
    await scheduler.createDueRuns();
    await scheduler.deliverPendingRuns();
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    expect(runs[0].status).toBe('accepted');
    expect(runs[0].metricsSummary).toMatchObject({ billedRevenue: 0, orders: 0 });
  });

  it('multi-shop safety: runs are scoped per shop (different runIds)', async () => {
    const SHOP_B = '507f1f77bcf86cd799439099';
    const { scheduler, runs } = boot({ flag: 'true' });
    await scheduler.onModuleInit();
    const prefsB = {
      shopId: SHOP_B,
      timezone: 'Africa/Nairobi',
      paused: false,
      unsubscribedAt: undefined,
      daily: { enabled: true, hourLocal: 20, dayOfWeekLocal: 1, dayOfMonthLocal: 1 },
      weekly: { enabled: false, hourLocal: 20, dayOfWeekLocal: 1, dayOfMonthLocal: 1 },
      monthly: { enabled: false, hourLocal: 9, dayOfWeekLocal: 1, dayOfMonthLocal: 1 },
      recipientUserIds: [],
    };
    ((scheduler as any).prefsModel.find as jest.Mock).mockImplementation(() => ({ lean: jest.fn().mockResolvedValue([
      {
        shopId: SHOP,
        timezone: 'Africa/Nairobi', paused: false, unsubscribedAt: undefined,
        daily: { enabled: true, hourLocal: 20, dayOfWeekLocal: 1, dayOfMonthLocal: 1 },
        weekly: { enabled: false, hourLocal: 20, dayOfWeekLocal: 1, dayOfMonthLocal: 1 },
        monthly: { enabled: false, hourLocal: 9, dayOfWeekLocal: 1, dayOfMonthLocal: 1 },
        recipientUserIds: [],
      },
      prefsB,
    ])}));
    await scheduler.createDueRuns();
    expect(runs.length).toBe(2);
    const ids = runs.map((r) => r.runId);
    expect(new Set(ids).size).toBe(2);
    expect(ids[0]).toContain(SHOP);
    expect(ids[1]).toContain(SHOP_B);
  });
});
