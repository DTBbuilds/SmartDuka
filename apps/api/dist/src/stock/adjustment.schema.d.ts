import { Document, Types } from 'mongoose';
export type AdjustmentDocument = Adjustment & Document;
export declare class Adjustment {
    productId: Types.ObjectId;
    productName: string;
    delta: number;
    reason: 'damage' | 'loss' | 'recount' | 'return' | 'correction' | 'other';
    description?: string;
    shopId: Types.ObjectId;
    adjustedBy?: Types.ObjectId;
    reference?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const AdjustmentSchema: import("mongoose").Schema<Adjustment, import("mongoose").Model<Adjustment, any, any, any, Document<unknown, any, Adjustment, any, {}> & Adjustment & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Adjustment, Document<unknown, {}, import("mongoose").FlatRecord<Adjustment>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Adjustment> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
