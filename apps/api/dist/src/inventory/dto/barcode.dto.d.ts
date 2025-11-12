export declare class ScanBarcodeDto {
    barcode: string;
}
export declare class GenerateBarcodeDto {
    productId: string;
}
export declare class BulkImportBarcodesItemDto {
    barcode: string;
    productId: string;
}
export declare class BulkImportBarcodesDto {
    barcodes: BulkImportBarcodesItemDto[];
}
export declare class ValidateBarcodeDto {
    barcode: string;
}
