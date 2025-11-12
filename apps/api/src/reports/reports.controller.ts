import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('daily-sales')
  async getDailySalesReport(
    @Query('date') dateStr: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.reportsService.getDailySalesReport(user.shopId, date);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('weekly-sales')
  async getWeeklySalesReport(
    @Query('startDate') startDateStr: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    const startDate = startDateStr ? new Date(startDateStr) : new Date();
    // Set to start of week (Monday)
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff);

    return this.reportsService.getWeeklySalesReport(user.shopId, startDate);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('monthly-sales')
  async getMonthlySalesReport(
    @Query('year') yearStr: string,
    @Query('month') monthStr: string,
    @CurrentUser() user: Record<string, any>,
  ) {
    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();
    const month = monthStr ? parseInt(monthStr, 10) : new Date().getMonth() + 1;

    return this.reportsService.getMonthlySalesReport(user.shopId, year, month);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('metrics')
  async getSalesMetrics(
    @Query('days') daysStr: string = '30',
    @CurrentUser() user: Record<string, any>,
  ) {
    const days = parseInt(daysStr, 10);
    return this.reportsService.getSalesMetrics(user.shopId, days);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('trends')
  async getTrendAnalysis(
    @Query('days') daysStr: string = '30',
    @CurrentUser() user: Record<string, any>,
  ) {
    const days = parseInt(daysStr, 10);
    return this.reportsService.getTrendAnalysis(user.shopId, days);
  }
}
