import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { nanoid } from 'nanoid';
import { Receipt, ReceiptDocument } from '../schemas/receipt.schema';
import { Order, OrderDocument } from '../schemas/order.schema';
import { CreateReceiptDto } from '../dto/receipt.dto';

export interface ReceiptFilters {
  from?: string;
  to?: string;
  paymentMethod?: string;
  customerPhone?: string;
  status?: string;
  limit?: number;
  skip?: number;
}

@Injectable()
export class ReceiptService {
  constructor(
    @InjectModel(Receipt.name) private readonly receiptModel: Model<ReceiptDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  /**
   * Generate receipt number
   */
  private generateReceiptNumber(): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    return `RCP-${year}${month}-${nanoid(6).toUpperCase()}`;
  }

  /**
   * Create receipt from order
   */
  async createFromOrder(shopId: string, branchId: string | undefined, dto: CreateReceiptDto): Promise<ReceiptDocument> {
    // Get order
    const order = await this.orderModel.findById(dto.orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify order belongs to shop
    if (order.shopId.toString() !== shopId) {
      throw new BadRequestException('Order does not belong to this shop');
    }

    // Check if receipt already exists for this order
    const existingReceipt = await this.receiptModel.findOne({
      shopId: new Types.ObjectId(shopId),
      orderId: new Types.ObjectId(dto.orderId),
      status: 'active',
    }).exec();

    if (existingReceipt) {
      // Return existing receipt instead of creating duplicate
      return existingReceipt;
    }

    // Determine primary payment method
    let primaryPaymentMethod = 'cash';
    if (order.payments && order.payments.length > 0) {
      if (order.payments.length === 1) {
        primaryPaymentMethod = order.payments[0].method;
      } else {
        primaryPaymentMethod = 'mixed';
      }
    }

    // Create receipt
    const receipt = new this.receiptModel({
      shopId: new Types.ObjectId(shopId),
      branchId: branchId ? new Types.ObjectId(branchId) : undefined,
      orderId: new Types.ObjectId(dto.orderId),
      receiptNumber: this.generateReceiptNumber(),
      orderNumber: order.orderNumber,
      shopName: dto.shopName,
      shopAddress: dto.shopAddress,
      shopPhone: dto.shopPhone,
      shopEmail: dto.shopEmail,
      shopLogo: dto.shopLogo,
      shopTaxPin: dto.shopTaxPin,
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      payments: order.payments?.map(p => ({
        method: p.method,
        amount: p.amount,
        reference: p.reference,
        mpesaReceiptNumber: p.mpesaReceiptNumber,
      })) || [],
      primaryPaymentMethod,
      customerName: order.customerName,
      cashierId: order.cashierId ? new Types.ObjectId(order.cashierId) : undefined,
      cashierName: order.cashierName,
      notes: order.notes,
      footerMessage: dto.footerMessage || 'Thank you for your purchase!',
      format: dto.format || 'thermal',
      status: 'active',
    });

    return await receipt.save();
  }

  /**
   * Get receipt by ID
   */
  async getById(shopId: string, receiptId: string): Promise<ReceiptDocument> {
    const receipt = await this.receiptModel.findOne({
      _id: new Types.ObjectId(receiptId),
      shopId: new Types.ObjectId(shopId),
    }).exec();

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    return receipt;
  }

  /**
   * Get receipt by order ID
   */
  async getByOrderId(shopId: string, orderId: string): Promise<ReceiptDocument | null> {
    return await this.receiptModel.findOne({
      shopId: new Types.ObjectId(shopId),
      orderId: new Types.ObjectId(orderId),
      status: 'active',
    }).exec();
  }

  /**
   * Get receipts with filters
   */
  async getReceipts(shopId: string, filters?: ReceiptFilters): Promise<ReceiptDocument[]> {
    const query: any = { shopId: new Types.ObjectId(shopId) };

    if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
      query.primaryPaymentMethod = filters.paymentMethod;
    }

    if (filters?.customerPhone) {
      query.customerPhone = { $regex: filters.customerPhone, $options: 'i' };
    }

    if (filters?.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    if (filters?.from || filters?.to) {
      query.createdAt = {};
      if (filters.from) {
        query.createdAt.$gte = new Date(filters.from);
      }
      if (filters.to) {
        query.createdAt.$lte = new Date(filters.to);
      }
    }

    const limit = filters?.limit || 50;
    const skip = filters?.skip || 0;

    return await this.receiptModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Void a receipt
   */
  async voidReceipt(shopId: string, receiptId: string, userId: string, reason: string): Promise<ReceiptDocument> {
    const receipt = await this.getById(shopId, receiptId);

    if (receipt.status === 'voided') {
      throw new BadRequestException('Receipt is already voided');
    }

    receipt.status = 'voided';
    receipt.voidReason = reason;
    receipt.voidedAt = new Date();
    receipt.voidedBy = new Types.ObjectId(userId);

    return await receipt.save();
  }

  /**
   * Track reprint
   */
  async trackReprint(shopId: string, receiptId: string): Promise<ReceiptDocument> {
    const receipt = await this.getById(shopId, receiptId);

    receipt.reprintCount = (receipt.reprintCount || 0) + 1;
    receipt.lastReprintAt = new Date();
    receipt.status = 'reprinted';

    return await receipt.save();
  }

  /**
   * Get receipt statistics
   */
  async getStats(shopId: string, from?: string, to?: string): Promise<any> {
    const matchStage: any = { shopId: new Types.ObjectId(shopId) };

    if (from || to) {
      matchStage.createdAt = {};
      if (from) matchStage.createdAt.$gte = new Date(from);
      if (to) matchStage.createdAt.$lte = new Date(to);
    }

    const stats = await this.receiptModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalReceipts: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          averageAmount: { $avg: '$total' },
          totalTax: { $sum: '$tax' },
          byPaymentMethod: {
            $push: {
              method: '$primaryPaymentMethod',
              amount: '$total',
            },
          },
        },
      },
    ]).exec();

    if (stats.length === 0) {
      return {
        totalReceipts: 0,
        totalAmount: 0,
        averageAmount: 0,
        totalTax: 0,
        byPaymentMethod: {},
      };
    }

    // Aggregate by payment method
    const byMethod: Record<string, { count: number; amount: number }> = {};
    for (const item of stats[0].byPaymentMethod) {
      if (!byMethod[item.method]) {
        byMethod[item.method] = { count: 0, amount: 0 };
      }
      byMethod[item.method].count++;
      byMethod[item.method].amount += item.amount;
    }

    return {
      totalReceipts: stats[0].totalReceipts,
      totalAmount: stats[0].totalAmount,
      averageAmount: Math.round(stats[0].averageAmount * 100) / 100,
      totalTax: stats[0].totalTax,
      byPaymentMethod: byMethod,
    };
  }

  /**
   * Generate formatted receipt text (for thermal printer - 80mm/58mm)
   */
  generateReceiptText(receipt: ReceiptDocument, width: 32 | 42 = 32): string {
    const lines: string[] = [];
    const divider = '='.repeat(width);
    const thinDivider = '-'.repeat(width);

    // Header
    lines.push(divider);
    lines.push(this.centerText(receipt.shopName.toUpperCase(), width));
    if (receipt.shopAddress) {
      lines.push(this.centerText(receipt.shopAddress, width));
    }
    if (receipt.shopPhone) {
      lines.push(this.centerText(`Tel: ${receipt.shopPhone}`, width));
    }
    if (receipt.shopTaxPin) {
      lines.push(this.centerText(`PIN: ${receipt.shopTaxPin}`, width));
    }
    lines.push(divider);

    // Receipt info
    lines.push(`Receipt: ${receipt.receiptNumber}`);
    lines.push(`Order: ${receipt.orderNumber}`);
    lines.push(`Date: ${new Date(receipt.createdAt!).toLocaleString('en-KE')}`);
    if (receipt.cashierName) {
      lines.push(`Cashier: ${receipt.cashierName}`);
    }
    if (receipt.customerName) {
      lines.push(`Customer: ${receipt.customerName}`);
    }

    // Items
    lines.push(thinDivider);
    lines.push('ITEMS');
    lines.push(thinDivider);

    for (const item of receipt.items) {
      const name = item.name.substring(0, width - 15);
      const qty = `${item.quantity}x`;
      const price = this.formatCurrency(item.lineTotal);
      lines.push(`${name}`);
      lines.push(`  ${qty.padEnd(6)} ${price.padStart(width - 8)}`);
    }

    // Totals
    lines.push(thinDivider);
    lines.push(this.formatLine('Subtotal:', this.formatCurrency(receipt.subtotal), width));
    if (receipt.taxRate) {
      lines.push(this.formatLine(`Tax (${(receipt.taxRate * 100).toFixed(0)}%):`, this.formatCurrency(receipt.tax), width));
    } else {
      lines.push(this.formatLine('Tax:', this.formatCurrency(receipt.tax), width));
    }
    if (receipt.discount && receipt.discount > 0) {
      lines.push(this.formatLine('Discount:', `-${this.formatCurrency(receipt.discount)}`, width));
    }
    lines.push(divider);
    lines.push(this.formatLine('TOTAL:', this.formatCurrency(receipt.total), width));
    lines.push(divider);

    // Payment info
    for (const payment of receipt.payments) {
      const methodLabel = this.getPaymentMethodLabel(payment.method);
      lines.push(this.formatLine(methodLabel + ':', this.formatCurrency(payment.amount), width));
      if (payment.mpesaReceiptNumber) {
        lines.push(`  Ref: ${payment.mpesaReceiptNumber}`);
      }
      if (payment.amountTendered && payment.change) {
        lines.push(this.formatLine('Tendered:', this.formatCurrency(payment.amountTendered), width));
        lines.push(this.formatLine('Change:', this.formatCurrency(payment.change), width));
      }
    }

    // Footer
    lines.push(thinDivider);
    lines.push(this.centerText(receipt.footerMessage || 'Thank you!', width));
    lines.push(divider);

    return lines.join('\n');
  }

  private centerText(text: string, width: number): string {
    if (text.length >= width) return text.substring(0, width);
    const padding = Math.floor((width - text.length) / 2);
    return ' '.repeat(padding) + text;
  }

  private formatLine(label: string, value: string, width: number): string {
    const space = width - label.length - value.length;
    return label + ' '.repeat(Math.max(1, space)) + value;
  }

  private formatCurrency(amount: number): string {
    return `Ksh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
  }

  private getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      cash: 'Cash',
      mpesa: 'M-Pesa',
      card: 'Card',
      qr: 'QR Pay',
      other: 'Other',
    };
    return labels[method] || method;
  }
}
