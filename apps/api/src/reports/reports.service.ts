import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

interface OrderItem {
  productId?: Types.ObjectId;
  productName?: string;
  quantity?: number;
  price?: number;
}

interface Order {
  _id?: Types.ObjectId;
  shopId: Types.ObjectId;
  total?: number;
  items?: OrderItem[];
  createdAt: Date;
}

type OrderDocument = Order & Document;

export interface DailySalesReport {
  date: string;
  revenue: number;
  orders: number;
  itemsSold: number;
  averageOrderValue: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface WeeklySalesReport {
  week: string;
  startDate: Date;
  endDate: Date;
  revenue: number;
  orders: number;
  itemsSold: number;
  averageOrderValue: number;
  dailyBreakdown: DailySalesReport[];
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface MonthlySalesReport {
  month: string;
  year: number;
  revenue: number;
  orders: number;
  itemsSold: number;
  averageOrderValue: number;
  weeklyBreakdown: WeeklySalesReport[];
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface SalesMetrics {
  totalRevenue: number;
  totalOrders: number;
  totalItemsSold: number;
  averageOrderValue: number;
  averageItemsPerOrder: number;
  conversionRate: number;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(@InjectModel('Order') private readonly orderModel: Model<any>) {}

  async getDailySalesReport(shopId: string, date: Date): Promise<DailySalesReport> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      })
      .exec();

    let revenue = 0;
    let itemsSold = 0;
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

    orders.forEach((order) => {
      revenue += order.total || 0;
      order.items?.forEach((item: any) => {
        itemsSold += item.quantity || 0;
        const key = item.productId?.toString() || 'unknown';
        if (!productMap.has(key)) {
          productMap.set(key, { name: item.productName || 'Unknown', quantity: 0, revenue: 0 });
        }
        const prod = productMap.get(key);
        if (prod) {
          prod.quantity += item.quantity || 0;
          prod.revenue += (item.price || 0) * (item.quantity || 0);
        }
      });
    });

    const topProducts = Array.from(productMap.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      date: date.toISOString().split('T')[0],
      revenue,
      orders: orders.length,
      itemsSold,
      averageOrderValue: orders.length > 0 ? revenue / orders.length : 0,
      topProducts,
    };
  }

  async getWeeklySalesReport(shopId: string, startDate: Date): Promise<WeeklySalesReport> {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    const dailyReports: DailySalesReport[] = [];
    let totalRevenue = 0;
    let totalOrders = 0;
    let totalItemsSold = 0;
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dailyReport = await this.getDailySalesReport(shopId, date);
      dailyReports.push(dailyReport);

      totalRevenue += dailyReport.revenue;
      totalOrders += dailyReport.orders;
      totalItemsSold += dailyReport.itemsSold;

      dailyReport.topProducts.forEach((prod) => {
        const key = prod.productId;
        if (!productMap.has(key)) {
          productMap.set(key, { name: prod.productName, quantity: 0, revenue: 0 });
        }
        const p = productMap.get(key);
        if (p) {
          p.quantity += prod.quantity;
          p.revenue += prod.revenue;
        }
      });
    }

    const topProducts = Array.from(productMap.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const weekNumber = Math.ceil(startDate.getDate() / 7);

    return {
      week: `Week ${weekNumber}`,
      startDate,
      endDate,
      revenue: totalRevenue,
      orders: totalOrders,
      itemsSold: totalItemsSold,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      dailyBreakdown: dailyReports,
      topProducts,
    };
  }

  async getMonthlySalesReport(shopId: string, year: number, month: number): Promise<MonthlySalesReport> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const orders = await this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .exec();

    let totalRevenue = 0;
    let totalItemsSold = 0;
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

    orders.forEach((order) => {
      totalRevenue += order.total || 0;
      order.items?.forEach((item: any) => {
        totalItemsSold += item.quantity || 0;
        const key = item.productId?.toString() || 'unknown';
        if (!productMap.has(key)) {
          productMap.set(key, { name: item.productName || 'Unknown', quantity: 0, revenue: 0 });
        }
        const prod = productMap.get(key);
        if (prod) {
          prod.quantity += item.quantity || 0;
          prod.revenue += (item.price || 0) * (item.quantity || 0);
        }
      });
    });

    const topProducts = Array.from(productMap.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Generate weekly breakdown
    const weeklyReports: WeeklySalesReport[] = [];
    for (let week = 0; week < 5; week++) {
      const weekStart = new Date(year, month - 1, 1 + week * 7);
      if (weekStart <= endDate) {
        const weeklyReport = await this.getWeeklySalesReport(shopId, weekStart);
        weeklyReports.push(weeklyReport);
      }
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    return {
      month: monthNames[month - 1],
      year,
      revenue: totalRevenue,
      orders: orders.length,
      itemsSold: totalItemsSold,
      averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
      weeklyBreakdown: weeklyReports,
      topProducts,
    };
  }

  async getSalesMetrics(shopId: string, days: number = 30): Promise<SalesMetrics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        createdAt: { $gte: startDate },
      })
      .exec();

    let totalRevenue = 0;
    let totalItemsSold = 0;

    orders.forEach((order) => {
      totalRevenue += order.total || 0;
      order.items?.forEach((item: any) => {
        totalItemsSold += item.quantity || 0;
      });
    });

    return {
      totalRevenue,
      totalOrders: orders.length,
      totalItemsSold,
      averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
      averageItemsPerOrder: orders.length > 0 ? totalItemsSold / orders.length : 0,
      conversionRate: 0, // Would need visitor data to calculate
    };
  }

  async getTrendAnalysis(shopId: string, days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        createdAt: { $gte: startDate },
      })
      .sort({ createdAt: 1 })
      .exec();

    const dailyData: Record<string, { revenue: number; orders: number }> = {};

    orders.forEach((order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { revenue: 0, orders: 0 };
      }
      dailyData[date].revenue += order.total || 0;
      dailyData[date].orders += 1;
    });

    return {
      period: `Last ${days} days`,
      startDate,
      endDate: new Date(),
      dailyData: Object.entries(dailyData).map(([date, data]) => ({
        date,
        ...data,
      })),
    };
  }
}
