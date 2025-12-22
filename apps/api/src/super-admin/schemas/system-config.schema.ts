import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SystemConfigDocument = HydratedDocument<SystemConfig>;

/**
 * System Configuration Types
 */
export enum SystemConfigType {
  MPESA = 'mpesa',
  STRIPE = 'stripe',
  EMAIL = 'email',
  SMS = 'sms',
  GENERAL = 'general',
  VAT = 'vat',
}

/**
 * System Configuration Schema
 * 
 * Stores system-wide configuration that super admin can manage.
 * This is separate from shop-specific configurations.
 * 
 * Used for:
 * - M-Pesa credentials for subscription payments
 * - Stripe credentials for card payments
 * - Email/SMS settings
 * - Other system-wide settings
 */
@Schema({ timestamps: true, collection: 'system_configs' })
export class SystemConfig {
  @Prop({ required: true, enum: SystemConfigType, unique: true, index: true })
  type: SystemConfigType;

  @Prop({ required: true, default: 'System Configuration' })
  name: string;

  @Prop({ required: false })
  description?: string;

  /**
   * Whether this configuration is active
   */
  @Prop({ required: true, default: false })
  isActive: boolean;

  /**
   * Environment: sandbox or production
   */
  @Prop({ required: true, default: 'sandbox' })
  environment: 'sandbox' | 'production';

  /**
   * Encrypted configuration data
   * Structure depends on the config type
   */
  @Prop({ type: Object, required: true, default: {} })
  config: {
    // M-Pesa configuration
    consumerKey?: string;
    consumerKeyIv?: string;
    consumerKeyTag?: string;
    
    consumerSecret?: string;
    consumerSecretIv?: string;
    consumerSecretTag?: string;
    
    passkey?: string;
    passkeyIv?: string;
    passkeyTag?: string;
    
    shortCode?: string;
    callbackUrl?: string;
    
    // Stripe configuration
    secretKey?: string;
    secretKeyIv?: string;
    secretKeyTag?: string;
    
    publishableKey?: string;
    webhookSecret?: string;
    webhookSecretIv?: string;
    webhookSecretTag?: string;
    
    // Email configuration
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    smtpPassIv?: string;
    smtpPassTag?: string;
    smtpFrom?: string;
    
    // VAT configuration
    vatEnabled?: boolean;        // Master toggle for VAT on subscription payments
    vatRate?: number;            // VAT rate (default 0.16 = 16%)
    vatName?: string;            // Display name (default "VAT")
    vatDescription?: string;     // Description for invoices
    
    // Generic key-value for other settings
    [key: string]: any;
  };

  /**
   * Last verification/test result
   */
  @Prop({ required: false })
  lastTestedAt?: Date;

  @Prop({ required: false })
  lastTestResult?: 'success' | 'failed';

  @Prop({ required: false })
  lastTestError?: string;

  /**
   * Audit trail
   */
  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  @Prop({ required: false })
  updatedByEmail?: string;

  // Timestamps (auto-managed)
  createdAt?: Date;
  updatedAt?: Date;
}

export const SystemConfigSchema = SchemaFactory.createForClass(SystemConfig);

// Indexes
SystemConfigSchema.index({ type: 1 }, { unique: true });
SystemConfigSchema.index({ isActive: 1 });
