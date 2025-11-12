import { Model } from 'mongoose';
import { ProductDocument } from './schemas/product.schema';
import { CategoryDocument } from './schemas/category.schema';
import { StockAdjustmentDocument } from './schemas/stock-adjustment.schema';
import { StockReconciliationDocument } from './schemas/stock-reconciliation.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
export declare class InventoryService {
    private readonly productModel;
    private readonly categoryModel;
    private readonly adjustmentModel;
    private readonly reconciliationModel;
    constructor(productModel: Model<ProductDocument>, categoryModel: Model<CategoryDocument>, adjustmentModel: Model<StockAdjustmentDocument>, reconciliationModel: Model<StockReconciliationDocument>);
    createProduct(shopId: string, dto: CreateProductDto): Promise<ProductDocument>;
    getProductById(shopId: string, productId: string): Promise<ProductDocument | null>;
    listProducts(shopId: string, q: QueryProductsDto): Promise<ProductDocument[]>;
    listCategories(shopId: string): Promise<CategoryDocument[]>;
    createCategory(shopId: string, dto: CreateCategoryDto): Promise<CategoryDocument>;
    updateCategory(shopId: string, categoryId: string, dto: UpdateCategoryDto): Promise<CategoryDocument | null>;
    deleteCategory(shopId: string, categoryId: string): Promise<void>;
    getCategoryWithProducts(shopId: string, categoryId: string): Promise<any>;
    getCategoryHierarchy(shopId: string): Promise<any[]>;
    updateStock(shopId: string, productId: string, quantityChange: number): Promise<ProductDocument | null>;
    getLowStockProducts(shopId: string, threshold?: number): Promise<ProductDocument[]>;
    importProducts(shopId: string, products: CreateProductDto[]): Promise<{
        imported: number;
        errors: string[];
    }>;
    exportProducts(shopId: string, res: any, categoryId?: string): Promise<void>;
    createStockAdjustment(shopId: string, productId: string, quantityChange: number, reason: string, adjustedBy: string, notes?: string): Promise<StockAdjustmentDocument>;
    getStockAdjustmentHistory(shopId: string, filters?: {
        productId?: string;
        reason?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<StockAdjustmentDocument[]>;
    getExpiringProducts(shopId: string, daysUntilExpiry?: number): Promise<ProductDocument[]>;
    createStockReconciliation(shopId: string, productId: string, physicalCount: number, reconciliationDate: Date, reconcililedBy: string, notes?: string): Promise<StockReconciliationDocument>;
    getReconciliationHistory(shopId: string, filters?: {
        productId?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<StockReconciliationDocument[]>;
    getInventoryStats(shopId: string): Promise<{
        totalProducts: number;
        activeProducts: number;
        lowStockProducts: number;
        expiringProducts: number;
        totalStockValue: number;
    }>;
    getBranchStock(shopId: string, productId: string, branchId: string): Promise<number>;
    updateBranchStock(shopId: string, productId: string, branchId: string, quantityChange: number): Promise<ProductDocument | null>;
    getLowStockProductsByBranch(shopId: string, branchId: string, threshold?: number): Promise<ProductDocument[]>;
    getBranchInventoryStats(shopId: string, branchId: string): Promise<{
        totalProducts: number;
        activeProducts: number;
        lowStockProducts: number;
        totalStockValue: number;
    }>;
    transferBranchStock(shopId: string, productId: string, fromBranchId: string, toBranchId: string, quantity: number, transferredBy: string): Promise<ProductDocument | null>;
}
