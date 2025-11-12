import { HydratedDocument, Types } from 'mongoose';
export type StockAdjustmentDocument = HydratedDocument<StockAdjustment>;
export declare class StockAdjustment {
    shopId: Types.ObjectId;
    productId: Types.ObjectId;
    quantityChange: number;
    reason: 'damage' | 'loss' | 'correction' | 'return' | 'other';
    notes?: string;
    adjustedBy: Types.ObjectId;
}
export declare const StockAdjustmentSchema: import("mongoose").Schema<StockAdjustment, import("mongoose").Model<StockAdjustment, any, any, any, import("mongoose").Document<unknown, any, StockAdjustment, any, {}> & StockAdjustment & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, StockAdjustment, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<StockAdjustment>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<StockAdjustment> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
