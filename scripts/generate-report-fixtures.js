/* RELEASE-GATE1 — synthetic report examples (PDF/HTML/text) for visual inspection. */
const path = require('path');
const fs = require('fs');
const { ReportRendererService } = require(path.join(__dirname, '..', 'apps', 'api', 'dist', 'src', 'reports', 'report-renderer.service.js'));

const OUT = path.join(__dirname, '..', 'apps', 'web', 'public', 'release-gate-fixtures');
fs.mkdirSync(OUT, { recursive: true });

const base = (over = {}) => ({
  shopName: 'Load & Go',
  frequency: 'daily',
  periodLabel: 'Thursday 22 October 2026',
  periodStart: new Date('2026-10-22T00:00:00Z'),
  periodEnd: new Date('2026-10-23T00:00:00Z'),
  timezone: 'Africa/Nairobi',
  currency: 'KES',
  billedRevenue: 933.8,
  collectedPayments: 805,
  outstanding: 128.8,
  refunds: 0,
  tax: 128.8,
  discounts: 0,
  orders: 1,
  itemsSold: 1,
  averageOrderValue: 933.8,
  paymentMethods: [{ method: 'cash', amount: 805 }],
  topProducts: [{ productId: 'p1', productName: 'HerbalPlus Daily Moisturizer', quantity: 1, revenue: 805 }],
  lowStock: [],
  insights: [],
  previousPeriod: { billedRevenue: 7656, orders: 1 },
  dashboardUrl: 'https://www.smartduka.org/admin/dashboard',
  preferencesUrl: 'https://www.smartduka.org/settings?tab=reports',
  generatedAt: new Date('2026-10-23T18:00:00Z'),
  ...over,
});

const daily = base({
  insights: [
    { kind: 'fact', text: 'Outstanding balance of 128.80 across the period (billed vs collected).' },
    { kind: 'fact', text: 'Billed sales changed down 87.8% versus the previous comparable period.' },
    { kind: 'suggestion', text: 'Review the outstanding balance on the Orders page — collect the difference or reconcile it.' },
  ],
});

const weekly = base({
  frequency: 'weekly',
  periodLabel: '19 October – 25 October 2026',
  billedRevenue: 46757.36,
  collectedPayments: 41463,
  outstanding: 5294.36,
  tax: 5351.36,
  orders: 4,
  itemsSold: 18,
  averageOrderValue: 11689.34,
  paymentMethods: [
    { method: 'cash', amount: 41658 },
    { method: 'send_money', amount: 805 },
  ],
  topProducts: [
    { productId: 'p1', productName: 'Oraimo Deluxe Phone Charger', quantity: 2, revenue: 12900 },
    { productId: 'p2', productName: 'SmartEdge Max Laptop Stand', quantity: 2, revenue: 10890 },
    { productId: 'p3', productName: 'Voltix Daily Laptop Stand', quantity: 2, revenue: 7450 },
  ],
  lowStock: [
    { name: 'InkWave Organic Correction Tape', stock: 2, reorderPoint: 5 },
    { name: 'SweetJoy Deluxe Candy Pack', stock: 0, reorderPoint: 3 },
  ],
  insights: [
    { kind: 'fact', text: 'Outstanding balance of 5,294.36 across the week (billed vs collected).' },
    { kind: 'suggestion', text: 'Reorder InkWave Organic Correction Tape first — it has the least stock remaining.' },
  ],
});

