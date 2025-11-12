"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoyaltyService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const nanoid_1 = require("nanoid");
const loyalty_program_schema_1 = require("./schemas/loyalty-program.schema");
const loyalty_account_schema_1 = require("./schemas/loyalty-account.schema");
let LoyaltyService = class LoyaltyService {
    loyaltyProgramModel;
    loyaltyAccountModel;
    constructor(loyaltyProgramModel, loyaltyAccountModel) {
        this.loyaltyProgramModel = loyaltyProgramModel;
        this.loyaltyAccountModel = loyaltyAccountModel;
    }
    async createProgram(shopId, dto) {
        const program = new this.loyaltyProgramModel({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            ...dto,
        });
        return program.save();
    }
    async getProgram(shopId) {
        return this.loyaltyProgramModel
            .findOne({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            status: 'active',
        })
            .exec();
    }
    async updateProgram(id, dto) {
        return this.loyaltyProgramModel
            .findByIdAndUpdate(id, dto, { new: true })
            .exec();
    }
    async enrollCustomer(shopId, customerId, programId) {
        const existing = await this.loyaltyAccountModel
            .findOne({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            customerId: new mongoose_2.Types.ObjectId(customerId),
            programId: new mongoose_2.Types.ObjectId(programId),
        })
            .exec();
        if (existing) {
            return existing;
        }
        const account = new this.loyaltyAccountModel({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            customerId: new mongoose_2.Types.ObjectId(customerId),
            programId: new mongoose_2.Types.ObjectId(programId),
            tier: 'Bronze',
            referralCode: `REF-${(0, nanoid_1.nanoid)(8).toUpperCase()}`,
            transactions: [],
        });
        return account.save();
    }
    async earnPoints(shopId, customerId, amount, reason = 'purchase') {
        const account = await this.loyaltyAccountModel
            .findOne({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            customerId: new mongoose_2.Types.ObjectId(customerId),
        })
            .exec();
        if (!account) {
            throw new common_1.BadRequestException('Loyalty account not found');
        }
        const program = await this.loyaltyProgramModel.findById(account.programId).exec();
        if (!program) {
            throw new common_1.BadRequestException('Loyalty program not found');
        }
        const basePoints = Math.floor(amount / (100 / program.pointsPerKsh));
        const tierMultiplier = this.getTierMultiplier(program, account.tier);
        const earnedPoints = Math.floor(basePoints * tierMultiplier);
        account.totalPoints += earnedPoints;
        account.availablePoints += earnedPoints;
        account.lastEarnedAt = new Date();
        account.transactions.push({
            type: 'earn',
            amount: earnedPoints,
            reason,
            createdAt: new Date(),
        });
        account.tier = this.calculateTier(program, account.totalPoints);
        return account.save();
    }
    async redeemPoints(shopId, customerId, points) {
        const account = await this.loyaltyAccountModel
            .findOne({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            customerId: new mongoose_2.Types.ObjectId(customerId),
        })
            .exec();
        if (!account) {
            throw new common_1.BadRequestException('Loyalty account not found');
        }
        if (account.availablePoints < points) {
            throw new common_1.BadRequestException('Insufficient points');
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
    async claimBirthdayBonus(shopId, customerId) {
        const account = await this.loyaltyAccountModel
            .findOne({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            customerId: new mongoose_2.Types.ObjectId(customerId),
        })
            .exec();
        if (!account) {
            throw new common_1.BadRequestException('Loyalty account not found');
        }
        const program = await this.loyaltyProgramModel.findById(account.programId).exec();
        if (!program || !program.enableBirthdayBonus) {
            throw new common_1.BadRequestException('Birthday bonus not available');
        }
        if (account.birthdayBonusClaimedAt) {
            const lastClaim = new Date(account.birthdayBonusClaimedAt);
            const today = new Date();
            if (lastClaim.getFullYear() === today.getFullYear()) {
                throw new common_1.BadRequestException('Birthday bonus already claimed this year');
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
    async claimReferralBonus(shopId, referralCode) {
        const referrerAccount = await this.loyaltyAccountModel
            .findOne({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            referralCode,
        })
            .exec();
        if (!referrerAccount) {
            throw new common_1.BadRequestException('Invalid referral code');
        }
        const program = await this.loyaltyProgramModel.findById(referrerAccount.programId).exec();
        if (!program || !program.enableReferralBonus) {
            throw new common_1.BadRequestException('Referral bonus not available');
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
    async getAccount(shopId, customerId) {
        return this.loyaltyAccountModel
            .findOne({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            customerId: new mongoose_2.Types.ObjectId(customerId),
        })
            .exec();
    }
    async getTopCustomers(shopId, limit = 10) {
        return this.loyaltyAccountModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
            .sort({ totalPoints: -1 })
            .limit(limit)
            .exec();
    }
    getTierMultiplier(program, tier) {
        const tierData = program.tiers.find((t) => t.name === tier);
        return tierData?.bonusPointsMultiplier || 1;
    }
    calculateTier(program, totalPoints) {
        let tier = program.tiers[0]?.name || 'Bronze';
        for (const t of program.tiers) {
            if (totalPoints >= t.minPoints) {
                tier = t.name;
            }
        }
        return tier;
    }
    async getLoyaltyStats(shopId) {
        const accounts = await this.loyaltyAccountModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
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
};
exports.LoyaltyService = LoyaltyService;
exports.LoyaltyService = LoyaltyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(loyalty_program_schema_1.LoyaltyProgram.name)),
    __param(1, (0, mongoose_1.InjectModel)(loyalty_account_schema_1.LoyaltyAccount.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], LoyaltyService);
//# sourceMappingURL=loyalty.service.js.map