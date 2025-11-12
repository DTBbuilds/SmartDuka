import { HydratedDocument, Types } from 'mongoose';
export type DiscountAuditDocument = HydratedDocument<DiscountAudit>;
export declare class DiscountAudit {
    shopId: Types.ObjectId;
    discountId: Types.ObjectId;
    orderId: Types.ObjectId;
    amount: number;
    appliedBy: Types.ObjectId;
    approvedBy?: Types.ObjectId;
    reason?: string;
    status: 'pending' | 'approved' | 'rejected';
}
export declare const DiscountAuditSchema: import("mongoose").Schema<DiscountAudit, import("mongoose").Model<DiscountAudit, any, any, any, import("mongoose").Document<unknown, any, DiscountAudit, any, {}> & DiscountAudit & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, DiscountAudit, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<DiscountAudit>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<DiscountAudit> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
