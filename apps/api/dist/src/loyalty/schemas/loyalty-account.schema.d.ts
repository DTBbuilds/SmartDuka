import { HydratedDocument, Types } from 'mongoose';
export type LoyaltyAccountDocument = HydratedDocument<LoyaltyAccount>;
export declare class PointsTransaction {
    type: 'earn' | 'redeem' | 'expire' | 'bonus' | 'adjustment';
    amount: number;
    reason?: string;
    createdAt: Date;
}
export declare const PointsTransactionSchema: import("mongoose").Schema<PointsTransaction, import("mongoose").Model<PointsTransaction, any, any, any, import("mongoose").Document<unknown, any, PointsTransaction, any, {}> & PointsTransaction & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PointsTransaction, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<PointsTransaction>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<PointsTransaction> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class LoyaltyAccount {
    shopId: Types.ObjectId;
    customerId: Types.ObjectId;
    programId: Types.ObjectId;
    totalPoints: number;
    availablePoints: number;
    redeemedPoints: number;
    tier: string;
    transactions: PointsTransaction[];
    lastEarnedAt?: Date;
    lastRedeemedAt?: Date;
    birthdayBonusClaimedAt?: Date;
    referralCode?: string;
    referralCount: number;
    status: 'active' | 'suspended';
}
export declare const LoyaltyAccountSchema: import("mongoose").Schema<LoyaltyAccount, import("mongoose").Model<LoyaltyAccount, any, any, any, import("mongoose").Document<unknown, any, LoyaltyAccount, any, {}> & LoyaltyAccount & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LoyaltyAccount, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<LoyaltyAccount>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<LoyaltyAccount> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
