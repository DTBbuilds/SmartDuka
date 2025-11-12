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
exports.LoyaltyAccountSchema = exports.LoyaltyAccount = exports.PointsTransactionSchema = exports.PointsTransaction = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let PointsTransaction = class PointsTransaction {
    type;
    amount;
    reason;
    createdAt;
};
exports.PointsTransaction = PointsTransaction;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], PointsTransaction.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], PointsTransaction.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PointsTransaction.prototype, "reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], PointsTransaction.prototype, "createdAt", void 0);
exports.PointsTransaction = PointsTransaction = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], PointsTransaction);
exports.PointsTransactionSchema = mongoose_1.SchemaFactory.createForClass(PointsTransaction);
let LoyaltyAccount = class LoyaltyAccount {
    shopId;
    customerId;
    programId;
    totalPoints;
    availablePoints;
    redeemedPoints;
    tier;
    transactions;
    lastEarnedAt;
    lastRedeemedAt;
    birthdayBonusClaimedAt;
    referralCode;
    referralCount;
    status;
};
exports.LoyaltyAccount = LoyaltyAccount;
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'Shop' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], LoyaltyAccount.prototype, "shopId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'Customer' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], LoyaltyAccount.prototype, "customerId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'LoyaltyProgram' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], LoyaltyAccount.prototype, "programId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0, default: 0 }),
    __metadata("design:type", Number)
], LoyaltyAccount.prototype, "totalPoints", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0, default: 0 }),
    __metadata("design:type", Number)
], LoyaltyAccount.prototype, "availablePoints", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0, default: 0 }),
    __metadata("design:type", Number)
], LoyaltyAccount.prototype, "redeemedPoints", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], LoyaltyAccount.prototype, "tier", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.PointsTransactionSchema], default: [] }),
    __metadata("design:type", Array)
], LoyaltyAccount.prototype, "transactions", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], LoyaltyAccount.prototype, "lastEarnedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], LoyaltyAccount.prototype, "lastRedeemedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], LoyaltyAccount.prototype, "birthdayBonusClaimedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LoyaltyAccount.prototype, "referralCode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], LoyaltyAccount.prototype, "referralCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['active', 'suspended'], default: 'active' }),
    __metadata("design:type", String)
], LoyaltyAccount.prototype, "status", void 0);
exports.LoyaltyAccount = LoyaltyAccount = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], LoyaltyAccount);
exports.LoyaltyAccountSchema = mongoose_1.SchemaFactory.createForClass(LoyaltyAccount);
exports.LoyaltyAccountSchema.index({ shopId: 1, customerId: 1 });
exports.LoyaltyAccountSchema.index({ shopId: 1, tier: 1 });
exports.LoyaltyAccountSchema.index({ shopId: 1, createdAt: -1 });
exports.LoyaltyAccountSchema.index({ referralCode: 1 });
//# sourceMappingURL=loyalty-account.schema.js.map