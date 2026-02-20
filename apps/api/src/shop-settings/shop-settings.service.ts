import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ShopSettings } from './shop-settings.schema';
import { Shop, ShopDocument } from '../shops/schemas/shop.schema';
import { CreateShopSettingsDto, UpdateShopSettingsDto } from './dto';
import {
  getBusinessTypeProfile,
  normalizeBusinessTypeId,
  getBusinessTypeOptions,
  getAllBusinessTypes,
  getBusinessTypesByCategory,
  BusinessTypeId,
} from '@smartduka/business-types';

@Injectable()
export class ShopSettingsService {
  constructor(
    @InjectModel(ShopSettings.name) private model: Model<ShopSettings>,
    @InjectModel(Shop.name) private shopModel: Model<ShopDocument>,
  ) {}

  /**
   * Get shop settings by shopId, auto-creating with shop data if not exists
   */
  async getByShopId(shopId: string): Promise<ShopSettings> {
    let settings = await this.model.findOne({ shopId });

    if (!settings) {
      // Fetch shop data to populate receipt settings
      const shop = await this.shopModel.findOne({ shopId }).exec();
      
      // Build address from shop data
      let shopAddress = '';
      if (shop) {
        const addressParts = [shop.address, shop.city, shop.county].filter(Boolean);
        shopAddress = addressParts.join(', ');
      }

      // Create default settings with shop info for receipts
      settings = await this.model.create({
        shopId,
        tax: {
          enabled: true,
          rate: 0.16,
          name: 'VAT',
          description: 'Value Added Tax (16%)',
          appliedByDefault: true,
        },
        receipt: {
          // Auto-populate from shop registration data
          shopName: shop?.name,
          shopAddress: shopAddress || undefined,
          shopPhone: shop?.phone,
          shopEmail: shop?.email,
          shopTaxPin: shop?.kraPin,
          // Default settings
          printerWidth: 32,
          showLogo: false,
          showTaxPin: !!shop?.kraPin, // Show if KRA PIN exists
          showCashierName: true,
          showCustomerName: true,
          showItemSku: false,
          footerMessage: `Thank you for shopping at ${shop?.name || 'our store'}!`,
        },
        taxExemptProducts: [],
        categoryTaxRates: {},
      });
    }

    return settings;
  }

  /**
   * Initialize or update receipt settings from shop data
   * Call this after shop registration or when shop details change
   */
  async syncReceiptSettingsFromShop(shopId: string): Promise<ShopSettings | null> {
    const shop = await this.shopModel.findOne({ shopId }).exec();
    if (!shop) return null;

    // Build address from shop data
    const addressParts = [shop.address, shop.city, shop.county].filter(Boolean);
    const shopAddress = addressParts.join(', ');

    // Get existing settings or create new
    let settings = await this.model.findOne({ shopId });
    
    const receiptDefaults = {
      shopName: shop.name,
      shopAddress: shopAddress || undefined,
      shopPhone: shop.phone,
      shopEmail: shop.email,
      shopTaxPin: shop.kraPin,
      printerWidth: 32,
      showLogo: false,
      showTaxPin: !!shop.kraPin,
      showCashierName: true,
      showCustomerName: true,
      showItemSku: false,
      footerMessage: `Thank you for shopping at ${shop.name}!`,
    };

    if (settings) {
      // Update only if receipt settings don't have shop info yet
      const currentReceipt = settings.receipt || {};
      if (!currentReceipt.shopName) {
        return this.model.findOneAndUpdate(
          { shopId },
          { 
            $set: { 
              'receipt.shopName': receiptDefaults.shopName,
              'receipt.shopAddress': receiptDefaults.shopAddress,
              'receipt.shopPhone': receiptDefaults.shopPhone,
              'receipt.shopEmail': receiptDefaults.shopEmail,
              'receipt.shopTaxPin': receiptDefaults.shopTaxPin,
              'receipt.footerMessage': currentReceipt.footerMessage || receiptDefaults.footerMessage,
              updatedAt: new Date(),
            } 
          },
          { new: true },
        );
      }
      return settings;
    } else {
      // Create new settings
      return this.model.create({
        shopId,
        tax: {
          enabled: true,
          rate: 0.16,
          name: 'VAT',
          description: 'Value Added Tax (16%)',
          appliedByDefault: true,
        },
        receipt: receiptDefaults,
        taxExemptProducts: [],
        categoryTaxRates: {},
      });
    }
  }

