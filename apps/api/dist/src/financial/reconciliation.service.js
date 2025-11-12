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
var ReconciliationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const reconciliation_schema_1 = require("./reconciliation.schema");
const order_schema_1 = require("../sales/schemas/order.schema");
let ReconciliationService = ReconciliationService_1 = class ReconciliationService {
    reconciliationModel;
    orderModel;
    logger = new common_1.Logger(ReconciliationService_1.name);
    constructor(reconciliationModel, orderModel) {
        this.reconciliationModel = reconciliationModel;
        this.orderModel = orderModel;
    }
    async createDailyReconciliation(shopId, date, actualCash, reconciledBy, notes) {
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
            const reconciliation = new this.reconciliationModel({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                reconciliationDate: date,
                expectedCash,
                actualCash,
                variance,
                variancePercentage,
                status,
                reconciliationNotes: notes,
                reconciledBy,
                reconciliationTime: new Date(),
            });
            await reconciliation.save();
            this.logger.log(`Daily reconciliation created for ${shopId} on ${date.toDateString()}: Expected: ${expectedCash}, Actual: ${actualCash}, Variance: ${variance}`);
            return reconciliation;
        }
        catch (error) {
            this.logger.error('Daily reconciliation creation failed', error?.message);
            throw new common_1.BadRequestException('Failed to create daily reconciliation');
        }
    }
    async getReconciliationHistory(shopId, startDate, endDate) {
        try {
            const query = { shopId: new mongoose_2.Types.ObjectId(shopId) };
            if (startDate || endDate) {
                query.reconciliationDate = {};
                if (startDate)
                    query.reconciliationDate.$gte = startDate;
                if (endDate)
                    query.reconciliationDate.$lte = endDate;
            }
            return this.reconciliationModel
                .find(query)
                .sort({ reconciliationDate: -1 })
                .exec();
        }
        catch (error) {
            this.logger.error('Failed to get reconciliation history', error?.message);
            throw new common_1.BadRequestException('Failed to get reconciliation history');
        }
    }
    async getVarianceReport(shopId, startDate, endDate) {
        try {
            const reconciliations = await this.reconciliationModel
                .find({
                shopId: new mongoose_2.Types.ObjectId(shopId),
                reconciliationDate: { $gte: startDate, $lte: endDate },
            })
                .exec();
            if (reconciliations.length === 0) {
                return {
                    totalReconciliations: 0,
                    totalVariance: 0,
                    averageVariance: 0,
                    maxVariance: 0,
                    minVariance: 0,
                    variancePercentage: 0,
                    pendingVariances: 0,
                };
            }
            const variances = reconciliations.map((r) => r.variance);
            const totalVariance = variances.reduce((sum, v) => sum + Math.abs(v), 0);
            const pendingVariances = reconciliations.filter((r) => r.status === 'variance_pending').length;
            return {
                totalReconciliations: reconciliations.length,
                totalVariance,
                averageVariance: totalVariance / reconciliations.length,
                maxVariance: Math.max(...variances.map((v) => Math.abs(v))),
                minVariance: Math.min(...variances.map((v) => Math.abs(v))),
                variancePercentage: (totalVariance / reconciliations.length) * 100,
                pendingVariances,
            };
        }
        catch (error) {
            this.logger.error('Failed to get variance report', error?.message);
            throw new common_1.BadRequestException('Failed to get variance report');
        }
    }
    async approveReconciliation(reconciliationId, approvedBy) {
        try {
            return this.reconciliationModel
                .findByIdAndUpdate(reconciliationId, {
                approvedBy,
                approvalTime: new Date(),
                status: 'reconciled',
            }, { new: true })
                .exec();
        }
        catch (error) {
            this.logger.error('Failed to approve reconciliation', error?.message);
            throw new common_1.BadRequestException('Failed to approve reconciliation');
        }
    }
    async investigateVariance(reconciliationId, varianceType, investigationNotes) {
        try {
            const reconciliation = await this.reconciliationModel.findById(reconciliationId).exec();
            if (!reconciliation) {
                throw new common_1.BadRequestException('Reconciliation not found');
            }
            if (!reconciliation.variances) {
                reconciliation.variances = [];
            }
            reconciliation.variances.push({
                type: varianceType,
                amount: reconciliation.variance,
                investigationNotes,
                status: 'investigated',
            });
            await reconciliation.save();
            this.logger.log(`Variance investigation recorded for reconciliation ${reconciliationId}`);
            return reconciliation;
        }
        catch (error) {
            this.logger.error('Failed to investigate variance', error?.message);
            throw error;
        }
    }
    async getReconciliationStats(shopId) {
        try {
            const reconciliations = await this.reconciliationModel
                .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
                .sort({ reconciliationDate: -1 })
                .exec();
            if (reconciliations.length === 0) {
                return {
                    totalReconciliations: 0,
                    reconciled: 0,
                    pendingVariances: 0,
                    averageVariance: 0,
                };
            }
            const reconciled = reconciliations.filter((r) => r.status === 'reconciled').length;
            const pendingVariances = reconciliations.filter((r) => r.status === 'variance_pending').length;
            const averageVariance = reconciliations.reduce((sum, r) => sum + Math.abs(r.variance), 0) / reconciliations.length;
            return {
                totalReconciliations: reconciliations.length,
                reconciled,
                pendingVariances,
                averageVariance,
                lastReconciliation: reconciliations[0]?.reconciliationDate,
            };
        }
        catch (error) {
            this.logger.error('Failed to get reconciliation stats', error?.message);
            throw new common_1.BadRequestException('Failed to get reconciliation stats');
        }
    }
};
exports.ReconciliationService = ReconciliationService;
exports.ReconciliationService = ReconciliationService = ReconciliationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(reconciliation_schema_1.Reconciliation.name)),
    __param(1, (0, mongoose_1.InjectModel)(order_schema_1.Order.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], ReconciliationService);
//# sourceMappingURL=reconciliation.service.js.map