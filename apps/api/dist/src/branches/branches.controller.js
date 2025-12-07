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
exports.BranchesController = void 0;
const common_1 = require("@nestjs/common");
const branches_service_1 = require("./branches.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let BranchesController = class BranchesController {
    branchesService;
    constructor(branchesService) {
        this.branchesService = branchesService;
    }
    async create(dto, user) {
        const branch = await this.branchesService.create(user.shopId, user.sub, dto);
        return {
            success: true,
            message: 'Branch created successfully',
            data: branch,
        };
    }
    async findByShop(user) {
        const branches = await this.branchesService.findByShop(user.shopId);
        return {
            success: true,
            data: branches,
            count: branches.length,
        };
    }
    async getActive(user) {
        const branches = await this.branchesService.getActive(user.shopId);
        return {
            success: true,
            data: branches,
            count: branches.length,
        };
    }
    async getBranchesWithPaymentConfig(user) {
        const branches = await this.branchesService.getBranchesWithPaymentConfig(user.shopId);
        return {
            success: true,
            data: branches,
            count: branches.length,
        };
    }
    async getDeliveryBranches(user) {
        const branches = await this.branchesService.getDeliveryBranches(user.shopId);
        return {
            success: true,
            data: branches,
            count: branches.length,
        };
    }
    async getByCounty(county, user) {
        const branches = await this.branchesService.getByCounty(user.shopId, county);
        return {
            success: true,
            data: branches,
            count: branches.length,
        };
    }
    async findById(id, user) {
        const branch = await this.branchesService.findById(id, user.shopId);
        return {
            success: true,
            data: branch,
        };
    }
    async getPaymentConfigStatus(id, user) {
        const status = await this.branchesService.getPaymentConfigStatus(id, user.shopId);
        return {
            success: true,
            data: status,
        };
    }
    async update(id, dto, user) {
        const branch = await this.branchesService.update(id, user.shopId, user.sub, dto);
        return {
            success: true,
            message: 'Branch updated successfully',
            data: branch,
        };
    }
    async updatePaymentConfig(id, paymentConfig, user) {
        const branch = await this.branchesService.updatePaymentConfig(id, user.shopId, user.sub, paymentConfig);
        return {
            success: true,
            message: 'Branch payment configuration updated',
            data: branch,
        };
    }
    async assignManager(id, managerId, user) {
        const branch = await this.branchesService.assignManager(id, user.shopId, user.sub, managerId);
        return {
            success: true,
            message: 'Manager assigned to branch',
            data: branch,
        };
    }
    async addStaff(id, staffId, user) {
        const branch = await this.branchesService.addStaff(id, user.shopId, user.sub, staffId);
        return {
            success: true,
            message: 'Staff added to branch',
            data: branch,
        };
    }
    async removeStaff(id, staffId, user) {
        const branch = await this.branchesService.removeStaff(id, user.shopId, user.sub, staffId);
        return {
            success: true,
            message: 'Staff removed from branch',
            data: branch,
        };
    }
    async delete(id, user) {
        const deleted = await this.branchesService.delete(id, user.shopId, user.sub);
        return {
            success: true,
            message: 'Branch deleted successfully',
            deleted,
        };
    }
};
exports.BranchesController = BranchesController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'branch_admin'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "findByShop", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('active'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "getActive", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'branch_admin'),
    (0, common_1.Get)('with-payment-config'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "getBranchesWithPaymentConfig", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('delivery'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "getDeliveryBranches", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('by-county'),
    __param(0, (0, common_1.Query)('county')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "getByCounty", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "findById", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'branch_admin', 'branch_manager'),
    (0, common_1.Get)(':id/payment-config'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "getPaymentConfigStatus", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'branch_admin'),
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "update", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Put)(':id/payment-config'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "updatePaymentConfig", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Post)(':id/manager'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('managerId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "assignManager", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'branch_admin'),
    (0, common_1.Post)(':id/staff'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('staffId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "addStaff", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'branch_admin'),
    (0, common_1.Delete)(':id/staff/:staffId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('staffId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "removeStaff", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BranchesController.prototype, "delete", null);
exports.BranchesController = BranchesController = __decorate([
    (0, common_1.Controller)('branches'),
    __metadata("design:paramtypes", [branches_service_1.BranchesService])
], BranchesController);
//# sourceMappingURL=branches.controller.js.map