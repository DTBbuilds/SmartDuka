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
            throw new Error('Unauthorized');
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
    async findByEmail(email) {
        if (!email)
            return [];
        const user = await this.usersService.findByEmail(email);
        if (!user)
            return [];
        const { passwordHash, ...safe } = user.toObject();
        return [safe];
    }
    async getCashiersByShop(shopId, user) {
        if (user.shopId !== shopId) {
            throw new Error('Unauthorized');
        }
        const cashiers = await this.usersService.findCashiersByShop(shopId);
        return cashiers.map((c) => {
            const { passwordHash, pinHash, ...safe } = c.toObject();
            return safe;
        });
    }
    async updateUser(id, dto, user) {
        const targetUser = await this.usersService.findById(id);
        if (!targetUser || targetUser.shopId.toString() !== user.shopId) {
            throw new Error('Unauthorized');
        }
        const updated = await this.usersService.updateStatus(id, dto.status);
        if (!updated)
            return null;
        const { passwordHash, ...safe } = updated.toObject();
        return safe;
    }
    async deleteUser(id, user) {
        const targetUser = await this.usersService.findById(id);
        if (!targetUser || targetUser.shopId.toString() !== user.shopId) {
            throw new Error('Unauthorized');
        }
        if (targetUser.role === 'admin') {
            throw new Error('Cannot delete admin users');
        }
        return this.usersService.deleteUser(id);
    }
    async createCashier(dto, user) {
        const { user: createdUser, pin } = await this.usersService.createCashierWithPin(user.shopId, dto);
        return {
            user: {
                id: createdUser._id,
                name: createdUser.name,
                email: createdUser.email,
                phone: createdUser.phone,
                cashierId: createdUser.cashierId,
                role: createdUser.role,
                status: createdUser.status,
            },
            pin,
        };
    }
    async resetPin(userId, user) {
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
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findByEmail", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Get)('shop/:shopId/cashiers'),
    __param(0, (0, common_1.Param)('shopId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getCashiersByShop", null);
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
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Post)('cashier'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_cashier_dto_1.CreateCashierDto, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createCashier", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
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