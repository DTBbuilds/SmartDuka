import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReceiptTemplate, ReceiptTemplateDocument } from './schemas/receipt-template.schema';
import { CreateReceiptTemplateDto } from './dto/create-receipt-template.dto';

@Injectable()
export class ReceiptsService {
  constructor(
    @InjectModel(ReceiptTemplate.name)
    private receiptTemplateModel: Model<ReceiptTemplateDocument>,
  ) {}

  async createTemplate(
    shopId: string,
    dto: CreateReceiptTemplateDto,
  ): Promise<ReceiptTemplateDocument> {
    // If this is set as default, unset other defaults
    if (dto.isDefault) {
      await this.receiptTemplateModel.updateMany(
        { shopId: new Types.ObjectId(shopId) },
        { isDefault: false },
      );
    }

    const template = new this.receiptTemplateModel({
      shopId: new Types.ObjectId(shopId),
      ...dto,
    });

    return template.save();
  }

  async findAll(shopId: string): Promise<ReceiptTemplateDocument[]> {
    return this.receiptTemplateModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .sort({ isDefault: -1, createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<ReceiptTemplateDocument | null> {
    return this.receiptTemplateModel.findById(id).exec();
  }

  async getDefault(shopId: string): Promise<ReceiptTemplateDocument | null> {
    return this.receiptTemplateModel
      .findOne({
        shopId: new Types.ObjectId(shopId),
        isDefault: true,
        status: 'active',
      })
      .exec();
  }

  async updateTemplate(
    id: string,
    dto: Partial<CreateReceiptTemplateDto>,
  ): Promise<ReceiptTemplateDocument | null> {
    const template = await this.receiptTemplateModel.findById(id).exec();
    if (!template) {
      throw new BadRequestException('Template not found');
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.receiptTemplateModel.updateMany(
        { shopId: template.shopId, _id: { $ne: new Types.ObjectId(id) } },
        { isDefault: false },
      );
    }

    return this.receiptTemplateModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
  }

  async deleteTemplate(id: string): Promise<ReceiptTemplateDocument | null> {
    return this.receiptTemplateModel.findByIdAndDelete(id).exec();
  }

  async generateReceiptHTML(
    template: ReceiptTemplateDocument,
    orderData: {
      orderNumber: string;
      items: Array<{ name: string; quantity: number; price: number; total: number }>;
      subtotal: number;
      tax: number;
      discount: number;
      total: number;
      paymentMethod: string;
      cashierName: string;
      timestamp: Date;
    },
  ): Promise<string> {
    const itemsHTML = orderData.items
      .map(
        (item) =>
          `<tr>
        <td>${item.name}</td>
        <td style="text-align: right;">${item.quantity}</td>
        <td style="text-align: right;">Ksh ${item.price.toLocaleString()}</td>
        <td style="text-align: right;">Ksh ${item.total.toLocaleString()}</td>
      </tr>`,
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: monospace; max-width: 400px; margin: 0; padding: 10px; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h2 { margin: 5px 0; }
          .header p { margin: 2px 0; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th { border-bottom: 1px solid #000; padding: 5px 0; text-align: left; font-size: 12px; }
          td { padding: 3px 0; font-size: 12px; }
          .summary { margin-top: 10px; border-top: 1px solid #000; padding-top: 10px; }
          .summary-row { display: flex; justify-content: space-between; margin: 3px 0; }
          .total { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; }
          .footer { text-align: center; margin-top: 20px; font-size: 11px; }
          ${template.showQRCode ? '.qr-code { text-align: center; margin: 10px 0; }' : ''}
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${template.companyName || 'Receipt'}</h2>
          ${template.header ? `<p>${template.header}</p>` : ''}
          ${template.companyPhone ? `<p>Tel: ${template.companyPhone}</p>` : ''}
          ${template.companyEmail ? `<p>Email: ${template.companyEmail}</p>` : ''}
        </div>

        <div style="font-size: 11px; margin-bottom: 10px;">
          <p>Order: ${orderData.orderNumber}</p>
          <p>Date: ${orderData.timestamp.toLocaleString()}</p>
          <p>Cashier: ${orderData.cashierName}</p>
        </div>

        ${
          template.showItemDetails
            ? `
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: right;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
        `
            : ''
        }

        <div class="summary">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>Ksh ${orderData.subtotal.toLocaleString()}</span>
          </div>
          ${template.showTaxBreakdown && orderData.tax > 0 ? `
            <div class="summary-row">
              <span>Tax:</span>
              <span>Ksh ${orderData.tax.toLocaleString()}</span>
            </div>
          ` : ''}
          ${orderData.discount > 0 ? `
            <div class="summary-row">
              <span>Discount:</span>
              <span>-Ksh ${orderData.discount.toLocaleString()}</span>
            </div>
          ` : ''}
          <div class="summary-row total">
            <span>Total:</span>
            <span>Ksh ${orderData.total.toLocaleString()}</span>
          </div>
          <div class="summary-row">
            <span>Payment:</span>
            <span>${orderData.paymentMethod}</span>
          </div>
        </div>

        ${template.showQRCode && template.qrCodeContent ? `
          <div class="qr-code">
            <img src="${template.qrCodeContent}" alt="QR Code" style="width: 150px; height: 150px;">
          </div>
        ` : ''}

        ${template.showThankYouMessage ? `
          <div class="footer">
            <p>${template.thankYouMessage || 'Thank you for your purchase!'}</p>
            ${template.footer ? `<p>${template.footer}</p>` : ''}
          </div>
        ` : ''}
      </body>
      </html>
    `;
  }
}
