import { Document, Types } from 'mongoose';
export type BranchDocument = Branch & Document;
export declare class Branch {
    shopId: Types.ObjectId;
    name: string;
    code: string;
    address?: string;
    phone?: string;
    email?: string;
    createdBy: Types.ObjectId;
    status: 'active' | 'inactive';
    inventoryType: 'shared' | 'separate';
    openingTime?: string;
    closingTime?: string;
    timezone?: string;
    metadata?: {
        manager?: Types.ObjectId;
        managerName?: string;
        managerPhone?: string;
        notes?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const BranchSchema: import("mongoose").Schema<Branch, import("mongoose").Model<Branch, any, any, any, Document<unknown, any, Branch, any, {}> & Branch & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Branch, Document<unknown, {}, import("mongoose").FlatRecord<Branch>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Branch> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
