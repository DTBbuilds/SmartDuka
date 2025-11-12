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
var ShopsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const shop_schema_1 = require("./shop.schema");
const shop_id_generator_1 = require("./utils/shop-id-generator");
let ShopsService = ShopsService_1 = class ShopsService {
    shopModel;
    logger = new common_1.Logger(ShopsService_1.name);
    constructor(shopModel) {
        this.shopModel = shopModel;
    }
    async create(ownerId, dto) {
        const existingEmail = await this.shopModel.findOne({ email: dto.email });
        if (existingEmail) {
            throw new common_1.BadRequestException('Shop email already registered');
        }
        const existingPhone = await this.shopModel.findOne({ phone: dto.phone });
        if (existingPhone) {
            throw new common_1.BadRequestException('Shop phone number already registered');
        }
        try {
            const shopCount = await this.shopModel.countDocuments();
            const sequenceNumber = shopCount + 1;
            const shopId = (0, shop_id_generator_1.generateShopId)(sequenceNumber);
            const shopData = {
                ...dto,
                shopId,
                ownerId: ownerId ? new mongoose_2.Types.ObjectId(ownerId) : undefined,
                language: dto.language || 'en',
                status: 'pending',
                cashierCount: 0,
                totalSales: 0,
                totalOrders: 0,
                onboardingComplete: false,
                kraPin: dto.kraPin && dto.kraPin.trim() ? dto.kraPin : null,
            };
            const shop = new this.shopModel(shopData);
            return await shop.save();
        }
        catch (error) {
            if (error.code === 11000) {
                const field = Object.keys(error.keyPattern || {})[0];
                if (field === 'email') {
                    throw new common_1.BadRequestException('Shop email already registered');
                }
                else if (field === 'phone') {
                    throw new common_1.BadRequestException('Shop phone number already registered');
                }
                else if (field === 'shopId') {
                    throw new common_1.BadRequestException('Shop ID generation conflict, please try again');
                }
                else {
                    throw new common_1.BadRequestException(`${field} already registered`);
                }
            }
            throw error;
        }
    }
    async findById(shopId) {
        return this.shopModel.findById(new mongoose_2.Types.ObjectId(shopId)).exec();
    }
    async findByOwner(ownerId) {
        return this.shopModel.findOne({ ownerId: new mongoose_2.Types.ObjectId(ownerId) }).exec();
    }
    async update(shopId, dto) {
        try {
            const updateData = {
                ...dto,
                updatedAt: new Date(),
                kraPin: dto.kraPin !== undefined ? (dto.kraPin && dto.kraPin.trim() ? dto.kraPin : null) : undefined,
            };
            return await this.shopModel
                .findByIdAndUpdate(new mongoose_2.Types.ObjectId(shopId), updateData, { new: true })
                .exec();
        }
        catch (error) {
            if (error.code === 11000) {
                const field = Object.keys(error.keyPattern || {})[0];
                if (field === 'email') {
                    throw new common_1.BadRequestException('Shop email already registered');
                }
                else if (field === 'phone') {
                    throw new common_1.BadRequestException('Shop phone number already registered');
                }
                else if (field === 'kraPin') {
                    throw new common_1.BadRequestException('KRA PIN already registered');
                }
                else {
                    throw new common_1.BadRequestException(`${field} already registered`);
                }
            }
            throw error;
        }
    }
    async completeOnboarding(shopId) {
        return this.shopModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(shopId), { onboardingComplete: true, updatedAt: new Date() }, { new: true })
            .exec();
    }
    async updateSettings(shopId, settings) {
        return this.shopModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(shopId), { settings, updatedAt: new Date() }, { new: true })
            .exec();
    }
    async updateLanguage(shopId, language) {
        return this.shopModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(shopId), { language, updatedAt: new Date() }, { new: true })
            .exec();
    }
    async findByEmail(email) {
        return this.shopModel.findOne({ email }).exec();
    }
    async findByPhone(phone) {
        return this.shopModel.findOne({ phone }).exec();
    }
    async updateStatus(shopId, status, notes) {
        return this.shopModel
            .findByIdAndUpdate(new mongoose_2.Types.ObjectId(shopId), {
            status,
            verificationDate: status === 'verified' || status === 'active' ? new Date() : undefined,
            verificationNotes: notes,
            updatedAt: new Date(),
        }, { new: true })
            .exec();
    }
    async incrementCashierCount(shopId) {
        const shop = await this.findById(shopId);
        if (!shop)
            throw new common_1.BadRequestException('Shop not found');
        if (shop.cashierCount >= 2) {
            throw new common_1.BadRequestException('Maximum 2 cashiers allowed per shop');
        }
        await this.shopModel.findByIdAndUpdate(new mongoose_2.Types.ObjectId(shopId), {
            $inc: { cashierCount: 1 },
            updatedAt: new Date(),
        });
    }
    async decrementCashierCount(shopId) {
        await this.shopModel.findByIdAndUpdate(new mongoose_2.Types.ObjectId(shopId), {
            $inc: { cashierCount: -1 },
            updatedAt: new Date(),
        });
    }
    async getStats(shopId) {
        const shop = await this.findById(shopId);
        if (!shop)
            throw new common_1.BadRequestException('Shop not found');
        return {
            name: shop.name,
            status: shop.status,
            cashierCount: shop.cashierCount,
            totalSales: shop.totalSales,
            totalOrders: shop.totalOrders,
            createdAt: shop.createdAt,
            onboardingComplete: shop.onboardingComplete,
        };
    }
    async getPendingShops() {
        return this.shopModel.find({ status: 'pending' }).exec();
    }
    async getActiveShops() {
        return this.shopModel.find({ status: 'active' }).exec();
    }
    async findAll() {
        const shops = await this.shopModel.find({ status: 'active' }).select('_id name').exec();
        return shops.map((shop) => ({
            id: shop._id,
            name: shop.name,
        }));
    }
};
exports.ShopsService = ShopsService;
exports.ShopsService = ShopsService = ShopsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(shop_schema_1.Shop.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ShopsService);
//# sourceMappingURL=shops.service.js.map