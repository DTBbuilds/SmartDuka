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
    findByEmail(email?: string): Promise<any[]>;
    getCashiersByShop(shopId: string, user: any): Promise<any[]>;
    updateUser(id: string, dto: any, user: any): Promise<any>;
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
            role: any;
            status: any;
        };
        pin: string;
    }>;
    resetPin(userId: string, user: any): Promise<{
        message: string;
        pin: string;
    }>;
    changePin(dto: ChangePinDto, user: any): Promise<{
        message: string;
    }>;
}
