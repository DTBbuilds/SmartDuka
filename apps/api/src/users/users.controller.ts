import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Optional,
  Inject,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateCashierDto } from './dto/create-cashier.dto';
import { ChangePinDto } from './dto/update-pin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OtpService } from '../auth/services/otp.service';
import { TokenService } from '../auth/token.service';

/** CASHIER-P0 F-04: staff roles that may read another user's record within their shop. */
const STAFF_READER_ROLES = ['admin', 'branch_admin', 'branch_manager'];

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    @Optional() private readonly otpService: OtpService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  async create(@Body() dto: CreateUserDto, @CurrentUser() user: any) {
    // Ensure user is creating cashier for their own shop
    if (dto.shopId !== user.shopId) {
      throw new ForbiddenException(
        'You are not allowed to create users for this shop',
      );
    }
    const createdUser = await this.usersService.create(dto);
    const { passwordHash, ...safe } = (createdUser as any).toObject();
    return safe;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return req.user;
  }

  /**
   * Get current user's preferences
   * GET /users/preferences
   * Must be defined BEFORE :id route to avoid conflict
   */
  @UseGuards(JwtAuthGuard)
  @Get('preferences')
  async getPreferences(@CurrentUser() user: any) {
    const fullUser = await this.usersService.findById(user.sub);
    if (!fullUser) {
      return {
        theme: 'system',
        language: 'en',
        currency: 'KES',
        dateFormat: 'DD/MM/YYYY',
        soundEnabled: true,
        receiptPrinterEnabled: false,
      };
    }
    return (
      (fullUser as any).preferences || {
        theme: 'system',
        language: 'en',
        currency: 'KES',
        dateFormat: 'DD/MM/YYYY',
        soundEnabled: true,
        receiptPrinterEnabled: false,
      }
    );
  }

  /**
   * Update current user's preferences
   * PATCH /users/preferences
   */
  @UseGuards(JwtAuthGuard)
  @Patch('preferences')
  async updatePreferences(
    @CurrentUser() user: any,
    @Body()
    dto: {
      theme?: 'light' | 'dark' | 'system';
      language?: string;
      currency?: string;
      dateFormat?: string;
      soundEnabled?: boolean;
      receiptPrinterEnabled?: boolean;
    },
  ) {
    const updated = await this.usersService.updatePreferences(user.sub, dto);
    return updated?.preferences || dto;
  }

  /**
   * CASHIER-P0 F-04: user records are no longer publicly readable.
   * - A user may always read their OWN record (self-read, any role).
   * - Staff roles (admin/branch_admin/branch_manager) may read users within
   *   their own shop only.
   * - passwordHash AND pinHash are stripped from every response (the PIN
   *   hash is offline-crackable given the 10^4 keyspace and must never leave
   *   the server).
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  async findById(@Param('id') id: string, @CurrentUser() user: any) {
    const isSelf = user?.sub === id;
    const isStaffReader = STAFF_READER_ROLES.includes(user?.role);

    if (!isSelf && !isStaffReader) {
      throw new ForbiddenException(
        'You are not allowed to view this user record',
      );
    }

    const found = await this.usersService.findById(id);
    if (!found) return null;

    if (!isSelf) {
      // Tenant boundary for staff readers: same shop only.
      const targetShopId = (found as any).shopId?.toString();
      if (targetShopId !== user.shopId) {
        throw new ForbiddenException(
          'You are not allowed to view users from another shop',
        );
      }
    }

    const { passwordHash, pinHash, ...safe } = (found as any).toObject
      ? (found as any).toObject()
      : found;
    return safe;
  }

  /**
   * Get users with optional filters (role, branchId, status)
   * GET /users?role=cashier&branchId=xxx&status=active
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin', 'branch_manager')
  @Get()
  async findUsers(
    @Query('email') email?: string,
    @Query('role') role?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @CurrentUser() user?: any,
  ) {
    // If only email query, return single user (backward compatibility)
    if (email && !role && !branchId) {
      const foundUser = await this.usersService.findByEmail(email);
      if (!foundUser) return [];
      const { passwordHash, ...safe } = (foundUser as any).toObject();
      return [safe];
    }

    // Get users with filters
    const users = await this.usersService.findUsersWithFilters(user.shopId, {
      role,
      branchId,
      status,
    });

    return users.map((u: any) => {
      const { passwordHash, pinHash, ...safe } = u.toObject ? u.toObject() : u;
      return safe;
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin', 'branch_manager')
  @Get('shop/:shopId/cashiers')
  async getCashiersByShop(
    @Param('shopId') shopId: string,
    @Query('branchId') branchId?: string,
    @CurrentUser() user?: any,
  ) {
    // Verify user belongs to this shop
    if (user.shopId !== shopId) {
      throw new ForbiddenException('You are not allowed to access this shop');
    }

    // Branch managers can only see cashiers in their branch
    let effectiveBranchId = branchId;
    if (user.role === 'branch_manager' && user.branchId) {
      effectiveBranchId = user.branchId;
    }

    const cashiers = await this.usersService.findCashiersByShop(
      shopId,
      effectiveBranchId,
    );
    return cashiers.map((c: any) => {
      const { passwordHash, pinHash, ...safe } = c.toObject ? c.toObject() : c;
      return safe;
    });
  }

  /**
   * Get cashiers by branch (for branch managers)
   * GET /users/branch/:branchId/cashiers
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin', 'branch_manager')
  @Get('branch/:branchId/cashiers')
  async getCashiersByBranch(
    @Param('branchId') branchId: string,
    @CurrentUser() user: any,
  ) {
    // Branch managers can only access their own branch
    if (user.role === 'branch_manager' && user.branchId !== branchId) {
      throw new ForbiddenException(
        'You can only access cashiers in your branch',
      );
    }

    const cashiers = await this.usersService.findCashiersByBranch(branchId);
    return cashiers.map((c: any) => {
      const { passwordHash, pinHash, ...safe } = c.toObject ? c.toObject() : c;
      return safe;
    });
  }

  /**
   * Get cashier details with branch info
   * GET /users/:id/details
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin', 'branch_manager')
  @Get(':id/details')
  async getCashierDetails(@Param('id') id: string, @CurrentUser() user: any) {
    const cashier = await this.usersService.getCashierDetails(user.shopId, id);
    const { passwordHash, pinHash, ...safe } = cashier.toObject
      ? cashier.toObject()
      : cashier;
    return safe;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    // Verify user belongs to same shop
    const targetUser = await this.usersService.findById(id);
    if (!targetUser || (targetUser as any).shopId.toString() !== user.shopId) {
      throw new ForbiddenException(
        'You are not allowed to update users from this shop',
      );
    }

    // Use updateCashier for comprehensive updates
    const updated = await this.usersService.updateCashier(user.shopId, id, {
      name: dto.name,
      phone: dto.phone,
      branchId: dto.branchId,
      permissions: dto.permissions,
    });

    if (!updated) return null;
    const { passwordHash, pinHash, ...safe } = (updated as any).toObject();
    return safe;
  }

  /**
   * Update user status (enable/disable)
   * PATCH /users/:id/status
   *
   * CASHIER-P0 F-05: disabling an account immediately terminates every
   * active session and revokes all refresh tokens for that user. The JWT
   * strategy validates session activity fail-closed, so session-bound
   * access tokens stop working on the next request.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/status')
  async updateUserStatus(
    @Param('id') id: string,
    @Body() dto: { status: 'active' | 'disabled' },
    @CurrentUser() user: any,
  ) {
    // Verify user belongs to same shop
    const targetUser = await this.usersService.findById(id);
    if (!targetUser || (targetUser as any).shopId.toString() !== user.shopId) {
      throw new ForbiddenException(
        'You are not allowed to update users from this shop',
      );
    }

    const updated = await this.usersService.updateStatus(id, dto.status);
    if (!updated) {
      throw new NotFoundException('User not found');
    }

    if (dto.status === 'disabled') {
      await this.tokenService.revokeAllUserTokens(
        id,
        `Account disabled by ${user.email ?? user.sub}`,
      );
    }

    const { passwordHash, pinHash, ...safe } = (updated as any).toObject();
    return safe;
  }

  /**
   * Update cashier permissions
   * PATCH /users/:id/permissions
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/permissions')
  async updateCashierPermissions(
    @Param('id') id: string,
    @Body()
    dto: {
      canVoid?: boolean;
      canRefund?: boolean;
      canDiscount?: boolean;
      maxDiscountAmount?: number;
      maxRefundAmount?: number;
      voidRequiresApproval?: boolean;
      refundRequiresApproval?: boolean;
      discountRequiresApproval?: boolean;
    },
    @CurrentUser() user: any,
  ) {
    const updated = await this.usersService.updateCashier(user.shopId, id, {
      permissions: dto,
    });

    if (!updated) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, pinHash, ...safe } = (updated as any).toObject();
    return safe;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  async deleteUser(@Param('id') id: string, @CurrentUser() user: any) {
    // The service handles multi-tenant safety and admin check
    const result = await this.usersService.deleteUser(user.shopId, id);

    // CASHIER-P0 F-05: a deleted user must lose all live sessions and
    // refresh tokens immediately — the JWT strategy's session check then
    // rejects their access tokens on the next request.
    await this.tokenService.revokeAllUserTokens(
      id,
      `Account deleted by ${user.email ?? user.sub}`,
    );

    return result;
  }

  /**
   * Create a new cashier
   * POST /users/cashier
   * Admin can create for any branch, branch_manager creates for their branch
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin', 'branch_manager')
  @Post('cashier')
  async createCashier(@Body() dto: CreateCashierDto, @CurrentUser() user: any) {
    // Branch managers must assign cashier to their branch
    let branchId = dto.branchId;
    if (user.role === 'branch_manager') {
      if (!user.branchId) {
        throw new ForbiddenException(
          'Branch manager must be assigned to a branch',
        );
      }
      branchId = user.branchId;
    }

    const { user: createdUser, pin } =
      await this.usersService.createCashierWithPin(user.shopId, {
        ...dto,
        branchId,
      });

    return {
      user: {
        id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        phone: createdUser.phone,
        cashierId: createdUser.cashierId,
        branchId: createdUser.branchId,
        role: createdUser.role,
        status: createdUser.status,
      },
      pin,
    };
  }

  /**
   * Assign cashier to a branch
   * PATCH /users/:id/assign-branch
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin')
  @Patch(':id/assign-branch')
  async assignCashierToBranch(
    @Param('id') userId: string,
    @Body() dto: { branchId: string },
    @CurrentUser() user: any,
  ) {
    if (!dto.branchId) {
      throw new BadRequestException('branchId is required');
    }

    const updated = await this.usersService.assignCashierToBranch(
      user.shopId,
      userId,
      dto.branchId,
    );

    if (!updated) {
      throw new NotFoundException('Cashier not found');
    }

    const { passwordHash, pinHash, ...safe } = (updated as any).toObject
      ? (updated as any).toObject()
      : updated;
    return safe;
  }

  /**
   * Unassign cashier from branch
   * PATCH /users/:id/unassign-branch
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin')
  @Patch(':id/unassign-branch')
  async unassignCashierFromBranch(
    @Param('id') userId: string,
    @CurrentUser() user: any,
  ) {
    const updated = await this.usersService.unassignCashierFromBranch(
      user.shopId,
      userId,
    );

    if (!updated) {
      throw new NotFoundException('Cashier not found');
    }

    const { passwordHash, pinHash, ...safe } = (updated as any).toObject
      ? (updated as any).toObject()
      : updated;
    return safe;
  }

  /**
   * Transfer cashier to another branch
   * PATCH /users/:id/transfer-branch
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin')
  @Patch(':id/transfer-branch')
  async transferCashierToBranch(
    @Param('id') userId: string,
    @Body() dto: { branchId: string },
    @CurrentUser() user: any,
  ) {
    if (!dto.branchId) {
      throw new BadRequestException('branchId is required');
    }

    const updated = await this.usersService.transferCashierToBranch(
      user.shopId,
      userId,
      dto.branchId,
    );

    if (!updated) {
      throw new NotFoundException('Cashier not found');
    }

    const { passwordHash, pinHash, ...safe } = (updated as any).toObject
      ? (updated as any).toObject()
      : updated;
    return safe;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin', 'branch_manager')
  @Post(':id/reset-pin')
  async resetPin(@Param('id') userId: string, @CurrentUser() user: any) {
    // Branch managers can only reset PIN for cashiers in their branch
    if (user.role === 'branch_manager') {
      const cashier = await this.usersService.findById(userId);
      if (!cashier || (cashier as any).branchId?.toString() !== user.branchId) {
        throw new ForbiddenException(
          'You can only reset PIN for cashiers in your branch',
        );
      }
    }

    const newPin = await this.usersService.resetPin(userId, user.shopId);

    return {
      message: 'PIN reset successfully',
      pin: newPin,
    };
  }

  /**
   * Update own profile (name, phone)
   * PATCH /users/me/profile
   */
  @UseGuards(JwtAuthGuard)
  @Patch('me/profile')
  async updateProfile(
    @Body() dto: { name?: string; phone?: string },
    @CurrentUser() user: any,
  ) {
    const updated = await this.usersService.updateProfile(user.sub, dto);
    if (!updated) {
      throw new NotFoundException('User not found');
    }
    const { passwordHash, pinHash, ...safe } = (updated as any).toObject();
    return safe;
  }

  /**
   * Send OTP for password change verification
   * POST /users/me/send-password-change-otp
   */
  @UseGuards(JwtAuthGuard)
  @Post('me/send-password-change-otp')
  async sendPasswordChangeOtp(@CurrentUser() user: any, @Req() req: any) {
    if (!this.otpService) {
      throw new BadRequestException('OTP service not available');
    }
    const fullUser = await this.usersService.findById(user.sub);
    const userName = (fullUser as any)?.name || user.email;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('user-agent');
    return this.otpService.sendPasswordChangeOtp(
      user.email,
      userName,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Change own password (requires OTP verification)
   * POST /users/me/change-password
   */
  @UseGuards(JwtAuthGuard)
  @Post('me/change-password')
  async changePassword(
    @Body()
    dto: { currentPassword: string; newPassword: string; otpCode?: string },
    @CurrentUser() user: any,
  ) {
    if (!dto.currentPassword || !dto.newPassword) {
      throw new BadRequestException(
        'Current password and new password are required',
      );
    }
    if (dto.newPassword.length < 6) {
      throw new BadRequestException(
        'New password must be at least 6 characters',
      );
    }

    // Verify OTP if service is available
    if (this.otpService && dto.otpCode) {
      const otpResult = await this.otpService.verifyOtp(
        user.email,
        dto.otpCode,
        'password_change',
      );
      if (!otpResult.valid) {
        throw new BadRequestException('Invalid verification code');
      }
    } else if (this.otpService && !dto.otpCode) {
      throw new BadRequestException('Verification code is required');
    }

    await this.usersService.changePassword(
      user.sub,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/change-pin')
  async changePin(@Body() dto: ChangePinDto, @CurrentUser() user: any) {
    if (dto.newPin !== dto.confirmPin) {
      throw new BadRequestException('New PINs do not match');
    }

    await this.usersService.changePin(user.sub, dto.currentPin, dto.newPin);

    return { message: 'PIN changed successfully' };
  }
}
