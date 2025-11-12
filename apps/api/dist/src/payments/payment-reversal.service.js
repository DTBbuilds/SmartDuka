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
var PaymentReversalService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentReversalService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const order_schema_1 = require("../sales/schemas/order.schema");
const daraja_service_1 = require("./daraja.service");
let PaymentReversalService = PaymentReversalService_1 = class PaymentReversalService {
    orderModel;
    darajaService;
    logger = new common_1.Logger(PaymentReversalService_1.name);
    constructor(orderModel, darajaService) {
        this.orderModel = orderModel;
        this.darajaService = darajaService;
    }
    async reversePayment(shopId, orderId, paymentId, reason, reversedBy, notes) {
        try {
            const order = await this.orderModel.findById(orderId).exec();
            if (!order) {
                throw new common_1.BadRequestException('Order not found');
            }
            if (order.shopId.toString() !== shopId) {
                throw new common_1.BadRequestException('Order does not belong to this shop');
            }
            const payment = order.payments?.find((p) => p._id?.toString() === paymentId);
            if (!payment) {
                throw new common_1.BadRequestException('Payment not found');
            }
            if (payment.status !== 'completed') {
                throw new common_1.BadRequestException('Only completed payments can be reversed');
            }
            if (payment.method === 'mpesa' && payment.mpesaReceiptNumber) {
                try {
                    const reversalResult = await this.darajaService.reverseTransaction(payment.mpesaReceiptNumber, payment.amount, reason);
                    payment.status = 'reversed';
                    payment.reversalReason = reason;
                    payment.reversalTime = new Date();
                    await order.save();
                    this.logger.log(`Payment reversed for order ${orderId}: Amount: ${payment.amount}, Reason: ${reason}`);
                    return {
                        shopId,
                        orderId,
                        paymentId,
                        originalAmount: payment.amount,
                        reversalAmount: payment.amount,
                        reason,
                        status: 'completed',
                        mpesaReversalId: reversalResult.reversalId,
                        reversedBy,
                        reversalTime: new Date(),
                        notes,
                    };
                }
                catch (error) {
                    this.logger.error('M-Pesa reversal failed', error?.message);
                    throw new common_1.BadRequestException('M-Pesa reversal failed');
                }
            }
            else if (payment.method === 'cash') {
                payment.status = 'reversed';
                payment.reversalReason = reason;
                payment.reversalTime = new Date();
                await order.save();
                this.logger.log(`Cash payment reversed for order ${orderId}: Amount: ${payment.amount}`);
                return {
                    shopId,
                    orderId,
                    paymentId,
                    originalAmount: payment.amount,
                    reversalAmount: payment.amount,
                    reason,
                    status: 'completed',
                    reversedBy,
                    reversalTime: new Date(),
                    notes,
                };
            }
            else {
                throw new common_1.BadRequestException('Payment method does not support reversal');
            }
        }
        catch (error) {
            this.logger.error('Payment reversal failed', error?.message);
            throw error;
        }
    }
    async getReversalHistory(shopId, startDate, endDate) {
        try {
            const query = { shopId: new mongoose_2.Types.ObjectId(shopId) };
            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate)
                    query.createdAt.$gte = startDate;
                if (endDate)
                    query.createdAt.$lte = endDate;
            }
            const orders = await this.orderModel.find(query).exec();
            const reversals = [];
            for (const order of orders) {
                const reversedPayments = order.payments?.filter((p) => p.status === 'reversed') || [];
                for (const payment of reversedPayments) {
                    reversals.push({
                        shopId,
                        orderId: order._id.toString(),
                        paymentId: payment._id?.toString() || '',
                        originalAmount: payment.amount,
                        reversalAmount: payment.amount,
                        reason: payment.reversalReason || 'Unknown',
                        status: 'completed',
                        reversedBy: 'Unknown',
                        reversalTime: payment.reversalTime || new Date(),
                    });
                }
            }
            return reversals;
        }
        catch (error) {
            this.logger.error('Failed to get reversal history', error?.message);
            throw new common_1.BadRequestException('Failed to get reversal history');
        }
    }
    async getReversalStats(shopId) {
        try {
            const orders = await this.orderModel
                .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
                .exec();
            let totalReversals = 0;
            let totalReversalAmount = 0;
            const reversalsByReason = {};
            const reversalsByPaymentMethod = {};
            for (const order of orders) {
                const reversedPayments = order.payments?.filter((p) => p.status === 'reversed') || [];
                for (const payment of reversedPayments) {
                    totalReversals++;
                    totalReversalAmount += payment.amount;
                    const reason = payment.reversalReason || 'Unknown';
                    reversalsByReason[reason] = (reversalsByReason[reason] || 0) + 1;
                    const method = payment.method || 'Unknown';
                    reversalsByPaymentMethod[method] = (reversalsByPaymentMethod[method] || 0) + 1;
                }
            }
            return {
                totalReversals,
                totalReversalAmount,
                averageReversalAmount: totalReversals > 0 ? totalReversalAmount / totalReversals : 0,
                reversalsByReason,
                reversalsByPaymentMethod,
            };
        }
        catch (error) {
            this.logger.error('Failed to get reversal stats', error?.message);
            throw new common_1.BadRequestException('Failed to get reversal stats');
        }
    }
};
exports.PaymentReversalService = PaymentReversalService;
exports.PaymentReversalService = PaymentReversalService = PaymentReversalService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(order_schema_1.Order.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        daraja_service_1.DarajaService])
], PaymentReversalService);
//# sourceMappingURL=payment-reversal.service.js.map