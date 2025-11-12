import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Adjustment, AdjustmentDocument } from './adjustment.schema';

export interface CreateAdjustmentDto {
  productId: string;
  productName: string;
  delta: number;
  reason: 'damage' | 'loss' | 'recount' | 'return' | 'correction' | 'other';
  description?: string;
  reference?: string;
}

@Injectable()
export class AdjustmentsService {
  private readonly logger = new Logger(AdjustmentsService.name);

  constructor(
    @InjectModel(Adjustment.name) private readonly adjustmentModel: Model<AdjustmentDocument>,
  ) {}

  async create(shopId: string, userId: string, dto: CreateAdjustmentDto): Promise<AdjustmentDocument> {
    const adjustment = new this.adjustmentModel({
      productId: new Types.ObjectId(dto.productId),
      productName: dto.productName,
      delta: dto.delta,
      reason: dto.reason,
      description: dto.description,
      reference: dto.reference,
      shopId: new Types.ObjectId(shopId),
      adjustedBy: new Types.ObjectId(userId),
    });

    this.logger.log(
      `Stock adjustment: ${dto.productName} ${dto.delta > 0 ? '+' : ''}${dto.delta} (${dto.reason})`,
    );

    return adjustment.save();
  }

  async findAll(shopId: string): Promise<AdjustmentDocument[]> {
    return this.adjustmentModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByProduct(productId: string, shopId: string): Promise<AdjustmentDocument[]> {
    return this.adjustmentModel
      .find({
        productId: new Types.ObjectId(productId),
        shopId: new Types.ObjectId(shopId),
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByReason(
    reason: string,
    shopId: string,
  ): Promise<AdjustmentDocument[]> {
    return this.adjustmentModel
      .find({
        reason,
        shopId: new Types.ObjectId(shopId),
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getAdjustmentSummary(shopId: string): Promise<{
    totalAdjustments: number;
    byReason: Record<string, number>;
    netAdjustment: number;
  }> {
    const adjustments = await this.adjustmentModel
      .find({ shopId: new Types.ObjectId(shopId) })
      .exec();

    const byReason: Record<string, number> = {};
    let netAdjustment = 0;

    adjustments.forEach((adj) => {
      byReason[adj.reason] = (byReason[adj.reason] || 0) + adj.delta;
      netAdjustment += adj.delta;
    });

    return {
      totalAdjustments: adjustments.length,
      byReason,
      netAdjustment,
    };
  }

  async getRecentAdjustments(shopId: string, days: number = 7): Promise<AdjustmentDocument[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.adjustmentModel
      .find({
        shopId: new Types.ObjectId(shopId),
        createdAt: { $gte: startDate },
      })
      .sort({ createdAt: -1 })
      .exec();
  }
}
