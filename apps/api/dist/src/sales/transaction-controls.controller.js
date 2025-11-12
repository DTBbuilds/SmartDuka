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
exports.TransactionControlsController = void 0;
const common_1 = require("@nestjs/common");
const transaction_controls_service_1 = require("./transaction-controls.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let TransactionControlsController = class TransactionControlsController {
    transactionControlsService;
    constructor(transactionControlsService) {
        this.transactionControlsService = transactionControlsService;
    }
    async voidTransaction(body, user) {
        const order = await this.transactionControlsService.voidTransaction(body.orderId, user.shopId, body.voidReason, user.sub, true);
        return order;
    }
    async applyDiscount(body, user) {
        const order = await this.transactionControlsService.applyDiscount(body.orderId, user.shopId, body.discountAmount, body.discountReason, user.sub, true);
        return order;
    }
    async processRefund(body, user) {
        const order = await this.transactionControlsService.processRefund(body.orderId, user.shopId, body.refundAmount, body.refundReason, user.sub, true);
        return order;
    }
    async getVoidedTransactions(limit = '50', user) {
        const transactions = await this.transactionControlsService.getVoidedTransactions(user.shopId, parseInt(limit, 10));
        return transactions;
    }
    async getRefundedTransactions(limit = '50', user) {
        const transactions = await this.transactionControlsService.getRefundedTransactions(user.shopId, parseInt(limit, 10));
        return transactions;
    }
    async getTransactionsByCashier(cashierId, limit = '50', user) {
        const transactions = await this.transactionControlsService.getTransactionsByCashier(user.shopId, cashierId, parseInt(limit, 10));
        return transactions;
    }
    async getShiftTransactions(shiftId, limit = '100', user) {
        const transactions = await this.transactionControlsService.getShiftTransactions(user.shopId, shiftId, parseInt(limit, 10));
        return transactions;
    }
    async getTransactionStats(user) {
        const stats = await this.transactionControlsService.getTransactionStats(user.shopId);
        return stats;
    }
    async getCashierStats(cashierId, user) {
        const stats = await this.transactionControlsService.getCashierStats(user.shopId, cashierId);
        return stats;
    }
};
exports.TransactionControlsController = TransactionControlsController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'cashier'),
    (0, common_1.Post)('void'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TransactionControlsController.prototype, "voidTransaction", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'cashier'),
    (0, common_1.Post)('discount'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TransactionControlsController.prototype, "applyDiscount", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'cashier'),
    (0, common_1.Post)('refund'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TransactionControlsController.prototype, "processRefund", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('voided'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TransactionControlsController.prototype, "getVoidedTransactions", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('refunded'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TransactionControlsController.prototype, "getRefundedTransactions", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'cashier'),
    (0, common_1.Get)('cashier/:cashierId'),
    __param(0, (0, common_1.Param)('cashierId')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], TransactionControlsController.prototype, "getTransactionsByCashier", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'cashier'),
    (0, common_1.Get)('shift/:shiftId'),
    __param(0, (0, common_1.Param)('shiftId')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], TransactionControlsController.prototype, "getShiftTransactions", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('stats/shop'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TransactionControlsController.prototype, "getTransactionStats", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'cashier'),
    (0, common_1.Get)('stats/cashier/:cashierId'),
    __param(0, (0, common_1.Param)('cashierId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TransactionControlsController.prototype, "getCashierStats", null);
exports.TransactionControlsController = TransactionControlsController = __decorate([
    (0, common_1.Controller)('transactions'),
    __metadata("design:paramtypes", [transaction_controls_service_1.TransactionControlsService])
], TransactionControlsController);
//# sourceMappingURL=transaction-controls.controller.js.map