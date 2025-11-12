import { Document, Types } from 'mongoose';
export type ShopDocument = Shop & Document;
export declare class Shop {
    name: string;
    email: string;
    phone: string;
    tillNumber?: string;
    ownerId?: Types.ObjectId;
    address?: string;
    city?: string;
    country?: string;
    businessType?: string;
    kraPin?: string;
    language: 'en' | 'sw';
    status: 'pending' | 'verified' | 'active' | 'suspended';
    verificationDate?: Date;
    verificationNotes?: string;
    cashierCount: number;
    totalSales: number;
    totalOrders: number;
    settings: Record<string, any>;
    onboardingComplete: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ShopSchema: import("mongoose").Schema<Shop, import("mongoose").Model<Shop, any, any, any, Document<unknown, any, Shop, any, {}> & Shop & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Shop, Document<unknown, {}, import("mongoose").FlatRecord<Shop>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Shop> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
