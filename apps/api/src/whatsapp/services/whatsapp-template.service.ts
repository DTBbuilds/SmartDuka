import { Injectable, Logger } from '@nestjs/common';

/**
 * WhatsApp Template Service
 * 
 * Formats reports and alerts for WhatsApp delivery.
 * Handles message chunking (WhatsApp limit: 4096 chars)
 */
@Injectable()
export class WhatsAppTemplateService {
  private readonly logger = new Logger(WhatsAppTemplateService.name);
  private readonly MAX_MESSAGE_LENGTH = 3500; // Leave buffer for safety

  // ==================== REPORT FORMATTING ====================

  /**
   * Format a daily report for WhatsApp
   */
  formatDailyReport(data: DailyReportData): string[] {
    const header = this.buildReportHeader('DAILY', data.shopName, data.date);
    
    const sections = [
      this.buildExecutiveSummary(data),
      this.buildTopSellers(data.topProducts),
      this.buildInventoryStatus(data.lowStockCount, data.lowStockItems),
      this.buildAlertsSection(data.alerts),
      this.buildRecommendations(data.recommendations),
      this.buildFooter(),
    ];

    return this.chunkMessage(header, sections);
  }

  /**
   * Format a weekly report for WhatsApp
   */
  formatWeeklyReport(data: WeeklyReportData): string[] {
    const header = this.buildReportHeader('WEEKLY', data.shopName, data.dateRange);
    
    const sections = [
      this.buildWeekOverview(data),
      this.buildDailyBreakdown(data.dailyBreakdown),
      this.buildWeeklyTopSellers(data.topProducts),
      this.buildWeeklyInsights(data),
      this.buildFooter(),
    ];

    return this.chunkMessage(header, sections);
  }

  /**
   * Format a monthly report for WhatsApp
   */
  formatMonthlyReport(data: MonthlyReportData): string[] {
    const header = this.buildReportHeader('MONTHLY', data.shopName, data.month);
    
    const sections = [
      this.buildMonthOverview(data),
      this.buildWeeklyTrends(data.weeklyBreakdown),
      this.buildMonthlyTopSellers(data.topProducts),
      this.buildMonthlyInsights(data),
      this.buildFooter(),
    ];

    return this.chunkMessage(header, sections);
  }

  // ==================== ALERT FORMATTING ====================

  /**
   * Format low stock alert
   */
  formatLowStockAlert(data: LowStockAlertData): string {
    const critical = data.products.filter(p => p.stock <= 5);
    const warning = data.products.filter(p => p.stock > 5);

    let message = `⚠️ *LOW STOCK ALERT*
🏪 ${data.shopName}

`;

    if (critical.length > 0) {
      message += `🔴 *CRITICAL*\n`;
      message += critical.slice(0, 5).map(p => `• ${p.name}: ${p.stock} left`).join('\n');
      message += '\n\n';
    }

    if (warning.length > 0) {
      message += `🟡 *WARNING*\n`;
      message += warning.slice(0, 5).map(p => `• ${p.name}: ${p.stock} left`).join('\n');
      message += '\n\n';
    }

    message += `💡 Create purchase order:\nsmartduka.co.ke/reorder

━━━━━━━━━━━━━━━━━━
_SmartDuka Inventory Alert_`;

    return message;
  }

  /**
   * Format cash variance alert
   */
  formatCashVarianceAlert(data: CashVarianceAlertData): string {
    const varianceType = data.variance > 0 ? 'OVER' : 'SHORT';
    const icon = data.variance > 0 ? '📈' : '📉';

    return `💰 *CASH VARIANCE DETECTED*
🏪 ${data.shopName}
📅 ${data.date} - ${data.shift}

${icon} Cash ${varianceType} by KES ${Math.abs(data.variance).toLocaleString()}

Expected: KES ${data.expected.toLocaleString()}
Actual: KES ${data.actual.toLocaleString()}
Variance: ${data.variance > 0 ? '+' : ''}KES ${data.variance.toLocaleString()}

👤 Cashier: ${data.cashierName}

💡 Please investigate and reconcile.

━━━━━━━━━━━━━━━━━━
_SmartDuka Financial Alert_`;
  }

  /**
   * Format sales anomaly alert
   */
  formatSalesAnomalyAlert(data: SalesAnomalyAlertData): string {
    const icon = data.severity === 'high' ? '🚨' : '⚠️';
    const trend = data.deviation > 0 ? '📈' : '📉';

    return `${icon} *SALES ${data.severity.toUpperCase()} ALERT*
🏪 ${data.shopName}
📅 ${data.date}

${trend} ${data.description}

Expected: KES ${data.expected.toLocaleString()}
Actual: KES ${data.actual.toLocaleString()}
Deviation: ${data.deviation > 0 ? '+' : ''}${data.deviation.toFixed(1)}%

💡 ${data.recommendation}

━━━━━━━━━━━━━━━━━━
_SmartDuka Analytics Alert_`;
  }

