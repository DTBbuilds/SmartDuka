import { Document, Types } from 'mongoose';
export type SupplierDocument = Supplier & Document;
export declare class Supplier {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
    taxId?: string;
    paymentTerms?: string;
    status: 'active' | 'inactive';
    shopId: Types.ObjectId;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const SupplierSchema: import("mongoose").Schema<Supplier, import("mongoose").Model<Supplier, any, any, any, Document<unknown, any, Supplier, any, {}> & Supplier & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Supplier, Document<unknown, {}, import("mongoose").FlatRecord<Supplier>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Supplier> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
