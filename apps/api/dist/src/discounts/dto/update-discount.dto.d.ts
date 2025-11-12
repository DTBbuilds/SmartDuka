import { DiscountRuleDto } from './create-discount.dto';
export declare class UpdateDiscountDto {
    name?: string;
    type?: 'percentage' | 'fixed' | 'bogo' | 'tiered' | 'coupon';
    value?: number;
    rules?: DiscountRuleDto;
    usageLimit?: number;
    requiresApproval?: boolean;
    status?: 'active' | 'inactive';
}
