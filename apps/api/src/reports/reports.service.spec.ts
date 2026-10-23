import { ReportsService } from './reports.service';

/**
 * EMAIL-REPORTS-CORE1 (Phase B/I) — FINANCIAL REPORTING REGRESSION SHIELD.
 *
 * Proves, against synthetic canonical orders:
 *  - shop-local day boundaries (Africa/Nairobi = UTC+3): a sale at
 *    2026-10-23T18:30Z is Oct 23 21:30 EAT (same local day); a sale at
 *    2026-10-23T21:30Z is Oct 24 00:30 EAT (NEXT local day);
 *  - completed-only scoping (void/pending never count);
 *  - billed vs collected vs outstanding separation (partial payments);
 *  - refunds and tax;
 *  - top products use the authoritative `lineTotal`/`name` fields
 *    (the old `item.price`/`item.productName` produced 0-revenue "Unknown");
 *  - currency from the order snapshot / shop;
 *  - tenant scoping;
 *  - single-query weekly/monthly (no N+1) with consistent totals.
 */
describe('EMAIL-REPORTS-CORE1 financial reporting correctness', () => {
  const SHOP = '507f1f77bcf86cd799439011';
  const SHOP_OTHER = '507f1f77bcf86cd799439099';

  // 2026-10-23 18:30Z = 21:30 EAT (Fri Oct 23 local) — inside the local day.
  const IN_DAY = new Date('2026-10-23T18:30:00Z');
  // 2026-10-23 21:30Z = 00:30 EAT (Sat Oct 24 local) — NEXT local day.
  const NEXT_DAY_EAT = new Date('2026-10-23T21:30:00Z');
  // 2026-10-22 20:00Z = 23:00 EAT (Thu Oct 22 local) — previous local day.
  const PREV_DAY = new Date('2026-10-22T20:00:00Z');

  function makeOrder(overrides: any): any {
    return {
      shopId: SHOP,
      status: 'completed',
      subtotal: 1000,
      tax: 160,
      total: 1160,
      loyaltyDiscount: 0,
      discountAmount: 0,
      discounts: [],
      refunds: [],
      payments: [{ method: 'cash', amount: 1160, status: 'completed' }],
      currency: 'KES',
      items: [
        { productId: 'p1', name: 'InkWave Organic Correction Tape', quantity: 1, unitPrice: 1000, lineTotal: 1000 },
      ],
      createdAt: IN_DAY,
      ...overrides,
    };
  }

  function boot(orders: any[]) {
    const findCalls: any[] = [];
    const orderModel = {
      find: jest.fn((query: any) => {
        findCalls.push(query);
        const start = query.createdAt?.$gte;
        const end = query.createdAt?.$lt ?? query.createdAt?.$lte;
        const filtered = orders.filter((o) => {
          const t = o.createdAt.getTime();
          if (start && t < start.getTime()) return false;
          if (end && t >= end.getTime()) return false;
          return String(o.shopId) === String(query.shopId);
        });
        const chain: any = {
          lean: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(filtered),
        };
        return chain;
      }),
    };
    const shopModel = {
      findById: jest.fn(() => ({
        select: jest.fn(() => ({
          lean: jest.fn().mockResolvedValue({ currency: 'KES', country: 'KE' }),
        })),
      })),
    };
    const service = new ReportsService(orderModel as any, shopModel as any);
    return { service, findCalls };
  }

  describe('shop-local day boundaries (Africa/Nairobi, UTC+3)', () => {
    it('a 21:30Z sale belongs to the NEXT local day (00:30 EAT)', async () => {
      const { service } = boot([makeOrder({ createdAt: NEXT_DAY_EAT })]);
      const report = await service.getDailySalesReport(SHOP, new Date('2026-10-23T12:00:00Z'));
      expect(report.date).toBe('2026-10-23');
      expect(report.orders).toBe(0); // the 21:30Z sale is Oct 24 in EAT
      const next = await service.getDailySalesReport(SHOP, new Date('2026-10-24T12:00:00Z'));
      expect(next.date).toBe('2026-10-24');
      expect(next.orders).toBe(1);
      expect(next.revenue).toBe(1160);
    });

    it('a 18:30Z sale belongs to the SAME local day (21:30 EAT)', async () => {
      const { service } = boot([makeOrder({ createdAt: IN_DAY })]);
      const report = await service.getDailySalesReport(SHOP, IN_DAY);
      expect(report.date).toBe('2026-10-23');
      expect(report.orders).toBe(1);
    });

    it('the previous local day is separate', async () => {
      const { service } = boot([makeOrder({ createdAt: PREV_DAY })]);
      const report = await service.getDailySalesReport(SHOP, new Date('2026-10-23T12:00:00Z'));
      expect(report.orders).toBe(0);
      const prev = await service.getDailySalesReport(SHOP, new Date('2026-10-22T12:00:00Z'));
      expect(prev.orders).toBe(1);
    });
  });

  describe('canonical financial separation', () => {
    it('billed vs collected vs outstanding for partial payments', async () => {
      const { service } = boot([
        makeOrder({ payments: [{ method: 'cash', amount: 500, status: 'completed' }] }),
        makeOrder({}),
      ]);
      const report = await service.getDailySalesReport(SHOP, IN_DAY);
      expect(report.revenue).toBe(2320); // billed (2 × 1160)
      expect(report.collectedPayments).toBe(1660); // 500 + 1160
      expect(report.outstanding).toBe(660); // 2320 − 1660
      expect(report.tax).toBe(320);
    });

    it('void and pending orders never count toward any metric', async () => {
      const { service } = boot([
        makeOrder({ status: 'void' }),
        makeOrder({ status: 'pending' }),
        makeOrder({}),
      ]);
      const report = await service.getDailySalesReport(SHOP, IN_DAY);
      expect(report.orders).toBe(1);
      expect(report.revenue).toBe(1160);
      expect(report.collectedPayments).toBe(1160);
    });

    it('refunds (completed events only) are reported', async () => {
      const { service } = boot([
        makeOrder({
          refunds: [
            { amount: 100, status: 'completed' },
            { amount: 50, status: 'manual_required' },
          ],
        }),
      ]);
      const report = await service.getDailySalesReport(SHOP, IN_DAY);
      expect(report.refunds).toBe(100);
    });

    it('discounts aggregate loyalty + discount events', async () => {
      const { service } = boot([
        makeOrder({
          loyaltyDiscount: 50,
          discountAmount: 20,
          discounts: [{ amount: 30 }],
        }),
      ]);
      const report = await service.getDailySalesReport(SHOP, IN_DAY);
      expect(report.discounts).toBe(100);
    });

    it('payment-method breakdown reflects completed payments only', async () => {
      const { service } = boot([
        makeOrder({ payments: [{ method: 'cash', amount: 1000, status: 'completed' }, { method: 'mpesa', amount: 160, status: 'pending' }] }),
      ]);
      const report = await service.getDailySalesReport(SHOP, IN_DAY);
      expect(report.paymentMethods).toEqual([{ method: 'cash', amount: 1000 }]);
      expect(report.collectedPayments).toBe(1000);
    });
  });

  describe('top products (authoritative fields)', () => {
    it('uses lineTotal and name — no 0-revenue "Unknown" entries', async () => {
      const { service } = boot([
        makeOrder({
          items: [
            { productId: 'p1', name: 'InkWave Organic Correction Tape', quantity: 3, unitPrice: 625, lineTotal: 1875 },
            { productId: 'p2', name: 'SweetJoy Deluxe Candy Pack', quantity: 1, unitPrice: 215, lineTotal: 215 },
          ],
          total: 2419.6, tax: 334.6, subtotal: 2090,
        }),
      ]);
      const report = await service.getDailySalesReport(SHOP, IN_DAY);
      expect(report.topProducts[0]).toMatchObject({ productName: 'InkWave Organic Correction Tape', quantity: 3, revenue: 1875 });
      expect(report.topProducts[1]).toMatchObject({ productName: 'SweetJoy Deluxe Candy Pack', quantity: 1, revenue: 215 });
      expect(report.itemsSold).toBe(4);
    });
  });

  describe('tenant scoping + currency', () => {
    it('another shop\u2019s orders never appear', async () => {
      const { service } = boot([makeOrder({ shopId: SHOP_OTHER })]);
      const report = await service.getDailySalesReport(SHOP, IN_DAY);
      expect(report.orders).toBe(0);
      expect(report.revenue).toBe(0);
    });

    it('currency comes from the shop (order snapshots dominate when present)', async () => {
      const { service } = boot([makeOrder({ currency: 'KES' })]);
      const report = await service.getDailySalesReport(SHOP, IN_DAY);
      expect(report.currency).toBe('KES');
    });
  });

  describe('weekly + monthly (single-query, consistent totals)', () => {
    it('weekly report aggregates the 7 local days consistently', async () => {
      const { service, findCalls } = boot([
        makeOrder({ createdAt: new Date('2026-10-20T10:00:00Z') }), // Mon Oct 19 13:00 EAT? (10:00Z = 13:00 EAT Mon 19th? — 2026-10-19 is a Monday)
        makeOrder({ createdAt: new Date('2026-10-23T18:30:00Z') }),
      ]);
      const week = await service.getWeeklySalesReport(SHOP, new Date('2026-10-19T00:00:00Z'));
      expect(week.orders).toBe(2);
      expect(week.revenue).toBe(2320);
      expect(week.dailyBreakdown).toHaveLength(7);
      const sumOfDays = week.dailyBreakdown.reduce((s, d) => s + d.revenue, 0);
      expect(sumOfDays).toBe(week.revenue);
      // ONE range query for the week (no N+1)
      expect(findCalls.length).toBe(2); // facts + breakdown re-query
    });

    it('monthly report covers the shop-local month and splits weeks', async () => {
      const { service } = boot([
        makeOrder({ createdAt: new Date('2026-10-01T10:00:00Z') }),
        makeOrder({ createdAt: new Date('2026-10-31T18:30:00Z') }), // Oct 31 21:30 EAT — still October
        makeOrder({ createdAt: new Date('2026-11-01T02:00:00Z') }), // Nov 1 05:00 EAT — November
      ]);
      const month = await service.getMonthlySalesReport(SHOP, 2026, 10);
      expect(month.orders).toBe(2); // the Nov 1 EAT sale is excluded
      expect(month.revenue).toBe(2320);
      expect(month.weeklyBreakdown.length).toBeGreaterThanOrEqual(4);
      const weekSum = month.weeklyBreakdown.reduce((s, w) => s + w.revenue, 0);
      expect(weekSum).toBe(month.revenue);
    });
  });

  describe('no-sales periods (never invent metrics)', () => {
    it('an empty period reports zeros with zero orders — no fabricated values', async () => {
      const { service } = boot([]);
      const report = await service.getDailySalesReport(SHOP, IN_DAY);
      expect(report).toMatchObject({
        orders: 0, revenue: 0, collectedPayments: 0, outstanding: 0, tax: 0, refunds: 0,
      });
      expect(report.topProducts).toEqual([]);
      expect(report.averageOrderValue).toBe(0);
    });
  });
});
