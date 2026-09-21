import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';

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

/**
 * P0-8 — DISABLED STUB.
 *
 * This service never implemented a real transfer lifecycle: it returned
 * fabricated transfer objects that were neither persisted nor applied to
 * inventory. An active endpoint that fabricates success is worse than an
 * honest failure, so every method now fails loudly. Use the canonical
 * paths instead:
 *   - full transfer lifecycle (request/approve/ship/receive/cancel):
 *     /stock-transfers (branches StockTransferService)
 *   - immediate one-shot branch move:
 *     POST /inventory/branch/transfer (InventoryService.transferBranchStock)
 */
@Injectable()
export class StockTransferService {
  private readonly logger = new Logger(StockTransferService.name);
  private static readonly DISABLED =
    'This endpoint is a non-functional stub and has been disabled. Use /stock-transfers for the transfer lifecycle or POST /inventory/branch/transfer for an immediate branch move.';

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async requestTransfer(..._args: any[]): Promise<StockTransfer> {
    this.logger.warn(
      'Blocked call to stub StockTransferService.requestTransfer',
    );
    throw new NotImplementedException(StockTransferService.DISABLED);
  }

  async approveTransfer(..._args: any[]): Promise<StockTransfer> {
    this.logger.warn(
      'Blocked call to stub StockTransferService.approveTransfer',
    );
    throw new NotImplementedException(StockTransferService.DISABLED);
  }

  async completeTransfer(..._args: any[]): Promise<StockTransfer> {
    this.logger.warn(
      'Blocked call to stub StockTransferService.completeTransfer',
    );
    throw new NotImplementedException(StockTransferService.DISABLED);
  }

  async rejectTransfer(..._args: any[]): Promise<StockTransfer> {
    this.logger.warn(
      'Blocked call to stub StockTransferService.rejectTransfer',
    );
    throw new NotImplementedException(StockTransferService.DISABLED);
  }

  async getTransferHistory(..._args: any[]): Promise<StockTransfer[]> {
    this.logger.warn(
      'Blocked call to stub StockTransferService.getTransferHistory',
    );
    throw new NotImplementedException(StockTransferService.DISABLED);
  }

  async getTransferStats(..._args: any[]): Promise<{
    totalTransfers: number;
    pendingTransfers: number;
    completedTransfers: number;
    rejectedTransfers: number;
    totalQuantityTransferred: number;
  }> {
    this.logger.warn(
      'Blocked call to stub StockTransferService.getTransferStats',
    );
    throw new NotImplementedException(StockTransferService.DISABLED);
  }
}
