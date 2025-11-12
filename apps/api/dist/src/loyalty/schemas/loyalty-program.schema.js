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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoyaltyProgramSchema = exports.LoyaltyProgram = exports.LoyaltyTierSchema = exports.LoyaltyTier = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let LoyaltyTier = class LoyaltyTier {
    name;
    minPoints;
    discountPercentage;
    bonusPointsMultiplier;
};
exports.LoyaltyTier = LoyaltyTier;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], LoyaltyTier.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0 }),
    __metadata("design:type", Number)
], LoyaltyTier.prototype, "minPoints", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0, max: 100 }),
    __metadata("design:type", Number)
], LoyaltyTier.prototype, "discountPercentage", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0 }),
    __metadata("design:type", Number)
], LoyaltyTier.prototype, "bonusPointsMultiplier", void 0);
exports.LoyaltyTier = LoyaltyTier = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], LoyaltyTier);
exports.LoyaltyTierSchema = mongoose_1.SchemaFactory.createForClass(LoyaltyTier);
let LoyaltyProgram = class LoyaltyProgram {
    shopId;
    name;
    description;
    pointsPerKsh;
    pointsExpiryDays;
    tiers;
    enableBirthdayBonus;
    birthdayBonusPoints;
    enableReferralBonus;
    referralBonusPoints;
    status;
};
exports.LoyaltyProgram = LoyaltyProgram;
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'Shop' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], LoyaltyProgram.prototype, "shopId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], LoyaltyProgram.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LoyaltyProgram.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0 }),
    __metadata("design:type", Number)
], LoyaltyProgram.prototype, "pointsPerKsh", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0 }),
    __metadata("design:type", Number)
], LoyaltyProgram.prototype, "pointsExpiryDays", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.LoyaltyTierSchema], required: true }),
    __metadata("design:type", Array)
], LoyaltyProgram.prototype, "tiers", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], LoyaltyProgram.prototype, "enableBirthdayBonus", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 100 }),
    __metadata("design:type", Number)
], LoyaltyProgram.prototype, "birthdayBonusPoints", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], LoyaltyProgram.prototype, "enableReferralBonus", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 50 }),
    __metadata("design:type", Number)
], LoyaltyProgram.prototype, "referralBonusPoints", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['active', 'inactive'], default: 'active' }),
    __metadata("design:type", String)
], LoyaltyProgram.prototype, "status", void 0);
exports.LoyaltyProgram = LoyaltyProgram = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], LoyaltyProgram);
exports.LoyaltyProgramSchema = mongoose_1.SchemaFactory.createForClass(LoyaltyProgram);
exports.LoyaltyProgramSchema.index({ shopId: 1, status: 1 });
exports.LoyaltyProgramSchema.index({ shopId: 1, createdAt: -1 });
//# sourceMappingURL=loyalty-program.schema.js.map