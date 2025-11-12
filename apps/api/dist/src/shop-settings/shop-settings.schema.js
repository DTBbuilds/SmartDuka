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
exports.ShopSettingsSchema = exports.ShopSettings = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let ShopSettings = class ShopSettings extends mongoose_2.Document {
    shopId;
    tax;
    taxExemptProducts;
    categoryTaxRates;
    createdAt;
    updatedAt;
};
exports.ShopSettings = ShopSettings;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ShopSettings.prototype, "shopId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            enabled: { type: Boolean, default: true },
            rate: { type: Number, default: 0.16 },
            name: { type: String, default: 'VAT' },
            description: { type: String, default: 'Value Added Tax (16%)' },
            appliedByDefault: { type: Boolean, default: true },
        },
        default: {
            enabled: true,
            rate: 0.16,
            name: 'VAT',
            description: 'Value Added Tax (16%)',
            appliedByDefault: true,
        },
    }),
    __metadata("design:type", Object)
], ShopSettings.prototype, "tax", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], ShopSettings.prototype, "taxExemptProducts", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Map, of: Object, default: {} }),
    __metadata("design:type", Object)
], ShopSettings.prototype, "categoryTaxRates", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], ShopSettings.prototype, "createdAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], ShopSettings.prototype, "updatedAt", void 0);
exports.ShopSettings = ShopSettings = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], ShopSettings);
exports.ShopSettingsSchema = mongoose_1.SchemaFactory.createForClass(ShopSettings);
exports.ShopSettingsSchema.index({ shopId: 1 });
//# sourceMappingURL=shop-settings.schema.js.map