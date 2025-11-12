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
exports.PaymentTransactionService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const payment_transaction_schema_1 = require("../schemas/payment-transaction.schema");
let PaymentTransactionService = class PaymentTransactionService {
    paymentTransactionModel;
    constructor(paymentTransactionModel) {
        this.paymentTransactionModel = paymentTransactionModel;
    }
    async createTransaction(dto) {
        try {
            const transaction = new this.paymentTransactionModel({
                shopId: new mongoose_2.Types.ObjectId(dto.shopId),
                orderId: new mongoose_2.Types.ObjectId(dto.orderId),
                orderNumber: dto.orderNumber,
                cashierId: new mongoose_2.Types.ObjectId(dto.cashierId),
                cashierName: dto.cashierName,
                branchId: dto.branchId ? new mongoose_2.Types.ObjectId(dto.branchId) : undefined,
                paymentMethod: dto.paymentMethod,
                amount: dto.amount,
                status: dto.status || 'completed',
                customerName: dto.customerName,
                customerPhone: dto.customerPhone,
                notes: dto.notes,
                mpesaReceiptNumber: dto.mpesaReceiptNumber,
                mpesaTransactionId: dto.mpesaTransactionId,
                cardLastFour: dto.cardLastFour,
                cardBrand: dto.cardBrand,
                amountTendered: dto.amountTendered,
                change: dto.change,
                referenceNumber: dto.referenceNumber,
                processedAt: new Date(),
                completedAt: dto.status === 'completed' ? new Date() : undefined,
            });
            return await transaction.save();
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(`Failed to create payment transaction: ${error?.message || 'Unknown error'}`);
        }
    }
    async getTransactions(shopId, filters) {
        try {
            const query = { shopId: new mongoose_2.Types.ObjectId(shopId) };
            if (filters?.method && filters.method !== 'all') {
                query.paymentMethod = filters.method;
            }
            if (filters?.status && filters.status !== 'all') {
                query.status = filters.status;
            }
            if (filters?.cashierId) {
                query.cashierId = new mongoose_2.Types.ObjectId(filters.cashierId);
            }
            if (filters?.branchId) {
                query.branchId = new mongoose_2.Types.ObjectId(filters.branchId);
            }
            if (filters?.from || filters?.to) {
                query.createdAt = {};
                if (filters.from) {
                    query.createdAt.$gte = new Date(filters.from);
                }
                if (filters.to) {
                    query.createdAt.$lte = new Date(filters.to);
                }
            }
            const limit = filters?.limit || 100;
            const skip = filters?.skip || 0;
            return await this.paymentTransactionModel
                .find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(skip)
                .exec();
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(`Failed to fetch transactions: ${error?.message || 'Unknown error'}`);
        }
    }
    async getStats(shopId, filters) {
        try {
            const query = { shopId: new mongoose_2.Types.ObjectId(shopId) };
            if (filters?.from || filters?.to) {
                query.createdAt = {};
                if (filters.from) {
                    query.createdAt.$gte = new Date(filters.from);
                }
                if (filters.to) {
                    query.createdAt.$lte = new Date(filters.to);
                }
            }
            const transactions = await this.paymentTransactionModel.find(query).exec();
            const totalTransactions = transactions.length;
            const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
            const averageTransaction = totalTransactions > 0 ? totalAmount / totalTransactions : 0;
            const completedCount = transactions.filter((t) => t.status === 'completed').length;
            const pendingCount = transactions.filter((t) => t.status === 'pending').length;
            const failedCount = transactions.filter((t) => t.status === 'failed').length;
            const byMethod = {
                cash: { count: 0, amount: 0 },
                card: { count: 0, amount: 0 },
                mpesa: { count: 0, amount: 0 },
                other: { count: 0, amount: 0 },
            };
            transactions.forEach((t) => {
                const method = t.paymentMethod;
                if (byMethod[method]) {
                    byMethod[method].count += 1;
                    byMethod[method].amount += t.amount || 0;
                }
            });
            return {
                totalTransactions,
                totalAmount,
                averageTransaction: Math.round(averageTransaction),
                completedCount,
                pendingCount,
                failedCount,
                byMethod,
            };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(`Failed to calculate stats: ${error?.message || 'Unknown error'}`);
        }
    }
    async exportTransactions(shopId, filters) {
        try {
            const transactions = await this.getTransactions(shopId, {
                limit: 10000,
                ...filters,
            });
            const headers = [
                'Order Number',
                'Cashier Name',
                'Payment Method',
                'Amount',
                'Status',
                'Customer Name',
                'Date',
            ];
            const rows = transactions.map((t) => [
                t.orderNumber,
                t.cashierName,
                t.paymentMethod.toUpperCase(),
                t.amount.toLocaleString('en-KE'),
                t.status.toUpperCase(),
                t.customerName || '-',
                t.createdAt ? new Date(t.createdAt).toLocaleString('en-KE') : '-',
            ]);
            const csvContent = [
                headers.map((h) => `"${h}"`).join(','),
                ...rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
            ].join('\n');
            return csvContent;
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(`Failed to export transactions: ${error?.message || 'Unknown error'}`);
        }
    }
    async updateTransactionStatus(transactionId, status) {
        try {
            const transaction = await this.paymentTransactionModel.findByIdAndUpdate(new mongoose_2.Types.ObjectId(transactionId), {
                status,
                completedAt: status === 'completed' ? new Date() : undefined,
            }, { new: true });
            if (!transaction) {
                throw new common_1.BadRequestException('Transaction not found');
            }
            return transaction;
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(`Failed to update transaction: ${error?.message || 'Unknown error'}`);
        }
    }
    async getTransactionsByOrderId(orderId) {
        try {
            return await this.paymentTransactionModel
                .find({ orderId: new mongoose_2.Types.ObjectId(orderId) })
                .sort({ createdAt: -1 })
                .exec();
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(`Failed to fetch transaction: ${error?.message || 'Unknown error'}`);
        }
    }
    async getCashierStats(shopId, cashierId) {
        try {
            const transactions = await this.paymentTransactionModel
                .find({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                cashierId: new mongoose_2.Types.ObjectId(cashierId),
            })
                .exec();
            const totalTransactions = transactions.length;
            const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
            const completedCount = transactions.filter((t) => t.status === 'completed').length;
            return {
                cashierId,
                totalTransactions,
                totalAmount,
                completedCount,
                averageTransaction: totalTransactions > 0 ? Math.round(totalAmount / totalTransactions) : 0,
            };
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(`Failed to fetch cashier stats: ${error?.message || 'Unknown error'}`);
        }
    }
};
exports.PaymentTransactionService = PaymentTransactionService;
exports.PaymentTransactionService = PaymentTransactionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(payment_transaction_schema_1.PaymentTransaction.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], PaymentTransactionService);
//# sourceMappingURL=payment-transaction.service.js.map