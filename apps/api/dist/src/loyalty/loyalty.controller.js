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
exports.LoyaltyController = void 0;
const common_1 = require("@nestjs/common");
const loyalty_service_1 = require("./loyalty.service");
const create_loyalty_program_dto_1 = require("./dto/create-loyalty-program.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let LoyaltyController = class LoyaltyController {
    loyaltyService;
    constructor(loyaltyService) {
        this.loyaltyService = loyaltyService;
    }
    async createProgram(dto, user) {
        return this.loyaltyService.createProgram(user.shopId, dto);
    }
    async getProgram(user) {
        return this.loyaltyService.getProgram(user.shopId);
    }
    async updateProgram(id, dto) {
        return this.loyaltyService.updateProgram(id, dto);
    }
    async enrollCustomer(customerId, programId, user) {
        return this.loyaltyService.enrollCustomer(user.shopId, customerId, programId);
    }
    async earnPoints(customerId, dto, user) {
        return this.loyaltyService.earnPoints(user.shopId, customerId, dto.amount, dto.reason);
    }
    async redeemPoints(customerId, dto, user) {
        return this.loyaltyService.redeemPoints(user.shopId, customerId, dto.points);
    }
    async claimBirthdayBonus(customerId, user) {
        return this.loyaltyService.claimBirthdayBonus(user.shopId, customerId);
    }
    async claimReferralBonus(dto, user) {
        return this.loyaltyService.claimReferralBonus(user.shopId, dto.referralCode);
    }
    async getAccount(customerId, user) {
        return this.loyaltyService.getAccount(user.shopId, customerId);
    }
    async getTopCustomers(limit, user) {
        return this.loyaltyService.getTopCustomers(user.shopId, parseInt(limit) || 10);
    }
    async getStats(user) {
        return this.loyaltyService.getLoyaltyStats(user.shopId);
    }
};
exports.LoyaltyController = LoyaltyController;
__decorate([
    (0, common_1.Post)('program'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_loyalty_program_dto_1.CreateLoyaltyProgramDto, Object]),
    __metadata("design:returntype", Promise)
], LoyaltyController.prototype, "createProgram", null);
__decorate([
    (0, common_1.Get)('program'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LoyaltyController.prototype, "getProgram", null);
__decorate([
    (0, common_1.Put)('program/:id'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LoyaltyController.prototype, "updateProgram", null);
__decorate([
    (0, common_1.Post)('enroll/:customerId'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('customerId')),
    __param(1, (0, common_1.Query)('programId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], LoyaltyController.prototype, "enrollCustomer", null);
__decorate([
    (0, common_1.Post)('earn/:customerId'),
    (0, roles_decorator_1.Roles)('admin', 'cashier'),
    __param(0, (0, common_1.Param)('customerId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], LoyaltyController.prototype, "earnPoints", null);
__decorate([
    (0, common_1.Post)('redeem/:customerId'),
    (0, roles_decorator_1.Roles)('admin', 'cashier'),
    __param(0, (0, common_1.Param)('customerId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], LoyaltyController.prototype, "redeemPoints", null);
__decorate([
    (0, common_1.Post)('birthday-bonus/:customerId'),
    __param(0, (0, common_1.Param)('customerId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LoyaltyController.prototype, "claimBirthdayBonus", null);
__decorate([
    (0, common_1.Post)('referral-bonus'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LoyaltyController.prototype, "claimReferralBonus", null);
__decorate([
    (0, common_1.Get)('account/:customerId'),
    __param(0, (0, common_1.Param)('customerId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LoyaltyController.prototype, "getAccount", null);
__decorate([
    (0, common_1.Get)('top-customers'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LoyaltyController.prototype, "getTopCustomers", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LoyaltyController.prototype, "getStats", null);
exports.LoyaltyController = LoyaltyController = __decorate([
    (0, common_1.Controller)('loyalty'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [loyalty_service_1.LoyaltyService])
], LoyaltyController);
//# sourceMappingURL=loyalty.controller.js.map