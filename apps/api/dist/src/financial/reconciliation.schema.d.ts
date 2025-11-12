import { HydratedDocument, Types } from 'mongoose';
export type ReconciliationDocument = HydratedDocument<Reconciliation>;
export declare class VarianceRecord {
    type: 'cash' | 'payment' | 'inventory' | 'other';
    amount: number;
    description?: string;
    investigationNotes?: string;
    status?: string;
}
export declare const VarianceRecordSchema: import("mongoose").Schema<VarianceRecord, import("mongoose").Model<VarianceRecord, any, any, any, import("mongoose").Document<unknown, any, VarianceRecord, any, {}> & VarianceRecord & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, VarianceRecord, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<VarianceRecord>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<VarianceRecord> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class Reconciliation {
    shopId: Types.ObjectId;
    reconciliationDate: Date;
    expectedCash: number;
    actualCash: number;
    variance: number;
    variancePercentage: number;
    status: 'pending' | 'reconciled' | 'variance_pending';
    variances?: VarianceRecord[];
    reconciliationNotes?: string;
    reconciledBy: string;
    reconciliationTime: Date;
    approvedBy?: string;
    approvalTime?: Date;
}
export declare const ReconciliationSchema: import("mongoose").Schema<Reconciliation, import("mongoose").Model<Reconciliation, any, any, any, import("mongoose").Document<unknown, any, Reconciliation, any, {}> & Reconciliation & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Reconciliation, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Reconciliation>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Reconciliation> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
