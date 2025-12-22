import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BranchDocument = Branch & Document;

/**
 * Branch-specific payment configuration
 * Allows each branch to have its own M-Pesa Till/Paybill
 */
export class BranchPaymentConfig {
  @Prop({ required: false })
  enabled?: boolean;

  @Prop({ required: false })
  useShopConfig?: boolean; // If true, use shop's payment config instead

  // Reference to PaymentConfig document (new system)
  @Prop({ required: false, type: Types.ObjectId, ref: 'PaymentConfig' })
  paymentConfigId?: Types.ObjectId;

  // Legacy embedded config (for backward compatibility)
  @Prop({ required: false, enum: ['paybill', 'till'] })
  type?: 'paybill' | 'till';

  @Prop({ required: false })
  shortCode?: string;

  @Prop({ required: false })
  accountPrefix?: string;

  // Encrypted credentials (if branch has its own)
  @Prop({ required: false })
  consumerKey?: string;
  @Prop({ required: false })
  consumerKeyIv?: string;
  @Prop({ required: false })
  consumerKeyTag?: string;

  @Prop({ required: false })
  consumerSecret?: string;
  @Prop({ required: false })
  consumerSecretIv?: string;
  @Prop({ required: false })
  consumerSecretTag?: string;

  @Prop({ required: false })
  passkey?: string;
  @Prop({ required: false })
  passkeyIv?: string;
  @Prop({ required: false })
  passkeyTag?: string;

  @Prop({ required: false })
  callbackUrl?: string;

  @Prop({ required: false, enum: ['pending', 'verified', 'failed'] })
  verificationStatus?: 'pending' | 'verified' | 'failed';

  @Prop({ required: false })
  verifiedAt?: Date;
}

/**
 * Branch location details for delivery and logistics
 */
export class BranchLocation {
  @Prop({ required: false })
  county?: string;

  @Prop({ required: false })
  subCounty?: string;

  @Prop({ required: false })
  ward?: string;

  @Prop({ required: false })
  landmark?: string;

  @Prop({ required: false })
  buildingName?: string;

  @Prop({ required: false })
  floor?: string;

  @Prop({ required: false })
  latitude?: number;

  @Prop({ required: false })
  longitude?: number;

  @Prop({ required: false })
  googleMapsUrl?: string;

  @Prop({ required: false })
  deliveryRadius?: number; // in kilometers
}

/**
 * Branch operational settings
 */
export class BranchOperations {
  // Operating hours per day (0 = Sunday, 6 = Saturday)
  @Prop({ type: Object, default: {} })
  operatingHours?: {
    [day: number]: {
      open: string; // HH:MM
      close: string; // HH:MM
      closed?: boolean;
    };
  };

  @Prop({ type: [String], default: [] })
  holidays?: string[]; // ISO date strings when branch is closed

  @Prop({ required: false, default: true })
  acceptsWalkIn?: boolean;

  @Prop({ required: false, default: false })
  acceptsDelivery?: boolean;

  @Prop({ required: false, default: false })
  acceptsPickup?: boolean;

  @Prop({ required: false })
  deliveryFee?: number;

  @Prop({ required: false })
  minimumOrderAmount?: number;

  @Prop({ required: false })
  maxDailyOrders?: number;

  @Prop({ required: false })
  averageServiceTime?: number; // in minutes

  // Receipt customization
  @Prop({ required: false })
  receiptHeader?: string;

  @Prop({ required: false })
  receiptFooter?: string;

  @Prop({ required: false })
  receiptLogo?: string; // URL to branch-specific logo
}

/**
 * Branch contact information
 */
export class BranchContacts {
  @Prop({ required: false })
  primaryPhone?: string;

  @Prop({ required: false })
  secondaryPhone?: string;

  @Prop({ required: false })
  whatsapp?: string;

  @Prop({ required: false })
  email?: string;

  @Prop({ required: false })
  supportEmail?: string;
}

@Schema({ timestamps: true })
export class Branch {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop', index: true })
  shopId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  code: string; // e.g., BR-001

  @Prop({ required: false })
  description?: string;

  // Legacy address field (kept for backward compatibility)
  @Prop({ required: false })
  address?: string;