const monthly = base({
  frequency: 'monthly',
  periodLabel: '1 October – 31 October 2026',
  billedRevenue: 47182.16,
  collectedPayments: 41887.8,
  outstanding: 5294.36,
  tax: 5476.16,
  refunds: 0,
  discounts: 250,
  orders: 5,
  itemsSold: 19,
  averageOrderValue: 9436.43,
  paymentMethods: [
    { method: 'cash', amount: 42082.8 },
    { method: 'send_money', amount: 805 },
  ],
  topProducts: Array.from({ length: 10 }, (_, i) => ({
    productId: `p${i}`,
    productName: `Product ${i + 1} — ${['Oraimo Deluxe Phone Charger', 'SmartEdge Max Laptop Stand', 'Voltix Daily Laptop Stand', 'DermaLux Value Face Wash', 'AquaClean Family Sponges', 'Doom', 'Pure Australian Drink Water', 'HealthFirst Organic Thermometer', 'MamaFresh Pro Tea Leaves', 'SunGrain Classic Cereal'][i]}`,
    quantity: 10 - i,
    revenue: 12900 - i * 1100,
  })),
  lowStock: [
    { name: 'InkWave Organic Correction Tape', stock: 2, reorderPoint: 5 },
    { name: 'SweetJoy Deluxe Candy Pack', stock: 0, reorderPoint: 3 },
    { name: 'ChocoFun Fresh Candy Pack', stock: 1, reorderPoint: 4 },
  ],
  insights: [
    { kind: 'fact', text: '5 completed orders with 19 items sold in October.' },
    { kind: 'suggestion', text: 'Review the outstanding balance on the Orders page — collect the difference or reconcile it.' },
  ],
});

const noSales = base({
  periodLabel: 'Sunday 26 October 2026',
  billedRevenue: 0,
  collectedPayments: 0,
  outstanding: 0,
  tax: 0,
  orders: 0,
  itemsSold: 0,
  averageOrderValue: 0,
  paymentMethods: [],
  topProducts: [],
  previousPeriod: { billedRevenue: 933.8, orders: 1 },
  insights: [
    { kind: 'fact', text: 'No completed sales in this period.' },
    { kind: 'suggestion', text: 'No sales to analyse yet — focus on getting the first checkout completed this week.' },
  ],
});

const longNames = base({
  topProducts: [
    { productId: 'p1', productName: 'UltraPremium Deluxe Professional-Grade Organic Correction Tape with Extended Precision Applicator (Limited Edition)', quantity: 3, revenue: 1875 },
    { productId: 'p2', productName: 'HerbalPlus Daily Moisturizer with SPF 30 — Dermatologist Tested, Fragrance Free, 250ml', quantity: 2, revenue: 1610 },
  ],
  lowStock: [{ name: 'UltraPremium Deluxe Professional-Grade Organic Correction Tape with Extended Precision Applicator (Limited Edition)', stock: 1, reorderPoint: 5 }],
});

const renderer = new ReportRendererService();

(async () => {
  const examples = { daily, weekly, monthly, no_sales: noSales, long_names: longNames };
  for (const [name, m] of Object.entries(examples)) {
    fs.writeFileSync(path.join(OUT, `${name}.html`), renderer.html(m));
    fs.writeFileSync(path.join(OUT, `${name}.txt`), renderer.text(m));
    const pdf = await renderer.pdf(m);
    fs.writeFileSync(path.join(OUT, `${name}.pdf`), pdf);
    console.log(name, '→ PDF', pdf.length, 'bytes');
  }
  // Multi-page: monthly with 10 products + 8 low-stock + long insights
  const multi = base({
    frequency: 'monthly',
    periodLabel: '1 October – 31 October 2026',
    topProducts: Array.from({ length: 25 }, (_, i) => ({
      productId: `p${i}`,
      productName: `Bulk Product ${i + 1} — Extended Description For Pagination Testing ${i + 1}`,
      quantity: 20 - i,
      revenue: 20000 - i * 700,
    })),
    lowStock: Array.from({ length: 12 }, (_, i) => ({ name: `Low Stock Product ${i + 1} — Extended Name`, stock: i, reorderPoint: 5 })),
    insights: Array.from({ length: 8 }, (_, i) => ({
      kind: i % 2 ? 'suggestion' : 'fact',
      text: `Insight line ${i + 1}: ${'detailed explanation text '.repeat(3)}`,
    })),
  });
  const mpdf = await renderer.pdf(multi);
  fs.writeFileSync(path.join(OUT, 'multi_page.pdf'), mpdf);
  fs.writeFileSync(path.join(OUT, 'multi_page.html'), renderer.html(multi));
  fs.writeFileSync(path.join(OUT, 'multi_page.txt'), renderer.text(multi));
  console.log('multi_page → PDF', mpdf.length, 'bytes');
  console.log('fixtures written to', OUT);
})();
