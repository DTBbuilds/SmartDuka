import { Body, Controller, Get, Post, Put, UseGuards, Param, ForbiddenException } from '@nestjs/common';
import type { CreateShopDto, UpdateShopDto } from './shops.service';
import { ShopsService } from './shops.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  // Public endpoint - get all shops for login page
  @Get()
  async getAllShops() {
    return this.shopsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: any, @CurrentUser() user: Record<string, any>) {
    return this.shopsService.create(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-shop')
  async getMyShop(@CurrentUser() user: Record<string, any>) {
    // Use shopId from JWT payload - works for all users (admin, cashier, etc.)
    if (user.shopId) {
      return this.shopsService.findById(user.shopId);
    }
    // Fallback to findByOwner for legacy tokens or shop owners
    return this.shopsService.findByOwner(user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('my-shop')
  async updateMyShop(@Body() dto: any, @CurrentUser() user: Record<string, any>) {
    // Use shopId from JWT payload
    if (!user.shopId) {
      throw new ForbiddenException('No shop associated with this user');
    }
    return this.shopsService.update(user.shopId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getShop(@CurrentUser() user: Record<string, any>) {
    return this.shopsService.findById(user.shopId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateShop(@Body() dto: any, @CurrentUser() user: Record<string, any>) {
    return this.shopsService.update(user.shopId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/complete-onboarding')
  async completeOnboarding(@CurrentUser() user: Record<string, any>) {
    return this.shopsService.completeOnboarding(user.shopId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/language')
  async updateLanguage(
    @Body() dto: { language: 'en' | 'sw' },
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.shopsService.updateLanguage(user.shopId, dto.language);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/stats')
  async getStats(@Param('id') id: string, @CurrentUser() user: Record<string, any>) {
    // Verify user belongs to this shop
    if (user.shopId !== id) {
      throw new ForbiddenException('You are not allowed to access stats for this shop');
    }
    return this.shopsService.getStats(id);
  }

  // Admin only - verify shops
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('pending')
  async getPendingShops() {
    return this.shopsService.getPendingShops();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id/verify')
  async verifyShop(
    @Param('id') id: string,
    @Body() body: { status: string; notes?: string },
  ) {
    return this.shopsService.updateStatus(id, body.status as any, body.notes);
  }
}
