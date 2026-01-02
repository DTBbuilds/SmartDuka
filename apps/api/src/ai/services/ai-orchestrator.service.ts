import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { DemandForecastService } from './demand-forecast.service';
import { BusinessSummaryService } from './business-summary.service';
import { ReorderOptimizerService } from './reorder-optimizer.service';

@Injectable()
export class AiOrchestratorService {
  private readonly logger = new Logger(AiOrchestratorService.name);

  constructor(
    @InjectModel('Shop') private shopModel: Model<any>,
    private readonly anomalyService: AnomalyDetectionService,
    private readonly forecastService: DemandForecastService,
    private readonly summaryService: BusinessSummaryService,
    private readonly reorderService: ReorderOptimizerService,
  ) {}

  @Cron('0 6 * * *')
  async runDailyAnalysis(): Promise<void> {
    this.logger.log('Starting daily AI analysis...');
    
    try {
      const shops = await this.shopModel.find({ status: 'active' }).select('_id name').lean();
      
      for (const shop of shops) {
        await this.analyzeShop((shop as any)._id.toString());
      }
      
      this.logger.log(`Daily analysis completed for ${shops.length} shops`);
    } catch (error: any) {
      this.logger.error(`Daily analysis failed: ${error.message}`);
    }
  }

  @Cron('0 * * * *')
  async runHourlyAnomalyCheck(): Promise<void> {
    this.logger.debug('Running hourly anomaly check...');
  }

  async analyzeShop(shopId: string): Promise<void> {
    this.logger.debug(`Analyzing shop ${shopId}`);
    
    try {
      await Promise.all([
        this.anomalyService.detectSalesAnomalies(shopId),
        this.forecastService.generateDemandInsights(shopId),
        this.reorderService.generateReorderSuggestions(shopId),
      ]);
    } catch (error: any) {
      this.logger.error(`Failed to analyze shop ${shopId}: ${error.message}`);
    }
  }

  async triggerManualAnalysis(shopId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.analyzeShop(shopId);
      return { success: true, message: 'Analysis completed successfully' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}
