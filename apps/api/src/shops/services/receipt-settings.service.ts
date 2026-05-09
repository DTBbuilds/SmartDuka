import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReceiptSettings, ReceiptSettingsDocument } from '../schemas/receipt-settings.schema';
import { UpdateReceiptSettingsDto, ReceiptSettingsResponseDto } from '../dto/receipt-settings.dto';

@Injectable()
export class ReceiptSettingsService {
  constructor(
    @InjectModel(ReceiptSettings.name)
    private receiptSettingsModel: Model<ReceiptSettingsDocument>,
  ) {}

  /**
   * Get or create default receipt settings for a shop
   */
  async getSettings(shopId: string | Types.ObjectId): Promise<ReceiptSettingsResponseDto> {
    const shopObjectId = typeof shopId === 'string' ? new Types.ObjectId(shopId) : shopId;

    let settings: any = await this.receiptSettingsModel.findOne({ shopId: shopObjectId });

    if (!settings) {
      // Create default settings
      settings = await this.createDefaultSettings(shopObjectId);
    }

    return this.mapToResponseDto(settings.toObject());
  }

  /**
   * Update receipt settings
   */
  async updateSettings(
    shopId: string | Types.ObjectId,
    updateDto: UpdateReceiptSettingsDto,
    userId?: string,
  ): Promise<ReceiptSettingsResponseDto> {
    const shopObjectId = typeof shopId === 'string' ? new Types.ObjectId(shopId) : shopId;

    const updateData: any = {
      ...updateDto,
      updatedAt: new Date(),
    };

    if (userId) {
      updateData.updatedBy = new Types.ObjectId(userId);
    }

    const settings = await this.receiptSettingsModel.findOneAndUpdate(
      { shopId: shopObjectId },
      { $set: updateData },
      { new: true, upsert: true },
    ).lean();

    return this.mapToResponseDto(settings);
  }

  /**
   * Update logo URL
   */
  async updateLogo(
    shopId: string | Types.ObjectId,
    logoUrl: string,
    userId?: string,
  ): Promise<ReceiptSettingsResponseDto> {
    return this.updateSettings(shopId, { logoUrl }, userId);
  }

  /**
   * Remove logo
   */
  async removeLogo(
    shopId: string | Types.ObjectId,
    userId?: string,
  ): Promise<ReceiptSettingsResponseDto> {
    return this.updateSettings(shopId, { logoUrl: undefined, showLogo: false }, userId);
  }

  /**
   * Reset to default settings
   */
  async resetToDefaults(
    shopId: string | Types.ObjectId,
  ): Promise<ReceiptSettingsResponseDto> {
    const shopObjectId = typeof shopId === 'string' ? new Types.ObjectId(shopId) : shopId;

    // Delete existing settings
    await this.receiptSettingsModel.deleteOne({ shopId: shopObjectId });

    // Create new default settings
    const settings = await this.createDefaultSettings(shopObjectId);

    return this.mapToResponseDto(settings);
  }

