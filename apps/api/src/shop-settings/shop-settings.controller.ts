import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShopSettingsService } from './shop-settings.service';
import { UpdateShopSettingsDto } from './dto';

@Controller('shop-settings')
@UseGuards(JwtAuthGuard)
export class ShopSettingsController {
  constructor(private service: ShopSettingsService) {}

  @Get(':shopId')
  async getSettings(@Param('shopId') shopId: string) {
    if (!shopId) {
      throw new BadRequestException('Shop ID is required');
    }
    return this.service.getByShopId(shopId);
  }

  @Put(':shopId')
  async updateSettings(
    @Param('shopId') shopId: string,
    @Body() dto: UpdateShopSettingsDto,
  ) {
    if (!shopId) {
      throw new BadRequestException('Shop ID is required');
    }
    return this.service.update(shopId, dto);
  }

  @Post(':shopId/tax-exempt-products/:productId')
  async addTaxExemptProduct(
    @Param('shopId') shopId: string,
    @Param('productId') productId: string,
  ) {
    if (!shopId || !productId) {
      throw new BadRequestException('Shop ID and Product ID are required');
    }
    return this.service.addTaxExemptProduct(shopId, productId);
  }

  @Delete(':shopId/tax-exempt-products/:productId')
  async removeTaxExemptProduct(
    @Param('shopId') shopId: string,
    @Param('productId') productId: string,
  ) {
    if (!shopId || !productId) {
      throw new BadRequestException('Shop ID and Product ID are required');
    }
    return this.service.removeTaxExemptProduct(shopId, productId);
  }

  @Post(':shopId/category-tax-rates/:categoryId')
  async setCategoryTaxRate(
    @Param('shopId') shopId: string,
    @Param('categoryId') categoryId: string,
    @Body() body: { rate: number; exempt: boolean },
  ) {
    if (!shopId || !categoryId) {
      throw new BadRequestException('Shop ID and Category ID are required');
    }
    if (body.rate < 0 || body.rate > 100) {
      throw new BadRequestException('Tax rate must be between 0 and 100');
    }
    return this.service.setCategoryTaxRate(shopId, categoryId, body.rate, body.exempt);
  }

  @Delete(':shopId/category-tax-rates/:categoryId')
  async removeCategoryTaxRate(
    @Param('shopId') shopId: string,
    @Param('categoryId') categoryId: string,
  ) {
    if (!shopId || !categoryId) {
      throw new BadRequestException('Shop ID and Category ID are required');
    }
    return this.service.removeCategoryTaxRate(shopId, categoryId);
  }

  // Receipt Settings Endpoints
  @Get(':shopId/receipt')
  async getReceiptSettings(@Param('shopId') shopId: string) {
    if (!shopId) {
      throw new BadRequestException('Shop ID is required');
    }
    return this.service.getReceiptSettings(shopId);
  }

  @Put(':shopId/receipt')
  async updateReceiptSettings(
    @Param('shopId') shopId: string,
    @Body() receiptSettings: any,
  ) {
    if (!shopId) {
      throw new BadRequestException('Shop ID is required');
    }
    return this.service.updateReceiptSettings(shopId, receiptSettings);
  }

  @Post(':shopId/receipt/sync')
  async syncReceiptFromShop(@Param('shopId') shopId: string) {
    if (!shopId) {
      throw new BadRequestException('Shop ID is required');
    }
    const result = await this.service.syncReceiptSettingsFromShop(shopId);
    if (!result) {
      throw new BadRequestException('Shop not found');
    }
    return result;
  }
}
