import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateCashierDto } from './dto/create-cashier.dto';
import { ChangePinDto } from './dto/update-pin.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(dto: CreateUserDto, user: any): Promise<any>;
    findById(id: string): Promise<any>;
    me(req: any): Promise<any>;
    findUsers(email?: string, role?: string, branchId?: string, status?: string, user?: any): Promise<any[]>;
    getCashiersByShop(shopId: string, branchId?: string, user?: any): Promise<any[]>;
    getCashiersByBranch(branchId: string, user: any): Promise<any[]>;
    getCashierDetails(id: string, user: any): Promise<any>;
    updateUser(id: string, dto: any, user: any): Promise<any>;
    updateUserStatus(id: string, dto: {
        status: 'active' | 'disabled';
    }, user: any): Promise<any>;
    updateCashierPermissions(id: string, dto: {
        canVoid?: boolean;
        canRefund?: boolean;
        canDiscount?: boolean;
        maxDiscountAmount?: number;
        maxRefundAmount?: number;
        voidRequiresApproval?: boolean;
        refundRequiresApproval?: boolean;
        discountRequiresApproval?: boolean;
    }, user: any): Promise<any>;
    deleteUser(id: string, user: any): Promise<{
        deleted: boolean;
        message: string;
    }>;
    createCashier(dto: CreateCashierDto, user: any): Promise<{
        user: {
            id: any;
            name: any;
            email: any;
            phone: any;
            cashierId: any;
            branchId: any;
            role: any;
            status: any;
        };
        pin: string;
    }>;
    assignCashierToBranch(userId: string, dto: {
        branchId: string;
    }, user: any): Promise<any>;
    unassignCashierFromBranch(userId: string, user: any): Promise<any>;
    transferCashierToBranch(userId: string, dto: {
        branchId: string;
    }, user: any): Promise<any>;
    resetPin(userId: string, user: any): Promise<{
        message: string;
        pin: string;
    }>;
    changePin(dto: ChangePinDto, user: any): Promise<{
        message: string;
    }>;
}
