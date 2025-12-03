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
let UsersService = class UsersService {
    userModel;
    constructor(userModel) {
        this.userModel = userModel;
    }
    async create(dto) {
        const { password, ...rest } = dto;
        const passwordHash = await bcrypt.hash(password, 10);
        const userData = {
            ...rest,
            shopId: new mongoose_2.Types.ObjectId(dto.shopId),
            passwordHash,
            phone: rest.phone && rest.phone.trim() ? rest.phone : null
        };
        const created = new this.userModel(userData);
        return created.save();
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
    async findCashiersByShop(shopId) {
        return this.userModel.find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            role: 'cashier'
        }).exec();
    }
    async countCashiersByShop(shopId) {
        return this.userModel.countDocuments({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            role: 'cashier'
        }).exec();
    }
    async updateStatus(userId, status) {
        return this.userModel.findByIdAndUpdate(userId, { status }, { new: true }).exec();
    }
    async validatePassword(user, password) {
        return bcrypt.compare(password, user.passwordHash);
    }
    async deleteUser(userId) {
        return this.userModel.findByIdAndDelete(userId).exec();
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
        const lastCashier = await this.userModel
            .findOne({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            role: 'cashier',
            cashierId: { $exists: true },
        })
            .sort({ cashierId: -1 })
            .select('cashierId');
        let nextNum = 1;
        if (lastCashier?.cashierId) {
            const match = lastCashier.cashierId.match(/C(\d+)/);
            if (match) {
                nextNum = parseInt(match[1], 10) + 1;
            }
        }
        const cashierId = `C${String(nextNum).padStart(3, '0')}`;
        const shortShopId = shopId.slice(-6);
        const uniqueEmail = createCashierDto.email || `cashier-${cashierId}-${shortShopId}@shop.local`;
        const existingUser = await this.userModel.findOne({ email: uniqueEmail });
        if (existingUser) {
            throw new Error(`A user with this email already exists. Please use a different email.`);
        }
        const user = new this.userModel({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            name: createCashierDto.name,
            phone: createCashierDto.phone,
            email: uniqueEmail,
            role: 'cashier',
            status: 'active',
            pinHash: hashedPin,
            cashierId,
            passwordHash: await import('bcryptjs').then((bcrypt) => bcrypt.hash(Math.random().toString(), 10)),
        });
        try {
            await user.save();
        }
        catch (err) {
            if (err.code === 11000) {
                throw new Error('A cashier with this ID already exists. Please try again.');
            }
            throw err;
        }
        return {
            user: user.toObject({ versionKey: false }),
            pin,
        };
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
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], UsersService);
//# sourceMappingURL=users.service.js.map