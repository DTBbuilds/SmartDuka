import { Model } from 'mongoose';
import { ReconciliationDocument } from './reconciliation.schema';
import { OrderDocument } from '../sales/schemas/order.schema';
export declare class ReconciliationService {
    private reconciliationModel;
    private orderModel;
    private readonly logger;
    constructor(reconciliationModel: Model<ReconciliationDocument>, orderModel: Model<OrderDocument>);
    createDailyReconciliation(shopId: string, date: Date, actualCash: number, reconciledBy: string, notes?: string): Promise<ReconciliationDocument>;
    getReconciliationHistory(shopId: string, startDate?: Date, endDate?: Date): Promise<ReconciliationDocument[]>;
    getVarianceReport(shopId: string, startDate: Date, endDate: Date): Promise<{
        totalReconciliations: number;
        totalVariance: number;
        averageVariance: number;
        maxVariance: number;
        minVariance: number;
        variancePercentage: number;
        pendingVariances: number;
    }>;
    approveReconciliation(reconciliationId: string, approvedBy: string): Promise<ReconciliationDocument | null>;
    investigateVariance(reconciliationId: string, varianceType: string, investigationNotes: string): Promise<ReconciliationDocument | null>;
    getReconciliationStats(shopId: string): Promise<{
        totalReconciliations: number;
        reconciled: number;
        pendingVariances: number;
        averageVariance: number;
        lastReconciliation?: Date;
    }>;
}
