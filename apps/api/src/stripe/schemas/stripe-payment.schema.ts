import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StripePaymentDocument = HydratedDocument<StripePayment>;

/**
 * Payment Status enum matching Stripe's payment intent statuses
 */
export enum StripePaymentStatus {
  REQUIRES_PAYMENT_METHOD = 'requires_payment_method',
  REQUIRES_CONFIRMATION = 'requires_confirmation',
  REQUIRES_ACTION = 'requires_action',
  PROCESSING = 'processing',
  REQUIRES_CAPTURE = 'requires_capture',
  CANCELED = 'canceled',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

/**
 * Payment Type - what the payment is for
 */
export enum StripePaymentType {
  POS_SALE = 'pos_sale',
  SUBSCRIPTION = 'subscription',
  INVOICE = 'invoice',
  ADDON = 'addon',
  SETUP_FEE = 'setup_fee',
  OTHER = 'other',
}

/**
 * Stripe Payment Schema
 * 
 * Tracks all Stripe payments with full sync to local database.
 * Supports POS sales, subscriptions, and other payment scenarios.
 */
@Schema({ timestamps: true })
export class StripePayment {
  @Prop({ required: true, unique: true })
  stripePaymentIntentId: string;

  @Prop({ required: false })
  stripeChargeId?: string;

  @Prop({ required: false })
  stripeCustomerId?: string;

  @Prop({ required: false, type: Types.ObjectId, ref: 'Shop' })
  shopId?: Types.ObjectId;

  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ required: false, type: Types.ObjectId, ref: 'Order' })
  orderId?: Types.ObjectId;

  @Prop({ required: false, type: Types.ObjectId, ref: 'SubscriptionInvoice' })
  invoiceId?: Types.ObjectId;

  @Prop({ required: true, enum: StripePaymentType })
  paymentType: StripePaymentType;

  @Prop({ required: true })
  amount: number; // Amount in smallest currency unit

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true, enum: StripePaymentStatus })
  status: StripePaymentStatus;

  @Prop({ required: false })
  paymentMethodType?: string; // card, bank_transfer, etc.

  @Prop({ required: false })
  paymentMethodId?: string;

  @Prop({ type: Object, required: false })
  paymentMethodDetails?: {
    type?: string;
    card?: {
      brand?: string;
      last4?: string;
      expMonth?: number;
      expYear?: number;
      country?: string;
    };
    bankTransfer?: {
      bankName?: string;
      accountLast4?: string;
    };
  };

  @Prop({ required: false })
  receiptUrl?: string;

  @Prop({ required: false })
  receiptEmail?: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, string>;

  @Prop({ required: false })
  failureCode?: string;

  @Prop({ required: false })
  failureMessage?: string;

  @Prop({ required: false })
  refundedAmount?: number;

  @Prop({ type: [Object], default: [] })
  refunds: Array<{
    refundId: string;
    amount: number;
    reason?: string;
    status: string;
    createdAt: Date;
  }>;

  @Prop({ required: false })
  paidAt?: Date;

  @Prop({ required: false })
  canceledAt?: Date;

  @Prop({ required: false })
  clientSecret?: string; // For frontend to complete payment

  createdAt?: Date;
  updatedAt?: Date;
}

export const StripePaymentSchema = SchemaFactory.createForClass(StripePayment);

// Indexes for efficient queries
// Note: stripePaymentIntentId index is already created by unique: true in @Prop decorator
StripePaymentSchema.index({ stripeCustomerId: 1 });
StripePaymentSchema.index({ shopId: 1 });
StripePaymentSchema.index({ userId: 1 });
StripePaymentSchema.index({ orderId: 1 });
StripePaymentSchema.index({ invoiceId: 1 });
StripePaymentSchema.index({ status: 1 });
StripePaymentSchema.index({ paymentType: 1 });
StripePaymentSchema.index({ createdAt: -1 });
StripePaymentSchema.index({ shopId: 1, status: 1, createdAt: -1 });
StripePaymentSchema.index({ shopId: 1, paymentType: 1, createdAt: -1 });
