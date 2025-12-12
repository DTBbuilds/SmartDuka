import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PaymentAttemptDocument = HydratedDocument<PaymentAttempt>;

/**
 * Payment Method Types
 */
export enum PaymentMethod {
  MPESA_STK = 'mpesa_stk',
  MPESA_MANUAL = 'mpesa_manual',
  STRIPE_CARD = 'stripe_card',
  STRIPE_LINK = 'stripe_link',
  BANK_TRANSFER = 'bank_transfer',
}

/**
 * Payment Attempt Status
 */
export enum PaymentAttemptStatus {
  INITIATED = 'initiated',
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

/**
 * Payment Attempt Type
 */
export enum PaymentAttemptType {
  SUBSCRIPTION = 'subscription',
  UPGRADE = 'upgrade',
  RENEWAL = 'renewal',
  INVOICE = 'invoice',
}

/**
 * Payment Attempt Schema
 * 
 * Tracks all payment attempts for subscriptions.
 * Super admin can view all attempts across all shops.
 */
@Schema({ timestamps: true, collection: 'payment_attempts' })
export class PaymentAttempt {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop', index: true })
  shopId: Types.ObjectId;

  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ required: false })
  userEmail?: string;

  @Prop({ required: false })
  shopName?: string;

  @Prop({ required: true, enum: PaymentMethod, index: true })
  method: PaymentMethod;

  @Prop({ required: true, enum: PaymentAttemptType, index: true })
  type: PaymentAttemptType;

  @Prop({ required: true, enum: PaymentAttemptStatus, default: PaymentAttemptStatus.INITIATED, index: true })
  status: PaymentAttemptStatus;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, default: 'KES' })
  currency: string;

  @Prop({ required: false })
  planCode?: string;

  @Prop({ required: false })
  billingCycle?: string;

  @Prop({ required: false })
  invoiceId?: string;

  @Prop({ required: false })
  invoiceNumber?: string;

  // M-Pesa specific fields
  @Prop({ required: false })
  phoneNumber?: string;

  @Prop({ required: false })
  checkoutRequestId?: string;

  @Prop({ required: false })
  merchantRequestId?: string;

  @Prop({ required: false })
  mpesaReceiptNumber?: string;

  // Stripe specific fields
  @Prop({ required: false })
  paymentIntentId?: string;

  @Prop({ required: false })
  clientSecret?: string;

  // Error tracking
  @Prop({ required: false })
  errorCode?: string;

  @Prop({ required: false })
  errorMessage?: string;

  // Timestamps
  @Prop({ required: false })
  initiatedAt?: Date;

  @Prop({ required: false })
  completedAt?: Date;

  // Request metadata
  @Prop({ type: Object, default: {} })
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    source?: string;
    callbackReceived?: boolean;
    callbackData?: any;
    [key: string]: any;
  };

  // Auto timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const PaymentAttemptSchema = SchemaFactory.createForClass(PaymentAttempt);

// Indexes for efficient querying
PaymentAttemptSchema.index({ createdAt: -1 });
PaymentAttemptSchema.index({ status: 1, createdAt: -1 });
PaymentAttemptSchema.index({ method: 1, status: 1 });
PaymentAttemptSchema.index({ shopId: 1, createdAt: -1 });
PaymentAttemptSchema.index({ checkoutRequestId: 1 });
PaymentAttemptSchema.index({ paymentIntentId: 1 });
