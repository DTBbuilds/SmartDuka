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
exports.DiscountSchema = exports.Discount = exports.DiscountRuleSchema = exports.DiscountRule = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let DiscountRule = class DiscountRule {
    minPurchaseAmount;
    maxDiscountAmount;
    applicableProducts;
    applicableCategories;
    validFrom;
    validTo;
    applicableDays;
    applicableHours;
    customerSegments;
};
exports.DiscountRule = DiscountRule;
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], DiscountRule.prototype, "minPurchaseAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], DiscountRule.prototype, "maxDiscountAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [mongoose_2.Types.ObjectId], default: [] }),
    __metadata("design:type", Array)
], DiscountRule.prototype, "applicableProducts", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [mongoose_2.Types.ObjectId], default: [] }),
    __metadata("design:type", Array)
], DiscountRule.prototype, "applicableCategories", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], DiscountRule.prototype, "validFrom", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], DiscountRule.prototype, "validTo", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], DiscountRule.prototype, "applicableDays", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], DiscountRule.prototype, "applicableHours", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], DiscountRule.prototype, "customerSegments", void 0);
exports.DiscountRule = DiscountRule = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], DiscountRule);
exports.DiscountRuleSchema = mongoose_1.SchemaFactory.createForClass(DiscountRule);
let Discount = class Discount {
    shopId;
    name;
    type;
    value;
    rules;
    usageLimit;
    usageCount;
    requiresApproval;
    status;
    createdBy;
    isDefault;
};
exports.Discount = Discount;
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'Shop' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Discount.prototype, "shopId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Discount.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['percentage', 'fixed', 'bogo', 'tiered', 'coupon'],
    }),
    __metadata("design:type", String)
], Discount.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0 }),
    __metadata("design:type", Number)
], Discount.prototype, "value", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: exports.DiscountRuleSchema, required: true }),
    __metadata("design:type", DiscountRule)
], Discount.prototype, "rules", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Discount.prototype, "usageLimit", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Discount.prototype, "usageCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Discount.prototype, "requiresApproval", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['active', 'inactive'], default: 'active' }),
    __metadata("design:type", String)
], Discount.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Discount.prototype, "createdBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], Discount.prototype, "isDefault", void 0);
exports.Discount = Discount = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Discount);
exports.DiscountSchema = mongoose_1.SchemaFactory.createForClass(Discount);
exports.DiscountSchema.index({ shopId: 1, status: 1 });
exports.DiscountSchema.index({ shopId: 1, type: 1 });
exports.DiscountSchema.index({ shopId: 1, 'rules.validFrom': 1, 'rules.validTo': 1 });
//# sourceMappingURL=discount.schema.js.map