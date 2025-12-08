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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bcrypt = __importStar(require("bcryptjs"));
const user_schema_1 = require("./schemas/user.schema");
const subscription_guard_service_1 = require("../subscriptions/subscription-guard.service");
let UsersService = class UsersService {
    userModel;
    subscriptionGuard;
    constructor(userModel, subscriptionGuard) {
        this.userModel = userModel;
        this.subscriptionGuard = subscriptionGuard;
    }
    async create(dto) {
        const isEmployee = dto.role !== 'admin';
        if (isEmployee) {
            await this.subscriptionGuard.enforceLimit(dto.shopId, 'employees');
        }
        const { password, ...rest } = dto;
        const passwordHash = await bcrypt.hash(password, 10);
        const userData = {
            ...rest,
            shopId: new mongoose_2.Types.ObjectId(dto.shopId),
            passwordHash,
            phone: rest.phone && rest.phone.trim() ? rest.phone : null
        };
        const created = new this.userModel(userData);
        const user = await created.save();
        if (isEmployee) {
            await this.subscriptionGuard.incrementUsage(dto.shopId, 'employees');
        }
        return user;
    }
    async findByEmail(email) {
        return this.userModel.findOne({ email }).exec();
    }
    async findByEmailAndShop(email, shopId) {
        return this.userModel.findOne({
            email,
            shopId: new mongoose_2.Types.ObjectId(shopId)
        }).exec();
    }
    async findById(id) {
        return this.userModel.findById(id).exec();
    }
    async findByShop(shopId) {
        return this.userModel.find({ shopId: new mongoose_2.Types.ObjectId(shopId) }).exec();
    }
    async findCashiersByShop(shopId, branchId) {
        const query = {
            shopId: new mongoose_2.Types.ObjectId(shopId),
            role: 'cashier'
        };
        if (branchId) {
            query.branchId = new mongoose_2.Types.ObjectId(branchId);
        }
        return this.userModel.find(query).populate('branchId', 'name code').exec();
    }
    async findCashiersByBranch(branchId) {
        return this.userModel.find({
            branchId: new mongoose_2.Types.ObjectId(branchId),
            role: 'cashier'
        }).exec();
    }
    async countCashiersByShop(shopId) {
        return this.userModel.countDocuments({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            role: 'cashier'
        }).exec();
    }
    async countCashiersByBranch(branchId) {
        return this.userModel.countDocuments({
            branchId: new mongoose_2.Types.ObjectId(branchId),
            role: 'cashier'
        }).exec();
    }
    async findUsersWithFilters(shopId, filters) {
        const query = { shopId: new mongoose_2.Types.ObjectId(shopId) };
        if (filters.role) {
            query.role = filters.role;
        }
        if (filters.branchId) {
            query.branchId = new mongoose_2.Types.ObjectId(filters.branchId);
        }
        if (filters.status) {
            query.status = filters.status;
        }
        return this.userModel.find(query).populate('branchId', 'name code').sort({ createdAt: -1 }).exec();
    }
    async assignCashierToBranch(shopId, userId, branchId) {
        const user = await this.userModel.findOne({
            _id: new mongoose_2.Types.ObjectId(userId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
            role: 'cashier',
        });
        if (!user) {
            throw new common_1.NotFoundException('Cashier not found');
        }
        return this.userModel.findByIdAndUpdate(userId, { branchId: new mongoose_2.Types.ObjectId(branchId) }, { new: true }).populate('branchId', 'name code').exec();
    }
    async unassignCashierFromBranch(shopId, userId) {
        const user = await this.userModel.findOne({
            _id: new mongoose_2.Types.ObjectId(userId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
            role: 'cashier',
        });
        if (!user) {
            throw new common_1.NotFoundException('Cashier not found');
        }
        return this.userModel.findByIdAndUpdate(userId, { $unset: { branchId: 1 } }, { new: true }).exec();
    }
    async transferCashierToBranch(shopId, userId, newBranchId) {
        return this.assignCashierToBranch(shopId, userId, newBranchId);
    }
    async updateCashier(shopId, userId, updateData) {
        const user = await this.userModel.findOne({
            _id: new mongoose_2.Types.ObjectId(userId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const updateFields = {};
        if (updateData.name)
            updateFields.name = updateData.name;
        if (updateData.phone !== undefined)
            updateFields.phone = updateData.phone || null;
        if (updateData.branchId !== undefined) {
            updateFields.branchId = updateData.branchId ? new mongoose_2.Types.ObjectId(updateData.branchId) : null;
        }
        if (updateData.permissions) {
            updateFields.permissions = { ...user.permissions, ...updateData.permissions };
        }
        return this.userModel.findByIdAndUpdate(userId, { $set: updateFields }, { new: true }).exec();
    }
    async getCashierDetails(shopId, userId) {
        const user = await this.userModel.findOne({
            _id: new mongoose_2.Types.ObjectId(userId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        }).populate('branchId', 'name code').exec();
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async updateStatus(userId, status) {
        return this.userModel.findByIdAndUpdate(userId, { status }, { new: true }).exec();
    }
    async validatePassword(user, password) {
        return bcrypt.compare(password, user.passwordHash);
    }
    async deleteUser(shopId, userId) {
        const user = await this.userModel.findOne({
            _id: new mongoose_2.Types.ObjectId(userId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.role === 'admin') {
            throw new common_1.BadRequestException('Cannot delete admin users. Disable them instead.');
        }
        await this.userModel.deleteOne({ _id: new mongoose_2.Types.ObjectId(userId) });
        await this.subscriptionGuard.decrementUsage(shopId, 'employees');
        return { deleted: true, message: 'User deleted successfully' };
    }
    async findByPin(pin, shopId) {
        const users = await this.userModel.find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            status: 'active',
        }).exec();
        for (const user of users) {
            if (user.pinHash) {
                const isValid = await this.validatePin(user, pin);
                if (isValid) {
                    return user;
                }
            }
        }
        return null;
    }
    async validatePin(user, pin) {
        if (!user.pinHash) {
            return false;
        }
        const bcrypt = await import('bcryptjs');
        return bcrypt.compare(pin, user.pinHash);
    }
    async updatePin(userId, hashedPin) {
        return this.userModel.findByIdAndUpdate(userId, { pinHash: hashedPin }, { new: true }).exec();
    }
    async updateLastLogin(userId) {
        return this.userModel.findByIdAndUpdate(userId, { lastLoginAt: new Date() }, { new: true }).exec();
    }
    async generatePin() {
        let pin = '';
        do {
            pin = Math.floor(Math.random() * 1000000).toString().padStart(4, '0');
        } while (this.isInvalidPin(pin));
        return pin;
    }
    isInvalidPin(pin) {
        const isSequential = /^(\d)\1+$/.test(pin) ||
            /^(?:0123|1234|2345|3456|4567|5678|6789|7890|9876|8765|7654|6543|5432|4321|3210)/.test(pin);
        const isRepeated = /^(\d)\1{3,}$/.test(pin);
        return isSequential || isRepeated;
    }
    async createCashierWithPin(shopId, createCashierDto) {
        const pin = await this.generatePin();
        const hashedPin = await import('bcryptjs').then((bcrypt) => bcrypt.hash(pin, 10));
        const maxRetries = 3;
        let lastError;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const allCashiers = await this.userModel
                .find({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                role: 'cashier',
                cashierId: { $exists: true, $ne: null },
            })
                .select('cashierId')
                .lean();
            let maxNum = 0;
            for (const c of allCashiers) {
                if (c.cashierId) {
                    const match = c.cashierId.match(/C(\d+)/);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (num > maxNum)
                            maxNum = num;
                    }
                }
            }
            const nextNum = maxNum + 1 + attempt;
            const cashierId = `C${String(nextNum).padStart(3, '0')}`;
            const shortShopId = shopId.slice(-6);
            const timestamp = Date.now().toString(36);
            const uniqueEmail = createCashierDto.email || `cashier-${cashierId}-${shortShopId}-${timestamp}@shop.local`;
            if (createCashierDto.email) {
                const existingUser = await this.userModel.findOne({ email: uniqueEmail });
                if (existingUser) {
                    throw new common_1.ConflictException(`A user with this email already exists. Please use a different email.`);
                }
            }
            const existingCashier = await this.userModel.findOne({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                cashierId
            });
            if (existingCashier) {
                continue;
            }
            const userData = {
                shopId: new mongoose_2.Types.ObjectId(shopId),
                name: createCashierDto.name,
                phone: createCashierDto.phone || null,
                email: uniqueEmail,
                role: 'cashier',
                status: 'active',
                pinHash: hashedPin,
                cashierId,
                passwordHash: await import('bcryptjs').then((bcrypt) => bcrypt.hash(Math.random().toString(), 10)),
            };
            if (createCashierDto.branchId) {
                userData.branchId = new mongoose_2.Types.ObjectId(createCashierDto.branchId);
            }
            if (createCashierDto.permissions) {
                userData.permissions = createCashierDto.permissions;
            }
            const user = new this.userModel(userData);
            try {
                await user.save();
                return {
                    user: user.toObject({ versionKey: false }),
                    pin,
                };
            }
            catch (err) {
                lastError = err;
                if (err.code === 11000) {
                    const keyPattern = err.keyPattern || {};
                    const keyValue = err.keyValue || {};
                    if (keyPattern.shopId && keyPattern.cashierId) {
                        continue;
                    }
                    if (keyPattern.cashierId) {
                        continue;
                    }
                    if (keyPattern.email) {
                        throw new common_1.ConflictException('A user with this email already exists. Please use a different email.');
                    }
                    if (keyPattern.phone) {
                        throw new common_1.ConflictException('A user with this phone number already exists.');
                    }
                    continue;
                }
                throw err;
            }
        }
        throw new common_1.ConflictException('Unable to create cashier. Please try again.');
    }
    async resetPin(userId, shopId) {
        const user = await this.userModel.findOne({
            _id: new mongoose_2.Types.ObjectId(userId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.role !== 'cashier') {
            throw new common_1.BadRequestException('Can only reset PIN for cashiers');
        }
        const newPin = await this.generatePin();
        const hashedPin = await import('bcryptjs').then((bcrypt) => bcrypt.hash(newPin, 10));
        await this.userModel.findByIdAndUpdate(userId, { pinHash: hashedPin }, { new: true });
        return newPin;
    }
    async changePin(userId, currentPin, newPin) {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const isValid = await this.validatePin(user, currentPin);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Current PIN is incorrect');
        }
        if (this.isInvalidPin(newPin)) {
            throw new common_1.BadRequestException('Invalid PIN format');
        }
        const hashedPin = await import('bcryptjs').then((bcrypt) => bcrypt.hash(newPin, 10));
        await this.userModel.findByIdAndUpdate(userId, { pinHash: hashedPin }, { new: true });
    }
    async findByGoogleId(googleId) {
        return this.userModel.findOne({ googleId }).exec();
    }
    async linkGoogleAccount(userId, googleId, avatarUrl) {
        return this.userModel.findByIdAndUpdate(userId, {
            googleId,
            avatarUrl,
            authProvider: 'google',
        }, { new: true }).exec();
    }
    async createGoogleUser(data) {
        const randomPassword = Math.random().toString(36).slice(-12);
        const passwordHash = await bcrypt.hash(randomPassword, 10);
        const user = new this.userModel({
            shopId: new mongoose_2.Types.ObjectId(data.shopId),
            email: data.email,
            name: data.name,
            googleId: data.googleId,
            avatarUrl: data.avatarUrl,
            phone: data.phone,
            authProvider: 'google',
            role: data.role || 'admin',
            status: 'active',
            passwordHash,
        });
        return user.save();
    }
    async countEmployeesByShop(shopId) {
        return this.userModel.countDocuments({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            role: { $ne: 'admin' },
        }).exec();
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => subscription_guard_service_1.SubscriptionGuardService))),
    __metadata("design:paramtypes", [mongoose_2.Model,
        subscription_guard_service_1.SubscriptionGuardService])
], UsersService);
//# sourceMappingURL=users.service.js.map