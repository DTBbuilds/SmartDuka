import { HydratedDocument, Types } from 'mongoose';
export type LoyaltyProgramDocument = HydratedDocument<LoyaltyProgram>;
export declare class LoyaltyTier {
    name: string;
    minPoints: number;
    discountPercentage: number;
    bonusPointsMultiplier: number;
}
export declare const LoyaltyTierSchema: import("mongoose").Schema<LoyaltyTier, import("mongoose").Model<LoyaltyTier, any, any, any, import("mongoose").Document<unknown, any, LoyaltyTier, any, {}> & LoyaltyTier & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LoyaltyTier, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<LoyaltyTier>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<LoyaltyTier> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
export declare class LoyaltyProgram {
    shopId: Types.ObjectId;
    name: string;
    description?: string;
    pointsPerKsh: number;
    pointsExpiryDays: number;
    tiers: LoyaltyTier[];
    enableBirthdayBonus: boolean;
    birthdayBonusPoints: number;
    enableReferralBonus: boolean;
    referralBonusPoints: number;
    status: 'active' | 'inactive';
}
export declare const LoyaltyProgramSchema: import("mongoose").Schema<LoyaltyProgram, import("mongoose").Model<LoyaltyProgram, any, any, any, import("mongoose").Document<unknown, any, LoyaltyProgram, any, {}> & LoyaltyProgram & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LoyaltyProgram, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<LoyaltyProgram>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<LoyaltyProgram> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
