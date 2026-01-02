import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

/**
 * Stock Alert Queue Processor
 * 
 * Processes stock alerts asynchronously:
 * 1. Low stock notifications
 * 2. Out of stock alerts
 * 3. Reorder point triggers
 */
@Processor('stock-alerts')
export class StockAlertProcessor extends WorkerHost {
  private readonly logger = new Logger(StockAlertProcessor.name);

  async process(job: Job<StockAlertJobData>): Promise<StockAlertResult> {
    const { productId, productName, currentStock, threshold, alertType, shopId } = job.data;
    
    this.logger.log(
      `Processing stock alert: ${alertType} for ${productName} (stock: ${currentStock})`
    );

    try {
      // Stock alert handling will be done by NotificationService
      // This processor manages queue mechanics
      
      return {
        success: true,
        alertType,
        productId,
        processedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to process stock alert for ${productName}: ${error.message}`
      );
      throw error;
    }
  }
}

/**
 * Job data for stock alerts
 */
export interface StockAlertJobData {
  shopId: string;
  branchId?: string;
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  alertType: 'low_stock' | 'out_of_stock' | 'reorder_point';
  supplierId?: string;
  suggestedReorderQuantity?: number;
}

/**
 * Result from stock alert processing
 */
export interface StockAlertResult {
  success: boolean;
  alertType: string;
  productId: string;
  notificationSent?: boolean;
  reorderCreated?: boolean;
  processedAt: string;
}
