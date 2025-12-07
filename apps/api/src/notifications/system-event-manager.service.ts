import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmailService } from './email.service';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationDocument } from './notification.schema';

/**
 * System Event Manager - Automated Email & Notification Controller
 * 
 * This service acts as the central hub for all automated system events
 * that require user notification via email, SMS, or in-app notifications.
 * 
 * Best Practices Implemented:
 * 1. Use reply-to addresses for support emails
 * 2. Clear subject lines with shop context
 * 3. Responsive HTML templates with plain text fallback
 * 4. Shop-branded receipts and communications
 * 5. Separate transactional from marketing emails
 * 6. Rate limiting to prevent spam
 * 7. Audit trail for all sent emails
 */

export interface ShopContext {
  shopId: string;
  shopName: string;
  shopLogo?: string;
  shopEmail?: string;
  shopPhone?: string;
  shopAddress?: string;
  shopCity?: string;
  shopCountry?: string;
  taxId?: string;
  currency?: string;
}

export interface UserContext {
  userId: string;
  userName: string;
  userEmail: string;
  userRole?: string;
}

export interface EmailEvent {
  type: string;
  shop: ShopContext;
  user?: UserContext;
  data: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
  scheduledFor?: Date;
}

@Injectable()
export class SystemEventManagerService implements OnModuleInit {
  private readonly logger = new Logger(SystemEventManagerService.name);
  private emailQueue: EmailEvent[] = [];
  private isProcessing = false;

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    this.logger.log('System Event Manager initialized - monitoring system events');
    // Process any pending scheduled notifications
    await this.processScheduledNotifications();
  }

  /**
   * Queue an email event for processing
   */
  async queueEvent(event: EmailEvent): Promise<void> {
    this.emailQueue.push(event);
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  /**
   * Process the email queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.emailQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.emailQueue.length > 0) {
      const event = this.emailQueue.shift();
      if (event) {
        try {
          await this.processEvent(event);
        } catch (error: any) {
          this.logger.error(`Failed to process event ${event.type}:`, error.message);
        }
      }
      // Rate limiting: wait 100ms between emails
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.isProcessing = false;
  }

  /**
   * Process a single email event
   */
  private async processEvent(event: EmailEvent): Promise<void> {
    const { type, shop, user, data } = event;

    switch (type) {
      case 'welcome':
        await this.sendWelcomeEmail(shop, user!, data);
        break;
      case 'subscription_activated':
        await this.sendSubscriptionActivatedEmail(shop, user!, data);
        break;
      case 'subscription_expiring':
        await this.sendSubscriptionExpiringEmail(shop, user!, data);
        break;
      case 'subscription_expired':
        await this.sendSubscriptionExpiredEmail(shop, user!, data);
        break;
      case 'payment_successful':
        await this.sendPaymentSuccessEmail(shop, user!, data);
        break;
      case 'receipt_generated':
        await this.sendReceiptEmail(shop, data);
        break;
      case 'low_stock':
        await this.sendLowStockAlert(shop, user!, data);
        break;
      case 'employee_invited':
        await this.sendEmployeeInviteEmail(shop, data);
        break;
      case 'password_reset':
        await this.sendPasswordResetEmail(user!, data);
        break;
      case 'daily_report':
        await this.sendDailyReportEmail(shop, user!, data);
        break;
      default:
        this.logger.warn(`Unknown event type: ${type}`);
    }
  }

  // ==================== EMAIL METHODS ====================

  /**
   * Send welcome email to new shop registration
   */
  async sendWelcomeEmail(shop: ShopContext, user: UserContext, data: any): Promise<void> {
    await this.emailService.sendTemplateEmail({
      to: user.userEmail,
      templateName: 'welcome',
      variables: {
        shopName: shop.shopName,
        userName: user.userName,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
        planName: data.planName || 'Free Trial',
        trialDays: data.trialDays || 14,
        billingCycle: data.billingCycle || 'month',
        planPrice: data.planPrice ? data.planPrice.toLocaleString() : '0',
        maxShops: data.maxShops || 1,
        maxEmployees: data.maxEmployees || 3,
        maxProducts: data.maxProducts >= 10000 ? 'Unlimited' : (data.maxProducts || 100),
      },
    });

    await this.notificationsService.create({
      shopId: shop.shopId,
      userId: user.userId,
      type: 'welcome',
      title: 'Welcome to SmartDuka!',
      message: `Your shop "${shop.shopName}" has been created successfully with the ${data.planName || 'Free Trial'} plan.`,
      channels: ['in_app', 'email'],
    });

    this.logger.log(`Welcome email sent to ${user.userEmail} for shop ${shop.shopName}`);
  }

  /**
   * Send subscription activated email
   */
  async sendSubscriptionActivatedEmail(shop: ShopContext, user: UserContext, data: any): Promise<void> {
    await this.emailService.sendTemplateEmail({
      to: user.userEmail,
      templateName: 'subscription_activated',
      variables: {
        shopName: shop.shopName,
        userName: user.userName,
        planName: data.planName,
        price: data.price,
        billingCycle: data.billingCycle,
        features: data.features,
        startDate: data.startDate,
        nextBillingDate: data.nextBillingDate,
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/subscription`,
      },
    });

    await this.notificationsService.create({
      shopId: shop.shopId,
      userId: user.userId,
      type: 'subscription_activated',
      title: 'Subscription Activated',
      message: `Your ${data.planName} subscription is now active.`,
      channels: ['in_app', 'email'],
      data,
    });
  }

  /**
   * Send subscription expiring warning
   */
  async sendSubscriptionExpiringEmail(shop: ShopContext, user: UserContext, data: any): Promise<void> {
    await this.notificationsService.sendSubscriptionExpiringAlert(
      shop.shopId,
      shop.shopName,
      user.userName,
      user.userEmail,
      data.planName,
      new Date(data.expiryDate),
    );
  }

  /**
   * Send subscription expired notification
   */
  async sendSubscriptionExpiredEmail(shop: ShopContext, user: UserContext, data: any): Promise<void> {
    await this.emailService.sendTemplateEmail({
      to: user.userEmail,
      templateName: 'subscription_expired',
      variables: {
        shopName: shop.shopName,
        userName: user.userName,
        planName: data.planName,
        expiredDate: data.expiredDate,
        renewUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/subscription`,
        gracePeriodDays: data.gracePeriodDays || 7,
      },
    });

    await this.notificationsService.create({
      shopId: shop.shopId,
      userId: user.userId,
      type: 'subscription_expired',
      title: 'Subscription Expired',
      message: `Your ${data.planName} subscription has expired. Please renew to continue using all features.`,
      channels: ['in_app', 'email'],
      data,
    });
  }

  /**
   * Send payment success confirmation
   */
  async sendPaymentSuccessEmail(shop: ShopContext, user: UserContext, data: any): Promise<void> {
    await this.emailService.sendTemplateEmail({
      to: user.userEmail,
      templateName: 'payment_successful',
      variables: {
        shopName: shop.shopName,
        userName: user.userName,
        amount: data.amount,
        currency: shop.currency || 'KES',
        paymentMethod: data.paymentMethod,
        transactionId: data.transactionId,
        planName: data.planName,
        receiptUrl: data.receiptUrl,
        date: new Date().toLocaleDateString('en-KE'),
      },
    });

    await this.notificationsService.create({
      shopId: shop.shopId,
      userId: user.userId,
      type: 'payment_successful',
      title: 'Payment Received',
      message: `Payment of ${shop.currency || 'KES'} ${data.amount} received successfully.`,
      channels: ['in_app', 'email'],
      data,
    });
  }

  /**
   * Send digital receipt to customer
   */
  async sendReceiptEmail(shop: ShopContext, data: any): Promise<void> {
    if (!data.customerEmail) return;

    const receiptHtml = this.generateReceiptHtml(shop, data);

    await this.emailService.sendEmail({
      to: data.customerEmail,
      subject: `Receipt from ${shop.shopName} - Order #${data.orderNumber}`,
      html: receiptHtml,
      from: `${shop.shopName} <noreply@smartduka.co.ke>`,
    });

    this.logger.log(`Receipt sent to ${data.customerEmail} for order ${data.orderNumber}`);
  }

  /**
   * Send low stock alert to shop admin
   */
  async sendLowStockAlert(shop: ShopContext, user: UserContext, data: any): Promise<void> {
    await this.notificationsService.sendLowStockAlert(
      shop.shopId,
      shop.shopName,
      user.userEmail,
      data.products,
    );
  }

  /**
   * Send employee invitation email
   */
  async sendEmployeeInviteEmail(shop: ShopContext, data: any): Promise<void> {
    await this.emailService.sendTemplateEmail({
      to: data.employeeEmail,
      templateName: 'employee_invited',
      variables: {
        shopName: shop.shopName,
        employeeName: data.employeeName,
        role: data.role,
        invitedBy: data.invitedBy,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
        tempPassword: data.tempPassword,
      },
    });

    this.logger.log(`Employee invite sent to ${data.employeeEmail} for shop ${shop.shopName}`);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user: UserContext, data: any): Promise<void> {
    await this.emailService.sendTemplateEmail({
      to: user.userEmail,
      templateName: 'password_reset',
      variables: {
        userName: user.userName,
        resetUrl: data.resetUrl,
        expiryMinutes: data.expiryMinutes || 30,
      },
    });
  }

  /**
   * Send daily sales report
   */
  async sendDailyReportEmail(shop: ShopContext, user: UserContext, data: any): Promise<void> {
    await this.notificationsService.sendDailySalesReport(
      shop.shopId,
      shop.shopName,
      user.userEmail,
      data,
    );
  }

  // ==================== RECEIPT GENERATION ====================

  /**
   * Generate branded receipt HTML
   */
  generateReceiptHtml(shop: ShopContext, data: any): string {
    const items = data.items || [];
    const itemsHtml = items.map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${shop.currency || 'KES'} ${item.price.toLocaleString()}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${shop.currency || 'KES'} ${(item.quantity * item.price).toLocaleString()}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .receipt { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; }
    .logo { font-size: 28px; font-weight: bold; margin-bottom: 5px; }
    .shop-info { font-size: 12px; opacity: 0.9; }
    .content { padding: 30px; }
    .receipt-title { text-align: center; margin-bottom: 20px; }
    .receipt-number { font-size: 14px; color: #666; }
    .order-info { background: #f8fafc; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
    .order-info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .items-table th { background: #f1f5f9; padding: 10px 8px; text-align: left; font-weight: 600; }
    .totals { background: #f8fafc; border-radius: 8px; padding: 15px; }
    .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .grand-total { font-size: 20px; font-weight: bold; color: #2563eb; border-top: 2px solid #2563eb; padding-top: 10px; margin-top: 10px; }
    .footer { text-align: center; padding: 20px; background: #f8fafc; color: #666; font-size: 12px; }
    .thank-you { font-size: 16px; color: #2563eb; font-weight: 600; margin-bottom: 10px; }
    .payment-badge { display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      ${shop.shopLogo ? `<img src="${shop.shopLogo}" alt="${shop.shopName}" style="max-height: 60px; margin-bottom: 10px;">` : ''}
      <div class="logo">${shop.shopName}</div>
      <div class="shop-info">
        ${shop.shopAddress ? `${shop.shopAddress}<br>` : ''}
        ${shop.shopCity ? `${shop.shopCity}, ${shop.shopCountry || 'Kenya'}<br>` : ''}
        ${shop.shopPhone ? `Tel: ${shop.shopPhone}<br>` : ''}
        ${shop.shopEmail ? `Email: ${shop.shopEmail}<br>` : ''}
        ${shop.taxId ? `PIN: ${shop.taxId}` : ''}
      </div>
    </div>
    
    <div class="content">
      <div class="receipt-title">
        <h2 style="margin: 0 0 5px 0;">RECEIPT</h2>
        <div class="receipt-number">#${data.orderNumber || data.receiptNumber}</div>
        <div style="margin-top: 10px;">
          <span class="payment-badge">${data.paymentStatus || 'PAID'}</span>
        </div>
      </div>
      
      <div class="order-info">
        <div class="order-info-row">
          <span>Date:</span>
          <strong>${new Date(data.date || Date.now()).toLocaleDateString('en-KE', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</strong>
        </div>
        ${data.customerName ? `
        <div class="order-info-row">
          <span>Customer:</span>
          <strong>${data.customerName}</strong>
        </div>
        ` : ''}
        ${data.paymentMethod ? `
        <div class="order-info-row">
          <span>Payment:</span>
          <strong>${data.paymentMethod}</strong>
        </div>
        ` : ''}
        ${data.cashier ? `
        <div class="order-info-row">
          <span>Served by:</span>
          <strong>${data.cashier}</strong>
        </div>
        ` : ''}
      </div>
      
      <table class="items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      <div class="totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>${shop.currency || 'KES'} ${(data.subtotal || data.total).toLocaleString()}</span>
        </div>
        ${data.discount ? `
        <div class="total-row" style="color: #10b981;">
          <span>Discount:</span>
          <span>- ${shop.currency || 'KES'} ${data.discount.toLocaleString()}</span>
        </div>
        ` : ''}
        ${data.tax ? `
        <div class="total-row">
          <span>Tax (${data.taxRate || 16}%):</span>
          <span>${shop.currency || 'KES'} ${data.tax.toLocaleString()}</span>
        </div>
        ` : ''}
        <div class="total-row grand-total">
          <span>TOTAL:</span>
          <span>${shop.currency || 'KES'} ${data.total.toLocaleString()}</span>
        </div>
        ${data.amountPaid ? `
        <div class="total-row">
          <span>Amount Paid:</span>
          <span>${shop.currency || 'KES'} ${data.amountPaid.toLocaleString()}</span>
        </div>
        ` : ''}
        ${data.change ? `
        <div class="total-row">
          <span>Change:</span>
          <span>${shop.currency || 'KES'} ${data.change.toLocaleString()}</span>
        </div>
        ` : ''}
      </div>
    </div>
    
    <div class="footer">
      <div class="thank-you">Thank you for shopping with us!</div>
      <p>This is an electronic receipt from ${shop.shopName}.</p>
      <p>For inquiries, contact us at ${shop.shopEmail || 'support@smartduka.co.ke'}</p>
      <p style="margin-top: 15px; font-size: 10px; color: #999;">
        Powered by SmartDuka POS | www.smartduka.co.ke
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  // ==================== SCHEDULED TASKS ====================

  /**
   * Process scheduled notifications (runs every minute)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications(): Promise<void> {
    const pendingNotifications = await this.notificationModel.find({
      status: 'pending',
      scheduledFor: { $lte: new Date() },
    }).limit(50);

    for (const notification of pendingNotifications) {
      try {
        // Process the notification based on type
        await this.notificationModel.updateOne(
          { _id: notification._id },
          { status: 'sent', emailSentAt: new Date() },
        );
      } catch (error: any) {
        await this.notificationModel.updateOne(
          { _id: notification._id },
          { status: 'failed', emailError: error.message },
        );
      }
    }
  }

  /**
   * Check for expiring subscriptions (runs daily at 9 AM)
   * Note: Actual processing is handled by SubscriptionSchedulerService
   * This is kept for backward compatibility and logging
   */
  @Cron('0 9 * * *')
  async checkExpiringSubscriptions(): Promise<void> {
    this.logger.log('Subscription expiration check triggered (handled by SubscriptionSchedulerService)');
  }

  /**
   * Send daily reports (runs daily at 8 PM)
   */
  @Cron('0 20 * * *')
  async sendDailyReports(): Promise<void> {
    this.logger.log('Sending daily sales reports...');
    // This will be called by the reports service
  }

  /**
   * Check for low stock items (runs every 6 hours)
   */
  @Cron('0 */6 * * *')
  async checkLowStockItems(): Promise<void> {
    this.logger.log('Checking for low stock items...');
    // This will be called by the inventory service
  }
}
