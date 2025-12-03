declare class SocialMediaDto {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    whatsapp?: string;
}
declare class ReceiptSettingsDto {
    shopName?: string;
    shopAddress?: string;
    shopPhone?: string;
    shopEmail?: string;
    shopLogo?: string;
    shopTaxPin?: string;
    shopWebsite?: string;
    printerWidth?: number;
    showLogo?: boolean;
    showTaxPin?: boolean;
    showCashierName?: boolean;
    showCustomerName?: boolean;
    showItemSku?: boolean;
    headerMessage?: string;
    footerMessage?: string;
    socialMedia?: SocialMediaDto;
}
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
    receipt?: ReceiptSettingsDto;
}
export {};
