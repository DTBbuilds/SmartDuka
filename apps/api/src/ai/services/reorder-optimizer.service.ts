import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AiInsight } from '../schemas/ai-insight.schema';

export interface ReorderSuggestion {
  productId: string;
  productName: string;
  currentStock: number;
  reorderLevel: number;
  suggestedQuantity: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  estimatedCost?: number;
}

@Injectable()
export class ReorderOptimizerService {
  private readonly logger = new Logger(ReorderOptimizerService.name);

  constructor(
    @InjectModel(AiInsight.name) private insightModel: Model<AiInsight>,
  ) {}

  async generateReorderSuggestions(shopId: string): Promise<ReorderSuggestion[]> {
    this.logger.log(`Generating reorder suggestions for shop ${shopId}`);
    return [];
  }

  calculateOptimalReorderQuantity(
    avgDailySales: number,
    leadTimeDays: number,
    safetyStockDays: number = 3,
  ): number {
    const leadTimeDemand = avgDailySales * leadTimeDays;
    const safetyStock = avgDailySales * safetyStockDays;
    return Math.ceil(leadTimeDemand + safetyStock);
  }

  determineUrgency(currentStock: number, reorderLevel: number, avgDailySales: number): ReorderSuggestion['urgency'] {
    if (currentStock <= 0) return 'critical';
    
    const daysOfStock = avgDailySales > 0 ? currentStock / avgDailySales : Infinity;
    
    if (daysOfStock <= 1) return 'critical';
    if (daysOfStock <= 3) return 'high';
    if (currentStock <= reorderLevel) return 'medium';
    return 'low';
  }
}
