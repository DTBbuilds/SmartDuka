import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VerificationLogDocument = HydratedDocument<VerificationLog>;

/**
 * Types of verification operations
 */
export enum VerificationType {
  CREDENTIAL_TEST = 'credential_test',     // Test OAuth token generation
  OAUTH_TOKEN = 'oauth_token',             // OAuth token request
  STK_PUSH_TEST = 'stk_push_test',         // Test STK push (sandbox)
  CALLBACK_TEST = 'callback_test',         // Test callback URL
  BALANCE_CHECK = 'balance_check',         // Check account balance
  ACCOUNT_VALIDATION = 'account_validation', // Validate account exists
}

/**
 * Verification result outcomes
 */
export enum VerificationResult {
  SUCCESS = 'success',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  ERROR = 'error',
  PENDING = 'pending',
}

/**
 * Verification Log Schema
 * 
 * Tracks all verification attempts for payment configurations.
 * Used for:
 * - Audit trail of credential testing
 * - Debugging failed verifications
 * - Compliance reporting
 */
@Schema({ timestamps: true, collection: 'verification_logs' })
export class VerificationLog {
  @Prop({ required: true, type: Types.ObjectId, ref: 'PaymentConfig', index: true })
  configId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop', index: true })
  shopId: Types.ObjectId;

  @Prop({ required: false, type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  @Prop({ required: true, enum: VerificationType })
  type: VerificationType;

  @Prop({ required: true, enum: VerificationResult, default: VerificationResult.PENDING })
  result: VerificationResult;

  /**
   * Provider-specific response code
   * e.g., M-Pesa response code
   */
  @Prop({ required: false })
  responseCode?: string;

  /**
   * Human-readable response message
   */
  @Prop({ required: false })
  responseMessage?: string;

  /**
   * Detailed error information (if failed)
   */
  @Prop({ required: false })
  errorDetails?: string;

  /**
   * Stack trace for debugging (if error)
   */
  @Prop({ required: false })
  stackTrace?: string;

  /**
   * Time taken for the verification (in milliseconds)
   */
  @Prop({ required: false })
  durationMs?: number;

  /**
   * Request payload sent (sensitive data masked)
   */
  @Prop({ required: false, type: Object })
  requestPayload?: Record<string, any>;

  /**
   * Response payload received (sensitive data masked)
   */
  @Prop({ required: false, type: Object })
  responsePayload?: Record<string, any>;

  /**
   * User who initiated the verification
   */
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  initiatedBy: Types.ObjectId;

  /**
   * IP address of the request
   */
  @Prop({ required: false })
  ipAddress?: string;

  /**
   * User agent string
   */
  @Prop({ required: false })
  userAgent?: string;

  /**
   * Environment where verification was performed
   */
  @Prop({ required: false })
  environment?: 'sandbox' | 'production';

  /**
   * Provider being verified
   */
  @Prop({ required: false })
  provider?: string;

  /**
   * Short code being verified
   */
  @Prop({ required: false })
  shortCode?: string;

  // Timestamp (auto-managed)
  createdAt?: Date;
}

export const VerificationLogSchema = SchemaFactory.createForClass(VerificationLog);

// ============================================
// INDEXES
// ============================================

// Query by config
VerificationLogSchema.index({ configId: 1, createdAt: -1 });

// Query by shop and type
VerificationLogSchema.index({ shopId: 1, type: 1, createdAt: -1 });

// Query by result for analytics
VerificationLogSchema.index({ result: 1, createdAt: -1 });

// Query by user for audit
VerificationLogSchema.index({ initiatedBy: 1, createdAt: -1 });

// TTL index - auto-delete logs older than 1 year (optional)
// VerificationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });
