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

    // Get the highest cashier number for this shop to avoid gaps
    const lastCashier = await this.userModel
      .findOne({
        shopId: new Types.ObjectId(shopId),
        role: 'cashier',
        cashierId: { $exists: true },
      })
      .sort({ cashierId: -1 })
      .select('cashierId');

    let nextNum = 1;
    if (lastCashier?.cashierId) {
      const match = lastCashier.cashierId.match(/C(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const cashierId = `C${String(nextNum).padStart(3, '0')}`;

    // Generate unique email using shopId to avoid collisions across shops
    const shortShopId = shopId.slice(-6);
    const uniqueEmail =
      createCashierDto.email || `cashier-${cashierId}-${shortShopId}@shop.local`;

    // Check if email already exists
    const existingUser = await this.userModel.findOne({ email: uniqueEmail });
    if (existingUser) {
      throw new Error(`A user with this email already exists. Please use a different email.`);
    }

    const user = new this.userModel({
      shopId: new Types.ObjectId(shopId),
      name: createCashierDto.name,
      phone: createCashierDto.phone,
      email: uniqueEmail,
      role: 'cashier',
      status: 'active',
      pinHash: hashedPin,
      cashierId,
      passwordHash: await import('bcryptjs').then((bcrypt) =>
        bcrypt.hash(Math.random().toString(), 10),
      ),
    });

    try {
      await user.save();
    } catch (err: any) {
      // Handle MongoDB duplicate key error
      if (err.code === 11000) {
        throw new Error('A cashier with this ID already exists. Please try again.');
      }
      throw err;
    }

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

  // Google OAuth methods
  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userModel.findOne({ googleId }).exec();
  }

  async linkGoogleAccount(
    userId: string,
    googleId: string,
    avatarUrl?: string,
  ): Promise<User | null> {
    return this.userModel.findByIdAndUpdate(
      userId,
      { 
        googleId, 
        avatarUrl,
        authProvider: 'google',
      },
      { new: true },
    ).exec();
  }

  async createGoogleUser(data: {
    shopId: string;
    email: string;
    name: string;
    googleId: string;
    avatarUrl?: string;
    phone?: string;
    role?: 'admin' | 'cashier';
  }): Promise<User> {
    // Generate a random password hash (user won't use it, they'll use Google)
    const randomPassword = Math.random().toString(36).slice(-12);
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    const user = new this.userModel({
      shopId: new Types.ObjectId(data.shopId),
      email: data.email,
      name: data.name,
      googleId: data.googleId,
      avatarUrl: data.avatarUrl,
      phone: data.phone,
      authProvider: 'google',
      role: data.role || 'admin',
      status: 'active',
      passwordHash,
    });

    return user.save();
  }
}
