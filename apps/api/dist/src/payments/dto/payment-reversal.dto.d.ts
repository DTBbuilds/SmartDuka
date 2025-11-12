export declare class ReversePaymentDto {
    orderId: string;
    paymentId: string;
    reason: string;
    notes?: string;
}
export declare class GetReversalHistoryDto {
    startDate?: string;
    endDate?: string;
}
