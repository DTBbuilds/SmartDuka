import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { ApproveReturnDto } from './dto/approve-return.dto';
export declare class ReturnsController {
    private readonly returnsService;
    constructor(returnsService: ReturnsService);
    createReturn(dto: CreateReturnDto, user: Record<string, any>): Promise<import("./schemas/return.schema").Return>;
    findAll(user: Record<string, any>): Promise<import("./schemas/return.schema").Return[]>;
    getPendingReturns(user: Record<string, any>): Promise<import("./schemas/return.schema").Return[]>;
    getStats(user: Record<string, any>): Promise<{
        totalReturns: number;
        pendingReturns: number;
        approvedReturns: number;
        rejectedReturns: number;
        totalRefundAmount: number;
    }>;
    getHistory(user: Record<string, any>): Promise<import("./schemas/return.schema").Return[]>;
    findById(id: string): Promise<import("./schemas/return.schema").Return | null>;
    approveReturn(id: string, dto: ApproveReturnDto): Promise<import("./schemas/return.schema").Return | null>;
    rejectReturn(id: string, dto: ApproveReturnDto): Promise<import("./schemas/return.schema").Return | null>;
    completeReturn(id: string): Promise<import("./schemas/return.schema").Return | null>;
}
