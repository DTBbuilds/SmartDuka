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
exports.ShopAuditLogSchema = exports.ShopAuditLog = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let ShopAuditLog = class ShopAuditLog {
    shopId;
    performedBy;
    action;
    oldValue;
    newValue;
    reason;
    notes;
    createdAt;
};
exports.ShopAuditLog = ShopAuditLog;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ShopAuditLog.prototype, "shopId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ShopAuditLog.prototype, "performedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        enum: ['verify', 'reject', 'suspend', 'reactivate', 'flag', 'unflag', 'update', 'create'],
        required: true,
    }),
    __metadata("design:type", String)
], ShopAuditLog.prototype, "action", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, type: Object }),
    __metadata("design:type", Object)
], ShopAuditLog.prototype, "oldValue", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, type: Object }),
    __metadata("design:type", Object)
], ShopAuditLog.prototype, "newValue", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, trim: true }),
    __metadata("design:type", String)
], ShopAuditLog.prototype, "reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, trim: true }),
    __metadata("design:type", String)
], ShopAuditLog.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], ShopAuditLog.prototype, "createdAt", void 0);
exports.ShopAuditLog = ShopAuditLog = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], ShopAuditLog);
exports.ShopAuditLogSchema = mongoose_1.SchemaFactory.createForClass(ShopAuditLog);
exports.ShopAuditLogSchema.index({ shopId: 1 });
exports.ShopAuditLogSchema.index({ performedBy: 1 });
exports.ShopAuditLogSchema.index({ createdAt: -1 });
exports.ShopAuditLogSchema.index({ action: 1 });
//# sourceMappingURL=shop-audit-log.schema.js.map