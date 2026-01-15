import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order } from '../sales/schemas/order.schema';
import { Product } from '../inventory/schemas/product.schema';

export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  todayRevenue: number;
  lowStockCount: number;
  pendingOrders: number;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  quantitySold: number;
  revenue: number;
}

export interface RecentSale {
  orderId: string;
  orderNumber: string;
  total: number;
  itemCount: number;
  paymentMethod: string;
  createdAt: Date;
  customerName?: string;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(shopId: string): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const shopObjectId = new Types.ObjectId(shopId);

    // Get today's completed orders
    const todayOrders = await this.orderModel
      .find({
        shopId: shopObjectId,
        status: 'completed',
        createdAt: { $gte: today, $lte: endOfToday },
      })
      .exec();

    // Get all completed orders for total stats
    const allOrders = await this.orderModel
      .find({
        shopId: shopObjectId,
        status: 'completed',
      })
      .exec();

    // Get pending orders
    const pendingOrders = await this.orderModel
      .countDocuments({
        shopId: shopObjectId,
        status: 'pending',
      })
      .exec();

    // Get low stock products
    const lowStockProducts = await this.productModel
      .countDocuments({
        shopId: shopObjectId,
        $expr: { $lte: ['$stock', '$lowStockThreshold'] },
      })
      .exec();

    // Calculate totals
    const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalRevenue = allOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const averageOrderValue = allOrders.length > 0 ? totalRevenue / allOrders.length : 0;

    return {
      todaySales: todayOrders.length,
      todayOrders: todayOrders.length,
      todayRevenue: Math.round(todayRevenue * 100) / 100,
      lowStockCount: lowStockProducts,
      pendingOrders,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders: allOrders.length,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    };
  }

  /**
   * Get top selling products
   */
  async getTopProducts(shopId: string, limit: number = 5): Promise<TopProduct[]> {
    const shopObjectId = new Types.ObjectId(shopId);

    const result = await this.orderModel.aggregate([
      { $match: { shopId: shopObjectId, status: 'completed' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          quantitySold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
        },
      },
      { $sort: { quantitySold: -1 } },
      { $limit: limit },
    ]);

    return result.map(item => ({
      productId: item._id?.toString() || 'unknown',
      name: item.name || 'Unknown Product',
      quantitySold: item.quantitySold || 0,
      revenue: Math.round((item.revenue || 0) * 100) / 100,
    }));
  }

  /**
   * Get recent sales
   */
  async getRecentSales(shopId: string, limit: number = 5): Promise<RecentSale[]> {
    const shopObjectId = new Types.ObjectId(shopId);

    const orders = await this.orderModel
      .find({
        shopId: shopObjectId,
        status: 'completed',
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    return orders.map((order: any) => ({
      orderId: order._id.toString(),
      orderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6)}`,
      total: order.total || 0,
      itemCount: order.items?.length || 0,
      paymentMethod: order.payments?.[0]?.method || 'cash',
      createdAt: order.createdAt,
      customerName: order.customerName,
    }));
  }
}
