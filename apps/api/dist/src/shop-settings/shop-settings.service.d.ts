import { Model } from 'mongoose';
import { ShopSettings } from './shop-settings.schema';
import { CreateShopSettingsDto, UpdateShopSettingsDto } from './dto';
export declare class ShopSettingsService {
    private model;
    constructor(model: Model<ShopSettings>);
    getByShopId(shopId: string): Promise<ShopSettings>;
    create(dto: CreateShopSettingsDto): Promise<ShopSettings>;
    update(shopId: string, dto: UpdateShopSettingsDto): Promise<ShopSettings>;
    addTaxExemptProduct(shopId: string, productId: string): Promise<ShopSettings | null>;
    removeTaxExemptProduct(shopId: string, productId: string): Promise<ShopSettings | null>;
    setCategoryTaxRate(shopId: string, categoryId: string, rate: number, exempt: boolean): Promise<ShopSettings | null>;
    removeCategoryTaxRate(shopId: string, categoryId: string): Promise<ShopSettings | null>;
}
