import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
export declare class UsersService {
    private readonly userModel;
    constructor(userModel: Model<UserDocument>);
    create(dto: CreateUserDto): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    findByEmailAndShop(email: string, shopId: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    findByShop(shopId: string): Promise<User[]>;
    findCashiersByShop(shopId: string): Promise<User[]>;
    countCashiersByShop(shopId: string): Promise<number>;
    updateStatus(userId: string, status: 'active' | 'disabled'): Promise<User | null>;
    validatePassword(user: User, password: string): Promise<boolean>;
    deleteUser(userId: string): Promise<any>;
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
}
