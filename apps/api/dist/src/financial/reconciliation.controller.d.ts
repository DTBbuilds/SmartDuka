import { ReconciliationService } from './reconciliation.service';
import { CreateDailyReconciliationDto, GetReconciliationHistoryDto, InvestigateVarianceDto, ApproveReconciliationDto } from './dto/reconciliation.dto';
export declare class ReconciliationController {
    private readonly reconciliationService;
    constructor(reconciliationService: ReconciliationService);
    createReconciliation(dto: CreateDailyReconciliationDto, user: Record<string, any>): Promise<import("mongoose").Document<unknown, {}, import("./reconciliation.schema").Reconciliation, {}, {}> & import("./reconciliation.schema").Reconciliation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getHistory(query: GetReconciliationHistoryDto, user: Record<string, any>): Promise<(import("mongoose").Document<unknown, {}, import("./reconciliation.schema").Reconciliation, {}, {}> & import("./reconciliation.schema").Reconciliation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getVarianceReport(startDate: string, endDate: string, user: Record<string, any>): Promise<{
        totalReconciliations: number;
        totalVariance: number;
        averageVariance: number;
        maxVariance: number;
        minVariance: number;
        variancePercentage: number;
        pendingVariances: number;
    }>;
    investigateVariance(id: string, dto: InvestigateVarianceDto, user: Record<string, any>): Promise<(import("mongoose").Document<unknown, {}, import("./reconciliation.schema").Reconciliation, {}, {}> & import("./reconciliation.schema").Reconciliation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
    approveReconciliation(id: string, dto: ApproveReconciliationDto, user: Record<string, any>): Promise<(import("mongoose").Document<unknown, {}, import("./reconciliation.schema").Reconciliation, {}, {}> & import("./reconciliation.schema").Reconciliation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
    getStats(user: Record<string, any>): Promise<{
        totalReconciliations: number;
        reconciled: number;
        pendingVariances: number;
        averageVariance: number;
        lastReconciliation?: Date;
    }>;
}
