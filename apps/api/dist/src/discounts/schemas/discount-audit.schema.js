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
exports.DiscountAuditSchema = exports.DiscountAudit = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let DiscountAudit = class DiscountAudit {
    shopId;
    discountId;
    orderId;
    amount;
    appliedBy;
    approvedBy;
    reason;
    status;
};
exports.DiscountAudit = DiscountAudit;
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'Shop' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DiscountAudit.prototype, "shopId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'Discount' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DiscountAudit.prototype, "discountId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'Order' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DiscountAudit.prototype, "orderId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0 }),
    __metadata("design:type", Number)
], DiscountAudit.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DiscountAudit.prototype, "appliedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], DiscountAudit.prototype, "approvedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], DiscountAudit.prototype, "reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['pending', 'approved', 'rejected'], default: 'approved' }),
    __metadata("design:type", String)
], DiscountAudit.prototype, "status", void 0);
exports.DiscountAudit = DiscountAudit = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], DiscountAudit);
exports.DiscountAuditSchema = mongoose_1.SchemaFactory.createForClass(DiscountAudit);
exports.DiscountAuditSchema.index({ shopId: 1, createdAt: -1 });
exports.DiscountAuditSchema.index({ shopId: 1, discountId: 1 });
exports.DiscountAuditSchema.index({ shopId: 1, appliedBy: 1 });
exports.DiscountAuditSchema.index({ shopId: 1, status: 1 });
//# sourceMappingURL=discount-audit.schema.js.map