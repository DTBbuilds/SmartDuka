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
 * 
 * IMPORTANT: Redis Eviction Policy
 * ================================
 * BullMQ requires Redis to be configured with `maxmemory-policy noeviction`.
 * If you see the warning "Eviction policy is volatile-lru. It should be noeviction",
 * you need to configure your Redis instance:
 * 
 * For Redis CLI:
 *   CONFIG SET maxmemory-policy noeviction
 * 
 * For redis.conf:
 *   maxmemory-policy noeviction
 * 
 * For Render/Upstash Redis:
 *   This is typically set in the dashboard under Redis settings.
 *   Contact your Redis provider if you cannot change this setting.
 * 
 * Why noeviction?
 *   BullMQ stores job data in Redis. If Redis evicts keys due to memory pressure,
 *   jobs can be lost or corrupted. With noeviction, Redis will return errors when
 *   memory is full rather than silently deleting data.
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
            maxRetriesPerRequest: null,
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
