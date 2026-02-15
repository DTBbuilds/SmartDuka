import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MpesaTransactionDocument = HydratedDocument<MpesaTransaction>;

/**
 * M-Pesa Transaction Status Enum
 * Implements a state machine for payment lifecycle
 */
export enum MpesaTransactionStatus {
  CREATED = 'created',     // Initial state - transaction record created
  PENDING = 'pending',     // STK push sent, waiting for user action
  COMPLETED = 'completed', // Payment successful
  FAILED = 'failed',       // Payment failed (user cancelled, insufficient funds, etc.)
  EXPIRED = 'expired',     // Transaction timed out
  REVERSED = 'reversed',   // Payment was reversed/refunded
}

/**
 * M-Pesa Result Codes from Safaricom
 */
export enum MpesaResultCode {
  SUCCESS = 0,
  INSUFFICIENT_BALANCE = 1,
  LESS_THAN_MIN = 2,
  MORE_THAN_MAX = 3,
  DAILY_LIMIT_EXCEEDED = 4,
  INVALID_AMOUNT = 5,
  INVALID_ACCOUNT = 6,
  INVALID_PARTY_A = 7,
  INVALID_PARTY_B = 8,
  DUPLICATE_REQUEST = 9,
  INVALID_INITIATOR = 10,
  INVALID_SECURITY_CREDENTIAL = 11,
  INVALID_SHORTCODE = 12,
  SYSTEM_BUSY = 17,
  REQUEST_CANCELLED = 1032,
  DS_TIMEOUT = 1037,
  WRONG_PIN = 2001,
}