  async create(dto: CreateShopSettingsDto): Promise<ShopSettings> {
    return this.model.create(dto);
  }

  async update(shopId: string, dto: UpdateShopSettingsDto): Promise<ShopSettings> {
    return this.model.findOneAndUpdate(
      { shopId },
      { ...dto, updatedAt: new Date() },
      { new: true, upsert: true },
    );
  }

  async addTaxExemptProduct(shopId: string, productId: string): Promise<ShopSettings | null> {
    return this.model.findOneAndUpdate(
      { shopId },
      { $addToSet: { taxExemptProducts: productId }, updatedAt: new Date() },
      { new: true },
    );
  }

  async removeTaxExemptProduct(shopId: string, productId: string): Promise<ShopSettings | null> {
    return this.model.findOneAndUpdate(
      { shopId },
      { $pull: { taxExemptProducts: productId }, updatedAt: new Date() },
      { new: true },
    );
  }

  async setCategoryTaxRate(
    shopId: string,
    categoryId: string,
    rate: number,
    exempt: boolean,
  ): Promise<ShopSettings | null> {
    return this.model.findOneAndUpdate(
      { shopId },
      { 
        $set: { 
          [`categoryTaxRates.${categoryId}`]: { rate, exempt },
          updatedAt: new Date(),
        } 
      },
      { new: true },
    );
  }

  async removeCategoryTaxRate(shopId: string, categoryId: string): Promise<ShopSettings | null> {
    return this.model.findOneAndUpdate(
      { shopId },
      { $unset: { [`categoryTaxRates.${categoryId}`]: 1 }, updatedAt: new Date() },
      { new: true },
    );
  }

  async updateReceiptSettings(shopId: string, receiptSettings: any): Promise<ShopSettings | null> {
    return this.model.findOneAndUpdate(
      { shopId },
      { 
        $set: { 
          receipt: receiptSettings,
          updatedAt: new Date(),
        } 
      },
      { new: true, upsert: true },
    );
  }

  async getReceiptSettings(shopId: string): Promise<any> {
    const settings = await this.getByShopId(shopId);
    return settings?.receipt || {
      printerWidth: 32,
      showLogo: false,
      showTaxPin: true,
      showCashierName: true,
      showCustomerName: true,
      showItemSku: false,
      footerMessage: 'Thank you for your purchase!',
    };
  }

  // =========================================================================
  // Business Type Configuration
  // =========================================================================

  /**
   * Apply a business type profile to a shop's settings.
   * Called when a shop is created or when the business type is changed.
   * Merges the profile defaults with any existing overrides.
   */
  async applyBusinessTypeConfig(
    shopId: string,
    businessType: string,
    overrides?: Record<string, any>,
  ): Promise<ShopSettings | null> {
    const typeId = normalizeBusinessTypeId(businessType);
    const profile = getBusinessTypeProfile(typeId);

    const businessTypeConfig: any = {
      businessTypeId: profile.id,
      inventoryMode: profile.defaultInventoryMode,
      posMode: profile.posMode,
      defaultUnit: profile.defaultUnit,
      availableUnits: profile.defaultUnits,
      features: { ...profile.features },
      productFields: { ...profile.productFields },
      posConfig: { ...profile.posConfig },
      receiptConfig: { ...profile.receiptConfig },
    };

    // Apply any shop-specific overrides
    if (overrides?.features) {
      Object.assign(businessTypeConfig.features, overrides.features);
    }
    if (overrides?.posConfig) {
      Object.assign(businessTypeConfig.posConfig, overrides.posConfig);
    }
    if (overrides?.productFields) {
      Object.assign(businessTypeConfig.productFields, overrides.productFields);
    }

    // Also apply business-type-specific tax defaults if not already customized
    const existingSettings = await this.model.findOne({ shopId });
    const updateData: any = {
      businessTypeConfig,
      updatedAt: new Date(),
    };

    // Apply default tax config from business type if shop has default tax
    if (!existingSettings || existingSettings.tax?.rate === 0.16) {
      updateData.tax = {
        enabled: profile.defaultTaxConfig.enabled,
        rate: profile.defaultTaxConfig.rate,
        name: profile.defaultTaxConfig.name,
        description: profile.defaultTaxConfig.description,
        appliedByDefault: true,
      };
    }

    // Update receipt footer from business type profile
    if (!existingSettings?.receipt?.footerMessage || existingSettings.receipt.footerMessage === 'Thank you for your purchase!') {
      updateData['receipt.footerMessage'] = profile.receiptConfig.footerMessage;
    }

    return this.model.findOneAndUpdate(
      { shopId },
      { $set: updateData },
      { new: true, upsert: true },
    );
  }

