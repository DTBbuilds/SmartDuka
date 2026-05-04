import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ShopDocument = HydratedDocument<Shop>;

@Schema({ timestamps: true })
export class Shop {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, unique: true, trim: true })
  phone: string;

  @Prop({ required: true, unique: true, trim: true, index: true })
  shopId: string;  // Human-readable shop ID (e.g., SHP-00001-A7K2B)

  @Prop({ required: false, trim: true })
  address?: string;

  @Prop({ required: false, trim: true })
  county?: string;

  @Prop({ required: true, trim: true })
  city: string;

  @Prop({ required: true, trim: true })
  businessType: string;

  @Prop({ required: false, trim: true })
  country?: string;

  @Prop({ enum: ['KES', 'AUD', 'USD', 'GBP', 'EUR'], default: 'KES', trim: true })
  currency: string;

  @Prop({ required: false, trim: true })
  kraPin?: string;

  @Prop({ required: false, trim: true, maxlength: 500 })
  description?: string;

  @Prop({ required: false, trim: true })
  tillNumber?: string;

  // M-Pesa Configuration - Each shop can have their own M-Pesa credentials
  // Sensitive fields (consumerKey, consumerSecret, passkey) are encrypted using AES-256-GCM
  @Prop({ type: Object, default: {} })
  mpesaConfig?: {
    // Type: 'paybill' or 'till' (Buy Goods)
    type?: 'paybill' | 'till';
    // Paybill/Till number
    shortCode?: string;
    // For Paybill: Account number prefix (optional)
    accountPrefix?: string;
    
    // Daraja API credentials (ENCRYPTED)
    consumerKey?: string;
    consumerKeyIv?: string;  // Initialization vector for decryption
    consumerKeyTag?: string; // Auth tag for decryption
    
    consumerSecret?: string;
    consumerSecretIv?: string;
    consumerSecretTag?: string;
    
    // Passkey for STK Push (ENCRYPTED)
    passkey?: string;
    passkeyIv?: string;
    passkeyTag?: string;
    
    // Callback URL for this shop (optional - defaults to platform callback)
    callbackUrl?: string;
    // Whether M-Pesa is enabled for this shop
    enabled?: boolean;
    // Last verification date
    verifiedAt?: Date;
    // Verification status
    verificationStatus?: 'pending' | 'verified' | 'failed';
    // Last test transaction date
    lastTestedAt?: Date;
    // Test transaction result
    lastTestResult?: 'success' | 'failed';
    // Configuration updated date
    updatedAt?: Date;
  };

  /**
   * Stripe Connect Configuration (per-shop)
   *
   * Platform uses Stripe Connect (Standard accounts) so card payments land directly
   * in the shop owner's own Stripe account. The platform only stores the connected
   * account ID and cached capability flags — it NEVER holds the shop's secret key.
   *
   * Card sales must be blocked unless accountId is set and chargesEnabled === true.
   */
  @Prop({ type: Object, default: {} })
  stripeConnect?: {
    // Stripe connected account ID (e.g. "acct_1Abc..."). Absence means not connected.
    accountId?: string;
    // Account type: 'standard' (OAuth, shop has own dashboard) or 'express' (platform-branded)
    accountType?: 'standard' | 'express';
    // Capabilities flags mirrored from Stripe account object — refreshed via account.updated webhook
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    detailsSubmitted?: boolean;
    // If Stripe flags outstanding requirements, their due date (e.g. "2025-12-01")
    currentlyDueRequirements?: string[];
    pastDueRequirements?: string[];
    disabledReason?: string;
    // Cached account metadata (for UI display)
    country?: string;
    defaultCurrency?: string;
    displayName?: string;
    email?: string;
    // Connection lifecycle
    environment?: 'live' | 'test';
    connectedAt?: Date;
    disconnectedAt?: Date;
    lastSyncedAt?: Date;
    // Audit
    connectedByUserId?: Types.ObjectId;
  };

  @Prop({ enum: ['pending', 'verified', 'active', 'suspended', 'rejected', 'flagged'], default: 'pending' })
  status: 'pending' | 'verified' | 'active' | 'suspended' | 'rejected' | 'flagged';

  // Verification fields
  @Prop({ required: false, type: Types.ObjectId })
  verificationBy?: Types.ObjectId;

  @Prop({ required: false })
  verificationDate?: Date;

  @Prop({ required: false, trim: true })
  verificationNotes?: string;

  // Rejection fields
  @Prop({ required: false })
  rejectionDate?: Date;

  @Prop({ required: false, trim: true })
  rejectionReason?: string;

  // Suspension fields
  @Prop({ required: false })
  suspensionDate?: Date;

  @Prop({ required: false, trim: true })
  suspensionReason?: string;

  // Compliance fields
  @Prop({ default: 100 })
  complianceScore: number;

  @Prop({ default: 0 })
  chargebackRate: number;

  @Prop({ default: 0 })
  refundRate: number;

  @Prop({ default: 0 })
  violationCount: number;

  // Monitoring fields
  @Prop({ required: false })
  lastActivityDate?: Date;

  @Prop({ default: false })
  isMonitored: boolean;

  @Prop({ default: false })
  isFlagged: boolean;

  @Prop({ required: false, trim: true })
  flagReason?: string;

  // Support fields
  @Prop({ default: 0 })
  openTickets: number;

  @Prop({ required: false })
  lastSupportTicketDate?: Date;

  @Prop({ default: 0 })
  cashierCount: number;

  @Prop({ default: 0 })
  totalSales: number;

  @Prop({ default: 0 })
  totalOrders: number;

  // Subscription fields
  @Prop({ required: false, type: Types.ObjectId, ref: 'Subscription' })
  subscriptionId?: Types.ObjectId;

  @Prop({ required: false })
  subscriptionPlan?: string; // 'starter', 'basic', 'silver', 'gold'

  @Prop({ required: false })
  subscriptionStatus?: string; // 'trial', 'active', 'past_due', 'suspended', 'cancelled', 'expired'

  @Prop({ required: false })
  subscriptionExpiresAt?: Date;

  @Prop({ default: false })
  isSubscriptionActive: boolean;

  // Soft delete fields
  @Prop({ required: false })
  deletedAt?: Date;

  @Prop({ required: false, type: Types.ObjectId })
  deletedBy?: Types.ObjectId;

  @Prop({ required: false, trim: true })
  deletionReason?: string;
}

