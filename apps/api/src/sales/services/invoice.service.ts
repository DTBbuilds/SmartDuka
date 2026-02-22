import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { nanoid } from 'nanoid';
import { Invoice, InvoiceDocument, PaymentApprovalStatus } from '../schemas/invoice.schema';
import { Order, OrderDocument } from '../schemas/order.schema';
import { CreateInvoiceDto, RecordPaymentDto } from '../dto/invoice.dto';
import { EmailService } from '../../notifications/email.service';

export interface InvoiceFilters {
  from?: string;
  to?: string;
  status?: string;
  paymentStatus?: string;
  customerEmail?: string;
  customerPhone?: string;
  type?: string;
  limit?: number;
  skip?: number;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Generate invoice number
   */
  private generateInvoiceNumber(): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    return `INV-${year}${month}-${nanoid(6).toUpperCase()}`;
  }

  /**
   * Create invoice from order
   */
  async createFromOrder(shopId: string, branchId: string | undefined, dto: CreateInvoiceDto): Promise<InvoiceDocument> {
    if (!dto.orderId) {
      throw new BadRequestException('Order ID is required');
    }

    // Get order
    const order = await this.orderModel.findById(dto.orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify order belongs to shop
    if (order.shopId.toString() !== shopId) {
      throw new BadRequestException('Order does not belong to this shop');
    }

    const issueDate = dto.issueDate || new Date();
    const dueDate = dto.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Calculate amounts paid from order payments
    const amountPaid = order.payments?.reduce((sum, p) => {
      if (p.status === 'completed') return sum + p.amount;
      return sum;
    }, 0) || 0;

    const amountDue = order.total - amountPaid;
    const paymentStatus = amountPaid >= order.total ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid';

    const invoice = new this.invoiceModel({
      shopId: new Types.ObjectId(shopId),
      branchId: branchId ? new Types.ObjectId(branchId) : undefined,
      orderId: new Types.ObjectId(dto.orderId),
      invoiceNumber: this.generateInvoiceNumber(),
      orderNumber: order.orderNumber,
      type: dto.type || 'sale',
      businessName: dto.businessName,
      businessAddress: dto.businessAddress,
      businessPhone: dto.businessPhone,
      businessEmail: dto.businessEmail,
      businessLogo: dto.businessLogo,
      businessTaxPin: dto.businessTaxPin,
      businessRegistration: dto.businessRegistration,
      customerName: dto.customerName || order.customerName,
      customerAddress: dto.customerAddress,
      customerPhone: dto.customerPhone,
      customerEmail: dto.customerEmail,
      customerTaxPin: dto.customerTaxPin,
      issueDate,
      dueDate,
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      subtotal: order.subtotal,
      taxAmount: order.tax,
      total: order.total,
      payments: order.payments?.filter(p => p.status === 'completed').map(p => ({
        date: new Date(),
        method: p.method as any,
        amount: p.amount,
        reference: p.mpesaReceiptNumber || p.reference,
      })) || [],
      amountPaid,
      amountDue,
      paymentStatus,
      status: paymentStatus === 'paid' ? 'paid' : 'sent',
      notes: dto.notes || order.notes,
      terms: dto.terms,
      footerMessage: dto.footerMessage,
      currency: 'KES',
    });

    const savedInvoice = await invoice.save();

    // Send invoice email if customer email is available
    await this.safeSendInvoiceEmail(savedInvoice);

    return savedInvoice;
  }

  /**
   * Create standalone invoice (not from order)
   */
  async create(shopId: string, branchId: string | undefined, userId: string, dto: CreateInvoiceDto): Promise<InvoiceDocument> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Invoice must have at least one item');
    }

    const issueDate = dto.issueDate || new Date();
    const dueDate = dto.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;
    const items = dto.items.map(item => {
      const lineTotal = item.quantity * item.unitPrice;
      const itemTax = item.taxRate ? lineTotal * item.taxRate : 0;
      subtotal += lineTotal;
      totalTax += itemTax;
      return {
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal,
        taxRate: item.taxRate,
        taxAmount: itemTax,
        discount: item.discount,
      };
    });

    // Apply invoice-level discount
    let discountAmount = 0;
    if (dto.discount) {
      if (dto.discountType === 'percentage') {
        discountAmount = subtotal * (dto.discount / 100);
      } else {
        discountAmount = dto.discount;
      }
    }

    // Apply invoice-level tax if no item-level tax
    if (totalTax === 0 && dto.taxRate) {
      totalTax = (subtotal - discountAmount) * dto.taxRate;
    }

    const total = subtotal - discountAmount + totalTax;

    const invoice = new this.invoiceModel({
      shopId: new Types.ObjectId(shopId),
      branchId: branchId ? new Types.ObjectId(branchId) : undefined,
      invoiceNumber: this.generateInvoiceNumber(),
      type: dto.type || 'sale',
      businessName: dto.businessName,
      businessAddress: dto.businessAddress,
      businessPhone: dto.businessPhone,
      businessEmail: dto.businessEmail,
      businessLogo: dto.businessLogo,
      businessTaxPin: dto.businessTaxPin,
      businessRegistration: dto.businessRegistration,
      customerName: dto.customerName,
      customerAddress: dto.customerAddress,
      customerPhone: dto.customerPhone,
      customerEmail: dto.customerEmail,
      customerTaxPin: dto.customerTaxPin,
      issueDate,
      dueDate,
      items,
      subtotal,
      discount: discountAmount,
      discountType: dto.discountType,
      taxableAmount: subtotal - discountAmount,
      taxAmount: totalTax,
      taxRate: dto.taxRate,
      total,
      payments: [],
      amountPaid: 0,
      amountDue: total,
      paymentStatus: 'unpaid',
      status: 'draft',
      notes: dto.notes,
      terms: dto.terms,
      footerMessage: dto.footerMessage,
      currency: 'KES',
      createdBy: new Types.ObjectId(userId),
    });

    const savedInvoice = await invoice.save();

    // Send invoice email if customer email is available
    await this.safeSendInvoiceEmail(savedInvoice);

    return savedInvoice;
  }

  /**
   * Get invoice by ID
   */
  async getById(shopId: string, invoiceId: string): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel.findOne({
      _id: new Types.ObjectId(invoiceId),
      shopId: new Types.ObjectId(shopId),
    }).exec();

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  /**
   * Get invoices with filters
   */
  async getInvoices(shopId: string, filters?: InvoiceFilters): Promise<InvoiceDocument[]> {
    const query: any = { shopId: new Types.ObjectId(shopId) };

    if (filters?.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
      query.paymentStatus = filters.paymentStatus;
    }

    if (filters?.type && filters.type !== 'all') {
      query.type = filters.type;
    }

    if (filters?.customerEmail) {
      query.customerEmail = { $regex: filters.customerEmail, $options: 'i' };
    }

    if (filters?.customerPhone) {
      query.customerPhone = { $regex: filters.customerPhone, $options: 'i' };
    }

    if (filters?.from || filters?.to) {
      query.issueDate = {};
      if (filters.from) query.issueDate.$gte = new Date(filters.from);
      if (filters.to) query.issueDate.$lte = new Date(filters.to);
    }

    const limit = filters?.limit || 50;
    const skip = filters?.skip || 0;

    return await this.invoiceModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Record payment on invoice
   * For manual payments (bank_transfer, mpesa send money), set requiresApproval=true
   * to require super admin approval before the payment is considered complete.
   */
  async recordPayment(shopId: string, invoiceId: string, dto: RecordPaymentDto): Promise<InvoiceDocument> {
    const invoice = await this.getById(shopId, invoiceId);

    if (invoice.status === 'cancelled' || invoice.status === 'void') {
      throw new BadRequestException('Cannot record payment on cancelled/void invoice');
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    if (dto.amount > invoice.amountDue) {
      throw new BadRequestException('Payment amount exceeds amount due');
    }

    // Determine approval status based on payment method and requiresApproval flag
    // Manual payments (bank_transfer, mpesa send money) should require approval
    const requiresApproval = dto.requiresApproval ?? 
      (dto.method === 'bank_transfer' || (dto.method === 'mpesa' && dto.notes?.toLowerCase().includes('send money')));
    
    const approvalStatus: PaymentApprovalStatus = requiresApproval ? 'pending' : 'auto_approved';
    const paymentId = nanoid(12);

    // Add payment with approval status
    invoice.payments.push({
      date: dto.date || new Date(),
      method: dto.method,
      amount: dto.amount,
      reference: dto.reference,
      notes: dto.notes,
      approvalStatus,
      paymentId,
    });

    // Only update amounts if payment is approved
    if (approvalStatus === 'auto_approved') {
      invoice.amountPaid += dto.amount;
      invoice.amountDue -= dto.amount;

      // Update payment status
      if (invoice.amountDue <= 0) {
        invoice.paymentStatus = 'paid';
        invoice.status = 'paid';
        invoice.paidAt = new Date();
      } else {
        invoice.paymentStatus = 'partial';
      }
    }
    // If pending approval, don't update amounts yet - they'll be updated when approved

    return await invoice.save();
  }

  /**
   * Approve a pending payment (super admin only)
   */
  async approvePayment(
    invoiceId: string, 
    paymentId: string, 
    approvedBy: string
  ): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel.findById(invoiceId).exec();
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const paymentIndex = invoice.payments.findIndex(p => p.paymentId === paymentId);
    if (paymentIndex === -1) {
      throw new NotFoundException('Payment not found');
    }

    const payment = invoice.payments[paymentIndex];
    if (payment.approvalStatus !== 'pending') {
      throw new BadRequestException('Payment is not pending approval');
    }

    // Update payment approval status
    invoice.payments[paymentIndex].approvalStatus = 'approved';
    invoice.payments[paymentIndex].approvedAt = new Date();
    invoice.payments[paymentIndex].approvedBy = approvedBy;

    // Now update the invoice amounts
    invoice.amountPaid += payment.amount;
    invoice.amountDue -= payment.amount;

    // Update payment status
    if (invoice.amountDue <= 0) {
      invoice.paymentStatus = 'paid';
      invoice.status = 'paid';
      invoice.paidAt = new Date();
    } else {
      invoice.paymentStatus = 'partial';
    }

    return await invoice.save();
  }

  /**
   * Reject a pending payment (super admin only)
   */
  async rejectPayment(
    invoiceId: string, 
    paymentId: string, 
    rejectedBy: string,
    reason: string
  ): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel.findById(invoiceId).exec();
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const paymentIndex = invoice.payments.findIndex(p => p.paymentId === paymentId);
    if (paymentIndex === -1) {
      throw new NotFoundException('Payment not found');
    }

    const payment = invoice.payments[paymentIndex];
    if (payment.approvalStatus !== 'pending') {
      throw new BadRequestException('Payment is not pending approval');
    }

    // Update payment approval status
    invoice.payments[paymentIndex].approvalStatus = 'rejected';
    invoice.payments[paymentIndex].rejectedAt = new Date();
    invoice.payments[paymentIndex].rejectedBy = rejectedBy;
    invoice.payments[paymentIndex].rejectionReason = reason;

    // Payment amounts are not updated since payment was rejected

    return await invoice.save();
  }

  /**
   * Send invoice (mark as sent)
   */
  async sendInvoice(shopId: string, invoiceId: string): Promise<InvoiceDocument> {
    const invoice = await this.getById(shopId, invoiceId);

    if (invoice.status === 'cancelled' || invoice.status === 'void') {
      throw new BadRequestException('Cannot send cancelled/void invoice');
    }

    invoice.status = 'sent';
    invoice.sentAt = new Date();

    return await invoice.save();
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(shopId: string, invoiceId: string, reason: string): Promise<InvoiceDocument> {
    const invoice = await this.getById(shopId, invoiceId);

    if (invoice.paymentStatus === 'paid') {
      throw new BadRequestException('Cannot cancel paid invoice');
    }

    invoice.status = 'cancelled';
    invoice.paymentStatus = 'cancelled';
    invoice.cancelledAt = new Date();
    invoice.cancelReason = reason;

    return await invoice.save();
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(shopId: string): Promise<InvoiceDocument[]> {
    const now = new Date();

    return await this.invoiceModel.find({
      shopId: new Types.ObjectId(shopId),
      dueDate: { $lt: now },
      paymentStatus: { $in: ['unpaid', 'partial'] },
      status: { $nin: ['cancelled', 'void', 'paid'] },
    }).sort({ dueDate: 1 }).exec();
  }

  /**
   * Get invoice statistics
   */
  async getStats(shopId: string, from?: string, to?: string): Promise<any> {
    const matchStage: any = { shopId: new Types.ObjectId(shopId) };

    if (from || to) {
      matchStage.issueDate = {};
      if (from) matchStage.issueDate.$gte = new Date(from);
      if (to) matchStage.issueDate.$lte = new Date(to);
    }

    const stats = await this.invoiceModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          totalPaid: { $sum: '$amountPaid' },
          totalDue: { $sum: '$amountDue' },
          paidCount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
          unpaidCount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'unpaid'] }, 1, 0] } },
          partialCount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'partial'] }, 1, 0] } },
          overdueCount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'overdue'] }, 1, 0] } },
        },
      },
    ]).exec();

    if (stats.length === 0) {
      return {
        totalInvoices: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalDue: 0,
        paidCount: 0,
        unpaidCount: 0,
        partialCount: 0,
        overdueCount: 0,
      };
    }

    return stats[0];
  }

  /**
   * Generate invoice HTML for PDF/Email
   */
  generateInvoiceHTML(invoice: InvoiceDocument): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #333; padding: 40px; }
    .invoice { max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 28px; color: #1f2937; margin-bottom: 5px; }
    .invoice-number { color: #6b7280; }
    .addresses { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .address { width: 45%; }
    .address h3 { font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 10px; }
    .address p { margin-bottom: 3px; }
    .meta { display: flex; justify-content: flex-end; margin-bottom: 30px; }
    .meta-item { margin-left: 40px; text-align: right; }
    .meta-label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
    .meta-value { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f3f4f6; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; }
    td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
    .text-right { text-align: right; }
    .totals { width: 300px; margin-left: auto; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .totals-row.total { font-size: 16px; font-weight: bold; border-top: 2px solid #1f2937; padding-top: 12px; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .status-paid { background: #dcfce7; color: #166534; }
    .status-unpaid { background: #fef3c7; color: #92400e; }
    .status-partial { background: #dbeafe; color: #1e40af; }
    .status-overdue { background: #fee2e2; color: #991b1b; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    .notes { margin-bottom: 20px; }
    .notes h4 { font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 5px; }
    .thank-you { text-align: center; color: #6b7280; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="logo">${invoice.businessName}</div>
      <div class="invoice-title">
        <h1>INVOICE</h1>
        <p class="invoice-number">${invoice.invoiceNumber}</p>
        <span class="status status-${invoice.paymentStatus}">${invoice.paymentStatus.toUpperCase()}</span>
      </div>
    </div>

    <div class="addresses">
      <div class="address">
        <h3>From</h3>
        <p><strong>${invoice.businessName}</strong></p>
        ${invoice.businessAddress ? `<p>${invoice.businessAddress}</p>` : ''}
        ${invoice.businessPhone ? `<p>Tel: ${invoice.businessPhone}</p>` : ''}
        ${invoice.businessEmail ? `<p>${invoice.businessEmail}</p>` : ''}
        ${invoice.businessTaxPin ? `<p>PIN: ${invoice.businessTaxPin}</p>` : ''}
      </div>
      <div class="address">
        <h3>Bill To</h3>
        <p><strong>${invoice.customerName || 'Walk-in Customer'}</strong></p>
        ${invoice.customerAddress ? `<p>${invoice.customerAddress}</p>` : ''}
        ${invoice.customerPhone ? `<p>Tel: ${invoice.customerPhone}</p>` : ''}
        ${invoice.customerEmail ? `<p>${invoice.customerEmail}</p>` : ''}
        ${invoice.customerTaxPin ? `<p>PIN: ${invoice.customerTaxPin}</p>` : ''}
      </div>
    </div>

    <div class="meta">
      <div class="meta-item">
        <div class="meta-label">Issue Date</div>
        <div class="meta-value">${new Date(invoice.issueDate).toLocaleDateString('en-KE')}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Due Date</div>
        <div class="meta-value">${new Date(invoice.dueDate).toLocaleDateString('en-KE')}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items.map(item => `
          <tr>
            <td>${item.name}${item.description ? `<br><small style="color:#6b7280">${item.description}</small>` : ''}</td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">KES ${item.unitPrice.toLocaleString()}</td>
            <td class="text-right">KES ${item.lineTotal.toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>KES ${invoice.subtotal.toLocaleString()}</span>
      </div>
      ${invoice.discount ? `
        <div class="totals-row">
          <span>Discount</span>
          <span>-KES ${invoice.discount.toLocaleString()}</span>
        </div>
      ` : ''}
      <div class="totals-row">
        <span>Tax</span>
        <span>KES ${invoice.taxAmount.toLocaleString()}</span>
      </div>
      <div class="totals-row total">
        <span>Total</span>
        <span>KES ${invoice.total.toLocaleString()}</span>
      </div>
      ${invoice.amountPaid > 0 ? `
        <div class="totals-row">
          <span>Amount Paid</span>
          <span>KES ${invoice.amountPaid.toLocaleString()}</span>
        </div>
        <div class="totals-row" style="font-weight:600;color:#dc2626">
          <span>Amount Due</span>
          <span>KES ${invoice.amountDue.toLocaleString()}</span>
        </div>
      ` : ''}
    </div>

    <div class="footer">
      ${invoice.notes ? `
        <div class="notes">
          <h4>Notes</h4>
          <p>${invoice.notes}</p>
        </div>
      ` : ''}
      ${invoice.terms ? `
        <div class="notes">
          <h4>Terms & Conditions</h4>
          <p>${invoice.terms}</p>
        </div>
      ` : ''}
      <p class="thank-you">${invoice.footerMessage || 'Thank you for your business!'}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Safely send invoice email without breaking invoice creation flow
   */
  private async safeSendInvoiceEmail(invoice: InvoiceDocument): Promise<void> {
    try {
      if (!invoice.customerEmail) {
        return;
      }

      const html = this.generateInvoiceHTML(invoice);

      const fromName = invoice.businessName || 'SmartDuka';
      const fromEmail = invoice.businessEmail || process.env.SMTP_FROM || 'SmartDuka <noreply@smartduka.org>';

      await this.emailService.sendEmail({
        to: invoice.customerEmail,
        subject: `Invoice ${invoice.invoiceNumber} from ${fromName}`,
        html,
        from: fromEmail,
        templateName: 'invoice_email',
        category: 'billing',
      });
    } catch (error: any) {
      this.logger.error(`Failed to send invoice email for ${invoice._id}: ${error.message}`);
    }
  }
}
