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
import { TokenService } from './token.service';
import * as bcryptjs from 'bcryptjs';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly shopsService: ShopsService,
    private readonly jwtService: JwtService,
    private readonly shopSettingsService: ShopSettingsService,
    @Optional() private readonly tokenService?: TokenService,
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

    // Send welcome email - fire and forget (don't block registration)
    if (this.systemEventManager) {
      // Use setImmediate to defer email sending to next tick - doesn't block response
      const eventManager = this.systemEventManager;
      setImmediate(() => {
        eventManager.queueEvent({
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
        }).then(() => {
          this.logger.debug(`Welcome email event processed for ${dto.admin.email}`);
        }).catch((err) => {
          this.logger.error(`Failed to queue welcome email for ${dto.admin.email}:`, err.message);
        });
      });
      this.logger.log(`Welcome email queued (async) for ${dto.admin.email}`);
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

    // Generate JWT token - include user's registered name for receipts
    const token = this.jwtService.sign({
      sub: (user as any)._id,
      email: user.email,
      name: (user as any).name || user.email,
      cashierId: (user as any).cashierId,
      role: user.role,
      shopId: (user as any).shopId,
      branchId: (user as any).branchId,
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
        (user as any).branchId?.toString(), // Include branchId for branch-specific activity tracking
      );
    }

    return {
      user: {
        id: (user as any)._id,
        email: user.email,
        name: (user as any).name,
        cashierId: (user as any).cashierId,
        role: user.role,
        shopId: (user as any).shopId,
        branchId: (user as any).branchId,
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

    // Generate JWT token - include cashier's registered name for receipts
    const token = this.jwtService.sign({
      sub: (user as any)._id,
      email: user.email,
      name: (user as any).name || user.email,
      cashierId: (user as any).cashierId,
      role: user.role,
      shopId: (user as any).shopId,
      branchId: (user as any).branchId,
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
        (user as any).branchId?.toString(), // Include branchId for branch-specific activity tracking
      );
    }

    return {
      user: {
        id: (user as any)._id,
        email: user.email,
        name: (user as any).name,
        cashierId: (user as any).cashierId,
        role: user.role,
        shopId: (user as any).shopId,
        branchId: (user as any).branchId,
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

  /**
   * Refresh token - issues a new token with extended expiry
   * Called when current token is still valid but approaching expiry
   */
  async refreshToken(currentUser: any, deviceId?: string, deviceFingerprint?: string) {
    // Validate user still exists and is active
    const user = await this.usersService.findById(currentUser.sub);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found or inactive');
    }

    // For non-super-admin users, validate shop
    let shopInfo: { id: any; name: string; status: string } | null = null;
    if (currentUser.role !== 'super_admin' && currentUser.shopId) {
      const shop = await this.shopsService.findById(currentUser.shopId);
      if (!shop) {
        throw new UnauthorizedException('Shop not found');
      }
      if (shop.status === 'suspended') {
        throw new UnauthorizedException('Shop is suspended');
      }
      shopInfo = {
        id: shop._id,
        name: shop.name,
        status: shop.status,
      };
    }

    // Generate new token with same claims but fresh expiry
    const tokenPayload: any = {
      sub: currentUser.sub,
      email: currentUser.email,
      name: currentUser.name,
      role: currentUser.role,
    };

    if (currentUser.shopId) tokenPayload.shopId = currentUser.shopId;
    if (currentUser.branchId) tokenPayload.branchId = currentUser.branchId;
    if (currentUser.cashierId) tokenPayload.cashierId = currentUser.cashierId;

    const newToken = this.jwtService.sign(tokenPayload);

    this.logger.log(`Token refreshed for user ${currentUser.email} (device: ${deviceId || 'unknown'})`);

    return {
      token: newToken,
      user: {
        id: currentUser.sub,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role,
        shopId: currentUser.shopId,
        branchId: currentUser.branchId,
        cashierId: currentUser.cashierId,
      },
      shop: shopInfo,
    };
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

    // Generate JWT token - include user's registered name for receipts
    const token = this.jwtService.sign({
      sub: (user as any)._id,
      email: user.email,
      name: (user as any).name || user.email,
      cashierId: (user as any).cashierId,
      role: user.role,
      shopId: (user as any).shopId,
      branchId: (user as any).branchId,
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
        (user as any).branchId?.toString(), // Include branchId for branch-specific activity tracking
      );
    }

    return {
      isNewUser: false,
      googleProfile: null,
      user: {
        id: (user as any)._id,
        email: user.email,
        name: (user as any).name,
        cashierId: (user as any).cashierId,
        role: user.role,
        shopId: (user as any).shopId,
        branchId: (user as any).branchId,
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

  /**
   * Google login with secure token pair
   */
  async googleLoginWithTokens(googleUser: { 
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
        tokens: null,
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

    // Generate secure token pair
    let tokens: any = null;
    if (this.tokenService) {
      tokens = await this.tokenService.generateTokenPair(
        {
          sub: (user as any)._id.toString(),
          email: user.email,
          name: (user as any).name || user.email,
          role: user.role,
          shopId: (user as any).shopId.toString(),
          branchId: (user as any).branchId?.toString(),
          cashierId: (user as any).cashierId,
        },
        {
          userAgent,
          ipAddress,
          clientType: 'web',
        },
      );
    }

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
        (user as any).branchId?.toString(), // Include branchId for branch-specific activity tracking
      );
    }

    return {
      isNewUser: false,
      googleProfile: null,
      user: {
        id: (user as any)._id,
        email: user.email,
        name: (user as any).name,
        cashierId: (user as any).cashierId,
        role: user.role,
        shopId: (user as any).shopId,
        branchId: (user as any).branchId,
        avatarUrl: (user as any).avatarUrl,
      },
      shop: {
        id: shop._id,
        name: shop.name,
        status: shop.status,
      },
      tokens,
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

  /**
   * Link Google account to existing cashier using PIN verification
   * 
   * Security flow:
   * 1. Cashier must have been created by admin (has PIN)
   * 2. Cashier provides Google profile + PIN + shopId
   * 3. We validate PIN against the shop's cashiers
   * 4. If valid, link Google account to cashier
   * 5. Future logins use Google OAuth directly
   */
  async linkGoogleToCashier(
    googleProfile: { googleId: string; email: string; name: string; avatarUrl?: string },
    pin: string,
    shopId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Validate inputs
    if (!pin) {
      throw new UnauthorizedException('PIN is required');
    }
    if (!shopId) {
      throw new UnauthorizedException('Shop selection is required');
    }

    // Check if Google account is already linked to another user
    const existingGoogleUser = await this.usersService.findByGoogleId(googleProfile.googleId);
    if (existingGoogleUser) {
      // Already linked - just log them in
      return this.googleLoginWithTokens(googleProfile, ipAddress, userAgent);
    }

    // Find cashier by PIN in the specified shop
    const cashier = await this.usersService.findByPin(pin, shopId);
    if (!cashier) {
      throw new UnauthorizedException('Invalid PIN. Please check your PIN and try again.');
    }

    // Verify cashier is active
    if (cashier.status !== 'active') {
      throw new UnauthorizedException('Account is disabled. Contact your admin.');
    }

    // Verify cashier role
    if (cashier.role !== 'cashier') {
      throw new UnauthorizedException('This PIN is not for a cashier account. Use email login instead.');
    }

    // Check if cashier already has a Google account linked
    if ((cashier as any).googleId) {
      throw new BadRequestException(
        'This cashier account already has a Google account linked. Use that Google account to login.',
      );
    }

    // Get shop info
    const shop = await this.shopsService.findById(shopId);
    if (!shop) {
      throw new UnauthorizedException('Shop not found');
    }

    if (shop.status === 'suspended') {
      throw new UnauthorizedException('Shop is suspended');
    }

    // Link Google account to cashier
    await this.usersService.linkGoogleAccount(
      (cashier as any)._id.toString(),
      googleProfile.googleId,
      googleProfile.avatarUrl,
    );

    // Update cashier email if different (optional - use Google email)
    // Note: We keep the original email to avoid conflicts
    // The googleId is the primary identifier for Google login

    // Generate secure token pair
    let tokens: any = null;
    if (this.tokenService) {
      tokens = await this.tokenService.generateTokenPair(
        {
          sub: (cashier as any)._id.toString(),
          email: cashier.email,
          name: (cashier as any).name || cashier.email,
          role: cashier.role,
          shopId: (cashier as any).shopId.toString(),
          branchId: (cashier as any).branchId?.toString(),
          cashierId: (cashier as any).cashierId,
        },
        {
          userAgent,
          ipAddress,
          clientType: 'pos',
        },
      );
    }

    // Update last login
    await this.usersService.updateLastLogin((cashier as any)._id.toString());

    // Log activity
    if (this.activityService) {
      await this.activityService.logActivity(
        shopId,
        (cashier as any)._id.toString(),
        (cashier as any).name || cashier.email,
        cashier.role,
        'google_account_linked',
        { 
          googleEmail: googleProfile.email,
          method: 'PIN verification',
        },
        ipAddress,
        userAgent,
        (cashier as any).branchId?.toString(), // Include branchId for branch-specific activity tracking
      );
    }

    this.logger.log(`Google account linked for cashier ${(cashier as any).cashierId} in shop ${shopId}`);

    return {
      user: {
        id: (cashier as any)._id,
        email: cashier.email,
        name: (cashier as any).name,
        cashierId: (cashier as any).cashierId,
        role: cashier.role,
        shopId: (cashier as any).shopId,
        branchId: (cashier as any).branchId,
        avatarUrl: googleProfile.avatarUrl,
      },
      shop: {
        id: shop._id,
        name: shop.name,
        status: shop.status,
      },
      tokens,
    };
  }

  // ==================== Password Reset ====================

  /**
   * Request password reset - generates token and sends email
   */
  async requestPasswordReset(email: string, ipAddress?: string, userAgent?: string) {
    // Find user by email
    const user = await this.usersService.findByEmail(email);
    
    // Always return success to prevent email enumeration attacks
    if (!user) {
      this.logger.warn(`Password reset requested for non-existent email: ${email}`);
      return { 
        message: 'If an account exists with this email, a password reset link has been sent.',
      };
    }

    if (!this.tokenService) {
      throw new BadRequestException('Token service not available');
    }

    // Generate password reset token
    const resetToken = await this.tokenService.generatePasswordResetToken(
      (user as any)._id.toString(),
      ipAddress,
      userAgent,
    );

    // TODO: Send email with reset link
    // For now, log the token (in production, this would be sent via email)
    const frontendUrl = process.env.FRONTEND_URL || 'https://smartduka-eta.vercel.app';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    this.logger.log(`Password reset link for ${email}: ${resetLink}`);

    // In production, send email here:
    // await this.emailService.sendPasswordResetEmail(user.email, resetLink);

    return { 
      message: 'If an account exists with this email, a password reset link has been sent.',
      // Only include in development for testing
      ...(process.env.NODE_ENV === 'development' && { resetLink }),
    };
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string) {
    if (!this.tokenService) {
      throw new BadRequestException('Token service not available');
    }

    // Validate password strength
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // Verify token and get user ID
    const userId = await this.tokenService.verifyPasswordResetToken(token);

    // Hash new password
    const hashedPassword = await bcryptjs.hash(newPassword, 10);

    // Update user password
    await this.usersService.updatePassword(userId, hashedPassword);

    // Revoke all existing tokens for security
    await this.tokenService.revokeAllUserTokens(userId, 'Password reset');

    this.logger.log(`Password reset successful for user ${userId}`);

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }

  // ==================== Secure Token Methods ====================

  /**
   * Register shop with secure token pair (access + refresh + CSRF)
   */
  async registerShopWithTokens(dto: RegisterShopDto) {
    // Use existing registerShop logic
    const result = await this.registerShop(dto);
    
    if (!this.tokenService) {
      return { ...result, tokens: null };
    }

    // Generate secure token pair
    const tokens = await this.tokenService.generateTokenPair(
      {
        sub: result.user.id.toString(),
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        shopId: result.shop.id.toString(),
      },
      { clientType: 'web' },
    );

    return {
      shop: result.shop,
      user: result.user,
      tokens,
    };
  }

  /**
   * Login with secure token pair
   */
  async loginWithTokens(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    // Check if this is a super admin login
    if (dto.role === 'super_admin') {
      return this.loginSuperAdminWithTokens(dto, ipAddress, userAgent);
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

    // Generate secure token pair
    let tokens: any = null;
    if (this.tokenService) {
      tokens = await this.tokenService.generateTokenPair(
        {
          sub: (user as any)._id.toString(),
          email: user.email,
          name: (user as any).name || user.email,
          role: user.role,
          shopId: (user as any).shopId.toString(),
          branchId: (user as any).branchId?.toString(),
          cashierId: (user as any).cashierId,
        },
        {
          userAgent,
          ipAddress,
          clientType: 'web',
        },
      );
    }

    // Log login activity
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
        (user as any).branchId?.toString(), // Include branchId for branch-specific activity tracking
      );
    }

    return {
      user: {
        id: (user as any)._id,
        email: user.email,
        name: (user as any).name,
        cashierId: (user as any).cashierId,
        role: user.role,
        shopId: (user as any).shopId,
        branchId: (user as any).branchId,
      },
      shop: {
        id: shop._id,
        name: shop.name,
        status: shop.status,
      },
      tokens,
    };
  }

  /**
   * Super admin login with tokens
   */
  private async loginSuperAdminWithTokens(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    if (!this.superAdminModel) {
      throw new UnauthorizedException('Super admin authentication not available');
    }

    const superAdmin = await this.superAdminModel.findOne({ 
      email: dto.email.toLowerCase().trim() 
    });
    
    if (!superAdmin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcryptjs.compare(dto.password, superAdmin.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (superAdmin.status !== 'active') {
      throw new UnauthorizedException('Account is disabled');
    }

    let tokens: any = null;
    if (this.tokenService) {
      tokens = await this.tokenService.generateTokenPair(
        {
          sub: superAdmin._id.toString(),
          email: superAdmin.email,
          role: 'super_admin',
        },
        {
          userAgent,
          ipAddress,
          clientType: 'web',
        },
      );
    }

    return {
      user: {
        id: superAdmin._id,
        email: superAdmin.email,
        role: 'super_admin',
      },
      shop: null,
      tokens,
    };
  }

  /**
   * Login with PIN and return secure tokens
   */
  async loginWithPinAndTokens(pin: string, shopId: string, ipAddress?: string, userAgent?: string) {
    const user = await this.usersService.findByPin(pin, shopId);
    if (!user) {
      throw new UnauthorizedException('Invalid PIN');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is disabled');
    }

    const shop = await this.shopsService.findById((user as any).shopId.toString());
    if (!shop) {
      throw new UnauthorizedException('Shop not found');
    }

    if (shop.status === 'suspended') {
      throw new UnauthorizedException('Shop is suspended');
    }

    let tokens: any = null;
    if (this.tokenService) {
      tokens = await this.tokenService.generateTokenPair(
        {
          sub: (user as any)._id.toString(),
          email: user.email,
          name: (user as any).name || user.email,
          role: user.role,
          shopId: (user as any).shopId.toString(),
          branchId: (user as any).branchId?.toString(),
          cashierId: (user as any).cashierId,
        },
        {
          userAgent,
          ipAddress,
          clientType: 'pos',
        },
      );
    }

    await this.usersService.updateLastLogin((user as any)._id.toString());

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
        (user as any).branchId?.toString(), // Include branchId for branch-specific activity tracking
      );
    }

    return {
      user: {
        id: (user as any)._id,
        email: user.email,
        name: (user as any).name,
        cashierId: (user as any).cashierId,
        role: user.role,
        shopId: (user as any).shopId,
        branchId: (user as any).branchId,
      },
      shop: {
        id: shop._id,
        name: shop.name,
        status: shop.status,
      },
      tokens,
    };
  }

  /**
   * Refresh token with rotation - uses refresh token to issue new token pair
   * This is the secure way to refresh - old refresh token is invalidated
   */
  async refreshTokenWithRotation(
    refreshToken: string,
    deviceInfo?: {
      deviceId?: string;
      deviceFingerprint?: string;
      ipAddress?: string;
    },
  ) {
    if (!this.tokenService) {
      throw new BadRequestException('Token service not available');
    }

    // This will validate the refresh token and rotate it
    const partialTokens = await this.tokenService.refreshAccessToken(refreshToken, deviceInfo);

    // Get session to find user info
    const session = await this.tokenService.isSessionActive(partialTokens.sessionId)
      ? await this.getUserFromSession(partialTokens.sessionId)
      : null;

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    // Generate new access token with user payload
    const accessToken = this.jwtService.sign({
      sub: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
      shopId: session.shopId,
      branchId: session.branchId,
      cashierId: session.cashierId,
      sessionId: partialTokens.sessionId,
      jti: require('crypto').randomUUID(),
    });

    // Get shop info if applicable
    let shopInfo: any = null;
    if (session.shopId) {
      const shop = await this.shopsService.findById(session.shopId);
      if (shop) {
        shopInfo = {
          id: shop._id,
          name: shop.name,
          status: shop.status,
        };
      }
    }

    return {
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
        shopId: session.shopId,
        branchId: session.branchId,
        cashierId: session.cashierId,
      },
      shop: shopInfo,
      tokens: {
        accessToken,
        refreshToken: partialTokens.refreshToken,
        csrfToken: partialTokens.csrfToken,
        expiresIn: partialTokens.expiresIn,
        refreshExpiresIn: partialTokens.refreshExpiresIn,
        sessionId: partialTokens.sessionId,
      },
    };
  }

  /**
   * Helper to get user info from session
   */
  private async getUserFromSession(sessionId: string): Promise<{
    userId: string;
    email: string;
    name?: string;
    role: string;
    shopId?: string;
    branchId?: string;
    cashierId?: string;
  } | null> {
    try {
      // Get session details from token service
      const session = await this.tokenService?.getSessionById(sessionId);
      if (!session) {
        this.logger.warn(`Session not found: ${sessionId}`);
        return null;
      }

      const userId = session.userId.toString();

      // First try to find in regular users collection
      const user = await this.usersService.findById(userId);
      if (user) {
        const userDoc = user as any;
        return {
          userId: userDoc._id?.toString() || userDoc.id,
          email: user.email,
          name: user.name,
          role: user.role,
          shopId: session.shopId?.toString(),
          branchId: (user as any).branchId?.toString(),
          cashierId: (user as any).cashierId?.toString(),
        };
      }

      // If not found in users, check super admin collection
      if (this.superAdminModel) {
        const superAdmin = await this.superAdminModel.findById(userId);
        if (superAdmin) {
          return {
            userId: superAdmin._id.toString(),
            email: superAdmin.email,
            name: superAdmin.name,
            role: 'super_admin',
            shopId: undefined,
            branchId: undefined,
            cashierId: undefined,
          };
        }
      }

      this.logger.warn(`User not found for session: ${sessionId} (userId: ${userId})`);
      return null;
    } catch (err) {
      this.logger.error(`Failed to get user from session: ${err}`);
      return null;
    }
  }
}
