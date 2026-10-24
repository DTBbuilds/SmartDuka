/* CANARY-PREP1 (Phase C) — canary report reconciliation. STRICTLY READ-ONLY:
 * boots the compiled ReportsService against production with a read-intent
 * connection and runs ONLY find/aggregate reads; renders the exact preview
 * artifacts (email/PDF) locally — nothing is sent. */
const path = require('path');
const fs = require('fs');

function loadEnv() {
  const envPath = path.join(__dirname, '..', 'apps', 'api', '.env');
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
  const directPath = path.join(process.env.TEMP || '/tmp', 'direct-uri.txt');
  if (fs.existsSync(directPath)) process.env.MONGODB_URI = fs.readFileSync(directPath, 'utf8').trim();
}
loadEnv();

(async () => {
  const mongoose = require(path.join(__dirname, '..', 'apps', 'api', 'node_modules', 'mongoose'));
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;
  const ObjectId = mongoose.Types.ObjectId; // single bson version throughout

  const { ReportsService } = require(path.join(__dirname, '..', 'apps', 'api', 'dist', 'src', 'reports', 'reports.service.js'));
  const { ReportRendererService } = require(path.join(__dirname, '..', 'apps', 'api', 'dist', 'src', 'reports', 'report-renderer.service.js'));
  const { ReportNarrativeService } = require(path.join(__dirname, '..', 'apps', 'api', 'dist', 'src', 'reports', 'report-narrative.service.js'));

  const SHOP = '69f31ada3e6e44b7887130dd';
  const reportsService = new ReportsService(
    { find: (q) => ({ lean: () => ({ exec: async () => db.collection('orders').find(q).toArray() }), exec: async () => db.collection('orders').find(q).toArray() }) },
    { findById: () => ({ select: () => ({ lean: () => ({ exec: async () => db.collection('shops').findOne({ _id: require('mongodb').ObjectId.isValid ? new ObjectId(SHOP) : SHOP }, { projection: { currency: 1, country: 1, timezone: 1 } }) }) }) }) },
  );

  // The canary day: 2026-10-23 (3 orders in production)
  const report = await reportsService.getDailySalesReport(SHOP, new Date('2026-10-23T12:00:00Z'));
  console.log('=== CANARY DAILY REPORT (2026-10-23, shop-local EAT) ===');
  console.log(JSON.stringify({
    date: report.date, currency: report.currency,
    billedRevenue: report.revenue, collectedPayments: report.collectedPayments,
    outstanding: report.outstanding, tax: report.tax, refunds: report.refunds,
    orders: report.orders, itemsSold: report.itemsSold,
    paymentMethods: report.paymentMethods,
    topProducts: report.topProducts,
  }, null, 1));

  // Independent cross-check: direct aggregation (authoritative source)
  const start = new Date('2026-10-22T21:00:00Z'); // Oct 23 00:00 EAT
  const end = new Date('2026-10-23T21:00:00Z');   // Oct 24 00:00 EAT
  const direct = await db.collection('orders').aggregate([
    { $match: { shopId: new ObjectId(SHOP), createdAt: { $gte: start, $lt: end }, status: 'completed' } },
    { $group: { _id: null, billed: { $sum: '$total' }, tax: { $sum: '$tax' }, n: { $sum: 1 } } },
  ]).toArray();
  const collected = await db.collection('orders').aggregate([
    { $match: { shopId: new ObjectId(SHOP), createdAt: { $gte: start, $lt: end }, status: 'completed' } },
    { $unwind: '$payments' },
    { $match: { 'payments.status': 'completed' } },
    { $group: { _id: null, collected: { $sum: '$payments.amount' } } },
  ]).toArray();
  console.log('=== INDEPENDENT AGGREGATION CROSS-CHECK ===');
  console.log(JSON.stringify({
    billed: direct[0]?.billed, tax: direct[0]?.tax, orders: direct[0]?.n,
    collected: collected[0]?.collected || 0,
  }));

  const ok =
    Math.abs((direct[0]?.billed || 0) - report.revenue) < 0.01 &&
    Math.abs((collected[0]?.collected || 0) - report.collectedPayments) < 0.01 &&
    (direct[0]?.n || 0) === report.orders;
  console.log(ok ? 'RECONCILIATION: MATCH (report == authoritative aggregation)' : 'RECONCILIATION: MISMATCH');

  // Render the EXACT canary preview artifacts locally (nothing sent)
  const renderer = new ReportRendererService();
  const narrative = new ReportNarrativeService();
  const metrics = {
    shopName: 'Load & Go',
    frequency: 'daily',
    periodLabel: report.date,
    periodStart: start, periodEnd: end,
    timezone: report.currency ? 'Africa/Nairobi' : 'Africa/Nairobi',
    currency: report.currency,
    billedRevenue: report.revenue,
    collectedPayments: report.collectedPayments,
    outstanding: report.outstanding,
    refunds: report.refunds,
    tax: report.tax,
    discounts: report.discounts || 0,
    orders: report.orders,
    itemsSold: report.itemsSold,
    averageOrderValue: report.averageOrderValue,
    paymentMethods: report.paymentMethods,
    topProducts: report.topProducts,
    lowStock: [],
    insights: [],
    dashboardUrl: 'https://www.smartduka.org/admin/dashboard',
    preferencesUrl: 'https://www.smartduka.org/settings?tab=reports',
    generatedAt: new Date(),
  };
  metrics.insights = narrative.buildInsights(metrics);
  const out = path.join(__dirname, '..', 'apps', 'web', 'public', 'release-gate-fixtures');
  fs.writeFileSync(path.join(out, 'canary_daily.html'), renderer.html(metrics));
  fs.writeFileSync(path.join(out, 'canary_daily.txt'), renderer.text(metrics));
  fs.writeFileSync(path.join(out, 'canary_daily.pdf'), await renderer.pdf(metrics));
  console.log('canary preview artifacts written (canary_daily.html/.txt/.pdf) — NOT sent');

  await mongoose.disconnect();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
