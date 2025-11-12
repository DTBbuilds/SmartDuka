import { ReorderService } from './reorder.service';
export declare class ReorderController {
    private readonly reorderService;
    constructor(reorderService: ReorderService);
    checkAndCreatePOs(user: Record<string, any>): Promise<{
        created: number;
        errors: string[];
        skipped: number;
    }>;
    getLowStockProducts(user: Record<string, any>): Promise<(import("mongoose").Document<unknown, {}, import("../inventory/schemas/product.schema").Product, {}, {}> & import("../inventory/schemas/product.schema").Product & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getReorderStats(user: Record<string, any>): Promise<{
        totalProducts: number;
        productsWithReorderPoint: number;
        productsNeedingReorder: number;
        averageReorderPoint: number;
        averageReorderQuantity: number;
    }>;
    getReorderStatus(productId: string, user: Record<string, any>): Promise<{
        productId: string;
        name: string;
        currentStock: number;
        reorderPoint: number;
        reorderQuantity: number;
        needsReorder: boolean;
        daysUntilStockout: number;
    } | null>;
    updateReorderSettings(productId: string, settings: any, user: Record<string, any>): Promise<(import("mongoose").Document<unknown, {}, import("../inventory/schemas/product.schema").Product, {}, {}> & import("../inventory/schemas/product.schema").Product & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
}
