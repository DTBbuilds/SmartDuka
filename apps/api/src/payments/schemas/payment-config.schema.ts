import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PaymentConfigDocument = HydratedDocument<PaymentConfig>;

/**
 * Payment Provider Types
 * Supports M-Pesa (Paybill/Till), Airtel Money, and future providers
 */
export enum PaymentProvider {
  MPESA_PAYBILL = 'mpesa_paybill',
  MPESA_TILL = 'mpesa_till',
  AIRTEL_MONEY = 'airtel_money',
  BANK_TRANSFER = 'bank_transfer',
  CARD = 'card',
}

/**
 * Configuration Environment
 * Allows separate sandbox and production credentials
 */
export enum ConfigEnvironment {
  SANDBOX = 'sandbox',
  PRODUCTION = 'production',
}

/**
 * Configuration Status - Lifecycle states
 */
export enum ConfigStatus {
  DRAFT = 'draft',           // Initial state, not yet verified
  PENDING = 'pending',       // Submitted for verification
  VERIFIED = 'verified',     // Credentials verified successfully
  FAILED = 'failed',         // Verification failed
  SUSPENDED = 'suspended',   // Temporarily disabled
  EXPIRED = 'expired',       // Credentials expired
  ROTATED = 'rotated',       // Replaced by new version
}

/**
 * Payment Configuration Schema
 * 
 * Supports:
 * - Multiple tills per shop
 * - Branch-level overrides
 * - Multiple providers
 * - Sandbox/Production separation
 * - Failover with priority
 * - Version history for rotation
 */
@Schema({ timestamps: true, collection: 'payment_configs' })
export class PaymentConfig {
  // ============================================
  // TENANT ASSOCIATION
  // ============================================
  
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop' })
  shopId: Types.ObjectId;

