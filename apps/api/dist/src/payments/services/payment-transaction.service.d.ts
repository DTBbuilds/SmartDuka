import { Model } from 'mongoose';
import { PaymentTransactionDocument } from '../schemas/payment-transaction.schema';
export interface CreatePaymentTransactionDto {
    shopId: string;
    orderId: string;
    orderNumber: string;
    cashierId: string;
    cashierName: string;
    branchId?: string;
    paymentMethod: 'cash' | 'card' | 'mpesa' | 'other';
    amount: number;
    status?: 'completed' | 'pending' | 'failed';
    customerName?: string;
    customerPhone?: string;
    notes?: string;
    mpesaReceiptNumber?: string;
    mpesaTransactionId?: string;
    cardLastFour?: string;
    cardBrand?: string;
    amountTendered?: number;
    change?: number;
    referenceNumber?: string;
}
export interface PaymentStatsDto {
    totalTransactions: number;
    totalAmount: number;
    averageTransaction: number;
    completedCount: number;
    pendingCount: number;
    failedCount: number;
    byMethod: {
        cash: {
            count: number;
            amount: number;
        };
        card: {
            count: number;
            amount: number;
        };
        mpesa: {
            count: number;
            amount: number;
        };
        other: {
            count: number;
            amount: number;
        };
    };
}
export declare class PaymentTransactionService {
    private readonly paymentTransactionModel;
    constructor(paymentTransactionModel: Model<PaymentTransactionDocument>);
    createTransaction(dto: CreatePaymentTransactionDto): Promise<PaymentTransactionDocument>;
    getTransactions(shopId: string, filters?: {
        method?: string;
        status?: string;
        cashierId?: string;
        branchId?: string;
        from?: string;
        to?: string;
        limit?: number;
        skip?: number;
    }): Promise<PaymentTransactionDocument[]>;
    getStats(shopId: string, filters?: {
        from?: string;
        to?: string;
        branchId?: string;
    }): Promise<PaymentStatsDto>;
    exportTransactions(shopId: string, filters?: {
        from?: string;
        to?: string;
        branchId?: string;
    }): Promise<string>;
    updateTransactionStatus(transactionId: string, status: 'completed' | 'pending' | 'failed'): Promise<PaymentTransactionDocument>;
    getTransactionsByOrderId(orderId: string): Promise<PaymentTransactionDocument[]>;
    getCashierStats(shopId: string, cashierId: string): Promise<any>;
    getPaymentsAnalytics(shopId: string, branchId?: string): Promise<any>;
    getBranchPaymentsAnalytics(shopId: string, branchId: string): Promise<any>;
    getShopPaymentsSummary(shopId: string): Promise<any>;
}
