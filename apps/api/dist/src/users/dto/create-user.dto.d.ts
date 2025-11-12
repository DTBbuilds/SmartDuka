export declare class CreateUserDto {
    shopId: string;
    email: string;
    phone?: string;
    name?: string;
    password: string;
    role?: 'admin' | 'cashier';
}
