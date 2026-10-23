import { EmailWebhookController } from './email-webhook.controller';
import { BadRequestException } from '@nestjs/common';

/**
 * EMAIL-REPORTS-CORE1 RELEASE-GATE1 — webhook verification & delivery-truth
 * regression shield.
 *
 * Proves:
 *  - REAL Svix signature verification (HMAC-SHA256 over id.timestamp.payload
 *    with the base64 secret; ±5 min replay tolerance); unverified requests
 *    are REJECTED when the secret is configured;
 *  - log-only mode without the secret (never trusted for security);
 *  - duplicate/out-of-order webhook events are idempotent and never regress
 *    a terminal state (delivered ⇄ bounced);
 *  - a PERMANENT bounce adds the address to the suppression list.
 */
describe('RELEASE-GATE1 Resend webhook', () => {
  const SECRET = 'whsec_test_abcdef';
  const MESSAGE_ID = 'resend-msg-1';

  function svixHeaders(payload: string, secret: string, timestampSeconds?: number, id = 'evt_test_1') {
    const timestamp = String(timestampSeconds ?? Math.floor(Date.now() / 1000));
    const sig = require('crypto')
      .createHmac('sha256', secret)
      .update(`${id}.${timestamp}.${payload}`)
      .digest('base64');
    return {
      'svix-id': id,
      'svix-timestamp': timestamp,
      'svix-signature': `v1,${sig}`,
    };
  }

  function boot(opts: { secret?: string; existingStatus?: string } = {}) {
    const updates: any[] = [];
    const suppressUpserts: any[] = [];
    const existing = { messageId: MESSAGE_ID, status: opts.existingStatus ?? 'sent', to: 'owner@shop.example' };
    const emailLogModel: any = Object.assign(jest.fn(), {
      updateOne: jest.fn(async (filter: any, update: any) => {
        updates.push({ filter, update });
        // Simulate the terminal-state guard: matchedCount 0 when the guard
        // excludes the current status.
        const guard = filter.status?.$nin;
        const matched = !guard || !guard.includes(existing.status);
        if (matched && update.$set?.status) existing.status = update.$set.status;
        return { matchedCount: matched ? 1 : 0 };
      }),
      findOne: jest.fn(() => ({
        select: jest.fn(() => ({
          lean: jest.fn().mockResolvedValue(existing),
        })),
      })),
    });
    (emailLogModel as any).db = {
      collection: jest.fn((name: string) => ({
        updateOne: jest.fn(async (_f: any, _u: any) => {
          suppressUpserts.push({ name, filter: _f, update: _u });
          return {};
        }),
      })),
    };
    process.env.RESEND_WEBHOOK_SECRET = opts.secret ?? '';
    const controller = new EmailWebhookController(emailLogModel);
    return { controller, updates, suppressUpserts, emailLogModel, existing };
  }

  afterEach(() => {
    delete process.env.RESEND_WEBHOOK_SECRET;
  });

  const event = (type: string, extra: any = {}) => ({
    type,
    data: { email_id: MESSAGE_ID, ...extra },
  });

  it('a properly signed delivered event is accepted and marks the log delivered', async () => {
    const { controller, updates } = boot({ secret: SECRET });
    const payload = JSON.stringify(event('email.delivered'));
    const res = await controller.handleResendEvent(
      { rawBody: Buffer.from(payload) },
      event('email.delivered'),
      svixHeaders(payload, SECRET),
    );
    expect(res.received).toBe(true);
    expect(updates[0].update.$set.status).toBe('delivered');
    expect(updates[0].update.$set.deliveredAt).toBeDefined();
  });

  it('a tampered payload is REJECTED (signature mismatch)', async () => {
    const { controller, updates } = boot({ secret: SECRET });
    const signedPayload = JSON.stringify(event('email.delivered'));
    const headers = svixHeaders(signedPayload, SECRET);
    const tampered = event('email.bounced'); // different body than signed
    await expect(
      controller.handleResendEvent({ rawBody: Buffer.from(JSON.stringify(tampered)) }, tampered, headers),
    ).rejects.toThrow(BadRequestException);
    expect(updates).toHaveLength(0);
  });

  it('a replayed event outside the 5-minute tolerance is REJECTED', async () => {
    const { controller } = boot({ secret: SECRET });
    const payload = JSON.stringify(event('email.delivered'));
    const stale = Math.floor(Date.now() / 1000) - 600; // 10 minutes old
    const headers = svixHeaders(payload, SECRET, stale);
    await expect(
      controller.handleResendEvent({ rawBody: Buffer.from(payload) }, event('email.delivered'), headers),
    ).rejects.toThrow(BadRequestException);
  });

  it('without the secret: events are recorded in log-only mode (warned, not rejected)', async () => {
    const { controller, updates } = boot({ secret: '' });
    const res = await controller.handleResendEvent({}, event('email.bounced'), {});
    expect(res.received).toBe(true);
    expect(updates[0].update.$set.status).toBe('bounced');
    expect(updates[0].update.$set['metadata.webhookVerified']).toBe(false);
  });

  it('out-of-order: a late bounced event does NOT regress a delivered message', async () => {
    const { controller, updates, existing } = boot({ secret: '', existingStatus: 'delivered' });
    await controller.handleResendEvent({}, event('email.bounced'), {});
    // The guard excludes delivered → matchedCount 0 → no regression write.
    expect(updates[0].filter.status.$nin).toContain('delivered');
    expect(existing.status).toBe('delivered');
  });

  it('out-of-order: a late delivered event does NOT overwrite a bounced message', async () => {
    const { controller, updates, existing } = boot({ secret: '', existingStatus: 'bounced' });
    await controller.handleResendEvent({}, event('email.delivered'), {});
    // The guard for a positive event excludes the negative terminal states.
    expect(updates[0].filter.status.$nin).toContain('bounced');
    expect(existing.status).toBe('bounced');
  });

  it('a PERMANENT bounce adds the address to the suppression list', async () => {
    const { controller, suppressUpserts } = boot({
      secret: '',
      existingStatus: 'sent',
    });
    await controller.handleResendEvent(
      {},
      event('email.bounced', { bounce: { type: 'permanent', message: 'address does not exist' } }),
      {},
    );
    expect(suppressUpserts).toHaveLength(1);
    expect(suppressUpserts[0].name).toBe('email_suppressions');
    expect(suppressUpserts[0].filter.email).toBe('owner@shop.example');
    expect(suppressUpserts[0].update.$set.reason).toBe('permanent_bounce');
  });

  it('a TRANSIENT (soft) bounce does NOT suppress the address', async () => {
    const { controller, suppressUpserts } = boot({ secret: '', existingStatus: 'sent' });
    await controller.handleResendEvent(
      {},
      event('email.bounced', { bounce: { type: 'transient', message: 'mailbox full' } }),
      {},
    );
    expect(suppressUpserts).toHaveLength(0);
  });

  it('duplicate events are idempotent (same messageId → same update)', async () => {
    const { controller, updates } = boot({ secret: '' });
    await controller.handleResendEvent({}, event('email.delivered'), {});
    await controller.handleResendEvent({}, event('email.delivered'), {});
    expect(updates).toHaveLength(2);
    expect(updates[0].filter.messageId).toBe(updates[1].filter.messageId);
  });
});
