import { Model } from 'mongoose';
import { LoyaltyProgramDocument } from './schemas/loyalty-program.schema';
import { LoyaltyAccountDocument } from './schemas/loyalty-account.schema';
import { CreateLoyaltyProgramDto } from './dto/create-loyalty-program.dto';
export declare class LoyaltyService {
    private loyaltyProgramModel;
    private loyaltyAccountModel;
    constructor(loyaltyProgramModel: Model<LoyaltyProgramDocument>, loyaltyAccountModel: Model<LoyaltyAccountDocument>);
    createProgram(shopId: string, dto: CreateLoyaltyProgramDto): Promise<LoyaltyProgramDocument>;
    getProgram(shopId: string): Promise<LoyaltyProgramDocument | null>;
    updateProgram(id: string, dto: Partial<CreateLoyaltyProgramDto>): Promise<LoyaltyProgramDocument | null>;
    enrollCustomer(shopId: string, customerId: string, programId: string): Promise<LoyaltyAccountDocument>;
    earnPoints(shopId: string, customerId: string, amount: number, reason?: string): Promise<LoyaltyAccountDocument | null>;
    redeemPoints(shopId: string, customerId: string, points: number): Promise<LoyaltyAccountDocument | null>;
    claimBirthdayBonus(shopId: string, customerId: string): Promise<LoyaltyAccountDocument | null>;
    claimReferralBonus(shopId: string, referralCode: string): Promise<LoyaltyAccountDocument | null>;
    getAccount(shopId: string, customerId: string): Promise<LoyaltyAccountDocument | null>;
    getTopCustomers(shopId: string, limit?: number): Promise<LoyaltyAccountDocument[]>;
    private getTierMultiplier;
    private calculateTier;
    getLoyaltyStats(shopId: string): Promise<{
        totalMembers: number;
        totalPointsIssued: number;
        totalPointsRedeemed: number;
        averagePointsPerMember: number;
        topTier: string;
    }>;
}
