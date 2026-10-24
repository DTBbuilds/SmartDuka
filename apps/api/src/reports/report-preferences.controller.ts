import {
  Body,
  Controller,
  Get,
  Put,
  Post,
  UseGuards,
  Param,
  Query,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportPreferencesService } from './report-preferences.service';
import { ReportSchedulerService } from './report-scheduler.service';
import { ReportRendererService } from './report-renderer.service';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * EMAIL-REPORTS-CORE1 (Phase C) — REPORT PREFERENCES & MONITORING API.
 *
 * Shop-admin surface (tenant-scoped to the JWT shop) for report
 * preferences, plus the Super Admin monitoring surface (runs + scheduler
 * health). No bulk-send endpoints exist — production sends come only from
 * the durable scheduler.
 */
@Controller('reports')
export class ReportPreferencesController {
  private readonly logger = new Logger(ReportPreferencesController.name);

  constructor(
    private readonly preferencesService: ReportPreferencesService,
    private readonly scheduler: ReportSchedulerService,
    private readonly renderer: ReportRendererService,
    private readonly reportsService: ReportsService,
  ) {}

  // ==================== SHOP-ADMIN SURFACE ====================

  @UseGuards(JwtAuthGuard)
  @Get('preferences')
  async getPreferences(@CurrentUser() user: any) {
    return this.preferencesService.getOrCreate(user.shopId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('preferences')
  async updatePreferences(@CurrentUser() user: any, @Body() body: any) {
    return this.preferencesService.update(user.shopId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('preferences/unsubscribe')
  @HttpCode(HttpStatus.OK)
  async unsubscribe(@CurrentUser() user: any, @Body() body: { reason?: string }) {
    await this.preferencesService.unsubscribeAll(user.shopId, body?.reason);
    return { success: true, message: 'Optional business reports unsubscribed. Transactional emails (security, payment notices) are unaffected.' };
  }

  /**
   * PREVIEW (Phase E/H): render the CURRENT period's digest for the caller's
   * shop WITHOUT sending — the admin sees exactly what would be delivered.
   * Returns HTML + text; PDF preview via ?format=pdf returns the PDF bytes.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('preview')
  async preview(@CurrentUser() user: any, @Query('frequency') frequency: 'daily' | 'weekly' | 'monthly' = 'daily', @Query('format') format: 'html' | 'pdf' = 'html') {
    const prefs = await this.preferencesService.getOrCreate(user.shopId);
    const now = new Date();
    const tz = prefs.timezone || 'Africa/Nairobi';

    let metrics: any;
    if (frequency === 'weekly') {
      const start = new Date(now.getTime() - 6 * 86_400_000);
      metrics = await this.reportsService.getWeeklySalesReport(user.shopId, start, tz);
    } else if (frequency === 'monthly') {
      const d = new Date();
      metrics = await this.reportsService.getMonthlySalesReport(user.shopId, d.getFullYear(), d.getMonth() + 1, tz);
    } else {
      metrics = await this.reportsService.getDailySalesReport(user.shopId, now, tz);
    }

    const reportMetrics = {
      shopName: metrics.shopName ?? 'Your shop',
      frequency,
      periodLabel: metrics.date ?? metrics.week ?? `${metrics.month} ${metrics.year}`,
      periodStart: metrics.startDate ?? new Date(),
      periodEnd: metrics.endDate ?? new Date(),
      timezone: tz,
      currency: metrics.currency,
      billedRevenue: metrics.revenue ?? 0,
      collectedPayments: metrics.collectedPayments ?? 0,
      outstanding: metrics.outstanding ?? 0,
      refunds: metrics.refunds ?? 0,
      tax: metrics.tax ?? 0,
      discounts: metrics.discounts ?? 0,
      orders: metrics.orders ?? 0,
      itemsSold: metrics.itemsSold ?? 0,
      averageOrderValue: metrics.averageOrderValue ?? 0,
      paymentMethods: metrics.paymentMethods ?? [],
      topProducts: metrics.topProducts ?? [],
      lowStock: [],
      insights: [],
      dashboardUrl: `${process.env.FRONTEND_URL || 'https://www.smartduka.org'}/admin/dashboard`,
      preferencesUrl: `${process.env.FRONTEND_URL || 'https://www.smartduka.org'}/settings?tab=reports`,
      generatedAt: new Date(),
    };

    if (format === 'pdf') {
      const pdf = await this.renderer.pdf(reportMetrics as any);
      return pdf;
    }
    return {
      subject: this.renderer.subject(reportMetrics as any),
      html: this.renderer.html(reportMetrics as any),
      text: this.renderer.text(reportMetrics as any),
    };
  }

  // ==================== SUPER-ADMIN MONITORING SURFACE ====================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Get('scheduler/health')
  async schedulerHealth() {
    return this.scheduler.schedulerHealth();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Get('scheduler/runs')
  async recentRuns(@Query('limit') limit?: string) {
    return this.scheduler.recentRuns(limit ? parseInt(limit, 10) : 50);
  }
}
