import { IsString, IsBoolean, IsEnum, IsOptional, IsNumber, IsObject, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ReceiptTemplate, ReceiptWidth, BarcodeType } from '../schemas/receipt-settings.schema';

class SocialLinksDto {
  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  twitter?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  website?: string;
}

export class UpdateReceiptSettingsDto {
  // Template & Layout
  @IsOptional()
  @IsEnum(ReceiptTemplate)
  template?: ReceiptTemplate;

  @IsOptional()
  @IsEnum(ReceiptWidth)
  paperWidth?: ReceiptWidth;

  @IsOptional()
  @IsBoolean()
  showLogo?: boolean;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  logoAlignment?: 'left' | 'center' | 'right';

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(100)
  logoMaxWidth?: number;

  // Colors
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @IsOptional()
  @IsString()
  textColor?: string;

  @IsOptional()
  @IsString()
  accentColor?: string;

  // Header
  @IsOptional()
  @IsBoolean()
  showShopName?: boolean;

  @IsOptional()
  @IsBoolean()
  showShopAddress?: boolean;

  @IsOptional()
  @IsBoolean()
  showShopPhone?: boolean;

  @IsOptional()
  @IsBoolean()
  showShopEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  showTaxPin?: boolean;

  @IsOptional()
  @IsString()
  customHeader?: string;

  // Receipt Details
  @IsOptional()
  @IsBoolean()
  showReceiptNumber?: boolean;

  @IsOptional()
  @IsBoolean()
  showDateTime?: boolean;

  @IsOptional()
  @IsBoolean()
  showCashierName?: boolean;

  @IsOptional()
  @IsBoolean()
  showCustomerName?: boolean;

  @IsOptional()
  @IsBoolean()
  showCustomerPhone?: boolean;

  // Items
  @IsOptional()
  @IsBoolean()
  showItemSku?: boolean;

  @IsOptional()
  @IsBoolean()
  showItemBarcode?: boolean;

  @IsOptional()
  @IsBoolean()
  showItemCategory?: boolean;

  @IsOptional()
  @IsBoolean()
  showItemQuantity?: boolean;

  @IsOptional()
  @IsBoolean()
  showItemUnitPrice?: boolean;

  @IsOptional()
  @IsBoolean()
  showItemDiscount?: boolean;

  @IsOptional()
  @IsBoolean()
  showItemTax?: boolean;

  // Business Type Specific
  @IsOptional()
  @IsBoolean()
  showExpiryDate?: boolean;

  @IsOptional()
  @IsBoolean()
  showBatchNumber?: boolean;

  @IsOptional()
  @IsBoolean()
  showSerialNumber?: boolean;

  @IsOptional()
  @IsBoolean()
  showPrescriptionInfo?: boolean;

  @IsOptional()
  @IsBoolean()
  showTableNumber?: boolean;

  @IsOptional()
  @IsBoolean()
  showOrderType?: boolean;

  @IsOptional()
  @IsBoolean()
  showWeight?: boolean;

  // Financial
  @IsOptional()
  @IsBoolean()
  showSubtotal?: boolean;

  @IsOptional()
  @IsBoolean()
  showTaxBreakdown?: boolean;

  @IsOptional()
  @IsBoolean()
  showDiscountSummary?: boolean;

  @IsOptional()
  @IsBoolean()
  showTotal?: boolean;

  @IsOptional()
  @IsBoolean()
  showAmountTendered?: boolean;

  @IsOptional()
  @IsBoolean()
  showChange?: boolean;

  @IsOptional()
  @IsBoolean()
  showLoyaltyPoints?: boolean;

  // Barcode
  @IsOptional()
  @IsEnum(BarcodeType)
  barcodeType?: BarcodeType;

  @IsOptional()
  @IsBoolean()
  showBarcode?: boolean;

  @IsOptional()
  @IsString()
  barcodeContent?: 'receipt_number' | 'transaction_id' | 'shop_url' | 'verify_url' | 'custom';

  @IsOptional()
  @IsString()
  customBarcodeText?: string;

  @IsOptional()
  @IsString()
  barcodeAlignment?: 'left' | 'center' | 'right';

  // Footer
  @IsOptional()
  @IsBoolean()
  showFooter?: boolean;

  @IsOptional()
  @IsString()
  footerMessage?: string;

  @IsOptional()
  @IsString()
  secondaryFooterMessage?: string;

