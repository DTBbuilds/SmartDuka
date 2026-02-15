import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument, NotificationType, NotificationChannel } from './notification.schema';
import { EmailService } from './email.service';

export interface CreateNotificationDto {
  shopId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  channels?: NotificationChannel[];
  data?: Record<string, any>;
  scheduledFor?: Date;
}

export interface NotificationPreferences {
  lowStockAlerts: boolean;
  dailyReports: boolean;
  weeklyReports: boolean;
  orderNotifications: boolean;
  paymentNotifications: boolean;
  subscriptionAlerts: boolean;
  emailEnabled: boolean;
  email?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreateNotificationDto): Promise<NotificationDocument> {
    const notification = new this.notificationModel({
      shopId: new Types.ObjectId(dto.shopId),
      userId: dto.userId ? new Types.ObjectId(dto.userId) : undefined,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      channels: dto.channels || ['in_app'],
      data: dto.data,
      scheduledFor: dto.scheduledFor,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    return notification.save();
  }

  async findByShop(
    shopId: string,
    options: { unreadOnly?: boolean; limit?: number; skip?: number } = {},
  ): Promise<NotificationDocument[]> {
    const query: any = { shopId: new Types.ObjectId(shopId) };
    
    if (options.unreadOnly) {
      query.read = false;
    }

    return this.notificationModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50)
      .exec();
  }

  async getUnreadCount(shopId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      shopId: new Types.ObjectId(shopId),
      read: false,
    });
  }

  async markAsRead(notificationId: string, shopId: string): Promise<NotificationDocument | null> {
    return this.notificationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        shopId: new Types.ObjectId(shopId),
      },
      { read: true, readAt: new Date() },
      { new: true },
    );
  }

  async markAllAsRead(shopId: string): Promise<number> {
    const result = await this.notificationModel.updateMany(
      { shopId: new Types.ObjectId(shopId), read: false },
      { read: true, readAt: new Date() },
    );
    return result.modifiedCount;
  }

  async delete(notificationId: string, shopId: string): Promise<boolean> {
    const result = await this.notificationModel.deleteOne({
      _id: new Types.ObjectId(notificationId),
      shopId: new Types.ObjectId(shopId),
    });
    return result.deletedCount > 0;
  }

  // Send low stock alert
  async sendLowStockAlert(
    shopId: string,
    shopName: string,
    email: string,
    products: Array<{ name: string; stock: number; reorderLevel: number }>,
  ): Promise<void> {
    // Create in-app notification
    await this.create({
      shopId,
      type: 'low_stock',
      title: 'Low Stock Alert',
      message: `${products.length} products are running low on stock`,
      channels: ['in_app', 'email'],
      data: { products },
    });

    // Send email
    const productList = products
      .map(p => `<li><strong>${p.name}</strong>: ${p.stock} remaining (reorder at ${p.reorderLevel})</li>`)
      .join('');

    await this.emailService.sendTemplateEmail({
      to: email,
      templateName: 'low_stock_alert',
      variables: {
        shopName,
        productCount: products.length,
        productList: `<ul>${productList}</ul>`,
        dashboardUrl: `${process.env.FRONTEND_URL || 'https://www.smartduka.org'}/admin/inventory`,
      },
    });
  }

  // Send daily sales report
  async sendDailySalesReport(
    shopId: string,
    shopName: string,
    email: string,
    data: {
      date: string;
      totalSales: number;
      orderCount: number;
      topProducts: Array<{ name: string; quantity: number; revenue: number }>;
    },
  ): Promise<void> {
    // Create in-app notification
    await this.create({
      shopId,
      type: 'daily_report',
      title: 'Daily Sales Report',
      message: `Sales for ${data.date}: KES ${data.totalSales.toLocaleString()} from ${data.orderCount} orders`,
      channels: ['in_app', 'email'],
      data,
    });

    // Format top products
    const topProductsHtml = data.topProducts.length > 0
      ? `<ol>${data.topProducts.map(p => 
          `<li>${p.name} - ${p.quantity} sold (KES ${p.revenue.toLocaleString()})</li>`
        ).join('')}</ol>`
      : '<p>No sales recorded today.</p>';

    // Send email
    await this.emailService.sendTemplateEmail({
      to: email,
      templateName: 'daily_sales_report',
      variables: {
        shopName,
        date: data.date,
        totalSales: data.totalSales.toLocaleString(),
        orderCount: data.orderCount,
        topProducts: topProductsHtml,
        dashboardUrl: `${process.env.FRONTEND_URL || 'https://www.smartduka.org'}/admin/analytics/sales`,
      },
    });
  }

  // Send subscription expiring alert
  async sendSubscriptionExpiringAlert(
    shopId: string,
    shopName: string,
    userName: string,
    email: string,
    planName: string,
    expiryDate: Date,
  ): Promise<void> {
    const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    // Create in-app notification
    await this.create({
      shopId,
      type: 'subscription_expiring',
      title: 'Subscription Expiring Soon',
      message: `Your ${planName} subscription expires in ${daysLeft} days`,
      channels: ['in_app', 'email'],
      data: { planName, expiryDate, daysLeft },
    });

    // Send email
    await this.emailService.sendTemplateEmail({
      to: email,
      templateName: 'subscription_expiring',
      variables: {
        shopName,
        userName,
        planName,
        expiryDate: expiryDate.toLocaleDateString('en-KE', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        daysLeft,
        renewUrl: `${process.env.FRONTEND_URL || 'https://www.smartduka.org'}/admin/subscription`,
      },
    });
  }

  // Seed email templates on startup
  async onModuleInit(): Promise<void> {
    await this.emailService.seedTemplates();
  }
}
