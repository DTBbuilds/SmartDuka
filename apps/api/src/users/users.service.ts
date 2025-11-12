import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const { password, ...rest } = dto as any;
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Convert empty phone to null to avoid duplicate key errors
    const userData = {
      ...rest, 
      shopId: new Types.ObjectId(dto.shopId),
      passwordHash,
      phone: rest.phone && rest.phone.trim() ? rest.phone : null
    };
    
    const created = new this.userModel(userData);
    return created.save();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByEmailAndShop(email: string, shopId: string): Promise<User | null> {
    return this.userModel.findOne({ 
      email, 
      shopId: new Types.ObjectId(shopId) 
    }).exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async findByShop(shopId: string): Promise<User[]> {
    return this.userModel.find({ shopId: new Types.ObjectId(shopId) }).exec();
  }

  async findCashiersByShop(shopId: string): Promise<User[]> {
    return this.userModel.find({ 
      shopId: new Types.ObjectId(shopId),
      role: 'cashier'
    }).exec();
  }

  async countCashiersByShop(shopId: string): Promise<number> {
    return this.userModel.countDocuments({ 
      shopId: new Types.ObjectId(shopId),
      role: 'cashier'
    }).exec();
  }

  async updateStatus(userId: string, status: 'active' | 'disabled'): Promise<User | null> {
    return this.userModel.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    ).exec();
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, (user as any).passwordHash);
  }

  async deleteUser(userId: string): Promise<any> {
    return this.userModel.findByIdAndDelete(userId).exec();
  }

  async findByPin(pin: string, shopId: string): Promise<User | null> {
    const users = await this.userModel.find({
      shopId: new Types.ObjectId(shopId),
      status: 'active',
    }).exec();

    for (const user of users) {
      if ((user as any).pinHash) {
        const isValid = await this.validatePin(user, pin);
        if (isValid) {
          return user;
        }
      }
    }
    return null;
  }

  async validatePin(user: User, pin: string): Promise<boolean> {
    if (!(user as any).pinHash) {
      return false;
    }
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(pin, (user as any).pinHash);
  }

  async updatePin(userId: string, hashedPin: string): Promise<User | null> {
    return this.userModel.findByIdAndUpdate(
      userId,
      { pinHash: hashedPin },
      { new: true },
    ).exec();
  }

  async updateLastLogin(userId: string): Promise<User | null> {
    return this.userModel.findByIdAndUpdate(
      userId,
      { lastLoginAt: new Date() },
      { new: true },
    ).exec();
  }

  async generatePin(): Promise<string> {
    let pin = '';
    do {
      pin = Math.floor(Math.random() * 1000000).toString().padStart(4, '0');
    } while (this.isInvalidPin(pin));
    return pin;
  }

  private isInvalidPin(pin: string): boolean {
    // Reject sequential numbers (1234, 5678)
    const isSequential =
      /^(\d)\1+$/.test(pin) ||
      /^(?:0123|1234|2345|3456|4567|5678|6789|7890|9876|8765|7654|6543|5432|4321|3210)/.test(
        pin,
      );

    // Reject repeated digits (1111, 2222)
    const isRepeated = /^(\d)\1{3,}$/.test(pin);

    return isSequential || isRepeated;
  }

  async createCashierWithPin(
    shopId: string,
    createCashierDto: any,
  ): Promise<{ user: any; pin: string }> {
    const pin = await this.generatePin();
    const hashedPin = await import('bcryptjs').then((bcrypt) =>
      bcrypt.hash(pin, 10),
    );

    const cashierCount = await this.userModel.countDocuments({
      shopId: new Types.ObjectId(shopId),
      role: 'cashier',
    });
    const cashierId = `C${String(cashierCount + 1).padStart(3, '0')}`;

    const user = new this.userModel({
      shopId: new Types.ObjectId(shopId),
      name: createCashierDto.name,
      phone: createCashierDto.phone,
      email:
        createCashierDto.email || `cashier-${cashierId}@shop.local`,
      role: 'cashier',
      status: 'active',
      pinHash: hashedPin,
      cashierId,
      passwordHash: await import('bcryptjs').then((bcrypt) =>
        bcrypt.hash(Math.random().toString(), 10),
      ),
    });

    await user.save();

    return {
      user: user.toObject({ versionKey: false }),
      pin,
    };
  }

  async resetPin(userId: string, shopId: string): Promise<string> {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if ((user as any).role !== 'cashier') {
      throw new BadRequestException('Can only reset PIN for cashiers');
    }

    const newPin = await this.generatePin();
    const hashedPin = await import('bcryptjs').then((bcrypt) =>
      bcrypt.hash(newPin, 10),
    );

    await this.userModel.findByIdAndUpdate(
      userId,
      { pinHash: hashedPin },
      { new: true },
    );

    return newPin;
  }

  async changePin(
    userId: string,
    currentPin: string,
    newPin: string,
  ): Promise<void> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await this.validatePin(user, currentPin);
    if (!isValid) {
      throw new UnauthorizedException('Current PIN is incorrect');
    }

    if (this.isInvalidPin(newPin)) {
      throw new BadRequestException('Invalid PIN format');
    }

    const hashedPin = await import('bcryptjs').then((bcrypt) =>
      bcrypt.hash(newPin, 10),
    );
    await this.userModel.findByIdAndUpdate(
      userId,
      { pinHash: hashedPin },
      { new: true },
    );
  }
}
