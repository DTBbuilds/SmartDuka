import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ShopSettingsService } from './shop-settings.service';
import { UpdateShopSettingsDto } from './dto';

@Controller('shop-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShopSettingsController {
  constructor(private service: ShopSettingsService) {}

  /**
   * Tenant authority comes from the JWT, never from the URL. The :shopId
   * route segment is kept for client compatibility but must equal the
   * caller's authenticated shop; mismatches are rejected and the JWT
   * identity is what reaches the service layer.
   */
  private assertTenantShop(user: any, shopId: string): string {
    if (!user?.shopId) {
      throw new ForbiddenException('No shop associated with this user');
    }
    if (shopId !== user.shopId) {
      throw new ForbiddenException("Cannot access another shop's settings");
    }
    return user.shopId;
  }

  @Get(':shopId')
  async getSettings(@Param('shopId') shopId: string, @CurrentUser() user: any) {
    if (!shopId) {
      throw new BadRequestException('Shop ID is required');
    }
    return this.service.getByShopId(this.assertTenantShop(user, shopId));
  }

  @Roles('admin')
  @Put(':shopId')
  async updateSettings(
    @Param('shopId') shopId: string,
    @Body() dto: UpdateShopSettingsDto,
    @CurrentUser() user: any,
  ) {
    if (!shopId) {
      throw new BadRequestException('Shop ID is required');
    }
    return this.service.update(this.assertTenantShop(user, shopId), dto);
  }

  @Roles('admin')
  @Post(':shopId/tax-exempt-products/:productId')
  async addTaxExemptProduct(
    @Param('shopId') shopId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: any,
  ) {
    if (!shopId || !productId) {
      throw new BadRequestException('Shop ID and Product ID are required');
    }
    return this.service.addTaxExemptProduct(
      this.assertTenantShop(user, shopId),
      productId,
    );
  }

  @Roles('admin')
  @Delete(':shopId/tax-exempt-products/:productId')
  async removeTaxExemptProduct(
    @Param('shopId') shopId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: any,
  ) {
    if (!shopId || !productId) {
      throw new BadRequestException('Shop ID and Product ID are required');
    }
    return this.service.removeTaxExemptProduct(
      this.assertTenantShop(user, shopId),
      productId,
    );
  }

  @Roles('admin')
  @Post(':shopId/category-tax-rates/:categoryId')
  async setCategoryTaxRate(
    @Param('shopId') shopId: string,
    @Param('categoryId') categoryId: string,
    @Body() body: { rate: number; exempt: boolean },
    @CurrentUser() user: any,
  ) {
    if (!shopId || !categoryId) {
      throw new BadRequestException('Shop ID and Category ID are required');
    }
    if (body.rate < 0 || body.rate > 100) {
      throw new BadRequestException('Tax rate must be between 0 and 100');
    }
    return this.service.setCategoryTaxRate(
      this.assertTenantShop(user, shopId),
      categoryId,
      body.rate,
      body.exempt,
    );
  }

  @Roles('admin')
  @Delete(':shopId/category-tax-rates/:categoryId')
  async removeCategoryTaxRate(
    @Param('shopId') shopId: string,
    @Param('categoryId') categoryId: string,
    @CurrentUser() user: any,
  ) {
    if (!shopId || !categoryId) {
      throw new BadRequestException('Shop ID and Category ID are required');
    }
    return this.service.removeCategoryTaxRate(
      this.assertTenantShop(user, shopId),
      categoryId,
    );
  }

  // Receipt Settings Endpoints
  @Get(':shopId/receipt')
  async getReceiptSettings(
    @Param('shopId') shopId: string,
    @CurrentUser() user: any,
  ) {
    if (!shopId) {
      throw new BadRequestException('Shop ID is required');
    }
    return this.service.getReceiptSettings(this.assertTenantShop(user, shopId));
  }

  @Roles('admin')
  @Put(':shopId/receipt')
  async updateReceiptSettings(
    @Param('shopId') shopId: string,
    @Body() receiptSettings: any,
    @CurrentUser() user: any,
  ) {
    if (!shopId) {
      throw new BadRequestException('Shop ID is required');
    }
    return this.service.updateReceiptSettings(
      this.assertTenantShop(user, shopId),
      receiptSettings,
    );
  }

  @Roles('admin')
  @Post(':shopId/receipt/sync')
  async syncReceiptFromShop(
    @Param('shopId') shopId: string,
    @CurrentUser() user: any,
  ) {
    if (!shopId) {
      throw new BadRequestException('Shop ID is required');
    }
    const result = await this.service.syncReceiptSettingsFromShop(
      this.assertTenantShop(user, shopId),
    );
    if (!result) {
      throw new BadRequestException('Shop not found');
    }
    return result;
  }

  // =========================================================================
  // Business Type Configuration Endpoints
  // =========================================================================

  /**
   * Get all available business types for registration/dropdown.
   * Public endpoint - no auth required for registration forms.
   */
  @Get('business-types/all')
  getAvailableBusinessTypes() {
    return this.service.getAvailableBusinessTypes();
  }

  /**
   * Get business types grouped by category.
   */
  @Get('business-types/grouped')
  getBusinessTypesGrouped() {
    return this.service.getBusinessTypesGrouped();
  }

  /**
   * Get full profile details for a specific business type.
   */
  @Get('business-types/profile/:typeId')
  getBusinessTypeProfile(@Param('typeId') typeId: string) {
    return this.service.getBusinessTypeProfile(typeId);
  }

  /**
   * Get the active business type configuration for a shop.
   */
  @Get(':shopId/business-type-config')
  async getBusinessTypeConfig(
    @Param('shopId') shopId: string,
    @CurrentUser() user: any,
  ) {
    if (!shopId) {
      throw new BadRequestException('Shop ID is required');
    }
    return this.service.getBusinessTypeConfig(
      this.assertTenantShop(user, shopId),
    );
  }

  /**
   * Apply/change a business type profile to a shop.
   */
  @Roles('admin')
  @Post(':shopId/business-type-config')
  async applyBusinessTypeConfig(
    @Param('shopId') shopId: string,
    @Body() body: { businessType: string; overrides?: Record<string, any> },
    @CurrentUser() user: any,
  ) {
    if (!shopId) {
      throw new BadRequestException('Shop ID is required');
    }
    if (!body.businessType) {
      throw new BadRequestException('Business type is required');
    }
    return this.service.applyBusinessTypeConfig(
      this.assertTenantShop(user, shopId),
      body.businessType,
      body.overrides,
    );
  }

  /**
   * Toggle a specific feature for a shop.
   */
  @Roles('admin')
  @Put(':shopId/business-type-config/features/:featureName')
  async updateBusinessTypeFeature(
    @Param('shopId') shopId: string,
    @Param('featureName') featureName: string,
    @Body() body: { enabled: boolean },
    @CurrentUser() user: any,
  ) {
    if (!shopId || !featureName) {
      throw new BadRequestException('Shop ID and feature name are required');
    }
    return this.service.updateBusinessTypeFeature(
      this.assertTenantShop(user, shopId),
      featureName,
      body.enabled,
    );
  }
}
