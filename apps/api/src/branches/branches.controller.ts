import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { BranchesService } from './branches.service';
import type { CreateBranchDto, UpdateBranchDto } from './branches.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  /**
   * Create branch
   * POST /branches
   * Admin or Branch Admin only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin')
  @Post()
  async create(@Body() dto: CreateBranchDto, @CurrentUser() user: any) {
    const branch = await this.branchesService.create(user.shopId, user.sub, dto);
    return {
      success: true,
      message: 'Branch created successfully',
      data: branch,
    };
  }

  /**
   * Get all branches for shop
   * GET /branches
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async findByShop(@CurrentUser() user: any) {
    const branches = await this.branchesService.findByShop(user.shopId);
    return {
      success: true,
      data: branches,
      count: branches.length,
    };
  }

  /**
   * Get active branches only
   * GET /branches/active
   */
  @UseGuards(JwtAuthGuard)
  @Get('active')
  async getActive(@CurrentUser() user: any) {
    const branches = await this.branchesService.getActive(user.shopId);
    return {
      success: true,
      data: branches,
      count: branches.length,
    };
  }

  /**
   * Get branches with their own payment config
   * GET /branches/with-payment-config
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin')
  @Get('with-payment-config')
  async getBranchesWithPaymentConfig(@CurrentUser() user: any) {
    const branches = await this.branchesService.getBranchesWithPaymentConfig(user.shopId);
    return {
      success: true,
      data: branches,
      count: branches.length,
    };
  }

  /**
   * Get branches that accept delivery
   * GET /branches/delivery
   */
  @UseGuards(JwtAuthGuard)
  @Get('delivery')
  async getDeliveryBranches(@CurrentUser() user: any) {
    const branches = await this.branchesService.getDeliveryBranches(user.shopId);
    return {
      success: true,
      data: branches,
      count: branches.length,
    };
  }

  /**
   * Get branches by county
   * GET /branches/by-county?county=Nairobi
   */
  @UseGuards(JwtAuthGuard)
  @Get('by-county')
  async getByCounty(
    @Query('county') county: string,
    @CurrentUser() user: any,
  ) {
    const branches = await this.branchesService.getByCounty(user.shopId, county);
    return {
      success: true,
      data: branches,
      count: branches.length,
    };
  }

  /**
   * Get single branch
   * GET /branches/:id
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findById(@Param('id') id: string, @CurrentUser() user: any) {
    const branch = await this.branchesService.findById(id, user.shopId);
    return {
      success: true,
      data: branch,
    };
  }

  /**
   * Get branch statistics
   * GET /branches/:id/stats
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id/stats')
  async getBranchStats(@Param('id') id: string, @CurrentUser() user: any) {
    const stats = await this.branchesService.getBranchStats(id, user.shopId);
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get branch payment config status
   * GET /branches/:id/payment-config
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin', 'branch_manager')
  @Get(':id/payment-config')
  async getPaymentConfigStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const status = await this.branchesService.getPaymentConfigStatus(id, user.shopId);
    return {
      success: true,
      data: status,
    };
  }

  /**
   * Update branch
   * PUT /branches/:id
   * Admin or Branch Admin only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin')
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
    @CurrentUser() user: any,
  ) {
    const branch = await this.branchesService.update(id, user.shopId, user.sub, dto);
    return {
      success: true,
      message: 'Branch updated successfully',
      data: branch,
    };
  }

  /**
   * Update branch payment configuration
   * PUT /branches/:id/payment-config
   * Admin only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id/payment-config')
  async updatePaymentConfig(
    @Param('id') id: string,
    @Body() paymentConfig: CreateBranchDto['paymentConfig'],
    @CurrentUser() user: any,
  ) {
    const branch = await this.branchesService.updatePaymentConfig(
      id,
      user.shopId,
      user.sub,
      paymentConfig,
    );
    return {
      success: true,
      message: 'Branch payment configuration updated',
      data: branch,
    };
  }

  /**
   * Assign manager to branch
   * POST /branches/:id/manager
   * Admin only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/manager')
  async assignManager(
    @Param('id') id: string,
    @Body('managerId') managerId: string,
    @CurrentUser() user: any,
  ) {
    const branch = await this.branchesService.assignManager(
      id,
      user.shopId,
      user.sub,
      managerId,
    );
    return {
      success: true,
      message: 'Manager assigned to branch',
      data: branch,
    };
  }

  /**
   * Add staff to branch
   * POST /branches/:id/staff
   * Admin or Branch Admin only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin')
  @Post(':id/staff')
  async addStaff(
    @Param('id') id: string,
    @Body('staffId') staffId: string,
    @CurrentUser() user: any,
  ) {
    const branch = await this.branchesService.addStaff(
      id,
      user.shopId,
      user.sub,
      staffId,
    );
    return {
      success: true,
      message: 'Staff added to branch',
      data: branch,
    };
  }

  /**
   * Remove staff from branch
   * DELETE /branches/:id/staff/:staffId
   * Admin or Branch Admin only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin')
  @Delete(':id/staff/:staffId')
  async removeStaff(
    @Param('id') id: string,
    @Param('staffId') staffId: string,
    @CurrentUser() user: any,
  ) {
    const branch = await this.branchesService.removeStaff(
      id,
      user.shopId,
      user.sub,
      staffId,
    );
    return {
      success: true,
      message: 'Staff removed from branch',
      data: branch,
    };
  }

  /**
   * Delete branch
   * DELETE /branches/:id
   * Admin only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    const deleted = await this.branchesService.delete(id, user.shopId, user.sub);
    return {
      success: true,
      message: 'Branch deleted successfully',
      deleted,
    };
  }
}
