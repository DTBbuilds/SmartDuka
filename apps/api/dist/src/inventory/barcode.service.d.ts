import { Model } from 'mongoose';
import { ProductDocument } from './schemas/product.schema';
export interface BarcodeData {
    barcode: string;
    format: 'ean13' | 'ean8' | 'code128' | 'qr' | 'unknown';
    isValid: boolean;
    checkDigit?: number;
}
export declare class BarcodeService {
    private productModel;
    private readonly logger;
    constructor(productModel: Model<ProductDocument>);
    validateBarcode(barcode: string): BarcodeData;
    scanBarcode(barcode: string, shopId: string): Promise<ProductDocument | null>;
    generateBarcode(productId: string, shopId: string): Promise<string>;
    bulkImportBarcodes(shopId: string, barcodes: Array<{
        barcode: string;
        productId: string;
    }>): Promise<{
        successful: number;
        failed: number;
        errors: Array<{
            barcode: string;
            error: string;
        }>;
    }>;
    private validateEAN13;
    private validateEAN8;
    private generateEAN13;
}
