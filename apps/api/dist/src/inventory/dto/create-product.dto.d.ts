export declare class CreateProductDto {
    name: string;
    sku?: string;
    barcode?: string;
    categoryId?: string;
    category?: string;
    price: number;
    cost?: number;
    stock?: number;
    tax?: number;
    status?: 'active' | 'inactive';
    brand?: string;
    description?: string;
    tags?: string[];
    lowStockThreshold?: number;
    reorderPoint?: number;
}
export declare class BulkImportOptionsDto {
    autoCreateCategories?: boolean;
    autoSuggestCategories?: boolean;
    updateExisting?: boolean;
    skipDuplicates?: boolean;
}
export declare class BulkImportDto {
    products: CreateProductDto[];
    options?: BulkImportOptionsDto;
}
