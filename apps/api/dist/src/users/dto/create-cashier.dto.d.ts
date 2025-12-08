export declare class CreateCashierDto {
    name: string;
    phone?: string;
    email?: string;
    branchId?: string;
    permissions?: {
        canVoid?: boolean;
        canRefund?: boolean;
        canDiscount?: boolean;
        maxDiscountAmount?: number;
        maxRefundAmount?: number;
        voidRequiresApproval?: boolean;
        refundRequiresApproval?: boolean;
        discountRequiresApproval?: boolean;
    };
}
