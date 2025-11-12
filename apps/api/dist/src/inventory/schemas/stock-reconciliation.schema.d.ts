import { HydratedDocument, Types } from 'mongoose';
export type StockReconciliationDocument = HydratedDocument<StockReconciliation>;
export declare class StockReconciliation {
    shopId: Types.ObjectId;
    productId: Types.ObjectId;
    systemQuantity: number;
    physicalCount: number;
    variance: number;
    reconciliationDate: Date;
    reconcililedBy: Types.ObjectId;
    notes?: string;
}
export declare const StockReconciliationSchema: import("mongoose").Schema<StockReconciliation, import("mongoose").Model<StockReconciliation, any, any, any, import("mongoose").Document<unknown, any, StockReconciliation, any, {}> & StockReconciliation & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, StockReconciliation, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<StockReconciliation>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<StockReconciliation> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
