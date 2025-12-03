export declare class ShopInfoDto {
    shopName: string;
    businessType: string;
    county: string;
    city: string;
    address?: string;
    kraPin?: string;
    description?: string;
}
export declare class AdminInfoDto {
    name: string;
    email: string;
    phone: string;
    password: string;
}
export declare class RegisterShopDto {
    shop: ShopInfoDto;
    admin: AdminInfoDto;
}
