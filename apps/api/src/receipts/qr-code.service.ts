import { Injectable, BadRequestException, Logger } from '@nestjs/common';

@Injectable()
export class QRCodeService {
  private readonly logger = new Logger(QRCodeService.name);

  /**
   * Generate QR code for order/receipt
   */
  generateQRCode(data: string, size: number = 200): string {
    try {
      // Using QR code API - in production, use a library like 'qrcode'
      // For now, return a placeholder URL
      const encodedData = encodeURIComponent(data);
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}`;

      this.logger.log(`QR code generated for data: ${data.substring(0, 50)}...`);

      return qrCodeUrl;
    } catch (error: any) {
      this.logger.error('QR code generation failed', error?.message);
      throw new BadRequestException('Failed to generate QR code');
    }
  }

  /**
   * Generate QR code for product barcode
   */
  generateProductQRCode(productId: string, productName: string): string {
    try {
      const data = JSON.stringify({
        type: 'product',
        id: productId,
        name: productName,
      });

      return this.generateQRCode(data);
    } catch (error: any) {
      this.logger.error('Product QR code generation failed', error?.message);
      throw error;
    }
  }

  /**
   * Generate QR code for order/receipt
   */
  generateOrderQRCode(orderId: string, orderNumber: string, total: number): string {
    try {
      const data = JSON.stringify({
        type: 'order',
        id: orderId,
        orderNumber,
        total,
        timestamp: new Date().toISOString(),
      });

      return this.generateQRCode(data);
    } catch (error: any) {
      this.logger.error('Order QR code generation failed', error?.message);
      throw error;
    }
  }

  /**
   * Generate QR code for loyalty program
   */
  generateLoyaltyQRCode(customerId: string, loyaltyCode: string): string {
    try {
      const data = JSON.stringify({
        type: 'loyalty',
        customerId,
        code: loyaltyCode,
      });

      return this.generateQRCode(data);
    } catch (error: any) {
      this.logger.error('Loyalty QR code generation failed', error?.message);
      throw error;
    }
  }

  /**
   * Generate QR code for payment
   */
  generatePaymentQRCode(orderId: string, amount: number, phoneNumber: string): string {
    try {
      // M-Pesa payment QR code
      const data = `BEGIN:VCARD
VERSION:3.0
FN:Payment
TEL:${phoneNumber}
NOTE:Order ${orderId} - Amount: ${amount}
END:VCARD`;

      return this.generateQRCode(data);
    } catch (error: any) {
      this.logger.error('Payment QR code generation failed', error?.message);
      throw error;
    }
  }
}
