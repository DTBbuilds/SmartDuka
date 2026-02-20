import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class ShopSettings extends Document {
  @Prop({ required: true, index: true })
  shopId: string;

  @Prop({
    type: {
      enabled: { type: Boolean, default: true },
      rate: { type: Number, default: 0.16 }, // 16% for Kenya
      name: { type: String, default: 'VAT' },
      description: { type: String, default: 'Value Added Tax (16%)' },
      appliedByDefault: { type: Boolean, default: true },
    },
    default: {
      enabled: true,
      rate: 0.16,
      name: 'VAT',
      description: 'Value Added Tax (16%)',
      appliedByDefault: true,
    },
  })
  tax: {
    enabled: boolean;
    rate: number;
    name: string;
    description: string;
    appliedByDefault: boolean;
  };

  @Prop({ type: [String], default: [] })
  taxExemptProducts: string[];

  @Prop({ type: Map, of: Object, default: {} })
  categoryTaxRates: Record<string, { rate: number; exempt: boolean }>;

  // Business Type Configuration
  @Prop({ type: Object, default: {} })
  businessTypeConfig?: {
    // The canonical business type ID
    businessTypeId?: string;
    // Inventory tracking mode
    inventoryMode?: string;
    // POS interaction mode
    posMode?: string;
    // Default unit of measure
    defaultUnit?: string;
    // Available units of measure
    availableUnits?: string[];
    // Feature flags (overridable per shop)
    features?: Record<string, boolean>;
    // Product field visibility
    productFields?: Record<string, string>;
    // POS configuration
    posConfig?: {
      showBarcodeScanner?: boolean;
      showWeightInput?: boolean;
      showModifiers?: boolean;
      showTableSelector?: boolean;
      showOrderType?: boolean;
      showQuickSellGrid?: boolean;
      showSerialPrompt?: boolean;
      showPrescriptionFields?: boolean;
      receiptTitle?: string;
      defaultOrderType?: string;
    };
    // Receipt configuration
    receiptConfig?: {
      showExpiryDate?: boolean;
      showBatchNumber?: boolean;
      showSerialNumber?: boolean;
      showWeight?: boolean;
      showPrescriptionInfo?: boolean;
      showTableNumber?: boolean;
      showOrderType?: boolean;
      footerMessage?: string;
    };
  };

  // Receipt settings
  @Prop({
    type: {
      // Shop display info
      shopName: { type: String },
      shopAddress: { type: String },
      shopPhone: { type: String },
      shopEmail: { type: String },
      shopLogo: { type: String },
      shopTaxPin: { type: String },
      shopWebsite: { type: String },
      // Receipt format
      printerWidth: { type: Number, default: 32 }, // 32 for 58mm, 42 for 80mm
      showLogo: { type: Boolean, default: false },
      showTaxPin: { type: Boolean, default: true },
      showCashierName: { type: Boolean, default: true },
      showCustomerName: { type: Boolean, default: true },
      showItemSku: { type: Boolean, default: false },
      // Messages
      headerMessage: { type: String },
      footerMessage: { type: String, default: 'Thank you for your purchase!' },
      // Social media
      socialMedia: {
        type: {
          facebook: { type: String },
          instagram: { type: String },
          twitter: { type: String },
          whatsapp: { type: String },
        },
      },
    },
    default: {
      printerWidth: 32,
      showLogo: false,
      showTaxPin: true,
      showCashierName: true,
      showCustomerName: true,
      showItemSku: false,
      footerMessage: 'Thank you for your purchase!',
    },
  })
  receipt: {
    shopName?: string;
    shopAddress?: string;
    shopPhone?: string;
    shopEmail?: string;
    shopLogo?: string;
    shopTaxPin?: string;
    shopWebsite?: string;
    printerWidth: number;
    showLogo: boolean;
    showTaxPin: boolean;
    showCashierName: boolean;
    showCustomerName: boolean;
    showItemSku: boolean;
    headerMessage?: string;
    footerMessage: string;
    socialMedia?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      whatsapp?: string;
    };
  };

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ShopSettingsSchema = SchemaFactory.createForClass(ShopSettings);
// Note: shopId already has index from @Prop({ index: true })
ShopSettingsSchema.index({ 'businessTypeConfig.businessTypeId': 1 });
