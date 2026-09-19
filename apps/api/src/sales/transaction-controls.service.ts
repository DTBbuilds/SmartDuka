import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { InventoryService } from '../inventory/inventory.service';
import {
  InventoryClaim,
  InventoryClaimDocument,
  InventoryClaimItemState,
  InventoryClaimState,
} from '../inventory/schemas/inventory-claim.schema';

@Injectable()
export class TransactionControlsService {
  private readonly logger = new Logger(TransactionControlsService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(InventoryClaim.name)
    private readonly inventoryClaimModel: Model<InventoryClaimDocument>,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Restore the inventory reserved by an order when the order leaves the
   * completed/pending lifecycle via void or full refund.
   *
   * Claim-aware (SDV2-005): when a durable claim record exists, the release
   * is tracked per item on the claim (RELEASING -> per-item RESTORED ->
   * RELEASED) so a crash mid-release is resumable by reconciliation without
   * double-restoring. Orders without a claim record (historical) use the
   * legacy direct restoration path.
   */
  private async restoreOrderInventory(
    order: OrderDocument,
    restoredBy: string,
    auditReason: 'void' | 'refund',
  ): Promise<void> {
    const claim = await this.inventoryClaimModel
      .findOne({
        shopId: order.shopId,
        orderId: order._id,
      })
      .exec();

    if (!claim) {
      await this.restoreOrderInventoryLegacy(order, restoredBy, auditReason);
      return;
    }

    // Exactly-once: a released claim is terminal - nothing remains to restore.
    if (claim.state === InventoryClaimState.RELEASED) {
      return;
    }

    await this.inventoryClaimModel
      .updateOne(
        {
          _id: claim._id,
          state: {
            $in: [
              InventoryClaimState.CLAIMING,
              InventoryClaimState.CLAIMED,
              InventoryClaimState.COMMITTED,
            ],
          },
        },
        { $set: { state: InventoryClaimState.RELEASING } },
      )
      .exec();

    for (const item of claim.items) {
      if (item.state === InventoryClaimItemState.RESTORING) {
        this.logger.error(
          `Claim ${claim._id} item ${item.productId} stuck in restoring state - manual review required`,
        );
        continue;
      }
      if (item.state !== InventoryClaimItemState.CLAIMED) continue;

      try {
        // Atomic per-item work claim: only a transition from CLAIMED wins,
        // so a crashed or concurrent release can never restore twice.
        const workClaim = await this.inventoryClaimModel
          .updateOne(
            {
              _id: claim._id,
              items: {
                $elemMatch: { productId: item.productId, state: InventoryClaimItemState.CLAIMED },
              },
            },
            { $set: { 'items.$.state': InventoryClaimItemState.RESTORING } },
          )
          .exec();
        if (!workClaim.modifiedCount) continue;

        await this.inventoryService.updateStock(
          order.shopId.toString(),
          item.productId,
          item.quantity,
        );
        await this.inventoryService.createStockAdjustment(
          order.shopId.toString(),
          item.productId,
          item.quantity,
          auditReason,
          restoredBy,
          `Order ${order.orderNumber} - ${item.name} x${item.quantity}`,
        );
        await this.inventoryClaimModel
          .updateOne(
            {
              _id: claim._id,
              items: {
                $elemMatch: { productId: item.productId, state: InventoryClaimItemState.RESTORING },
              },
            },
            { $set: { 'items.$.state': InventoryClaimItemState.RESTORED } },
          )
          .exec();
      } catch (itemError: any) {
        this.logger.error(
          `Failed to restore claim ${claim._id} item ${item.productId}: ${itemError?.message}`,
        );
      }
    }

    const fresh = await this.inventoryClaimModel.findById(claim._id).exec();
    if (
      fresh &&
      fresh.items.every(
        (item) =>
          item.state === InventoryClaimItemState.RESTORED ||
          item.state === InventoryClaimItemState.PENDING,
      )
    ) {
      await this.inventoryClaimModel
        .updateOne(
          { _id: fresh._id, state: InventoryClaimState.RELEASING },
          { $set: { state: InventoryClaimState.RELEASED } },
        )
        .exec();
    }
  }

  /**
   * Legacy restoration for orders created before durable claims existed.
   */
  private async restoreOrderInventoryLegacy(
    order: OrderDocument,
    restoredBy: string,
    auditReason: 'void' | 'refund',
  ): Promise<void> {
    for (const item of order.items ?? []) {
      try {
        await this.inventoryService.updateStock(
          order.shopId.toString(),
          item.productId,
          item.quantity,
        );
        await this.inventoryService.createStockAdjustment(
          order.shopId.toString(),
          item.productId,
          item.quantity,
          auditReason,
          restoredBy,
          `Order ${order.orderNumber} - ${item.name} x${item.quantity}`,
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to restore stock for order ${order.orderNumber}, product ${item.productId}: ${error?.message}`,
        );
      }
    }
  }

  async voidTransaction(
    orderId: string,
    shopId: string,
    voidReason: string,
    cashierId: string,
    requiresApproval: boolean = true,
  ): Promise<Order> {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === 'void') {
      throw new BadRequestException('Order is already voided');
    }

    if (!voidReason || voidReason.trim().length === 0) {
      throw new BadRequestException('Void reason is required');
    }

    const updateData: any = {
      transactionType: 'void',
      voidReason,
      status: 'void',
    };

    if (requiresApproval) {
      updateData.voidApprovedBy = new Types.ObjectId(cashierId);
      updateData.voidApprovedAt = new Date();
    }

    // Atomic terminal-state claim: only a transition from a non-void state
    // wins, so concurrent void attempts can never restore stock twice.
    const updated = await this.orderModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(orderId),
        shopId: new Types.ObjectId(shopId),
        status: { $ne: 'void' },
      },
      updateData,
      { new: true },
    );

    if (!updated) {
      // Lost a concurrent void race (the pre-read confirmed existence)
      throw new BadRequestException('Order is already voided');
    }

    // Voiding releases the inventory the order reserved (pending M-Pesa
    // orders hold stock from checkout; completed sales return their goods).
    await this.restoreOrderInventory(updated, cashierId, 'void');

    return updated;
  }

  async applyDiscount(
    orderId: string,
    shopId: string,
    discountAmount: number,
    discountReason: string,
    cashierId: string,
    requiresApproval: boolean = true,
  ): Promise<Order> {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === 'void') {
      throw new BadRequestException('Cannot discount voided order');
    }

    if (discountAmount < 0 || discountAmount > order.total) {
      throw new BadRequestException('Invalid discount amount');
    }

    if (!discountReason || discountReason.trim().length === 0) {
      throw new BadRequestException('Discount reason is required');
    }

    const updateData: any = {
      discountAmount,
      discountReason,
      total: order.total - discountAmount,
    };

    if (requiresApproval) {
      updateData.discountApprovedBy = new Types.ObjectId(cashierId);
    }

    const updated = await this.orderModel.findByIdAndUpdate(
      orderId,
      updateData,
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Order not found after update');
    }

    return updated;
  }

  async processRefund(
    orderId: string,
    shopId: string,
    refundAmount: number,
    refundReason: string,
    cashierId: string,
    requiresApproval: boolean = true,
  ): Promise<Order> {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      shopId: new Types.ObjectId(shopId),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'completed') {
      throw new BadRequestException('Can only refund completed orders');
    }

    if (refundAmount < 0 || refundAmount > order.total) {
      throw new BadRequestException('Invalid refund amount');
    }

    if (!refundReason || refundReason.trim().length === 0) {
      throw new BadRequestException('Refund reason is required');
    }

    const updateData: any = {
      transactionType: 'refund',
      refundAmount,
      refundReason,
      status: refundAmount === order.total ? 'void' : 'completed',
    };

    if (requiresApproval) {
      updateData.refundApprovedBy = new Types.ObjectId(cashierId);
      updateData.refundApprovedAt = new Date();
    }

    // Atomic claim: only a refund from a non-void state wins, so concurrent
    // refund attempts can never restore stock twice.
    const updated = await this.orderModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(orderId),
        shopId: new Types.ObjectId(shopId),
        status: { $ne: 'void' },
      },
      updateData,
      { new: true },
    );

    if (!updated) {
      throw new BadRequestException('Order is already voided');
    }

    // A full refund voids the order - the goods return to stock. Partial
    // refunds keep the order completed and do not restore stock.
    if (updated.status === 'void') {
      await this.restoreOrderInventory(updated, cashierId, 'refund');
    }

    return updated;
  }

  async getTransactionsByType(
    shopId: string,
    transactionType: 'sale' | 'void' | 'return' | 'refund',
    limit: number = 50,
  ): Promise<Order[]> {
    return this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        transactionType,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getVoidedTransactions(shopId: string, limit: number = 50): Promise<Order[]> {
    return this.getTransactionsByType(shopId, 'void', limit);
  }

  async getRefundedTransactions(shopId: string, limit: number = 50): Promise<Order[]> {
    return this.getTransactionsByType(shopId, 'refund', limit);
  }

  async getTransactionsByCashier(
    shopId: string,
    cashierId: string,
    limit: number = 50,
  ): Promise<Order[]> {
    return this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        userId: new Types.ObjectId(cashierId),
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getShiftTransactions(
    shopId: string,
    shiftId: string,
    limit: number = 100,
  ): Promise<Order[]> {
    return this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        shiftId: new Types.ObjectId(shiftId),
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getTransactionStats(shopId: string): Promise<any> {
    const stats = await this.orderModel.aggregate([
      { $match: { shopId: new Types.ObjectId(shopId) } },
      {
        $group: {
          _id: '$transactionType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' },
        },
      },
    ]);

    return stats;
  }

  async getCashierStats(shopId: string, cashierId: string): Promise<any> {
    const stats = await this.orderModel.aggregate([
      {
        $match: {
          shopId: new Types.ObjectId(shopId),
          userId: new Types.ObjectId(cashierId),
        },
      },
      {
        $group: {
          _id: '$transactionType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' },
        },
      },
    ]);

    return stats;
  }
}
