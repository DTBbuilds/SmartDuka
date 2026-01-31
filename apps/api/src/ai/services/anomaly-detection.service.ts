/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AiInsight } from '../schemas/ai-insight.schema';
import { AiAuditLog } from '../schemas/ai-audit-log.schema';

export interface AnomalyResult {
  detected: boolean;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  value: number;
  expectedRange: { min: number; max: number };
  zScore: number;
}

@Injectable()
export class AnomalyDetectionService {
  private readonly logger = new Logger(AnomalyDetectionService.name);

  constructor(
    @InjectModel(AiInsight.name) private insightModel: Model<AiInsight>,
    @InjectModel(AiAuditLog.name) private auditModel: Model<AiAuditLog>,
  ) {}

  async detectSalesAnomalies(shopId: string): Promise<AnomalyResult[]> {
    const startTime = Date.now();
    const anomalies: AnomalyResult[] = [];

    try {
      await this.auditModel.create({
        shopId: new Types.ObjectId(shopId),
        action: 'detect_sales_anomalies',
        service: 'AnomalyDetectionService',
        triggerType: 'cron',
        duration: Date.now() - startTime,
      });
    } catch (error: any) {
      this.logger.error(`Failed to detect anomalies: ${error.message}`);
    }

    return anomalies;
  }

  async detectCashVariance(shopId: string, expectedCash: number, actualCash: number): Promise<AnomalyResult | null> {
    const variance = actualCash - expectedCash;
    const variancePercent = expectedCash > 0 ? (variance / expectedCash) * 100 : 0;

    if (Math.abs(variancePercent) < 5) {
      return null;
    }

    const severity = Math.abs(variancePercent) > 20 ? 'critical' : Math.abs(variancePercent) > 10 ? 'high' : 'medium';

    return {
      detected: true,
      type: 'cash_variance',
      severity,
      description: `Cash ${variance > 0 ? 'surplus' : 'shortage'} of KES ${Math.abs(variance).toFixed(0)} (${Math.abs(variancePercent).toFixed(1)}%)`,
      value: variance,
      expectedRange: { min: expectedCash * 0.95, max: expectedCash * 1.05 },
      zScore: variancePercent / 5,
    };
  }

  calculateZScore(value: number, mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    return (value - mean) / stdDev;
  }
}
