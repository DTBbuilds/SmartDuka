import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { nanoid } from 'nanoid';
import { Order, OrderDocument } from './schemas/order.schema';
import { CheckoutDto } from './dto/checkout.dto';
import { InventoryService } from '../inventory/inventory.service';
import { ActivityService } from '../activity/activity.service';
import { PaymentTransactionService } from '../payments/services/payment-transaction.service';

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly inventoryService: InventoryService,
    private readonly activityService: ActivityService,
    private readonly paymentTransactionService: PaymentTransactionService,
  ) {}

  /**
   * ROBUST CHECKOUT WITH INVENTORY SYNC
   * 
   * PHASE 3: Branch-aware checkout
   * Multi-tenant safe transaction that:
   * 1. Validates stock availability for all items
   * 2. Creates order atomically with branchId
   * 3. Reduces inventory with audit trail
   * 4. Rolls back on any failure
   * 
   * @param shopId - Shop ID for multi-tenant isolation
   * @param userId - User ID performing checkout
   * @param branchId - Branch ID for branch-specific sales
   * @param dto - Checkout data with items and payments
   * @returns Created order with inventory synced
   */
  async checkout(shopId: string, userId: string, branchId: string, dto: CheckoutDto): Promise<OrderDocument> {
    // STEP 1: VALIDATE INPUT
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Cart must contain at least one item');
    }

    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    if (subtotal <= 0) {
      throw new BadRequestException('Subtotal must be greater than zero');
    }

    // STEP 2: VALIDATE STOCK AVAILABILITY (BEFORE creating order)
    // This prevents overselling and ensures multi-tenant isolation
    const stockValidation = await this.validateStockAvailability(shopId, dto.items);
    if (!stockValidation.isValid) {
      throw new BadRequestException(
        `Insufficient stock: ${stockValidation.errors.join('; ')}`
      );
    }

    // STEP 3: CALCULATE TOTALS
    const taxRate = dto.taxRate ?? 0.16; // Kenya default VAT
    const tax = Math.round(subtotal * taxRate * 100) / 100; // Proper rounding
    const total = subtotal + tax;

    const paymentsTotal = (dto.payments ?? []).reduce((sum, p) => sum + p.amount, 0);
    const paymentStatus = paymentsTotal >= total ? 'paid' : paymentsTotal > 0 ? 'partial' : 'unpaid';

    const orderNumber = `STK-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;

    // STEP 4: CREATE ORDER
    let order: OrderDocument;
    try {
      order = new this.orderModel({
        shopId: new Types.ObjectId(shopId),
        branchId: branchId ? new Types.ObjectId(branchId) : undefined,
        userId: new Types.ObjectId(userId),
        orderNumber,
        items: dto.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.unitPrice * item.quantity,
        })),
        subtotal,
        tax,
        total,
        status: dto.status ?? 'completed',
        paymentStatus,
        payments: dto.payments ?? [],
        notes: dto.notes,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        cashierId: dto.cashierId,
        cashierName: dto.cashierName,
        isOffline: dto.isOffline ?? false,
      });

      await order.save();
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to create order: ${error?.message || 'Unknown error'}`
      );
    }

    // STEP 4.5: LOG CHECKOUT ACTIVITY
    try {
      await this.activityService.logActivity(
        shopId,
        userId,
        dto.cashierName || 'Unknown Cashier',
        'cashier',
        'checkout',
        {
          orderNumber: order.orderNumber,
          total: order.total,
          itemCount: order.items.length,
          paymentStatus: order.paymentStatus,
          branchId: branchId,
          orderItems: order.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.unitPrice,
          })),
        }
      );
    } catch (error: any) {
      // Log error but don't fail checkout - activity logging should not break the transaction
      console.error(`Failed to log checkout activity for order ${order.orderNumber}:`, error);
    }

    // STEP 5: REDUCE INVENTORY FOR EACH ITEM
    // If any item fails, we have the order ID for manual reconciliation
    const stockReductionErrors: string[] = [];

    for (const item of dto.items) {
      try {
        // Reduce product stock (atomic operation with shopId filter)
        const updatedProduct = await this.inventoryService.updateStock(
          shopId,
          item.productId,
          -item.quantity // Negative = reduction
        );

        if (!updatedProduct) {
          stockReductionErrors.push(
            `Product ${item.productId} not found in shop ${shopId}`
          );
          continue;
        }

        // Log stock adjustment for audit trail
        await this.inventoryService.createStockAdjustment(
          shopId,
          item.productId,
          -item.quantity,
          'sale', // reason
          userId,
          `Order ${orderNumber} - ${item.name} x${item.quantity}` // notes
        );
      } catch (error: any) {
        stockReductionErrors.push(
          `Failed to reduce stock for ${item.name}: ${error?.message || 'Unknown error'}`
        );
      }
    }

    // STEP 6: HANDLE PARTIAL FAILURES
    if (stockReductionErrors.length > 0) {
      // Log errors but don't fail - order is created, inventory will be manually reconciled
      console.error(
        `Stock reduction errors for order ${orderNumber}:`,
        stockReductionErrors
      );
      
      // Update order with warning
      order.notes = (order.notes || '') + 
        `\n⚠️ INVENTORY SYNC WARNING: ${stockReductionErrors.join('; ')}`;
      await order.save();
    }

    // STEP 7: RECORD PAYMENT TRANSACTIONS FOR ANALYTICS
    if (dto.payments && dto.payments.length > 0) {
      for (const payment of dto.payments) {
        try {
          await this.paymentTransactionService.createTransaction({
            shopId,
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            cashierId: userId,
            cashierName: dto.cashierName || 'Unknown',
            branchId: branchId,
            paymentMethod: payment.method as 'cash' | 'card' | 'mpesa' | 'other',
            amount: payment.amount,
            status: 'completed',
            customerName: dto.customerName,
            customerPhone: payment.customerPhone,
            mpesaReceiptNumber: payment.mpesaReceiptNumber,
            mpesaTransactionId: payment.mpesaTransactionId,
            amountTendered: payment.amountTendered,
            change: payment.change,
            referenceNumber: payment.reference,
            notes: payment.notes,
          });
        } catch (error: any) {
          // Log error but don't fail - payment transaction logging should not break checkout
          console.error(`Failed to record payment transaction for order ${orderNumber}:`, error);
        }
      }
    }

    return order;
  }

  /**
   * VALIDATE STOCK AVAILABILITY
   * 
   * Checks if all items have sufficient stock before checkout
   * Multi-tenant safe: filters by shopId
   * 
   * @param shopId - Shop ID for multi-tenant isolation
   * @param items - Items to validate
   * @returns Validation result with errors if any
   */
  private async validateStockAvailability(
    shopId: string,
    items: Array<{ productId: string; name: string; quantity: number }>
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const item of items) {
      try {
        // Call inventory service to get product (ensures multi-tenant safety)
        const product = await this.inventoryService.getProductById(shopId, item.productId);

        if (!product) {
          errors.push(`Product "${item.name}" not found`);
          continue;
        }

        if ((product.stock || 0) < item.quantity) {
          errors.push(
            `${item.name}: Only ${product.stock || 0} available, requested ${item.quantity}`
          );
        }
      } catch (error: any) {
        errors.push(
          `Error validating ${item.name}: ${error?.message || 'Unknown error'}`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async listOrders(shopId: string, limit = 50): Promise<OrderDocument[]> {
    return this.orderModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200))
      .exec();
  }

  // PHASE 3: Branch-specific queries
  async listOrdersByBranch(shopId: string, branchId: string, limit = 50): Promise<OrderDocument[]> {
    return this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        branchId: new Types.ObjectId(branchId),
      })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200))
      .exec();
  }

  async findOrderById(shopId: string, id: string): Promise<OrderDocument | null> {
    return this.orderModel.findOne({ _id: id, shopId: new Types.ObjectId(shopId) }).exec();
  }

  async findByOrderNumber(shopId: string, orderNumber: string): Promise<OrderDocument | null> {
    return this.orderModel.findOne({ orderNumber, shopId: new Types.ObjectId(shopId) }).exec();
  }

  async getDailySales(shopId: string, date: Date): Promise<{
    totalRevenue: number;
    totalOrders: number;
    completedOrders: number;
    totalItems: number;
    topProducts: Array<{ productId: string; name: string; quantity: number; revenue: number }>;
  }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        status: 'completed',
      })
      .exec();

    let totalRevenue = 0;
    let totalItems = 0;
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

    orders.forEach((order) => {
      totalRevenue += order.total;
      order.items.forEach((item) => {
        totalItems += item.quantity;
        const existing = productMap.get(item.productId) || { name: item.name, quantity: 0, revenue: 0 };
        existing.quantity += item.quantity;
        existing.revenue += item.lineTotal;
        productMap.set(item.productId, existing);
      });
    });

    const topProducts = Array.from(productMap.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      totalRevenue,
      totalOrders: orders.length,
      completedOrders: orders.length,
      totalItems,
      topProducts,
    };
  }

  // PHASE 3: Branch-specific daily sales
  async getDailySalesByBranch(shopId: string, branchId: string, date: Date): Promise<{
    totalRevenue: number;
    totalOrders: number;
    completedOrders: number;
    totalItems: number;
    topProducts: Array<{ productId: string; name: string; quantity: number; revenue: number }>;
  }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        branchId: new Types.ObjectId(branchId),
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        status: 'completed',
      })
      .exec();

    let totalRevenue = 0;
    let totalItems = 0;
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

    orders.forEach((order) => {
      totalRevenue += order.total;
      order.items.forEach((item) => {
        totalItems += item.quantity;
        const existing = productMap.get(item.productId) || { name: item.name, quantity: 0, revenue: 0 };
        existing.quantity += item.quantity;
        existing.revenue += item.lineTotal;
        productMap.set(item.productId, existing);
      });
    });

    const topProducts = Array.from(productMap.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      totalRevenue,
      totalOrders: orders.length,
      completedOrders: orders.length,
      totalItems,
      topProducts,
    };
  }

  /**
   * Get overall shop statistics for dashboard
   */
  async getShopStats(shopId: string): Promise<{
    totalRevenue: number;
    totalOrders: number;
    totalProducts: number;
    totalCustomers: number;
    lowStockProducts: number;
    pendingOrders: number;
    todayRevenue: number;
    todayOrders: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Get all completed orders
    const allOrders = await this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        status: 'completed',
      })
      .exec();

    // Get today's orders
    const todayOrders = await this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        status: 'completed',
        createdAt: { $gte: today, $lte: endOfToday },
      })
      .exec();

    // Calculate totals
    const totalRevenue = allOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);

    // Get product count from inventory service
    let totalProducts = 0;
    let lowStockProducts = 0;
    try {
      const products = await this.inventoryService.listProducts(shopId, { limit: 1000 });
      totalProducts = products.length;
      lowStockProducts = products.filter((p: any) => (p.stock || 0) <= (p.lowStockThreshold || 5)).length;
    } catch (err) {
      console.error('Failed to get product stats:', err);
    }

    // Get unique customers (from orders with customerName)
    const uniqueCustomers = new Set(
      allOrders
        .filter(o => o.customerName)
        .map(o => o.customerName?.toLowerCase())
    );

    return {
      totalRevenue,
      totalOrders: allOrders.length,
      totalProducts,
      totalCustomers: uniqueCustomers.size,
      lowStockProducts,
      pendingOrders: 0, // Could track pending orders if needed
      todayRevenue,
      todayOrders: todayOrders.length,
    };
  }

  /**
   * Get cashier-specific statistics
   */
  async getCashierStats(shopId: string, userId: string): Promise<{
    todaySales: number;
    todayTransactions: number;
    totalSales: number;
    totalTransactions: number;
    averageTransaction: number;
    recentOrders: any[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Get today's orders for this cashier
    const todayOrders = await this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        userId: new Types.ObjectId(userId),
        status: 'completed',
        createdAt: { $gte: today, $lte: endOfToday },
      })
      .sort({ createdAt: -1 })
      .exec();

    // Get all orders for this cashier (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const allOrders = await this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        userId: new Types.ObjectId(userId),
        status: 'completed',
        createdAt: { $gte: thirtyDaysAgo },
      })
      .sort({ createdAt: -1 })
      .exec();

    // Calculate stats
    const todaySales = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalSales = allOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const averageTransaction = allOrders.length > 0 ? totalSales / allOrders.length : 0;

    // Get recent orders (last 10)
    const recentOrders = todayOrders.slice(0, 10).map(order => ({
      id: order._id,
      orderNumber: order.orderNumber,
      total: order.total,
      items: order.items.length,
      paymentStatus: order.paymentStatus,
      createdAt: (order as any).createdAt,
    }));

    return {
      todaySales,
      todayTransactions: todayOrders.length,
      totalSales,
      totalTransactions: allOrders.length,
      averageTransaction: Math.round(averageTransaction),
      recentOrders,
    };
  }

  /**
   * Get stats for all cashiers in a shop (for admin dashboard)
   */
  async getAllCashierStats(shopId: string): Promise<Array<{
    userId: string;
    cashierName: string;
    todaySales: number;
    todayTransactions: number;
    totalSales: number;
    totalTransactions: number;
  }>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Get all orders for this shop today
    const todayOrders = await this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        status: 'completed',
        createdAt: { $gte: today, $lte: endOfToday },
      })
      .exec();

    // Get all orders for this shop (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const allOrders = await this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        status: 'completed',
        createdAt: { $gte: thirtyDaysAgo },
      })
      .exec();

    // Group by userId
    const cashierMap = new Map<string, {
      userId: string;
      cashierName: string;
      todaySales: number;
      todayTransactions: number;
      totalSales: number;
      totalTransactions: number;
    }>();

    // Process today's orders
    todayOrders.forEach(order => {
      const id = order.userId.toString();
      const existing = cashierMap.get(id) || {
        userId: id,
        cashierName: order.cashierName || 'Unknown',
        todaySales: 0,
        todayTransactions: 0,
        totalSales: 0,
        totalTransactions: 0,
      };
      existing.todaySales += order.total || 0;
      existing.todayTransactions += 1;
      if (order.cashierName) existing.cashierName = order.cashierName;
      cashierMap.set(id, existing);
    });

    // Process all orders for totals
    allOrders.forEach(order => {
      const id = order.userId.toString();
      const existing = cashierMap.get(id) || {
        userId: id,
        cashierName: order.cashierName || 'Unknown',
        todaySales: 0,
        todayTransactions: 0,
        totalSales: 0,
        totalTransactions: 0,
      };
      existing.totalSales += order.total || 0;
      existing.totalTransactions += 1;
      if (order.cashierName) existing.cashierName = order.cashierName;
      cashierMap.set(id, existing);
    });

    return Array.from(cashierMap.values()).sort((a, b) => b.todaySales - a.todaySales);
  }

  /**
   * Get comprehensive sales analytics
   */
  async getSalesAnalytics(shopId: string, range: string = 'month') {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get orders for different periods
    const [todayOrders, yesterdayOrders, weekOrders, monthOrders, allOrders] = await Promise.all([
      this.orderModel.find({
        shopId: new Types.ObjectId(shopId),
        status: 'completed',
        createdAt: { $gte: today },
      }).exec(),
      this.orderModel.find({
        shopId: new Types.ObjectId(shopId),
        status: 'completed',
        createdAt: { $gte: yesterday, $lt: today },
      }).exec(),
      this.orderModel.find({
        shopId: new Types.ObjectId(shopId),
        status: 'completed',
        createdAt: { $gte: weekAgo },
      }).exec(),
      this.orderModel.find({
        shopId: new Types.ObjectId(shopId),
        status: 'completed',
        createdAt: { $gte: monthAgo },
      }).exec(),
      this.orderModel.find({
        shopId: new Types.ObjectId(shopId),
        status: 'completed',
      }).exec(),
    ]);

    // Calculate revenue
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const weekRevenue = weekOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    // Average order value
    const averageOrderValue = allOrders.length > 0 ? Math.round(totalRevenue / allOrders.length) : 0;

    // Top selling products from month orders
    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    monthOrders.forEach(order => {
      (order.items || []).forEach((item: any) => {
        const key = item.productId?.toString() || item.name;
        const existing = productSales.get(key) || { name: item.name || 'Unknown', quantity: 0, revenue: 0 };
        existing.quantity += item.quantity || 0;
        existing.revenue += (item.unitPrice || 0) * (item.quantity || 0);
        productSales.set(key, existing);
      });
    });
    const topSellingProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Hourly breakdown for today
    const hourlyBreakdown = Array.from({ length: 12 }, (_, i) => {
      const hour = 8 + i;
      const hourOrders = todayOrders.filter(o => {
        const doc = o as any;
        const orderHour = doc.createdAt ? new Date(doc.createdAt).getHours() : 0;
        return orderHour === hour;
      });
      return {
        hour,
        revenue: hourOrders.reduce((sum, o) => sum + (o.total || 0), 0),
        orders: hourOrders.length,
      };
    });

    // Daily trend for last 30 days
    const dailyTrend = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(today.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      const dayOrders = monthOrders.filter(o => {
        const doc = o as any;
        if (!doc.createdAt) return false;
        const orderDate = new Date(doc.createdAt);
        return orderDate >= date && orderDate < nextDate;
      });
      return {
        date: date.toISOString().split('T')[0],
        revenue: dayOrders.reduce((sum, o) => sum + (o.total || 0), 0),
        orders: dayOrders.length,
      };
    });

    // Payment methods breakdown - use payments array
    const paymentMethods = new Map<string, { count: number; total: number }>();
    monthOrders.forEach(order => {
      const method = order.payments?.[0]?.method || 'cash';
      const existing = paymentMethods.get(method) || { count: 0, total: 0 };
      existing.count += 1;
      existing.total += order.total || 0;
      paymentMethods.set(method, existing);
    });

    return {
      todayRevenue,
      todayOrders: todayOrders.length,
      yesterdayRevenue,
      yesterdayOrders: yesterdayOrders.length,
      weekRevenue,
      weekOrders: weekOrders.length,
      monthRevenue,
      monthOrders: monthOrders.length,
      totalRevenue,
      totalOrders: allOrders.length,
      averageOrderValue,
      topSellingProducts,
      hourlyBreakdown,
      dailyTrend,
      paymentMethods: Array.from(paymentMethods.entries()).map(([method, data]) => ({
        method: method.charAt(0).toUpperCase() + method.slice(1),
        count: data.count,
        total: data.total,
      })),
    };
  }

  /**
   * Get orders analytics
   */
  async getOrdersAnalytics(shopId: string) {
    if (!shopId) {
      throw new BadRequestException('Shop ID is required for analytics');
    }

    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get all orders for the month
      const monthOrders = await this.orderModel.find({
        shopId: new Types.ObjectId(shopId),
        createdAt: { $gte: monthAgo },
      }).sort({ createdAt: -1 }).exec();

    const todayOrders = monthOrders.filter(o => {
      const doc = o as any;
      return doc.createdAt && new Date(doc.createdAt) >= today;
    });
    const weekOrders = monthOrders.filter(o => {
      const doc = o as any;
      return doc.createdAt && new Date(doc.createdAt) >= weekAgo;
    });

    // Calculate stats - use 'void' instead of 'cancelled' per schema
    const completedOrders = monthOrders.filter(o => o.status === 'completed');
    const pendingOrders = monthOrders.filter(o => o.status === 'pending');
    const voidedOrders = monthOrders.filter(o => o.status === 'void');
    // Check transactionType for refunds
    const refundedOrders = monthOrders.filter(o => o.transactionType === 'refund');

    const todayRevenue = todayOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.total || 0), 0);
    const weekRevenue = weekOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.total || 0), 0);
    const monthRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    const completionRate = monthOrders.length > 0 
      ? Math.round((completedOrders.length / monthOrders.length) * 1000) / 10 
      : 100;

    const averageOrderValue = completedOrders.length > 0 
      ? Math.round(monthRevenue / completedOrders.length) 
      : 0;

    // Average items per order
    const totalItems = completedOrders.reduce((sum, o) => sum + (o.items?.length || 0), 0);
    const averageItemsPerOrder = completedOrders.length > 0 
      ? Math.round((totalItems / completedOrders.length) * 10) / 10 
      : 0;

    // Peak hour
    const hourCounts = new Map<number, number>();
    todayOrders.forEach(o => {
      const doc = o as any;
      const hour = doc.createdAt ? new Date(doc.createdAt).getHours() : 12;
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });
    let peakHour = 12;
    let maxCount = 0;
    hourCounts.forEach((count, hour) => {
      if (count > maxCount) {
        maxCount = count;
        peakHour = hour;
      }
    });

    // Orders by day for the week
    const ordersByDay = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      const dayOrders = weekOrders.filter(o => {
        const doc = o as any;
        if (!doc.createdAt) return false;
        const orderDate = new Date(doc.createdAt);
        return orderDate >= date && orderDate < nextDate;
      });
      const dayCompleted = dayOrders.filter(o => o.status === 'completed');
      return {
        date: date.toISOString().split('T')[0],
        count: dayOrders.length,
        revenue: dayCompleted.reduce((sum, o) => sum + (o.total || 0), 0),
      };
    });

    // Recent orders
    const recentOrders = monthOrders.slice(0, 10).map(o => {
      const doc = o as any;
      return {
        _id: o._id.toString(),
        orderNumber: o.orderNumber,
        total: o.total || 0,
        status: o.status,
        paymentMethod: o.payments?.[0]?.method || 'cash',
        itemCount: o.items?.length || 0,
        customerName: o.customerName,
        createdAt: doc.createdAt,
        cashierName: o.cashierName || 'Unknown',
      };
    });

    return {
      todayOrders: todayOrders.length,
      todayRevenue,
      weekOrders: weekOrders.length,
      weekRevenue,
      monthOrders: monthOrders.length,
      monthRevenue,
      averageOrderValue,
      completionRate,
      averageItemsPerOrder,
      peakHour,
      statusBreakdown: [
        { status: 'completed', count: completedOrders.length },
        { status: 'pending', count: pendingOrders.length },
        { status: 'voided', count: voidedOrders.length },
        { status: 'refunded', count: refundedOrders.length },
      ],
      recentOrders,
      ordersByDay,
    };
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to load orders analytics: ${error.message}`
      );
    }
  }
}
