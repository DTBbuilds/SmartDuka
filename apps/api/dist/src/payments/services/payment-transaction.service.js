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
    async getPaymentsAnalytics(shopId, branchId) {
        if (!shopId) {
            throw new common_1.BadRequestException('Shop ID is required for payment analytics');
        }
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const baseQuery = {
            shopId: new mongoose_2.Types.ObjectId(shopId),
            createdAt: { $gte: monthAgo },
        };
        if (branchId) {
            baseQuery.branchId = new mongoose_2.Types.ObjectId(branchId);
        }
        const monthTransactions = await this.paymentTransactionModel
            .find(baseQuery)
            .sort({ createdAt: -1 })
            .exec();
        const todayTransactions = monthTransactions.filter(t => {
            if (!t.createdAt)
                return false;
            return new Date(t.createdAt).getTime() >= today.getTime();
        });
        const weekTransactions = monthTransactions.filter(t => {
            if (!t.createdAt)
                return false;
            return new Date(t.createdAt).getTime() >= weekAgo.getTime();
        });
        const todayTotal = todayTransactions
            .filter(t => t.status === 'completed')
            .reduce((sum, t) => sum + (t.amount || 0), 0);
        const weekTotal = weekTransactions
            .filter(t => t.status === 'completed')
            .reduce((sum, t) => sum + (t.amount || 0), 0);
        const monthTotal = monthTransactions
            .filter(t => t.status === 'completed')
            .reduce((sum, t) => sum + (t.amount || 0), 0);
        const completedCount = monthTransactions.filter(t => t.status === 'completed').length;
        const failedCount = monthTransactions.filter(t => t.status === 'failed').length;
        const successRate = monthTransactions.length > 0
            ? Math.round((completedCount / monthTransactions.length) * 1000) / 10
            : 100;
        const averageTransactionValue = completedCount > 0
            ? Math.round(monthTotal / completedCount)
            : 0;
        const methodMap = new Map();
        monthTransactions.filter(t => t.status === 'completed').forEach(t => {
            const method = t.paymentMethod || 'cash';
            const existing = methodMap.get(method) || { count: 0, total: 0 };
            existing.count += 1;
            existing.total += t.amount || 0;
            methodMap.set(method, existing);
        });
        const totalCompleted = completedCount;
        const methodBreakdown = Array.from(methodMap.entries()).map(([method, data]) => ({
            method: method === 'mpesa' ? 'M-Pesa' : method.charAt(0).toUpperCase() + method.slice(1),
            count: data.count,
            total: data.total,
            percentage: totalCompleted > 0 ? Math.round((data.count / totalCompleted) * 1000) / 10 : 0,
        }));
        const dailyTrend = Array.from({ length: 14 }, (_, i) => {
            const date = new Date(today.getTime() - (13 - i) * 24 * 60 * 60 * 1000);
            const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
            const dayTransactions = monthTransactions.filter(t => {
                if (!t.createdAt)
                    return false;
                const txTime = new Date(t.createdAt).getTime();
                return txTime >= date.getTime() && txTime < nextDate.getTime() && t.status === 'completed';
            });
            return {
                date: date.toISOString().split('T')[0],
                total: dayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0),
                count: dayTransactions.length,
            };
        });
        const recentTransactions = monthTransactions.slice(0, 10).map(t => ({
            id: t._id.toString(),
            amount: t.amount || 0,
            method: t.paymentMethod || 'cash',
            status: t.status,
            reference: t.mpesaReceiptNumber || t.referenceNumber || `TXN-${t._id.toString().slice(-8).toUpperCase()}`,
            timestamp: t.createdAt,
            orderNumber: t.orderNumber,
        }));
        const failedTransactions = monthTransactions
            .filter(t => t.status === 'failed')
            .slice(0, 5)
            .map(t => ({
            id: t._id.toString(),
            amount: t.amount || 0,
            method: t.paymentMethod || 'cash',
            reason: t.notes || 'Transaction failed',
            timestamp: t.createdAt,
        }));
        const branchMap = new Map();
        monthTransactions.filter(t => t.status === 'completed').forEach(t => {
            const bId = t.branchId?.toString() || 'main';
            const existing = branchMap.get(bId) || { count: 0, total: 0, branchId: bId };
            existing.count += 1;
            existing.total += t.amount || 0;
            branchMap.set(bId, existing);
        });
        const branchBreakdown = Array.from(branchMap.entries()).map(([bId, data]) => ({
            branchId: bId,
            count: data.count,
            total: data.total,
            percentage: totalCompleted > 0 ? Math.round((data.count / totalCompleted) * 1000) / 10 : 0,
        }));
        return {
            shopId,
            branchId: branchId || null,
            todayTotal,
            todayTransactions: todayTransactions.length,
            weekTotal,
            weekTransactions: weekTransactions.length,
            monthTotal,
            monthTransactions: monthTransactions.length,
            successRate,
            averageTransactionValue,
            failedCount,
            methodBreakdown,
            branchBreakdown,
            dailyTrend,
            recentTransactions,
            failedTransactions,
        };
    }
    async getBranchPaymentsAnalytics(shopId, branchId) {
        if (!shopId || !branchId) {
            throw new common_1.BadRequestException('Shop ID and Branch ID are required');
        }
        return this.getPaymentsAnalytics(shopId, branchId);
    }
    async getShopPaymentsSummary(shopId) {
        if (!shopId) {
            throw new common_1.BadRequestException('Shop ID is required');
        }
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const pipeline = [
            {
                $match: {
                    shopId: new mongoose_2.Types.ObjectId(shopId),
                    createdAt: { $gte: monthAgo },
                    status: 'completed',
                },
            },
            {
                $group: {
                    _id: '$branchId',
                    totalAmount: { $sum: '$amount' },
                    transactionCount: { $sum: 1 },
                    avgTransaction: { $avg: '$amount' },
                    methods: {
                        $push: '$paymentMethod',
                    },
                },
            },
            {
                $project: {
                    branchId: '$_id',
                    totalAmount: 1,
                    transactionCount: 1,
                    avgTransaction: { $round: ['$avgTransaction', 0] },
                },
            },
        ];
        const branchStats = await this.paymentTransactionModel.aggregate(pipeline).exec();
        const shopTotal = branchStats.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        const shopTransactions = branchStats.reduce((sum, b) => sum + (b.transactionCount || 0), 0);
        return {
            shopId,
            shopTotal,
            shopTransactions,
            shopAvgTransaction: shopTransactions > 0 ? Math.round(shopTotal / shopTransactions) : 0,
            branchStats: branchStats.map(b => ({
                branchId: b.branchId?.toString() || 'main',
                totalAmount: b.totalAmount,
                transactionCount: b.transactionCount,
                avgTransaction: b.avgTransaction,
                percentageOfTotal: shopTotal > 0 ? Math.round((b.totalAmount / shopTotal) * 1000) / 10 : 0,
            })),
        };
    }
};
exports.PaymentTransactionService = PaymentTransactionService;
exports.PaymentTransactionService = PaymentTransactionService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(payment_transaction_schema_1.PaymentTransaction.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], PaymentTransactionService);
//# sourceMappingURL=payment-transaction.service.js.map