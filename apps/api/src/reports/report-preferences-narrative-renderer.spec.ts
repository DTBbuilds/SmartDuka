import { ReportPreferencesService } from './report-preferences.service';
import { ReportNarrativeService } from './report-narrative.service';
import { ReportRendererService, type ReportMetrics } from './report-renderer.service';

/**
 * EMAIL-REPORTS-CORE1 (Phase C/E/F/I) — preferences, narrative guardrails,
 * and renderer contract tests.
 */
describe('EMAIL-REPORTS-CORE1 preferences, narrative & renderer', () => {
  const SHOP = '507f1f77bcf86cd799439011';

  describe('recipient eligibility & deduplication', () => {
    function bootPrefs(opts: { owner?: any; users?: any[]; prefs?: any } = {}) {
      const prefsDoc: any = {
        shopId: SHOP,
        timezone: 'Africa/Nairobi',
        paused: false,
        unsubscribedAt: undefined,
        daily: { enabled: false, hourLocal: 20, dayOfWeekLocal: 1, dayOfMonthLocal: 1 },
        weekly: { enabled: false, hourLocal: 20, dayOfWeekLocal: 1, dayOfMonthLocal: 1 },
        monthly: { enabled: false, hourLocal: 9, dayOfWeekLocal: 1, dayOfMonthLocal: 1 },
        recipientUserIds: [],
        ...(opts.prefs || {}),
        save: jest.fn(async () => prefsDoc),
      };
      const prefsModel = {
        findOne: jest.fn().mockResolvedValue(prefsDoc),
        create: jest.fn().mockResolvedValue(prefsDoc),
      };
      const shopModel = {
        findById: jest.fn(() => ({
          select: jest.fn(() => ({
            lean: jest.fn(() => ({
              exec: jest.fn().mockResolvedValue(opts.owner ?? { ownerId: '507f1f77bcf86cd799439071' }),
            })),
          })),
        })),
      };
      const userModel = {
        find: jest.fn(() => ({
          select: jest.fn(() => ({
            lean: jest.fn(() => ({
              exec: jest.fn().mockResolvedValue(opts.users ?? []),
            })),
          })),
        })),
      };
      const service = new ReportPreferencesService(prefsModel as any, shopModel as any, userModel as any);
      return { service, prefsDoc, userModel };
    }

    it('default recipients: the shop owner only (never another shop\u2019s users)', async () => {
      const { service, userModel } = bootPrefs({
        users: [{ _id: '507f1f77bcf86cd799439071', email: 'Owner@LoadGo.example', name: 'Owner', role: 'admin' }],
      });
      const recipients = await service.resolveRecipients(SHOP);
      expect(recipients).toEqual([{ userId: '507f1f77bcf86cd799439071', email: 'owner@loadgo.example', name: 'Owner' }]);
      // tenant scope enforced in the query
      expect(userModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ shopId: expect.anything() }),
      );
    });

    it('recipient emails are deduplicated (case-insensitively)', async () => {
      const { service } = bootPrefs({
        prefs: { recipientUserIds: ['507f1f77bcf86cd799439072', '507f1f77bcf86cd799439073'] },
        users: [
          { _id: '507f1f77bcf86cd799439072', email: 'same@shop.example', role: 'admin' },
          { _id: '507f1f77bcf86cd799439073', email: 'SAME@shop.example', role: 'admin' },
        ],
      });
      const recipients = await service.resolveRecipients(SHOP);
      expect(recipients).toHaveLength(1);
    });

    it('unverified accounts are excluded from OPTIONAL report delivery', async () => {
      const { service } = bootPrefs({
        prefs: { recipientUserIds: ['507f1f77bcf86cd799439072', '507f1f77bcf86cd799439073'] },
        users: [
          { _id: '507f1f77bcf86cd799439072', email: 'verified@shop.example', role: 'admin', emailVerified: true },
          { _id: '507f1f77bcf86cd799439073', email: 'unverified@shop.example', role: 'admin', emailVerified: false },
        ],
      });
      const recipients = await service.resolveRecipients(SHOP);
      expect(recipients.map((r) => r.email)).toEqual(['verified@shop.example']);
    });

    it('eligibility: unsubscribed > paused > recipients', async () => {
      const unsub = bootPrefs({ prefs: { unsubscribedAt: new Date() } });
      await expect((await unsub.service.isEligible(SHOP)).reason).toBe('unsubscribed');

      const paused = bootPrefs({ prefs: { paused: true } });
      await expect((await paused.service.isEligible(SHOP)).reason).toBe('paused');

      const noRecipients = bootPrefs({ owner: {}, users: [] });
      await expect((await noRecipients.service.isEligible(SHOP)).reason).toBe('no_verified_recipients');

      const ok = bootPrefs({
        users: [{ _id: '507f1f77bcf86cd799439071', email: 'o@s.example', role: 'admin' }],
      });
      await expect((await ok.service.isEligible(SHOP)).eligible).toBe(true);
    });

    it('recipient updates are tenant-scoped: a user of ANOTHER shop is rejected', async () => {
      const { service } = bootPrefs({
        users: [{ _id: '507f1f77bcf86cd799439072', role: 'admin' }], // only 1 of the 2 requested exists in this shop
      });
      await expect(
        service.update(SHOP, { recipientUserIds: ['507f1f77bcf86cd799439072', '507f1f77bcf86cd799439074'] }),
      ).rejects.toThrow(/users of this shop/i);
    });

    it('non-admin recipients are rejected', async () => {
      const { service } = bootPrefs({
        users: [{ _id: '507f1f77bcf86cd799439072', role: 'cashier' }],
      });
      await expect(
        service.update(SHOP, { recipientUserIds: ['507f1f77bcf86cd799439072'] }),
      ).rejects.toThrow(/admins or the owner/i);
    });

    it('resume clears a prior unsubscribe (explicit re-consent)', async () => {
      const { service, prefsDoc } = bootPrefs({
        prefs: { paused: true, unsubscribedAt: new Date() },
      });
      await service.update(SHOP, { paused: false });
      expect(prefsDoc.paused).toBe(false);
      expect(prefsDoc.unsubscribedAt).toBeUndefined();
    });

    it('RELEASE-GATE1: an admin DOWNGRADED after being listed stops receiving at resolve time', async () => {
      // The recipient list still contains u1, but u1 is now a cashier.
      const { service } = bootPrefs({
        prefs: { recipientUserIds: ['507f1f77bcf86cd799439072'] },
        users: [{ _id: '507f1f77bcf86cd799439072', email: 'downgraded@shop.example', role: 'cashier' }],
      });
      const recipients = await service.resolveRecipients(SHOP);
      expect(recipients).toEqual([]); // role re-checked at RESOLVE time
    });

    it('RELEASE-GATE1: multiple shops under one Google account resolve per-shop identities', async () => {
      // The same Google email exists as two users (one per shop); each shop
      // resolves ONLY its own user document.
      const { service, userModel } = bootPrefs({
        prefs: { recipientUserIds: ['507f1f77bcf86cd799439072'] },
        users: [{ _id: '507f1f77bcf86cd799439072', email: 'owner@gmail.example', role: 'admin' }],
      });
      const recipients = await service.resolveRecipients(SHOP);
      expect(recipients.map((r) => r.email)).toEqual(['owner@gmail.example']);
      // The tenant scope in the query guarantees the OTHER shop's user
      // document (same email, different _id) can never leak in.
      expect(userModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ shopId: expect.anything() }),
      );
    });
  });

  describe('narrative guardrails (deterministic, no fabrication)', () => {
    const base: ReportMetrics = {
      shopName: 'Load & Go',
      frequency: 'daily',
      periodLabel: 'Thursday 22 October 2026',
      periodStart: new Date(),
      periodEnd: new Date(),
      timezone: 'Africa/Nairobi',
      currency: 'KES',
      billedRevenue: 1160,
      collectedPayments: 1160,
      outstanding: 0,
      refunds: 0,
      tax: 160,
      discounts: 0,
      orders: 1,
      itemsSold: 1,
      averageOrderValue: 1160,
      paymentMethods: [{ method: 'cash', amount: 1160 }],
      topProducts: [{ productName: 'InkWave', quantity: 1, revenue: 1000 }],
      lowStock: [],
      insights: [],
      dashboardUrl: 'https://x',
      preferencesUrl: 'https://y',
      generatedAt: new Date(),
    };

    it('deterministic insights reference ONLY metric facts', () => {
      const narrative = new ReportNarrativeService();
      const insights = narrative.buildInsights(base);
      const text = insights.map((i) => i.text).join(' ');
      expect(text).toMatch(/1 completed order/);
      expect(text).toMatch(/InkWave/);
      // no invented numbers beyond the metrics
      expect(text).not.toMatch(/profit/i);
    });

    it('no-sales period: honest, useful guidance (not generic cheer)', () => {
      const narrative = new ReportNarrativeService();
      const insights = narrative.buildInsights({ ...base, orders: 0, billedRevenue: 0, topProducts: [] });
      expect(insights.some((i) => i.kind === 'fact' && /No completed sales/.test(i.text))).toBe(true);
      expect(insights.some((i) => i.kind === 'suggestion' && /first checkout/.test(i.text))).toBe(true);
      expect(insights.some((i) => /Keep up the great work/.test(i.text))).toBe(false);
    });

    it('outstanding balances surface as a fact + a suggestion', () => {
      const narrative = new ReportNarrativeService();
      const insights = narrative.buildInsights({ ...base, outstanding: 128.8 });
      expect(insights.some((i) => i.kind === 'fact' && /128\.80/.test(i.text))).toBe(true);
      expect(insights.some((i) => i.kind === 'suggestion' && /outstanding/i.test(i.text))).toBe(true);
    });

    it('AI narrative is DISABLED by default (deterministic insights returned unchanged)', async () => {
      const narrative = new ReportNarrativeService();
      base.insights = narrative.buildInsights(base);
      const result = await narrative.buildAiNarrativeIfEnabled(base);
      expect(result).toEqual(base.insights); // no AI call without the flag
    });

    it('AI narrative failure falls back to deterministic insights', async () => {
      process.env.AI_NARRATIVE_ENABLED = 'true';
      delete (process.env as any).OPENAI_API_KEY;
      const narrative = new ReportNarrativeService();
      base.insights = narrative.buildInsights(base);
      const result = await narrative.buildAiNarrativeIfEnabled(base);
      expect(result).toEqual(base.insights);
      delete process.env.AI_NARRATIVE_ENABLED;
    });
  });

  describe('renderer contract (HTML/text/PDF)', () => {
    const renderer = new ReportRendererService();
    const metrics: ReportMetrics = {
      shopName: 'Load & Go',
      frequency: 'daily',
      periodLabel: 'Thursday 22 October 2026',
      periodStart: new Date('2026-10-22T00:00:00Z'),
      periodEnd: new Date('2026-10-23T00:00:00Z'),
      timezone: 'Africa/Nairobi',
      currency: 'KES',
      billedRevenue: 1160,
      collectedPayments: 1160,
      outstanding: 0,
      refunds: 0,
      tax: 160,
      discounts: 0,
      orders: 1,
      itemsSold: 1,
      averageOrderValue: 1160,
      paymentMethods: [{ method: 'cash', amount: 1160 }],
      topProducts: [{ productName: 'InkWave & Sons <test>', quantity: 1, revenue: 1000 }],
      lowStock: [{ name: 'SweetJoy Candy', stock: 2, reorderPoint: 5 }],
      insights: [
        { kind: 'fact', text: '1 completed order.' },
        { kind: 'suggestion', text: 'Reorder SweetJoy Candy first.' },
      ],
      dashboardUrl: 'https://www.smartduka.org/admin/dashboard',
      preferencesUrl: 'https://www.smartduka.org/settings?tab=reports',
      generatedAt: new Date('2026-10-23T18:00:00Z'),
    };

    it('HTML is mobile-safe (table layout, inline styles) and escapes product names', () => {
      const html = renderer.html(metrics);
      expect(html).toContain('Load &amp; Go'); // escaped ampersand
      expect(html).toContain('InkWave &amp; Sons &lt;test&gt;'); // escaped
      expect(html).toContain('viewport');
      expect(html).toContain('unsubscribe');
      expect(html).toContain('KSh');
      expect(html).toContain('Billed sales');
      expect(html).toContain('Payments collected');
    });

    it('text alternative carries the same facts', () => {
      const text = renderer.text(metrics);
      expect(text).toContain('Billed sales: KSh 1,160.00');
      expect(text).toContain('Payments collected: KSh 1,160.00');
      expect(text).toContain('Tax collected: KSh 160.00');
      expect(text).toContain('InkWave & Sons <test>');
      expect(text).toContain('[Fact]');
      expect(text).toContain('[Suggestion]');
    });

    it('PDF renders a valid document with page numbers and a generation timestamp', async () => {
      const pdf = await renderer.pdf(metrics);
      expect(pdf.length).toBeGreaterThan(1000);
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
      const content = pdf.toString('latin1');
      // pdfkit splits text into per-glyph-run hex strings — decode ALL hex
      // segments and search the joined text.
      const decodedText = Array.from(content.matchAll(/<([0-9a-fA-F]+)>/g))
        .map((m) => {
          const hex = m[1].length % 2 ? '0' + m[1] : m[1];
          try {
            return Buffer.from(hex, 'hex').toString('latin1');
          } catch {
            return '';
          }
        })
        .join('');
      expect(decodedText).toContain('Load & Go');
      expect(decodedText).toContain('Page 1 of 1');
      expect(decodedText).toContain('Generated');
      expect(decodedText).toContain('Best sellers');
      expect(decodedText).toContain('Low stock');
    });
  });
});
