/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

@Injectable()
export class AiDataService {
  private readonly logger = new Logger(AiDataService.name);

  constructor(
    @InjectModel('Order') private orderModel: Model<any>,
    @InjectModel('Product') private productModel: Model<any>,
  ) {}

  async getSalesData(shopId: string, startDate: Date, endDate: Date): Promise<any[]> {
    try {
      return await this.orderModel.find({
        shopId: new Types.ObjectId(shopId),
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: ['completed', 'paid'] },
      }).lean();
    } catch (error: any) {
      this.logger.error(`Failed to get sales data: ${error.message}`);
      return [];
    }
  }

  async getProductsWithStock(shopId: string): Promise<any[]> {
    try {
      return await this.productModel.find({
        shopId: new Types.ObjectId(shopId),
        deletedAt: { $exists: false },
      }).lean();
    } catch (error: any) {
      this.logger.error(`Failed to get products: ${error.message}`);
      return [];
    }
  }

  async getLowStockProducts(shopId: string): Promise<any[]> {
    try {
      return await this.productModel.find({
        shopId: new Types.ObjectId(shopId),
        deletedAt: { $exists: false },
        $expr: { $lte: ['$stock', '$reorderLevel'] },
      }).lean();
    } catch (error: any) {
      this.logger.error(`Failed to get low stock products: ${error.message}`);
      return [];
    }
  }

  async getDailySalesMetrics(shopId: string, date: Date): Promise<{ revenue: number; orders: number; items: number }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      const result = await this.orderModel.aggregate([
        {
          $match: {
            shopId: new Types.ObjectId(shopId),
            createdAt: { $gte: startOfDay, $lte: endOfDay },
            status: { $in: ['completed', 'paid'] },
          },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
            items: { $sum: { $size: '$items' } },
          },
        },
      ]);

      return result[0] || { revenue: 0, orders: 0, items: 0 };
    } catch (error: any) {
      this.logger.error(`Failed to get daily metrics: ${error.message}`);
      return { revenue: 0, orders: 0, items: 0 };
    }
  }
}
