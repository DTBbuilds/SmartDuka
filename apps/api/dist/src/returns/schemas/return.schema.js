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
exports.ReturnSchema = exports.Return = exports.ReturnItemSchema = exports.ReturnItem = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let ReturnItem = class ReturnItem {
    productId;
    productName;
    quantity;
    unitPrice;
    reason;
};
exports.ReturnItem = ReturnItem;
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ReturnItem.prototype, "productId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ReturnItem.prototype, "productName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 1 }),
    __metadata("design:type", Number)
], ReturnItem.prototype, "quantity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0 }),
    __metadata("design:type", Number)
], ReturnItem.prototype, "unitPrice", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ReturnItem.prototype, "reason", void 0);
exports.ReturnItem = ReturnItem = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], ReturnItem);
exports.ReturnItemSchema = mongoose_1.SchemaFactory.createForClass(ReturnItem);
let Return = class Return {
    shopId;
    orderId;
    items;
    totalRefundAmount;
    status;
    requestedBy;
    approvedBy;
    approvalNotes;
    returnWindow;
    completedAt;
    inventoryAdjusted;
};
exports.Return = Return;
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'Shop' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Return.prototype, "shopId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'Order' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Return.prototype, "orderId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.ReturnItemSchema], required: true }),
    __metadata("design:type", Array)
], Return.prototype, "items", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0 }),
    __metadata("design:type", Number)
], Return.prototype, "totalRefundAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        enum: ['pending', 'approved', 'rejected', 'completed'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], Return.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Return.prototype, "requestedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Return.prototype, "approvedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Return.prototype, "approvalNotes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 7 }),
    __metadata("design:type", Number)
], Return.prototype, "returnWindow", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Return.prototype, "completedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Return.prototype, "inventoryAdjusted", void 0);
exports.Return = Return = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Return);
exports.ReturnSchema = mongoose_1.SchemaFactory.createForClass(Return);
exports.ReturnSchema.index({ shopId: 1, status: 1 });
exports.ReturnSchema.index({ shopId: 1, orderId: 1 });
exports.ReturnSchema.index({ shopId: 1, createdAt: -1 });
exports.ReturnSchema.index({ shopId: 1, requestedBy: 1 });
//# sourceMappingURL=return.schema.js.map