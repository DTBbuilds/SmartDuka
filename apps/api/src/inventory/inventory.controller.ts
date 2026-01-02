import { Body, Controller, Delete, Get, Post, Put, Query, UseGuards, Response, Param } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
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
  @Get('products/barcode/:barcode')
  async findByBarcode(@Param('barcode') barcode: string, @CurrentUser() user: any) {
    const product = await this.inventoryService.findByBarcode(user.shopId, barcode);
    if (!product) {
      return { found: false, product: null };
    }
    return { found: true, product };
  }

  @UseGuards(JwtAuthGuard)
  @Get('products/sku/:sku')
  async findBySku(@Param('sku') sku: string, @CurrentUser() user: any) {
    const product = await this.inventoryService.findBySku(user.shopId, sku);
    if (!product) {
      return { found: false, product: null };
    }
    return { found: true, product };
  }

  @UseGuards(JwtAuthGuard)
  @Get('products/search/quick')
  quickSearch(@Query('q') q: string, @Query('limit') limit: string, @CurrentUser() user: any) {
    return this.inventoryService.quickSearch(user.shopId, q || '', limit ? parseInt(limit, 10) : 10);
  }

  @UseGuards(JwtAuthGuard)
  @Get('products/:id')
  getProduct(@Param('id') productId: string, @CurrentUser() user: any) {
    return this.inventoryService.getProductById(user.shopId, productId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('products/:id')
  updateProduct(@Param('id') productId: string, @Body() dto: UpdateProductDto, @CurrentUser() user: any) {
    return this.inventoryService.updateProduct(user.shopId, productId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('products/:id')
  deleteProduct(@Param('id') productId: string, @CurrentUser() user: any) {
    return this.inventoryService.deleteProduct(user.shopId, productId, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('products/:id/restore')
  restoreProduct(@Param('id') productId: string, @CurrentUser() user: any) {
    return this.inventoryService.restoreProduct(user.shopId, productId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('products/:id/permanent')
  permanentlyDeleteProduct(@Param('id') productId: string, @CurrentUser() user: any) {
    return this.inventoryService.permanentlyDeleteProduct(user.shopId, productId);
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

  /**
   * Get stock movements/adjustments for a specific product
   */
  @UseGuards(JwtAuthGuard)
  @Get('stock/movements/:productId')
  async getStockMovements(
    @Param('productId') productId: string,
    @Query('limit') limit: string,
    @CurrentUser() user: any
  ) {
    const movements = await this.inventoryService.getStockAdjustmentHistory(user.shopId, {
      productId,
    });
    // Apply limit after fetching (service doesn't support limit param)
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return movements.slice(0, limitNum);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('products/import')
  importProducts(
    @Body() dto: { 
      products: CreateProductDto[];
      options?: {
        autoCreateCategories?: boolean;
        autoSuggestCategories?: boolean;
        updateExisting?: boolean;
        skipDuplicates?: boolean;
      };
    }, 
    @CurrentUser() user: any
  ) {
    return this.inventoryService.importProducts(user.shopId, dto.products, dto.options);
  }

  /**
   * Analyze products before import
   * Returns information about categories that will be created/suggested
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('products/import/analyze')
  analyzeImport(@Body() dto: { products: CreateProductDto[] }, @CurrentUser() user: any) {
    return this.inventoryService.analyzeImport(user.shopId, dto.products);
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

  /**
   * Get inventory analytics
   * GET /inventory/analytics
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('analytics')
  async getInventoryAnalytics(@CurrentUser() user: any) {
    return this.inventoryService.getInventoryAnalytics(user.shopId);
  }
}
