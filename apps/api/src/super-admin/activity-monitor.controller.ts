import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActivityMonitorService } from './services/activity-monitor.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('Super Admin - Activity Monitor')
@Controller('super-admin/activity')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class ActivityMonitorController {
  constructor(private readonly activityMonitorService: ActivityMonitorService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get real-time activity statistics' })
  @ApiResponse({ status: 200, description: 'Activity statistics retrieved successfully' })
  async getActivityStats() {
    return this.activityMonitorService.getActivityStats();
  }

  @Get('shops')
  @ApiOperation({ summary: 'Get all shop activities' })
  @ApiResponse({ status: 200, description: 'Shop activities retrieved successfully' })
  async getAllShopActivities() {
    return this.activityMonitorService.getAllShopActivities();
  }

  @Get('shops/:shopId')
  @ApiOperation({ summary: 'Get activity for a specific shop' })
  @ApiResponse({ status: 200, description: 'Shop activity retrieved successfully' })
  async getShopActivity(@Param('shopId') shopId: string) {
    return this.activityMonitorService.getShopActivity(shopId);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get all active sessions' })
  @ApiResponse({ status: 200, description: 'Active sessions retrieved successfully' })
  async getActiveSessions() {
    return this.activityMonitorService.getActiveSessions();
  }

  @Get('sessions/shop/:shopId')
  @ApiOperation({ summary: 'Get active sessions for a specific shop' })
  @ApiResponse({ status: 200, description: 'Active sessions for shop retrieved successfully' })
  async getActiveSessionsForShop(@Param('shopId') shopId: string) {
    return this.activityMonitorService.getActiveSessionsForShop(shopId);
  }

  @Get('refresh')
  @ApiOperation({ summary: 'Force refresh activity data' })
  @ApiResponse({ status: 200, description: 'Activity data refreshed successfully' })
  async refreshActivityData() {
    await this.activityMonitorService.refreshActiveSessions();
    await this.activityMonitorService.refreshShopActivities();
    return { message: 'Activity data refreshed successfully' };
  }
}
