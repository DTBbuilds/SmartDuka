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
exports.ReconciliationSchema = exports.Reconciliation = exports.VarianceRecordSchema = exports.VarianceRecord = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let VarianceRecord = class VarianceRecord {
    type;
    amount;
    description;
    investigationNotes;
    status;
};
exports.VarianceRecord = VarianceRecord;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], VarianceRecord.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], VarianceRecord.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], VarianceRecord.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], VarianceRecord.prototype, "investigationNotes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['pending', 'investigated', 'resolved'], default: 'pending' }),
    __metadata("design:type", String)
], VarianceRecord.prototype, "status", void 0);
exports.VarianceRecord = VarianceRecord = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], VarianceRecord);
exports.VarianceRecordSchema = mongoose_1.SchemaFactory.createForClass(VarianceRecord);
let Reconciliation = class Reconciliation {
    shopId;
    reconciliationDate;
    expectedCash;
    actualCash;
    variance;
    variancePercentage;
    status;
    variances;
    reconciliationNotes;
    reconciledBy;
    reconciliationTime;
    approvedBy;
    approvalTime;
};
exports.Reconciliation = Reconciliation;
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'Shop' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Reconciliation.prototype, "shopId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], Reconciliation.prototype, "reconciliationDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0 }),
    __metadata("design:type", Number)
], Reconciliation.prototype, "expectedCash", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0 }),
    __metadata("design:type", Number)
], Reconciliation.prototype, "actualCash", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Reconciliation.prototype, "variance", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Reconciliation.prototype, "variancePercentage", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['pending', 'reconciled', 'variance_pending'], default: 'pending' }),
    __metadata("design:type", String)
], Reconciliation.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.VarianceRecordSchema], default: [] }),
    __metadata("design:type", Array)
], Reconciliation.prototype, "variances", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Reconciliation.prototype, "reconciliationNotes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Reconciliation.prototype, "reconciledBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], Reconciliation.prototype, "reconciliationTime", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Reconciliation.prototype, "approvedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Reconciliation.prototype, "approvalTime", void 0);
exports.Reconciliation = Reconciliation = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Reconciliation);
exports.ReconciliationSchema = mongoose_1.SchemaFactory.createForClass(Reconciliation);
exports.ReconciliationSchema.index({ shopId: 1, reconciliationDate: -1 });
exports.ReconciliationSchema.index({ shopId: 1, status: 1 });
exports.ReconciliationSchema.index({ shopId: 1, createdAt: -1 });
//# sourceMappingURL=reconciliation.schema.js.map