import { Model } from 'mongoose';
import { Return, ReturnDocument } from './schemas/return.schema';
import { CreateReturnDto } from './dto/create-return.dto';
export declare class ReturnsService {
    private returnModel;
    private readonly logger;
    constructor(returnModel: Model<ReturnDocument>);
    createReturn(shopId: string, dto: CreateReturnDto): Promise<Return>;
    findAll(shopId: string, status?: string): Promise<Return[]>;
    findById(id: string): Promise<Return | null>;
    getPendingReturns(shopId: string): Promise<Return[]>;
    approveReturn(returnId: string, approvedBy: string, approvalNotes?: string): Promise<Return | null>;
    rejectReturn(returnId: string, approvedBy: string, approvalNotes?: string): Promise<Return | null>;
    completeReturn(returnId: string): Promise<Return | null>;
    getReturnHistory(shopId: string, limit?: number): Promise<Return[]>;
    getReturnStats(shopId: string): Promise<{
        totalReturns: number;
        pendingReturns: number;
        approvedReturns: number;
        rejectedReturns: number;
        totalRefundAmount: number;
    }>;
}
