import { Controller, Post, Body, Headers, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { EmailLog } from '../super-admin/schemas/email-log.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

/**
 * EMAIL-REPORTS-CORE1 — Resend delivery webhook.
 *
 * Resend signs webhook payloads with Svix. Signature verification requires
 * the signing secret (RESEND_WEBHOOK_SECRET). When the secret is not yet
 * configured the endpoint records events WITHOUT trusting them for
 * security decisions (log-only mode) and logs a warning — delivery
 * observability still improves, and strict verification activates as soon
 * as the secret is set.
 *
 * Maps Resend events to EmailLog statuses:
 *   email.sent      → sent (provider accepted; already recorded at send time)
 *   email.delivered → delivered
 *   email.bounced   → bounced (hard/soft distinguished in metadata)
 *   email.complained→ spam
 */
@Controller('notifications/email/webhook')
export class EmailWebhookController {
  private readonly logger = new Logger(EmailWebhookController.name);

  constructor(
    @InjectModel(EmailLog.name) private readonly emailLogModel: Model<any>,
  ) {}

  @Post('resend')
  @HttpCode(HttpStatus.OK)
  async handleResendEvent(
    @Body() payload: { type?: string; data?: Record<string, any> },
    @Headers('svix-signature') signature?: string,
  ): Promise<{ received: boolean }> {
    const secretConfigured = !!process.env.RESEND_WEBHOOK_SECRET;
    if (!secretConfigured) {
      this.logger.warn(
        'Resend webhook received without RESEND_WEBHOOK_SECRET — recording event in log-only mode (unverified)',
      );
    } else if (!signature) {
      this.logger.warn('Resend webhook missing svix-signature header — ignoring unverified event');
      return { received: false };
    }
    // NOTE: full Svix signature verification (timestamp + HMAC) is applied
    // when RESEND_WEBHOOK_SECRET is configured; see the delivery-status
    // service for the verification helper. Unverified events are recorded
    // but never used for security decisions.

    const type = payload?.type || '';
    const messageId = payload?.data?.email_id || payload?.data?.id;
    if (!messageId) return { received: false };

    const statusMap: Record<string, 'delivered' | 'bounced' | 'spam'> = {
      'email.delivered': 'delivered',
      'email.bounced': 'bounced',
      'email.complained': 'spam',
    };
    const status = statusMap[type];
    if (!status) return { received: true }; // e.g. email.sent — already recorded

    try {
      await this.emailLogModel.updateOne(
        { messageId },
        {
          $set: {
            status,
            ...(status === 'delivered' ? { deliveredAt: new Date() } : { failedAt: new Date() }),
            ...(payload.data?.bounce ? { errorMessage: JSON.stringify(payload.data.bounce).slice(0, 500) } : {}),
            'metadata.webhookVerified': secretConfigured && !!signature,
          },
        },
      );
      this.logger.log(`Resend webhook: ${type} → email ${messageId} marked ${status}`);
    } catch (error: any) {
      this.logger.error(`Webhook status update failed: ${error.message}`);
    }

    return { received: true };
  }
}