@Schema({ timestamps: true, collection: 'mpesa_transactions' })
export class MpesaTransaction {
  // ============================================
  // MULTI-TENANT ISOLATION
  // ============================================
  
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  @Prop({ required: false, type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  // ============================================
  // ORDER REFERENCE
  // ============================================

  @Prop({ required: true, type: Types.ObjectId, ref: 'Order' })
  orderId: Types.ObjectId;

  @Prop({ required: true })
  orderNumber: string;

  // ============================================
  // IDEMPOTENCY
  // ============================================

  /**
   * Unique idempotency key to prevent duplicate transactions
   * Format: {shopId}-{orderId}-{timestamp}
   */
  @Prop({ required: true, unique: true })
  idempotencyKey: string;

  // ============================================
  // M-PESA IDENTIFIERS
  // ============================================

  /**
   * Checkout Request ID from M-Pesa STK Push response
   * Used to query transaction status
   */
  @Prop({ required: false })
  checkoutRequestId?: string;

  /**
   * Merchant Request ID from M-Pesa STK Push response
   */
  @Prop({ required: false })
  merchantRequestId?: string;

  /**
   * M-Pesa Receipt Number (confirmation code)
   * Only populated on successful payment
   */
  @Prop({ required: false })
  mpesaReceiptNumber?: string;

  /**
   * M-Pesa Transaction ID
   */
  @Prop({ required: false })
  mpesaTransactionId?: string;

  // ============================================
  // TRANSACTION DETAILS
  // ============================================

  /**
   * Customer phone number in format 254XXXXXXXXX
   */
  @Prop({ required: true })
  phoneNumber: string;

  /**
   * Payment amount in KES
   */
  @Prop({ required: true, min: 1, max: 150000 })
  amount: number;

  /**
   * Account reference sent to M-Pesa
   * Format: SHOP-{shopId}-ORD-{orderNumber}
   */
  @Prop({ required: true })
  accountReference: string;

  /**
   * Transaction description
   */
  @Prop({ required: false })
  transactionDesc?: string;

  // ============================================
  // STATE MACHINE
  // ============================================

  /**
   * Current transaction status
   */
  @Prop({
    required: true,
    enum: MpesaTransactionStatus,
    default: MpesaTransactionStatus.CREATED,
  })
  status: MpesaTransactionStatus;

  /**
   * Previous status (for audit trail)
   */
  @Prop({ required: false, enum: MpesaTransactionStatus })
  previousStatus?: MpesaTransactionStatus;

  // ============================================
  // M-PESA RESPONSE
  // ============================================

  /**
   * Result code from M-Pesa callback
   */
  @Prop({ required: false })
  mpesaResultCode?: number;

  /**
   * Result description from M-Pesa callback
   */
  @Prop({ required: false })
  mpesaResultDesc?: string;

  /**
   * Raw callback payload for debugging
   */
  @Prop({ required: false, type: Object })
  callbackPayload?: Record<string, any>;

  // ============================================
  // TIMING
  // ============================================

  /**
   * When the transaction expires (5 minutes from creation)
   */
  @Prop({ required: true })
  expiresAt: Date;

  /**
   * When the STK push was sent
   */
  @Prop({ required: false })
  stkPushSentAt?: Date;

  /**
   * When the callback was received
   */
  @Prop({ required: false })
  callbackReceivedAt?: Date;

  /**
   * When the transaction was completed
   */
  @Prop({ required: false })
  completedAt?: Date;

  // ============================================
  // RETRY HANDLING
  // ============================================

  /**
   * Number of retry attempts
   */
  @Prop({ default: 0 })
  retryCount: number;

  /**
   * Maximum allowed retries
   */
  @Prop({ default: 3 })
  maxRetries: number;

  /**
   * Last retry timestamp
   */
  @Prop({ required: false })
  lastRetryAt?: Date;

  /**
   * Error message from last failed attempt
   */
  @Prop({ required: false })
  lastError?: string;

  /**
   * Error category for analytics
   */
  @Prop({ required: false })
  errorCategory?: string;

  // ============================================
  // POLLING & RECOVERY
  // ============================================

  /**
   * Number of status query attempts
   */
  @Prop({ default: 0 })
  queryCount: number;

  /**
   * Last status query timestamp
   */
  @Prop({ required: false })
  lastQueryAt?: Date;

  /**
   * Whether transaction was recovered via status query
   */
  @Prop({ default: false })
  recoveredViaQuery: boolean;

  /**
   * Whether callback was received
   */
  @Prop({ default: false })
  callbackReceived: boolean;

  // ============================================
  // TIMING METRICS
  // ============================================

  /**
   * Time from STK push to callback (milliseconds)
   */
  @Prop({ required: false })
  responseTimeMs?: number;

  /**
   * Time from creation to completion (milliseconds)
   */
  @Prop({ required: false })
  totalTimeMs?: number;

  /**
   * Estimated time user took to enter PIN (milliseconds)
   */
  @Prop({ required: false })
  userInputTimeMs?: number;

  // ============================================
  // CASHIER INFO
  // ============================================

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  cashierId: Types.ObjectId;

  @Prop({ required: true })
  cashierName: string;

  // ============================================
  // CUSTOMER INFO
  // ============================================

  @Prop({ required: false })
  customerName?: string;

  // ============================================
  // METADATA
  // ============================================

  /**
   * Additional metadata for extensibility
   */
  @Prop({ type: Object })
  metadata?: Record<string, any>;

  // ============================================
  // TIMESTAMPS (auto-managed)
  // ============================================

  createdAt?: Date;
  updatedAt?: Date;
}

export const MpesaTransactionSchema = SchemaFactory.createForClass(MpesaTransaction);

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================
// Note: Single-field indexes are defined in @Prop decorators above.
// Only compound indexes are defined here to avoid duplicates.

// Compound index for shop + status queries (for filtering by shop and status)
MpesaTransactionSchema.index({ shopId: 1, status: 1 });

// Compound index for shop + date range queries (for analytics)
MpesaTransactionSchema.index({ shopId: 1, createdAt: -1 });

// Compound index for finding pending transactions to expire
MpesaTransactionSchema.index({ status: 1, expiresAt: 1 });

// Index for order lookup
MpesaTransactionSchema.index({ orderId: 1 });

// Index for callback lookup by checkoutRequestId
MpesaTransactionSchema.index({ checkoutRequestId: 1 });

// Index for receipt number lookup
MpesaTransactionSchema.index({ mpesaReceiptNumber: 1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

MpesaTransactionSchema.virtual('isExpired').get(function () {
  return this.expiresAt && new Date() > this.expiresAt;
});

MpesaTransactionSchema.virtual('canRetry').get(function () {
  return (
    this.status === MpesaTransactionStatus.FAILED &&
    this.retryCount < this.maxRetries
  );
});

MpesaTransactionSchema.virtual('timeRemaining').get(function () {
  if (!this.expiresAt) return 0;
  const remaining = this.expiresAt.getTime() - Date.now();
  return Math.max(0, Math.floor(remaining / 1000));
});

// ============================================
// METHODS
// ============================================

MpesaTransactionSchema.methods.canTransitionTo = function (
  newStatus: MpesaTransactionStatus,
): boolean {
  const validTransitions: Record<MpesaTransactionStatus, MpesaTransactionStatus[]> = {
    [MpesaTransactionStatus.CREATED]: [
      MpesaTransactionStatus.PENDING,
      MpesaTransactionStatus.FAILED,
    ],
    [MpesaTransactionStatus.PENDING]: [
      MpesaTransactionStatus.COMPLETED,
      MpesaTransactionStatus.FAILED,
      MpesaTransactionStatus.EXPIRED,
    ],
    [MpesaTransactionStatus.COMPLETED]: [
      MpesaTransactionStatus.REVERSED,
    ],
    [MpesaTransactionStatus.FAILED]: [
      MpesaTransactionStatus.PENDING, // Retry
    ],
    [MpesaTransactionStatus.EXPIRED]: [],
    [MpesaTransactionStatus.REVERSED]: [],
  };

  return validTransitions[this.status]?.includes(newStatus) ?? false;
};

// Enable virtuals in JSON output
MpesaTransactionSchema.set('toJSON', { virtuals: true });
MpesaTransactionSchema.set('toObject', { virtuals: true });
