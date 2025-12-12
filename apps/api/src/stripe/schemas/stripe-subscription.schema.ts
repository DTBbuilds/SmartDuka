import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StripeSubscriptionDocument = HydratedDocument<StripeSubscription>;

/**
 * Stripe Subscription Status
 */
export enum StripeSubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
  PAUSED = 'paused',
}

/**
 * Stripe Subscription Schema
 * 
 * Syncs Stripe subscriptions with local database for SmartDuka plans.
 * Enables real-time subscription status tracking and billing management.
 */
@Schema({ timestamps: true })
export class StripeSubscription {
  @Prop({ required: true, unique: true })
  stripeSubscriptionId: string;

  @Prop({ required: true })
  stripeCustomerId: string;

  @Prop({ required: false })
  stripePriceId?: string;

  @Prop({ required: false })
  stripeProductId?: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ required: false, type: Types.ObjectId, ref: 'Subscription' })
  localSubscriptionId?: Types.ObjectId; // Link to existing subscription system

  @Prop({ required: true, enum: StripeSubscriptionStatus })
  status: StripeSubscriptionStatus;

  @Prop({ required: false })
  planCode?: string; // starter, basic, silver, gold

  @Prop({ required: true })
  currentPeriodStart: Date;

  @Prop({ required: true })
  currentPeriodEnd: Date;

  @Prop({ required: false })
  cancelAt?: Date;

  @Prop({ required: false })
  canceledAt?: Date;

  @Prop({ required: false })
  cancelAtPeriodEnd?: boolean;

  @Prop({ required: false })
  trialStart?: Date;

  @Prop({ required: false })
  trialEnd?: Date;

  @Prop({ required: true })
  amount: number; // Amount per billing period

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true })
  interval: 'day' | 'week' | 'month' | 'year';

  @Prop({ default: 1 })
  intervalCount: number;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, string>;

  @Prop({ required: false })
  latestInvoiceId?: string;

  @Prop({ required: false })
  defaultPaymentMethodId?: string;

  @Prop({ type: [Object], default: [] })
  items: Array<{
    priceId: string;
    productId: string;
    quantity: number;
  }>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const StripeSubscriptionSchema = SchemaFactory.createForClass(StripeSubscription);

// Indexes
StripeSubscriptionSchema.index({ stripeSubscriptionId: 1 }, { unique: true });
StripeSubscriptionSchema.index({ stripeCustomerId: 1 });
StripeSubscriptionSchema.index({ shopId: 1 });
StripeSubscriptionSchema.index({ localSubscriptionId: 1 });
StripeSubscriptionSchema.index({ status: 1 });
StripeSubscriptionSchema.index({ currentPeriodEnd: 1 });
