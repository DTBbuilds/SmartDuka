export declare class UpdateShopSettingsDto {
    enabled?: boolean;
    rate?: number;
    name?: string;
    description?: string;
    appliedByDefault?: boolean;
    taxExemptProducts?: string[];
    categoryTaxRates?: Record<string, {
        rate: number;
        exempt: boolean;
    }>;
}
