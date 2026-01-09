import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shop, ShopDocument } from '../../shops/schemas/shop.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { Subscription, SubscriptionDocument } from '../../subscriptions/schemas/subscription.schema';
import { SubscriptionInvoice, SubscriptionInvoiceDocument, InvoiceStatus, InvoiceType } from '../../subscriptions/schemas/subscription-invoice.schema';
import { SystemConfig, SystemConfigDocument, SystemConfigType } from '../schemas/system-config.schema';
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
    @InjectModel(SystemConfig.name) private readonly systemConfigModel: Model<SystemConfigDocument>,
    private readonly emailService: EmailService,
    private readonly emailLogService: EmailLogService,
    private readonly auditService: SystemAuditService,
  ) {}

  /**
   * Get VAT configuration from system settings
   */
  private async getVatConfig(): Promise<{ enabled: boolean; rate: number }> {
    try {
      const config = await this.systemConfigModel.findOne({ type: SystemConfigType.VAT });
      if (!config) {
        return { enabled: false, rate: 0.16 };
      }
      return {
        enabled: config.config?.vatEnabled ?? false,
        rate: config.config?.vatRate ?? 0.16,
      };
    } catch {
      return { enabled: false, rate: 0.16 };
    }
  }

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
   * Get shops missing email addresses
   */
  async getShopsMissingEmail(): Promise<Array<{ id: string; name: string; phone: string; status: string; createdAt: Date }>> {
    const shops = await this.shopModel
      .find({ $or: [{ email: { $exists: false } }, { email: '' }, { email: null }] })
      .select('name phone status createdAt')
      .sort({ createdAt: -1 })
      .exec();

    return shops.map(shop => ({
      id: shop._id.toString(),
      name: shop.name,
      phone: shop.phone,
      status: shop.status,
      createdAt: (shop as any).createdAt,
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
    
    // Get VAT config - only apply tax if VAT is enabled
    const vatConfig = await this.getVatConfig();
    const tax = vatConfig.enabled ? Math.round(subtotal * vatConfig.rate) : 0;
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
    // Direct to subscription page with invoice parameter for payment
    const paymentUrl = `${frontendUrl}/admin/subscription?invoice=${invoice._id}&pay=true`;

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
        
        // Update invoice email tracking
        await this.invoiceModel.findByIdAndUpdate(invoice._id, {
          $set: {
            emailSent: true,
            emailSentAt: new Date(),
            lastEmailError: null,
          },
          $inc: { emailSentCount: 1 },
        });
        
        return { success: true };
      } else {
        await this.emailLogService.markFailed(emailLog._id.toString(), result.error || 'Unknown error');
        
        // Update invoice with error
        await this.invoiceModel.findByIdAndUpdate(invoice._id, {
          $set: { lastEmailError: result.error || 'Unknown error' },
        });
        
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      // Update invoice with error
      await this.invoiceModel.findByIdAndUpdate(invoice._id, {
        $set: { lastEmailError: error.message },
      });
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
   * Generate invoice email HTML - Mobile-responsive professional design
   */
  private generateInvoiceEmailHtml(
    invoice: SubscriptionInvoiceDocument,
    shop: ShopDocument,
    paymentUrl: string,
  ): string {
    // Mobile-friendly line items (stacked on small screens)
    const lineItemsHtml = invoice.lineItems
      .map(
        item => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 16px 12px; font-size: 14px;">
            <div style="font-weight: 600; color: #1f2937;">${item.description}</div>
            <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">Qty: ${item.quantity} × KES ${item.unitPrice.toLocaleString()}</div>
          </td>
          <td style="padding: 16px 12px; text-align: right; font-weight: 600; color: #1f2937; font-size: 14px; white-space: nowrap;">
            KES ${item.amount.toLocaleString()}
          </td>
        </tr>
      `,
      )
      .join('');

    const currentYear = new Date().getFullYear();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f3f4f6; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <!-- Preheader text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    Invoice ${invoice.invoiceNumber} - KES ${invoice.totalAmount.toLocaleString()} due ${new Date(invoice.dueDate).toLocaleDateString('en-KE')}
  </div>
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td style="padding: 20px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 16px 16px 0 0; padding: 32px 24px; text-align: center;">
              <div style="display: inline-block; background: #ffffff; border-radius: 12px; padding: 12px; margin-bottom: 16px;">
                <svg viewBox="0 0 24 24" fill="#f97316" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </div>
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Invoice</h1>
              <p style="margin: 8px 0 0; font-size: 16px; color: rgba(255,255,255,0.9);">${invoice.invoiceNumber}</p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="background: #ffffff; padding: 32px 24px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">
                Hello <strong style="color: #1f2937;">${shop.name}</strong>,
              </p>
              
              <p style="margin: 0 0 24px; font-size: 15px; color: #4b5563;">
                Please find your invoice details below.
              </p>
              
              <!-- Amount Due Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border: 2px solid #fdba74; border-radius: 12px; padding: 24px; text-align: center;">
                    <p style="margin: 0 0 4px; font-size: 12px; color: #ea580c; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Amount Due</p>
                    <p style="margin: 0; font-size: 36px; font-weight: 700; color: #c2410c;">KES ${invoice.totalAmount.toLocaleString()}</p>
                    <p style="margin: 12px 0 0; font-size: 14px; color: #9a3412;">
                      Due by <strong>${new Date(invoice.dueDate).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Invoice Details Grid -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="background: #f9fafb; border-radius: 8px; padding: 16px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px; width: 50%;">
                          <p style="margin: 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Invoice #</p>
                          <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600; color: #1f2937;">${invoice.invoiceNumber}</p>
                        </td>
                        <td style="padding: 8px; width: 50%;">
                          <p style="margin: 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Issue Date</p>
                          <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600; color: #1f2937;">${new Date(invoice.createdAt!).toLocaleDateString('en-KE')}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px; width: 50%;">
                          <p style="margin: 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Due Date</p>
                          <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600; color: #dc2626;">${new Date(invoice.dueDate).toLocaleDateString('en-KE')}</p>
                        </td>
                        <td style="padding: 8px; width: 50%;">
                          <p style="margin: 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Status</p>
                          <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600; color: #f59e0b;">Pending Payment</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Line Items -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: #f9fafb;">
                    <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Description</th>
                    <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${lineItemsHtml}
                </tbody>
              </table>
              
              <!-- Totals -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="font-size: 14px; color: #6b7280;">Subtotal</td>
                        <td style="font-size: 14px; color: #1f2937; text-align: right; font-weight: 500;">KES ${invoice.amount.toLocaleString()}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="font-size: 14px; color: #6b7280;">VAT (16%)</td>
                        <td style="font-size: 14px; color: #1f2937; text-align: right; font-weight: 500;">KES ${invoice.tax.toLocaleString()}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 0 0; border-top: 2px solid #e5e7eb;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="font-size: 18px; color: #1f2937; font-weight: 700;">Total Due</td>
                        <td style="font-size: 20px; color: #f97316; text-align: right; font-weight: 700;">KES ${invoice.totalAmount.toLocaleString()}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              ${invoice.notes ? `
              <!-- Notes -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px;">
                    <p style="margin: 0; font-size: 13px; color: #92400e;">
                      <strong>📝 Note:</strong> ${invoice.notes}
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <!-- Pay Now Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${paymentUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; padding: 16px 48px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.4);">
                      💳 Pay Now
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Payment Methods -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="background: #f9fafb; border-radius: 8px; padding: 20px;">
                    <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #374151;">💰 Payment Methods</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #4b5563;">
                          <span style="color: #10b981;">✓</span> M-Pesa STK Push (instant)
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #4b5563;">
                          <span style="color: #10b981;">✓</span> M-Pesa Paybill / Send Money
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #4b5563;">
                          <span style="color: #10b981;">✓</span> Card Payment (Visa/Mastercard)
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                If you have any questions about this invoice, please contact our support team.
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #1f2937; border-radius: 0 0 16px 16px; padding: 32px 24px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #ffffff;">🛒 SmartDuka</p>
              <p style="margin: 0 0 20px; font-size: 13px; color: #9ca3af;">Smart POS & Inventory Management</p>
              
              <p style="margin: 0 0 8px; font-size: 13px; color: #d1d5db;">
                📞 <a href="tel:+254729983567" style="color: #f97316; text-decoration: none;">0729 983 567</a> | 
                <a href="tel:+254104160502" style="color: #f97316; text-decoration: none;">0104 160 502</a>
              </p>
              <p style="margin: 0 0 20px; font-size: 13px; color: #d1d5db;">
                📧 <a href="mailto:smartdukainfo@gmail.com" style="color: #f97316; text-decoration: none;">smartdukainfo@gmail.com</a>
              </p>
              
              <p style="margin: 0; font-size: 11px; color: #6b7280;">
                © ${currentYear} SmartDuka. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
