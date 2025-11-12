import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Get audit logs for shop
   * GET /audit/logs
   * Admin or Branch Admin only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin')
  @Get('logs')
  async getLogs(
    @CurrentUser() user: any,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('userId') userId?: string,
    @Query('branchId') branchId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getByShop(user.shopId, {
      action,
      resource,
      userId,
      branchId,
      limit: limit ? parseInt(limit) : 100,
    });
  }

  /**
   * Get audit logs for branch
   * GET /audit/branch/:branchId
   */
  @UseGuards(JwtAuthGuard)
  @Get('branch/:branchId')
  async getBranchLogs(
    @Param('branchId') branchId: string,
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getByBranch(
      branchId,
      user.shopId,
      limit ? parseInt(limit) : 100,
    );
  }

  /**
   * Get audit logs for user
   * GET /audit/user/:userId
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin')
  @Get('user/:userId')
  async getUserLogs(
    @Param('userId') userId: string,
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getByUser(
      userId,
      user.shopId,
      limit ? parseInt(limit) : 100,
    );
  }

  /**
   * Get audit logs for resource
   * GET /audit/resource/:resourceId
   */
  @UseGuards(JwtAuthGuard)
  @Get('resource/:resourceId')
  async getResourceLogs(
    @Param('resourceId') resourceId: string,
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getByResource(
      resourceId,
      user.shopId,
      limit ? parseInt(limit) : 100,
    );
  }

  /**
   * Get audit statistics
   * GET /audit/stats
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'branch_admin')
  @Get('stats')
  async getStats(@CurrentUser() user: any) {
    return this.auditService.getStats(user.shopId);
  }
}
