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
exports.TransactionControlsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const order_schema_1 = require("./schemas/order.schema");
let TransactionControlsService = class TransactionControlsService {
    orderModel;
    constructor(orderModel) {
        this.orderModel = orderModel;
    }
    async voidTransaction(orderId, shopId, voidReason, cashierId, requiresApproval = true) {
        const order = await this.orderModel.findOne({
            _id: new mongoose_2.Types.ObjectId(orderId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.status === 'void') {
            throw new common_1.BadRequestException('Order is already voided');
        }
        if (!voidReason || voidReason.trim().length === 0) {
            throw new common_1.BadRequestException('Void reason is required');
        }
        const updateData = {
            transactionType: 'void',
            voidReason,
            status: 'void',
        };
        if (requiresApproval) {
            updateData.voidApprovedBy = new mongoose_2.Types.ObjectId(cashierId);
            updateData.voidApprovedAt = new Date();
        }
        const updated = await this.orderModel.findByIdAndUpdate(orderId, updateData, { new: true });
        if (!updated) {
            throw new common_1.NotFoundException('Order not found after update');
        }
        return updated;
    }
    async applyDiscount(orderId, shopId, discountAmount, discountReason, cashierId, requiresApproval = true) {
        const order = await this.orderModel.findOne({
            _id: new mongoose_2.Types.ObjectId(orderId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.status === 'void') {
            throw new common_1.BadRequestException('Cannot discount voided order');
        }
        if (discountAmount < 0 || discountAmount > order.total) {
            throw new common_1.BadRequestException('Invalid discount amount');
        }
        if (!discountReason || discountReason.trim().length === 0) {
            throw new common_1.BadRequestException('Discount reason is required');
        }
        const updateData = {
            discountAmount,
            discountReason,
            total: order.total - discountAmount,
        };
        if (requiresApproval) {
            updateData.discountApprovedBy = new mongoose_2.Types.ObjectId(cashierId);
        }
        const updated = await this.orderModel.findByIdAndUpdate(orderId, updateData, { new: true });
        if (!updated) {
            throw new common_1.NotFoundException('Order not found after update');
        }
        return updated;
    }
    async processRefund(orderId, shopId, refundAmount, refundReason, cashierId, requiresApproval = true) {
        const order = await this.orderModel.findOne({
            _id: new mongoose_2.Types.ObjectId(orderId),
            shopId: new mongoose_2.Types.ObjectId(shopId),
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.status !== 'completed') {
            throw new common_1.BadRequestException('Can only refund completed orders');
        }
        if (refundAmount < 0 || refundAmount > order.total) {
            throw new common_1.BadRequestException('Invalid refund amount');
        }
        if (!refundReason || refundReason.trim().length === 0) {
            throw new common_1.BadRequestException('Refund reason is required');
        }
        const updateData = {
            transactionType: 'refund',
            refundAmount,
            refundReason,
            status: refundAmount === order.total ? 'void' : 'completed',
        };
        if (requiresApproval) {
            updateData.refundApprovedBy = new mongoose_2.Types.ObjectId(cashierId);
            updateData.refundApprovedAt = new Date();
        }
        const updated = await this.orderModel.findByIdAndUpdate(orderId, updateData, { new: true });
        if (!updated) {
            throw new common_1.NotFoundException('Order not found after update');
        }
        return updated;
    }
    async getTransactionsByType(shopId, transactionType, limit = 50) {
        return this.orderModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            transactionType,
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec();
    }
    async getVoidedTransactions(shopId, limit = 50) {
        return this.getTransactionsByType(shopId, 'void', limit);
    }
    async getRefundedTransactions(shopId, limit = 50) {
        return this.getTransactionsByType(shopId, 'refund', limit);
    }
    async getTransactionsByCashier(shopId, cashierId, limit = 50) {
        return this.orderModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            userId: new mongoose_2.Types.ObjectId(cashierId),
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec();
    }
    async getShiftTransactions(shopId, shiftId, limit = 100) {
        return this.orderModel
            .find({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            shiftId: new mongoose_2.Types.ObjectId(shiftId),
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec();
    }
    async getTransactionStats(shopId) {
        const stats = await this.orderModel.aggregate([
            { $match: { shopId: new mongoose_2.Types.ObjectId(shopId) } },
            {
                $group: {
                    _id: '$transactionType',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$total' },
                },
            },
        ]);
        return stats;
    }
    async getCashierStats(shopId, cashierId) {
        const stats = await this.orderModel.aggregate([
            {
                $match: {
                    shopId: new mongoose_2.Types.ObjectId(shopId),
                    userId: new mongoose_2.Types.ObjectId(cashierId),
                },
            },
            {
                $group: {
                    _id: '$transactionType',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$total' },
                },
            },
        ]);
        return stats;
    }
};
exports.TransactionControlsService = TransactionControlsService;
exports.TransactionControlsService = TransactionControlsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(order_schema_1.Order.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], TransactionControlsService);
//# sourceMappingURL=transaction-controls.service.js.map