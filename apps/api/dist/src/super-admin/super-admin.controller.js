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
exports.SuperAdminController = void 0;
const common_1 = require("@nestjs/common");
const super_admin_service_1 = require("./super-admin.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let SuperAdminController = class SuperAdminController {
    superAdminService;
    constructor(superAdminService) {
        this.superAdminService = superAdminService;
    }
    async getPendingShops(limit = '50', skip = '0') {
        const shops = await this.superAdminService.getPendingShops(parseInt(limit), parseInt(skip));
        const count = await this.superAdminService.getPendingShopsCount();
        return { shops, count };
    }
    async getVerifiedShops(limit = '50', skip = '0') {
        const shops = await this.superAdminService.getVerifiedShops(parseInt(limit), parseInt(skip));
        const count = await this.superAdminService.getVerifiedShopsCount();
        return { shops, count };
    }
    async getActiveShops(limit = '50', skip = '0') {
        const shops = await this.superAdminService.getActiveShops(parseInt(limit), parseInt(skip));
        const count = await this.superAdminService.getActiveShopsCount();
        return { shops, count };
    }
    async getSuspendedShops(limit = '50', skip = '0') {
        const shops = await this.superAdminService.getSuspendedShops(parseInt(limit), parseInt(skip));
        const count = await this.superAdminService.getSuspendedShopsCount();
        return { shops, count };
    }
    async getFlaggedShops(limit = '50', skip = '0') {
        const shops = await this.superAdminService.getFlaggedShops(parseInt(limit), parseInt(skip));
        const count = await this.superAdminService.getFlaggedShopsCount();
        return { shops, count };
    }
    async getAllShops(limit = '50', skip = '0', status) {
        const shops = await this.superAdminService.getAllShops(parseInt(limit), parseInt(skip), status);
        const count = await this.superAdminService.getAllShopsCount(status);
        return { shops, count };
    }
    async getShopDetails(shopId) {
        return this.superAdminService.getShopDetails(shopId);
    }
    async getShopStats(shopId) {
        return this.superAdminService.getShopStats(shopId);
    }
    async getShopAuditLog(shopId, limit = '50', skip = '0') {
        return this.superAdminService.getShopAuditLog(shopId, parseInt(limit), parseInt(skip));
    }
    async getVerificationHistory(shopId) {
        return this.superAdminService.getVerificationHistory(shopId);
    }
    async verifyShop(shopId, body, user) {
        return this.superAdminService.verifyShop(shopId, user.sub, body.notes);
    }
    async rejectShop(shopId, body, user) {
        if (!body.reason) {
            throw new common_1.BadRequestException('Rejection reason is required');
        }
        return this.superAdminService.rejectShop(shopId, user.sub, body.reason, body.notes);
    }
    async suspendShop(shopId, body, user) {
        if (!body.reason) {
            throw new common_1.BadRequestException('Suspension reason is required');
        }
        return this.superAdminService.suspendShop(shopId, user.sub, body.reason, body.notes);
    }
    async reactivateShop(shopId, body, user) {
        return this.superAdminService.reactivateShop(shopId, user.sub, body.notes);
    }
    async flagShop(shopId, body, user) {
        if (!body.reason) {
            throw new common_1.BadRequestException('Flag reason is required');
        }
        return this.superAdminService.flagShop(shopId, user.sub, body.reason, body.notes);
    }
    async unflagShop(shopId, body, user) {
        return this.superAdminService.unflagShop(shopId, user.sub, body.notes);
    }
    async getDashboardStats() {
        const pending = await this.superAdminService.getPendingShopsCount();
        const verified = await this.superAdminService.getVerifiedShopsCount();
        const active = await this.superAdminService.getActiveShopsCount();
        const suspended = await this.superAdminService.getSuspendedShopsCount();
        const flagged = await this.superAdminService.getFlaggedShopsCount();
        return {
            pending,
            verified,
            active,
            suspended,
            flagged,
            total: pending + verified + active + suspended,
        };
    }
};
exports.SuperAdminController = SuperAdminController;
__decorate([
    (0, common_1.Get)('shops/pending'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('skip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getPendingShops", null);
__decorate([
    (0, common_1.Get)('shops/verified'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('skip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getVerifiedShops", null);
__decorate([
    (0, common_1.Get)('shops/active'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('skip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getActiveShops", null);
__decorate([
    (0, common_1.Get)('shops/suspended'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('skip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getSuspendedShops", null);
__decorate([
    (0, common_1.Get)('shops/flagged'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('skip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getFlaggedShops", null);
__decorate([
    (0, common_1.Get)('shops'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('skip')),
    __param(2, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getAllShops", null);
__decorate([
    (0, common_1.Get)('shops/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getShopDetails", null);
__decorate([
    (0, common_1.Get)('shops/:id/stats'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getShopStats", null);
__decorate([
    (0, common_1.Get)('shops/:id/audit-log'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('skip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getShopAuditLog", null);
__decorate([
    (0, common_1.Get)('shops/:id/verification-history'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getVerificationHistory", null);
__decorate([
    (0, common_1.Put)('shops/:id/verify'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "verifyShop", null);
__decorate([
    (0, common_1.Put)('shops/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "rejectShop", null);
__decorate([
    (0, common_1.Put)('shops/:id/suspend'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "suspendShop", null);
__decorate([
    (0, common_1.Put)('shops/:id/reactivate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "reactivateShop", null);
__decorate([
    (0, common_1.Put)('shops/:id/flag'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "flagShop", null);
__decorate([
    (0, common_1.Put)('shops/:id/unflag'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "unflagShop", null);
__decorate([
    (0, common_1.Get)('dashboard/stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SuperAdminController.prototype, "getDashboardStats", null);
exports.SuperAdminController = SuperAdminController = __decorate([
    (0, common_1.Controller)('super-admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('super_admin'),
    __metadata("design:paramtypes", [super_admin_service_1.SuperAdminService])
], SuperAdminController);
//# sourceMappingURL=super-admin.controller.js.map