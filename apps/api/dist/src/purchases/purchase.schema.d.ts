import { Document, Types } from 'mongoose';
export interface PurchaseItem {
    productId: Types.ObjectId;
    productName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
}
export type PurchaseDocument = Purchase & Document;
export declare class Purchase {
    purchaseNumber: string;
    supplierId: Types.ObjectId;
    shopId: Types.ObjectId;
    branchId?: Types.ObjectId;
    items: PurchaseItem[];
    totalCost: number;
    status: 'pending' | 'received' | 'cancelled';
    expectedDeliveryDate?: Date;
    receivedDate?: Date;
    invoiceNumber?: string;
    notes?: string;
    createdBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const PurchaseSchema: import("mongoose").Schema<Purchase, import("mongoose").Model<Purchase, any, any, any, Document<unknown, any, Purchase, any, {}> & Purchase & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Purchase, Document<unknown, {}, import("mongoose").FlatRecord<Purchase>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Purchase> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
