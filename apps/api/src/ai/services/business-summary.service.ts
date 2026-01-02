import { Injectable, Logger } from '@nestjs/common';
import { AiDataService } from './ai-data.service';

export interface DailyMetrics {
  date: Date;
  revenue: number;
  orders: number;
  items: number;
  avgOrderValue: number;
  topProducts: Array<{ productId: string; productName: string; quantity: number; revenue: number }>;
}

export interface WeeklySummary {
  weekStart: Date;
  weekEnd: Date;
  totalRevenue: number;
  totalOrders: number;
  avgDailyRevenue: number;
  bestDay: { day: string; revenue: number };
  worstDay: { day: string; revenue: number };
  revenueChange: number;
}

@Injectable()
export class BusinessSummaryService {
  private readonly logger = new Logger(BusinessSummaryService.name);

  constructor(private readonly aiDataService: AiDataService) {}

  async generateDailySummary(shopId: string, date: Date = new Date()): Promise<DailyMetrics> {
    const metrics = await this.aiDataService.getDailySalesMetrics(shopId, date);
    
    return {
      date,
      revenue: metrics.revenue,
      orders: metrics.orders,
      items: metrics.items,
      avgOrderValue: metrics.orders > 0 ? metrics.revenue / metrics.orders : 0,
      topProducts: [],
    };
  }

  async generateWeeklySummary(shopId: string, weekEndDate: Date = new Date()): Promise<WeeklySummary> {
    const weekEnd = new Date(weekEndDate);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    let totalRevenue = 0;
    let totalOrders = 0;
    let bestDay = { day: '', revenue: 0 };
    let worstDay = { day: '', revenue: Infinity };

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const metrics = await this.aiDataService.getDailySalesMetrics(shopId, date);
      
      totalRevenue += metrics.revenue;
      totalOrders += metrics.orders;

      const dayName = days[date.getDay()];
      if (metrics.revenue > bestDay.revenue) {
        bestDay = { day: dayName, revenue: metrics.revenue };
      }
      if (metrics.revenue < worstDay.revenue) {
        worstDay = { day: dayName, revenue: metrics.revenue };
      }
    }

    if (worstDay.revenue === Infinity) {
      worstDay.revenue = 0;
    }

    return {
      weekStart,
      weekEnd,
      totalRevenue,
      totalOrders,
      avgDailyRevenue: totalRevenue / 7,
      bestDay,
      worstDay,
      revenueChange: 0,
    };
  }

  formatDailySummaryMessage(metrics: DailyMetrics, shopName: string): string {
    const dateStr = metrics.date.toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    return `📊 *Daily Summary - ${shopName}*
📅 ${dateStr}

💰 *Revenue:* KES ${metrics.revenue.toLocaleString()}
🛒 *Orders:* ${metrics.orders}
📦 *Items Sold:* ${metrics.items}
💵 *Avg Order:* KES ${metrics.avgOrderValue.toFixed(0)}

Have a great evening! 🌙`;
  }
}