  /**
   * Optional branch-level override
   * If null, this is a shop-level config
   */
  @Prop({ required: false, type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  // ============================================
  // PROVIDER CONFIGURATION
  // ============================================

  @Prop({ required: true, enum: PaymentProvider })
  provider: PaymentProvider;

  @Prop({ required: true, enum: ConfigEnvironment, default: ConfigEnvironment.SANDBOX })
  environment: ConfigEnvironment;

  /**
   * Human-readable name for this configuration
   * e.g., "Main Store Till", "Branch A Paybill"
   */
  @Prop({ required: true, trim: true })
  name: string;

  /**
   * Unique identifier for the payment account
   * - M-Pesa: Paybill or Till number
   * - Airtel: Merchant ID
   * - Bank: Account number
   */
  @Prop({ required: true, trim: true })
  shortCode: string;

  /**
   * Account prefix for Paybill (optional)
   * Used to generate account reference
   */
  @Prop({ required: false, trim: true })
  accountPrefix?: string;

  // ============================================
  // ENCRYPTED CREDENTIALS
  // ============================================

  /**
   * Encrypted credentials object
   * All sensitive data encrypted with AES-256-GCM
   */
  @Prop({ type: Object, required: true, default: {} })
  credentials: {
    // M-Pesa credentials
    consumerKey?: string;
    consumerKeyIv?: string;
    consumerKeyTag?: string;
    
    consumerSecret?: string;
    consumerSecretIv?: string;
    consumerSecretTag?: string;
    
    passkey?: string;
    passkeyIv?: string;
    passkeyTag?: string;

    // Airtel Money credentials (future)
    clientId?: string;
    clientIdIv?: string;
    clientIdTag?: string;
    
    clientSecret?: string;
    clientSecretIv?: string;
    clientSecretTag?: string;
    
    // Generic encrypted blob for future providers
    encryptedBlob?: string;
    encryptedBlobIv?: string;
    encryptedBlobTag?: string;
  };

  // ============================================
  // CALLBACK CONFIGURATION
  // ============================================

  @Prop({ required: false, trim: true })
  callbackUrl?: string;

  @Prop({ required: false, trim: true })
  validationUrl?: string;

  @Prop({ required: false, trim: true })
  confirmationUrl?: string;

  // ============================================
  // STATUS & PRIORITY
  // ============================================

  @Prop({ required: true, enum: ConfigStatus, default: ConfigStatus.DRAFT })
  status: ConfigStatus;

  /**
   * Priority for failover (lower = higher priority)
   * Used when multiple configs exist for same provider
   */
  @Prop({ required: true, default: 0 })
  priority: number;

  /**
   * Whether this config is currently active for payments
   */
  @Prop({ required: true, default: false })
  isActive: boolean;

  /**
   * Whether this is the default config for the provider
   */
  @Prop({ required: true, default: false })
  isDefault: boolean;

  // ============================================
  // VERIFICATION
  // ============================================

  @Prop({ required: false })
  verifiedAt?: Date;

  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  verifiedBy?: Types.ObjectId;

  @Prop({ required: false })
  lastTestedAt?: Date;

  @Prop({ required: false })
  lastTestResult?: 'success' | 'failed';

  @Prop({ required: false, trim: true })
  lastTestError?: string;

  // ============================================
  // VERSIONING & ROTATION
  // ============================================

  /**
   * Version number for this configuration
   * Incremented on each credential update
   */
  @Prop({ required: true, default: 1 })
  version: number;

  /**
   * Reference to previous version (for rotation tracking)
   */
  @Prop({ required: false, type: Types.ObjectId, ref: 'PaymentConfig' })
  previousVersionId?: Types.ObjectId;

  /**
   * Scheduled rotation date (for compliance)
   */
  @Prop({ required: false })
  rotationScheduledAt?: Date;

  /**
   * When credentials expire (if applicable)
   */
  @Prop({ required: false })
  credentialsExpiresAt?: Date;

  // ============================================
  // LIMITS & THRESHOLDS
  // ============================================

  @Prop({ required: false, default: 1 })
  minAmount?: number;

  @Prop({ required: false, default: 150000 })
  maxAmount?: number;

  @Prop({ required: false })
  dailyLimit?: number;

  @Prop({ required: false })
  monthlyLimit?: number;

  // ============================================
  // USAGE TRACKING
  // ============================================

  @Prop({ default: 0 })
  totalTransactions: number;

  @Prop({ default: 0 })
  successfulTransactions: number;

  @Prop({ default: 0 })
  failedTransactions: number;

  @Prop({ required: false })
  lastUsedAt?: Date;

  // ============================================
  // METADATA
  // ============================================

  @Prop({ type: Object, default: {} })
  metadata?: {
    notes?: string;
    tags?: string[];
    externalId?: string;
    safaricomAccountName?: string;
    registeredPhone?: string;
    [key: string]: any;
  };

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  // Timestamps (auto-managed)
  createdAt?: Date;
  updatedAt?: Date;
}

export const PaymentConfigSchema = SchemaFactory.createForClass(PaymentConfig);

// ============================================
// INDEXES
// ============================================

// Unique constraint: One config per provider per environment per shop/branch with same shortCode
PaymentConfigSchema.index(
  { shopId: 1, branchId: 1, provider: 1, environment: 1, shortCode: 1 },
  { unique: true, name: 'unique_config_per_tenant' }
);

// Query optimization for runtime resolution
PaymentConfigSchema.index({ shopId: 1, provider: 1, environment: 1, isActive: 1, status: 1 });
PaymentConfigSchema.index({ shopId: 1, branchId: 1, provider: 1, isActive: 1 });

// Find configs by shortCode (for uniqueness validation)
PaymentConfigSchema.index({ shortCode: 1, provider: 1, environment: 1 });

// Find configs needing rotation
PaymentConfigSchema.index({ status: 1, rotationScheduledAt: 1 });

// Find expired credentials
PaymentConfigSchema.index({ credentialsExpiresAt: 1 });

// ============================================
// VIRTUALS
// ============================================

PaymentConfigSchema.virtual('isExpired').get(function () {
  return this.credentialsExpiresAt && new Date() > this.credentialsExpiresAt;
});

PaymentConfigSchema.virtual('needsRotation').get(function () {
  return this.rotationScheduledAt && new Date() > this.rotationScheduledAt;
});

PaymentConfigSchema.virtual('successRate').get(function () {
  if (this.totalTransactions === 0) return 0;
  return (this.successfulTransactions / this.totalTransactions) * 100;
});

PaymentConfigSchema.virtual('hasCredentials').get(function () {
  return !!(
    this.credentials?.consumerKey &&
    this.credentials?.consumerSecret &&
    this.credentials?.passkey
  );
});

// Enable virtuals in JSON output
PaymentConfigSchema.set('toJSON', { virtuals: true });
PaymentConfigSchema.set('toObject', { virtuals: true });
