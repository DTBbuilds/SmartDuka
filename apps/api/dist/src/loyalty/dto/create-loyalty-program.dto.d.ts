export declare class LoyaltyTierDto {
    name: string;
    minPoints: number;
    discountPercentage: number;
    bonusPointsMultiplier: number;
}
export declare class CreateLoyaltyProgramDto {
    name: string;
    description?: string;
    pointsPerKsh: number;
    pointsExpiryDays: number;
    tiers: LoyaltyTierDto[];
    enableBirthdayBonus?: boolean;
    birthdayBonusPoints?: number;
    enableReferralBonus?: boolean;
    referralBonusPoints?: number;
}
