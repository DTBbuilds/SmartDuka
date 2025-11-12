import { HydratedDocument, Types } from 'mongoose';
export type ShiftDocument = HydratedDocument<Shift>;
export declare class Shift {
    shopId: Types.ObjectId;
    cashierId: Types.ObjectId;
    cashierName: string;
    startTime: Date;
    endTime?: Date;
    openingBalance: number;
    closingBalance?: number;
    expectedCash?: number;
    actualCash?: number;
    variance?: number;
    status: 'open' | 'closed' | 'reconciled';
    notes?: string;
    reconciliedBy?: Types.ObjectId;
    reconciliedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ShiftSchema: import("mongoose").Schema<Shift, import("mongoose").Model<Shift, any, any, any, import("mongoose").Document<unknown, any, Shift, any, {}> & Shift & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Shift, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Shift>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Shift> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
