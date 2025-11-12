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
exports.BarcodeController = void 0;
const common_1 = require("@nestjs/common");
const barcode_service_1 = require("./barcode.service");
const barcode_dto_1 = require("./dto/barcode.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let BarcodeController = class BarcodeController {
    barcodeService;
    constructor(barcodeService) {
        this.barcodeService = barcodeService;
    }
    async scanBarcode(dto, user) {
        return this.barcodeService.scanBarcode(dto.barcode, user.shopId);
    }
    async generateBarcode(productId, user) {
        return this.barcodeService.generateBarcode(productId, user.shopId);
    }
    async validateBarcode(dto) {
        return this.barcodeService.validateBarcode(dto.barcode);
    }
    async bulkImport(dto, user) {
        return this.barcodeService.bulkImportBarcodes(user.shopId, dto.barcodes);
    }
};
exports.BarcodeController = BarcodeController;
__decorate([
    (0, common_1.Post)('scan'),
    (0, roles_decorator_1.Roles)('admin', 'cashier'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [barcode_dto_1.ScanBarcodeDto, Object]),
    __metadata("design:returntype", Promise)
], BarcodeController.prototype, "scanBarcode", null);
__decorate([
    (0, common_1.Post)('generate/:productId'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BarcodeController.prototype, "generateBarcode", null);
__decorate([
    (0, common_1.Post)('validate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [barcode_dto_1.ValidateBarcodeDto]),
    __metadata("design:returntype", Promise)
], BarcodeController.prototype, "validateBarcode", null);
__decorate([
    (0, common_1.Post)('bulk-import'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [barcode_dto_1.BulkImportBarcodesDto, Object]),
    __metadata("design:returntype", Promise)
], BarcodeController.prototype, "bulkImport", null);
exports.BarcodeController = BarcodeController = __decorate([
    (0, common_1.Controller)('inventory/barcode'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [barcode_service_1.BarcodeService])
], BarcodeController);
//# sourceMappingURL=barcode.controller.js.map