import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import type { CreatePurchaseDto, UpdatePurchaseDto } from './purchases.service';
import { PurchasesService } from './purchases.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  async create(@Body() dto: any, @CurrentUser() user: Record<string, any>) {
    return this.purchasesService.create(user.shopId, user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@CurrentUser() user: Record<string, any>) {
    return this.purchasesService.findAll(user.shopId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('pending')
  async getPending(@CurrentUser() user: Record<string, any>) {
    return this.purchasesService.getPending(user.shopId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('supplier/:supplierId')
  async getBySupplier(
    @Param('supplierId') supplierId: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.purchasesService.getBySupplier(supplierId, user.shopId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findById(@Param('id') id: string, @CurrentUser() user: Record<string, any>) {
    return this.purchasesService.findById(id, user.shopId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.purchasesService.update(id, user.shopId, dto, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: Record<string, any>) {
    const deleted = await this.purchasesService.delete(id, user.shopId);
    return { deleted };
  }

  // PHASE 6: Branch-specific purchase endpoints

  /**
   * Get all purchases for branch
   * GET /purchases/branch/:branchId
   */
  @UseGuards(JwtAuthGuard)
  @Get('branch/:branchId')
  async findByBranch(
    @Param('branchId') branchId: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.purchasesService.findByBranch(user.shopId, branchId);
  }

  /**
   * Get pending purchases for branch
   * GET /purchases/branch/:branchId/pending
   */
  @UseGuards(JwtAuthGuard)
  @Get('branch/:branchId/pending')
  async getPendingByBranch(
    @Param('branchId') branchId: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.purchasesService.getPendingByBranch(user.shopId, branchId);
  }

  /**
   * Get received purchases for branch
   * GET /purchases/branch/:branchId/received
   */
  @UseGuards(JwtAuthGuard)
  @Get('branch/:branchId/received')
  async getReceivedByBranch(
    @Param('branchId') branchId: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.purchasesService.getReceivedByBranch(user.shopId, branchId);
  }

  /**
   * Get purchase stats for branch
   * GET /purchases/branch/:branchId/stats
   */
  @UseGuards(JwtAuthGuard)
  @Get('branch/:branchId/stats')
  async getBranchStats(
    @Param('branchId') branchId: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    return this.purchasesService.getBranchStats(user.shopId, branchId);
  }
}
