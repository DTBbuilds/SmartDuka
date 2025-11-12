export declare class RequestStockTransferDto {
    fromLocationId: string;
    toLocationId: string;
    productId: string;
    quantity: number;
    reason: string;
    notes?: string;
}
export declare class ApproveStockTransferDto {
    notes?: string;
}
export declare class RejectStockTransferDto {
    reason: string;
    notes?: string;
}
export declare class GetTransferHistoryDto {
    locationId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
}
