export declare class ApplyDiscountDto {
    discountId: string;
    orderId: string;
    subtotal: number;
    appliedBy: string;
    customerId?: string;
    customerSegment?: string;
    itemCount?: number;
    reason?: string;
}