  // Legacy phone field (kept for backward compatibility)
  @Prop({ required: false })
  phone?: string;

  // Legacy email field (kept for backward compatibility)
  @Prop({ required: false })
  email?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ enum: ['active', 'inactive', 'suspended'], default: 'active', index: true })
  status: 'active' | 'inactive' | 'suspended';

  // ============================================
  // INVENTORY SETTINGS
  // ============================================

  @Prop({ enum: ['shared', 'separate'], default: 'shared' })
  inventoryType: 'shared' | 'separate';

  @Prop({ required: false, default: true })
  canTransferStock?: boolean; // Can transfer stock to/from other branches

  @Prop({ required: false })
  warehouseId?: Types.ObjectId; // If using separate inventory, link to warehouse

  // ============================================
  // PAYMENT CONFIGURATION
  // ============================================

  @Prop({ type: Object, default: { enabled: false, useShopConfig: true } })
  paymentConfig?: BranchPaymentConfig;

  // ============================================
  // LOCATION DETAILS
  // ============================================

  @Prop({ type: Object, default: {} })
  location?: BranchLocation;

  // ============================================
  // OPERATIONAL SETTINGS
  // ============================================

  // Legacy time fields (kept for backward compatibility)
  @Prop({ required: false })
  openingTime?: string; // HH:MM

  @Prop({ required: false })
  closingTime?: string; // HH:MM

  @Prop({ required: false })
  timezone?: string;

  @Prop({ type: Object, default: {} })
  operations?: BranchOperations;

  // ============================================
  // CONTACT INFORMATION
  // ============================================

  @Prop({ type: Object, default: {} })
  contacts?: BranchContacts;

  // ============================================
  // STAFF & MANAGEMENT
  // ============================================

  @Prop({ type: Types.ObjectId, ref: 'User' })
  managerId?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  staffIds?: Types.ObjectId[];

  @Prop({ required: false })
  maxStaff?: number;

  // ============================================
  // FINANCIAL SETTINGS
  // ============================================

  @Prop({ required: false })
  targetRevenue?: number; // Monthly target

  @Prop({ required: false })
  costCenter?: string; // For accounting purposes

  @Prop({ required: false })
  taxExempt?: boolean;

  // ============================================
  // METADATA
  // ============================================

  @Prop({ type: Object, default: {} })
  metadata?: {
    manager?: Types.ObjectId;
    managerName?: string;
    managerPhone?: string;
    notes?: string;
    customFields?: Record<string, any>;
    [key: string]: any;
  };

  // Timestamps (auto-managed)
  createdAt?: Date;
  updatedAt?: Date;
}

export const BranchSchema = SchemaFactory.createForClass(Branch);

// ============================================
// INDEXES
// ============================================
// Note: shopId already has index from @Prop({ index: true })

BranchSchema.index({ shopId: 1, code: 1 }, { unique: true });
BranchSchema.index({ shopId: 1, status: 1 });
BranchSchema.index({ createdBy: 1 });
BranchSchema.index({ managerId: 1 });
BranchSchema.index({ 'paymentConfig.shortCode': 1 });
BranchSchema.index({ 'location.county': 1 });

// ============================================
// VIRTUALS
// ============================================

BranchSchema.virtual('hasOwnPaymentConfig').get(function () {
  return (
    this.paymentConfig?.enabled &&
    !this.paymentConfig?.useShopConfig &&
    this.paymentConfig?.shortCode
  );
});

BranchSchema.virtual('isPaymentConfigured').get(function () {
  if (this.paymentConfig?.useShopConfig) return true;
  return !!(
    this.paymentConfig?.enabled &&
    this.paymentConfig?.shortCode &&
    this.paymentConfig?.consumerKey
  );
});

BranchSchema.virtual('isOpen').get(function () {
  if (this.status !== 'active') return false;
  
  const now = new Date();
  const day = now.getDay();
  const hours = this.operations?.operatingHours?.[day];
  
  if (!hours || hours.closed) return false;
  
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  return currentTime >= hours.open && currentTime <= hours.close;
});

// Enable virtuals in JSON output
BranchSchema.set('toJSON', { virtuals: true });
BranchSchema.set('toObject', { virtuals: true });
