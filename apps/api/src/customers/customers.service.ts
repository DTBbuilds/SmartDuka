import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PaginatedResponse, createPaginatedResponse } from '../common/dto/pagination.dto';
import { CacheService, CACHE_TTL } from '../common/services/cache.service';
import { Order, OrderDocument } from '../sales/schemas/order.schema';
import { LoyaltyAccount, LoyaltyAccountDocument } from '../loyalty/schemas/loyalty-account.schema';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(LoyaltyAccount.name) private loyaltyAccountModel: Model<LoyaltyAccountDocument>,
    private readonly cacheService: CacheService,
  ) {}

  async create(shopId: string, dto: CreateCustomerDto): Promise<Customer> {
    const customer = new this.customerModel({
      ...dto,
      shopId: new Types.ObjectId(shopId),
    });
    const saved = await customer.save();
    // Invalidate cache for this shop's customers
    this.cacheService.deletePattern(`shop:${shopId}:customers:*`);
    return saved;
  }

  /**
   * @deprecated Use findAllPaginated instead for better performance
   */
  async findAll(shopId: string): Promise<Customer[]> {
    return this.customerModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .sort({ createdAt: -1 })
      .limit(100) // Add safety limit
      .exec();
  }

  /**
   * Get customers with pagination and optional search
   */
  async findAllPaginated(
    shopId: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
    segment?: string,
  ): Promise<PaginatedResponse<Customer>> {
    const query: any = { shopId: new Types.ObjectId(shopId) };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (segment) {
      query.segment = segment;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.customerModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.customerModel.countDocuments(query),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findById(id: string): Promise<Customer | null> {
    return this.customerModel.findById(id).exec();
  }

  async findByPhone(shopId: string, phone: string): Promise<Customer | null> {
    return this.customerModel
      .findOne({ shopId: new Types.ObjectId(shopId), phone })
      .exec();
  }

  async search(shopId: string, query: string): Promise<Customer[]> {
    return this.customerModel
      .find({
        shopId: new Types.ObjectId(shopId),
        $or: [
          { phone: { $regex: query, $options: 'i' } },
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
        ],
      })
      .limit(10)
      .exec();
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer | null> {
    return this.customerModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
  }

  async delete(id: string): Promise<Customer | null> {
    return this.customerModel.findByIdAndDelete(id).exec();
  }

  async updatePurchaseStats(
    id: string,
    amount: number,
  ): Promise<Customer | null> {
    const customer = await this.customerModel
      .findByIdAndUpdate(
        id,
        {
          $inc: { totalPurchases: 1, totalSpent: amount },
          $set: { lastPurchaseDate: new Date(), lastVisit: new Date() },
        },
        { new: true },
      )
      .exec();

    // Recalculate segment
    if (customer) {
      await this.updateSegment(id);
    }

    return customer;
  }

  async updateSegment(customerId: string): Promise<Customer | null> {
    const customer = await this.customerModel.findById(customerId).exec();
    if (!customer) return null;

    let segment: 'vip' | 'regular' | 'inactive' = 'regular';

    // VIP: > Ksh 50,000 lifetime
    if (customer.totalSpent > 50000) {
      segment = 'vip';
    }
    // Inactive: < Ksh 10,000 or no purchase in 90 days
    else if (
      customer.totalSpent < 10000 ||
      (customer.lastPurchaseDate &&
        new Date().getTime() - customer.lastPurchaseDate.getTime() >
          90 * 24 * 60 * 60 * 1000)
    ) {
      segment = 'inactive';
    }

    return this.customerModel
      .findByIdAndUpdate(customerId, { segment }, { new: true })
      .exec();
  }

  async getCustomerInsights(
    customerId: string,
  ): Promise<{
    totalSpent: number;
    purchaseCount: number;
    avgOrderValue: number;
    lastVisit: Date | null;
    segment: string;
  } | null> {
    const customer = await this.customerModel.findById(customerId).exec();
    if (!customer) return null;

    return {
      totalSpent: customer.totalSpent,
      purchaseCount: customer.totalPurchases,
      avgOrderValue:
        customer.totalPurchases > 0
          ? customer.totalSpent / customer.totalPurchases
          : 0,
      lastVisit: customer.lastVisit || customer.lastPurchaseDate || null,
      segment: customer.segment || 'regular',
    };
  }

  /**
   * Get comprehensive customer statistics including loyalty points and purchase history
   */
  async getCustomerFullStats(
    customerId: string,
    shopId: string,
  ): Promise<{
    customer: Customer | null;
    loyalty: {
      totalPoints: number;
      availablePoints: number;
      redeemedPoints: number;
      tier: string;
      memberSince: Date | null;
    } | null;
    purchaseStats: {
      totalOrders: number;
      totalSpent: number;
      avgOrderValue: number;
      lastOrderDate: Date | null;
      firstOrderDate: Date | null;
    };
    recentOrders: Array<{
      _id: string;
      orderNumber: string;
      total: number;
      itemCount: number;
      createdAt: Date;
      paymentMethod: string;
    }>;
  } | null> {
    const customer = await this.customerModel.findById(customerId).exec();
    if (!customer) return null;

    // Get loyalty account
    const loyaltyAccount = await this.loyaltyAccountModel
      .findOne({
        shopId: new Types.ObjectId(shopId),
        customerId: new Types.ObjectId(customerId),
      })
      .exec();

    // Get customer orders with aggregation for stats
    const ordersAggregation = await this.orderModel.aggregate([
      {
        $match: {
          shopId: new Types.ObjectId(shopId),
          customerId: new Types.ObjectId(customerId),
          status: { $in: ['completed', 'paid'] },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' },
          lastOrderDate: { $max: '$createdAt' },
          firstOrderDate: { $min: '$createdAt' },
        },
      },
    ]);

    const stats = ordersAggregation[0] || {
      totalOrders: 0,
      totalSpent: 0,
      avgOrderValue: 0,
      lastOrderDate: null,
      firstOrderDate: null,
    };

    // Get recent orders
    const recentOrders = await this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        customerId: new Types.ObjectId(customerId),
        status: { $in: ['completed', 'paid'] },
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber total items createdAt paymentMethod')
      .lean()
      .exec();

    return {
      customer,
      loyalty: loyaltyAccount
        ? {
            totalPoints: loyaltyAccount.totalPoints,
            availablePoints: loyaltyAccount.availablePoints,
            redeemedPoints: loyaltyAccount.redeemedPoints,
            tier: loyaltyAccount.tier,
            memberSince: (loyaltyAccount as any).createdAt || null,
          }
        : null,
      purchaseStats: {
        totalOrders: stats.totalOrders,
        totalSpent: Math.round(stats.totalSpent * 100) / 100,
        avgOrderValue: Math.round(stats.avgOrderValue * 100) / 100,
        lastOrderDate: stats.lastOrderDate,
        firstOrderDate: stats.firstOrderDate,
      },
      recentOrders: recentOrders.map((order: any) => ({
        _id: order._id.toString(),
        orderNumber: order.orderNumber || 'N/A',
        total: order.total,
        itemCount: order.items?.length || 0,
        createdAt: order.createdAt,
        paymentMethod: order.paymentMethod || 'cash',
      })),
    };
  }
}
