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
exports.StockAdjustmentSchema = exports.StockAdjustment = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let StockAdjustment = class StockAdjustment {
    shopId;
    productId;
    quantityChange;
    reason;
    notes;
    adjustedBy;
};
exports.StockAdjustment = StockAdjustment;
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'Shop' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], StockAdjustment.prototype, "shopId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'Product' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], StockAdjustment.prototype, "productId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], StockAdjustment.prototype, "quantityChange", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        enum: ['damage', 'loss', 'correction', 'return', 'other'],
        required: true,
    }),
    __metadata("design:type", String)
], StockAdjustment.prototype, "reason", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], StockAdjustment.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], StockAdjustment.prototype, "adjustedBy", void 0);
exports.StockAdjustment = StockAdjustment = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], StockAdjustment);
exports.StockAdjustmentSchema = mongoose_1.SchemaFactory.createForClass(StockAdjustment);
exports.StockAdjustmentSchema.index({ shopId: 1, productId: 1 });
exports.StockAdjustmentSchema.index({ shopId: 1, createdAt: -1 });
exports.StockAdjustmentSchema.index({ shopId: 1, reason: 1 });
//# sourceMappingURL=stock-adjustment.schema.js.map