"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var QRCodeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QRCodeService = void 0;
const common_1 = require("@nestjs/common");
let QRCodeService = QRCodeService_1 = class QRCodeService {
    logger = new common_1.Logger(QRCodeService_1.name);
    generateQRCode(data, size = 200) {
        try {
            const encodedData = encodeURIComponent(data);
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}`;
            this.logger.log(`QR code generated for data: ${data.substring(0, 50)}...`);
            return qrCodeUrl;
        }
        catch (error) {
            this.logger.error('QR code generation failed', error?.message);
            throw new common_1.BadRequestException('Failed to generate QR code');
        }
    }
    generateProductQRCode(productId, productName) {
        try {
            const data = JSON.stringify({
                type: 'product',
                id: productId,
                name: productName,
            });
            return this.generateQRCode(data);
        }
        catch (error) {
            this.logger.error('Product QR code generation failed', error?.message);
            throw error;
        }
    }
    generateOrderQRCode(orderId, orderNumber, total) {
        try {
            const data = JSON.stringify({
                type: 'order',
                id: orderId,
                orderNumber,
                total,
                timestamp: new Date().toISOString(),
            });
            return this.generateQRCode(data);
        }
        catch (error) {
            this.logger.error('Order QR code generation failed', error?.message);
            throw error;
        }
    }
    generateLoyaltyQRCode(customerId, loyaltyCode) {
        try {
            const data = JSON.stringify({
                type: 'loyalty',
                customerId,
                code: loyaltyCode,
            });
            return this.generateQRCode(data);
        }
        catch (error) {
            this.logger.error('Loyalty QR code generation failed', error?.message);
            throw error;
        }
    }
    generatePaymentQRCode(orderId, amount, phoneNumber) {
        try {
            const data = `BEGIN:VCARD
VERSION:3.0
FN:Payment
TEL:${phoneNumber}
NOTE:Order ${orderId} - Amount: ${amount}
END:VCARD`;
            return this.generateQRCode(data);
        }
        catch (error) {
            this.logger.error('Payment QR code generation failed', error?.message);
            throw error;
        }
    }
};
exports.QRCodeService = QRCodeService;
exports.QRCodeService = QRCodeService = QRCodeService_1 = __decorate([
    (0, common_1.Injectable)()
], QRCodeService);
//# sourceMappingURL=qr-code.service.js.map