/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Controller, Get, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get dashboard statistics
   * GET /analytics/dashboard/stats
   */
  @UseGuards(JwtAuthGuard)
  @Get('dashboard/stats')
  async getDashboardStats(@CurrentUser() user: any) {
    return this.analyticsService.getDashboardStats(user.shopId);
  }

  /**
   * Get top selling products
   * GET /analytics/dashboard/top-products?limit=5
   */
  @UseGuards(JwtAuthGuard)
  @Get('dashboard/top-products')
  async getTopProducts(
    @CurrentUser() user: any,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ) {
    return this.analyticsService.getTopProducts(user.shopId, limit);
  }

  /**
   * Get recent sales
   * GET /analytics/dashboard/recent-sales?limit=5
   */
  @UseGuards(JwtAuthGuard)
  @Get('dashboard/recent-sales')
  async getRecentSales(
    @CurrentUser() user: any,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ) {
    return this.analyticsService.getRecentSales(user.shopId, limit);
  }
}
