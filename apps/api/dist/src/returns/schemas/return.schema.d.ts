import { HydratedDocument, Types } from 'mongoose';
export type ReturnDocument = HydratedDocument<Return>;
export declare class ReturnItem {
    productId: Types.ObjectId;
    productName: string;
    quantity: number;
    unitPrice: number;
    reason: string;
}
export declare const ReturnItemSchema: import("mongoose").Schema<ReturnItem, import("mongoose").Model<ReturnItem, any, any, any, import("mongoose").Document<unknown, any, ReturnItem, any, {}> & ReturnItem & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ReturnItem, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<ReturnItem>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<ReturnItem> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class Return {
    shopId: Types.ObjectId;
    orderId: Types.ObjectId;
    items: ReturnItem[];
    totalRefundAmount: number;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    requestedBy: Types.ObjectId;
    approvedBy?: Types.ObjectId;
    approvalNotes?: string;
    returnWindow: number;
    completedAt?: Date;
    inventoryAdjusted: boolean;
}
export declare const ReturnSchema: import("mongoose").Schema<Return, import("mongoose").Model<Return, any, any, any, import("mongoose").Document<unknown, any, Return, any, {}> & Return & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Return, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Return>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Return> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
