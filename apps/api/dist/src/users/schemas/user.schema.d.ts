import { HydratedDocument, Types } from 'mongoose';
export type UserDocument = HydratedDocument<User>;
export declare class User {
    shopId: Types.ObjectId;
    email: string;
    phone?: string;
    role: 'admin' | 'branch_admin' | 'branch_manager' | 'supervisor' | 'cashier';
    passwordHash: string;
    status: 'active' | 'disabled';
    name?: string;
    totalSales?: number;
    pinHash?: string;
    cashierId?: string;
    sessionTimeout?: number;
    permissions?: {
        canVoid?: boolean;
        canRefund?: boolean;
        canDiscount?: boolean;
        maxDiscountAmount?: number;
        maxRefundAmount?: number;
        voidRequiresApproval?: boolean;
        refundRequiresApproval?: boolean;
        discountRequiresApproval?: boolean;
        restrictedCategories?: string[];
    };
    lastLoginAt?: Date;
    lastActivityAt?: Date;
    branchId?: Types.ObjectId;
    branches?: Types.ObjectId[];
    branchPermissions?: {
        [branchId: string]: {
            canVoid?: boolean;
            canRefund?: boolean;
            canDiscount?: boolean;
            maxDiscountAmount?: number;
            canManageInventory?: boolean;
            canViewReports?: boolean;
            canManageStaff?: boolean;
            canApproveTransactions?: boolean;
        };
    };
    requiresApprovalFor?: {
        voids?: boolean;
        refunds?: boolean;
        discounts?: boolean;
        minAmount?: number;
    };
    lastBranchId?: Types.ObjectId;
    googleId?: string;
    avatarUrl?: string;
    authProvider: 'local' | 'google';
}
export declare const UserSchema: import("mongoose").Schema<User, import("mongoose").Model<User, any, any, any, import("mongoose").Document<unknown, any, User, any, {}> & User & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, User, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<User>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<User> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