  /**
   * Create default settings for a new shop
   */
  private async createDefaultSettings(shopId: Types.ObjectId): Promise<ReceiptSettingsDocument> {
    const defaultSettings = new this.receiptSettingsModel({
      shopId,
      template: 'standard',
      paperWidth: 42,
      showLogo: false,
      logoAlignment: 'center',
      logoMaxWidth: 80,
      primaryColor: '#000000',
      secondaryColor: '#666666',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      accentColor: '#22c55e',
      showShopName: true,
      showShopAddress: true,
      showShopPhone: true,
      showShopEmail: true,
      showTaxPin: true,
      showReceiptNumber: true,
      showDateTime: true,
      showCashierName: true,
      showCustomerName: true,
      showCustomerPhone: false,
      showItemSku: true,
      showItemBarcode: false,
      showItemCategory: false,
      showItemQuantity: true,
      showItemUnitPrice: true,
      showItemDiscount: true,
      showItemTax: false,
      showExpiryDate: false,
      showBatchNumber: false,
      showSerialNumber: false,
      showPrescriptionInfo: false,
      showTableNumber: false,
      showOrderType: false,
      showWeight: false,
      showSubtotal: true,
      showTaxBreakdown: true,
      showDiscountSummary: true,
      showTotal: true,
      showAmountTendered: true,
      showChange: true,
      showLoyaltyPoints: false,
      barcodeType: 'qr_code',
      showBarcode: true,
      barcodeContent: 'receipt_number',
      barcodeAlignment: 'center',
      showFooter: true,
      footerMessage: 'Thank you for your business!',
      showReturnPolicy: false,
      showSocialLinks: false,
      enableDigitalReceipt: true,
      enableEmailReceipt: true,
      enableSMSReceipt: true,
      enableWhatsAppReceipt: true,
      copies: 1,
      autoPrint: false,
      cutPaper: true,
      openCashDrawer: false,
      printerType: 'thermal',
      enableSignature: false,
      enableTipLine: false,
      enableFeedbackQR: false,
      enablePromotions: false,
      showTaxInvoiceLabel: true,
      showTaxBreakdownByRate: true,
      includeFiscalData: false,
    });

    return defaultSettings.save();
  }

  /**
   * Map database document to response DTO
   */
  private mapToResponseDto(settings: any): ReceiptSettingsResponseDto {
    const response: ReceiptSettingsResponseDto = {
      template: settings.template,
      paperWidth: settings.paperWidth,
      showLogo: settings.showLogo,
      logoUrl: settings.logoUrl,
      logoAlignment: settings.logoAlignment,
      logoMaxWidth: settings.logoMaxWidth,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      backgroundColor: settings.backgroundColor,
      textColor: settings.textColor,
      accentColor: settings.accentColor,
      showShopName: settings.showShopName,
      showShopAddress: settings.showShopAddress,
      showShopPhone: settings.showShopPhone,
      showShopEmail: settings.showShopEmail,
      showTaxPin: settings.showTaxPin,
      customHeader: settings.customHeader,
      showReceiptNumber: settings.showReceiptNumber,
      showDateTime: settings.showDateTime,
      showCashierName: settings.showCashierName,
      showCustomerName: settings.showCustomerName,
      showCustomerPhone: settings.showCustomerPhone,
      showItemSku: settings.showItemSku,
      showItemBarcode: settings.showItemBarcode,
      showItemCategory: settings.showItemCategory,
      showItemQuantity: settings.showItemQuantity,
      showItemUnitPrice: settings.showItemUnitPrice,
      showItemDiscount: settings.showItemDiscount,
      showItemTax: settings.showItemTax,
      showExpiryDate: settings.showExpiryDate,
      showBatchNumber: settings.showBatchNumber,
      showSerialNumber: settings.showSerialNumber,
      showPrescriptionInfo: settings.showPrescriptionInfo,
      showTableNumber: settings.showTableNumber,
      showOrderType: settings.showOrderType,
      showWeight: settings.showWeight,
      showSubtotal: settings.showSubtotal,
      showTaxBreakdown: settings.showTaxBreakdown,
      showDiscountSummary: settings.showDiscountSummary,
      showTotal: settings.showTotal,
      showAmountTendered: settings.showAmountTendered,
      showChange: settings.showChange,
      showLoyaltyPoints: settings.showLoyaltyPoints,
      barcodeType: settings.barcodeType,
      showBarcode: settings.showBarcode,
      barcodeContent: settings.barcodeContent,
      customBarcodeText: settings.customBarcodeText,
      barcodeAlignment: settings.barcodeAlignment,
      showFooter: settings.showFooter,
      footerMessage: settings.footerMessage,
      secondaryFooterMessage: settings.secondaryFooterMessage,
      showReturnPolicy: settings.showReturnPolicy,
      returnPolicyText: settings.returnPolicyText,
      showSocialLinks: settings.showSocialLinks,
      socialLinks: settings.socialLinks,
      enableDigitalReceipt: settings.enableDigitalReceipt,
      enableEmailReceipt: settings.enableEmailReceipt,
      enableSMSReceipt: settings.enableSMSReceipt,
      enableWhatsAppReceipt: settings.enableWhatsAppReceipt,
      copies: settings.copies,
      autoPrint: settings.autoPrint,
      cutPaper: settings.cutPaper,
      openCashDrawer: settings.openCashDrawer,
      printerType: settings.printerType,
      enableSignature: settings.enableSignature,
      enableTipLine: settings.enableTipLine,
      enableFeedbackQR: settings.enableFeedbackQR,
      feedbackUrl: settings.feedbackUrl,
      enablePromotions: settings.enablePromotions,
      promotionText: settings.promotionText,
      showTaxInvoiceLabel: settings.showTaxInvoiceLabel,
      showTaxBreakdownByRate: settings.showTaxBreakdownByRate,
      includeFiscalData: settings.includeFiscalData,
      fiscalQrCodeData: settings.fiscalQrCodeData,
      updatedAt: settings.updatedAt,
    };

    return response;
  }

