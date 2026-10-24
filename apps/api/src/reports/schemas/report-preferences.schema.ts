import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReportFrequency = 'daily' | 'weekly' | 'monthly';

/**
 * EMAIL-REPORTS-CORE1 (Phase C) — SHOP-SCOPED REPORT PREFERENCES.
 *
 * Consent model: reports are OFF for every shop by default and are enabled
 * only by an explicit shop-admin action (or an explicit onboarding opt-in).
 * Registration or OAuth authentication NEVER implies report consent.
 * Transactional email (OTP, password reset, payment notices) is a separate
 * concern and is never governed by these preferences.
 */
@Schema({ _id: false })
export class ReportFrequencyPreference {
  @Prop({ default: false })
  enabled: boolean;

  /** Shop-LOCAL hour of day for delivery (0-23). */
  @Prop({ default: 20, min: 0, max: 23 })
  hourLocal: number;

  /** Weekly: shop-local day of week (0=Sun..6=Sat). */
  @Prop({ default: 1, min: 0, max: 6 })
  dayOfWeekLocal: number;

  /** Monthly: shop-local day of month (1-28; clamped for short months). */
  @Prop({ default: 1, min: 1, max: 28 })
  dayOfMonthLocal: number;
}

@Schema({ timestamps: true })
export class ReportPreferences {
  @Prop({ required: true, unique: true, index: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  /** IANA timezone for shop-local boundaries and send instants. */
  @Prop({ default: 'Africa/Nairobi' })
  timezone: string;

  @Prop({ type: ReportFrequencyPreference, default: () => ({}) })
  daily: ReportFrequencyPreference;

  @Prop({ type: ReportFrequencyPreference, default: () => ({}) })
  weekly: ReportFrequencyPreference;

  @Prop({ type: ReportFrequencyPreference, default: () => ({}) })
  monthly: ReportFrequencyPreference;

  /**
   * Verified recipient user IDs (owner/authorised admins). Empty → the shop
   * owner (ownerId) is the sole recipient. Every recipient must belong to
   * this shop and hold an admin role.
   */
  @Prop({ type: [Types.ObjectId], default: [] })
  recipientUserIds: Types.ObjectId[];

  /** Master pause switch (resume clears it). */
  @Prop({ default: false })
  paused: boolean;

  /** Set when the owner unsubscribes from ALL optional reports. */
  @Prop({ required: false })
  unsubscribedAt?: Date;

  /** Optional free-text reason captured on unsubscribe. */
  @Prop({ required: false })
  unsubscribeReason?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export type ReportPreferencesDocument = HydratedDocument<ReportPreferences>;

export const ReportPreferencesSchema =
  SchemaFactory.createForClass(ReportPreferences);

ReportPreferencesSchema.index({ shopId: 1 }, { unique: true });
