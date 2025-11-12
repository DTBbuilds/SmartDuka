import { Model } from 'mongoose';
import { ShopDocument } from './shop.schema';
export interface CreateShopDto {
    name: string;
    email: string;
    phone: string;
    tillNumber?: string;
    address?: string;
    city?: string;
    country?: string;
    businessType?: string;
    kraPin?: string;
    language?: 'en' | 'sw';
}
export interface UpdateShopDto {
    name?: string;
    tillNumber?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
    businessType?: string;
    kraPin?: string;
    language?: 'en' | 'sw';
    status?: 'pending' | 'verified' | 'active' | 'suspended';
    settings?: Record<string, any>;
    onboardingComplete?: boolean;
}
export declare class ShopsService {
    private readonly shopModel;
    private readonly logger;
    constructor(shopModel: Model<ShopDocument>);
    create(ownerId: string, dto: CreateShopDto): Promise<ShopDocument>;
    findById(shopId: string): Promise<ShopDocument | null>;
    findByOwner(ownerId: string): Promise<ShopDocument | null>;
    update(shopId: string, dto: UpdateShopDto): Promise<ShopDocument | null>;
    completeOnboarding(shopId: string): Promise<ShopDocument | null>;
    updateSettings(shopId: string, settings: Record<string, any>): Promise<ShopDocument | null>;
    updateLanguage(shopId: string, language: 'en' | 'sw'): Promise<ShopDocument | null>;
    findByEmail(email: string): Promise<ShopDocument | null>;
    findByPhone(phone: string): Promise<ShopDocument | null>;
    updateStatus(shopId: string, status: 'pending' | 'verified' | 'active' | 'suspended', notes?: string): Promise<ShopDocument | null>;
    incrementCashierCount(shopId: string): Promise<void>;
    decrementCashierCount(shopId: string): Promise<void>;
    getStats(shopId: string): Promise<any>;
    getPendingShops(): Promise<ShopDocument[]>;
    getActiveShops(): Promise<ShopDocument[]>;
    findAll(): Promise<any[]>;
}
