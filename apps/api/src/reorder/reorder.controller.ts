import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ReorderService } from './reorder.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * PHASE 3: REORDER AUTOMATION CONTROLLER
 * 
 * Endpoints for managing automatic reorder settings and checking stock levels
 */
@Controller('reorder')
export class ReorderController {
  constructor(private readonly reorderService: ReorderService) {}

  /**
   * Check products below reorder point and auto-create POs
   * 
   * POST /reorder/check-and-create
   * Admin only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('check-and-create')
  async checkAndCreatePOs(@CurrentUser() user: Record<string, any>) {
    return this.reorderService.checkAndCreatePOs(user.shopId, user.sub);
  }

  /**
   * Get all products below reorder point
   * 
   * GET /reorder/low-stock
   * Admin only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('low-stock')
  async getLowStockProducts(@CurrentUser() user: Record<string, any>) {
    return this.reorderService.getLowStockProducts(user.shopId);
  }

  /**
   * Get reorder statistics for shop
   * 
   * GET /reorder/stats
   * Admin only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('stats')
  async getReorderStats(@CurrentUser() user: Record<string, any>) {
    return this.reorderService.getReorderStats(user.shopId);
  }

  /**
   * Get reorder status for a specific product
   * 
   * GET /reorder/status/:productId
   * Admin only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('status/:productId')
  async getReorderStatus(
    @Param('productId') productId: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.reorderService.getReorderStatus(user.shopId, productId);
  }

  /**
   * Update reorder settings for a product
   * 
   * PUT /reorder/settings/:productId
   * Admin only
   * 
   * Body:
   * {
   *   reorderPoint: number,
   *   reorderQuantity: number,
   *   preferredSupplierId: string,
   *   leadTimeDays: number
   * }
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('settings/:productId')
  async updateReorderSettings(
    @Param('productId') productId: string,
    @Body() settings: any,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.reorderService.updateReorderSettings(user.shopId, productId, settings);
  }
}
