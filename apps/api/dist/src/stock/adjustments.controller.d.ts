import { AdjustmentsService } from './adjustments.service';
export declare class AdjustmentsController {
    private readonly adjustmentsService;
    constructor(adjustmentsService: AdjustmentsService);
    create(dto: any, user: Record<string, any>): Promise<import("./adjustment.schema").AdjustmentDocument>;
    findAll(user: Record<string, any>): Promise<import("./adjustment.schema").AdjustmentDocument[]>;
    findByProduct(productId: string, user: Record<string, any>): Promise<import("./adjustment.schema").AdjustmentDocument[]>;
    findByReason(reason: string, user: Record<string, any>): Promise<import("./adjustment.schema").AdjustmentDocument[]>;
    getSummary(user: Record<string, any>): Promise<{
        totalAdjustments: number;
        byReason: Record<string, number>;
        netAdjustment: number;
    }>;
    getRecent(days: string | undefined, user: Record<string, any>): Promise<import("./adjustment.schema").AdjustmentDocument[]>;
}
