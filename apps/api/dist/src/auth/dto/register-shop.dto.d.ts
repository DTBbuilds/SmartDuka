export declare class ShopInfoDto {
    address?: string;
    city?: string;
    businessType?: string;
    kraPin?: string;
}
export declare class AdminInfoDto {
    name: string;
    email: string;
    phone?: string;
    password: string;
}
export declare class RegisterShopDto {
    shop: ShopInfoDto;
    admin: AdminInfoDto;
}
