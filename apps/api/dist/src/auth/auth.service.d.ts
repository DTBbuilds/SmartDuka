import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { ShopsService } from '../shops/shops.service';
import { ShopSettingsService } from '../shop-settings/shop-settings.service';
import { SystemEventManagerService } from '../notifications/system-event-manager.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { RegisterShopDto } from './dto/register-shop.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly usersService;
    private readonly shopsService;
    private readonly jwtService;
    private readonly shopSettingsService;
    private readonly activityService?;
    private readonly superAdminModel?;
    private readonly systemEventManager?;
    private readonly subscriptionsService?;
    private readonly logger;
    constructor(usersService: UsersService, shopsService: ShopsService, jwtService: JwtService, shopSettingsService: ShopSettingsService, activityService?: any | undefined, superAdminModel?: Model<any> | undefined, systemEventManager?: SystemEventManagerService | undefined, subscriptionsService?: SubscriptionsService | undefined);
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
    setPin(userId: string, pin: string): Promise<void>;
    validateUser(userId: string): Promise<import("../users/schemas/user.schema").User | null>;
    googleLogin(googleUser: {
        googleId: string;
        email: string;
        name: string;
        avatarUrl?: string;
    }, ipAddress?: string, userAgent?: string): Promise<{
        isNewUser: boolean;
        googleProfile: {
            googleId: string;
            email: string;
            name: string;
            avatarUrl: string | undefined;
        };
        token: null;
        user: null;
        shop: null;
    } | {
        isNewUser: boolean;
        googleProfile: null;
        user: {
            id: any;
            email: string;
            name: any;
            cashierId: any;
            role: "admin" | "branch_admin" | "branch_manager" | "supervisor" | "cashier";
            shopId: any;
            branchId: any;
            avatarUrl: any;
        };
        shop: {
            id: unknown;
            name: string;
            status: "active" | "pending" | "verified";
        };
        token: string;
    }>;
    registerShopWithGoogle(googleProfile: {
        googleId: string;
        email: string;
        name: string;
        avatarUrl?: string;
    }, shopData: {
        shopName: string;
        businessType: string;
        county: string;
        city: string;
        address?: string;
        kraPin?: string;
        description?: string;
        phone?: string;
    }, ipAddress?: string, userAgent?: string): Promise<{
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
