export declare class CreateDailyReconciliationDto {
    actualCash: number;
    reconciliationNotes?: string;
}
export declare class GetReconciliationHistoryDto {
    startDate?: string;
    endDate?: string;
    status?: string;
}
export declare class InvestigateVarianceDto {
    varianceType: string;
    investigationNotes: string;
}
export declare class ApproveReconciliationDto {
    notes?: string;
}
