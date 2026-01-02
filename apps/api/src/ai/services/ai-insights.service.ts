import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AiInsight, AiInsightDocument, InsightType, InsightStatus } from '../schemas/ai-insight.schema';
import { AiFeedback } from '../schemas/ai-feedback.schema';

export interface InsightFilters {
  type?: InsightType;
  status?: InsightStatus;
  priority?: string;
  limit?: number;
  offset?: number;
}

export interface InsightStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}

@Injectable()
export class AiInsightsService {
  private readonly logger = new Logger(AiInsightsService.name);

  constructor(
    @InjectModel(AiInsight.name) private insightModel: Model<AiInsightDocument>,
    @InjectModel(AiFeedback.name) private feedbackModel: Model<AiFeedback>,
  ) {}

  async getInsights(shopId: string, filters: InsightFilters = {}): Promise<AiInsight[]> {
    const query: any = { shopId: new Types.ObjectId(shopId) };
    
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;

    return this.insightModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 50)
      .skip(filters.offset || 0)
      .lean();
  }

  async getInsightById(shopId: string, insightId: string): Promise<AiInsight> {
    const insight = await this.insightModel.findOne({
      _id: new Types.ObjectId(insightId),
      shopId: new Types.ObjectId(shopId),
    }).lean();

    if (!insight) {
      throw new NotFoundException('Insight not found');
    }

    return insight;
  }

  async markAsRead(shopId: string, insightId: string): Promise<AiInsight> {
    const insight = await this.insightModel.findOneAndUpdate(
      { _id: new Types.ObjectId(insightId), shopId: new Types.ObjectId(shopId) },
      { status: 'read', readAt: new Date() },
      { new: true },
    ).lean();

    if (!insight) {
      throw new NotFoundException('Insight not found');
    }

    return insight;
  }

  async dismiss(shopId: string, insightId: string, userId: string): Promise<AiInsight> {
    const insight = await this.insightModel.findOneAndUpdate(
      { _id: new Types.ObjectId(insightId), shopId: new Types.ObjectId(shopId) },
      { status: 'dismissed', dismissedAt: new Date(), dismissedBy: new Types.ObjectId(userId) },
      { new: true },
    ).lean();

    if (!insight) {
      throw new NotFoundException('Insight not found');
    }

    return insight;
  }

  async submitFeedback(shopId: string, insightId: string, userId: string, rating: string, comment?: string): Promise<void> {
    const insight = await this.getInsightById(shopId, insightId);

    await this.feedbackModel.create({
      shopId: new Types.ObjectId(shopId),
      insightId: new Types.ObjectId(insightId),
      userId: new Types.ObjectId(userId),
      rating,
      comment,
      insightSnapshot: insight,
    });
  }

  async getUnreadCounts(shopId: string): Promise<Record<string, number>> {
    const results = await this.insightModel.aggregate([
      { $match: { shopId: new Types.ObjectId(shopId), status: 'active' } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const counts: Record<string, number> = { total: 0 };
    for (const r of results) {
      counts[r._id] = r.count;
      counts.total += r.count;
    }

    return counts;
  }

  async getStats(shopId: string): Promise<InsightStats> {
    const [byType, byStatus, byPriority, total] = await Promise.all([
      this.insightModel.aggregate([
        { $match: { shopId: new Types.ObjectId(shopId) } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      this.insightModel.aggregate([
        { $match: { shopId: new Types.ObjectId(shopId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.insightModel.aggregate([
        { $match: { shopId: new Types.ObjectId(shopId) } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      this.insightModel.countDocuments({ shopId: new Types.ObjectId(shopId) }),
    ]);

    return {
      total,
      byType: Object.fromEntries(byType.map(r => [r._id, r.count])),
      byStatus: Object.fromEntries(byStatus.map(r => [r._id, r.count])),
      byPriority: Object.fromEntries(byPriority.map(r => [r._id, r.count])),
    };
  }
}
