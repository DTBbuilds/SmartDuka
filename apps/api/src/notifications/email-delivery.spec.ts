import { EmailService } from './email.service';

/**
 * EMAIL-REPORTS-CORE1 (Phase A/I) — EMAIL DELIVERY REGRESSION SHIELD.
 *
 * Proves:
 *  - SINGLE-PROVIDER delivery with controlled fallback (the old parallel
 *    SMTP+Resend mode delivered TWO copies of every non-auth email);
 *  - a fallback fires only after the primary FAILED (nothing delivered) —
 *    it can never duplicate;
 *  - idempotent send keys: a retry with the same key never sends again;
 *  - concurrent same-key sends are refused (unique index);
 *  - accurate status recording (sent = provider acceptance);
 *  - attachments survive the Resend path (base64).
 */
describe('EMAIL-REPORTS-CORE1 email delivery', () => {
  const BASE = {
    to: 'owner@example.com',
    subject: 'Digest',
    html: '<p>digest</p>',
    category: 'notification',
  };

  function boot(opts: { resend?: boolean; smtp?: boolean; priorSent?: any; duplicateKeyError?: boolean } = {}) {
    const sentVia: string[] = [];
    const logUpdates: any[] = [];

    const transporter = opts.smtp === false ? null : ({
      sendMail: jest.fn(async (mail: any) => {
        sentVia.push(`smtp:${mail.to}`);
        return { messageId: 'smtp-111' };
      }),
    } as any);
    const resend = opts.resend === false ? null : ({
      emails: {
        send: jest.fn(async (mail: any) => {
          sentVia.push(`resend:${mail.to}`);
          return { data: { id: 'resend-222' } };
        }),
      },
    } as any);

    const emailLogModel: any = Object.assign(
      jest.fn().mockImplementation((data: any) => ({
        ...data,
        _id: 'log-1',
        save: jest.fn(async () => {
          if (opts.duplicateKeyError) {
            const err: any = new Error('E11000');
            err.code = 11000;
            throw err;
          }
          return data;
        }),
      })),
      {
        findOne: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(opts.priorSent ?? null) })),
        findByIdAndUpdate: jest.fn(async (_id: any, update: any) => {
          logUpdates.push(update);
          return {};
        }),
      },
    );

    const service = new EmailService(emailLogModel, emailLogModel);
    (service as any).transporter = transporter;
    (service as any).resend = resend;
    (service as any).activeProvider = transporter ? 'smtp' : 'resend';
    return { service, sentVia, logUpdates, transporter, resend, emailLogModel };
  }

  it('single provider: non-auth email is sent by ONE provider only (no parallel dual-send)', async () => {
    const { service, sentVia } = boot();
    const result = await service.sendEmail({ ...BASE });
    expect(result.success).toBe(true);
    expect(sentVia).toHaveLength(1);
    expect(sentVia[0]).toMatch(/resend/); // default preferred provider
  });

  it('controlled fallback: primary failure → exactly one fallback attempt (never a duplicate)', async () => {
    const { service, sentVia, transporter, resend } = boot();
    resend!.emails.send = jest.fn(async () => {
      sentVia.push('resend:FAILED');
      throw new Error('resend down');
    });
    const result = await service.sendEmail({ ...BASE });
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('smtp-111');
    expect(sentVia).toEqual(['resend:FAILED', 'smtp:owner@example.com']); // one failure, one fallback
    expect(resend!.emails.send).toHaveBeenCalledTimes(1);
    expect(transporter!.sendMail).toHaveBeenCalledTimes(1);
  });

  it('all providers failing is reported accurately (no false success)', async () => {
    const { service, sentVia, transporter, resend } = boot();
    resend!.emails.send = jest.fn(async () => { throw new Error('resend down'); });
    transporter!.sendMail = jest.fn(async () => { throw new Error('smtp down'); });
    const result = await service.sendEmail({ ...BASE });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/resend down;? ?(smtp: )?smtp down|resend down/);
    expect(sentVia).toHaveLength(0);
  });

  it('preferred provider unavailable → starts on the fallback directly (single attempt)', async () => {
    const { service, sentVia } = boot({ resend: false });
    const result = await service.sendEmail({ ...BASE });
    expect(result.success).toBe(true);
    expect(sentVia).toEqual(['smtp:owner@example.com']);
  });

  it('idempotency: a retry with the same key short-circuits (no second send)', async () => {
    const { service, sentVia, emailLogModel } = boot({
      priorSent: { _id: 'log-0', status: 'sent', messageId: 'resend-000' },
    });
    const result = await service.sendEmail({ ...BASE, idempotencyKey: 'run-1' });
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('resend-000');
    expect(result.emailLogId).toBe('log-0');
    expect(sentVia).toHaveLength(0); // nothing sent again
    expect(emailLogModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'run-1' }),
    );
  });

  it('concurrent same-key send is refused via the unique index (no duplicate delivery)', async () => {
    const { service, sentVia } = boot({ duplicateKeyError: true });
    const result = await service.sendEmail({ ...BASE, idempotencyKey: 'run-2' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Duplicate send prevented/);
    expect(sentVia).toHaveLength(0);
  });

  it('status recording: sent = provider acceptance, with provider + messageId', async () => {
    const { service, logUpdates } = boot();
    await service.sendEmail({ ...BASE });
    expect(logUpdates[0]).toMatchObject({
      status: 'sent',
      messageId: 'resend-222',
      provider: 'resend',
    });
  });

  it('attachments survive the Resend path (base64-encoded)', async () => {
    const { service, resend } = boot();
    const pdf = Buffer.from('%PDF-1.4 test');
    await service.sendEmail({ ...BASE, attachments: [{ filename: 'report.pdf', content: pdf, contentType: 'application/pdf' }] });
    const call = resend!.emails.send.mock.calls[0][0];
    expect(call.attachments).toHaveLength(1);
    expect(call.attachments[0].filename).toBe('report.pdf');
    expect(call.attachments[0].content).toBe(pdf.toString('base64'));
  });

  it('authentication emails keep single-provider semantics (resend preferred, no parallel)', async () => {
    const { service, sentVia } = boot();
    await service.sendEmail({ ...BASE, category: 'authentication' });
    expect(sentVia).toHaveLength(1);
    expect(sentVia[0]).toMatch(/resend/);
  });

  // ===== RELEASE-GATE1: ambiguous acceptance =====

  it('AMBIGUOUS acceptance (resend timeout after acceptance): NO fallback, NO false failure', async () => {
    const { service, sentVia, transporter, logUpdates, resend } = boot();
    resend!.emails.send = jest.fn(async () => {
      const err: any = new Error('network timeout');
      err.code = 'ETIMEDOUT';
      throw err;
    });
    const result = await service.sendEmail({ ...BASE });
    // The provider may hold the message — the SMTP fallback MUST NOT fire.
    expect(result.success).toBe(false);
    expect((result as any).ambiguous).toBe(true);
    expect(sentVia.filter((s) => s.startsWith('smtp'))).toHaveLength(0);
    // The log stays 'pending' with the ambiguity recorded (never 'failed').
    expect(logUpdates[0]).toMatchObject({ status: 'pending' });
    expect(logUpdates[0].errorMessage).toMatch(/AMBIGUOUS/);
  });

  it('AMBIGUOUS SMTP failure (timeout after DATA): no fallback, no SMTP retry', async () => {
    const { service, sentVia, transporter, resend } = boot();
    transporter!.sendMail = jest.fn(async () => {
      const err: any = new Error('connection timeout mid-send');
      err.code = 'ETIMEDOUT';
      throw err;
    });
    const result = await service.sendEmail({ ...BASE, preferredProvider: 'smtp' });
    expect((result as any).ambiguous).toBe(true);
    expect(transporter!.sendMail).toHaveBeenCalledTimes(1); // no SMTP retry loop
    expect(resend!.emails.send).not.toHaveBeenCalled(); // no fallback
    expect(sentVia).toHaveLength(0);
  });

  it('a DEFINITIVE resend rejection (invalid recipient) falls back to SMTP safely', async () => {
    const { service, sentVia, transporter, resend } = boot();
    resend!.emails.send = jest.fn(async () => {
      return { error: { message: 'Invalid `to` field' } }; // definitive 4xx-style rejection
    });
    const result = await service.sendEmail({ ...BASE });
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('smtp-111');
    expect(sentVia).toEqual(['smtp:owner@example.com']);
  });

  it('the Resend Idempotency-Key header is sent when a key is provided', async () => {
    const { service, resend } = boot();
    await service.sendEmail({ ...BASE, idempotencyKey: 'run-abc' });
    const call = resend!.emails.send.mock.calls[0];
    expect(call[1]?.headers?.['Idempotency-Key']).toBe('run-abc');
  });
});
