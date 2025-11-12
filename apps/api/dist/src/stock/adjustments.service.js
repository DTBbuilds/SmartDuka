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
let AdjustmentsService = AdjustmentsService_1 = class AdjustmentsService {
    adjustmentModel;
    logger = new common_1.Logger(AdjustmentsService_1.name);
    constructor(adjustmentModel) {
        this.adjustmentModel = adjustmentModel;
    }
    async create(shopId, userId, dto) {
        const adjustment = new this.adjustmentModel({
            productId: new mongoose_2.Types.ObjectId(dto.productId),
            productName: dto.productName,
            delta: dto.delta,
            reason: dto.reason,
            description: dto.description,
            reference: dto.reference,
            shopId: new mongoose_2.Types.ObjectId(shopId),
            adjustedBy: new mongoose_2.Types.ObjectId(userId),
        });
        this.logger.log(`Stock adjustment: ${dto.productName} ${dto.delta > 0 ? '+' : ''}${dto.delta} (${dto.reason})`);
        return adjustment.save();
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
    __metadata("design:paramtypes", [mongoose_2.Model])
], AdjustmentsService);
//# sourceMappingURL=adjustments.service.js.map