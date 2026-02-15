import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { nanoid } from 'nanoid';
import { LoyaltyProgram, LoyaltyProgramDocument } from './schemas/loyalty-program.schema';
import { LoyaltyAccount, LoyaltyAccountDocument } from './schemas/loyalty-account.schema';
import { CreateLoyaltyProgramDto } from './dto/create-loyalty-program.dto';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectModel(LoyaltyProgram.name)
    private loyaltyProgramModel: Model<LoyaltyProgramDocument>,
    @InjectModel(LoyaltyAccount.name)
    private loyaltyAccountModel: Model<LoyaltyAccountDocument>,
  ) {}

  async createProgram(
    shopId: string,
    dto: CreateLoyaltyProgramDto,
  ): Promise<LoyaltyProgramDocument> {
    const program = new this.loyaltyProgramModel({
      shopId: new Types.ObjectId(shopId),
      ...dto,
    });

    return program.save();
  }

  async getProgram(shopId: string): Promise<LoyaltyProgramDocument | null> {
    return this.loyaltyProgramModel
      .findOne({
        shopId: new Types.ObjectId(shopId),
        status: 'active',
      })
      .exec();
  }

  async updateProgram(
    id: string,
    dto: Partial<CreateLoyaltyProgramDto>,
  ): Promise<LoyaltyProgramDocument | null> {
    return this.loyaltyProgramModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
  }

  async enrollCustomer(
    shopId: string,
    customerId: string,
    programId: string,
  ): Promise<LoyaltyAccountDocument> {
    // Check if already enrolled
    const existing = await this.loyaltyAccountModel
      .findOne({
        shopId: new Types.ObjectId(shopId),
        customerId: new Types.ObjectId(customerId),
        programId: new Types.ObjectId(programId),
      })
      .exec();

    if (existing) {
      return existing;
    }

    const account = new this.loyaltyAccountModel({
      shopId: new Types.ObjectId(shopId),
      customerId: new Types.ObjectId(customerId),
      programId: new Types.ObjectId(programId),
      tier: 'Bronze',
      referralCode: `REF-${nanoid(8).toUpperCase()}`,
      transactions: [],
    });

    return account.save();
  }

  async earnPoints(
    shopId: string,
    customerId: string,
    amount: number,
    reason: string = 'purchase',
  ): Promise<LoyaltyAccountDocument | null> {
    let account = await this.loyaltyAccountModel
      .findOne({
        shopId: new Types.ObjectId(shopId),
        customerId: new Types.ObjectId(customerId),
      })
      .exec();

    if (!account) {
      // Auto-enroll customer in active loyalty program
      const enrolled = await this.autoEnrollCustomer(shopId, customerId);
      if (!enrolled) {
        return null; // No active program, skip silently
      }
      // Re-fetch to get consistent document type
      account = await this.loyaltyAccountModel
        .findOne({
          shopId: new Types.ObjectId(shopId),
          customerId: new Types.ObjectId(customerId),
        })
        .exec();
      if (!account) {
        return null;
      }
    }

    const program = await this.loyaltyProgramModel.findById(account.programId).exec();
    if (!program) {
      throw new BadRequestException('Loyalty program not found');
    }

    // Calculate points
    const basePoints = Math.floor(amount / (100 / program.pointsPerKsh));
    const tierMultiplier = this.getTierMultiplier(program, account.tier);
    const earnedPoints = Math.floor(basePoints * tierMultiplier);

    // Update account
    account.totalPoints += earnedPoints;
    account.availablePoints += earnedPoints;
    account.lastEarnedAt = new Date();

    // Add transaction
    account.transactions.push({
      type: 'earn',
      amount: earnedPoints,
      reason,
      createdAt: new Date(),
    });

    // Update tier
    account.tier = this.calculateTier(program, account.totalPoints);

    return account.save();
  }

  async redeemPoints(
    shopId: string,
    customerId: string,
    points: number,
  ): Promise<LoyaltyAccountDocument | null> {
    const account = await this.loyaltyAccountModel
      .findOne({
        shopId: new Types.ObjectId(shopId),
        customerId: new Types.ObjectId(customerId),
      })
      .exec();

    if (!account) {
      throw new BadRequestException('Loyalty account not found');
    }

    if (account.availablePoints < points) {
      throw new BadRequestException('Insufficient points');
    }

    account.availablePoints -= points;
    account.redeemedPoints += points;
    account.lastRedeemedAt = new Date();

    account.transactions.push({
      type: 'redeem',
      amount: points,
      reason: 'redemption',
      createdAt: new Date(),
    });

    return account.save();
  }

  async claimBirthdayBonus(
    shopId: string,
    customerId: string,
  ): Promise<LoyaltyAccountDocument | null> {
    const account = await this.loyaltyAccountModel
      .findOne({
        shopId: new Types.ObjectId(shopId),
        customerId: new Types.ObjectId(customerId),
      })
      .exec();

    if (!account) {
      throw new BadRequestException('Loyalty account not found');
    }

    const program = await this.loyaltyProgramModel.findById(account.programId).exec();
    if (!program || !program.enableBirthdayBonus) {
      throw new BadRequestException('Birthday bonus not available');
    }

    // Check if already claimed this year
    if (account.birthdayBonusClaimedAt) {
      const lastClaim = new Date(account.birthdayBonusClaimedAt);
      const today = new Date();
      if (lastClaim.getFullYear() === today.getFullYear()) {
        throw new BadRequestException('Birthday bonus already claimed this year');
      }
    }

    account.totalPoints += program.birthdayBonusPoints;
    account.availablePoints += program.birthdayBonusPoints;
    account.birthdayBonusClaimedAt = new Date();

    account.transactions.push({
      type: 'bonus',
      amount: program.birthdayBonusPoints,
      reason: 'birthday_bonus',
      createdAt: new Date(),
    });

    return account.save();
  }

  async claimReferralBonus(
    shopId: string,
    referralCode: string,
  ): Promise<LoyaltyAccountDocument | null> {
    const referrerAccount = await this.loyaltyAccountModel
      .findOne({
        shopId: new Types.ObjectId(shopId),
        referralCode,
      })
      .exec();

    if (!referrerAccount) {
      throw new BadRequestException('Invalid referral code');
    }

    const program = await this.loyaltyProgramModel.findById(referrerAccount.programId).exec();
    if (!program || !program.enableReferralBonus) {
      throw new BadRequestException('Referral bonus not available');
    }

    referrerAccount.totalPoints += program.referralBonusPoints;
    referrerAccount.availablePoints += program.referralBonusPoints;
    referrerAccount.referralCount += 1;

    referrerAccount.transactions.push({
      type: 'bonus',
      amount: program.referralBonusPoints,
      reason: 'referral_bonus',
      createdAt: new Date(),
    });

    return referrerAccount.save();
  }

  async getAccount(
    shopId: string,
    customerId: string,
  ): Promise<LoyaltyAccountDocument | null> {
    return this.loyaltyAccountModel
      .findOne({
        shopId: new Types.ObjectId(shopId),
        customerId: new Types.ObjectId(customerId),
      })
      .exec();
  }

  async getTopCustomers(shopId: string, limit = 10): Promise<LoyaltyAccountDocument[]> {
    return this.loyaltyAccountModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .sort({ totalPoints: -1 })
      .limit(limit)
      .exec();
  }

  private getTierMultiplier(program: LoyaltyProgramDocument, tier: string): number {
    const tierData = program.tiers.find((t) => t.name === tier);
    return tierData?.bonusPointsMultiplier || 1;
  }

  private calculateTier(program: LoyaltyProgramDocument, totalPoints: number): string {
    let tier = program.tiers[0]?.name || 'Bronze';

    for (const t of program.tiers) {
      if (totalPoints >= t.minPoints) {
        tier = t.name;
      }
    }

    return tier;
  }

  async autoEnrollCustomer(
    shopId: string,
    customerId: string,
  ): Promise<LoyaltyAccountDocument | null> {
    // Find active loyalty program for this shop
    const program = await this.loyaltyProgramModel
      .findOne({
        shopId: new Types.ObjectId(shopId),
        status: 'active',
      })
      .exec();

    if (!program) {
      return null; // No active program, skip enrollment silently
    }

    // Enroll customer in the active program
    return this.enrollCustomer(shopId, customerId, program._id.toString());
  }

  async getPointsPreview(
    shopId: string,
    customerId: string,
    purchaseAmount: number,
  ): Promise<{
    pointsToEarn: number;
    currentPoints: number;
    newBalance: number;
    currentTier: string;
    nextTier: string | null;
    pointsToNextTier: number;
    tierProgress: number;
  }> {
    const account = await this.loyaltyAccountModel
      .findOne({
        shopId: new Types.ObjectId(shopId),
        customerId: new Types.ObjectId(customerId),
      })
      .exec();

    if (!account) {
      return {
        pointsToEarn: 0,
        currentPoints: 0,
        newBalance: 0,
        currentTier: 'none',
        nextTier: null,
        pointsToNextTier: 0,
        tierProgress: 0,
      };
    }

    const program = await this.loyaltyProgramModel.findById(account.programId).exec();
    if (!program) {
      return {
        pointsToEarn: 0,
        currentPoints: account.availablePoints,
        newBalance: account.availablePoints,
        currentTier: account.tier,
        nextTier: null,
        pointsToNextTier: 0,
        tierProgress: 0,
      };
    }

    // Calculate points to earn
    const basePoints = Math.floor(purchaseAmount / (100 / program.pointsPerKsh));
    const tierMultiplier = this.getTierMultiplier(program, account.tier);
    const pointsToEarn = Math.floor(basePoints * tierMultiplier);

    // Calculate tier progress
    const sortedTiers = [...program.tiers].sort((a, b) => a.minPoints - b.minPoints);
    const currentTierIndex = sortedTiers.findIndex((t) => t.name === account.tier);
    const nextTierData = currentTierIndex < sortedTiers.length - 1
      ? sortedTiers[currentTierIndex + 1]
      : null;

    const projectedTotal = account.totalPoints + pointsToEarn;
    const pointsToNextTier = nextTierData
      ? Math.max(0, nextTierData.minPoints - projectedTotal)
      : 0;

    const currentTierMin = sortedTiers[currentTierIndex]?.minPoints || 0;
    const nextTierMin = nextTierData?.minPoints || currentTierMin;
    const tierRange = nextTierMin - currentTierMin;
    const tierProgress = tierRange > 0
      ? Math.min(100, Math.round(((projectedTotal - currentTierMin) / tierRange) * 100))
      : 100;

    return {
      pointsToEarn,
      currentPoints: account.availablePoints,
      newBalance: account.availablePoints + pointsToEarn,
      currentTier: account.tier,
      nextTier: nextTierData?.name || null,
      pointsToNextTier,
      tierProgress,
    };
  }

  async getRecentLoyaltyCustomers(
    shopId: string,
    limit = 5,
  ): Promise<LoyaltyAccountDocument[]> {
    return this.loyaltyAccountModel
      .find({
        shopId: new Types.ObjectId(shopId),
        lastEarnedAt: { $ne: null },
      })
      .sort({ lastEarnedAt: -1 })
      .limit(limit)
      .exec();
  }

  async getLoyaltyStats(shopId: string): Promise<{
    totalMembers: number;
    totalPointsIssued: number;
    totalPointsRedeemed: number;
    averagePointsPerMember: number;
    topTier: string;
  }> {
    const accounts = await this.loyaltyAccountModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .exec();

    const totalPointsIssued = accounts.reduce((sum, a) => sum + a.totalPoints, 0);
    const totalPointsRedeemed = accounts.reduce((sum, a) => sum + a.redeemedPoints, 0);

    return {
      totalMembers: accounts.length,
      totalPointsIssued,
      totalPointsRedeemed,
      averagePointsPerMember: accounts.length > 0 ? totalPointsIssued / accounts.length : 0,
      topTier: accounts.length > 0 ? accounts[0].tier : 'N/A',
    };
  }
}
