export declare class ReturnItemDto {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    reason: string;
}
export declare class CreateReturnDto {
    orderId: string;
    orderDate: Date;
    items: ReturnItemDto[];
    requestedBy: string;
    returnWindow?: number;
}
