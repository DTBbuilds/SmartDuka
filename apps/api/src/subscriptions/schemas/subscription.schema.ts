import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SubscriptionDocument = HydratedDocument<Subscription>;

export enum SubscriptionStatus {
  PENDING_PAYMENT = 'pending_payment', // Awaiting initial payment
  TRIAL = 'trial',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum BillingCycle {
  DAILY = 'daily',
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
}

/**
 * Subscription Schema
 * 
 * Tracks individual shop subscriptions to SmartDuka POS
 * Supports M-Pesa billing for Kenyan market
 */
@Schema({ timestamps: true })
export class Subscription {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop', unique: true })
  shopId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'SubscriptionPlan' })
  planId: Types.ObjectId;

  @Prop({ required: true })
  planCode: string; // 'starter', 'basic', 'silver', 'gold'

  @Prop({ required: true, enum: BillingCycle, default: BillingCycle.MONTHLY })
  billingCycle: BillingCycle;

  @Prop({ required: true, enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL })
  status: SubscriptionStatus;

  // Billing dates
  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  currentPeriodStart: Date;

  @Prop({ required: true })
  currentPeriodEnd: Date;

  @Prop({ required: false })
  nextBillingDate?: Date;

  @Prop({ required: false })
  cancelledAt?: Date;

  @Prop({ required: false })
  cancelReason?: string;

  // Trial period
  @Prop({ default: false })
  isTrialUsed: boolean;

  @Prop({ required: false })
  trialEndDate?: Date;

  // Pricing (snapshot at subscription time)
  @Prop({ required: true })
  currentPrice: number; // Current billing amount in KES

  @Prop({ required: false })
  setupPaid?: boolean;

  @Prop({ required: false })
  setupPaidAt?: Date;

  @Prop({ required: false })
  setupAmount?: number;

  // Payment tracking
  @Prop({ default: 0 })
  failedPaymentAttempts: number;

  @Prop({ required: false })
  lastPaymentDate?: Date;

  @Prop({ required: false })
  lastPaymentAmount?: number;

  @Prop({ required: false })
  lastPaymentMethod?: string; // 'mpesa', 'card', 'bank'

  @Prop({ required: false })
  lastPaymentReference?: string; // M-Pesa receipt number

  // Grace period tracking
  @Prop({ required: false })
  gracePeriodEndDate?: Date;

  // Usage tracking (for limit enforcement)
  @Prop({ default: 0 })
  currentShopCount: number;

  @Prop({ default: 0 })
  currentEmployeeCount: number;

  @Prop({ default: 0 })
  currentProductCount: number;

  // Discount/Promo codes
  @Prop({ required: false })
  promoCode?: string;

  @Prop({ required: false })
  discountPercentage?: number;

  @Prop({ required: false })
  discountEndDate?: Date;

  // Auto-renewal
  @Prop({ default: true })
  autoRenew: boolean;

  // Notification preferences
  @Prop({ type: Object, default: {} })
  notifications: {
    emailReminders?: boolean;
    smsReminders?: boolean;
    reminderDaysBefore?: number; // Days before expiry to send reminder
    lastReminderSent?: Date;
  };

  // For daily billing - number of days purchased
  @Prop({ required: false })
  numberOfDays?: number;

  // Pending upgrade (awaiting payment)
  @Prop({ type: Object, required: false })
  pendingUpgrade?: {
    planCode: string;
    planId: string;
    billingCycle: string;
    price: number;
    invoiceId?: string;
    requestedAt: Date;
    expiresAt?: Date; // Pending upgrade expires after 24 hours
  };

  // Metadata
  @Prop({ type: Object, default: {} })
  metadata: {
    upgradedFrom?: string; // Previous plan code
    upgradedAt?: Date;
    downgradedFrom?: string;
    downgradedAt?: Date;
    notes?: string;
    cancellationSchedule?: {
      cancelledAt: Date;
      periodEnd: Date;
      dataArchiveDate: Date;
      dataDeletionDate: Date;
      reason?: string;
      deleteAccountRequested: boolean;
    };
    accountDeletionRequest?: {
      requestedAt: Date;
      requestedBy: string;
      scheduledDeletionDate: Date;
      confirmed: boolean;
    };
  };

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

// Indexes
// Note: shopId already has unique index from @Prop({ unique: true })
SubscriptionSchema.index({ planId: 1 });
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ currentPeriodEnd: 1 });
SubscriptionSchema.index({ nextBillingDate: 1 });
SubscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });
