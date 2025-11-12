import { Body, Controller, Delete, Get, Post, Put, Query, UseGuards, Response, Param } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @UseGuards(JwtAuthGuard)
  @Get('products')
  listProducts(@Query() query: QueryProductsDto, @CurrentUser() user: any) {
    return this.inventoryService.listProducts(user.shopId, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('products')
  createProduct(@Body() dto: CreateProductDto, @CurrentUser() user: any) {
    return this.inventoryService.createProduct(user.shopId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('categories')
  listCategories(@CurrentUser() user: any) {
    return this.inventoryService.listCategories(user.shopId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('categories/hierarchy')
  getCategoryHierarchy(@CurrentUser() user: any) {
    return this.inventoryService.getCategoryHierarchy(user.shopId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('categories/:id')
  getCategoryWithProducts(@Param('id') categoryId: string, @CurrentUser() user: any) {
    return this.inventoryService.getCategoryWithProducts(user.shopId, categoryId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto, @CurrentUser() user: any) {
    return this.inventoryService.createCategory(user.shopId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('categories/:id')
  updateCategory(@Param('id') categoryId: string, @Body() dto: UpdateCategoryDto, @CurrentUser() user: any) {
    return this.inventoryService.updateCategory(user.shopId, categoryId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('categories/:id')
  deleteCategory(@Param('id') categoryId: string, @CurrentUser() user: any) {
    return this.inventoryService.deleteCategory(user.shopId, categoryId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('stock/update')
  updateStock(@Body() dto: { productId: string; quantityChange: number }, @CurrentUser() user: any) {
    return this.inventoryService.updateStock(user.shopId, dto.productId, dto.quantityChange);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('stock/low-stock')
  getLowStockProducts(@CurrentUser() user: any) {
    return this.inventoryService.getLowStockProducts(user.shopId, 10);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('products/import')
  importProducts(@Body() dto: { products: CreateProductDto[] }, @CurrentUser() user: any) {
    return this.inventoryService.importProducts(user.shopId, dto.products);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('products/export')
  exportProducts(@Response() res: any, @Query('categoryId') categoryId: string, @CurrentUser() user: any) {
    return this.inventoryService.exportProducts(user.shopId, res, categoryId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('adjustments')
  createStockAdjustment(
    @Body() dto: { productId: string; quantityChange: number; reason: string; notes?: string },
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.createStockAdjustment(
      user.shopId,
      dto.productId,
      dto.quantityChange,
      dto.reason,
      user.sub,
      dto.notes,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('adjustments/history')
  getAdjustmentHistory(
    @Query('productId') productId: string,
    @Query('reason') reason: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.getStockAdjustmentHistory(user.shopId, {
      productId,
      reason,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('expiring-products')
  getExpiringProducts(
    @Query('days') days: string,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.getExpiringProducts(user.shopId, parseInt(days) || 30);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('reconciliation')
  createReconciliation(
    @Body() dto: { productId: string; physicalCount: number; notes?: string },
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.createStockReconciliation(
      user.shopId,
      dto.productId,
      dto.physicalCount,
      new Date(),
      user.sub,
      dto.notes,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('reconciliation/history')
  getReconciliationHistory(
    @Query('productId') productId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.getReconciliationHistory(user.shopId, {
      productId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('stats')
  getInventoryStats(@CurrentUser() user: any) {
    return this.inventoryService.getInventoryStats(user.shopId);
  }

  // PHASE 6: Branch-specific inventory endpoints

  /**
   * Get branch stock for product
   * GET /inventory/branch/:branchId/stock/:productId
   */
  @UseGuards(JwtAuthGuard)
  @Get('branch/:branchId/stock/:productId')
  async getBranchStock(
    @Param('branchId') branchId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: any,
  ) {
    const stock = await this.inventoryService.getBranchStock(user.shopId, productId, branchId);
    return { productId, branchId, stock };
  }

  /**
   * Get low stock products for branch
   * GET /inventory/branch/:branchId/low-stock
   */
  @UseGuards(JwtAuthGuard)
  @Get('branch/:branchId/low-stock')
  async getLowStockByBranch(
    @Param('branchId') branchId: string,
    @CurrentUser() user: any,
    @Query('threshold') threshold?: string,
  ) {
    return this.inventoryService.getLowStockProductsByBranch(
      user.shopId,
      branchId,
      threshold ? parseInt(threshold) : 10,
    );
  }

  /**
   * Get inventory stats for branch
   * GET /inventory/branch/:branchId/stats
   */
  @UseGuards(JwtAuthGuard)
  @Get('branch/:branchId/stats')
  async getBranchInventoryStats(
    @Param('branchId') branchId: string,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.getBranchInventoryStats(user.shopId, branchId);
  }

  /**
   * Update branch stock
   * POST /inventory/branch/:branchId/stock/update
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin', 'branch_manager')
  @Post('branch/:branchId/stock/update')
  async updateBranchStock(
    @Param('branchId') branchId: string,
    @Body() dto: { productId: string; quantityChange: number },
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.updateBranchStock(
      user.shopId,
      dto.productId,
      branchId,
      dto.quantityChange,
    );
  }

  /**
   * Transfer stock between branches
   * POST /inventory/branch/transfer
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin')
  @Post('branch/transfer')
  async transferBranchStock(
    @Body() dto: { productId: string; fromBranchId: string; toBranchId: string; quantity: number },
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.transferBranchStock(
      user.shopId,
      dto.productId,
      dto.fromBranchId,
      dto.toBranchId,
      dto.quantity,
      user.sub,
    );
  }
}
