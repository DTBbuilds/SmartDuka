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
var PaymentReconciliationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentReconciliationService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const order_schema_1 = require("../sales/schemas/order.schema");
let PaymentReconciliationService = PaymentReconciliationService_1 = class PaymentReconciliationService {
    orderModel;
    logger = new common_1.Logger(PaymentReconciliationService_1.name);
    constructor(orderModel) {
        this.orderModel = orderModel;
    }
    async reconcilePayments(shopId, date, actualCash, reconcililedBy, notes) {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            const orders = await this.orderModel
                .find({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                createdAt: { $gte: startOfDay, $lte: endOfDay },
                paymentStatus: { $in: ['paid', 'partial'] },
            })
                .exec();
            const expectedCash = orders.reduce((sum, order) => {
                const cashPayments = (order.payments || [])
                    .filter((p) => p.method === 'cash')
                    .reduce((s, p) => s + p.amount, 0);
                return sum + cashPayments;
            }, 0);
            const variance = actualCash - expectedCash;
            const variancePercentage = expectedCash > 0 ? (variance / expectedCash) * 100 : 0;
            let status = 'reconciled';
            if (Math.abs(variance) > 100) {
                status = 'variance_pending';
            }
            const reconciliation = {
                shopId,
                date,
                expectedCash,
                actualCash,
                variance,
                variancePercentage,
                status,
                reconciliationNotes: notes,
                reconcililedBy,
                reconciliationTime: new Date(),
            };
            this.logger.log(`Payment reconciliation for ${shopId} on ${date.toDateString()}: Expected: ${expectedCash}, Actual: ${actualCash}, Variance: ${variance}`);
            return reconciliation;
        }
        catch (error) {
            this.logger.error('Payment reconciliation failed', error?.message);
            throw new common_1.BadRequestException('Failed to reconcile payments');
        }
    }
    async getReconciliationHistory(shopId, startDate, endDate) {
        try {
            return [];
        }
        catch (error) {
            this.logger.error('Failed to get reconciliation history', error?.message);
            throw new common_1.BadRequestException('Failed to get reconciliation history');
        }
    }
    async getVarianceReport(shopId, startDate, endDate) {
        try {
            return {
                totalReconciliations: 0,
                totalVariance: 0,
                averageVariance: 0,
                maxVariance: 0,
                minVariance: 0,
                variancePercentage: 0,
            };
        }
        catch (error) {
            this.logger.error('Failed to get variance report', error?.message);
            throw new common_1.BadRequestException('Failed to get variance report');
        }
    }
    async matchTransactions(shopId, orders, mpesaTransactions) {
        try {
            const matched = [];
            const unmatched = [];
            const discrepancies = [];
            for (const transaction of mpesaTransactions) {
                const matchedOrder = orders.some((o) => new Date(o.createdAt || new Date()).toDateString() === new Date(transaction.createdAt).toDateString() &&
                    o.total === transaction.amount);
                if (matchedOrder) {
                    const order = orders.find((o) => new Date(o.createdAt || new Date()).toDateString() === new Date(transaction.createdAt).toDateString() &&
                        o.total === transaction.amount);
                    matched.push({ order, transaction });
                }
                else {
                    unmatched.push(transaction);
                    discrepancies.push({
                        type: 'unmatched_transaction',
                        transaction,
                        message: `M-Pesa transaction not matched to any order`,
                    });
                }
            }
            for (const order of orders) {
                const matchedTransaction = mpesaTransactions.some((t) => new Date(t.createdAt).toDateString() === new Date(order.createdAt || new Date()).toDateString() &&
                    t.amount === order.total);
                if (!matchedTransaction) {
                    discrepancies.push({
                        type: 'unmatched_order',
                        order,
                        message: `Order not matched to any M-Pesa transaction`,
                    });
                }
            }
            this.logger.log(`Transaction matching: ${matched.length} matched, ${unmatched.length} unmatched, ${discrepancies.length} discrepancies`);
            return {
                matched: matched.length,
                unmatched: unmatched.length,
                discrepancies,
            };
        }
        catch (error) {
            this.logger.error('Transaction matching failed', error?.message);
            throw new common_1.BadRequestException('Failed to match transactions');
        }
    }
};
exports.PaymentReconciliationService = PaymentReconciliationService;
exports.PaymentReconciliationService = PaymentReconciliationService = PaymentReconciliationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(order_schema_1.Order.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], PaymentReconciliationService);
//# sourceMappingURL=payment-reconciliation.service.js.map