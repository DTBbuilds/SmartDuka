import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

/**
 * EMAIL-REPORTS-CORE1 (Phase B) — FINANCIALLY CORRECT REPORTING.
 *
 * Canonical definitions (aligned with the QUALITY-CORE1 reconciliation
 * matrix and the checkout-integrity release):
 *   billedRevenue    Σ order.total on COMPLETED orders (tax-inclusive,
 *                    after loyalty) — what the customer was charged.
 *   collectedPayments Σ amounts of COMPLETED payment records — money that
 *                    actually arrived. Recognised sales ≠ settled payments;
 *                   the two are reported separately and never conflated.
 *   outstanding      billedRevenue − collectedPayments (raw; may be
 *                    negative on over-tender — the renderer clamps display).
 *   refunds          Σ completed RefundEvent allocations.
 *   tax              Σ order.tax on COMPLETED orders.
 *   discounts        Σ loyaltyDiscount + recorded DiscountEvents.
 *
 * Boundaries are SHOP-LOCAL (IANA timezone, default Africa/Nairobi): a
 * "day" is the shop's business day, not the server's UTC day. All period
 * queries are single range queries (no N+1). Item revenue uses the
 * authoritative `lineTotal` snapshot (the previous implementation read
 * `item.price`/`item.productName`, which do not exist on the Order schema,
 * producing 0-revenue "Unknown" top products).
 *
 * Metrics are never invented: an absent value is reported as absent
 * (0 with the period's emptiness visible via orders count), never
 * substituted with a fabricated figure.
 */

/** Kenyan business day by default; overridable per shop (IANA name). */
const DEFAULT_TIMEZONE = 'Africa/Nairobi';

/** Format an instant's Y-M-D in a shop-local timezone (built-in Intl). */
function localYmd(instant: Date, timeZone: string): string {
  try {
    // en-CA gives ISO-like YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instant);
  } catch {
    return instant.toISOString().split('T')[0];
  }
}

