export declare class TaxConfigDto {
    enabled?: boolean;
    rate?: number;
    name?: string;
    description?: string;
    appliedByDefault?: boolean;
}
export declare class CreateShopSettingsDto {
    shopId: string;
    tax?: TaxConfigDto;
    taxExemptProducts?: string[];
    categoryTaxRates?: Record<string, {
        rate: number;
        exempt: boolean;
    }>;
}