export const ShopSchema = SchemaFactory.createForClass(Shop);

// Create indexes for better query performance
// Note: email and phone already have indexes from @Prop({ unique: true })
ShopSchema.index({ status: 1 });
ShopSchema.index({ createdAt: -1 });
ShopSchema.index({ verificationBy: 1 });
ShopSchema.index({ isFlagged: 1 });
ShopSchema.index({ isMonitored: 1 });
ShopSchema.index({ deletedAt: 1 });
// Compound indexes for super-admin queries
ShopSchema.index({ status: 1, createdAt: -1 }); // For filtered shop lists
// email index already created by @Prop({ unique: true }) - do not duplicate
ShopSchema.index({ subscriptionStatus: 1, status: 1 }); // For subscription filtering
// Ensure kraPin is unique only when present (sparse index ignores null/undefined)
ShopSchema.index(
  { kraPin: 1 },
  {
    unique: true,
    sparse: true,
    name: 'unique_kraPin_when_present',
  },
);

// Fast lookup of shop by Stripe connected account ID (used by Connect webhooks).
// Unique+sparse so multiple shops with no stripeConnect.accountId don't collide.
ShopSchema.index(
  { 'stripeConnect.accountId': 1 },
  {
    unique: true,
    sparse: true,
    name: 'unique_stripe_connect_account',
  },
);

