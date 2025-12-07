import { Model } from 'mongoose';
import { AdjustmentDocument } from './adjustment.schema';
import { ProductDocument } from '../inventory/schemas/product.schema';
export interface CreateAdjustmentDto {
    productId: string;
    productName: string;
    delta: number;
    reason: 'damage' | 'loss' | 'recount' | 'return' | 'correction' | 'received' | 'transfer_in' | 'transfer_out' | 'expired' | 'theft' | 'other';
    description?: string;
    reference?: string;
}
export declare class AdjustmentsService {
    private readonly adjustmentModel;
    private readonly productModel;
    private readonly logger;
    constructor(adjustmentModel: Model<AdjustmentDocument>, productModel: Model<ProductDocument>);
    create(shopId: string, userId: string, dto: CreateAdjustmentDto): Promise<AdjustmentDocument>;
    findAll(shopId: string): Promise<AdjustmentDocument[]>;
    findByProduct(productId: string, shopId: string): Promise<AdjustmentDocument[]>;
    findByReason(reason: string, shopId: string): Promise<AdjustmentDocument[]>;
    getAdjustmentSummary(shopId: string): Promise<{
        totalAdjustments: number;
        byReason: Record<string, number>;
        netAdjustment: number;
    }>;
    getRecentAdjustments(shopId: string, days?: number): Promise<AdjustmentDocument[]>;
}
