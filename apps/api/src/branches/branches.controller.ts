import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
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
    return this.branchesService.create(user.shopId, user.sub, dto);
  }

  /**
   * Get all branches for shop
   * GET /branches
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async findByShop(@CurrentUser() user: any) {
    return this.branchesService.findByShop(user.shopId);
  }

  /**
   * Get active branches only
   * GET /branches/active
   */
  @UseGuards(JwtAuthGuard)
  @Get('active')
  async getActive(@CurrentUser() user: any) {
    return this.branchesService.getActive(user.shopId);
  }

  /**
   * Get single branch
   * GET /branches/:id
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.branchesService.findById(id, user.shopId);
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
    return this.branchesService.update(id, user.shopId, user.sub, dto);
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
    return { deleted };
  }
}
