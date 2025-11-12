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
exports.StockTransferController = void 0;
const common_1 = require("@nestjs/common");
const stock_transfer_service_1 = require("./stock-transfer.service");
const stock_transfer_dto_1 = require("./dto/stock-transfer.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let StockTransferController = class StockTransferController {
    transferService;
    constructor(transferService) {
        this.transferService = transferService;
    }
    async requestTransfer(dto, user) {
        return this.transferService.requestTransfer(user.shopId, dto.fromLocationId, dto.toLocationId, dto.productId, dto.quantity, dto.reason, user.sub, dto.notes);
    }
    async approveTransfer(id, dto, user) {
        return this.transferService.approveTransfer(id, user.sub);
    }
    async completeTransfer(id, user) {
        return this.transferService.completeTransfer(id);
    }
    async rejectTransfer(id, dto, user) {
        return this.transferService.rejectTransfer(id, dto.reason);
    }
    async getHistory(query, user) {
        return this.transferService.getTransferHistory(user.shopId, query.locationId, query.status);
    }
    async getStats(user) {
        return this.transferService.getTransferStats(user.shopId);
    }
};
exports.StockTransferController = StockTransferController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [stock_transfer_dto_1.RequestStockTransferDto, Object]),
    __metadata("design:returntype", Promise)
], StockTransferController.prototype, "requestTransfer", null);
__decorate([
    (0, common_1.Put)(':id/approve'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, stock_transfer_dto_1.ApproveStockTransferDto, Object]),
    __metadata("design:returntype", Promise)
], StockTransferController.prototype, "approveTransfer", null);
__decorate([
    (0, common_1.Put)(':id/complete'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StockTransferController.prototype, "completeTransfer", null);
__decorate([
    (0, common_1.Put)(':id/reject'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, stock_transfer_dto_1.RejectStockTransferDto, Object]),
    __metadata("design:returntype", Promise)
], StockTransferController.prototype, "rejectTransfer", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [stock_transfer_dto_1.GetTransferHistoryDto, Object]),
    __metadata("design:returntype", Promise)
], StockTransferController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StockTransferController.prototype, "getStats", null);
exports.StockTransferController = StockTransferController = __decorate([
    (0, common_1.Controller)('inventory/stock-transfer'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [stock_transfer_service_1.StockTransferService])
], StockTransferController);
//# sourceMappingURL=stock-transfer.controller.js.map