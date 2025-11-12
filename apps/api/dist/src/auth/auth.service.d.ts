import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { ShopsService } from '../shops/shops.service';
import { RegisterShopDto } from './dto/register-shop.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly usersService;
    private readonly shopsService;
    private readonly jwtService;
    private readonly activityService?;
    private readonly superAdminModel?;
    constructor(usersService: UsersService, shopsService: ShopsService, jwtService: JwtService, activityService?: any | undefined, superAdminModel?: Model<any> | undefined);
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
    login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<{
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
    loginSuperAdmin(dto: LoginDto): Promise<{
        user: {
            id: any;
            email: any;
            role: string;
        };
        shop: null;
        token: string;
    }>;
    loginWithPin(pin: string, shopId: string, ipAddress?: string, userAgent?: string): Promise<{
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
    setPin(userId: string, pin: string): Promise<void>;
    validateUser(userId: string): Promise<import("../users/schemas/user.schema").User | null>;
}
