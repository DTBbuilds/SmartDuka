import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReceiptSettingsDocument = HydratedDocument<ReceiptSettings>;

export enum ReceiptTemplate {
  MINIMAL = 'minimal',
  STANDARD = 'standard',
  DETAILED = 'detailed',
  MODERN = 'modern',
  CLASSIC = 'classic',
  COMPACT = 'compact',
}

export enum ReceiptWidth {
  NARROW_58MM = 32,    // 58mm paper ~ 32 chars
  STANDARD_80MM = 42,  // 80mm paper ~ 42 chars
  WIDE_80MM = 48,      // 80mm paper with small font
}

export enum BarcodeType {
  NONE = 'none',
  QR_CODE = 'qr_code',
  CODE128 = 'code128',
  CODE39 = 'code39',
  EAN13 = 'ean13',
  UPCA = 'upca',
}

@Schema({ timestamps: true })
export class ReceiptSettings {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Shop', index: true })
  shopId: Types.ObjectId;

  // === Template & Layout ===
  @Prop({ enum: ReceiptTemplate, default: ReceiptTemplate.STANDARD })
  template: ReceiptTemplate;

  @Prop({ enum: ReceiptWidth, default: ReceiptWidth.STANDARD_80MM })
  paperWidth: ReceiptWidth;

  @Prop({ default: true })
  showLogo: boolean;

  @Prop({ required: false })
  logoUrl?: string;

  @Prop({ default: 'center' })
  logoAlignment: 'left' | 'center' | 'right';

  @Prop({ default: 80 })
  logoMaxWidth: number; // percentage

  // === Colors (for digital/email receipts) ===
  @Prop({ default: '#000000' })
  primaryColor: string;

  @Prop({ default: '#666666' })
  secondaryColor: string;

  @Prop({ default: '#ffffff' })
  backgroundColor: string;

  @Prop({ default: '#000000' })
  textColor: string;

  @Prop({ default: '#22c55e' })
  accentColor: string; // For totals, highlights

  // === Header Information ===
  @Prop({ default: true })
  showShopName: boolean;

  @Prop({ default: true })
  showShopAddress: boolean;

  @Prop({ default: true })
  showShopPhone: boolean;

  @Prop({ default: true })
  showShopEmail: boolean;

  @Prop({ default: true })
  showTaxPin: boolean;

  @Prop({ required: false })
  customHeader?: string;

  // === Receipt Details ===
  @Prop({ default: true })
  showReceiptNumber: boolean;

  @Prop({ default: true })
  showDateTime: boolean;

  @Prop({ default: true })
  showCashierName: boolean;

  @Prop({ default: true })
  showCustomerName: boolean;

  @Prop({ default: false })
  showCustomerPhone: boolean;

  // === Items Section ===
  @Prop({ default: true })
  showItemSku: boolean;

  @Prop({ default: true })
  showItemBarcode: boolean;

  @Prop({ default: false })
  showItemCategory: boolean;

  @Prop({ default: true })
  showItemQuantity: boolean;

  @Prop({ default: true })
  showItemUnitPrice: boolean;

  @Prop({ default: true })
  showItemDiscount: boolean;

  @Prop({ default: false })
  showItemTax: boolean;

  // === Business Type Specific ===
  @Prop({ default: false })
  showExpiryDate: boolean;

  @Prop({ default: false })
  showBatchNumber: boolean;

  @Prop({ default: false })
  showSerialNumber: boolean;

  @Prop({ default: false })
  showPrescriptionInfo: boolean;

  @Prop({ default: false })
  showTableNumber: boolean;

  @Prop({ default: false })
  showOrderType: boolean;

  @Prop({ default: false })
  showWeight: boolean;

  // === Financial Summary ===
  @Prop({ default: true })
  showSubtotal: boolean;

  @Prop({ default: true })
  showTaxBreakdown: boolean;

  @Prop({ default: true })
  showDiscountSummary: boolean;

  @Prop({ default: true })
  showTotal: boolean;

  @Prop({ default: true })
  showAmountTendered: boolean;

  @Prop({ default: true })
  showChange: boolean;

  @Prop({ default: false })
  showLoyaltyPoints: boolean;

  // === Barcode/QR Code ===
  @Prop({ enum: BarcodeType, default: BarcodeType.QR_CODE })
  barcodeType: BarcodeType;

  @Prop({ default: true })
  showBarcode: boolean;

  @Prop({ default: 'receipt_number' })
  barcodeContent: 'receipt_number' | 'transaction_id' | 'shop_url' | 'verify_url' | 'custom';

  @Prop({ required: false })
  customBarcodeText?: string;

  @Prop({ default: 'center' })
  barcodeAlignment: 'left' | 'center' | 'right';

  // === Footer ===
  @Prop({ default: true })
  showFooter: boolean;

  @Prop({ default: 'Thank you for your business!' })
  footerMessage: string;

  @Prop({ required: false })
  secondaryFooterMessage?: string;

  @Prop({ default: true })
  showReturnPolicy: boolean;

  @Prop({ required: false })
  returnPolicyText?: string;

  @Prop({ default: false })
  showSocialLinks: boolean;

  @Prop({ type: Object, default: {} })
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    whatsapp?: string;
    website?: string;
  };

  // === Digital Receipt ===
  @Prop({ default: true })
  enableDigitalReceipt: boolean;

  @Prop({ default: true })
  enableEmailReceipt: boolean;

  @Prop({ default: true })
  enableSMSReceipt: boolean;

  @Prop({ default: true })
  enableWhatsAppReceipt: boolean;

  // === Print Settings ===
  @Prop({ default: 1 })
  copies: number;

  @Prop({ default: false })
  autoPrint: boolean;

  @Prop({ default: true })
  cutPaper: boolean;

  @Prop({ default: true })
  openCashDrawer: boolean;

  @Prop({ default: ' thermal' })
  printerType: 'thermal' | 'dot_matrix' | 'inkjet' | 'laser';

  // === Advanced ===
  @Prop({ default: false })
  enableSignature: boolean;

  @Prop({ default: false })
  enableTipLine: boolean;

  @Prop({ default: false })
  enableFeedbackQR: boolean;

  @Prop({ required: false })
  feedbackUrl?: string;

  @Prop({ default: false })
  enablePromotions: boolean;

  @Prop({ required: false })
  promotionText?: string;

  // === Compliance ===
  @Prop({ default: true })
  showTaxInvoiceLabel: boolean;

  @Prop({ default: true })
  showTaxBreakdownByRate: boolean;

  @Prop({ default: false })
  includeFiscalData: boolean; // For fiscal printers (Kenya TIMS, etc.)

  @Prop({ required: false })
  fiscalQrCodeData?: string;

  // === Timestamps ===
  @Prop({ required: false })
  updatedAt?: Date;

  @Prop({ required: false, type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const ReceiptSettingsSchema = SchemaFactory.createForClass(ReceiptSettings);

// Indexes
ReceiptSettingsSchema.index({ shopId: 1 }, { unique: true });
