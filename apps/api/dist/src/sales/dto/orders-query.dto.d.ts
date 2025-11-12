export declare class OrdersQueryDto {
    q?: string;
    status?: 'pending' | 'completed' | 'void';
    paymentStatus?: 'unpaid' | 'partial' | 'paid';
    from?: string;
    to?: string;
    limit?: number;
}