  /**
   * Format verification OTP message
   */
  formatVerificationOtp(shopName: string, otp: string): string {
    return `🔐 *SmartDuka Verification*

Your verification code for ${shopName} is:

*${otp}*

This code expires in 10 minutes.

If you didn't request this, please ignore this message.

━━━━━━━━━━━━━━━━━━
_SmartDuka Security_`;
  }

  // ==================== PRIVATE HELPERS ====================

  private buildReportHeader(type: string, shopName: string, date: string): string {
    const emoji = type === 'DAILY' ? '📊' : type === 'WEEKLY' ? '📈' : '📉';
    return `${emoji} *SmartDuka ${type} Report*
🏪 ${shopName}
📅 ${date}
━━━━━━━━━━━━━━━━━━`;
  }

  private buildExecutiveSummary(data: DailyReportData): string {
    const trend = data.revenueChange >= 0 ? '📈' : '📉';
    const changeStr = `${data.revenueChange >= 0 ? '+' : ''}${data.revenueChange.toFixed(1)}%`;
    
    return `*📋 EXECUTIVE SUMMARY*

💰 Revenue: KES ${data.totalRevenue.toLocaleString()} ${trend} ${changeStr}
🛒 Orders: ${data.totalOrders}
💵 Avg Order: KES ${data.averageOrderValue.toLocaleString()}
👥 ${data.newCustomers > 0 ? `New Customers: ${data.newCustomers}` : 'Customers served'}`;
  }

  private buildTopSellers(products: ProductSale[]): string {
    if (!products || products.length === 0) {
      return `*🏆 TOP SELLERS*\n\nNo sales recorded`;
    }

    const list = products.slice(0, 5)
      .map((p, i) => `${i + 1}. ${p.name} - ${p.quantity} sold`)
      .join('\n');

    return `*🏆 TOP SELLERS*\n\n${list}`;
  }

  private buildInventoryStatus(lowStockCount: number, lowStockItems: LowStockItem[]): string {
    if (lowStockCount === 0) {
      return `*📦 INVENTORY*\n\n✅ All products well stocked`;
    }

    const items = lowStockItems.slice(0, 3)
      .map(p => `• ${p.name}: ${p.stock} left`)
      .join('\n');

    return `*📦 INVENTORY*\n\n⚠️ ${lowStockCount} products low on stock\n${items}`;
  }

  private buildAlertsSection(alerts: Alert[]): string {
    if (!alerts || alerts.length === 0) {
      return `*🔔 ALERTS*\n\n✅ No issues detected`;
    }

    const list = alerts.slice(0, 5)
      .map(a => `${a.icon} ${a.message}`)
      .join('\n');

    return `*🔔 ALERTS*\n\n${list}`;
  }

  private buildRecommendations(recommendations: string[]): string {
    if (!recommendations || recommendations.length === 0) {
      return `*💡 RECOMMENDATIONS*\n\n✅ Keep up the good work!`;
    }

    const list = recommendations.slice(0, 4)
      .map((r, i) => `${i + 1}. ${r}`)
      .join('\n');

    return `*💡 RECOMMENDATIONS*\n\n${list}`;
  }

  private buildFooter(): string {
    return `━━━━━━━━━━━━━━━━━━
_Powered by SmartDuka AI_
_Reply STOP to unsubscribe_`;
  }

  private buildWeekOverview(data: WeeklyReportData): string {
    const trend = data.revenueChange >= 0 ? '📈' : '📉';
    const changeStr = `${data.revenueChange >= 0 ? '+' : ''}${data.revenueChange.toFixed(1)}%`;
    
    return `*📋 WEEK OVERVIEW*

💰 Total Revenue: KES ${data.totalRevenue.toLocaleString()}
📊 vs Last Week: ${trend} ${changeStr}
🛒 Total Orders: ${data.totalOrders}
💵 Avg Daily: KES ${data.avgDailyRevenue.toLocaleString()}`;
  }

  private buildDailyBreakdown(breakdown: DayBreakdown[]): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const maxRevenue = Math.max(...breakdown.map(d => d.revenue));
    
    const list = breakdown.map(d => {
      const icon = d.revenue === maxRevenue ? ' 🔥' : '';
      return `${days[d.dayOfWeek]}: KES ${d.revenue.toLocaleString()} (${d.orders} orders)${icon}`;
    }).join('\n');

