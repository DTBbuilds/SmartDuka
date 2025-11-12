export declare class DiscountRuleDto {
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    applicableProducts?: string[];
    applicableCategories?: string[];
    validFrom: Date;
    validTo: Date;
    applicableDays?: string[];
    applicableHours?: {
        start: number;
        end: number;
    };
    customerSegments?: string[];
}
export declare class CreateDiscountDto {
    name: string;
    type: 'percentage' | 'fixed' | 'bogo' | 'tiered' | 'coupon';
    value: number;
    rules: DiscountRuleDto;
    usageLimit?: number;
    requiresApproval?: boolean;
    status?: 'active' | 'inactive';
}
