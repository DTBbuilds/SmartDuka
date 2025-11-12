import { Model } from 'mongoose';
import { AdjustmentDocument } from './adjustment.schema';
export interface CreateAdjustmentDto {
    productId: string;
    productName: string;
    delta: number;
    reason: 'damage' | 'loss' | 'recount' | 'return' | 'correction' | 'other';
    description?: string;
    reference?: string;
}
export declare class AdjustmentsService {
    private readonly adjustmentModel;
    private readonly logger;
    constructor(adjustmentModel: Model<AdjustmentDocument>);
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
