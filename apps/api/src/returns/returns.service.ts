import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Return, ReturnDocument } from './schemas/return.schema';
import { CreateReturnDto } from './dto/create-return.dto';
import { Order } from '../sales/schemas/order.schema';

@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);

  constructor(
    @InjectModel(Return.name) private returnModel: Model<ReturnDocument>,
    @InjectModel(Order.name) private orderModel: any,
  ) {}

  /**
   * CASHIER-P0 F-10: the requester is the authenticated user (JWT), the
   * referenced order must exist inside the same shop, and the return window
   * is computed from the ORDER's actual creation date — not a client-supplied
   * orderDate.
   */
  async createReturn(
    shopId: string,
    dto: CreateReturnDto,
    requestedBy: string,
  ): Promise<Return> {
    const order = await this.orderModel
      .findOne({
        _id: new Types.ObjectId(dto.orderId),
        shopId: new Types.ObjectId(shopId),
      })
      .exec();
    if (!order) {
      throw new NotFoundException('Order not found in this shop');
    }

    // Validate return window against the order's real creation date.
    const orderDate = order.createdAt
      ? new Date(order.createdAt)
      : new Date(dto.orderDate);
    const returnWindow = dto.returnWindow || 7;
    const returnDeadline = new Date(orderDate);
    returnDeadline.setDate(returnDeadline.getDate() + returnWindow);

    if (new Date() > returnDeadline) {
      throw new BadRequestException(
        `Return window of ${returnWindow} days has expired`,
      );
    }

    // Calculate total refund amount
    const totalRefundAmount = dto.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    const returnRequest = new this.returnModel({
      shopId: new Types.ObjectId(shopId),
      orderId: new Types.ObjectId(dto.orderId),
      items: dto.items.map((item) => ({
        productId: new Types.ObjectId(item.productId),
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        reason: item.reason,
      })),
      totalRefundAmount,
      requestedBy: new Types.ObjectId(requestedBy),
      returnWindow,
    });

    return returnRequest.save();
  }

  async findAll(shopId: string, status?: string): Promise<Return[]> {
    const filter: any = { shopId: new Types.ObjectId(shopId) };
    if (status) {
      filter.status = status;
    }
    return this.returnModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  /**
   * CASHIER-P0 F-10: tenant-scoped single-return read. The previous
   * findById(id) had no shop scoping — any authenticated user of ANY shop
   * could read any return record by id.
   */
  async findByIdForShop(shopId: string, id: string): Promise<Return | null> {
    return this.returnModel
      .findOne({
        _id: new Types.ObjectId(id),
        shopId: new Types.ObjectId(shopId),
      })
      .exec();
  }

  async getPendingReturns(shopId: string): Promise<Return[]> {
    return this.returnModel
      .find({
        shopId: new Types.ObjectId(shopId),
        status: 'pending',
      })
      .sort({ createdAt: 1 })
      .exec();
  }

  /** Shared loader enforcing tenant scope for approval-state transitions. */
  private async loadForShop(
    shopId: string,
    returnId: string,
  ): Promise<ReturnDocument> {
    const returnRequest = await this.returnModel
      .findOne({
        _id: new Types.ObjectId(returnId),
        shopId: new Types.ObjectId(shopId),
      })
      .exec();
    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }
    return returnRequest;
  }

  async approveReturn(
    shopId: string,
    returnId: string,
    approvedBy: string,
    approvalNotes?: string,
  ): Promise<Return | null> {
    const returnRequest = await this.loadForShop(shopId, returnId);

    if (returnRequest.status !== 'pending') {
      throw new BadRequestException(
        `Cannot approve return with status: ${returnRequest.status}`,
      );
    }

    return this.returnModel
      .findByIdAndUpdate(
        returnId,
        {
          status: 'approved',
          approvedBy: new Types.ObjectId(approvedBy),
          approvalNotes,
        },
        { new: true },
      )
      .exec();
  }

  async rejectReturn(
    shopId: string,
    returnId: string,
    approvedBy: string,
    approvalNotes?: string,
  ): Promise<Return | null> {
    const returnRequest = await this.loadForShop(shopId, returnId);

    if (returnRequest.status !== 'pending') {
      throw new BadRequestException(
        `Cannot reject return with status: ${returnRequest.status}`,
      );
    }

    return this.returnModel
      .findByIdAndUpdate(
        returnId,
        {
          status: 'rejected',
          approvedBy: new Types.ObjectId(approvedBy),
          approvalNotes,
        },
        { new: true },
      )
      .exec();
  }

  async completeReturn(
    shopId: string,
    returnId: string,
  ): Promise<Return | null> {
    const returnRequest = await this.loadForShop(shopId, returnId);

    if (returnRequest.status !== 'approved') {
      throw new BadRequestException('Only approved returns can be completed');
    }

    return this.returnModel
      .findByIdAndUpdate(
        returnId,
        {
          status: 'completed',
          completedAt: new Date(),
        },
        { new: true },
      )
      .exec();
  }

  async getReturnHistory(shopId: string, limit = 50): Promise<Return[]> {
    return this.returnModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200))
      .exec();
  }

  async getReturnStats(shopId: string): Promise<{
    totalReturns: number;
    pendingReturns: number;
    approvedReturns: number;
    rejectedReturns: number;
    totalRefundAmount: number;
  }> {
    const returns = await this.returnModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .exec();

    const stats = {
      totalReturns: returns.length,
      pendingReturns: returns.filter((r) => r.status === 'pending').length,
      approvedReturns: returns.filter((r) => r.status === 'approved').length,
      rejectedReturns: returns.filter((r) => r.status === 'rejected').length,
      totalRefundAmount: returns.reduce(
        (sum, r) => sum + r.totalRefundAmount,
        0,
      ),
    };

    return stats;
  }
}
