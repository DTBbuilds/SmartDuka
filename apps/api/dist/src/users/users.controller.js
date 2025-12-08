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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const create_user_dto_1 = require("./dto/create-user.dto");
const create_cashier_dto_1 = require("./dto/create-cashier.dto");
const update_pin_dto_1 = require("./dto/update-pin.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let UsersController = class UsersController {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    async create(dto, user) {
        if (dto.shopId !== user.shopId) {
            throw new common_1.ForbiddenException('You are not allowed to create users for this shop');
        }
        const createdUser = await this.usersService.create(dto);
        const { passwordHash, ...safe } = createdUser.toObject();
        return safe;
    }
    async findById(id) {
        const user = await this.usersService.findById(id);
        if (!user)
            return null;
        const { passwordHash, ...safe } = user.toObject();
        return safe;
    }
    async me(req) {
        return req.user;
    }
    async findUsers(email, role, branchId, status, user) {
        if (email && !role && !branchId) {
            const foundUser = await this.usersService.findByEmail(email);
            if (!foundUser)
                return [];
            const { passwordHash, ...safe } = foundUser.toObject();
            return [safe];
        }
        const users = await this.usersService.findUsersWithFilters(user.shopId, { role, branchId, status });
        return users.map((u) => {
            const { passwordHash, pinHash, ...safe } = u.toObject ? u.toObject() : u;
            return safe;
        });
    }
    async getCashiersByShop(shopId, branchId, user) {
        if (user.shopId !== shopId) {
            throw new common_1.ForbiddenException('You are not allowed to access this shop');
        }
        let effectiveBranchId = branchId;
        if (user.role === 'branch_manager' && user.branchId) {
            effectiveBranchId = user.branchId;
        }
        const cashiers = await this.usersService.findCashiersByShop(shopId, effectiveBranchId);
        return cashiers.map((c) => {
            const { passwordHash, pinHash, ...safe } = c.toObject ? c.toObject() : c;
            return safe;
        });
    }
    async getCashiersByBranch(branchId, user) {
        if (user.role === 'branch_manager' && user.branchId !== branchId) {
            throw new common_1.ForbiddenException('You can only access cashiers in your branch');
        }
        const cashiers = await this.usersService.findCashiersByBranch(branchId);
        return cashiers.map((c) => {
            const { passwordHash, pinHash, ...safe } = c.toObject ? c.toObject() : c;
            return safe;
        });
    }
    async getCashierDetails(id, user) {
        const cashier = await this.usersService.getCashierDetails(user.shopId, id);
        const { passwordHash, pinHash, ...safe } = cashier.toObject ? cashier.toObject() : cashier;
        return safe;
    }
    async updateUser(id, dto, user) {
        const targetUser = await this.usersService.findById(id);
        if (!targetUser || targetUser.shopId.toString() !== user.shopId) {
            throw new common_1.ForbiddenException('You are not allowed to update users from this shop');
        }
        const updated = await this.usersService.updateCashier(user.shopId, id, {
            name: dto.name,
            phone: dto.phone,
            branchId: dto.branchId,
            permissions: dto.permissions,
        });
        if (!updated)
            return null;
        const { passwordHash, pinHash, ...safe } = updated.toObject();
        return safe;
    }
    async updateUserStatus(id, dto, user) {
        const targetUser = await this.usersService.findById(id);
        if (!targetUser || targetUser.shopId.toString() !== user.shopId) {
            throw new common_1.ForbiddenException('You are not allowed to update users from this shop');
        }
        const updated = await this.usersService.updateStatus(id, dto.status);
        if (!updated) {
            throw new common_1.NotFoundException('User not found');
        }
        const { passwordHash, pinHash, ...safe } = updated.toObject();
        return safe;
    }
    async updateCashierPermissions(id, dto, user) {
        const updated = await this.usersService.updateCashier(user.shopId, id, {
            permissions: dto,
        });
        if (!updated) {
            throw new common_1.NotFoundException('User not found');
        }
        const { passwordHash, pinHash, ...safe } = updated.toObject();
        return safe;
    }
    async deleteUser(id, user) {
        return this.usersService.deleteUser(user.shopId, id);
    }
    async createCashier(dto, user) {
        let branchId = dto.branchId;
        if (user.role === 'branch_manager') {
            if (!user.branchId) {
                throw new common_1.ForbiddenException('Branch manager must be assigned to a branch');
            }
            branchId = user.branchId;
        }
        const { user: createdUser, pin } = await this.usersService.createCashierWithPin(user.shopId, { ...dto, branchId });
        return {
            user: {
                id: createdUser._id,
                name: createdUser.name,
                email: createdUser.email,
                phone: createdUser.phone,
                cashierId: createdUser.cashierId,
                branchId: createdUser.branchId,
                role: createdUser.role,
                status: createdUser.status,
            },
            pin,
        };
    }
    async assignCashierToBranch(userId, dto, user) {
        if (!dto.branchId) {
            throw new common_1.BadRequestException('branchId is required');
        }
        const updated = await this.usersService.assignCashierToBranch(user.shopId, userId, dto.branchId);
        if (!updated) {
            throw new common_1.NotFoundException('Cashier not found');
        }
        const { passwordHash, pinHash, ...safe } = updated.toObject ? updated.toObject() : updated;
        return safe;
    }
    async unassignCashierFromBranch(userId, user) {
        const updated = await this.usersService.unassignCashierFromBranch(user.shopId, userId);
        if (!updated) {
            throw new common_1.NotFoundException('Cashier not found');
        }
        const { passwordHash, pinHash, ...safe } = updated.toObject ? updated.toObject() : updated;
        return safe;
    }
    async transferCashierToBranch(userId, dto, user) {
        if (!dto.branchId) {
            throw new common_1.BadRequestException('branchId is required');
        }
        const updated = await this.usersService.transferCashierToBranch(user.shopId, userId, dto.branchId);
        if (!updated) {
            throw new common_1.NotFoundException('Cashier not found');
        }
        const { passwordHash, pinHash, ...safe } = updated.toObject ? updated.toObject() : updated;
        return safe;
    }
    async resetPin(userId, user) {
        if (user.role === 'branch_manager') {
            const cashier = await this.usersService.findById(userId);
            if (!cashier || cashier.branchId?.toString() !== user.branchId) {
                throw new common_1.ForbiddenException('You can only reset PIN for cashiers in your branch');
            }
        }
        const newPin = await this.usersService.resetPin(userId, user.shopId);
        return {
            message: 'PIN reset successfully',
            pin: newPin,
        };
    }
    async changePin(dto, user) {
        if (dto.newPin !== dto.confirmPin) {
            throw new common_1.BadRequestException('New PINs do not match');
        }
        await this.usersService.changePin(user.sub, dto.currentPin, dto.newPin);
        return { message: 'PIN changed successfully' };
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_dto_1.CreateUserDto, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findById", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "me", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'branch_admin', 'branch_manager'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('email')),
    __param(1, (0, common_1.Query)('role')),
    __param(2, (0, common_1.Query)('branchId')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findUsers", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'branch_admin', 'branch_manager'),
    (0, common_1.Get)('shop/:shopId/cashiers'),
    __param(0, (0, common_1.Param)('shopId')),
    __param(1, (0, common_1.Query)('branchId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getCashiersByShop", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'branch_admin', 'branch_manager'),
    (0, common_1.Get)('branch/:branchId/cashiers'),
    __param(0, (0, common_1.Param)('branchId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getCashiersByBranch", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'branch_admin', 'branch_manager'),
    (0, common_1.Get)(':id/details'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getCashierDetails", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateUser", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateUserStatus", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Patch)(':id/permissions'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateCashierPermissions", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'branch_admin', 'branch_manager'),
    (0, common_1.Post)('cashier'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_cashier_dto_1.CreateCashierDto, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createCashier", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'branch_admin'),
    (0, common_1.Patch)(':id/assign-branch'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "assignCashierToBranch", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'branch_admin'),
    (0, common_1.Patch)(':id/unassign-branch'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "unassignCashierFromBranch", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'branch_admin'),
    (0, common_1.Patch)(':id/transfer-branch'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "transferCashierToBranch", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'branch_admin', 'branch_manager'),
    (0, common_1.Post)(':id/reset-pin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "resetPin", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('me/change-pin'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_pin_dto_1.ChangePinDto, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "changePin", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map