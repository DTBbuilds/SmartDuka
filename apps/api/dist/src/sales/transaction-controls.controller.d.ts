import { TransactionControlsService } from './transaction-controls.service';
export declare class TransactionControlsController {
    private readonly transactionControlsService;
    constructor(transactionControlsService: TransactionControlsService);
    voidTransaction(body: {
        orderId: string;
        voidReason: string;
    }, user: any): Promise<import("./schemas/order.schema").Order>;
    applyDiscount(body: {
        orderId: string;
        discountAmount: number;
        discountReason: string;
    }, user: any): Promise<import("./schemas/order.schema").Order>;
    processRefund(body: {
        orderId: string;
        refundAmount: number;
        refundReason: string;
    }, user: any): Promise<import("./schemas/order.schema").Order>;
    getVoidedTransactions(limit: string | undefined, user: any): Promise<import("./schemas/order.schema").Order[]>;
    getRefundedTransactions(limit: string | undefined, user: any): Promise<import("./schemas/order.schema").Order[]>;
    getTransactionsByCashier(cashierId: string, limit: string | undefined, user: any): Promise<import("./schemas/order.schema").Order[]>;
    getShiftTransactions(shiftId: string, limit: string | undefined, user: any): Promise<import("./schemas/order.schema").Order[]>;
    getTransactionStats(user: any): Promise<any>;
    getCashierStats(cashierId: string, user: any): Promise<any>;
}
