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
    tillNumber;
    ownerId;
    address;
    city;
    country;
    businessType;
    kraPin;
    language;
    status;
    verificationDate;
    verificationNotes;
    cashierCount;
    totalSales;
    totalOrders;
    settings;
    onboardingComplete;
    createdAt;
    updatedAt;
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
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Shop.prototype, "tillNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, required: false }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Shop.prototype, "ownerId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, trim: true }),
    __metadata("design:type", String)
], Shop.prototype, "address", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, trim: true }),
    __metadata("design:type", String)
], Shop.prototype, "city", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, trim: true }),
    __metadata("design:type", String)
], Shop.prototype, "country", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, trim: true }),
    __metadata("design:type", String)
], Shop.prototype, "businessType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false, unique: true, sparse: true, trim: true, default: null }),
    __metadata("design:type", String)
], Shop.prototype, "kraPin", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'en' }),
    __metadata("design:type", String)
], Shop.prototype, "language", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['pending', 'verified', 'active', 'suspended'], default: 'pending' }),
    __metadata("design:type", String)
], Shop.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Date)
], Shop.prototype, "verificationDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, trim: true }),
    __metadata("design:type", String)
], Shop.prototype, "verificationNotes", void 0);
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
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], Shop.prototype, "settings", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Shop.prototype, "onboardingComplete", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], Shop.prototype, "createdAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], Shop.prototype, "updatedAt", void 0);
exports.Shop = Shop = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Shop);
exports.ShopSchema = mongoose_1.SchemaFactory.createForClass(Shop);
exports.ShopSchema.index({ status: 1 });
exports.ShopSchema.index({ createdAt: -1 });
//# sourceMappingURL=shop.schema.js.map