import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { SubscriptionGuardService } from '../subscriptions/subscription-guard.service';
export declare class UsersService {
    private readonly userModel;
    private readonly subscriptionGuard;
    constructor(userModel: Model<UserDocument>, subscriptionGuard: SubscriptionGuardService);
    create(dto: CreateUserDto): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    findByEmailAndShop(email: string, shopId: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    findByShop(shopId: string): Promise<User[]>;
    findCashiersByShop(shopId: string, branchId?: string): Promise<User[]>;
    findCashiersByBranch(branchId: string): Promise<User[]>;
    countCashiersByShop(shopId: string): Promise<number>;
    countCashiersByBranch(branchId: string): Promise<number>;
    findUsersWithFilters(shopId: string, filters: {
        role?: string;
        branchId?: string;
        status?: string;
    }): Promise<User[]>;
    assignCashierToBranch(shopId: string, userId: string, branchId: string): Promise<User | null>;
    unassignCashierFromBranch(shopId: string, userId: string): Promise<User | null>;
    transferCashierToBranch(shopId: string, userId: string, newBranchId: string): Promise<User | null>;
    updateCashier(shopId: string, userId: string, updateData: {
        name?: string;
        phone?: string;
        branchId?: string;
        permissions?: {
            canVoid?: boolean;
            canRefund?: boolean;
            canDiscount?: boolean;
            maxDiscountAmount?: number;
            maxRefundAmount?: number;
            voidRequiresApproval?: boolean;
            refundRequiresApproval?: boolean;
            discountRequiresApproval?: boolean;
        };
    }): Promise<User | null>;
    getCashierDetails(shopId: string, userId: string): Promise<any>;
    updateStatus(userId: string, status: 'active' | 'disabled'): Promise<User | null>;
    validatePassword(user: User, password: string): Promise<boolean>;
    deleteUser(shopId: string, userId: string): Promise<{
        deleted: boolean;
        message: string;
    }>;
    findByPin(pin: string, shopId: string): Promise<User | null>;
    validatePin(user: User, pin: string): Promise<boolean>;
    updatePin(userId: string, hashedPin: string): Promise<User | null>;
    updateLastLogin(userId: string): Promise<User | null>;
    generatePin(): Promise<string>;
    private isInvalidPin;
    createCashierWithPin(shopId: string, createCashierDto: any): Promise<{
        user: any;
        pin: string;
    }>;
    resetPin(userId: string, shopId: string): Promise<string>;
    changePin(userId: string, currentPin: string, newPin: string): Promise<void>;
    findByGoogleId(googleId: string): Promise<User | null>;
    linkGoogleAccount(userId: string, googleId: string, avatarUrl?: string): Promise<User | null>;
    createGoogleUser(data: {
        shopId: string;
        email: string;
        name: string;
        googleId: string;
        avatarUrl?: string;
        phone?: string;
        role?: 'admin' | 'cashier';
    }): Promise<User>;
    countEmployeesByShop(shopId: string): Promise<number>;
}
