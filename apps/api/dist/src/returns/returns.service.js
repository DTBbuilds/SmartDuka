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
var ReturnsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReturnsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const return_schema_1 = require("./schemas/return.schema");
let ReturnsService = ReturnsService_1 = class ReturnsService {
    returnModel;
    logger = new common_1.Logger(ReturnsService_1.name);
    constructor(returnModel) {
        this.returnModel = returnModel;
    }
    async createReturn(shopId, dto) {
        const orderDate = new Date(dto.orderDate);
        const returnWindow = dto.returnWindow || 7;
        const returnDeadline = new Date(orderDate);
        returnDeadline.setDate(returnDeadline.getDate() + returnWindow);
        if (new Date() > returnDeadline) {
            throw new common_1.BadRequestException(`Return window of ${returnWindow} days has expired`);
        }
        const totalRefundAmount = dto.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
        const returnRequest = new this.returnModel({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            orderId: new mongoose_2.Types.ObjectId(dto.orderId),
            items: dto.items.map((item) => ({
                productId: new mongoose_2.Types.ObjectId(item.productId),
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                reason: item.reason,
            })),
            totalRefundAmount,
            requestedBy: new mongoose_2.Types.ObjectId(dto.requestedBy),
            returnWindow,
        });
        return returnRequest.save();
    }
    async findAll(shopId, status) {
        const filter = { shopId: new mongoose_2.Types.ObjectId(shopId) };
        if (status) {
            filter.status = status;
        }
        return this.returnModel.find(filter).sort({ createdAt: -1 }).exec();
    }
    async findById(id) {
        return this.returnModel.findById(id).exec();
    }
    async getPendingReturns(shopId) {
        return this.returnModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            status: 'pending',
        })
            .sort({ createdAt: 1 })
            .exec();
    }
    async approveReturn(returnId, approvedBy, approvalNotes) {
        const returnRequest = await this.returnModel.findById(returnId).exec();
        if (!returnRequest) {
            throw new common_1.BadRequestException('Return request not found');
        }
        if (returnRequest.status !== 'pending') {
            throw new common_1.BadRequestException(`Cannot approve return with status: ${returnRequest.status}`);
        }
        return this.returnModel
            .findByIdAndUpdate(returnId, {
            status: 'approved',
            approvedBy: new mongoose_2.Types.ObjectId(approvedBy),
            approvalNotes,
        }, { new: true })
            .exec();
    }
    async rejectReturn(returnId, approvedBy, approvalNotes) {
        const returnRequest = await this.returnModel.findById(returnId).exec();
        if (!returnRequest) {
            throw new common_1.BadRequestException('Return request not found');
        }
        if (returnRequest.status !== 'pending') {
            throw new common_1.BadRequestException(`Cannot reject return with status: ${returnRequest.status}`);
        }
        return this.returnModel
            .findByIdAndUpdate(returnId, {
            status: 'rejected',
            approvedBy: new mongoose_2.Types.ObjectId(approvedBy),
            approvalNotes,
        }, { new: true })
            .exec();
    }
    async completeReturn(returnId) {
        const returnRequest = await this.returnModel.findById(returnId).exec();
        if (!returnRequest) {
            throw new common_1.BadRequestException('Return request not found');
        }
        if (returnRequest.status !== 'approved') {
            throw new common_1.BadRequestException('Only approved returns can be completed');
        }
        return this.returnModel
            .findByIdAndUpdate(returnId, {
            status: 'completed',
            completedAt: new Date(),
        }, { new: true })
            .exec();
    }
    async getReturnHistory(shopId, limit = 50) {
        return this.returnModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
            .sort({ createdAt: -1 })
            .limit(Math.min(limit, 200))
            .exec();
    }
    async getReturnStats(shopId) {
        const returns = await this.returnModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
            .exec();
        const stats = {
            totalReturns: returns.length,
            pendingReturns: returns.filter((r) => r.status === 'pending').length,
            approvedReturns: returns.filter((r) => r.status === 'approved').length,
            rejectedReturns: returns.filter((r) => r.status === 'rejected').length,
            totalRefundAmount: returns.reduce((sum, r) => sum + r.totalRefundAmount, 0),
        };
        return stats;
    }
};
exports.ReturnsService = ReturnsService;
exports.ReturnsService = ReturnsService = ReturnsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(return_schema_1.Return.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ReturnsService);
//# sourceMappingURL=returns.service.js.map