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
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const payments_service_1 = require("./payments.service");
const payment_transaction_service_1 = require("./services/payment-transaction.service");
const initiate_stk_dto_1 = require("./dto/initiate-stk.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let PaymentsController = class PaymentsController {
    paymentsService;
    paymentTransactionService;
    constructor(paymentsService, paymentTransactionService) {
        this.paymentsService = paymentsService;
        this.paymentTransactionService = paymentTransactionService;
    }
    async initiateStkPush(dto) {
        return this.paymentsService.initiateStkPush(dto);
    }
    async queryStkStatus(checkoutRequestId, merchantRequestId) {
        return this.paymentsService.queryStkStatus(checkoutRequestId, merchantRequestId);
    }
    async handleMpesaCallback(payload) {
        return this.paymentsService.handleCallback(payload);
    }
    async getTransactions(user, method, status, cashierId, branchId, from, to, limit, skip) {
        return this.paymentTransactionService.getTransactions(user.shopId, {
            method,
            status,
            cashierId,
            branchId,
            from,
            to,
            limit: limit ? parseInt(limit) : 100,
            skip: skip ? parseInt(skip) : 0,
        });
    }
    async getStats(user, from, to, branchId) {
        return this.paymentTransactionService.getStats(user.shopId, { from, to, branchId });
    }
    async exportTransactions(res, user, from, to, branchId) {
        try {
            const csvContent = await this.paymentTransactionService.exportTransactions(user.shopId, {
                from,
                to,
                branchId,
            });
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename=payments.csv');
            res.send(csvContent);
        }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    async getCashierStats(user, cashierId) {
        return this.paymentTransactionService.getCashierStats(user.shopId, cashierId);
    }
    async getOrderTransactions(orderId) {
        return this.paymentTransactionService.getTransactionsByOrderId(orderId);
    }
    async getPaymentsAnalytics(user, branchId) {
        return this.paymentTransactionService.getPaymentsAnalytics(user.shopId, branchId);
    }
    async getBranchPaymentsAnalytics(user, branchId) {
        return this.paymentTransactionService.getBranchPaymentsAnalytics(user.shopId, branchId);
    }
    async getShopPaymentsSummary(user) {
        return this.paymentTransactionService.getShopPaymentsSummary(user.shopId);
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('stk-push'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [initiate_stk_dto_1.InitiateStkDto]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "initiateStkPush", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('stk-status'),
    __param(0, (0, common_1.Query)('checkoutRequestId')),
    __param(1, (0, common_1.Query)('merchantRequestId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "queryStkStatus", null);
__decorate([
    (0, common_1.Post)('callback'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "handleMpesaCallback", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('transactions'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('method')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('cashierId')),
    __param(4, (0, common_1.Query)('branchId')),
    __param(5, (0, common_1.Query)('from')),
    __param(6, (0, common_1.Query)('to')),
    __param(7, (0, common_1.Query)('limit')),
    __param(8, (0, common_1.Query)('skip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getStats", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('export'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __param(4, (0, common_1.Query)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "exportTransactions", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('cashier/:cashierId/stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('cashierId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getCashierStats", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('order/:orderId'),
    __param(0, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getOrderTransactions", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('analytics'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getPaymentsAnalytics", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('analytics/branch/:branchId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getBranchPaymentsAnalytics", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('analytics/summary'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getShopPaymentsSummary", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService,
        payment_transaction_service_1.PaymentTransactionService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map