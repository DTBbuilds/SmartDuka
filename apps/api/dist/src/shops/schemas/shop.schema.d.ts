import { HydratedDocument, Types } from 'mongoose';
export type ShopDocument = HydratedDocument<Shop>;
export declare class Shop {
    name: string;
    email: string;
    phone: string;
    shopId: string;
    address?: string;
    city?: string;
    businessType?: string;
    kraPin?: string;
    status: 'pending' | 'verified' | 'active' | 'suspended' | 'rejected' | 'flagged';
    verificationBy?: Types.ObjectId;
    verificationDate?: Date;
    verificationNotes?: string;
    rejectionDate?: Date;
    rejectionReason?: string;
    suspensionDate?: Date;
    suspensionReason?: string;
    complianceScore: number;
    chargebackRate: number;
    refundRate: number;
    violationCount: number;
    lastActivityDate?: Date;
    isMonitored: boolean;
    isFlagged: boolean;
    flagReason?: string;
    openTickets: number;
    lastSupportTicketDate?: Date;
    cashierCount: number;
    totalSales: number;
    totalOrders: number;
}
export declare const ShopSchema: import("mongoose").Schema<Shop, import("mongoose").Model<Shop, any, any, any, import("mongoose").Document<unknown, any, Shop, any, {}> & Shop & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Shop, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Shop>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Shop> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
