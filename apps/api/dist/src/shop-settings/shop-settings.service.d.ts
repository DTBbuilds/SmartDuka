import { Model } from 'mongoose';
import { ShopSettings } from './shop-settings.schema';
import { ShopDocument } from '../shops/schemas/shop.schema';
import { CreateShopSettingsDto, UpdateShopSettingsDto } from './dto';
export declare class ShopSettingsService {
    private model;
    private shopModel;
    constructor(model: Model<ShopSettings>, shopModel: Model<ShopDocument>);
    getByShopId(shopId: string): Promise<ShopSettings>;
    syncReceiptSettingsFromShop(shopId: string): Promise<ShopSettings | null>;
    create(dto: CreateShopSettingsDto): Promise<ShopSettings>;
    update(shopId: string, dto: UpdateShopSettingsDto): Promise<ShopSettings>;
    addTaxExemptProduct(shopId: string, productId: string): Promise<ShopSettings | null>;
    removeTaxExemptProduct(shopId: string, productId: string): Promise<ShopSettings | null>;
    setCategoryTaxRate(shopId: string, categoryId: string, rate: number, exempt: boolean): Promise<ShopSettings | null>;
    removeCategoryTaxRate(shopId: string, categoryId: string): Promise<ShopSettings | null>;
    updateReceiptSettings(shopId: string, receiptSettings: any): Promise<ShopSettings | null>;
    getReceiptSettings(shopId: string): Promise<any>;
}
