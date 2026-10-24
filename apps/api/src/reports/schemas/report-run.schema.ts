import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReportRunStatus =
  | 'queued'
  | 'processing'
  | 'accepted'
  | 'delivered'
  | 'failed'
  | 'suppressed';

/**
 * EMAIL-REPORTS-CORE1 (Phase D) — DURABLE REPORT RUN.
 *
 * One logical scheduled report = one immutable identity:
 *   runId = `${shopId}:${frequency}:${periodKey}:v${reportVersion}`
 * The unique index on runId makes the scheduler idempotent across
 * multi-instance deployment, process restarts, and retries: whoever wins
 * the atomic claim delivers the report; everyone else observes.
 *
 * Status semantics (never conflate generation with delivery):
 *   queued     — the run exists, waiting to be claimed
 *   processing — an instance holds the claim
 *   accepted   — the provider ACCEPTED the message (not delivery proof)
 *   delivered  — the provider webhook confirmed delivery
 *   failed     — all attempts exhausted (or suppressed send refused)
 *   suppressed — skipped by preference/pause/unsubscribe/eligibility
 */
@Schema({ timestamps: true })
export class ReportRun {
  @Prop({ required: true, unique: true, index: true })
  runId: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop', index: true })
  shopId: Types.ObjectId;

  @Prop({ required: true, enum: ['daily', 'weekly', 'monthly'] })
  frequency: 'daily' | 'weekly' | 'monthly';

  /** daily: YYYY-MM-DD (shop-local) · weekly: YYYY-Www · monthly: YYYY-MM */
  @Prop({ required: true })
  periodKey: string;

  @Prop({ required: true })
  periodStart: Date;

  @Prop({ required: true })
  periodEnd: Date;

  @Prop({ required: true })
  timezone: string;

  @Prop({ default: 1 })
  reportVersion: number;

  @Prop({
    required: true,
    enum: ['queued', 'processing', 'accepted', 'delivered', 'failed', 'suppressed'],
    default: 'queued',
    index: true,
  })
  status: ReportRunStatus;

  @Prop({ type: [String], default: [] })
  recipients: string[];

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ required: false })
  claimedAt?: Date;

  @Prop({ required: false })
  claimedBy?: string;

  @Prop({ required: false })
  lastAttemptAt?: Date;

  @Prop({ required: false })
  lastError?: string;

  @Prop({ required: false })
  emailLogId?: string;

  @Prop({ required: false })
  provider?: string;

  @Prop({ required: false })
  messageId?: string;

  /** True when the run was created after its scheduled instant passed. */
  @Prop({ default: false })
  late: boolean;

  /** Deterministic metrics snapshot for auditability (no PII). */
  @Prop({ type: Object, required: false })
  metricsSummary?: Record<string, any>;

  createdAt?: Date;
  updatedAt?: Date;
}

export type ReportRunDocument = HydratedDocument<ReportRun>;

export const ReportRunSchema = SchemaFactory.createForClass(ReportRun);

ReportRunSchema.index({ shopId: 1, createdAt: -1 });
ReportRunSchema.index({ status: 1, createdAt: -1 });
