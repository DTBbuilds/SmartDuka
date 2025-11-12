import { Injectable, UnauthorizedException, BadRequestException, Optional, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { ShopsService } from '../shops/shops.service';
import { RegisterShopDto } from './dto/register-shop.dto';
import { LoginDto } from './dto/login.dto';
import * as bcryptjs from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly shopsService: ShopsService,
    private readonly jwtService: JwtService,
    @Optional() @Inject('ActivityService') private readonly activityService?: any,
    @InjectModel('SuperAdmin') private readonly superAdminModel?: Model<any>,
  ) {}

  async registerShop(dto: RegisterShopDto) {
    // Create shop with admin info (admin is the shop owner)
    const shopData: any = {
      name: dto.admin.name,  // Use admin name as shop name
      email: dto.admin.email,  // Use admin email as shop email
      phone: dto.admin.phone,  // Use admin phone as shop phone
    };

    // Only add optional fields if they have values
    if (dto.shop.address) shopData.address = dto.shop.address;
    if (dto.shop.city) shopData.city = dto.shop.city;
    if (dto.shop.businessType) shopData.businessType = dto.shop.businessType;
    if (dto.shop.kraPin) shopData.kraPin = dto.shop.kraPin;

    const shop = await this.shopsService.create('', shopData);

    // Create admin user for shop
    const user = await this.usersService.create({
      shopId: (shop as any)._id.toString(),
      email: dto.admin.email,
      phone: dto.admin.phone,
      name: dto.admin.name,
      password: dto.admin.password,
      role: 'admin',
    });

    // Generate JWT token
    const token = this.jwtService.sign({
      sub: (user as any)._id,
      email: user.email,
      name: (user as any).name || user.email,
      role: user.role,
      shopId: (shop as any)._id,
    });

    return {
      shop: {
        id: (shop as any)._id,
        shopId: (shop as any).shopId,  // Human-readable shop ID
        name: shop.name,
        status: shop.status,
        email: shop.email,
      },
      user: {
        id: (user as any)._id,
        email: user.email,
        name: (user as any).name,
        role: user.role,
      },
      token,
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    // Check if this is a super admin login
    if (dto.role === 'super_admin') {
      return this.loginSuperAdmin(dto);
    }

    // Find user by email
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isValid = await this.usersService.validatePassword(user, dto.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is disabled');
    }

    // Validate role if provided
    if (dto.role && user.role !== dto.role) {
      throw new UnauthorizedException(`User role is ${user.role}, not ${dto.role}`);
    }

    // Validate shopId if provided
    if (dto.shopId && (user as any).shopId.toString() !== dto.shopId) {
      throw new UnauthorizedException('User does not belong to this shop');
    }

    // Get shop info
    const shop = await this.shopsService.findById((user as any).shopId.toString());
    if (!shop) {
      throw new UnauthorizedException('Shop not found');
    }

    // Check shop status
    if (shop.status === 'suspended') {
      throw new UnauthorizedException('Shop is suspended');
    }

    // Generate JWT token
    const token = this.jwtService.sign({
      sub: (user as any)._id,
      email: user.email,
      name: (user as any).name || user.email,
      role: user.role,
      shopId: (user as any).shopId,
    });

    // Log login activity (if activity service is available)
    if (this.activityService) {
      await this.activityService.logActivity(
        (user as any).shopId.toString(),
        (user as any)._id.toString(),
        (user as any).name || user.email,
        user.role,
        'login',
        { email: user.email },
        ipAddress,
        userAgent,
      );
    }

    return {
      user: {
        id: (user as any)._id,
        email: user.email,
        name: (user as any).name,
        role: user.role,
        shopId: (user as any).shopId,
      },
      shop: {
        id: shop._id,
        name: shop.name,
        status: shop.status,
      },
      token,
    };
  }

  async loginSuperAdmin(dto: LoginDto) {
    console.log('[SuperAdmin Login] Attempting login for:', dto.email);
    
    // Check if super admin model is available
    if (!this.superAdminModel) {
      console.error('[SuperAdmin Login] Model not available');
      throw new UnauthorizedException('Super admin authentication not available');
    }

    console.log('[SuperAdmin Login] Model available, searching for user...');

    // Find super admin by email (case-insensitive)
    const superAdmin = await this.superAdminModel.findOne({ 
      email: dto.email.toLowerCase().trim() 
    });
    
    console.log('[SuperAdmin Login] Search result:', superAdmin ? 'Found' : 'Not found');
    
    if (!superAdmin) {
      console.error('[SuperAdmin Login] User not found:', dto.email);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    let isValid = false;
    try {
      console.log('[SuperAdmin Login] Comparing passwords...');
      isValid = await bcryptjs.compare(dto.password, superAdmin.passwordHash);
      console.log('[SuperAdmin Login] Password valid:', isValid);
    } catch (error) {
      console.error('[SuperAdmin Login] Password comparison error:', error);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!isValid) {
      console.error('[SuperAdmin Login] Invalid password');
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if super admin is active
    if (superAdmin.status !== 'active') {
      console.error('[SuperAdmin Login] Account disabled:', superAdmin.status);
      throw new UnauthorizedException('Account is disabled');
    }

    console.log('[SuperAdmin Login] Login successful, generating token...');

    // Generate JWT token (no shopId for super admin)
    const token = this.jwtService.sign({
      sub: superAdmin._id,
      email: superAdmin.email,
      role: 'super_admin',
    });

    console.log('[SuperAdmin Login] Token generated successfully');

    return {
      user: {
        id: superAdmin._id,
        email: superAdmin.email,
        role: 'super_admin',
      },
      shop: null,
      token,
    };
  }

  async loginWithPin(pin: string, shopId: string, ipAddress?: string, userAgent?: string) {
    // Find user by PIN and shop
    const user = await this.usersService.findByPin(pin, shopId);
    if (!user) {
      throw new UnauthorizedException('Invalid PIN');
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is disabled');
    }

    // Get shop info
    const shop = await this.shopsService.findById((user as any).shopId.toString());
    if (!shop) {
      throw new UnauthorizedException('Shop not found');
    }

    // Check shop status
    if (shop.status === 'suspended') {
      throw new UnauthorizedException('Shop is suspended');
    }

    // Generate JWT token
    const token = this.jwtService.sign({
      sub: (user as any)._id,
      email: user.email,
      role: user.role,
      shopId: (user as any).shopId,
    });

    // Update last login time
    await this.usersService.updateLastLogin((user as any)._id.toString());

    // Log login activity (if activity service is available)
    if (this.activityService) {
      await this.activityService.logActivity(
        (user as any).shopId.toString(),
        (user as any)._id.toString(),
        (user as any).name || user.email,
        user.role,
        'login_pin',
        { method: 'PIN' },
        ipAddress,
        userAgent,
      );
    }

    return {
      user: {
        id: (user as any)._id,
        email: user.email,
        name: (user as any).name,
        role: user.role,
        shopId: (user as any).shopId,
      },
      shop: {
        id: shop._id,
        name: shop.name,
        status: shop.status,
      },
      token,
    };
  }

  async setPin(userId: string, pin: string): Promise<void> {
    // Validate PIN format (4-6 digits)
    if (!/^\d{4,6}$/.test(pin)) {
      throw new BadRequestException('PIN must be 4-6 digits');
    }

    const hashedPin = await bcryptjs.hash(pin, 10);
    await this.usersService.updatePin(userId, hashedPin);
  }

  async validateUser(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user || user.status !== 'active') {
      return null;
    }
    return user;
  }
}