  @IsOptional()
  @IsBoolean()
  showReturnPolicy?: boolean;

  @IsOptional()
  @IsString()
  returnPolicyText?: string;

  @IsOptional()
  @IsBoolean()
  showSocialLinks?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;

  // Digital Receipt
  @IsOptional()
  @IsBoolean()
  enableDigitalReceipt?: boolean;

  @IsOptional()
  @IsBoolean()
  enableEmailReceipt?: boolean;

  @IsOptional()
  @IsBoolean()
  enableSMSReceipt?: boolean;

  @IsOptional()
  @IsBoolean()
  enableWhatsAppReceipt?: boolean;

  // Print
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  copies?: number;

  @IsOptional()
  @IsBoolean()
  autoPrint?: boolean;

  @IsOptional()
  @IsBoolean()
  cutPaper?: boolean;

  @IsOptional()
  @IsBoolean()
  openCashDrawer?: boolean;

  @IsOptional()
  @IsString()
  printerType?: 'thermal' | 'dot_matrix' | 'inkjet' | 'laser';

  // Advanced
  @IsOptional()
  @IsBoolean()
  enableSignature?: boolean;

  @IsOptional()
  @IsBoolean()
  enableTipLine?: boolean;

  @IsOptional()
  @IsBoolean()
  enableFeedbackQR?: boolean;

  @IsOptional()
  @IsString()
  feedbackUrl?: string;

  @IsOptional()
  @IsBoolean()
  enablePromotions?: boolean;

  @IsOptional()
  @IsString()
  promotionText?: string;

  // Compliance
  @IsOptional()
  @IsBoolean()
  showTaxInvoiceLabel?: boolean;

  @IsOptional()
  @IsBoolean()
  showTaxBreakdownByRate?: boolean;

  @IsOptional()
  @IsBoolean()
  includeFiscalData?: boolean;

  @IsOptional()
  @IsString()
  fiscalQrCodeData?: string;
}

export class ReceiptSettingsResponseDto {
  // Include all fields from the schema for response
  template: ReceiptTemplate;
  paperWidth: ReceiptWidth;
  showLogo: boolean;
  logoUrl?: string;
  logoAlignment: string;
  logoMaxWidth: number;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  showShopName: boolean;
  showShopAddress: boolean;
  showShopPhone: boolean;
  showShopEmail: boolean;
  showTaxPin: boolean;
  customHeader?: string;
  showReceiptNumber: boolean;
  showDateTime: boolean;
  showCashierName: boolean;
  showCustomerName: boolean;
  showCustomerPhone: boolean;
  showItemSku: boolean;
  showItemBarcode: boolean;
  showItemCategory: boolean;
  showItemQuantity: boolean;
  showItemUnitPrice: boolean;
  showItemDiscount: boolean;
  showItemTax: boolean;
  showExpiryDate: boolean;
  showBatchNumber: boolean;
  showSerialNumber: boolean;
  showPrescriptionInfo: boolean;
  showTableNumber: boolean;
  showOrderType: boolean;
  showWeight: boolean;
  showSubtotal: boolean;
  showTaxBreakdown: boolean;
  showDiscountSummary: boolean;
  showTotal: boolean;
  showAmountTendered: boolean;
  showChange: boolean;
  showLoyaltyPoints: boolean;
  barcodeType: BarcodeType;
  showBarcode: boolean;
  barcodeContent: string;
  customBarcodeText?: string;
  barcodeAlignment: string;
  showFooter: boolean;
  footerMessage: string;
  secondaryFooterMessage?: string;
  showReturnPolicy: boolean;
  returnPolicyText?: string;
  showSocialLinks: boolean;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    whatsapp?: string;
    website?: string;
  };
  enableDigitalReceipt: boolean;
  enableEmailReceipt: boolean;
  enableSMSReceipt: boolean;
  enableWhatsAppReceipt: boolean;
  copies: number;
  autoPrint: boolean;
  cutPaper: boolean;
  openCashDrawer: boolean;
  printerType: string;
  enableSignature: boolean;
  enableTipLine: boolean;
  enableFeedbackQR: boolean;
  feedbackUrl?: string;
  enablePromotions: boolean;
  promotionText?: string;
  showTaxInvoiceLabel: boolean;
  showTaxBreakdownByRate: boolean;
  includeFiscalData: boolean;
  fiscalQrCodeData?: string;
  updatedAt?: Date;
}
