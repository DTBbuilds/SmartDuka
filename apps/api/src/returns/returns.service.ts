import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Return, ReturnDocument } from './schemas/return.schema';
import { CreateReturnDto } from './dto/create-return.dto';

@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);

  constructor(
    @InjectModel(Return.name) private returnModel: Model<ReturnDocument>,
  ) {}

  async createReturn(shopId: string, dto: CreateReturnDto): Promise<Return> {
    // Validate return window
    const orderDate = new Date(dto.orderDate);
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
      requestedBy: new Types.ObjectId(dto.requestedBy),
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

  async findById(id: string): Promise<Return | null> {
    return this.returnModel.findById(id).exec();
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

  async approveReturn(
    returnId: string,
    approvedBy: string,
    approvalNotes?: string,
  ): Promise<Return | null> {
    const returnRequest = await this.returnModel.findById(returnId).exec();
    if (!returnRequest) {
      throw new BadRequestException('Return request not found');
    }

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
    returnId: string,
    approvedBy: string,
    approvalNotes?: string,
  ): Promise<Return | null> {
    const returnRequest = await this.returnModel.findById(returnId).exec();
    if (!returnRequest) {
      throw new BadRequestException('Return request not found');
    }

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

  async completeReturn(returnId: string): Promise<Return | null> {
    const returnRequest = await this.returnModel.findById(returnId).exec();
    if (!returnRequest) {
      throw new BadRequestException('Return request not found');
    }

    if (returnRequest.status !== 'approved') {
      throw new BadRequestException(
        'Only approved returns can be completed',
      );
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
      totalRefundAmount: returns.reduce((sum, r) => sum + r.totalRefundAmount, 0),
    };

    return stats;
  }
}
