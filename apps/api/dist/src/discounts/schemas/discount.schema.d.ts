import { HydratedDocument, Types } from 'mongoose';
export type DiscountDocument = HydratedDocument<Discount>;
export declare class DiscountRule {
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    applicableProducts?: Types.ObjectId[];
    applicableCategories?: Types.ObjectId[];
    validFrom: Date;
    validTo: Date;
    applicableDays?: string[];
    applicableHours?: {
        start: number;
        end: number;
    };
    customerSegments?: string[];
}
export declare const DiscountRuleSchema: import("mongoose").Schema<DiscountRule, import("mongoose").Model<DiscountRule, any, any, any, import("mongoose").Document<unknown, any, DiscountRule, any, {}> & DiscountRule & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, DiscountRule, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<DiscountRule>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<DiscountRule> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class Discount {
    shopId: Types.ObjectId;
    name: string;
    type: 'percentage' | 'fixed' | 'bogo' | 'tiered' | 'coupon';
    value: number;
    rules: DiscountRule;
    usageLimit?: number;
    usageCount: number;
    requiresApproval?: boolean;
    status: 'active' | 'inactive';
    createdBy: Types.ObjectId;
    isDefault?: boolean;
}
export declare const DiscountSchema: import("mongoose").Schema<Discount, import("mongoose").Model<Discount, any, any, any, import("mongoose").Document<unknown, any, Discount, any, {}> & Discount & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Discount, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Discount>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Discount> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
