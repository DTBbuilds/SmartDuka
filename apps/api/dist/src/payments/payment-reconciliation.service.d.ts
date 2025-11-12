import { Model } from 'mongoose';
import { OrderDocument } from '../sales/schemas/order.schema';
export interface ReconciliationRecord {
    shopId: string;
    date: Date;
    expectedCash: number;
    actualCash: number;
    variance: number;
    variancePercentage: number;
    status: 'pending' | 'reconciled' | 'variance_pending';
    reconciliationNotes?: string;
    reconcililedBy: string;
    reconciliationTime: Date;
}
export declare class PaymentReconciliationService {
    private orderModel;
    private readonly logger;
    constructor(orderModel: Model<OrderDocument>);
    reconcilePayments(shopId: string, date: Date, actualCash: number, reconcililedBy: string, notes?: string): Promise<ReconciliationRecord>;
    getReconciliationHistory(shopId: string, startDate: Date, endDate: Date): Promise<ReconciliationRecord[]>;
    getVarianceReport(shopId: string, startDate: Date, endDate: Date): Promise<{
        totalReconciliations: number;
        totalVariance: number;
        averageVariance: number;
        maxVariance: number;
        minVariance: number;
        variancePercentage: number;
    }>;
    matchTransactions(shopId: string, orders: OrderDocument[], mpesaTransactions: any[]): Promise<{
        matched: number;
        unmatched: number;
        discrepancies: any[];
    }>;
}