  /**
   * Get preset templates
   */
  getPresets(): Array<{ id: string; name: string; description: string; preview: any }> {
    return [
      {
        id: 'minimal',
        name: 'Minimal',
        description: 'Clean and simple, essential information only',
        preview: {
          showLogo: false,
          showShopAddress: false,
          showShopEmail: false,
          showItemSku: false,
          showBarcode: false,
          footerMessage: 'Thank you!',
        },
      },
      {
        id: 'standard',
        name: 'Standard',
        description: 'Balanced layout with all essential details',
        preview: {
          showLogo: true,
          showShopAddress: true,
          showShopEmail: true,
          showItemSku: true,
          showBarcode: true,
          footerMessage: 'Thank you for your business!',
        },
      },
      {
        id: 'detailed',
        name: 'Detailed',
        description: 'Comprehensive information with all fields visible',
        preview: {
          showLogo: true,
          showShopAddress: true,
          showShopEmail: true,
          showItemSku: true,
          showItemBarcode: true,
          showItemTax: true,
          showBarcode: true,
          footerMessage: 'Thank you for your business! Returns accepted within 14 days with receipt.',
        },
      },
      {
        id: 'modern',
        name: 'Modern',
        description: 'Contemporary design with accent colors and QR code',
        preview: {
          showLogo: true,
          showShopAddress: true,
          showSocialLinks: true,
          showBarcode: true,
          barcodeType: 'qr_code',
          enableFeedbackQR: true,
          footerMessage: 'Scan QR code for digital receipt and loyalty points!',
        },
      },
      {
        id: 'classic',
        name: 'Classic',
        description: 'Traditional receipt style, familiar and professional',
        preview: {
          showLogo: false,
          showShopAddress: true,
          showTaxPin: true,
          showBarcode: false,
          footerMessage: 'Goods once sold cannot be returned. Thank you for shopping with us!',
        },
      },
      {
        id: 'compact',
        name: 'Compact',
        description: 'Space-efficient layout for busy environments',
        preview: {
          paperWidth: 32,
          showLogo: false,
          showShopAddress: false,
          showShopEmail: false,
          showItemSku: false,
          showItemDiscount: false,
          showBarcode: false,
          footerMessage: 'Thank you!',
        },
      },
    ];
  }

  /**
   * Apply a preset template
   */
  async applyPreset(
    shopId: string | Types.ObjectId,
    presetId: string,
    userId?: string,
  ): Promise<ReceiptSettingsResponseDto> {
    const presets = this.getPresets();
    const preset = presets.find(p => p.id === presetId);

    if (!preset) {
      throw new NotFoundException(`Preset '${presetId}' not found`);
    }

    return this.updateSettings(shopId, preset.preview, userId);
  }
}
