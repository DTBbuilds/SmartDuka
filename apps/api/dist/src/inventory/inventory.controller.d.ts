import { InventoryService } from './inventory.service';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    listProducts(query: QueryProductsDto, user: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/product.schema").Product, {}, {}> & import("./schemas/product.schema").Product & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    createProduct(dto: CreateProductDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("./schemas/product.schema").Product, {}, {}> & import("./schemas/product.schema").Product & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    listCategories(user: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/category.schema").Category, {}, {}> & import("./schemas/category.schema").Category & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getCategoryHierarchy(user: any): Promise<any[]>;
    getCategoryWithProducts(categoryId: string, user: any): Promise<any>;
    createCategory(dto: CreateCategoryDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("./schemas/category.schema").Category, {}, {}> & import("./schemas/category.schema").Category & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateCategory(categoryId: string, dto: UpdateCategoryDto, user: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/category.schema").Category, {}, {}> & import("./schemas/category.schema").Category & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
    deleteCategory(categoryId: string, user: any): Promise<void>;
    updateStock(dto: {
        productId: string;
        quantityChange: number;
    }, user: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/product.schema").Product, {}, {}> & import("./schemas/product.schema").Product & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
    getLowStockProducts(user: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/product.schema").Product, {}, {}> & import("./schemas/product.schema").Product & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    importProducts(dto: {
        products: CreateProductDto[];
    }, user: any): Promise<{
        imported: number;
        errors: string[];
    }>;
    exportProducts(res: any, categoryId: string, user: any): Promise<void>;
    createStockAdjustment(dto: {
        productId: string;
        quantityChange: number;
        reason: string;
        notes?: string;
    }, user: any): Promise<import("mongoose").Document<unknown, {}, import("./schemas/stock-adjustment.schema").StockAdjustment, {}, {}> & import("./schemas/stock-adjustment.schema").StockAdjustment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getAdjustmentHistory(productId: string, reason: string, startDate: string, endDate: string, user: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/stock-adjustment.schema").StockAdjustment, {}, {}> & import("./schemas/stock-adjustment.schema").StockAdjustment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getExpiringProducts(days: string, user: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/product.schema").Product, {}, {}> & import("./schemas/product.schema").Product & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    createReconciliation(dto: {
        productId: string;
        physicalCount: number;
        notes?: string;
    }, user: any): Promise<import("mongoose").Document<unknown, {}, import("./schemas/stock-reconciliation.schema").StockReconciliation, {}, {}> & import("./schemas/stock-reconciliation.schema").StockReconciliation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getReconciliationHistory(productId: string, startDate: string, endDate: string, user: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/stock-reconciliation.schema").StockReconciliation, {}, {}> & import("./schemas/stock-reconciliation.schema").StockReconciliation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getInventoryStats(user: any): Promise<{
        totalProducts: number;
        activeProducts: number;
        lowStockProducts: number;
        expiringProducts: number;
        totalStockValue: number;
    }>;
    getBranchStock(branchId: string, productId: string, user: any): Promise<{
        productId: string;
        branchId: string;
        stock: number;
    }>;
    getLowStockByBranch(branchId: string, user: any, threshold?: string): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/product.schema").Product, {}, {}> & import("./schemas/product.schema").Product & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getBranchInventoryStats(branchId: string, user: any): Promise<{
        totalProducts: number;
        activeProducts: number;
        lowStockProducts: number;
        totalStockValue: number;
    }>;
    updateBranchStock(branchId: string, dto: {
        productId: string;
        quantityChange: number;
    }, user: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/product.schema").Product, {}, {}> & import("./schemas/product.schema").Product & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
    transferBranchStock(dto: {
        productId: string;
        fromBranchId: string;
        toBranchId: string;
        quantity: number;
    }, user: any): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/product.schema").Product, {}, {}> & import("./schemas/product.schema").Product & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }) | null>;
}
