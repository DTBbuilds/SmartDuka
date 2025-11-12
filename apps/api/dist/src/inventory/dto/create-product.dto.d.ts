export declare class CreateProductDto {
    name: string;
    sku?: string;
    barcode?: string;
    categoryId?: string;
    price: number;
    cost?: number;
    stock?: number;
    tax?: number;
    status?: 'active' | 'inactive';
}
