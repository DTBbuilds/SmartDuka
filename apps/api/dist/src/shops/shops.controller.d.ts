import { ShopsService } from './shops.service';
export declare class ShopsController {
    private readonly shopsService;
    constructor(shopsService: ShopsService);
    getAllShops(): Promise<any[]>;
    create(dto: any, user: Record<string, any>): Promise<import("./shop.schema").ShopDocument>;
    getMyShop(user: Record<string, any>): Promise<import("./shop.schema").ShopDocument | null>;
    getShop(user: Record<string, any>): Promise<import("./shop.schema").ShopDocument | null>;
    updateShop(dto: any, user: Record<string, any>): Promise<import("./shop.schema").ShopDocument | null>;
    completeOnboarding(user: Record<string, any>): Promise<import("./shop.schema").ShopDocument | null>;
    updateLanguage(dto: {
        language: 'en' | 'sw';
    }, user: Record<string, any>): Promise<import("./shop.schema").ShopDocument | null>;
    getStats(id: string, user: Record<string, any>): Promise<any>;
    getPendingShops(): Promise<import("./shop.schema").ShopDocument[]>;
    verifyShop(id: string, body: {
        status: string;
        notes?: string;
    }): Promise<import("./shop.schema").ShopDocument | null>;
}
