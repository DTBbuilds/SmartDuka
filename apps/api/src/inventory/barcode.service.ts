import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';

export interface BarcodeData {
  barcode: string;
  format: 'ean13' | 'ean8' | 'code128' | 'qr' | 'unknown';
  isValid: boolean;
  checkDigit?: number;
}

@Injectable()
export class BarcodeService {
  private readonly logger = new Logger(BarcodeService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  /**
   * Validate barcode format
   */
  validateBarcode(barcode: string): BarcodeData {
    try {
      // Remove spaces and hyphens
      const cleanBarcode = barcode.replace(/[\s-]/g, '');

      // Detect format
      let format: BarcodeData['format'] = 'unknown';
      let isValid = false;

      if (cleanBarcode.length === 13 && /^\d+$/.test(cleanBarcode)) {
        // EAN-13
        format = 'ean13';
        isValid = this.validateEAN13(cleanBarcode);
      } else if (cleanBarcode.length === 8 && /^\d+$/.test(cleanBarcode)) {
        // EAN-8
        format = 'ean8';
        isValid = this.validateEAN8(cleanBarcode);
      } else if (/^\d+$/.test(cleanBarcode)) {
        // Code 128 (variable length)
        format = 'code128';
        isValid = cleanBarcode.length >= 4 && cleanBarcode.length <= 20;
      } else if (cleanBarcode.startsWith('http') || cleanBarcode.includes('://')) {
        // QR code (URL)
        format = 'qr';
        isValid = true;
      }

      return {
        barcode: cleanBarcode,
        format,
        isValid,
      };
    } catch (error: any) {
      this.logger.error('Barcode validation failed', error?.message);
      return {
        barcode,
        format: 'unknown',
        isValid: false,
      };
    }
  }

  /**
   * Scan barcode and return product
   */
  async scanBarcode(barcode: string, shopId: string): Promise<ProductDocument | null> {
    try {
      const validation = this.validateBarcode(barcode);

      if (!validation.isValid) {
        throw new BadRequestException('Invalid barcode format');
      }

      // Look up product by barcode
      const product = await this.productModel
        .findOne({
          shopId: new Types.ObjectId(shopId),
          barcode: validation.barcode,
          status: 'active',
        })
        .exec();

      if (!product) {
        throw new BadRequestException('Product not found for barcode: ' + validation.barcode);
      }

      this.logger.log(`Barcode scanned: ${validation.barcode} -> ${product.name}`);

      return product;
    } catch (error: any) {
      this.logger.error('Barcode scan failed', error?.message);
      throw error;
    }
  }

  /**
   * Generate barcode for product
   */
  async generateBarcode(productId: string, shopId: string): Promise<string> {
    try {
      const product = await this.productModel.findById(productId).exec();

      if (!product) {
        throw new BadRequestException('Product not found');
      }

      if (product.shopId.toString() !== shopId) {
        throw new BadRequestException('Product does not belong to this shop');
      }

      // If product already has barcode, return it
      if (product.barcode) {
        return product.barcode;
      }

      // Generate EAN-13 barcode
      const barcode = this.generateEAN13();

      // Check if barcode already exists
      const existing = await this.productModel
        .findOne({
          shopId: new Types.ObjectId(shopId),
          barcode,
        })
        .exec();

      if (existing) {
        // Recursively generate new barcode
        return this.generateBarcode(productId, shopId);
      }

      // Update product with barcode
      product.barcode = barcode;
      await product.save();

      this.logger.log(`Barcode generated for product ${productId}: ${barcode}`);

      return barcode;
    } catch (error: any) {
      this.logger.error('Barcode generation failed', error?.message);
      throw error;
    }
  }

  /**
   * Bulk import products with barcodes
   */
  async bulkImportBarcodes(
    shopId: string,
    barcodes: Array<{ barcode: string; productId: string }>,
  ): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ barcode: string; error: string }>;
  }> {
    try {
      let successful = 0;
      let failed = 0;
      const errors: Array<{ barcode: string; error: string }> = [];

      for (const item of barcodes) {
        try {
          const validation = this.validateBarcode(item.barcode);

          if (!validation.isValid) {
            failed++;
            errors.push({
              barcode: item.barcode,
              error: 'Invalid barcode format',
            });
            continue;
          }

          const product = await this.productModel.findById(item.productId).exec();

          if (!product) {
            failed++;
            errors.push({
              barcode: item.barcode,
              error: 'Product not found',
            });
            continue;
          }

          if (product.shopId.toString() !== shopId) {
            failed++;
            errors.push({
              barcode: item.barcode,
              error: 'Product does not belong to this shop',
            });
            continue;
          }

          // Check for duplicate barcode
          const existing = await this.productModel
            .findOne({
              shopId: new Types.ObjectId(shopId),
              barcode: validation.barcode,
              _id: { $ne: item.productId },
            })
            .exec();

          if (existing) {
            failed++;
            errors.push({
              barcode: item.barcode,
              error: 'Barcode already assigned to another product',
            });
            continue;
          }

          product.barcode = validation.barcode;
          await product.save();

          successful++;
        } catch (error: any) {
          failed++;
          errors.push({
            barcode: item.barcode,
            error: error?.message || 'Unknown error',
          });
        }
      }

      this.logger.log(
        `Bulk barcode import: ${successful} successful, ${failed} failed`,
      );

      return { successful, failed, errors };
    } catch (error: any) {
      this.logger.error('Bulk barcode import failed', error?.message);
      throw new BadRequestException('Bulk barcode import failed');
    }
  }

  /**
   * Private helper: Validate EAN-13
   */
  private validateEAN13(barcode: string): boolean {
    if (barcode.length !== 13) return false;

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(barcode[i], 10);
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(barcode[12], 10);
  }

  /**
   * Private helper: Validate EAN-8
   */
  private validateEAN8(barcode: string): boolean {
    if (barcode.length !== 8) return false;

    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const digit = parseInt(barcode[i], 10);
      sum += digit * (i % 2 === 0 ? 3 : 1);
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(barcode[7], 10);
  }

  /**
   * Private helper: Generate EAN-13
   */
  private generateEAN13(): string {
    // Generate random 12 digits
    let barcode = '';
    for (let i = 0; i < 12; i++) {
      barcode += Math.floor(Math.random() * 10);
    }

    // Calculate check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(barcode[i], 10);
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    barcode += checkDigit;

    return barcode;
  }
}
