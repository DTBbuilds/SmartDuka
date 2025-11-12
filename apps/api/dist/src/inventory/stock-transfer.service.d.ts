import { Model } from 'mongoose';
import { ProductDocument } from './schemas/product.schema';
export interface StockTransfer {
    _id?: string;
    shopId: string;
    fromLocationId: string;
    toLocationId: string;
    productId: string;
    quantity: number;
    status: 'pending' | 'approved' | 'completed' | 'rejected';
    reason: string;
    notes?: string;
    requestedBy: string;
    approvedBy?: string;
    completedAt?: Date;
    createdAt: Date;
}
export declare class StockTransferService {
    private productModel;
    private readonly logger;
    constructor(productModel: Model<ProductDocument>);
    requestTransfer(shopId: string, fromLocationId: string, toLocationId: string, productId: string, quantity: number, reason: string, requestedBy: string, notes?: string): Promise<StockTransfer>;
    approveTransfer(transferId: string, approvedBy: string): Promise<StockTransfer>;
    completeTransfer(transferId: string): Promise<StockTransfer>;
    rejectTransfer(transferId: string, reason: string): Promise<StockTransfer>;
    getTransferHistory(shopId: string, locationId?: string, status?: string): Promise<StockTransfer[]>;
    getTransferStats(shopId: string): Promise<{
        totalTransfers: number;
        pendingTransfers: number;
        completedTransfers: number;
        rejectedTransfers: number;
        totalQuantityTransferred: number;
    }>;
}
