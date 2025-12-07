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
exports.ShopSchema = exports.Shop = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let Shop = class Shop {
    name;
    email;
    phone;
    shopId;
    address;
    county;
    city;
    businessType;
    kraPin;
    description;
    tillNumber;
    mpesaConfig;
    status;
    verificationBy;
    verificationDate;
    verificationNotes;
    rejectionDate;
    rejectionReason;
    suspensionDate;
    suspensionReason;
    complianceScore;
    chargebackRate;
    refundRate;
    violationCount;
    lastActivityDate;
    isMonitored;
    isFlagged;
    flagReason;
    openTickets;
    lastSupportTicketDate;
    cashierCount;
    totalSales;
    totalOrders;
    subscriptionId;
    subscriptionPlan;
    subscriptionStatus;
    subscriptionExpiresAt;
    isSubscriptionActive;
};
exports.Shop = Shop;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Shop.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, lowercase: true, trim: true }),
    __metadata("design:type", String)
], Shop.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, trim: true }),
    __metadata("design:type", String)
], Shop.prototype, "phone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, trim: true, index: true }),
    __metadata("design:type", String)
], Shop.prototype, "shopId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, trim: true }),
    __metadata("design:type", String)
], Shop.prototype, "address", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Shop.prototype, "county", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Shop.prototype, "city", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Shop.prototype, "businessType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, trim: true }),
    __metadata("design:type", String)
], Shop.prototype, "kraPin", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, trim: true, maxlength: 500 }),
    __metadata("design:type", String)
], Shop.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, trim: true }),
    __metadata("design:type", String)
], Shop.prototype, "tillNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], Shop.prototype, "mpesaConfig", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['pending', 'verified', 'active', 'suspended', 'rejected', 'flagged'], default: 'pending' }),
    __metadata("design:type", String)
], Shop.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, type: mongoose_2.Types.ObjectId }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Shop.prototype, "verificationBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], Shop.prototype, "verificationDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, trim: true }),
    __metadata("design:type", String)
], Shop.prototype, "verificationNotes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], Shop.prototype, "rejectionDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, trim: true }),
    __metadata("design:type", String)
], Shop.prototype, "rejectionReason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], Shop.prototype, "suspensionDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, trim: true }),
    __metadata("design:type", String)
], Shop.prototype, "suspensionReason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 100 }),
    __metadata("design:type", Number)
], Shop.prototype, "complianceScore", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Shop.prototype, "chargebackRate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Shop.prototype, "refundRate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Shop.prototype, "violationCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], Shop.prototype, "lastActivityDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Shop.prototype, "isMonitored", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Shop.prototype, "isFlagged", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, trim: true }),
    __metadata("design:type", String)
], Shop.prototype, "flagReason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Shop.prototype, "openTickets", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], Shop.prototype, "lastSupportTicketDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Shop.prototype, "cashierCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Shop.prototype, "totalSales", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Shop.prototype, "totalOrders", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, type: mongoose_2.Types.ObjectId, ref: 'Subscription' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Shop.prototype, "subscriptionId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], Shop.prototype, "subscriptionPlan", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], Shop.prototype, "subscriptionStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], Shop.prototype, "subscriptionExpiresAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Shop.prototype, "isSubscriptionActive", void 0);
exports.Shop = Shop = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Shop);
exports.ShopSchema = mongoose_1.SchemaFactory.createForClass(Shop);
exports.ShopSchema.index({ status: 1 });
exports.ShopSchema.index({ createdAt: -1 });
exports.ShopSchema.index({ verificationBy: 1 });
exports.ShopSchema.index({ isFlagged: 1 });
exports.ShopSchema.index({ isMonitored: 1 });
exports.ShopSchema.index({ kraPin: 1 }, {
    unique: true,
    sparse: true,
    name: 'unique_kraPin_when_present',
});
//# sourceMappingURL=shop.schema.js.map