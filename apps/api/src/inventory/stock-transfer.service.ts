import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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

@Injectable()
export class StockTransferService {
  private readonly logger = new Logger(StockTransferService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async requestTransfer(
    shopId: string,
    fromLocationId: string,
    toLocationId: string,
    productId: string,
    quantity: number,
    reason: string,
    requestedBy: string,
    notes?: string,
  ): Promise<StockTransfer> {
    try {
      // Validate locations are different
      if (fromLocationId === toLocationId) {
        throw new BadRequestException('Source and destination locations must be different');
      }

      // Validate quantity
      if (quantity <= 0) {
        throw new BadRequestException('Quantity must be greater than zero');
      }

      // Get product
      const product = await this.productModel.findById(productId).exec();
      if (!product) {
        throw new BadRequestException('Product not found');
      }

      if (product.shopId.toString() !== shopId) {
        throw new BadRequestException('Product does not belong to this shop');
      }

      // Validate source location has sufficient stock
      // Note: This assumes location-specific stock tracking
      // For now, we check overall stock
      if ((product.stock ?? 0) < quantity) {
        throw new BadRequestException('Insufficient stock at source location');
      }

      const transfer: StockTransfer = {
        shopId,
        fromLocationId,
        toLocationId,
        productId,
        quantity,
        status: 'pending',
        reason,
        notes,
        requestedBy,
        createdAt: new Date(),
      };

      this.logger.log(
        `Stock transfer requested: ${productId} from ${fromLocationId} to ${toLocationId}, quantity: ${quantity}`,
      );

      return transfer;
    } catch (error: any) {
      this.logger.error('Stock transfer request failed', error?.message);
      throw error;
    }
  }

  async approveTransfer(
    transferId: string,
    approvedBy: string,
  ): Promise<StockTransfer> {
    try {
      // This would update the transfer record in database
      // For now, return updated transfer
      const transfer: StockTransfer = {
        shopId: '',
        fromLocationId: '',
        toLocationId: '',
        productId: '',
        quantity: 0,
        status: 'approved',
        reason: '',
        approvedBy,
        requestedBy: 'Unknown',
        createdAt: new Date(),
      };

      this.logger.log(`Stock transfer approved: ${transferId}`);

      return transfer;
    } catch (error: any) {
      this.logger.error('Stock transfer approval failed', error?.message);
      throw new BadRequestException('Failed to approve stock transfer');
    }
  }

  async completeTransfer(transferId: string): Promise<StockTransfer> {
    try {
      // Deduct from source location
      // Add to destination location
      // Mark as completed

      const transfer: StockTransfer = {
        shopId: '',
        fromLocationId: '',
        toLocationId: '',
        productId: '',
        quantity: 0,
        status: 'completed',
        reason: '',
        requestedBy: 'Unknown',
        completedAt: new Date(),
        createdAt: new Date(),
      };

      this.logger.log(`Stock transfer completed: ${transferId}`);

      return transfer;
    } catch (error: any) {
      this.logger.error('Stock transfer completion failed', error?.message);
      throw new BadRequestException('Failed to complete stock transfer');
    }
  }

  async rejectTransfer(transferId: string, reason: string): Promise<StockTransfer> {
    try {
      const transfer: StockTransfer = {
        shopId: '',
        fromLocationId: '',
        toLocationId: '',
        productId: '',
        quantity: 0,
        status: 'rejected',
        reason,
        requestedBy: 'Unknown',
        createdAt: new Date(),
      };

      this.logger.log(`Stock transfer rejected: ${transferId}`);

      return transfer;
    } catch (error: any) {
      this.logger.error('Stock transfer rejection failed', error?.message);
      throw new BadRequestException('Failed to reject stock transfer');
    }
  }

  async getTransferHistory(
    shopId: string,
    locationId?: string,
    status?: string,
  ): Promise<StockTransfer[]> {
    try {
      // Query transfers for shop
      // Filter by location if provided
      // Filter by status if provided
      return [];
    } catch (error: any) {
      this.logger.error('Failed to get transfer history', error?.message);
      throw new BadRequestException('Failed to get transfer history');
    }
  }

  async getTransferStats(shopId: string): Promise<{
    totalTransfers: number;
    pendingTransfers: number;
    completedTransfers: number;
    rejectedTransfers: number;
    totalQuantityTransferred: number;
  }> {
    try {
      return {
        totalTransfers: 0,
        pendingTransfers: 0,
        completedTransfers: 0,
        rejectedTransfers: 0,
        totalQuantityTransferred: 0,
      };
    } catch (error: any) {
      this.logger.error('Failed to get transfer stats', error?.message);
      throw new BadRequestException('Failed to get transfer stats');
    }
  }
}
