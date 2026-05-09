import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import * as bwipjs from 'bwip-js';

export type BarcodeType = 'qr_code' | 'code128' | 'code39' | 'ean13' | 'upca' | 'code93';

export interface BarcodeOptions {
  width?: number;
  height?: number;
  scale?: number;
  includetext?: boolean;
  textxalign?: 'center' | 'left' | 'right';
}

@Injectable()
export class BarcodeService {
  /**
   * Generate QR code as data URL
   */
  async generateQRCode(text: string, options: { width?: number; margin?: number } = {}): Promise<string> {
    try {
      const dataUrl = await QRCode.toDataURL(text, {
        width: options.width || 200,
        margin: options.margin || 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      return dataUrl;
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Generate 1D barcode as PNG buffer
   */
  async generateBarcode(
    type: BarcodeType,
    text: string,
    options: BarcodeOptions = {},
  ): Promise<Buffer> {
    try {
      // Map our types to bwip-js types
      const bwipType = this.mapBarcodeType(type);
      
      const params: any = {
        bcid: bwipType,
        text: text,
        scale: options.scale || 3,
        height: options.height || 10,
        includetext: options.includetext ?? true,
        textxalign: options.textxalign || 'center',
      };

      // Add width if specified
      if (options.width) {
        params.width = options.width;
      }

      const png = await bwipjs.toBuffer(params);
      return png;
    } catch (error) {
      throw new Error(`Failed to generate barcode: ${error.message}`);
    }
  }

  /**
   * Generate barcode as base64 data URL
   */
  async generateBarcodeDataUrl(
    type: BarcodeType,
    text: string,
    options: BarcodeOptions = {},
  ): Promise<string> {
    const buffer = await this.generateBarcode(type, text, options);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }

  /**
   * Generate receipt verification URL
   */
  generateReceiptVerifyUrl(baseUrl: string, receiptNumber: string): string {
    return `${baseUrl}/verify-receipt/${receiptNumber}`;
  }

  /**
   * Generate barcode content based on type
   */
  generateBarcodeContent(
    type: 'receipt_number' | 'transaction_id' | 'shop_url' | 'verify_url' | 'custom',
    data: {
      receiptNumber?: string;
      transactionId?: string;
      shopUrl?: string;
      customText?: string;
    },
  ): string {
    switch (type) {
      case 'receipt_number':
        return data.receiptNumber || '';
      case 'transaction_id':
        return data.transactionId || '';
      case 'shop_url':
        return data.shopUrl || '';
      case 'verify_url':
        return data.receiptNumber ? `${data.shopUrl}/verify/${data.receiptNumber}` : '';
      case 'custom':
        return data.customText || '';
      default:
        return '';
    }
  }

  /**
   * Validate barcode content for specific type
   */
  validateBarcodeContent(type: BarcodeType, content: string): boolean {
    if (!content || content.length === 0) {
      return false;
    }

    switch (type) {
      case 'ean13':
        // EAN-13 must be 13 digits
        return /^\d{13}$/.test(content);
      case 'upca':
        // UPC-A must be 12 digits
        return /^\d{12}$/.test(content);
      case 'code128':
      case 'code39':
      case 'code93':
        // These can accept various characters
        return content.length <= 48; // Reasonable limit
      case 'qr_code':
        // QR codes can handle more data
        return content.length <= 2953; // QR code maximum
      default:
        return true;
    }
  }

  /**
   * Generate HTML img tag with barcode
   */
  async generateBarcodeHtml(
    type: BarcodeType,
    text: string,
    options: BarcodeOptions & { alt?: string; className?: string } = {},
  ): Promise<string> {
    const dataUrl = await this.generateBarcodeDataUrl(type, text, options);
    const { alt = 'Barcode', className = '' } = options;
    
    if (type === 'qr_code') {
      return `<img src="${dataUrl}" alt="${alt}" class="${className}" style="max-width: 150px;" />`;
    }
    
    return `<img src="${dataUrl}" alt="${alt}" class="${className}" style="max-width: 100%; height: auto;" />`;
  }

  /**
   * Map our barcode types to bwip-js barcode types
   */
  private mapBarcodeType(type: BarcodeType): string {
    const typeMap: Record<BarcodeType, string> = {
      qr_code: 'qrcode', // bwip-js uses 'qrcode' not 'qr_code'
      code128: 'code128',
      code39: 'code39',
      ean13: 'ean13',
      upca: 'upca',
      code93: 'code93',
    };
    return typeMap[type] || 'code128';
  }

  /**
   * Generate thermal printer compatible barcode text
   * Returns ESC/POS commands for direct printing
   */
  generateThermalBarcodeCommands(
    type: BarcodeType,
    text: string,
    width: 58 | 80 = 80,
  ): string {
    // ESC/POS barcode commands
    const GS = '\x1D';
    const ESC = '\x1B';
    
    let commands = '';
    
    // Set barcode height
    commands += `${GS}h${String.fromCharCode(100)}`; // Height 100 dots
    
    // Set barcode width
    const barcodeWidth = width === 58 ? 2 : 3;
    commands += `${GS}w${String.fromCharCode(barcodeWidth)}`;
    
    // Select barcode type and print
    const barcodeTypeCode = this.getThermalBarcodeTypeCode(type);
    commands += `${GS}k${String.fromCharCode(barcodeTypeCode)}${String.fromCharCode(text.length)}${text}`;
    
    return commands;
  }

  private getThermalBarcodeTypeCode(type: BarcodeType): number {
    const codes: Record<BarcodeType, number> = {
      'upca': 0,
      'ean13': 2,
      'code39': 4,
      'code128': 73,
      'code93': 72,
      'qr_code': 0, // QR not standard in ESC/POS, handled differently
    };
    return codes[type] || 73; // Default to Code 128
  }
}
