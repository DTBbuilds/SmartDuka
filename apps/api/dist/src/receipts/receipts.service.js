"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const receipt_template_schema_1 = require("./schemas/receipt-template.schema");
let ReceiptsService = class ReceiptsService {
    receiptTemplateModel;
    constructor(receiptTemplateModel) {
        this.receiptTemplateModel = receiptTemplateModel;
    }
    async createTemplate(shopId, dto) {
        if (dto.isDefault) {
            await this.receiptTemplateModel.updateMany({ shopId: new mongoose_2.Types.ObjectId(shopId) }, { isDefault: false });
        }
        const template = new this.receiptTemplateModel({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            ...dto,
        });
        return template.save();
    }
    async findAll(shopId) {
        return this.receiptTemplateModel
            .find({ shopId: new mongoose_2.Types.ObjectId(shopId) })
            .sort({ isDefault: -1, createdAt: -1 })
            .exec();
    }
    async findById(id) {
        return this.receiptTemplateModel.findById(id).exec();
    }
    async getDefault(shopId) {
        return this.receiptTemplateModel
            .findOne({
            shopId: new mongoose_2.Types.ObjectId(shopId),
            isDefault: true,
            status: 'active',
        })
            .exec();
    }
    async updateTemplate(id, dto) {
        const template = await this.receiptTemplateModel.findById(id).exec();
        if (!template) {
            throw new common_1.BadRequestException('Template not found');
        }
        if (dto.isDefault) {
            await this.receiptTemplateModel.updateMany({ shopId: template.shopId, _id: { $ne: new mongoose_2.Types.ObjectId(id) } }, { isDefault: false });
        }
        return this.receiptTemplateModel
            .findByIdAndUpdate(id, dto, { new: true })
            .exec();
    }
    async deleteTemplate(id) {
        return this.receiptTemplateModel.findByIdAndDelete(id).exec();
    }
    async generateReceiptHTML(template, orderData) {
        const itemsHTML = orderData.items
            .map((item) => `<tr>
        <td>${item.name}</td>
        <td style="text-align: right;">${item.quantity}</td>
        <td style="text-align: right;">Ksh ${item.price.toLocaleString()}</td>
        <td style="text-align: right;">Ksh ${item.total.toLocaleString()}</td>
      </tr>`)
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

        ${template.showItemDetails
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
            : ''}

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
};
exports.ReceiptsService = ReceiptsService;
exports.ReceiptsService = ReceiptsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(receipt_template_schema_1.ReceiptTemplate.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ReceiptsService);
//# sourceMappingURL=receipts.service.js.map