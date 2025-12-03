export declare class UpdateShopDto {
    name?: string;
    address?: string;
    county?: string;
    city?: string;
    businessType?: string;
    kraPin?: string;
    description?: string;
    tillNumber?: string;
    status?: 'pending' | 'verified' | 'active' | 'suspended' | 'rejected' | 'flagged';
    verificationNotes?: string;
}
