"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const users_service_1 = require("../users/users.service");
const shops_service_1 = require("../shops/shops.service");
const bcryptjs = __importStar(require("bcryptjs"));
let AuthService = class AuthService {
    usersService;
    shopsService;
    jwtService;
    activityService;
    superAdminModel;
    constructor(usersService, shopsService, jwtService, activityService, superAdminModel) {
        this.usersService = usersService;
        this.shopsService = shopsService;
        this.jwtService = jwtService;
        this.activityService = activityService;
        this.superAdminModel = superAdminModel;
    }
    async registerShop(dto) {
        const shopData = {
            name: dto.admin.name,
            email: dto.admin.email,
            phone: dto.admin.phone,
        };
        if (dto.shop.address)
            shopData.address = dto.shop.address;
        if (dto.shop.city)
            shopData.city = dto.shop.city;
        if (dto.shop.businessType)
            shopData.businessType = dto.shop.businessType;
        if (dto.shop.kraPin)
            shopData.kraPin = dto.shop.kraPin;
        const shop = await this.shopsService.create('', shopData);
        const user = await this.usersService.create({
            shopId: shop._id.toString(),
            email: dto.admin.email,
            phone: dto.admin.phone,
            name: dto.admin.name,
            password: dto.admin.password,
            role: 'admin',
        });
        const token = this.jwtService.sign({
            sub: user._id,
            email: user.email,
            name: user.name || user.email,
            role: user.role,
            shopId: shop._id,
        });
        return {
            shop: {
                id: shop._id,
                shopId: shop.shopId,
                name: shop.name,
                status: shop.status,
                email: shop.email,
            },
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            token,
        };
    }
    async login(dto, ipAddress, userAgent) {
        if (dto.role === 'super_admin') {
            return this.loginSuperAdmin(dto);
        }
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isValid = await this.usersService.validatePassword(user, dto.password);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (user.status !== 'active') {
            throw new common_1.UnauthorizedException('Account is disabled');
        }
        if (dto.role && user.role !== dto.role) {
            throw new common_1.UnauthorizedException(`User role is ${user.role}, not ${dto.role}`);
        }
        if (dto.shopId && user.shopId.toString() !== dto.shopId) {
            throw new common_1.UnauthorizedException('User does not belong to this shop');
        }
        const shop = await this.shopsService.findById(user.shopId.toString());
        if (!shop) {
            throw new common_1.UnauthorizedException('Shop not found');
        }
        if (shop.status === 'suspended') {
            throw new common_1.UnauthorizedException('Shop is suspended');
        }
        const token = this.jwtService.sign({
            sub: user._id,
            email: user.email,
            name: user.name || user.email,
            role: user.role,
            shopId: user.shopId,
        });
        if (this.activityService) {
            await this.activityService.logActivity(user.shopId.toString(), user._id.toString(), user.name || user.email, user.role, 'login', { email: user.email }, ipAddress, userAgent);
        }
        return {
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                shopId: user.shopId,
            },
            shop: {
                id: shop._id,
                name: shop.name,
                status: shop.status,
            },
            token,
        };
    }
    async loginSuperAdmin(dto) {
        console.log('[SuperAdmin Login] Attempting login for:', dto.email);
        if (!this.superAdminModel) {
            console.error('[SuperAdmin Login] Model not available');
            throw new common_1.UnauthorizedException('Super admin authentication not available');
        }
        console.log('[SuperAdmin Login] Model available, searching for user...');
        const superAdmin = await this.superAdminModel.findOne({
            email: dto.email.toLowerCase().trim()
        });
        console.log('[SuperAdmin Login] Search result:', superAdmin ? 'Found' : 'Not found');
        if (!superAdmin) {
            console.error('[SuperAdmin Login] User not found:', dto.email);
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        let isValid = false;
        try {
            console.log('[SuperAdmin Login] Comparing passwords...');
            isValid = await bcryptjs.compare(dto.password, superAdmin.passwordHash);
            console.log('[SuperAdmin Login] Password valid:', isValid);
        }
        catch (error) {
            console.error('[SuperAdmin Login] Password comparison error:', error);
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!isValid) {
            console.error('[SuperAdmin Login] Invalid password');
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (superAdmin.status !== 'active') {
            console.error('[SuperAdmin Login] Account disabled:', superAdmin.status);
            throw new common_1.UnauthorizedException('Account is disabled');
        }
        console.log('[SuperAdmin Login] Login successful, generating token...');
        const token = this.jwtService.sign({
            sub: superAdmin._id,
            email: superAdmin.email,
            role: 'super_admin',
        });
        console.log('[SuperAdmin Login] Token generated successfully');
        return {
            user: {
                id: superAdmin._id,
                email: superAdmin.email,
                role: 'super_admin',
            },
            shop: null,
            token,
        };
    }
    async loginWithPin(pin, shopId, ipAddress, userAgent) {
        const user = await this.usersService.findByPin(pin, shopId);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid PIN');
        }
        if (user.status !== 'active') {
            throw new common_1.UnauthorizedException('Account is disabled');
        }
        const shop = await this.shopsService.findById(user.shopId.toString());
        if (!shop) {
            throw new common_1.UnauthorizedException('Shop not found');
        }
        if (shop.status === 'suspended') {
            throw new common_1.UnauthorizedException('Shop is suspended');
        }
        const token = this.jwtService.sign({
            sub: user._id,
            email: user.email,
            role: user.role,
            shopId: user.shopId,
        });
        await this.usersService.updateLastLogin(user._id.toString());
        if (this.activityService) {
            await this.activityService.logActivity(user.shopId.toString(), user._id.toString(), user.name || user.email, user.role, 'login_pin', { method: 'PIN' }, ipAddress, userAgent);
        }
        return {
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                shopId: user.shopId,
            },
            shop: {
                id: shop._id,
                name: shop.name,
                status: shop.status,
            },
            token,
        };
    }
    async setPin(userId, pin) {
        if (!/^\d{4,6}$/.test(pin)) {
            throw new common_1.BadRequestException('PIN must be 4-6 digits');
        }
        const hashedPin = await bcryptjs.hash(pin, 10);
        await this.usersService.updatePin(userId, hashedPin);
    }
    async validateUser(userId) {
        const user = await this.usersService.findById(userId);
        if (!user || user.status !== 'active') {
            return null;
        }
        return user;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Optional)()),
    __param(3, (0, common_1.Inject)('ActivityService')),
    __param(4, (0, mongoose_1.InjectModel)('SuperAdmin')),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        shops_service_1.ShopsService,
        jwt_1.JwtService, Object, mongoose_2.Model])
], AuthService);
//# sourceMappingURL=auth.service.js.map