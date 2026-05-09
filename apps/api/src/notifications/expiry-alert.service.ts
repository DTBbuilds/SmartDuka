import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../inventory/schemas/product.schema';
import { Shop, ShopDocument } from '../shops/schemas/shop.schema';
import { EmailService } from './email.service';
import { ExpiryTrackingService } from '../inventory/services/expiry-tracking.service';

interface ExpiryAlert {
  shopId: string;
  shopName: string;
  shopEmail: string;
  critical: number;
  warning: number;
  upcoming: number;
  expired: number;
  totalValueAtRisk: number;
  products: Array<{
    name: string;
    sku: string;
    batchNumber?: string;
    expiryDate: Date;
    daysUntilExpiry: number;
    stock: number;
    cost: number;
    status: 'expired' | 'critical' | 'warning' | 'upcoming';
  }>;
}

@Injectable()
export class ExpiryAlertService {
  private readonly logger = new Logger(ExpiryAlertService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Shop.name) private shopModel: Model<ShopDocument>,
    private emailService: EmailService,
    private expiryService: ExpiryTrackingService,
  ) {}

  /**
   * Daily cron job to check for expiring products and send alerts
   * Runs every day at 8 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleDailyExpiryCheck() {
    this.logger.log('Starting daily expiry check...');

    try {
      // Get all shops with expiry tracking enabled
      const shops = await this.getShopsWithExpiryTracking();
      
      for (const shop of shops) {
        try {
          await this.processShopExpiryAlerts(shop);
        } catch (error) {
          this.logger.error(`Failed to process expiry alerts for shop ${shop._id}: ${error.message}`);
        }
      }

      this.logger.log(`Daily expiry check completed. Processed ${shops.length} shops.`);
    } catch (error) {
      this.logger.error(`Daily expiry check failed: ${error.message}`);
    }
  }

  /**
   * Hourly check for critical items (expires within 24 hours)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyCriticalCheck() {
    this.logger.log('Starting hourly critical expiry check...');

    try {
      const shops = await this.getShopsWithExpiryTracking();
      
      for (const shop of shops) {
        const criticalProducts = await this.expiryService.getProductsExpiringWithinDays(
          shop._id.toString(),
          1, // Within 1 day
        );

        if (criticalProducts.length > 0) {
          // Send immediate critical alert
          await this.sendCriticalAlert(shop, criticalProducts);
        }
      }
    } catch (error) {
      this.logger.error(`Hourly critical check failed: ${error.message}`);
    }
  }

  /**
   * Weekly summary report - every Monday at 9 AM
   */
  @Cron('0 9 * * 1') // Monday at 9 AM
  async handleWeeklyExpirySummary() {
    this.logger.log('Starting weekly expiry summary...');

    try {
      const shops = await this.getShopsWithExpiryTracking();
      
      for (const shop of shops) {
        const { stats, products } = await this.expiryService.getExpiringProducts(
          shop._id.toString(),
        );

        if (stats.total > 0) {
          await this.sendWeeklySummary(shop, stats, products);
        }
      }
    } catch (error) {
      this.logger.error(`Weekly summary failed: ${error.message}`);
    }
  }

  /**
   * Get shops that have expiry tracking enabled
   */
  private async getShopsWithExpiryTracking(): Promise<any[]> {
    const businessTypesRequiringExpiry = [
      'pharmacy',
      'chemist',
      'grocery',
      'supermarket',
      'mini_supermarket',
      'butchery',
      'bakery',
      'restaurant',
      'coffee',
      'pet_shop',
      'agro_vet',
      'beauty_cosmetics',
    ];

    return this.shopModel.find({
      status: { $in: ['active', 'verified'] },
      businessType: { $in: businessTypesRequiringExpiry },
    }).lean();
  }

  /**
   * Process expiry alerts for a single shop
   */
  private async processShopExpiryAlerts(shop: ShopDocument) {
    const { stats, products } = await this.expiryService.getExpiringProducts(
      shop._id.toString(),
    );

    // Only send if there are items at risk
    if (stats.total === 0) {
      return;
    }

    // Filter products that need attention
    const alertProducts = products.filter(
      p => p.status === 'expired' || p.status === 'critical' || p.status === 'warning'
    );

    if (alertProducts.length === 0) {
      return;
    }

    const alert: ExpiryAlert = {
      shopId: shop._id.toString(),
      shopName: shop.name,
      shopEmail: shop.email,
      critical: stats.critical,
      warning: stats.warning,
      upcoming: stats.upcoming,
      expired: stats.expired,
      totalValueAtRisk: stats.valueAtRisk,
      products: alertProducts.slice(0, 20), // Limit to 20 products in email
    };

    await this.sendExpiryAlertEmail(alert);
  }

  /**
   * Send daily expiry alert email
   */
  private async sendExpiryAlertEmail(alert: ExpiryAlert) {
    const subject = `⚠️ ${alert.expired > 0 ? 'URGENT: ' : ''}Daily Expiry Alert - ${alert.shopName}`;
    
    const expiredSection = alert.expired > 0 ? `
      <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 12px; margin: 12px 0;">
        <h3 style="color: #dc2626; margin: 0;">🔴 ${alert.expired} Expired Products - Action Required</h3>
        <p style="margin: 8px 0 0 0;">These products should be removed from shelves immediately.</p>
      </div>
    ` : '';

    const criticalSection = alert.critical > 0 ? `
      <div style="background: #ffedd5; border-left: 4px solid #ea580c; padding: 12px; margin: 12px 0;">
        <h3 style="color: #ea580c; margin: 0;">🟠 ${alert.critical} Critical (≤7 days)</h3>
        <p style="margin: 8px 0 0 0;">Consider discounting these items to sell quickly.</p>
      </div>
    ` : '';

    const warningSection = alert.warning > 0 ? `
      <div style="background: #fef9c3; border-left: 4px solid #ca8a04; padding: 12px; margin: 12px 0;">
        <h3 style="color: #ca8a04; margin: 0;">🟡 ${alert.warning} Warning (≤30 days)</h3>
        <p style="margin: 8px 0 0 0;">Plan promotions or bundle with faster-moving items.</p>
      </div>
    ` : '';

    const productsTable = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Product</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Expiry</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Stock</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Value</th>
          </tr>
        </thead>
        <tbody>
          ${alert.products.map(p => `
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px;">
                <strong>${p.name}</strong><br>
                <small style="color: #6b7280;">${p.sku}${p.batchNumber ? ` • Batch: ${p.batchNumber}` : ''}</small>
              </td>
              <td style="padding: 12px;">
                <span style="color: ${p.status === 'expired' ? '#dc2626' : p.status === 'critical' ? '#ea580c' : '#ca8a04'};">
                  ${p.expiryDate.toLocaleDateString()}
                  ${p.daysUntilExpiry < 0 ? `(${Math.abs(p.daysUntilExpiry)} days ago)` : `(${p.daysUntilExpiry} days)`}
                </span>
              </td>
              <td style="padding: 12px; text-align: right;">${p.stock} units</td>
              <td style="padding: 12px; text-align: right;">KSh ${(p.cost * p.stock).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">
          📦 Inventory Expiry Alert
        </h2>
        
        <p style="color: #374151; font-size: 16px;">
          Hello ${alert.shopName} Team,
        </p>
        
        <p style="color: #374151;">
          You have <strong>${alert.products.length} products</strong> requiring attention.
          Total value at risk: <strong style="color: #dc2626;">KSh ${alert.totalValueAtRisk.toLocaleString()}</strong>
        </p>

        ${expiredSection}
        ${criticalSection}
        ${warningSection}

        <h3 style="margin-top: 24px; color: #111827;">Products Requiring Action:</h3>
        ${productsTable}

        ${alert.products.length >= 20 ? `
          <p style="color: #6b7280; font-style: italic; margin-top: 12px;">
            Showing first 20 products. View all in your dashboard.
          </p>
        ` : ''}

        <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 12px; margin: 24px 0;">
          <h4 style="color: #2563eb; margin: 0 0 8px 0;">💡 Recommended Actions:</h4>
          <ul style="margin: 0; padding-left: 20px; color: #374151;">
            <li>Review FEFO (First Expired First Out) inventory placement</li>
            <li>Create discount promotions for items nearing expiry</li>
            <li>Bundle slow-moving items with popular products</li>
            <li>Contact suppliers for possible returns (if within policy)</li>
          </ul>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <a href="https://smartduka.org/dashboard/expiry" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Full Expiry Dashboard
          </a>
        </div>

        <p style="color: #6b7280; font-size: 12px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          You're receiving this alert because your business type requires expiry tracking. 
          <a href="https://smartduka.org/settings/notifications" style="color: #2563eb;">Manage notification preferences</a>
        </p>
      </div>
    `;

    try {
      await this.emailService.sendEmail({
        to: alert.shopEmail,
        subject,
        html,
      });
      this.logger.log(`Expiry alert sent to ${alert.shopEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send expiry alert: ${error.message}`);
    }
  }

  /**
   * Send immediate critical alert (for hourly checks)
   */
  private async sendCriticalAlert(shop: ShopDocument, products: any[]) {
    const subject = `🚨 URGENT: ${products.length} Products Expire Within 24 Hours - ${shop.name}`;
    
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #fee2e2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #dc2626; margin: 0;">🚨 Critical Expiry Alert</h2>
          <p style="color: #7f1d1d; margin: 8px 0 0 0; font-size: 16px;">
            ${products.length} product(s) will expire within 24 hours!
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Product</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Expires</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Stock</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px;">
                  <strong>${p.name}</strong><br>
                  <small>${p.sku}</small>
                </td>
                <td style="padding: 12px; text-align: center; color: #dc2626; font-weight: bold;">
                  ${p.expiryDate.toLocaleDateString()}
                </td>
                <td style="padding: 12px; text-align: right;">${p.stock} units</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="text-align: center; margin-top: 24px;">
          <a href="https://smartduka.org/dashboard/expiry" 
             style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Take Action Now
          </a>
        </div>
      </div>
    `;

    await this.emailService.sendEmail({
      to: shop.email,
      subject,
      html,
    });
  }

  /**
   * Send weekly summary report
   */
  private async sendWeeklySummary(shop: ShopDocument, stats: any, products: any[]) {
    const subject = `📊 Weekly Expiry Summary - ${shop.name}`;
    
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #111827;">📊 Weekly Inventory Health Report</h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0;">
          <div style="background: #fee2e2; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #dc2626;">${stats.expired}</div>
            <div style="color: #7f1d1d;">Expired</div>
          </div>
          <div style="background: #ffedd5; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #ea580c;">${stats.critical}</div>
            <div style="color: #9a3412;">Critical</div>
          </div>
          <div style="background: #fef9c3; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #ca8a04;">${stats.warning}</div>
            <div style="color: #854d0e;">Warning</div>
          </div>
          <div style="background: #dbeafe; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #2563eb;">${stats.upcoming}</div>
            <div style="color: #1e40af;">Upcoming</div>
          </div>
        </div>

        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 8px 0; color: #111827;">Total Value at Risk</h3>
          <p style="font-size: 24px; font-weight: bold; color: #dc2626; margin: 0;">
            KSh ${stats.valueAtRisk.toLocaleString()}
          </p>
        </div>

        <p style="color: #374151;">
          This week, focus on reducing waste by prioritizing sales of items nearing expiry.
        </p>
      </div>
    `;

    await this.emailService.sendEmail({
      to: shop.email,
      subject,
      html,
    });
  }

  /**
   * Manual trigger for testing
   */
  async triggerManualExpiryCheck(shopId: string) {
    const shop = await this.shopModel.findById(shopId).lean();
    if (!shop) {
      throw new Error('Shop not found');
    }
    
    await this.processShopExpiryAlerts(shop as ShopDocument);
    return { success: true, message: 'Expiry check triggered' };
  }
}
