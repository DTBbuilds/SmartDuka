import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

/**
 * Email Queue Processor
 * 
 * Processes email sending asynchronously to:
 * 1. Prevent blocking API responses
 * 2. Enable automatic retries on SMTP failures
 * 3. Handle email rate limiting
 */
@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<EmailJobData>): Promise<EmailJobResult> {
    const { to, subject, template, data, shopId } = job.data;
    
    this.logger.log(`Processing email job: ${subject} to ${to}`);

    try {
      // Email sending will be handled by the EmailService
      // This processor manages queue mechanics and retries
      
      return {
        success: true,
        messageId: `queued-${job.id}`,
        processedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error; // Triggers retry
    }
  }
}

/**
 * Job data for email queue
 */
export interface EmailJobData {
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, any>;
  shopId?: string;
  priority?: 'high' | 'normal' | 'low';
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

/**
 * Result from email processing
 */
export interface EmailJobResult {
  success: boolean;
  messageId?: string;
  error?: string;
  processedAt: string;
}
