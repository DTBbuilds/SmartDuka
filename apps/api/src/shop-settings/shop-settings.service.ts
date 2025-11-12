import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ShopSettings } from './shop-settings.schema';
import { CreateShopSettingsDto, UpdateShopSettingsDto } from './dto';

@Injectable()
export class ShopSettingsService {
  constructor(
    @InjectModel(ShopSettings.name) private model: Model<ShopSettings>,
  ) {}

  async getByShopId(shopId: string): Promise<ShopSettings> {
    let settings = await this.model.findOne({ shopId });

    if (!settings) {
      // Create default settings
      settings = await this.model.create({
        shopId,
        tax: {
          enabled: true,
          rate: 0.16,
          name: 'VAT',
          description: 'Value Added Tax (16%)',
          appliedByDefault: true,
        },
        taxExemptProducts: [],
        categoryTaxRates: {},
      });
    }

    return settings;
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
}
