import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { StaffAssignmentService } from './staff-assignment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * PHASE 2: STAFF ASSIGNMENT CONTROLLER
 * 
 * Manages assignment of staff to branches
 */
@Controller('staff-assignment')
export class StaffAssignmentController {
  constructor(private readonly staffAssignmentService: StaffAssignmentService) {}

  /**
   * Assign user to a branch
   * POST /staff-assignment/assign
   * Admin or Branch Admin only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin')
  @Post('assign')
  async assignToBranch(
    @Body() dto: { userId: string; branchId: string },
    @CurrentUser() user: any,
  ) {
    return this.staffAssignmentService.assignToBranch(
      user.shopId,
      dto.userId,
      dto.branchId,
      user.sub,
    );
  }

  /**
   * Assign user to multiple branches
   * POST /staff-assignment/assign-multiple
   * Admin only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('assign-multiple')
  async assignToMultipleBranches(
    @Body() dto: { userId: string; branchIds: string[] },
    @CurrentUser() user: any,
  ) {
    return this.staffAssignmentService.assignToMultipleBranches(
      user.shopId,
      dto.userId,
      dto.branchIds,
      user.sub,
    );
  }

  /**
   * Get staff for a branch
   * GET /staff-assignment/branch/:branchId
   */
  @UseGuards(JwtAuthGuard)
  @Get('branch/:branchId')
  async getStaffByBranch(
    @Param('branchId') branchId: string,
    @CurrentUser() user: any,
  ) {
    return this.staffAssignmentService.getStaffByBranch(user.shopId, branchId);
  }

  /**
   * Remove user from branch
   * DELETE /staff-assignment/remove
   * Admin or Branch Admin only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin')
  @Delete('remove')
  async removeFromBranch(
    @Body() dto: { userId: string; branchId: string },
    @CurrentUser() user: any,
  ) {
    const removed = await this.staffAssignmentService.removeFromBranch(
      user.shopId,
      dto.userId,
      dto.branchId,
      user.sub,
    );
    return { removed };
  }

  /**
   * Update branch-specific permissions
   * PUT /staff-assignment/permissions
   * Admin or Branch Admin only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin')
  @Put('permissions')
  async updateBranchPermissions(
    @Body() dto: { userId: string; branchId: string; permissions: any },
    @CurrentUser() user: any,
  ) {
    return this.staffAssignmentService.updateBranchPermissions(
      user.shopId,
      dto.userId,
      dto.branchId,
      dto.permissions,
      user.sub,
    );
  }

  /**
   * Get branch-specific permissions for user
   * GET /staff-assignment/permissions/:userId/:branchId
   */
  @UseGuards(JwtAuthGuard)
  @Get('permissions/:userId/:branchId')
  async getBranchPermissions(
    @Param('userId') userId: string,
    @Param('branchId') branchId: string,
    @CurrentUser() user: any,
  ) {
    return this.staffAssignmentService.getBranchPermissions(
      user.shopId,
      userId,
      branchId,
    );
  }
}
