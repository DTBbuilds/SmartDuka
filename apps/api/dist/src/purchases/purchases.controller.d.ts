import { PurchasesService } from './purchases.service';
export declare class PurchasesController {
    private readonly purchasesService;
    constructor(purchasesService: PurchasesService);
    create(dto: any, user: Record<string, any>): Promise<import("./purchase.schema").PurchaseDocument>;
    findAll(user: Record<string, any>): Promise<import("./purchase.schema").PurchaseDocument[]>;
    getPending(user: Record<string, any>): Promise<import("./purchase.schema").PurchaseDocument[]>;
    getBySupplier(supplierId: string, user: Record<string, any>): Promise<import("./purchase.schema").PurchaseDocument[]>;
    findById(id: string, user: Record<string, any>): Promise<import("./purchase.schema").PurchaseDocument | null>;
    update(id: string, dto: any, user: Record<string, any>): Promise<import("./purchase.schema").PurchaseDocument | null>;
    delete(id: string, user: Record<string, any>): Promise<{
        deleted: boolean;
    }>;
    findByBranch(branchId: string, user: Record<string, any>): Promise<import("./purchase.schema").PurchaseDocument[]>;
    getPendingByBranch(branchId: string, user: Record<string, any>): Promise<import("./purchase.schema").PurchaseDocument[]>;
    getReceivedByBranch(branchId: string, user: Record<string, any>): Promise<import("./purchase.schema").PurchaseDocument[]>;
    getBranchStats(branchId: string, user: Record<string, any>): Promise<{
        totalPurchases: number;
        pendingPurchases: number;
        receivedPurchases: number;
        totalSpent: number;
    }>;
}
