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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopSettingsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const shop_settings_schema_1 = require("./shop-settings.schema");
let ShopSettingsService = class ShopSettingsService {
    model;
    constructor(model) {
        this.model = model;
    }
    async getByShopId(shopId) {
        let settings = await this.model.findOne({ shopId });
        if (!settings) {
            settings = await this.model.create({
                shopId,
                tax: {
                    enabled: true,
                    rate: 0.16,
                    name: 'VAT',
                    description: 'Value Added Tax (16%)',
                    appliedByDefault: true,
                },
                taxExemptProducts: [],
                categoryTaxRates: {},
            });
        }
        return settings;
    }
    async create(dto) {
        return this.model.create(dto);
    }
    async update(shopId, dto) {
        return this.model.findOneAndUpdate({ shopId }, { ...dto, updatedAt: new Date() }, { new: true, upsert: true });
    }
    async addTaxExemptProduct(shopId, productId) {
        return this.model.findOneAndUpdate({ shopId }, { $addToSet: { taxExemptProducts: productId }, updatedAt: new Date() }, { new: true });
    }
    async removeTaxExemptProduct(shopId, productId) {
        return this.model.findOneAndUpdate({ shopId }, { $pull: { taxExemptProducts: productId }, updatedAt: new Date() }, { new: true });
    }
    async setCategoryTaxRate(shopId, categoryId, rate, exempt) {
        return this.model.findOneAndUpdate({ shopId }, {
            $set: {
                [`categoryTaxRates.${categoryId}`]: { rate, exempt },
                updatedAt: new Date(),
            }
        }, { new: true });
    }
    async removeCategoryTaxRate(shopId, categoryId) {
        return this.model.findOneAndUpdate({ shopId }, { $unset: { [`categoryTaxRates.${categoryId}`]: 1 }, updatedAt: new Date() }, { new: true });
    }
};
exports.ShopSettingsService = ShopSettingsService;
exports.ShopSettingsService = ShopSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(shop_settings_schema_1.ShopSettings.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ShopSettingsService);
//# sourceMappingURL=shop-settings.service.js.map