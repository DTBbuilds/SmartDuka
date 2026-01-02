import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AiInsight } from '../schemas/ai-insight.schema';

export interface ForecastResult {
  productId: string;
  productName: string;
  currentStock: number;
  predictedDemand: number;
  daysUntilStockout: number;
  confidence: number;
  recommendation: string;
}

@Injectable()
export class DemandForecastService {
  private readonly logger = new Logger(DemandForecastService.name);

  constructor(
    @InjectModel(AiInsight.name) private insightModel: Model<AiInsight>,
  ) {}

  async forecastDemand(shopId: string, productId: string, daysAhead: number = 7): Promise<ForecastResult | null> {
    try {
      return null;
    } catch (error: any) {
      this.logger.error(`Failed to forecast demand: ${error.message}`);
      return null;
    }
  }

  async generateDemandInsights(shopId: string): Promise<void> {
    this.logger.log(`Generating demand insights for shop ${shopId}`);
  }

  calculateMovingAverage(values: number[], window: number): number {
    if (values.length === 0) return 0;
    const slice = values.slice(-window);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  }

  calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }
}
