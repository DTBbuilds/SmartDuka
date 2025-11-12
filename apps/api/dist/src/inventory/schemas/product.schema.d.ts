import { HydratedDocument, Types } from 'mongoose';
export type ProductDocument = HydratedDocument<Product>;
export declare class Product {
    shopId: Types.ObjectId;
    name: string;
    sku?: string;
    barcode?: string;
    categoryId?: Types.ObjectId;
    price: number;
    cost?: number;
    stock?: number;
    tax?: number;
    status: 'active' | 'inactive';
    expiryDate?: Date;
    batchNumber?: string;
    lotNumber?: string;
    reorderPoint?: number;
    reorderQuantity?: number;
    preferredSupplierId?: Types.ObjectId;
    leadTimeDays?: number;
    lastRestockDate?: Date;
    branchId?: Types.ObjectId;
    branchInventory?: {
        [branchId: string]: {
            stock: number;
            reorderPoint?: number;
            reorderQuantity?: number;
            lastRestockDate?: Date;
        };
    };
}
export declare const ProductSchema: import("mongoose").Schema<Product, import("mongoose").Model<Product, any, any, any, import("mongoose").Document<unknown, any, Product, any, {}> & Product & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Product, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Product>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Product> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
