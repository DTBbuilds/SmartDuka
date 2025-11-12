export declare class CreatePaymentReconciliationDto {
    actualCash: number;
    reconciliationNotes?: string;
}
export declare class GetReconciliationHistoryDto {
    startDate?: string;
    endDate?: string;
}
export declare class MatchTransactionsDto {
    mpesaTransactionIds: string[];
}
