import { Injectable, Logger, OnModuleInit, Optional, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';

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
    @Optional() @InjectQueue('notifications') private notificationQueue: Queue | null,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    
    if (!redisUrl || !this.notificationQueue) {
      this.isQueueAvailable = false;
      return;
    }

    try {
      // Test queue connection
      await this.notificationQueue.getJobCounts();
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
      const notifications = await this.notificationQueue!.getJobCounts();

      return {
        available: true,
        queues: {
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
