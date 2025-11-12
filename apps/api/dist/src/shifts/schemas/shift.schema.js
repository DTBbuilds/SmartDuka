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
exports.ShiftSchema = exports.Shift = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let Shift = class Shift {
    shopId;
    cashierId;
    cashierName;
    startTime;
    endTime;
    openingBalance;
    closingBalance;
    expectedCash;
    actualCash;
    variance;
    status;
    notes;
    reconciliedBy;
    reconciliedAt;
    createdAt;
    updatedAt;
};
exports.Shift = Shift;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, required: true, ref: 'Shop' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Shift.prototype, "shopId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, required: true, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Shift.prototype, "cashierId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Shift.prototype, "cashierName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], Shift.prototype, "startTime", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Shift.prototype, "endTime", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Shift.prototype, "openingBalance", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Shift.prototype, "closingBalance", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Shift.prototype, "expectedCash", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Shift.prototype, "actualCash", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Shift.prototype, "variance", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['open', 'closed', 'reconciled'], default: 'open' }),
    __metadata("design:type", String)
], Shift.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Shift.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Shift.prototype, "reconciliedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Shift.prototype, "reconciliedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], Shift.prototype, "createdAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], Shift.prototype, "updatedAt", void 0);
exports.Shift = Shift = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Shift);
exports.ShiftSchema = mongoose_1.SchemaFactory.createForClass(Shift);
exports.ShiftSchema.index({ shopId: 1, cashierId: 1, startTime: -1 });
exports.ShiftSchema.index({ shopId: 1, status: 1 });
exports.ShiftSchema.index({ cashierId: 1, startTime: -1 });
exports.ShiftSchema.index({ createdAt: -1 });
//# sourceMappingURL=shift.schema.js.map