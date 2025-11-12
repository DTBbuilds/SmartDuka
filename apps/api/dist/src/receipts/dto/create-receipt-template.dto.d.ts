export declare class CreateReceiptTemplateDto {
    name: string;
    header: string;
    footer?: string;
    companyName?: string;
    companyPhone?: string;
    companyEmail?: string;
    companyWebsite?: string;
    showItemDetails?: boolean;
    showTaxBreakdown?: boolean;
    showQRCode?: boolean;
    qrCodeContent?: string;
    showThankYouMessage?: boolean;
    thankYouMessage?: string;
    isDefault?: boolean;
}
