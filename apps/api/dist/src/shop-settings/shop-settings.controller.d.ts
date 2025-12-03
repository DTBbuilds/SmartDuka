import { ShopSettingsService } from './shop-settings.service';
import { UpdateShopSettingsDto } from './dto';
export declare class ShopSettingsController {
    private service;
    constructor(service: ShopSettingsService);
    getSettings(shopId: string): Promise<import("./shop-settings.schema").ShopSettings>;
    updateSettings(shopId: string, dto: UpdateShopSettingsDto): Promise<import("./shop-settings.schema").ShopSettings>;
    addTaxExemptProduct(shopId: string, productId: string): Promise<import("./shop-settings.schema").ShopSettings | null>;
    removeTaxExemptProduct(shopId: string, productId: string): Promise<import("./shop-settings.schema").ShopSettings | null>;
    setCategoryTaxRate(shopId: string, categoryId: string, body: {
        rate: number;
        exempt: boolean;
    }): Promise<import("./shop-settings.schema").ShopSettings | null>;
    removeCategoryTaxRate(shopId: string, categoryId: string): Promise<import("./shop-settings.schema").ShopSettings | null>;
    getReceiptSettings(shopId: string): Promise<any>;
    updateReceiptSettings(shopId: string, receiptSettings: any): Promise<import("./shop-settings.schema").ShopSettings | null>;
    syncReceiptFromShop(shopId: string): Promise<import("./shop-settings.schema").ShopSettings>;
}
