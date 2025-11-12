export declare class UpdateShopDto {
    name?: string;
    address?: string;
    city?: string;
    businessType?: string;
    kraPin?: string;
    status?: 'pending' | 'verified' | 'active' | 'suspended';
    verificationNotes?: string;
}
