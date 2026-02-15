import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

/**
 * Keep-alive service that prevents Render free-tier from spinning down.
 * Pings the /health endpoint every 5 minutes.
 * Only active in production to avoid noise in development.
 */
@Injectable()
export class KeepAliveService implements OnModuleInit {
  private readonly logger = new Logger(KeepAliveService.name);
  private baseUrl: string;
  private enabled: boolean;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const renderExternalUrl = this.configService.get<string>('RENDER_EXTERNAL_URL');
    const port = this.configService.get<string>('PORT', '5000');

    // Only enable in production or when RENDER_EXTERNAL_URL is set
    this.enabled = nodeEnv === 'production' || !!renderExternalUrl;
    this.baseUrl = renderExternalUrl || `http://localhost:${port}`;

    if (this.enabled) {
      this.logger.log(`Keep-alive enabled — will ping ${this.baseUrl}/health every 5 minutes`);
    } else {
      this.logger.log('Keep-alive disabled (not in production)');
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async ping() {
    if (!this.enabled) return;

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (response.ok) {
        this.logger.debug(`Keep-alive ping OK (${response.status})`);
      } else {
        this.logger.warn(`Keep-alive ping returned ${response.status}`);
      }
    } catch (error) {
      this.logger.warn(`Keep-alive ping failed: ${error.message}`);
    }
  }
}
