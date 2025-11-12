import { StockTransferService } from './stock-transfer.service';
import { RequestStockTransferDto, ApproveStockTransferDto, RejectStockTransferDto, GetTransferHistoryDto } from './dto/stock-transfer.dto';
export declare class StockTransferController {
    private readonly transferService;
    constructor(transferService: StockTransferService);
    requestTransfer(dto: RequestStockTransferDto, user: Record<string, any>): Promise<import("./stock-transfer.service").StockTransfer>;
    approveTransfer(id: string, dto: ApproveStockTransferDto, user: Record<string, any>): Promise<import("./stock-transfer.service").StockTransfer>;
    completeTransfer(id: string, user: Record<string, any>): Promise<import("./stock-transfer.service").StockTransfer>;
    rejectTransfer(id: string, dto: RejectStockTransferDto, user: Record<string, any>): Promise<import("./stock-transfer.service").StockTransfer>;
    getHistory(query: GetTransferHistoryDto, user: Record<string, any>): Promise<import("./stock-transfer.service").StockTransfer[]>;
    getStats(user: Record<string, any>): Promise<{
        totalTransfers: number;
        pendingTransfers: number;
        completedTransfers: number;
        rejectedTransfers: number;
        totalQuantityTransferred: number;
    }>;
}
