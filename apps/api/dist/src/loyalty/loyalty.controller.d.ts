import { LoyaltyService } from './loyalty.service';
import { CreateLoyaltyProgramDto } from './dto/create-loyalty-program.dto';
export declare class LoyaltyController {
    private readonly loyaltyService;
    constructor(loyaltyService: LoyaltyService);
    createProgram(dto: CreateLoyaltyProgramDto, user: Record<string, any>): Promise<import("mongoose").Document<unknown, {}, import("./schemas/loyalty-program.schema").LoyaltyProgram, {}, {}> & import("./schemas/loyalty-program.schema").LoyaltyProgram & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getProgram(user: Record<string, any>): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/loyalty-program.schema").LoyaltyProgram, {}, {}> & import("./schemas/loyalty-program.schema").LoyaltyProgram & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
    updateProgram(id: string, dto: Partial<CreateLoyaltyProgramDto>): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/loyalty-program.schema").LoyaltyProgram, {}, {}> & import("./schemas/loyalty-program.schema").LoyaltyProgram & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
    enrollCustomer(customerId: string, programId: string, user: Record<string, any>): Promise<import("mongoose").Document<unknown, {}, import("./schemas/loyalty-account.schema").LoyaltyAccount, {}, {}> & import("./schemas/loyalty-account.schema").LoyaltyAccount & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    earnPoints(customerId: string, dto: {
        amount: number;
        reason?: string;
    }, user: Record<string, any>): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/loyalty-account.schema").LoyaltyAccount, {}, {}> & import("./schemas/loyalty-account.schema").LoyaltyAccount & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
    redeemPoints(customerId: string, dto: {
        points: number;
    }, user: Record<string, any>): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/loyalty-account.schema").LoyaltyAccount, {}, {}> & import("./schemas/loyalty-account.schema").LoyaltyAccount & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
    claimBirthdayBonus(customerId: string, user: Record<string, any>): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/loyalty-account.schema").LoyaltyAccount, {}, {}> & import("./schemas/loyalty-account.schema").LoyaltyAccount & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
    claimReferralBonus(dto: {
        referralCode: string;
    }, user: Record<string, any>): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/loyalty-account.schema").LoyaltyAccount, {}, {}> & import("./schemas/loyalty-account.schema").LoyaltyAccount & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
    getAccount(customerId: string, user: Record<string, any>): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/loyalty-account.schema").LoyaltyAccount, {}, {}> & import("./schemas/loyalty-account.schema").LoyaltyAccount & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
    getTopCustomers(limit: string, user: Record<string, any>): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/loyalty-account.schema").LoyaltyAccount, {}, {}> & import("./schemas/loyalty-account.schema").LoyaltyAccount & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getStats(user: Record<string, any>): Promise<{
        totalMembers: number;
        totalPointsIssued: number;
        totalPointsRedeemed: number;
        averagePointsPerMember: number;
        topTier: string;
    }>;
}