  /**
   * Get business type configuration for a shop.
   */
  async getBusinessTypeConfig(shopId: string): Promise<any> {
    const settings = await this.getByShopId(shopId);
    if (settings?.businessTypeConfig?.businessTypeId) {
      return settings.businessTypeConfig;
    }

    // If no business type config yet, try to derive from shop's businessType field
    const shop = await this.shopModel.findOne({ shopId }).exec();
    if (shop?.businessType) {
      const typeId = normalizeBusinessTypeId(shop.businessType);
      const profile = getBusinessTypeProfile(typeId);
      return {
        businessTypeId: profile.id,
        inventoryMode: profile.defaultInventoryMode,
        posMode: profile.posMode,
        defaultUnit: profile.defaultUnit,
        availableUnits: profile.defaultUnits,
        features: profile.features,
        productFields: profile.productFields,
        posConfig: profile.posConfig,
        receiptConfig: profile.receiptConfig,
      };
    }

    // Fallback to general store
    const fallback = getBusinessTypeProfile(BusinessTypeId.OTHER);
    return {
      businessTypeId: fallback.id,
      inventoryMode: fallback.defaultInventoryMode,
      posMode: fallback.posMode,
      defaultUnit: fallback.defaultUnit,
      availableUnits: fallback.defaultUnits,
      features: fallback.features,
      productFields: fallback.productFields,
      posConfig: fallback.posConfig,
      receiptConfig: fallback.receiptConfig,
    };
  }

  /**
   * Toggle a specific feature for a shop (override business type default).
   */
  async updateBusinessTypeFeature(
    shopId: string,
    featureName: string,
    enabled: boolean,
  ): Promise<ShopSettings | null> {
    return this.model.findOneAndUpdate(
      { shopId },
      {
        $set: {
          [`businessTypeConfig.features.${featureName}`]: enabled,
          updatedAt: new Date(),
        },
      },
      { new: true },
    );
  }

  /**
   * Get all available business type options for dropdowns.
   */
  getAvailableBusinessTypes() {
    return getBusinessTypeOptions();
  }

  /**
   * Get all business types grouped by category.
   */
  getBusinessTypesGrouped() {
    const grouped = getBusinessTypesByCategory();
    const result: any = {};
    for (const [category, profiles] of Object.entries(grouped)) {
      result[category] = (profiles as any[]).map((p: any) => ({
        id: p.id,
        displayName: p.displayName,
        description: p.description,
        icon: p.icon,
        category: p.category,
        posMode: p.posMode,
        defaultInventoryMode: p.defaultInventoryMode,
      }));
    }
    return result;
  }

  /**
   * Get full profile details for a specific business type.
   */
  getBusinessTypeProfile(businessType: string) {
    const typeId = normalizeBusinessTypeId(businessType);
    const profile = getBusinessTypeProfile(typeId);
    return {
      ...profile,
      // Include category labels
      defaultCategories: profile.defaultCategories,
    };
  }
}
