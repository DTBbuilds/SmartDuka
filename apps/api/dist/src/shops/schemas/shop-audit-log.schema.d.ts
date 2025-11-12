import { HydratedDocument, Types } from 'mongoose';
export type ShopAuditLogDocument = HydratedDocument<ShopAuditLog>;
export declare class ShopAuditLog {
    shopId: Types.ObjectId;
    performedBy: Types.ObjectId;
    action: string;
    oldValue?: Record<string, any>;
    newValue?: Record<string, any>;
    reason?: string;
    notes?: string;
    createdAt: Date;
}
export declare const ShopAuditLogSchema: import("mongoose").Schema<ShopAuditLog, import("mongoose").Model<ShopAuditLog, any, any, any, import("mongoose").Document<unknown, any, ShopAuditLog, any, {}> & ShopAuditLog & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ShopAuditLog, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<ShopAuditLog>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<ShopAuditLog> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
