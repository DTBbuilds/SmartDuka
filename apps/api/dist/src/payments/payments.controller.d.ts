import type { Response } from 'express';
import { PaymentsService } from './payments.service';
import { PaymentTransactionService } from './services/payment-transaction.service';
import { InitiateStkDto } from './dto/initiate-stk.dto';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
export declare class PaymentsController {
    private readonly paymentsService;
    private readonly paymentTransactionService;
    constructor(paymentsService: PaymentsService, paymentTransactionService: PaymentTransactionService);
    initiateStkPush(dto: InitiateStkDto): Promise<import("./payments.service").StkResponse>;
    queryStkStatus(checkoutRequestId: string, merchantRequestId: string): Promise<{
        status: string;
        resultCode: number;
        resultDesc: string;
    }>;
    handleMpesaCallback(payload: any): Promise<{
        ResultCode: number;
        ResultDesc: string;
    }>;
    getTransactions(user: JwtPayload, method?: string, status?: string, cashierId?: string, branchId?: string, from?: string, to?: string, limit?: string, skip?: string): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/payment-transaction.schema").PaymentTransaction, {}, {}> & import("./schemas/payment-transaction.schema").PaymentTransaction & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getStats(user: JwtPayload, from?: string, to?: string, branchId?: string): Promise<import("./services/payment-transaction.service").PaymentStatsDto>;
    exportTransactions(res: Response, user: JwtPayload, from?: string, to?: string, branchId?: string): Promise<void>;
    getCashierStats(user: JwtPayload, cashierId: string): Promise<any>;
    getOrderTransactions(orderId: string): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/payment-transaction.schema").PaymentTransaction, {}, {}> & import("./schemas/payment-transaction.schema").PaymentTransaction & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getPaymentsAnalytics(user: JwtPayload, branchId?: string): Promise<any>;
    getBranchPaymentsAnalytics(user: JwtPayload, branchId: string): Promise<any>;
    getShopPaymentsSummary(user: JwtPayload): Promise<any>;
}
