import { Injectable, UnauthorizedException, BadRequestException, Optional, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { ShopsService } from '../shops/shops.service';
import { ShopSettingsService } from '../shop-settings/shop-settings.service';
import { SystemEventManagerService } from '../notifications/system-event-manager.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { BillingCycle } from '../subscriptions/schemas/subscription.schema';
import { RegisterShopDto } from './dto/register-shop.dto';
import { LoginDto } from './dto/login.dto';
import * as bcryptjs from 'bcryptjs';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly shopsService: ShopsService,
    private readonly jwtService: JwtService,
    private readonly shopSettingsService: ShopSettingsService,
    @Optional() @Inject('ActivityService') private readonly activityService?: any,
    @InjectModel('SuperAdmin') private readonly superAdminModel?: Model<any>,
    @Optional() private readonly systemEventManager?: SystemEventManagerService,
    @Optional() private readonly subscriptionsService?: SubscriptionsService,
  ) {}

  async registerShop(dto: RegisterShopDto) {
    // Create shop with proper shop name and admin contact info
    const shopData: any = {
      name: dto.shop.shopName,  // Use the actual shop name provided
      email: dto.admin.email,   // Use admin email as shop contact email
      phone: dto.admin.phone,   // Use admin phone as shop contact phone
      businessType: dto.shop.businessType,
      county: dto.shop.county,
      city: dto.shop.city,
    };

    // Add optional fields if they have values
    if (dto.shop.address) shopData.address = dto.shop.address;
    if (dto.shop.kraPin) shopData.kraPin = dto.shop.kraPin;
    if (dto.shop.description) shopData.description = dto.shop.description;

    const shop = await this.shopsService.create('', shopData);

    // Initialize shop settings with receipt info from registration
    try {
      await this.shopSettingsService.syncReceiptSettingsFromShop((shop as any).shopId);
    } catch (err) {
      console.error('Failed to initialize shop settings:', err);
      // Don't fail registration if settings sync fails
    }

    // Create subscription for the shop
    let subscriptionPlanName = 'Free Trial';
    let subscriptionDetails = {
      planPrice: 0,
      billingCycle: 'month',
      maxShops: 1,
      maxEmployees: 3,
      maxProducts: 100,
    };
    
    if (this.subscriptionsService && dto.shop.subscriptionPlanCode) {
      try {
        const billingCycle = dto.shop.billingCycle === 'annual' ? BillingCycle.ANNUAL : BillingCycle.MONTHLY;
        const subscription = await this.subscriptionsService.createSubscription(
          (shop as any)._id.toString(),
          {
            planCode: dto.shop.subscriptionPlanCode,
            billingCycle,
          },
        );
        subscriptionPlanName = subscription?.planName || dto.shop.subscriptionPlanCode;
        
        // Get plan details for email
        if (subscription) {
          subscriptionDetails = {
            planPrice: subscription.currentPrice || 0,
            billingCycle: billingCycle === BillingCycle.ANNUAL ? 'year' : 'month',
            maxShops: subscription.usage?.shops?.limit || 1,
            maxEmployees: subscription.usage?.employees?.limit || 3,
            maxProducts: subscription.usage?.products?.limit || 100,
          };
        }
        
        this.logger.log(`Subscription created for shop ${shop.name}: ${subscriptionPlanName}`);
      } catch (err) {
        this.logger.error('Failed to create subscription:', err);
        // Don't fail registration if subscription creation fails - will default to trial
      }
    }

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

    // Send welcome email
    if (this.systemEventManager) {
      try {
        await this.systemEventManager.queueEvent({
          type: 'welcome',
          shop: {
            shopId: (shop as any)._id.toString(),
            shopName: shop.name,
            shopEmail: shop.email,
          },
          user: {
            userId: (user as any)._id.toString(),
            userName: dto.admin.name,
            userEmail: dto.admin.email,
          },
          data: {
            planName: subscriptionPlanName,
            trialDays: 14,
            ...subscriptionDetails,
          },
        });
        this.logger.log(`Welcome email queued for ${dto.admin.email}`);
      } catch (err) {
        this.logger.error('Failed to queue welcome email:', err);
        // Don't fail registration if email fails
      }
    }

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
      console.log(`[Auth] Login failed: No user found with email ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isValid = await this.usersService.validatePassword(user, dto.password);
    if (!isValid) {
      console.log(`[Auth] Login failed: Invalid password for user ${dto.email}`);
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
      isValid = await bcryptjs.compare(dto.password, superAdmin.passwordHash);
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

  async googleLogin(googleUser: { 
    googleId: string; 
    email: string; 
    name: string; 
    avatarUrl?: string;
  }, ipAddress?: string, userAgent?: string) {
    // First, try to find user by Google ID
    let user = await this.usersService.findByGoogleId(googleUser.googleId);
    
    if (!user) {
      // Try to find by email (existing user linking Google account)
      user = await this.usersService.findByEmail(googleUser.email);
    }
    
    if (!user) {
      // No existing user - return special response for shop registration flow
      return {
        isNewUser: true,
        googleProfile: {
          googleId: googleUser.googleId,
          email: googleUser.email,
          name: googleUser.name,
          avatarUrl: googleUser.avatarUrl,
        },
        token: null,
        user: null,
        shop: null,
      };
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is disabled');
    }

    // Link Google account if not already linked
    if (!(user as any).googleId) {
      await this.usersService.linkGoogleAccount(
        (user as any)._id.toString(),
        googleUser.googleId,
        googleUser.avatarUrl,
      );
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

    // Log login activity
    if (this.activityService) {
      await this.activityService.logActivity(
        (user as any).shopId.toString(),
        (user as any)._id.toString(),
        (user as any).name || user.email,
        user.role,
        'login_google',
        { email: user.email, method: 'Google OAuth' },
        ipAddress,
        userAgent,
      );
    }

    return {
      isNewUser: false,
      googleProfile: null,
      user: {
        id: (user as any)._id,
        email: user.email,
        name: (user as any).name,
        role: user.role,
        shopId: (user as any).shopId,
        avatarUrl: (user as any).avatarUrl,
      },
      shop: {
        id: shop._id,
        name: shop.name,
        status: shop.status,
      },
      token,
    };
  }

  async registerShopWithGoogle(
    googleProfile: { googleId: string; email: string; name: string; avatarUrl?: string },
    shopData: { shopName: string; businessType: string; county: string; city: string; address?: string; kraPin?: string; description?: string; phone?: string },
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Validate phone is provided (required for shop creation)
    if (!shopData.phone) {
      throw new BadRequestException('Phone number is required');
    }

    // Create shop
    const shopPayload: any = {
      name: shopData.shopName,
      email: googleProfile.email,
      phone: shopData.phone,
      businessType: shopData.businessType,
      county: shopData.county,
      city: shopData.city,
    };

    if (shopData.address) shopPayload.address = shopData.address;
    if (shopData.kraPin) shopPayload.kraPin = shopData.kraPin;
    if (shopData.description) shopPayload.description = shopData.description;

    const shop = await this.shopsService.create('', shopPayload);

    // Initialize shop settings with receipt info from registration
    try {
      await this.shopSettingsService.syncReceiptSettingsFromShop((shop as any).shopId);
    } catch (err) {
      console.error('Failed to initialize shop settings:', err);
      // Don't fail registration if settings sync fails
    }

    // Create admin user with Google auth
    const user = await this.usersService.createGoogleUser({
      shopId: (shop as any)._id.toString(),
      email: googleProfile.email,
      name: googleProfile.name,
      googleId: googleProfile.googleId,
      avatarUrl: googleProfile.avatarUrl,
      phone: shopData.phone,
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
        shopId: (shop as any).shopId,
        name: shop.name,
        status: shop.status,
        email: shop.email,
      },
      user: {
        id: (user as any)._id,
        email: user.email,
        name: (user as any).name,
        role: user.role,
        avatarUrl: (user as any).avatarUrl,
      },
      token,
    };
  }
}
