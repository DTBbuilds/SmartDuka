import { Injectable, Logger, OnModuleInit, Optional, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { MpesaCallbackJobData } from './processors/mpesa-callback.processor';
import { StockAlertJobData } from './processors/stock-alert.processor';

/**
 * WhatsApp message job data
 */
export interface WhatsAppMessageJobData {
  messageId: string;
  shopId: string;
  to: string;
  content: string;
}

/**
 * Queue Service - Centralized queue management
 * 
 * Provides methods to add jobs to various queues with proper error handling
 * Falls back to synchronous processing if Redis is unavailable
 */
@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);
  private isQueueAvailable = false;

  constructor(
    @Optional() @InjectQueue('mpesa-callbacks') private mpesaQueue: Queue | null,
    @Optional() @InjectQueue('stock-alerts') private stockAlertQueue: Queue | null,
    @Optional() @InjectQueue('notifications') private notificationQueue: Queue | null,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    
    if (!redisUrl || !this.mpesaQueue) {
      this.isQueueAvailable = false;
      return;
    }

    try {
      // Test queue connection
      await this.mpesaQueue.getJobCounts();
      this.isQueueAvailable = true;
      this.logger.log('✅ Queue system initialized successfully');
    } catch (error: any) {
      this.logger.error(`Queue initialization failed: ${error.message}`);
      this.isQueueAvailable = false;
    }
  }

  /**
   * Check if queue system is available
   */
  isAvailable(): boolean {
    return this.isQueueAvailable;
  }

  /**
   * Add M-Pesa callback to processing queue
   */
  async addMpesaCallback(data: MpesaCallbackJobData): Promise<string | null> {
    if (!this.isQueueAvailable) {
      this.logger.debug('Queue unavailable - M-Pesa callback will be processed synchronously');
      return null;
    }

    try {
      const job = await this.mpesaQueue!.add('process-callback', data, {
        priority: 1, // High priority
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });
      
      this.logger.log(`M-Pesa callback queued: ${job.id}`);
      return job.id || null;
    } catch (error: any) {
      this.logger.error(`Failed to queue M-Pesa callback: ${error.message}`);
      return null;
    }
  }

  /**
   * Add stock alert to processing queue
   */
  async addStockAlert(data: StockAlertJobData): Promise<string | null> {
    if (!this.isQueueAvailable) {
      this.logger.debug('Queue unavailable - stock alert will be processed synchronously');
      return null;
    }

    try {
      // Deduplicate by product ID - only one alert per product in queue
      const jobId = `stock-alert-${data.shopId}-${data.productId}`;
      
      const job = await this.stockAlertQueue!.add('process-alert', data, {
        jobId,
        priority: data.alertType === 'out_of_stock' ? 1 : 5,
        attempts: 3,
      });
      
      this.logger.log(`Stock alert queued: ${job.id} - ${data.alertType}`);
      return job.id || null;
    } catch (error: any) {
      this.logger.error(`Failed to queue stock alert: ${error.message}`);
      return null;
    }
  }

  /**
   * Add notification to queue
   */
  async addNotification(data: NotificationJobData): Promise<string | null> {
    if (!this.isQueueAvailable) {
      return null;
    }

    try {
      const job = await this.notificationQueue!.add('send-notification', data, {
        priority: data.priority === 'high' ? 1 : 5,
        attempts: 3,
      });
      
      return job.id || null;
    } catch (error: any) {
      this.logger.error(`Failed to queue notification: ${error.message}`);
      return null;
    }
  }

  /**
   * Add WhatsApp message to sending queue
   */
  async addWhatsAppMessage(data: WhatsAppMessageJobData): Promise<string | null> {
    if (!this.isQueueAvailable) {
      this.logger.debug('Queue unavailable - WhatsApp message will be processed synchronously');
      return null;
    }

    try {
      const job = await this.notificationQueue!.add('send-whatsapp', data, {
        priority: 2, // High priority for messages
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      });

      this.logger.log(`WhatsApp message queued: ${job.id} - to ${data.to}`);
      return job.id || null;
    } catch (error: any) {
      this.logger.error(`Failed to queue WhatsApp message: ${error.message}`);
      return null;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    if (!this.isQueueAvailable) {
      return {
        available: false,
        queues: {},
      };
    }

    try {
      const [mpesa, stockAlerts, notifications] = await Promise.all([
        this.mpesaQueue!.getJobCounts(),
        this.stockAlertQueue!.getJobCounts(),
        this.notificationQueue!.getJobCounts(),
      ]);

      return {
        available: true,
        queues: {
          'mpesa-callbacks': mpesa,
          'stock-alerts': stockAlerts,
          notifications,
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to get queue stats: ${error.message}`);
      return {
        available: false,
        queues: {},
      };
    }
  }
}

/**
 * Notification job data
 */
export interface NotificationJobData {
  shopId: string;
  userId?: string;
  type: 'push' | 'in_app' | 'sms';
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: 'high' | 'normal';
}

/**
 * Queue statistics
 */
export interface QueueStats {
  available: boolean;
  queues: Record<string, {
    waiting?: number;
    active?: number;
    completed?: number;
    failed?: number;
    delayed?: number;
  }>;
}
