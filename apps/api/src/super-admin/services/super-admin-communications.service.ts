import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shop, ShopDocument } from '../../shops/schemas/shop.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Subscription, SubscriptionDocument } from '../../subscriptions/schemas/subscription.schema';
import { SubscriptionInvoice, SubscriptionInvoiceDocument, InvoiceStatus, InvoiceType } from '../../subscriptions/schemas/subscription-invoice.schema';
import { EmailService } from '../../notifications/email.service';
import { EmailLogService } from './email-log.service';
import { SystemAuditService } from './system-audit.service';
import { AuditActionCategory, AuditActionType } from '../schemas/system-audit-log.schema';
import { SendManualEmailDto, CreateManualInvoiceDto } from '../dto/communications.dto';

export interface ManualEmailResult {
  success: boolean;
  totalRecipients: number;
  sent: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}

@Injectable()
export class SuperAdminCommunicationsService {
  private readonly logger = new Logger(SuperAdminCommunicationsService.name);

  constructor(
    @InjectModel(Shop.name) private readonly shopModel: Model<ShopDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Subscription.name) private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(SubscriptionInvoice.name) private readonly invoiceModel: Model<SubscriptionInvoiceDocument>,
    private readonly emailService: EmailService,
    private readonly emailLogService: EmailLogService,
    private readonly auditService: SystemAuditService,
  ) {}

  /**
   * Send manual email to shop owners
   */
  async sendManualEmail(
    dto: SendManualEmailDto,
    superAdminId: string,
    superAdminEmail: string,
  ): Promise<ManualEmailResult> {
    this.logger.log(`Super admin ${superAdminEmail} sending manual email: ${dto.subject}`);

    const recipients: Array<{ email: string; shopId?: string; shopName?: string }> = [];

    // Gather recipients based on type
    if (dto.recipientType === 'shop' && dto.shopIds?.length) {
      const shops = await this.shopModel
        .find({ _id: { $in: dto.shopIds.map(id => new Types.ObjectId(id)) } })
        .select('email name')
        .exec();

      for (const shop of shops) {
        if (shop.email) {
          recipients.push({
            email: shop.email,
            shopId: shop._id.toString(),
            shopName: shop.name,
          });
        }
      }
    } else if (dto.recipientType === 'all_shops') {
      const shops = await this.shopModel
        .find({ status: { $in: ['active', 'verified'] } })
        .select('email name')
        .exec();

      for (const shop of shops) {
        if (shop.email) {
          recipients.push({
            email: shop.email,
            shopId: shop._id.toString(),
            shopName: shop.name,
          });
        }
      }
    } else if (dto.recipientType === 'custom' && dto.customEmails?.length) {
      for (const email of dto.customEmails) {
        recipients.push({ email });
      }
    }

    if (recipients.length === 0) {
      throw new BadRequestException('No valid recipients found');
    }

    const result: ManualEmailResult = {
      success: true,
      totalRecipients: recipients.length,
      sent: 0,
      failed: 0,
      errors: [],
    };

    // Send emails to all recipients
    for (const recipient of recipients) {
      try {
        // Create email log entry
        const emailLog = await this.emailLogService.create({
          to: recipient.email,
          subject: dto.subject,
          htmlContent: dto.htmlContent,
          textContent: dto.textContent,
          shopId: recipient.shopId,
          shopName: recipient.shopName,
          category: dto.category || 'system',
          triggeredBy: `manual_email_by_${superAdminEmail}`,
        });

        // Send the email
        const sendResult = await this.emailService.sendEmail({
          to: recipient.email,
          subject: dto.subject,
          html: dto.htmlContent,
          text: dto.textContent,
        });

        if (sendResult.success) {
          await this.emailLogService.markSent(
            emailLog._id.toString(),
            sendResult.messageId,
            'nodemailer',
          );
          result.sent++;
        } else {
          await this.emailLogService.markFailed(
            emailLog._id.toString(),
            sendResult.error || 'Unknown error',
          );
          result.failed++;
          result.errors.push({ email: recipient.email, error: sendResult.error || 'Unknown error' });
        }
      } catch (error: any) {
        result.failed++;
        result.errors.push({ email: recipient.email, error: error.message });
        this.logger.error(`Failed to send email to ${recipient.email}: ${error.message}`);
      }
    }

    // Log the action
    await this.auditService.log({
      action: 'manual_email_sent',
      category: AuditActionCategory.NOTIFICATION,
      actionType: AuditActionType.EXECUTE,
      actorId: superAdminId,
      actorEmail: superAdminEmail,
      actorType: 'super_admin',
      description: `Manual email sent to ${result.sent} recipients`,
      metadata: {
        subject: dto.subject,
        recipientType: dto.recipientType,
        totalRecipients: result.totalRecipients,
        sent: result.sent,
        failed: result.failed,
      },
      status: result.failed === 0 ? 'success' : (result.sent > 0 ? 'warning' : 'failure'),
    });

    result.success = result.sent > 0;
    return result;
  }

  /**
   * Get all shops for email recipient selection
   */
  async getShopsForEmail(): Promise<Array<{ id: string; name: string; email: string; status: string }>> {
    const shops = await this.shopModel
      .find({ email: { $exists: true, $ne: '' } })
      .select('name email status')
      .sort({ name: 1 })
      .exec();

    return shops.map(shop => ({
      id: shop._id.toString(),
      name: shop.name,
      email: shop.email,
      status: shop.status,
    }));
  }

  /**
   * Create a manual invoice for a shop
   */
  async createManualInvoice(
    dto: CreateManualInvoiceDto,
    superAdminId: string,
    superAdminEmail: string,
  ): Promise<SubscriptionInvoiceDocument> {
    this.logger.log(`Super admin ${superAdminEmail} creating manual invoice for shop ${dto.shopId}`);

    // Validate shop exists
    const shop = await this.shopModel.findById(new Types.ObjectId(dto.shopId)).exec();
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    // Get shop's subscription (if any)
    const subscription = await this.subscriptionModel
      .findOne({ shopId: new Types.ObjectId(dto.shopId) })
      .exec();

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Calculate line items
    const lineItems = dto.lineItems?.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.quantity * item.unitPrice,
    })) || [{
      description: dto.description,
      quantity: 1,
      unitPrice: dto.amount,
      amount: dto.amount,
    }];

    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const tax = Math.round(subtotal * 0.16); // 16% VAT
    const totalAmount = subtotal + tax;

    // Create the invoice
    const invoice = new this.invoiceModel({
      invoiceNumber,
      shopId: new Types.ObjectId(dto.shopId),
      subscriptionId: subscription?._id || new Types.ObjectId(),
      type: this.mapInvoiceType(dto.type),
      status: InvoiceStatus.PENDING,
      description: dto.description,
      amount: subtotal,
      tax,
      totalAmount,
      currency: 'KES',
      dueDate: new Date(dto.dueDate),
      lineItems,
      notes: dto.notes ? `${dto.notes}\n\nCreated manually by super admin.` : 'Created manually by super admin.',
    });

    const savedInvoice = await invoice.save();

    // Log the action
    await this.auditService.log({
      action: 'manual_invoice_created',
      category: AuditActionCategory.SUBSCRIPTION,
      actionType: AuditActionType.CREATE,
      actorId: superAdminId,
      actorEmail: superAdminEmail,
      actorType: 'super_admin',
      shopId: dto.shopId,
      shopName: shop.name,
      targetType: 'Invoice',
      targetName: invoiceNumber,
      description: `Manual invoice ${invoiceNumber} created for ${shop.name}`,
      metadata: {
        invoiceNumber,
        amount: totalAmount,
        type: dto.type,
        dueDate: dto.dueDate,
      },
      status: 'success',
    });

    // Send invoice email if requested
    if (dto.sendEmail && shop.email) {
      await this.sendInvoiceEmail(savedInvoice, shop);
    }

    this.logger.log(`Manual invoice ${invoiceNumber} created for shop ${shop.name}`);
    return savedInvoice;
  }

  /**
   * Send invoice email to shop
   */
  async sendInvoiceEmail(
    invoice: SubscriptionInvoiceDocument,
    shop?: ShopDocument,
  ): Promise<{ success: boolean; error?: string }> {
    if (!shop) {
      shop = await this.shopModel.findById(invoice.shopId).exec() as ShopDocument;
      if (!shop) {
        return { success: false, error: 'Shop not found' };
      }
    }

    if (!shop.email) {
      return { success: false, error: 'Shop has no email address' };
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const paymentUrl = `${frontendUrl}/admin/billing?invoice=${invoice.invoiceNumber}`;

    const htmlContent = this.generateInvoiceEmailHtml(invoice, shop, paymentUrl);

    try {
      // Create email log
      const emailLog = await this.emailLogService.create({
        to: shop.email,
        subject: `Invoice ${invoice.invoiceNumber} - Payment Due`,
        htmlContent,
        shopId: shop._id.toString(),
        shopName: shop.name,
        category: 'invoice',
        triggeredBy: 'manual_invoice_email',
      });

      const result = await this.emailService.sendEmail({
        to: shop.email,
        subject: `Invoice ${invoice.invoiceNumber} - Payment Due`,
        html: htmlContent,
      });

      if (result.success) {
        await this.emailLogService.markSent(emailLog._id.toString(), result.messageId, 'nodemailer');
        return { success: true };
      } else {
        await this.emailLogService.markFailed(emailLog._id.toString(), result.error || 'Unknown error');
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Resend invoice email
   */
  async resendInvoiceEmail(
    invoiceId: string,
    superAdminId: string,
    superAdminEmail: string,
  ): Promise<{ success: boolean; error?: string }> {
    const invoice = await this.invoiceModel.findById(new Types.ObjectId(invoiceId)).exec();
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const result = await this.sendInvoiceEmail(invoice);

    // Log the action
    await this.auditService.log({
      action: 'invoice_email_resent',
      category: AuditActionCategory.NOTIFICATION,
      actionType: AuditActionType.EXECUTE,
      actorId: superAdminId,
      actorEmail: superAdminEmail,
      actorType: 'super_admin',
      shopId: invoice.shopId.toString(),
      targetType: 'Invoice',
      targetName: invoice.invoiceNumber,
      description: `Invoice email resent for ${invoice.invoiceNumber}`,
      metadata: { invoiceNumber: invoice.invoiceNumber },
      status: result.success ? 'success' : 'failure',
      errorMessage: result.error,
    });

    return result;
  }

  /**
   * Get all invoices with shop details
   */
  async getInvoicesWithDetails(options: {
    status?: string;
    shopId?: string;
    type?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    skip?: number;
  }): Promise<{ invoices: any[]; total: number }> {
    const query: any = {};

    if (options.status) query.status = options.status;
    if (options.shopId) query.shopId = new Types.ObjectId(options.shopId);
    if (options.type) query.type = options.type;
    if (options.startDate || options.endDate) {
      query.createdAt = {};
      if (options.startDate) query.createdAt.$gte = options.startDate;
      if (options.endDate) query.createdAt.$lte = options.endDate;
    }

    const [invoices, total] = await Promise.all([
      this.invoiceModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0)
        .populate('shopId', 'name email phone')
        .exec(),
      this.invoiceModel.countDocuments(query).exec(),
    ]);

    return { invoices, total };
  }

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    // Find the latest invoice number for this year
    const latestInvoice = await this.invoiceModel
      .findOne({ invoiceNumber: { $regex: `^${prefix}` } })
      .sort({ invoiceNumber: -1 })
      .exec();

    let nextNumber = 1;
    if (latestInvoice) {
      const lastNumber = parseInt(latestInvoice.invoiceNumber.replace(prefix, ''), 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  }

  /**
   * Map invoice type string to enum
   */
  private mapInvoiceType(type: string): InvoiceType {
    switch (type) {
      case 'subscription':
        return InvoiceType.SUBSCRIPTION;
      case 'addon':
        return InvoiceType.ADDON;
      case 'setup':
        return InvoiceType.SETUP;
      default:
        return InvoiceType.SUBSCRIPTION;
    }
  }

  /**
   * Generate invoice email HTML
   */
  private generateInvoiceEmailHtml(
    invoice: SubscriptionInvoiceDocument,
    shop: ShopDocument,
    paymentUrl: string,
  ): string {
    const lineItemsHtml = invoice.lineItems
      .map(
        item => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">KES ${item.unitPrice.toLocaleString()}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">KES ${item.amount.toLocaleString()}</td>
        </tr>
      `,
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f5; }
    .wrapper { max-width: 650px; margin: 0 auto; padding: 20px; }
    .container { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px; }
    .invoice-details { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .invoice-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .invoice-table th { background: #f1f5f9; padding: 12px; text-align: left; font-weight: 600; }
    .totals { text-align: right; margin-top: 20px; }
    .total-row { display: flex; justify-content: flex-end; padding: 8px 0; }
    .total-label { width: 150px; }
    .total-value { width: 120px; text-align: right; }
    .grand-total { font-size: 20px; font-weight: bold; color: #2563eb; border-top: 2px solid #e5e7eb; padding-top: 12px; }
    .button { display: inline-block; background: #2563eb; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f8fafc; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>📄 Invoice</h1>
        <p style="margin: 10px 0 0; opacity: 0.9;">${invoice.invoiceNumber}</p>
      </div>
      
      <div class="content">
        <p>Hello <strong>${shop.name}</strong>,</p>
        
        <p>Please find your invoice details below. Payment is due by <strong>${new Date(invoice.dueDate).toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>.</p>
        
        <div class="invoice-details">
          <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
            <div>
              <p style="margin: 0; color: #666; font-size: 12px;">INVOICE NUMBER</p>
              <p style="margin: 5px 0 15px; font-weight: 600;">${invoice.invoiceNumber}</p>
            </div>
            <div>
              <p style="margin: 0; color: #666; font-size: 12px;">ISSUE DATE</p>
              <p style="margin: 5px 0 15px; font-weight: 600;">${new Date(invoice.createdAt!).toLocaleDateString('en-KE')}</p>
            </div>
            <div>
              <p style="margin: 0; color: #666; font-size: 12px;">DUE DATE</p>
              <p style="margin: 5px 0 15px; font-weight: 600; color: #dc2626;">${new Date(invoice.dueDate).toLocaleDateString('en-KE')}</p>
            </div>
          </div>
        </div>
        
        <table class="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHtml}
          </tbody>
        </table>
        
        <div class="totals">
          <div class="total-row">
            <span class="total-label">Subtotal:</span>
            <span class="total-value">KES ${invoice.amount.toLocaleString()}</span>
          </div>
          <div class="total-row">
            <span class="total-label">VAT (16%):</span>
            <span class="total-value">KES ${invoice.tax.toLocaleString()}</span>
          </div>
          <div class="total-row grand-total">
            <span class="total-label">Total Due:</span>
            <span class="total-value">KES ${invoice.totalAmount.toLocaleString()}</span>
          </div>
        </div>
        
        ${invoice.notes ? `<div class="warning"><strong>Note:</strong> ${invoice.notes}</div>` : ''}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${paymentUrl}" class="button">💳 Pay Now</a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          <strong>Payment Methods:</strong><br>
          • M-Pesa: Pay via STK push or Paybill<br>
          • Card: Pay securely online
        </p>
        
        <p>If you have any questions about this invoice, please contact our support team.</p>
        
        <p>Thank you for your business!</p>
      </div>
      
      <div class="footer">
        <p>This is an automated invoice from SmartDuka.</p>
        <p>© ${new Date().getFullYear()} SmartDuka. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}
