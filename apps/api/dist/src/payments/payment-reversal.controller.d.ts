import { PaymentReversalService } from './payment-reversal.service';
import { ReversePaymentDto, GetReversalHistoryDto } from './dto/payment-reversal.dto';
export declare class PaymentReversalController {
    private readonly reversalService;
    constructor(reversalService: PaymentReversalService);
    reversePayment(dto: ReversePaymentDto, user: Record<string, any>): Promise<import("./payment-reversal.service").PaymentReversal>;
    getHistory(query: GetReversalHistoryDto, user: Record<string, any>): Promise<import("./payment-reversal.service").PaymentReversal[]>;
    getStats(user: Record<string, any>): Promise<{
        totalReversals: number;
        totalReversalAmount: number;
        averageReversalAmount: number;
        reversalsByReason: Record<string, number>;
        reversalsByPaymentMethod: Record<string, number>;
    }>;
}
