import { BarcodeService } from './barcode.service';
import { ScanBarcodeDto, BulkImportBarcodesDto, ValidateBarcodeDto } from './dto/barcode.dto';
export declare class BarcodeController {
    private readonly barcodeService;
    constructor(barcodeService: BarcodeService);
    scanBarcode(dto: ScanBarcodeDto, user: Record<string, any>): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/product.schema").Product, {}, {}> & import("./schemas/product.schema").Product & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
    generateBarcode(productId: string, user: Record<string, any>): Promise<string>;
    validateBarcode(dto: ValidateBarcodeDto): Promise<import("./barcode.service").BarcodeData>;
    bulkImport(dto: BulkImportBarcodesDto, user: Record<string, any>): Promise<{
        successful: number;
        failed: number;
        errors: Array<{
            barcode: string;
            error: string;
        }>;
    }>;
}
