import { PaymentReconciliationService } from './payment-reconciliation.service';
import { CreatePaymentReconciliationDto, GetReconciliationHistoryDto } from './dto/payment-reconciliation.dto';
export declare class PaymentReconciliationController {
    private readonly reconciliationService;
    constructor(reconciliationService: PaymentReconciliationService);
    createReconciliation(dto: CreatePaymentReconciliationDto, user: Record<string, any>): Promise<import("./payment-reconciliation.service").ReconciliationRecord>;
    getHistory(query: GetReconciliationHistoryDto, user: Record<string, any>): Promise<import("./payment-reconciliation.service").ReconciliationRecord[]>;
    getVarianceReport(startDate: string, endDate: string, user: Record<string, any>): Promise<{
        totalReconciliations: number;
        totalVariance: number;
        averageVariance: number;
        maxVariance: number;
        minVariance: number;
        variancePercentage: number;
    }>;
}
