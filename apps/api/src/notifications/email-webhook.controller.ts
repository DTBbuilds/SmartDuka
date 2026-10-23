import { Controller, Post, Body, Headers, Req, Logger, HttpCode, HttpStatus, BadRequestException, RawBodyRequest } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailLog } from '../super-admin/schemas/email-log.schema';

/**
 * EMAIL-REPORTS-CORE1 / RELEASE-GATE1 — Resend delivery webhook with REAL
 * Svix signature verification.
 *
 * Resend signs webhook payloads using the Svix scheme:
 *   headers: svix-id, svix-timestamp, svix-signature
 *   signature = HMAC-SHA256(base64Secret, `${id}.${timestamp}.${payload}`)
 *   svix-signature = "v1,<base64sig>[ v1,<base64sig>...]"
 *   tolerance: ±5 minutes (replay protection)
 *
 * When RESEND_WEBHOOK_SECRET is configured, UNVERIFIED requests are
 * REJECTED (400). Without the secret the endpoint records events in
 * log-only mode (never trusted for security decisions) and warns.
 *
 * Status mapping + terminal-state guards:
 *   email.delivered  → delivered (terminal-positive: a later bounced event
 *                      does NOT regress a delivered message)
 *   email.bounced    → bounced  (terminal-negative: a later delivered event
 *                      does NOT overwrite it); PERMANENT bounces add the
 *                      recipient to the suppression list
 *   email.complained → spam (terminal-negative)
 * Duplicate/out-of-order events are idempotent (updateOne by messageId).
 */
@Controller('notifications/email/webhook')
export class EmailWebhookController {
  private readonly logger = new Logger(EmailWebhookController.name);
  private static readonly TOLERANCE_SECONDS = 5 * 60;

  constructor(
    @InjectModel(EmailLog.name) private readonly emailLogModel: Model<any>,
  ) {}

  /** Svix signature verification (HMAC-SHA256, base64 secret). */
  private verifySvix(
    payload: string,
    headers: Record<string, string | undefined>,
    secret: string,
  ): boolean {
    const id = headers['svix-id'];
    const timestamp = headers['svix-timestamp'];
    const signatures = headers['svix-signature'];
    if (!id || !timestamp || !signatures) return false;

    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) return false;
    const skew = Math.abs(Date.now() / 1000 - ts);
    if (skew > EmailWebhookController.TOLERANCE_SECONDS) return false;

    const signedContent = `${id}.${timestamp}.${payload}`;
    const expected = createHmac('sha256', secret).update(signedContent).digest('base64');
    return signatures
      .split(' ')
      .some((sig) => {
        const [version, value] = sig.split(',');
        if (version !== 'v1' || !value) return false;
        const a = Buffer.from(value);
        const b = Buffer.from(expected);
        return a.length === b.length && timingSafeEqual(a, b);
      });
  }

  @Post('resend')
  @HttpCode(HttpStatus.OK)
  async handleResendEvent(
    @Req() request: RawBodyRequest<Request>,
    @Body() payload: { type?: string; data?: Record<string, any> },
    @Headers() headers: Record<string, string | undefined>,
  ): Promise<{ received: boolean }> {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    // Svix signs the EXACT raw bytes — Nest's rawBody capture (enabled in
    // main.ts) provides them; JSON re-serialization would break signatures.
    const rawPayload =
      (request?.rawBody as Buffer | undefined)?.toString('utf8') ??
      JSON.stringify(payload ?? {});

    if (secret) {
      const verified = this.verifySvix(rawPayload, headers, secret);
      if (!verified) {
        this.logger.warn('Resend webhook signature verification FAILED — event rejected');
        throw new BadRequestException('Invalid webhook signature');
      }
    } else {
      this.logger.warn(
        'Resend webhook received without RESEND_WEBHOOK_SECRET — log-only mode (unverified; set the secret to enforce verification)',
      );
    }

    const type = payload?.type || '';
    const messageId = payload?.data?.email_id || payload?.data?.id;
    if (!messageId) return { received: false };

    // Terminal-state guards: delivered is terminal-positive; bounced/spam
    // are terminal-negative. Out-of-order events never regress the state.
    const statusMap: Record<string, 'delivered' | 'bounced' | 'spam'> = {
      'email.delivered': 'delivered',
      'email.bounced': 'bounced',
      'email.complained': 'spam',
    };
    const status = statusMap[type];
    if (!status) return { received: true }; // e.g. email.sent — already recorded at send time

    const isPermanentBounce =
      status === 'bounced' && (payload?.data as any)?.bounce?.type === 'permanent';

    try {
      const guard =
        status === 'delivered'
          ? { status: { $nin: ['bounced', 'spam'] } } // never regress a negative terminal state
          : { status: { $nin: ['delivered'] } };       // never regress a positive terminal state
      const result = await this.emailLogModel.updateOne(
        { messageId, ...guard },
        {
          $set: {
            status,
            ...(status === 'delivered' ? { deliveredAt: new Date() } : { failedAt: new Date() }),
            ...(isPermanentBounce || status === 'bounced'
              ? { errorMessage: JSON.stringify((payload?.data as any)?.bounce || {}).slice(0, 500) }
              : {}),
            'metadata.webhookVerified': !!secret,
          },
        },
      );

      // RELEASE-GATE1: a PERMANENT bounce suppresses future OPTIONAL mail to
      // this address (transactional security mail is never suppressed).
      if (result.matchedCount > 0 && isPermanentBounce) {
        const log = await this.emailLogModel
          .findOne({ messageId })
          .select('to')
          .lean();
        const to = (log as any)?.to;
        if (to) {
          await this.emailLogModel.db
            .collection('email_suppressions')
            .updateOne(
              { email: String(to).toLowerCase().trim() },
              {
                $set: {
                  email: String(to).toLowerCase().trim(),
                  reason: 'permanent_bounce',
                  source: 'resend_webhook',
                  messageId,
                  updatedAt: new Date(),
                },
                $setOnInsert: { createdAt: new Date() },
              },
              { upsert: true },
            );
          this.logger.warn(`Permanent bounce → address suppressed for optional mail: ${String(to).toLowerCase().replace(/(.{2}).*(@.*)/, '$1***$2')}`);
        }
      }

      this.logger.log(`Resend webhook: ${type} → email ${messageId} marked ${status}`);
    } catch (error: any) {
      this.logger.error(`Webhook status update failed: ${error.message}`);
    }

    return { received: true };
  }
}
