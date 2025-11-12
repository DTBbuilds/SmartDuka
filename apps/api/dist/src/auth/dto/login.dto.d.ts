export declare class LoginDto {
    email: string;
    password: string;
    role?: 'admin' | 'cashier' | 'super_admin';
    shopId?: string;
}
