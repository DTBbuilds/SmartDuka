import { AuthService } from './auth.service';
import { RegisterShopDto } from './dto/register-shop.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    registerShop(dto: RegisterShopDto): Promise<{
        shop: {
            id: any;
            shopId: any;
            name: string;
            status: "active" | "pending" | "verified" | "suspended";
            email: string;
        };
        user: {
            id: any;
            email: string;
            name: any;
            role: "admin" | "branch_admin" | "branch_manager" | "supervisor" | "cashier";
        };
        token: string;
    }>;
    login(dto: LoginDto, req: any): Promise<{
        user: {
            id: any;
            email: any;
            role: string;
        };
        shop: null;
        token: string;
    } | {
        user: {
            id: any;
            email: string;
            name: any;
            role: "admin" | "branch_admin" | "branch_manager" | "supervisor" | "cashier";
            shopId: any;
        };
        shop: {
            id: unknown;
            name: string;
            status: "active" | "pending" | "verified";
        };
        token: string;
    }>;
    loginWithPin(body: {
        pin: string;
        shopId: string;
    }, req: any): Promise<{
        user: {
            id: any;
            email: string;
            name: any;
            role: "admin" | "branch_admin" | "branch_manager" | "supervisor" | "cashier";
            shopId: any;
        };
        shop: {
            id: unknown;
            name: string;
            status: "active" | "pending" | "verified";
        };
        token: string;
    }>;
    setPin(body: {
        pin: string;
    }, user: any): Promise<{
        message: string;
    }>;
    getProfile(user: any): Promise<any>;
}
