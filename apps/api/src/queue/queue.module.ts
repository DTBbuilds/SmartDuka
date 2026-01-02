import { Module, Global, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';

const logger = new Logger('QueueModule');

// Check if Redis is configured at module load time
const REDIS_URL = process.env.REDIS_URL;

/**
 * Queue Module - BullMQ configuration for background job processing
 * 
 * Features:
 * - M-Pesa callback processing
 * - Email sending
 * - Report generation
 * - Stock alerts
 * 
 * Requires REDIS_URL environment variable.
 * When Redis is not configured, queues fall back to synchronous processing.
 */
@Global()
@Module({
  imports: REDIS_URL ? [
    // Only initialize BullMQ if Redis is configured
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL')!;
        const url = new URL(redisUrl);
        
        logger.log('✅ Redis configured - enabling queue system');
        
        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port, 10) || 6379,
            password: url.password || undefined,
            username: url.username || undefined,
            tls: url.protocol === 'rediss:' ? {} : undefined,
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            removeOnComplete: {
              age: 24 * 3600,
              count: 1000,
            },
            removeOnFail: {
              age: 7 * 24 * 3600,
            },
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: 'mpesa-callbacks' },
      { name: 'email' },
      { name: 'reports' },
      { name: 'stock-alerts' },
      { name: 'notifications' },
    ),
  ] : [],
  providers: [QueueService],
  exports: REDIS_URL ? [BullModule, QueueService] : [QueueService],
})
export class QueueModule {
  constructor() {
    if (!REDIS_URL) {
      logger.log('Redis not configured - queue system disabled (using synchronous processing)');
    }
  }
}
