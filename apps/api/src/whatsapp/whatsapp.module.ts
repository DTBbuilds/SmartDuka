import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';

// Schemas
import { WhatsAppMessage, WhatsAppMessageSchema } from './schemas/whatsapp-message.schema';
import { WhatsAppConfig, WhatsAppConfigSchema } from './schemas/whatsapp-config.schema';

// Providers
import { MetaCloudProvider } from './providers/meta-cloud.provider';
import { TwilioProvider } from './providers/twilio.provider';

// Services
import { WhatsAppProviderService } from './services/whatsapp-provider.service';
import { WhatsAppTemplateService } from './services/whatsapp-template.service';
import { WhatsAppService } from './services/whatsapp.service';

// Processors
import { WhatsAppMessageProcessor } from './processors/whatsapp-message.processor';

// Controller
import { WhatsAppController } from './whatsapp.controller';

// Queue module - use forwardRef to handle circular dependency
import { QueueModule } from '../queue/queue.module';
import { QueueService } from '../queue/queue.service';

const REDIS_URL = process.env.REDIS_URL;

/**
 * WhatsApp Module
 * 
 * Provides WhatsApp Business API integration for:
 * - AI-generated report delivery
 * - Event-based alerts
 * - Phone verification
 * 
 * Supports multiple providers: Meta Cloud API, Twilio
 */
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: WhatsAppMessage.name, schema: WhatsAppMessageSchema },
      { name: WhatsAppConfig.name, schema: WhatsAppConfigSchema },
    ]),
    ...(REDIS_URL ? [
      BullModule.registerQueue({
        name: 'whatsapp',
      }),
    ] : []),
    forwardRef(() => QueueModule),
  ],
  controllers: [WhatsAppController],
  providers: [
    // Providers
    MetaCloudProvider,
    TwilioProvider,
    // Services
    WhatsAppProviderService,
    WhatsAppTemplateService,
    WhatsAppService,
    // Processors (only register if Redis is available)
    ...(REDIS_URL ? [WhatsAppMessageProcessor] : []),
  ],
  exports: [
    WhatsAppService,
    WhatsAppTemplateService,
  ],
})
export class WhatsAppModule {}
