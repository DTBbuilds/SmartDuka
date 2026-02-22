/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unused-vars, @typescript-eslint/require-await */
import { Injectable, BadRequestException, ConflictException, NotFoundException, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { SubscriptionGuardService } from '../subscriptions/subscription-guard.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @Inject(forwardRef(() => SubscriptionGuardService))
    private readonly subscriptionGuard: SubscriptionGuardService,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    // Enforce employee limit for non-admin roles (cashiers count as employees)
    const isEmployee = dto.role !== 'admin';
    if (isEmployee) {
      await this.subscriptionGuard.enforceLimit(dto.shopId, 'employees');
    }

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
    const user = await created.save();

    // Update usage count for employees
    if (isEmployee) {
      await this.subscriptionGuard.incrementUsage(dto.shopId, 'employees');
    }

    return user;
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

  async findCashiersByShop(shopId: string, branchId?: string): Promise<User[]> {
    const query: any = { 
      shopId: new Types.ObjectId(shopId),
      role: 'cashier'
    };
    
    if (branchId) {
      query.branchId = new Types.ObjectId(branchId);
    }
    
    return this.userModel.find(query).populate('branchId', 'name code').exec();
  }

  /**
   * Find cashiers by branch (for branch managers)
   */
  async findCashiersByBranch(branchId: string): Promise<User[]> {
    return this.userModel.find({ 
      branchId: new Types.ObjectId(branchId),
      role: 'cashier'
    }).exec();
  }

  async countCashiersByShop(shopId: string): Promise<number> {
    return this.userModel.countDocuments({ 
      shopId: new Types.ObjectId(shopId),
      role: 'cashier'
    }).exec();
  }

  async countCashiersByBranch(branchId: string): Promise<number> {
    return this.userModel.countDocuments({ 
      branchId: new Types.ObjectId(branchId),
      role: 'cashier'
    }).exec();
  }

  /**
   * Find users with filters (role, branchId, status)
   */
  async findUsersWithFilters(
    shopId: string,
    filters: { role?: string; branchId?: string; status?: string },
  ): Promise<User[]> {
    const query: any = { shopId: new Types.ObjectId(shopId) };

    if (filters.role) {
      query.role = filters.role;
    }
    if (filters.branchId) {
      query.branchId = new Types.ObjectId(filters.branchId);
    }
    if (filters.status) {
      query.status = filters.status;
    }

    return this.userModel.find(query).populate('branchId', 'name code').sort({ createdAt: -1 }).exec();
  }

  /**
   * Assign cashier to a branch
   */
  async assignCashierToBranch(
    shopId: string,
    userId: string,
    branchId: string,
  ): Promise<User | null> {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
      shopId: new Types.ObjectId(shopId),
      role: 'cashier',
    });

    if (!user) {
      throw new NotFoundException('Cashier not found');
    }

    return this.userModel.findByIdAndUpdate(
      userId,
      { branchId: new Types.ObjectId(branchId) },
      { new: true },
    ).populate('branchId', 'name code').exec();
  }

  /**
   * Remove cashier from branch (unassign)
   */
  async unassignCashierFromBranch(
    shopId: string,
    userId: string,
  ): Promise<User | null> {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
      shopId: new Types.ObjectId(shopId),
      role: 'cashier',
    });

    if (!user) {
      throw new NotFoundException('Cashier not found');
    }

    return this.userModel.findByIdAndUpdate(
      userId,
      { $unset: { branchId: 1 } },
      { new: true },
    ).exec();
  }

  /**
   * Transfer cashier to another branch
   */
  async transferCashierToBranch(
    shopId: string,
    userId: string,
    newBranchId: string,
  ): Promise<User | null> {
    return this.assignCashierToBranch(shopId, userId, newBranchId);
  }

  /**
   * Update a cashier's details (name, phone, branchId, permissions)
   */
  async updateCashier(
    shopId: string,
    userId: string,
    updateData: {
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
    },
  ): Promise<User | null> {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateFields: any = {};
    
    if (updateData.name) updateFields.name = updateData.name;
    if (updateData.phone !== undefined) updateFields.phone = updateData.phone || null;
    if (updateData.branchId !== undefined) {
      updateFields.branchId = updateData.branchId ? new Types.ObjectId(updateData.branchId) : null;
    }
    if (updateData.permissions) {
      updateFields.permissions = { ...user.permissions, ...updateData.permissions };
    }

    return this.userModel.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true },
    ).exec();
  }

  /**
   * Get cashier with full details including branch info
   */
  async getCashierDetails(shopId: string, userId: string): Promise<any> {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
      shopId: new Types.ObjectId(shopId),
    }).populate('branchId', 'name code').exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
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

  /**
   * Update user password (for password reset)
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    const result = await this.userModel.updateOne(
      { _id: new Types.ObjectId(userId) },
      { $set: { passwordHash: hashedPassword } },
    );
    
    if (result.matchedCount === 0) {
      throw new NotFoundException('User not found');
    }
  }

  /**
   * Delete a user (employee/cashier)
   * Only non-admin users can be deleted
   */
  async deleteUser(shopId: string, userId: string): Promise<{ deleted: boolean; message: string }> {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent deleting admin users
    if (user.role === 'admin') {
      throw new BadRequestException('Cannot delete admin users. Disable them instead.');
    }

    await this.userModel.deleteOne({ _id: new Types.ObjectId(userId) });

    // Decrement employee count
    await this.subscriptionGuard.decrementUsage(shopId, 'employees');

    return { deleted: true, message: 'User deleted successfully' };
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

  async updateEmailVerified(userId: string, verified: boolean): Promise<User | null> {
    return this.userModel.findByIdAndUpdate(
      userId,
      { emailVerified: verified },
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

    // Retry up to 3 times in case of race conditions
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Get all cashiers for this shop to find the highest number
      const allCashiers = await this.userModel
        .find({
          shopId: new Types.ObjectId(shopId),
          role: 'cashier',
          cashierId: { $exists: true, $ne: null },
        })
        .select('cashierId')
        .lean();

      // Find the highest cashier number
      let maxNum = 0;
      for (const c of allCashiers) {
        if (c.cashierId) {
          const match = c.cashierId.match(/C(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }
      
      // Add attempt offset to avoid collisions on retry
      const nextNum = maxNum + 1 + attempt;
      const cashierId = `C${String(nextNum).padStart(3, '0')}`;

      // Email is now required, so use the provided email
      const uniqueEmail = createCashierDto.email;

      // Check if email already exists
      const existingUser = await this.userModel.findOne({ email: uniqueEmail });
      if (existingUser) {
        throw new ConflictException(`A user with this email already exists. Please use a different email.`);
      }

      // Check if cashierId already exists for this shop
      const existingCashier = await this.userModel.findOne({ 
        shopId: new Types.ObjectId(shopId),
        cashierId 
      });
      if (existingCashier) {
        // Try next number
        continue;
      }

      const userData: any = {
        shopId: new Types.ObjectId(shopId),
        name: createCashierDto.name,
        phone: createCashierDto.phone || null,
        email: uniqueEmail,
        role: 'cashier',
        status: 'active',
        pinHash: hashedPin,
        cashierId,
        passwordHash: await import('bcryptjs').then((bcrypt) =>
          bcrypt.hash(Math.random().toString(), 10),
        ),
      };

      // Add branchId if provided
      if (createCashierDto.branchId) {
        userData.branchId = new Types.ObjectId(createCashierDto.branchId);
      }

      // Add permissions if provided
      if (createCashierDto.permissions) {
        userData.permissions = createCashierDto.permissions;
      }

      const user = new this.userModel(userData);

      try {
        await user.save();
        return {
          user: user.toObject({ versionKey: false }),
          pin,
        };
      } catch (err: any) {
        lastError = err;
        // Handle MongoDB duplicate key error - retry with next number
        if (err.code === 11000) {
          const keyPattern = err.keyPattern || {};
          const keyValue = err.keyValue || {};
          
          // Check for compound index (shopId + cashierId)
          if (keyPattern.shopId && keyPattern.cashierId) {
            // Cashier ID collision within shop, retry
            continue;
          }
          if (keyPattern.cashierId) {
            // Cashier ID collision, retry
            continue;
          }
          if (keyPattern.email) {
            throw new ConflictException('A user with this email already exists. Please use a different email.');
          }
          if (keyPattern.phone) {
            throw new ConflictException('A user with this phone number already exists.');
          }
          // Generic duplicate key - retry
          continue;
        }
        throw err;
      }
    }

    // All retries exhausted
    throw new ConflictException('Unable to create cashier. Please try again.');
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

  /**
   * Count employees (non-admin users) for a shop
   */
  async countEmployeesByShop(shopId: string): Promise<number> {
    return this.userModel.countDocuments({
      shopId: new Types.ObjectId(shopId),
      role: { $ne: 'admin' },
    }).exec();
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    preferences: {
      theme?: 'light' | 'dark' | 'system';
      language?: string;
      currency?: string;
      dateFormat?: string;
      soundEnabled?: boolean;
      receiptPrinterEnabled?: boolean;
    },
  ): Promise<User | null> {
    return this.userModel.findByIdAndUpdate(
      userId,
      { $set: { preferences } },
      { new: true },
    ).exec();
  }
}
