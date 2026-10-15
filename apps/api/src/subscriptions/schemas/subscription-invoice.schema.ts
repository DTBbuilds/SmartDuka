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

  // Email tracking
  @Prop({ default: false })
  emailSent: boolean;

  @Prop({ required: false })
  emailSentAt?: Date;

  @Prop({ default: 0 })
  emailSentCount: number;

  @Prop({ required: false })
  lastEmailError?: string;

  // Manual payment tracking
  @Prop({ type: Object, required: false })
  manualPayment?: {
    receiptNumber?: string;
    senderPhoneNumber?: string; // Phone number used for Send Money payment
    paidAmount?: number; // Amount paid by sender
    submittedAt?: Date;
    pendingVerification?: boolean;
    verifiedAt?: Date;
    verifiedBy?: string;
    verificationNotes?: string;
    rejectedAt?: Date;
    rejectionReason?: string;
  };

  // STK payment tracking
  @Prop({ type: Object, required: false })
  stkPayment?: {
    merchantRequestId?: string;
    checkoutRequestId?: string;
    receiptNumber?: string;
    // P0-11C2 provenance: receipt supplied by an unsigned callback (never
    // verified receipt evidence); 'callback'/'requested' distinguish
    // reported vs requested amount; providerVerified records that the
    // checkout OUTCOME was confirmed server-to-provider.
    receiptSource?: 'callback';
    amountSource?: 'callback' | 'requested';
    providerVerified?: boolean;
    amount?: number;
    transactionDate?: string;
    completedAt?: Date;
  };

  // Payment attempt tracking for STK
  @Prop({ type: Object, required: false })
  paymentAttempt?: {
    checkoutRequestId?: string;
    merchantRequestId?: string;
    phoneNumber?: string;
    initiatedAt?: Date;
    sandboxScenario?: string; // For sandbox simulation (success, user_cancelled, timeout, etc.)
    failed?: boolean;
    failedAt?: Date;
    failureReason?: string;
    // P0-11C1: callback trust evidence — the callback is a signal only;
    // provider reconciliation is the truth boundary.
    callbackReceived?: Date;
    providerVerified?: boolean;
    amountMismatch?: boolean;
    providerAmount?: number;
    mismatchAt?: Date;
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

  // P0-11C: durable card-charge attempt claim. Exactly one 'active' attempt
  // may exist; its deterministic idempotencyKey gives Stripe a stable retry
  // identity so retries/crashes never mint a second chargeable intent.
  @Prop({ type: Object, required: false })
  stripeAttempt?: {
    seq?: number;
    idempotencyKey?: string;
    paymentIntentId?: string;
    status?: 'active' | 'succeeded' | 'failed' | 'cancelled';
    claimedAt?: Date;
    boundAt?: Date;
    releasedAt?: Date;
    releaseReason?: string;
    settledAt?: Date;
  };

  // P0-11C1: durable billing-effect marker. 'pending' is written atomically
  // with the PAID transition; 'applied' is written ONLY after subscription
  // effects are durable. A paid invoice with status !== 'applied' remains
  // eligible for effect reconciliation — a crash can never permanently lose
  // the entitlement, and retries can never duplicate it.
  @Prop({ type: Object, required: false })
  billingEffects?: {
    status?: 'pending' | 'applied' | 'failed';
    channel?: string;
    appliedAt?: Date;
    attempts?: number;
    lastError?: string;
    // P0-11C2: reconciliation-worker lease — set when a worker claims the
    // record; a stale lease expires so crashed workers never wedge it.
    recoveringAt?: Date;
  };

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const SubscriptionInvoiceSchema =
  SchemaFactory.createForClass(SubscriptionInvoice);

// Indexes
// Note: invoiceNumber already has unique index from @Prop({ unique: true })
SubscriptionInvoiceSchema.index({ shopId: 1 });
SubscriptionInvoiceSchema.index({ subscriptionId: 1 });
SubscriptionInvoiceSchema.index({ status: 1 });
SubscriptionInvoiceSchema.index({ dueDate: 1 });
SubscriptionInvoiceSchema.index({ shopId: 1, status: 1 });
SubscriptionInvoiceSchema.index({ createdAt: -1 });
// Compound indexes for super-admin queries
SubscriptionInvoiceSchema.index({ status: 1, updatedAt: -1 }); // For pending verifications
SubscriptionInvoiceSchema.index({ status: 1, paidAt: -1 }); // For payment reports
SubscriptionInvoiceSchema.index({ type: 1, status: 1 }); // For upgrade invoices
