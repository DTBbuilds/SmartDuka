import { Model } from 'mongoose';
import { ProductDocument } from '../inventory/schemas/product.schema';
import { PurchaseDocument } from '../purchases/purchase.schema';
export declare class ReorderService {
    private readonly productModel;
    private readonly purchaseModel;
    private readonly logger;
    constructor(productModel: Model<ProductDocument>, purchaseModel: Model<PurchaseDocument>);
    checkAndCreatePOs(shopId: string, userId: string): Promise<{
        created: number;
        errors: string[];
        skipped: number;
    }>;
    getLowStockProducts(shopId: string): Promise<ProductDocument[]>;
    getReorderStatus(shopId: string, productId: string): Promise<{
        productId: string;
        name: string;
        currentStock: number;
        reorderPoint: number;
        reorderQuantity: number;
        needsReorder: boolean;
        daysUntilStockout: number;
    } | null>;
    updateReorderSettings(shopId: string, productId: string, settings: {
        reorderPoint?: number;
        reorderQuantity?: number;
        preferredSupplierId?: string;
        leadTimeDays?: number;
    }): Promise<ProductDocument | null>;
    getReorderStats(shopId: string): Promise<{
        totalProducts: number;
        productsWithReorderPoint: number;
        productsNeedingReorder: number;
        averageReorderPoint: number;
        averageReorderQuantity: number;
    }>;
    private estimateDailyUsage;
    private calculateExpectedDelivery;
}
