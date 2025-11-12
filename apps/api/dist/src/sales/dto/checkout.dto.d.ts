export declare class CheckoutItemDto {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
}
export declare class CheckoutPaymentDto {
    method: string;
    amount: number;
    reference?: string;
}
export declare class CheckoutDto {
    items: CheckoutItemDto[];
    notes?: string;
    customerName?: string;
    cashierId?: string;
    cashierName?: string;
    payments?: CheckoutPaymentDto[];
    status?: 'pending' | 'completed' | 'void';
    taxRate?: number;
    isOffline?: boolean;
}