    return `*📅 DAILY BREAKDOWN*\n\n${list}`;
  }

  private buildWeeklyTopSellers(products: ProductSale[]): string {
    return this.buildTopSellers(products).replace('TOP SELLERS', "WEEK'S TOP SELLERS");
  }

  private buildWeeklyInsights(data: WeeklyReportData): string {
    const insights: string[] = [];
    
    if (data.bestDay) {
      insights.push(`📈 ${data.bestDay} was your best day`);
    }
    if (data.worstDay) {
      insights.push(`📉 ${data.worstDay} needs attention`);
    }
    if (data.growthTrend) {
      insights.push(`💡 ${data.growthTrend}`);
    }

    if (insights.length === 0) {
      insights.push('📊 Consistent performance this week');
    }

    return `*📊 INSIGHTS*\n\n${insights.join('\n')}`;
  }

  private buildMonthOverview(data: MonthlyReportData): string {
    const trend = data.revenueChange >= 0 ? '📈' : '📉';
    
    return `*📋 MONTH OVERVIEW*

💰 Total Revenue: KES ${data.totalRevenue.toLocaleString()}
📊 vs Last Month: ${trend} ${data.revenueChange.toFixed(1)}%
🛒 Total Orders: ${data.totalOrders}
💵 Avg Weekly: KES ${data.avgWeeklyRevenue.toLocaleString()}`;
  }

  private buildWeeklyTrends(breakdown: WeekBreakdown[]): string {
    const list = breakdown.map((w, i) => 
      `Week ${i + 1}: KES ${w.revenue.toLocaleString()} (${w.orders} orders)`
    ).join('\n');

    return `*📅 WEEKLY TRENDS*\n\n${list}`;
  }

  private buildMonthlyTopSellers(products: ProductSale[]): string {
    return this.buildTopSellers(products).replace('TOP SELLERS', "MONTH'S TOP SELLERS");
  }

  private buildMonthlyInsights(data: MonthlyReportData): string {
    const insights = data.insights || ['📊 Review your monthly performance'];
    return `*📊 INSIGHTS*\n\n${insights.join('\n')}`;
  }

  /**
   * Chunk message into WhatsApp-friendly sizes
   */
  private chunkMessage(header: string, sections: string[]): string[] {
    const messages: string[] = [];
    let currentMessage = header;

    for (const section of sections) {
      const combined = currentMessage + '\n\n' + section;
      
      if (combined.length > this.MAX_MESSAGE_LENGTH) {
        messages.push(currentMessage);
        currentMessage = section;
      } else {
        currentMessage = combined;
      }
    }

    if (currentMessage) {
      messages.push(currentMessage);
    }

    return messages;
  }
}

// ==================== INTERFACES ====================

export interface ProductSale {
  name: string;
  quantity: number;
  revenue: number;
}

export interface LowStockItem {
  name: string;
  stock: number;
  reorderPoint?: number;
}

export interface Alert {
  icon: string;
  message: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface DailyReportData {
  shopName: string;
  date: string;
  totalRevenue: number;
  revenueChange: number;
  totalOrders: number;
  averageOrderValue: number;
  newCustomers: number;
  topProducts: ProductSale[];
  lowStockCount: number;
  lowStockItems: LowStockItem[];
  alerts: Alert[];
  recommendations: string[];
}

export interface DayBreakdown {
  dayOfWeek: number;
  date: string;
  revenue: number;
  orders: number;
}

export interface WeeklyReportData {
  shopName: string;
  dateRange: string;
  totalRevenue: number;
  revenueChange: number;
  totalOrders: number;
  avgDailyRevenue: number;
  dailyBreakdown: DayBreakdown[];
  topProducts: ProductSale[];
  bestDay?: string;
  worstDay?: string;
  growthTrend?: string;
}

export interface WeekBreakdown {
  weekNumber: number;
  revenue: number;
  orders: number;
}

export interface MonthlyReportData {
  shopName: string;
  month: string;
  totalRevenue: number;
  revenueChange: number;
  totalOrders: number;
  avgWeeklyRevenue: number;
  weeklyBreakdown: WeekBreakdown[];
  topProducts: ProductSale[];
  insights?: string[];
}

export interface LowStockAlertData {
  shopName: string;
  products: LowStockItem[];
}

export interface CashVarianceAlertData {
  shopName: string;
  date: string;
  shift: string;
  expected: number;
  actual: number;
  variance: number;
  cashierName: string;
}

export interface SalesAnomalyAlertData {
  shopName: string;
  date: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  expected: number;
  actual: number;
  deviation: number;
  recommendation: string;
}
