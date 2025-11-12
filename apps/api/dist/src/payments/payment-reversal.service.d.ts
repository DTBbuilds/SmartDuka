import { Model } from 'mongoose';
import { OrderDocument } from '../sales/schemas/order.schema';
import { DarajaService } from './daraja.service';
export interface PaymentReversal {
    _id?: string;
    shopId: string;
    orderId: string;
    paymentId: string;
    originalAmount: number;
    reversalAmount: number;
    reason: string;
    status: 'pending' | 'completed' | 'failed';
    mpesaReversalId?: string;
    reversedBy: string;
    reversalTime: Date;
    notes?: string;
}
export declare class PaymentReversalService {
    private orderModel;
    private darajaService;
    private readonly logger;
    constructor(orderModel: Model<OrderDocument>, darajaService: DarajaService);
    reversePayment(shopId: string, orderId: string, paymentId: string, reason: string, reversedBy: string, notes?: string): Promise<PaymentReversal>;
    getReversalHistory(shopId: string, startDate?: Date, endDate?: Date): Promise<PaymentReversal[]>;
    getReversalStats(shopId: string): Promise<{
        totalReversals: number;
        totalReversalAmount: number;
        averageReversalAmount: number;
        reversalsByReason: Record<string, number>;
        reversalsByPaymentMethod: Record<string, number>;
    }>;
}
