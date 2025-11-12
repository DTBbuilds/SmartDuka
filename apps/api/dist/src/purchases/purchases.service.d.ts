import { Model } from 'mongoose';
import { PurchaseDocument } from './purchase.schema';
import { InventoryService } from '../inventory/inventory.service';
export interface CreatePurchaseDto {
    supplierId: string;
    branchId?: string;
    items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitCost: number;
    }>;
    expectedDeliveryDate?: Date;
    invoiceNumber?: string;
    notes?: string;
}
export interface UpdatePurchaseDto {
    status?: 'pending' | 'received' | 'cancelled';
    receivedDate?: Date;
    invoiceNumber?: string;
    notes?: string;
}
export declare class PurchasesService {
    private readonly purchaseModel;
    private readonly inventoryService;
    private readonly logger;
    constructor(purchaseModel: Model<PurchaseDocument>, inventoryService: InventoryService);
    create(shopId: string, userId: string, dto: CreatePurchaseDto): Promise<PurchaseDocument>;
    findAll(shopId: string): Promise<PurchaseDocument[]>;
    findById(purchaseId: string, shopId: string): Promise<PurchaseDocument | null>;
    update(purchaseId: string, shopId: string, dto: UpdatePurchaseDto, userId?: string): Promise<PurchaseDocument | null>;
    delete(purchaseId: string, shopId: string): Promise<boolean>;
    getPending(shopId: string): Promise<PurchaseDocument[]>;
    getBySupplier(supplierId: string, shopId: string): Promise<PurchaseDocument[]>;
    findByBranch(shopId: string, branchId: string): Promise<PurchaseDocument[]>;
    getPendingByBranch(shopId: string, branchId: string): Promise<PurchaseDocument[]>;
    getReceivedByBranch(shopId: string, branchId: string): Promise<PurchaseDocument[]>;
    getBranchStats(shopId: string, branchId: string): Promise<{
        totalPurchases: number;
        pendingPurchases: number;
        receivedPurchases: number;
        totalSpent: number;
    }>;
}
