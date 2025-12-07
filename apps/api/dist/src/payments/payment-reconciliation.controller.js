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
exports.PaymentReconciliationController = void 0;
const common_1 = require("@nestjs/common");
const payment_reconciliation_service_1 = require("./payment-reconciliation.service");
const payment_reconciliation_dto_1 = require("./dto/payment-reconciliation.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let PaymentReconciliationController = class PaymentReconciliationController {
    reconciliationService;
    constructor(reconciliationService) {
        this.reconciliationService = reconciliationService;
    }
    async createReconciliation(dto, user) {
        return this.reconciliationService.reconcilePayments(user.shopId, new Date(), dto.actualCash, user.sub, dto.reconciliationNotes);
    }
    async getHistory(query, user) {
        const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
        const endDate = query.endDate ? new Date(query.endDate) : new Date();
        return this.reconciliationService.getReconciliationHistory(user.shopId, startDate, endDate);
    }
    async getVarianceReport(startDate, endDate, user) {
        if (!startDate || !endDate) {
            throw new common_1.BadRequestException('startDate and endDate are required');
        }
        return this.reconciliationService.getVarianceReport(user.shopId, new Date(startDate), new Date(endDate));
    }
};
exports.PaymentReconciliationController = PaymentReconciliationController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payment_reconciliation_dto_1.CreatePaymentReconciliationDto, Object]),
    __metadata("design:returntype", Promise)
], PaymentReconciliationController.prototype, "createReconciliation", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payment_reconciliation_dto_1.GetReconciliationHistoryDto, Object]),
    __metadata("design:returntype", Promise)
], PaymentReconciliationController.prototype, "getHistory", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('variance-report'),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PaymentReconciliationController.prototype, "getVarianceReport", null);
exports.PaymentReconciliationController = PaymentReconciliationController = __decorate([
    (0, common_1.Controller)('payments/reconciliation'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [payment_reconciliation_service_1.PaymentReconciliationService])
], PaymentReconciliationController);
//# sourceMappingURL=payment-reconciliation.controller.js.map