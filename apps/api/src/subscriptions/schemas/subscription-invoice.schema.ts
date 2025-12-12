import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SubscriptionInvoiceDocument = HydratedDocument<SubscriptionInvoice>;

export enum InvoiceStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PENDING_VERIFICATION = 'pending_verification', // Manual payment submitted, awaiting admin verification
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum InvoiceType {
  SETUP = 'setup',
  SUBSCRIPTION = 'subscription',
  UPGRADE = 'upgrade',
  ADDON = 'addon',
}

/**
 * Subscription Invoice Schema
 * 
 * Tracks all billing invoices for subscriptions
 * Supports M-Pesa payment tracking for Kenyan market
 */
@Schema({ timestamps: true })
export class SubscriptionInvoice {
  @Prop({ required: true, unique: true })
  invoiceNumber: string; // INV-2024-00001

  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Subscription' })
  subscriptionId: Types.ObjectId;

  @Prop({ required: true, enum: InvoiceType })
  type: InvoiceType;

  @Prop({ required: true, enum: InvoiceStatus, default: InvoiceStatus.PENDING })
  status: InvoiceStatus;

  // Invoice details
  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  amount: number; // Amount in KES

  @Prop({ default: 0 })
  discount: number; // Discount amount in KES

  @Prop({ default: 0 })
  tax: number; // Tax amount in KES (VAT 16% in Kenya)

  @Prop({ required: true })
  totalAmount: number; // Final amount after discount and tax

  @Prop({ required: true })
  currency: string; // 'KES'

  // Billing period
  @Prop({ required: false })
  periodStart?: Date;

  @Prop({ required: false })
  periodEnd?: Date;

  // Due date
  @Prop({ required: true })
  dueDate: Date;

  @Prop({ required: false })
  paidAt?: Date;

  // Payment details
  @Prop({ required: false })
  paymentMethod?: string; // 'mpesa', 'card', 'bank', 'stripe'

  @Prop({ required: false })
  paymentReference?: string; // M-Pesa receipt number

  @Prop({ required: false })
  mpesaTransactionId?: string;

  @Prop({ required: false })
  mpesaReceiptNumber?: string;

  @Prop({ required: false })
  mpesaPhoneNumber?: string;

  // Line items (for detailed invoices)
  @Prop({ type: [Object], default: [] })
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;

  // Retry tracking
  @Prop({ default: 0 })
  paymentAttempts: number;

  @Prop({ required: false })
  lastPaymentAttempt?: Date;

  @Prop({ required: false })
  lastPaymentError?: string;

  // Reminder tracking
  @Prop({ default: 0 })
  remindersSent: number;

  @Prop({ required: false })
  lastReminderSent?: Date;

  // Notes
  @Prop({ required: false })
  notes?: string;

  // Manual payment tracking
  @Prop({ type: Object, required: false })
  manualPayment?: {
    receiptNumber?: string;
    submittedAt?: Date;
    pendingVerification?: boolean;
    verifiedAt?: Date;
    verifiedBy?: string;
    rejectedAt?: Date;
    rejectionReason?: string;
  };

  // STK payment tracking
  @Prop({ type: Object, required: false })
  stkPayment?: {
    merchantRequestId?: string;
    checkoutRequestId?: string;
    receiptNumber?: string;
    amount?: number;
    transactionDate?: string;
    completedAt?: Date;
  };

  // Payment attempt tracking for STK
  @Prop({ type: Object, required: false })
  paymentAttempt?: {
    checkoutRequestId?: string;
    merchantRequestId?: string;
    initiatedAt?: Date;
    failed?: boolean;
    failedAt?: Date;
    failureReason?: string;
  };

  // Stripe payment tracking
  @Prop({ type: Object, required: false })
  stripePayment?: {
    paymentIntentId?: string;
    chargeId?: string;
    customerId?: string;
    receiptUrl?: string;
    amount?: number;
    currency?: string;
    status?: string;
    completedAt?: Date;
  };

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const SubscriptionInvoiceSchema = SchemaFactory.createForClass(SubscriptionInvoice);

// Indexes
// Note: invoiceNumber already has unique index from @Prop({ unique: true })
SubscriptionInvoiceSchema.index({ shopId: 1 });
SubscriptionInvoiceSchema.index({ subscriptionId: 1 });
SubscriptionInvoiceSchema.index({ status: 1 });
SubscriptionInvoiceSchema.index({ dueDate: 1 });
SubscriptionInvoiceSchema.index({ shopId: 1, status: 1 });
SubscriptionInvoiceSchema.index({ createdAt: -1 });
