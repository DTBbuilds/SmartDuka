import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WhatsAppService } from '../services/whatsapp.service';

export interface WhatsAppMessageJobData {
  messageId: string;
  shopId: string;
  to: string;
  content: string;
}

/**
 * WhatsApp Message Queue Processor
 * 
 * Processes queued WhatsApp messages asynchronously.
 * Handles retries and error logging.
 */
@Processor('whatsapp')
export class WhatsAppMessageProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsAppMessageProcessor.name);

  constructor(private readonly whatsAppService: WhatsAppService) {
    super();
  }

  async process(job: Job<WhatsAppMessageJobData>): Promise<void> {
    const { messageId, to } = job.data;
    
    this.logger.debug(`Processing WhatsApp message ${messageId} to ${to}`);

    try {
      await this.whatsAppService.sendMessageNow(messageId);
      this.logger.log(`WhatsApp message sent: ${messageId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send WhatsApp message ${messageId}: ${message}`);
      throw error; // Let BullMQ handle retry
    }
  }
}
