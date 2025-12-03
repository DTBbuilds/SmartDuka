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
    status?: string;
    mpesaReceiptNumber?: string;
    mpesaTransactionId?: string;
    customerPhone?: string;
    amountTendered?: number;
    change?: number;
    cardLastFour?: string;
    cardBrand?: string;
    notes?: string;
}
export declare class CheckoutDto {
    items: CheckoutItemDto[];
    notes?: string;
    customerName?: string;
    customerPhone?: string;
    cashierId?: string;
    cashierName?: string;
    payments?: CheckoutPaymentDto[];
    status?: 'pending' | 'completed' | 'void';
    taxRate?: number;
    isOffline?: boolean;
}
