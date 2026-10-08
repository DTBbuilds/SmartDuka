import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
  Param,
  ForbiddenException,
  Optional,
  Logger,
} from '@nestjs/common';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { ShopsService } from './shops.service';
import { ShopSettingsService } from '../shop-settings/shop-settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IsIn } from 'class-validator';

export class UpdateShopLanguageDto {
  @IsIn(['en', 'sw'])
  language: 'en' | 'sw';
}

@Controller('shops')
export class ShopsController {
  private readonly logger = new Logger(ShopsController.name);

  constructor(
    private readonly shopsService: ShopsService,
    @Optional() private readonly shopSettingsService?: ShopSettingsService,
  ) {}

  // Public endpoint - get all shops for login page.
  // Pinned minimal projection: id/shopId/name/status (+ demo fields for
  // pending shops) — see shops.service.findAll(). Must never expose owner
  // identity, contact details, KRA PIN, financials, or verification data.
  @Get()
  async getAllShops() {
    return this.shopsService.findAll();
  }

  // P0-11B: legacy direct shop creation. Registration flows through
  // /auth/register-shop(+ -google); this surface has no active frontend
  // caller and is restricted to super_admin with a real DTO so it can never
  // be used by ordinary users to create arbitrary shops.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post()
  async create(
    @Body() dto: CreateShopDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.shopsService.create(user.sub, dto);
  }

  // P0-11B1: the legacy GET /shops/pending and PUT /shops/:id/verify routes
  // were REMOVED — cross-shop verification/queue authority is held by exactly
  // ONE workflow: the canonical super-admin controller
  // (GET /super-admin/shops/pending, PUT /super-admin/shops/:id/verify|
  // reject|suspend|reactivate|flag|unflag) with state-transition validation,
  // verificationBy/verificationDate, audit logging and email notification.
  // ShopsController exposes no cross-shop administrative surface.

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

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getShop(@CurrentUser() user: Record<string, any>) {
    return this.shopsService.findById(user.shopId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('my-shop')
  async updateMyShop(
    @Body() dto: UpdateShopDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    // Use shopId from JWT payload
    if (!user.shopId) {
      throw new ForbiddenException('No shop associated with this user');
    }
    const result = await this.shopsService.update(user.shopId, dto);
    // Re-apply business type config if businessType changed
    if (dto.businessType && this.shopSettingsService && result) {
      try {
        await this.shopSettingsService.applyBusinessTypeConfig(
          (result as any).shopId,
          dto.businessType,
        );
        this.logger.log(
          `Business type config re-applied for shop ${result.name}: ${dto.businessType}`,
        );
      } catch (err) {
        this.logger.error('Failed to re-apply business type config:', err);
      }
    }
    return result;
  }

  // P0-11B: shop-admin only (was any authenticated user). The target shop is
  // always the caller's own shop (user.shopId) — the route id is never
  // trusted, so cross-tenant mutation is impossible by construction.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id')
  async updateShop(
    @Body() dto: UpdateShopDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    const result = await this.shopsService.update(user.shopId, dto);
    // Re-apply business type config if businessType changed
    if (dto.businessType && this.shopSettingsService && result) {
      try {
        await this.shopSettingsService.applyBusinessTypeConfig(
          (result as any).shopId,
          dto.businessType,
        );
        this.logger.log(
          `Business type config re-applied for shop ${result.name}: ${dto.businessType}`,
        );
      } catch (err) {
        this.logger.error('Failed to re-apply business type config:', err);
      }
    }
    return result;
  }

  // P0-11B1: complete-onboarding is a SHOP-WIDE configuration mutation — the
  // intended actor is the shop admin who just registered the shop. Cashiers
  // are denied; the target shop is always the JWT shop (route id never
  // trusted), so an admin can never complete onboarding for another shop.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/complete-onboarding')
  async completeOnboarding(@CurrentUser() user: Record<string, any>) {
    return this.shopsService.completeOnboarding(user.shopId);
  }

  // P0-11B1: language on the Shop document is SHOP-WIDE configuration (it
  // drives receipts/invoices/emails for the whole shop), not a per-user
  // preference — admin-only. Per-cashier language preference, if product
  // requirements later demand it, must be a separate user-level setting
  // (P1 design work), never a Shop-record write from a cashier session.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id/language')
  async updateLanguage(
    @Body() dto: UpdateShopLanguageDto,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.shopsService.updateLanguage(user.shopId, dto.language);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/stats')
  async getStats(
    @Param('id') id: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    // Verify user belongs to this shop
    if (user.shopId !== id) {
      throw new ForbiddenException(
        'You are not allowed to access stats for this shop',
      );
    }
    return this.shopsService.getStats(id);
  }
}
