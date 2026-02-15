/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unused-vars */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Shop, ShopDocument } from '../../shops/schemas/shop.schema';
import { AiDataService } from './ai-data.service';
import { BusinessSummaryService, DailyMetrics } from './business-summary.service';
import { WhatsAppService } from '../../whatsapp/services/whatsapp.service';
import { WhatsAppTemplateService, DailyReportData, WeeklyReportData } from '../../whatsapp/services/whatsapp-template.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { ReportsService } from '../../reports/reports.service';

/**
 * AI Report Scheduler Service
 * 
 * Coordinates the generation and delivery of AI-powered reports via:
 * - WhatsApp
 * - Email
 * - In-app notifications
 * 
 * Schedules:
 * - Daily reports: 8 PM local time
 * - Weekly reports: Sunday 8 AM
 * - Monthly reports: 1st of month 9 AM
 */
@Injectable()
export class AiReportSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(AiReportSchedulerService.name);
  private isEnabled = true;

  constructor(
    @InjectModel(Shop.name) private readonly shopModel: Model<ShopDocument>,
    private readonly configService: ConfigService,
    private readonly aiDataService: AiDataService,
    private readonly businessSummaryService: BusinessSummaryService,
    private readonly whatsAppService: WhatsAppService,
    private readonly whatsAppTemplateService: WhatsAppTemplateService,
    private readonly notificationsService: NotificationsService,
    private readonly reportsService: ReportsService,
  ) {}

  async onModuleInit() {
    this.isEnabled = this.configService.get<string>('AI_REPORTS_ENABLED', 'true') === 'true';
    this.logger.log(`AI Report Scheduler ${this.isEnabled ? 'ENABLED' : 'DISABLED'}`);
  }

  // ==================== SCHEDULED JOBS ====================

  /**
   * Daily reports - 8 PM local time
   */
  @Cron('0 20 * * *')
  async sendDailyReports(): Promise<void> {
    if (!this.isEnabled) return;

    this.logger.log('Starting daily report distribution...');
    const startTime = Date.now();

    try {
      const shops = await this.getActiveShops();
      let successCount = 0;
      let failCount = 0;

      for (const shop of shops) {
        try {
          await this.generateAndSendDailyReport(shop);
          successCount++;
        } catch (error: any) {
          this.logger.error(`Daily report failed for shop ${shop._id}: ${error.message}`);
          failCount++;
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(`Daily reports completed: ${successCount} sent, ${failCount} failed (${duration}ms)`);
    } catch (error: any) {
      this.logger.error(`Daily report job failed: ${error.message}`);
    }
  }

  /**
   * Weekly reports - Sunday 8 AM
   */
  @Cron('0 8 * * 0')
  async sendWeeklyReports(): Promise<void> {
    if (!this.isEnabled) return;

    this.logger.log('Starting weekly report distribution...');
    const startTime = Date.now();

    try {
      const shops = await this.getActiveShops();
      let successCount = 0;
      let failCount = 0;

      for (const shop of shops) {
        try {
          await this.generateAndSendWeeklyReport(shop);
          successCount++;
        } catch (error: any) {
          this.logger.error(`Weekly report failed for shop ${shop._id}: ${error.message}`);
          failCount++;
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(`Weekly reports completed: ${successCount} sent, ${failCount} failed (${duration}ms)`);
    } catch (error: any) {
      this.logger.error(`Weekly report job failed: ${error.message}`);
    }
  }

  /**
   * Monthly reports - 1st of month 9 AM
   */
  @Cron('0 9 1 * *')
  async sendMonthlyReports(): Promise<void> {
    if (!this.isEnabled) return;

    this.logger.log('Starting monthly report distribution...');
    const startTime = Date.now();

    try {
      const shops = await this.getActiveShops();
      let successCount = 0;
      let failCount = 0;

      for (const shop of shops) {
        try {
          await this.generateAndSendMonthlyReport(shop);
          successCount++;
        } catch (error: any) {
          this.logger.error(`Monthly report failed for shop ${shop._id}: ${error.message}`);
          failCount++;
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(`Monthly reports completed: ${successCount} sent, ${failCount} failed (${duration}ms)`);
    } catch (error: any) {
      this.logger.error(`Monthly report job failed: ${error.message}`);
    }
  }

  // ==================== REPORT GENERATION ====================

  /**
   * Generate and send daily report for a shop
   */
  async generateAndSendDailyReport(shop: ShopDocument): Promise<void> {
    const shopId = (shop as any)._id.toString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Get metrics from AI data service
    const metrics = await this.aiDataService.getDailySalesMetrics(shopId, yesterday);
    const twoDaysAgo = new Date(yesterday);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 1);
    const previousDay = await this.aiDataService.getDailySalesMetrics(shopId, twoDaysAgo);

    // Get low stock items
    const lowStockProducts = await this.aiDataService.getLowStockProducts(shopId);

    // Build report data
    const reportData: DailyReportData = {
      shopName: shop.name,
      date: yesterday.toLocaleDateString('en-KE', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      totalRevenue: metrics.revenue,
      revenueChange: previousDay.revenue > 0
        ? ((metrics.revenue - previousDay.revenue) / previousDay.revenue) * 100
        : 0,
      totalOrders: metrics.orders,
      averageOrderValue: metrics.orders > 0 ? metrics.revenue / metrics.orders : 0,
      newCustomers: 0,
      topProducts: [],
      lowStockCount: lowStockProducts.length,
      lowStockItems: lowStockProducts.slice(0, 5).map(p => ({
        name: p.name,
        stock: p.stock || 0,
        reorderPoint: p.reorderPoint,
      })),
      alerts: this.buildAlerts({ ...metrics, lowStockCount: lowStockProducts.length }),
      recommendations: this.buildRecommendations({ ...metrics, lowStockCount: lowStockProducts.length }),
    };

    // Send via WhatsApp
    await this.whatsAppService.sendDailyReport(shopId, reportData);

    // Send via Email (using existing notification service)
    // Email notification would go here if configured
    // await this.notificationsService.sendDailySalesReport(...);

    // Store AI insight
    this.logger.log(`Daily report sent for shop ${shop.name}`);
  }

  /**
   * Generate and send weekly report for a shop
   */
  async generateAndSendWeeklyReport(shop: ShopDocument): Promise<void> {
    const shopId = (shop as any)._id.toString();
    
    // Get last 7 days data
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Yesterday
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6); // 7 days ago

    // Get weekly report from reports service
    const weeklyReport = await this.reportsService.getWeeklySalesReport(shopId, startDate);

    // Calculate week-over-week change
    const previousWeekStart = new Date(startDate);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekReport = await this.reportsService.getWeeklySalesReport(shopId, previousWeekStart);
    
    const revenueChange = previousWeekReport.revenue > 0
      ? ((weeklyReport.revenue - previousWeekReport.revenue) / previousWeekReport.revenue) * 100
      : 0;

    // Find best and worst days
    const dailyRevenues = weeklyReport.dailyBreakdown.map((d, i) => ({ 
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000).getDay()],
      revenue: d.revenue,
      orders: d.orders,
    }));
    
    const sortedByRevenue = [...dailyRevenues].sort((a, b) => b.revenue - a.revenue);
    const bestDay = sortedByRevenue[0]?.day;
    const worstDay = sortedByRevenue[sortedByRevenue.length - 1]?.day;

    // Build report data
    const reportData: WeeklyReportData = {
      shopName: shop.name,
      dateRange: `${startDate.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      totalRevenue: weeklyReport.revenue,
      revenueChange,
      totalOrders: weeklyReport.orders,
      avgDailyRevenue: weeklyReport.revenue / 7,
      dailyBreakdown: dailyRevenues.map((d, i) => ({
        dayOfWeek: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000).getDay(),
        date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        revenue: d.revenue,
        orders: d.orders,
      })),
      topProducts: weeklyReport.topProducts.map(p => ({
        name: p.productName,
        quantity: p.quantity,
        revenue: p.revenue,
      })),
      bestDay,
      worstDay,
      growthTrend: revenueChange > 5 
        ? 'Revenue is trending up - keep the momentum!' 
        : revenueChange < -5 
          ? 'Consider promotional activities to boost sales'
          : 'Stable performance this week',
    };

    // Send via WhatsApp
    await this.whatsAppService.sendWeeklyReport(shopId, reportData);

    this.logger.debug(`Weekly report sent for shop ${shopId}`);
  }

  /**
   * Generate and send monthly report for a shop
   */
  async generateAndSendMonthlyReport(shop: ShopDocument): Promise<void> {
    const shopId = (shop as any)._id.toString();
    
    // Get previous month
    const now = new Date();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = now.getMonth() === 0 ? 12 : now.getMonth();

    // Get monthly report
    const monthlyReport = await this.reportsService.getMonthlySalesReport(shopId, year, month);

    // TODO: Send monthly report via WhatsApp
    // For now, just log
    this.logger.debug(`Monthly report generated for shop ${shopId}: ${monthlyReport.month} ${monthlyReport.year}`);
  }

  // ==================== MANUAL TRIGGERS ====================

  /**
   * Manually trigger daily report for a specific shop
   */
  async triggerDailyReport(shopId: string): Promise<void> {
    const shop = await this.shopModel.findById(shopId);
    if (!shop) {
      throw new Error('Shop not found');
    }
    await this.generateAndSendDailyReport(shop);
  }

  /**
   * Manually trigger weekly report for a specific shop
   */
  async triggerWeeklyReport(shopId: string): Promise<void> {
    const shop = await this.shopModel.findById(shopId);
    if (!shop) {
      throw new Error('Shop not found');
    }
    await this.generateAndSendWeeklyReport(shop);
  }

  // ==================== HELPERS ====================

  private async getActiveShops(): Promise<ShopDocument[]> {
    return this.shopModel.find({
      status: { $in: ['active', 'verified'] },
      isSubscriptionActive: true,
    }).exec();
  }

  private buildAlerts(metrics: any): Array<{ icon: string; message: string }> {
    const alerts: Array<{ icon: string; message: string }> = [];

    if (metrics.lowStockCount > 0) {
      alerts.push({
        icon: '⚠️',
        message: `${metrics.lowStockCount} products running low on stock`,
      });
    }

    if (metrics.voidedOrders && metrics.voidedOrders > metrics.orders * 0.05) {
      alerts.push({
        icon: '🔴',
        message: 'High void rate detected today',
      });
    }

    return alerts;
  }

  private buildRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];

    if (metrics.lowStockCount > 0) {
      recommendations.push('Review and reorder low-stock items');
    }

    if (metrics.orders === 0) {
      recommendations.push('No sales today - consider promotional activities');
    } else if ((metrics.revenue / metrics.orders) < 500) {
      recommendations.push('Consider upselling strategies to increase order value');
    }

    if (recommendations.length === 0) {
      recommendations.push('Keep up the great work!');
    }

    return recommendations;
  }
}
