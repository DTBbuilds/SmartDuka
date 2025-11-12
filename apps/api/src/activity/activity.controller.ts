import { Controller, Get, Post, Query, UseGuards, Param, Body } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  /**
   * Get shop activity log (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('shop')
  async getShopActivityLog(
    @Query('limit') limit: string = '50',
    @Query('skip') skip: string = '0',
    @CurrentUser() user: any,
  ) {
    const activities = await this.activityService.getShopActivityLog(
      user.shopId,
      parseInt(limit),
      parseInt(skip),
    );
    return activities;
  }

  /**
   * Get own transactions (cashier can view own)
   * MUST come before parameterized route to avoid being matched as :cashierId
   */
  @UseGuards(JwtAuthGuard)
  @Get('cashier/self/transactions')
  async getOwnTransactions(
    @Query('limit') limit: string = '50',
    @CurrentUser() user: any,
  ) {
    const transactions = await this.activityService.getCashierTransactions(
      user.shopId,
      user.sub,
      parseInt(limit),
    );
    return transactions;
  }

  /**
   * Get cashier activity log (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('cashier/:cashierId')
  async getCashierActivityLog(
    @Param('cashierId') cashierId: string,
    @Query('limit') limit: string = '50',
    @Query('skip') skip: string = '0',
    @CurrentUser() user: any,
  ) {
    const activities = await this.activityService.getCashierActivityLog(
      user.shopId,
      cashierId,
      parseInt(limit),
      parseInt(skip),
    );
    return activities;
  }

  /**
   * Get cashier transactions (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('cashier/:cashierId/transactions')
  async getCashierTransactions(
    @Param('cashierId') cashierId: string,
    @Query('limit') limit: string = '50',
    @CurrentUser() user: any,
  ) {
    const transactions = await this.activityService.getCashierTransactions(
      user.shopId,
      cashierId,
      parseInt(limit),
    );
    return transactions;
  }

  /**
   * Get today's activity (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('today')
  async getTodayActivity(@CurrentUser() user: any) {
    const activities = await this.activityService.getTodayActivity(user.shopId);
    return activities;
  }

  /**
   * Get activity by action type (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('by-action/:action')
  async getActivityByAction(
    @Param('action') action: string,
    @Query('limit') limit: string = '50',
    @CurrentUser() user: any,
  ) {
    const activities = await this.activityService.getActivityByAction(
      user.shopId,
      action,
      parseInt(limit),
    );
    return activities;
  }

  /**
   * Get cashier sessions (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('cashier/:cashierId/sessions')
  async getCashierSessions(
    @Param('cashierId') cashierId: string,
    @Query('limit') limit: string = '50',
    @CurrentUser() user: any,
  ) {
    const sessions = await this.activityService.getCashierSessions(
      user.shopId,
      cashierId,
      parseInt(limit),
    );
    return sessions;
  }

  /**
   * Log activity (JWT protected)
   */
  @UseGuards(JwtAuthGuard)
  @Post('log')
  async logActivity(
    @Body() dto: { action: string; details?: Record<string, any> },
    @CurrentUser() user: any,
  ) {
    const activity = await this.activityService.logActivity(
      user.shopId,
      user.sub,
      user.email,
      user.role,
      dto.action,
      dto.details,
    );
    return { success: !!activity, activity };
  }

  /**
   * Update user status (JWT protected)
   */
  @UseGuards(JwtAuthGuard)
  @Post('status')
  async updateStatus(
    @Body() dto: { status: 'online' | 'idle' | 'offline'; timestamp?: string },
    @CurrentUser() user: any,
  ) {
    // Log status change as activity
    await this.activityService.logActivity(
      user.shopId,
      user.sub,
      user.email,
      user.role,
      'status_change',
      { status: dto.status },
    );
    return { success: true, status: dto.status };
  }

  /**
   * Send heartbeat (JWT protected)
   */
  @UseGuards(JwtAuthGuard)
  @Post('heartbeat')
  async heartbeat(
    @Body() dto: { status?: 'online' | 'idle' | 'offline'; timestamp?: string },
    @CurrentUser() user: any,
  ) {
    // Log heartbeat as activity
    await this.activityService.logActivity(
      user.shopId,
      user.sub,
      user.email,
      user.role,
      'heartbeat',
      { status: dto.status || 'online' },
    );
    return { success: true, timestamp: new Date().toISOString() };
  }
}
