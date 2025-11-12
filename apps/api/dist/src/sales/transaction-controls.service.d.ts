import { Model } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
export declare class TransactionControlsService {
    private orderModel;
    constructor(orderModel: Model<OrderDocument>);
    voidTransaction(orderId: string, shopId: string, voidReason: string, cashierId: string, requiresApproval?: boolean): Promise<Order>;
    applyDiscount(orderId: string, shopId: string, discountAmount: number, discountReason: string, cashierId: string, requiresApproval?: boolean): Promise<Order>;
    processRefund(orderId: string, shopId: string, refundAmount: number, refundReason: string, cashierId: string, requiresApproval?: boolean): Promise<Order>;
    getTransactionsByType(shopId: string, transactionType: 'sale' | 'void' | 'return' | 'refund', limit?: number): Promise<Order[]>;
    getVoidedTransactions(shopId: string, limit?: number): Promise<Order[]>;
    getRefundedTransactions(shopId: string, limit?: number): Promise<Order[]>;
    getTransactionsByCashier(shopId: string, cashierId: string, limit?: number): Promise<Order[]>;
    getShiftTransactions(shopId: string, shiftId: string, limit?: number): Promise<Order[]>;
    getTransactionStats(shopId: string): Promise<any>;
    getCashierStats(shopId: string, cashierId: string): Promise<any>;
}
