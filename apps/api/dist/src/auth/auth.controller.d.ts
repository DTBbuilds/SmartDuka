import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterShopDto } from './dto/register-shop.dto';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
export declare class AuthController {
    private readonly authService;
    private readonly configService;
    constructor(authService: AuthService, configService: ConfigService);
    registerShop(dto: RegisterShopDto): Promise<{
        shop: {
            id: any;
            shopId: any;
            name: string;
            status: "active" | "suspended" | "pending" | "verified";
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
            cashierId: any;
            role: "admin" | "branch_admin" | "branch_manager" | "supervisor" | "cashier";
            shopId: any;
            branchId: any;
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
            cashierId: any;
            role: "admin" | "branch_admin" | "branch_manager" | "supervisor" | "cashier";
            shopId: any;
            branchId: any;
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
    googleAuth(res: Response): Promise<void>;
    googleAuthCallback(req: any, res: Response): Promise<void>;
    registerShopWithGoogle(body: {
        googleProfile: {
            googleId: string;
            email: string;
            name: string;
            avatarUrl?: string;
            phone?: string;
        };
        shop: {
            shopName: string;
            businessType: string;
            county: string;
            city: string;
            address?: string;
            kraPin?: string;
            description?: string;
            phone?: string;
        };
    }, req: any): Promise<{
        shop: {
            id: any;
            shopId: any;
            name: string;
            status: "active" | "suspended" | "pending" | "verified";
            email: string;
        };
        user: {
            id: any;
            email: string;
            name: any;
            role: "admin" | "branch_admin" | "branch_manager" | "supervisor" | "cashier";
            avatarUrl: any;
        };
        token: string;
    }>;
}