/** UTC instants covering [startOfDay, nextDay) for a shop-local Y-M-D. */
function shopDayRangeUtc(ymd: string, timeZone: string): { start: Date; end: Date } {
  // Midday trick: noon in the target zone is never near a DST/offset edge,
  // so formatting back yields the correct offset for that calendar day.
  const probe = new Date(`${ymd}T12:00:00Z`);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = formatter.formatToParts(probe);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(
    get('year'), get('month') - 1, get('day'),
    get('hour') % 24, get('minute'), get('second'),
  );
  const offsetMs = asUtc - probe.getTime();
  const start = new Date(new Date(`${ymd}T00:00:00Z`).getTime() - offsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

interface CanonicalOrderFacts {
  billedRevenue: number;
  collectedPayments: number;
  refunds: number;
  tax: number;
  discounts: number;
  orders: number;
  itemsSold: number;
  productMap: Map<string, { name: string; quantity: number; revenue: number }>;
  currencies: Map<string, number>;
  paymentMethods: Map<string, number>;
}

function accumulateOrders(orders: any[]): CanonicalOrderFacts {
  const facts: CanonicalOrderFacts = {
    billedRevenue: 0,
    collectedPayments: 0,
    refunds: 0,
    tax: 0,
    discounts: 0,
    orders: 0,
    itemsSold: 0,
    productMap: new Map(),
    currencies: new Map(),
    paymentMethods: new Map(),
  };

  for (const order of orders) {
    // Canonical sales scope: COMPLETED orders only. Pending orders have not
    // settled; void orders are reversed — neither is recognised revenue.
    if (order.status !== 'completed') continue;

    facts.orders += 1;
    facts.billedRevenue += order.total || 0;
    facts.tax += order.tax || 0;
    facts.discounts += (order.loyaltyDiscount || 0) + (order.discountAmount || 0);
    for (const d of order.discounts || []) facts.discounts += d.amount || 0;
    for (const r of order.refunds || []) {
      if (r.status === 'completed') facts.refunds += r.amount || 0;
    }
    for (const p of order.payments || []) {
      if (p.status === 'completed') {
        facts.collectedPayments += p.amount || 0;
        const m = p.method || 'unknown';
        facts.paymentMethods.set(m, (facts.paymentMethods.get(m) || 0) + (p.amount || 0));
      }
    }
    const cur = order.currency ? String(order.currency) : '(unlabelled)';
    facts.currencies.set(cur, (facts.currencies.get(cur) || 0) + 1);

    for (const item of order.items || []) {
      facts.itemsSold += item.quantity || 0;
      const key = item.productId?.toString() || 'unknown';
      if (!facts.productMap.has(key)) {
        // The authoritative snapshot fields are `name` and `lineTotal`
        // (NOT productName/price — those do not exist on OrderItem).
        facts.productMap.set(key, {
          name: item.name || 'Unknown',
          quantity: 0,
          revenue: 0,
        });
      }
      const prod = facts.productMap.get(key)!;
      prod.quantity += item.quantity || 0;
      prod.revenue += item.lineTotal ?? (item.unitPrice || 0) * (item.quantity || 0);
    }
  }

  facts.billedRevenue = round2(facts.billedRevenue);
  facts.collectedPayments = round2(facts.collectedPayments);
  facts.refunds = round2(facts.refunds);
  facts.tax = round2(facts.tax);
  facts.discounts = round2(facts.discounts);
  return facts;
}

function topProductsFrom(productMap: Map<string, { name: string; quantity: number; revenue: number }>, limit = 10) {
  return Array.from(productMap.entries())
    .map(([productId, data]) => ({
      productId,
      productName: data.name,
      quantity: data.quantity,
      revenue: round2(data.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity)
    .slice(0, limit);
}

/** The period's dominant currency: order snapshots first, majority wins. */
function dominantCurrency(facts: CanonicalOrderFacts, shopCurrency?: string): string | undefined {
  let best: string | undefined;
  let bestN = 0;
  for (const [cur, n] of facts.currencies.entries()) {
    if (cur !== '(unlabelled)' && n > bestN) {
      best = cur;
      bestN = n;
    }
  }
  if (!best && facts.orders > 0) best = shopCurrency;
  if (!best) best = shopCurrency;
  return best;
}

export interface DailySalesReport {
  date: string;
  revenue: number; // billed (canonical: what customers were charged)
  collectedPayments: number;
  outstanding: number;
  refunds: number;
  tax: number;
  discounts: number;
  currency?: string;
  orders: number;
  itemsSold: number;
  averageOrderValue: number;
  paymentMethods: Array<{ method: string; amount: number }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface WeeklySalesReport {
  week: string;
  startDate: Date;
  endDate: Date;
  revenue: number;
  collectedPayments: number;
  outstanding: number;
  refunds: number;
  tax: number;
  discounts: number;
  currency?: string;
  orders: number;
  itemsSold: number;
  averageOrderValue: number;
  dailyBreakdown: DailySalesReport[];
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface MonthlySalesReport {
  month: string;
  year: number;
  revenue: number;
  collectedPayments: number;
  outstanding: number;
  refunds: number;
  tax: number;
  discounts: number;
  currency?: string;
  orders: number;
  itemsSold: number;
  averageOrderValue: number;
  weeklyBreakdown: WeeklySalesReport[];
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface SalesMetrics {
  totalRevenue: number;
  collectedPayments: number;
  outstanding: number;
  refunds: number;
  tax: number;
  totalOrders: number;
  totalItemsSold: number;
  averageOrderValue: number;
  averageItemsPerOrder: number;
  conversionRate: number;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel('Order') private readonly orderModel: Model<any>,
    @InjectModel('Shop') private readonly shopModel: Model<any>,
  ) {}

  /** The shop's reporting timezone (IANA), defaulting to Nairobi. */
  async getShopTimezone(shopId: string): Promise<string> {
    try {
      const shop = (await this.shopModel
        .findById(new Types.ObjectId(shopId))
        .select('timezone country')
        .lean()
        .exec()) as any;
      // A shop-level timezone field when present; Kenya shops are EAT.
      if (shop?.timezone) return shop.timezone;
      if (shop?.country === 'KE') return 'Africa/Nairobi';
      if (shop?.country === 'AU') return 'Australia/Sydney';
      return DEFAULT_TIMEZONE;
    } catch {
      return DEFAULT_TIMEZONE;
    }
  }

  private async shopCurrency(shopId: string): Promise<string | undefined> {
    try {
      const shop = (await this.shopModel
        .findById(new Types.ObjectId(shopId))
        .select('currency')
        .lean()
        .exec()) as any;
      return shop?.currency;
    } catch {
      return undefined;
    }
  }

  /** Canonical facts for an explicit [start, end) UTC instant range. */
  async factsForRange(shopId: string, start: Date, end: Date): Promise<CanonicalOrderFacts> {
    const orders = await this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        createdAt: { $gte: start, $lt: end },
      })
      .lean()
      .exec();
    return accumulateOrders(orders);
  }

  async getDailySalesReport(
    shopId: string,
    date: Date,
    timeZone?: string,
  ): Promise<DailySalesReport> {
    const tz = timeZone || (await this.getShopTimezone(shopId));
    const ymd = localYmd(date, tz);
    const { start, end } = shopDayRangeUtc(ymd, tz);
    const facts = await this.factsForRange(shopId, start, end);
    const currency = await this.shopCurrency(shopId);

    return {
      date: ymd,
      revenue: facts.billedRevenue,
      collectedPayments: facts.collectedPayments,
      outstanding: round2(facts.billedRevenue - facts.collectedPayments),
      refunds: facts.refunds,
      tax: facts.tax,
      discounts: facts.discounts,
      currency: dominantCurrency(facts, currency),
      orders: facts.orders,
      itemsSold: facts.itemsSold,
      averageOrderValue: facts.orders > 0 ? round2(facts.billedRevenue / facts.orders) : 0,
      paymentMethods: Array.from(facts.paymentMethods.entries())
        .map(([method, amount]) => ({ method, amount: round2(amount) }))
        .sort((a, b) => b.amount - a.amount),
      topProducts: topProductsFrom(facts.productMap),
    };
  }

  async getWeeklySalesReport(
    shopId: string,
    startDate: Date,
    timeZone?: string,
  ): Promise<WeeklySalesReport> {
    const tz = timeZone || (await this.getShopTimezone(shopId));
    const startYmd = localYmd(startDate, tz);
    const { start } = shopDayRangeUtc(startYmd, tz);
    // Exactly 7 shop-local days: [local midnight, local midnight + 7d).
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    const endYmd = localYmd(new Date(end.getTime() - 1), tz);

    const facts = await this.factsForRange(shopId, start, end);
    const currency = await this.shopCurrency(shopId);

    // Daily breakdown computed from the SAME single query (no N+1).
    const dayFacts = new Map<string, CanonicalOrderFacts>();
    const orders = await this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        createdAt: { $gte: start, $lt: end },
      })
      .lean()
      .exec();
    for (const order of orders) {
      const ymd = localYmd(new Date(order.createdAt), tz);
      if (!dayFacts.has(ymd)) {
        dayFacts.set(ymd, accumulateOrders([]));
      }
      // Reuse accumulate on the single order for consistent semantics.
      const single = accumulateOrders([order]);
      const acc = dayFacts.get(ymd)!;
      acc.orders += single.orders;
      acc.billedRevenue = round2(acc.billedRevenue + single.billedRevenue);
      acc.collectedPayments = round2(acc.collectedPayments + single.collectedPayments);
      acc.refunds = round2(acc.refunds + single.refunds);
      acc.tax = round2(acc.tax + single.tax);
      acc.discounts = round2(acc.discounts + single.discounts);
      acc.itemsSold += single.itemsSold;
      for (const [k, v] of single.productMap) {
        const existing = acc.productMap.get(k) || { name: v.name, quantity: 0, revenue: 0 };
        existing.quantity += v.quantity;
        existing.revenue = round2(existing.revenue + v.revenue);
        acc.productMap.set(k, existing);
      }
      for (const [k, v] of single.paymentMethods) {
        acc.paymentMethods.set(k, (acc.paymentMethods.get(k) || 0) + v);
      }
      for (const [k, v] of single.currencies) {
        acc.currencies.set(k, (acc.currencies.get(k) || 0) + v);
      }
    }

    const dailyBreakdown: DailySalesReport[] = [];
    const cursor = new Date(start);
    while (cursor < end) {
      const ymd = localYmd(cursor, tz);
      const f = dayFacts.get(ymd) || accumulateOrders([]);
      dailyBreakdown.push({
        date: ymd,
        revenue: f.billedRevenue,
        collectedPayments: f.collectedPayments,
        outstanding: round2(f.billedRevenue - f.collectedPayments),
        refunds: f.refunds,
        tax: f.tax,
        discounts: f.discounts,
        currency: dominantCurrency(f, currency),
        orders: f.orders,
        itemsSold: f.itemsSold,
        averageOrderValue: f.orders > 0 ? round2(f.billedRevenue / f.orders) : 0,
        paymentMethods: Array.from(f.paymentMethods.entries()).map(([method, amount]) => ({ method, amount: round2(amount) })),
        topProducts: topProductsFrom(f.productMap, 5),
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const weekNumber = Math.ceil(Number(startYmd.slice(8, 10)) / 7);

    return {
      week: `Week ${weekNumber}`,
      startDate: start,
      endDate: end,
      revenue: facts.billedRevenue,
      collectedPayments: facts.collectedPayments,
      outstanding: round2(facts.billedRevenue - facts.collectedPayments),
      refunds: facts.refunds,
      tax: facts.tax,
      discounts: facts.discounts,
      currency: dominantCurrency(facts, currency),
      orders: facts.orders,
      itemsSold: facts.itemsSold,
      averageOrderValue: facts.orders > 0 ? round2(facts.billedRevenue / facts.orders) : 0,
      dailyBreakdown,
      topProducts: topProductsFrom(facts.productMap),
    };
  }

  async getMonthlySalesReport(
    shopId: string,
    year: number,
    month: number,
    timeZone?: string,
  ): Promise<MonthlySalesReport> {
    const tz = timeZone || (await this.getShopTimezone(shopId));
    // Month boundaries in SHOP-LOCAL time: first day 00:00 local → first day
    // of next month 00:00 local.
    const firstYmd = `${year}-${String(month).padStart(2, '0')}-01`;
    const { start } = shopDayRangeUtc(firstYmd, tz);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const { start: nextStart } = shopDayRangeUtc(
      `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
      tz,
    );
    const end = nextStart;

    const facts = await this.factsForRange(shopId, start, end);
    const currency = await this.shopCurrency(shopId);

    // Weekly breakdown from the same single query: weeks are 7-day blocks
    // from the first day of the month.
    const orders = await this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        createdAt: { $gte: start, $lt: end },
      })
      .lean()
      .exec();

    const weeklyReports: WeeklySalesReport[] = [];
    const weekCount = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
    for (let w = 0; w < weekCount; w++) {
      const wStart = new Date(start.getTime() + w * 7 * 24 * 60 * 60 * 1000);
      const wEnd = new Date(Math.min(wStart.getTime() + 7 * 24 * 60 * 60 * 1000, end.getTime()));
      const wFacts = accumulateOrders(
        orders.filter((o: any) => o.createdAt >= wStart && o.createdAt < wEnd),
      );
      weeklyReports.push({
        week: `Week ${w + 1}`,
        startDate: wStart,
        endDate: wEnd,
        revenue: wFacts.billedRevenue,
        collectedPayments: wFacts.collectedPayments,
        outstanding: round2(wFacts.billedRevenue - wFacts.collectedPayments),
        refunds: wFacts.refunds,
        tax: wFacts.tax,
        discounts: wFacts.discounts,
        currency: dominantCurrency(wFacts, currency),
        orders: wFacts.orders,
        itemsSold: wFacts.itemsSold,
        averageOrderValue: wFacts.orders > 0 ? round2(wFacts.billedRevenue / wFacts.orders) : 0,
        dailyBreakdown: [],
        topProducts: topProductsFrom(wFacts.productMap, 5),
      });
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    return {
      month: monthNames[month - 1],
      year,
      revenue: facts.billedRevenue,
      collectedPayments: facts.collectedPayments,
      outstanding: round2(facts.billedRevenue - facts.collectedPayments),
      refunds: facts.refunds,
      tax: facts.tax,
      discounts: facts.discounts,
      currency: dominantCurrency(facts, currency),
      orders: facts.orders,
      itemsSold: facts.itemsSold,
      averageOrderValue: facts.orders > 0 ? round2(facts.billedRevenue / facts.orders) : 0,
      weeklyBreakdown: weeklyReports,
      topProducts: topProductsFrom(facts.productMap),
    };
  }

  async getSalesMetrics(shopId: string, days: number = 30): Promise<SalesMetrics> {
    const tz = await this.getShopTimezone(shopId);
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    const facts = await this.factsForRange(shopId, start, end);

    return {
      totalRevenue: facts.billedRevenue,
      collectedPayments: facts.collectedPayments,
      outstanding: round2(facts.billedRevenue - facts.collectedPayments),
      refunds: facts.refunds,
      tax: facts.tax,
      totalOrders: facts.orders,
      totalItemsSold: facts.itemsSold,
      averageOrderValue: facts.orders > 0 ? round2(facts.billedRevenue / facts.orders) : 0,
      averageItemsPerOrder: facts.orders > 0 ? Math.round((facts.itemsSold / facts.orders) * 100) / 100 : 0,
      conversionRate: 0, // Would need visitor data to calculate
    };
  }

  async getTrendAnalysis(shopId: string, days: number = 30): Promise<any> {
    const tz = await this.getShopTimezone(shopId);
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

    const orders = await this.orderModel
      .find({
        shopId: new Types.ObjectId(shopId),
        createdAt: { $gte: start, $lt: end },
        status: 'completed',
      })
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    const dailyData: Record<string, { revenue: number; orders: number; collected: number }> = {};
    for (const order of orders) {
      const date = localYmd(new Date(order.createdAt), tz);
      if (!dailyData[date]) {
        dailyData[date] = { revenue: 0, orders: 0, collected: 0 };
      }
      dailyData[date].revenue = round2(dailyData[date].revenue + (order.total || 0));
      dailyData[date].orders += 1;
      for (const p of order.payments || []) {
        if (p.status === 'completed') {
          dailyData[date].collected = round2(dailyData[date].collected + (p.amount || 0));
        }
      }
    }

    return {
      period: `Last ${days} days`,
      startDate: start,
      endDate: end,
      timezone: tz,
      dailyData: Object.entries(dailyData).map(([date, data]) => ({
        date,
        ...data,
      })),
    };
  }
}
