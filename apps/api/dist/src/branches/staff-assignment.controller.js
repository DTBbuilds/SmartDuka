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
exports.StaffAssignmentController = void 0;
const common_1 = require("@nestjs/common");
const staff_assignment_service_1 = require("./staff-assignment.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let StaffAssignmentController = class StaffAssignmentController {
    staffAssignmentService;
    constructor(staffAssignmentService) {
        this.staffAssignmentService = staffAssignmentService;
    }
    async assignToBranch(dto, user) {
        return this.staffAssignmentService.assignToBranch(user.shopId, dto.userId, dto.branchId, user.sub);
    }
    async assignToMultipleBranches(dto, user) {
        return this.staffAssignmentService.assignToMultipleBranches(user.shopId, dto.userId, dto.branchIds, user.sub);
    }
    async getStaffByBranch(branchId, user) {
        return this.staffAssignmentService.getStaffByBranch(user.shopId, branchId);
    }
    async removeFromBranch(dto, user) {
        const removed = await this.staffAssignmentService.removeFromBranch(user.shopId, dto.userId, dto.branchId, user.sub);
        return { removed };
    }
    async updateBranchPermissions(dto, user) {
        return this.staffAssignmentService.updateBranchPermissions(user.shopId, dto.userId, dto.branchId, dto.permissions, user.sub);
    }
    async getBranchPermissions(userId, branchId, user) {
        return this.staffAssignmentService.getBranchPermissions(user.shopId, userId, branchId);
    }
};
exports.StaffAssignmentController = StaffAssignmentController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'branch_admin'),
    (0, common_1.Post)('assign'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StaffAssignmentController.prototype, "assignToBranch", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Post)('assign-multiple'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StaffAssignmentController.prototype, "assignToMultipleBranches", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('branch/:branchId'),
    __param(0, (0, common_1.Param)('branchId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StaffAssignmentController.prototype, "getStaffByBranch", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'branch_admin'),
    (0, common_1.Delete)('remove'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StaffAssignmentController.prototype, "removeFromBranch", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'branch_admin'),
    (0, common_1.Put)('permissions'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StaffAssignmentController.prototype, "updateBranchPermissions", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('permissions/:userId/:branchId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Param)('branchId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], StaffAssignmentController.prototype, "getBranchPermissions", null);
exports.StaffAssignmentController = StaffAssignmentController = __decorate([
    (0, common_1.Controller)('staff-assignment'),
    __metadata("design:paramtypes", [staff_assignment_service_1.StaffAssignmentService])
], StaffAssignmentController);
//# sourceMappingURL=staff-assignment.controller.js.map