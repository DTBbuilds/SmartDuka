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
exports.ShopSettingsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const shop_settings_service_1 = require("./shop-settings.service");
const dto_1 = require("./dto");
let ShopSettingsController = class ShopSettingsController {
    service;
    constructor(service) {
        this.service = service;
    }
    async getSettings(shopId) {
        if (!shopId) {
            throw new common_1.BadRequestException('Shop ID is required');
        }
        return this.service.getByShopId(shopId);
    }
    async updateSettings(shopId, dto) {
        if (!shopId) {
            throw new common_1.BadRequestException('Shop ID is required');
        }
        return this.service.update(shopId, dto);
    }
    async addTaxExemptProduct(shopId, productId) {
        if (!shopId || !productId) {
            throw new common_1.BadRequestException('Shop ID and Product ID are required');
        }
        return this.service.addTaxExemptProduct(shopId, productId);
    }
    async removeTaxExemptProduct(shopId, productId) {
        if (!shopId || !productId) {
            throw new common_1.BadRequestException('Shop ID and Product ID are required');
        }
        return this.service.removeTaxExemptProduct(shopId, productId);
    }
    async setCategoryTaxRate(shopId, categoryId, body) {
        if (!shopId || !categoryId) {
            throw new common_1.BadRequestException('Shop ID and Category ID are required');
        }
        if (body.rate < 0 || body.rate > 100) {
            throw new common_1.BadRequestException('Tax rate must be between 0 and 100');
        }
        return this.service.setCategoryTaxRate(shopId, categoryId, body.rate, body.exempt);
    }
    async removeCategoryTaxRate(shopId, categoryId) {
        if (!shopId || !categoryId) {
            throw new common_1.BadRequestException('Shop ID and Category ID are required');
        }
        return this.service.removeCategoryTaxRate(shopId, categoryId);
    }
    async getReceiptSettings(shopId) {
        if (!shopId) {
            throw new common_1.BadRequestException('Shop ID is required');
        }
        return this.service.getReceiptSettings(shopId);
    }
    async updateReceiptSettings(shopId, receiptSettings) {
        if (!shopId) {
            throw new common_1.BadRequestException('Shop ID is required');
        }
        return this.service.updateReceiptSettings(shopId, receiptSettings);
    }
    async syncReceiptFromShop(shopId) {
        if (!shopId) {
            throw new common_1.BadRequestException('Shop ID is required');
        }
        const result = await this.service.syncReceiptSettingsFromShop(shopId);
        if (!result) {
            throw new common_1.BadRequestException('Shop not found');
        }
        return result;
    }
};
exports.ShopSettingsController = ShopSettingsController;
__decorate([
    (0, common_1.Get)(':shopId'),
    __param(0, (0, common_1.Param)('shopId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShopSettingsController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Put)(':shopId'),
    __param(0, (0, common_1.Param)('shopId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateShopSettingsDto]),
    __metadata("design:returntype", Promise)
], ShopSettingsController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Post)(':shopId/tax-exempt-products/:productId'),
    __param(0, (0, common_1.Param)('shopId')),
    __param(1, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ShopSettingsController.prototype, "addTaxExemptProduct", null);
__decorate([
    (0, common_1.Delete)(':shopId/tax-exempt-products/:productId'),
    __param(0, (0, common_1.Param)('shopId')),
    __param(1, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ShopSettingsController.prototype, "removeTaxExemptProduct", null);
__decorate([
    (0, common_1.Post)(':shopId/category-tax-rates/:categoryId'),
    __param(0, (0, common_1.Param)('shopId')),
    __param(1, (0, common_1.Param)('categoryId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ShopSettingsController.prototype, "setCategoryTaxRate", null);
__decorate([
    (0, common_1.Delete)(':shopId/category-tax-rates/:categoryId'),
    __param(0, (0, common_1.Param)('shopId')),
    __param(1, (0, common_1.Param)('categoryId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ShopSettingsController.prototype, "removeCategoryTaxRate", null);
__decorate([
    (0, common_1.Get)(':shopId/receipt'),
    __param(0, (0, common_1.Param)('shopId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShopSettingsController.prototype, "getReceiptSettings", null);
__decorate([
    (0, common_1.Put)(':shopId/receipt'),
    __param(0, (0, common_1.Param)('shopId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ShopSettingsController.prototype, "updateReceiptSettings", null);
__decorate([
    (0, common_1.Post)(':shopId/receipt/sync'),
    __param(0, (0, common_1.Param)('shopId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShopSettingsController.prototype, "syncReceiptFromShop", null);
exports.ShopSettingsController = ShopSettingsController = __decorate([
    (0, common_1.Controller)('shop-settings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [shop_settings_service_1.ShopSettingsService])
], ShopSettingsController);
//# sourceMappingURL=shop-settings.controller.js.map