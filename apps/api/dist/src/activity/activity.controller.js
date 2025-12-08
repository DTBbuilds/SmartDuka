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
exports.ActivityController = void 0;
const common_1 = require("@nestjs/common");
const activity_service_1 = require("./activity.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let ActivityController = class ActivityController {
    activityService;
    constructor(activityService) {
        this.activityService = activityService;
    }
    async getActivityLog(branchId, limit = '50', skip = '0', user) {
        const activities = await this.activityService.getActivityLog(user.shopId, branchId, parseInt(limit), parseInt(skip));
        return {
            success: true,
            data: activities,
            count: activities.length,
        };
    }
    async getShopActivityLog(limit = '50', skip = '0', user) {
        const activities = await this.activityService.getShopActivityLog(user.shopId, parseInt(limit), parseInt(skip));
        return activities;
    }
    async getOwnTransactions(limit = '50', user) {
        const transactions = await this.activityService.getCashierTransactions(user.shopId, user.sub, parseInt(limit));
        return transactions;
    }
    async getCashierActivityLog(cashierId, limit = '50', skip = '0', user) {
        const activities = await this.activityService.getCashierActivityLog(user.shopId, cashierId, parseInt(limit), parseInt(skip));
        return activities;
    }
    async getCashierTransactions(cashierId, limit = '50', user) {
        const transactions = await this.activityService.getCashierTransactions(user.shopId, cashierId, parseInt(limit));
        return transactions;
    }
    async getTodayActivity(user) {
        const activities = await this.activityService.getTodayActivity(user.shopId);
        return activities;
    }
    async getActivityByAction(action, limit = '50', user) {
        const activities = await this.activityService.getActivityByAction(user.shopId, action, parseInt(limit));
        return activities;
    }
    async getCashierSessions(cashierId, limit = '50', user) {
        const sessions = await this.activityService.getCashierSessions(user.shopId, cashierId, parseInt(limit));
        return sessions;
    }
    async logActivity(dto, user) {
        const activity = await this.activityService.logActivity(user.shopId, user.sub, user.email, user.role, dto.action, dto.details);
        return { success: !!activity, activity };
    }
    async updateStatus(dto, user) {
        await this.activityService.logActivity(user.shopId, user.sub, user.email, user.role, 'status_change', { status: dto.status });
        return { success: true, status: dto.status };
    }
    async heartbeat(dto, user) {
        await this.activityService.logActivity(user.shopId, user.sub, user.email, user.role, 'heartbeat', { status: dto.status || 'online' });
        return { success: true, timestamp: new Date().toISOString() };
    }
};
exports.ActivityController = ActivityController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'branch_admin', 'branch_manager'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('branchId')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('skip')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "getActivityLog", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('shop'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('skip')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "getShopActivityLog", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('cashier/self/transactions'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "getOwnTransactions", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('cashier/:cashierId'),
    __param(0, (0, common_1.Param)('cashierId')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('skip')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "getCashierActivityLog", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('cashier/:cashierId/transactions'),
    __param(0, (0, common_1.Param)('cashierId')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "getCashierTransactions", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('today'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "getTodayActivity", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('by-action/:action'),
    __param(0, (0, common_1.Param)('action')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "getActivityByAction", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('cashier/:cashierId/sessions'),
    __param(0, (0, common_1.Param)('cashierId')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "getCashierSessions", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('log'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "logActivity", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('status'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('heartbeat'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "heartbeat", null);
exports.ActivityController = ActivityController = __decorate([
    (0, common_1.Controller)('activity'),
    __metadata("design:paramtypes", [activity_service_1.ActivityService])
], ActivityController);
//# sourceMappingURL=activity.controller.js.map