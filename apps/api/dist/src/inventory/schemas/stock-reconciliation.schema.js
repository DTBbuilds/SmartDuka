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
exports.StockReconciliationSchema = exports.StockReconciliation = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let StockReconciliation = class StockReconciliation {
    shopId;
    productId;
    systemQuantity;
    physicalCount;
    variance;
    reconciliationDate;
    reconcililedBy;
    notes;
};
exports.StockReconciliation = StockReconciliation;
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'Shop' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], StockReconciliation.prototype, "shopId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'Product' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], StockReconciliation.prototype, "productId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0 }),
    __metadata("design:type", Number)
], StockReconciliation.prototype, "systemQuantity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0 }),
    __metadata("design:type", Number)
], StockReconciliation.prototype, "physicalCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], StockReconciliation.prototype, "variance", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], StockReconciliation.prototype, "reconciliationDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], StockReconciliation.prototype, "reconcililedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], StockReconciliation.prototype, "notes", void 0);
exports.StockReconciliation = StockReconciliation = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], StockReconciliation);
exports.StockReconciliationSchema = mongoose_1.SchemaFactory.createForClass(StockReconciliation);
exports.StockReconciliationSchema.index({ shopId: 1, productId: 1 });
exports.StockReconciliationSchema.index({ shopId: 1, reconciliationDate: -1 });
exports.StockReconciliationSchema.index({ shopId: 1, createdAt: -1 });
//# sourceMappingURL=stock-reconciliation.schema.js.map