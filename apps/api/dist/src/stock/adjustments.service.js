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
var AdjustmentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdjustmentsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const adjustment_schema_1 = require("./adjustment.schema");
const product_schema_1 = require("../inventory/schemas/product.schema");
let AdjustmentsService = AdjustmentsService_1 = class AdjustmentsService {
    adjustmentModel;
    productModel;
    logger = new common_1.Logger(AdjustmentsService_1.name);
    constructor(adjustmentModel, productModel) {
        this.adjustmentModel = adjustmentModel;
        this.productModel = productModel;
    }
    async create(shopId, userId, dto) {
        const product = await this.productModel.findOne({
            _id: new mongoose_2.Types.ObjectId(dto.productId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product not found: ${dto.productId}`);
        }
        const previousStock = product.stock || 0;
        const newStock = previousStock + dto.delta;
        if (newStock < 0) {
            throw new common_1.BadRequestException(`Cannot reduce stock below zero. Current stock: ${previousStock}, Adjustment: ${dto.delta}`);
        }
        const updatedProduct = await this.productModel.findByIdAndUpdate(dto.productId, {
            $inc: { stock: dto.delta },
            $set: { lastRestockDate: dto.delta > 0 ? new Date() : undefined }
        }, { new: true });
        if (!updatedProduct) {
            throw new common_1.BadRequestException('Failed to update product stock');
        }
        const adjustment = new this.adjustmentModel({
            productId: new mongoose_2.Types.ObjectId(dto.productId),
            productName: dto.productName || product.name,
            delta: dto.delta,
            reason: dto.reason,
            description: dto.description,
            reference: dto.reference,
            shopId: new mongoose_2.Types.ObjectId(shopId),
            adjustedBy: new mongoose_2.Types.ObjectId(userId),
            previousStock,
            newStock: updatedProduct.stock,
        });
        const savedAdjustment = await adjustment.save();
        this.logger.log(`Stock adjustment: ${product.name} ${dto.delta > 0 ? '+' : ''}${dto.delta} (${dto.reason}) | ` +
            `Previous: ${previousStock} → New: ${updatedProduct.stock} | ` +
            `By: ${userId} | Ref: ${dto.reference || 'N/A'}`);
        return savedAdjustment;
    }
    async findAll(shopId) {
        return this.adjustmentModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
            .sort({ createdAt: -1 })
            .exec();
    }
    async findByProduct(productId, shopId) {
        return this.adjustmentModel
            .find({
            productId: new mongoose_2.Types.ObjectId(productId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        })
            .sort({ createdAt: -1 })
            .exec();
    }
    async findByReason(reason, shopId) {
        return this.adjustmentModel
            .find({
            reason,
            shopId: new mongoose_2.Types.ObjectId(shopId),
        })
            .sort({ createdAt: -1 })
            .exec();
    }
    async getAdjustmentSummary(shopId) {
        const adjustments = await this.adjustmentModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
            .exec();
        const byReason = {};
        let netAdjustment = 0;
        adjustments.forEach((adj) => {
            byReason[adj.reason] = (byReason[adj.reason] || 0) + adj.delta;
            netAdjustment += adj.delta;
        });
        return {
            totalAdjustments: adjustments.length,
            byReason,
            netAdjustment,
        };
    }
    async getRecentAdjustments(shopId, days = 7) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        return this.adjustmentModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            createdAt: { $gte: startDate },
        })
            .sort({ createdAt: -1 })
            .exec();
    }
};
exports.AdjustmentsService = AdjustmentsService;
exports.AdjustmentsService = AdjustmentsService = AdjustmentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(adjustment_schema_1.Adjustment.name)),
    __param(1, (0, mongoose_1.InjectModel)(product_schema_1.Product.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], AdjustmentsService);
//# sourceMappingURL=adjustments.service.js.map