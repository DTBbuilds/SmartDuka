import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateCashierDto } from './dto/create-cashier.dto';
import { ChangePinDto } from './dto/update-pin.dto';
import { UserDocument } from './schemas/user.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  async create(@Body() dto: CreateUserDto, @CurrentUser() user: any) {
    // Ensure user is creating cashier for their own shop
    if (dto.shopId !== user.shopId) {
      throw new Error('Unauthorized');
    }
    const createdUser = await this.usersService.create(dto);
    const { passwordHash, ...safe } = (createdUser as any).toObject();
    return safe;
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) return null;
    const { passwordHash, ...safe } = (user as any).toObject();
    return safe;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return req.user;
  }

  @Get()
  async findByEmail(@Query('email') email?: string) {
    if (!email) return [];
    const user = await this.usersService.findByEmail(email);
    if (!user) return [];
    const { passwordHash, ...safe } = (user as any).toObject();
    return [safe];
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('shop/:shopId/cashiers')
  async getCashiersByShop(@Param('shopId') shopId: string, @CurrentUser() user: any) {
    // Verify user belongs to this shop
    if (user.shopId !== shopId) {
      throw new Error('Unauthorized');
    }
    const cashiers = await this.usersService.findCashiersByShop(shopId);
    return cashiers.map((c: any) => {
      const { passwordHash, pinHash, ...safe } = c.toObject();
      return safe;
    });
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
      throw new Error('Unauthorized');
    }
    const updated = await this.usersService.updateStatus(id, dto.status);
    if (!updated) return null;
    const { passwordHash, ...safe } = (updated as any).toObject();
    return safe;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  async deleteUser(@Param('id') id: string, @CurrentUser() user: any) {
    // Verify user belongs to same shop
    const targetUser = await this.usersService.findById(id);
    if (!targetUser || (targetUser as any).shopId.toString() !== user.shopId) {
      throw new Error('Unauthorized');
    }
    // Prevent deleting admin users
    if ((targetUser as any).role === 'admin') {
      throw new Error('Cannot delete admin users');
    }
    return this.usersService.deleteUser(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('cashier')
  async createCashier(
    @Body() dto: CreateCashierDto,
    @CurrentUser() user: any,
  ) {
    const { user: createdUser, pin } = await this.usersService.createCashierWithPin(
      user.shopId,
      dto,
    );

    return {
      user: {
        id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        phone: createdUser.phone,
        cashierId: createdUser.cashierId,
        role: createdUser.role,
        status: createdUser.status,
      },
      pin,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/reset-pin')
  async resetPin(
    @Param('id') userId: string,
    @CurrentUser() user: any,
  ) {
    const newPin = await this.usersService.resetPin(userId, user.shopId);

    return {
      message: 'PIN reset successfully',
      pin: newPin,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/change-pin')
  async changePin(
    @Body() dto: ChangePinDto,
    @CurrentUser() user: any,
  ) {
    if (dto.newPin !== dto.confirmPin) {
      throw new BadRequestException('New PINs do not match');
    }

    await this.usersService.changePin(
      user.sub,
      dto.currentPin,
      dto.newPin,
    );

    return { message: 'PIN changed successfully' };
  }
}
