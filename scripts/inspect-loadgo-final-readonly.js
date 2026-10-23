/* LOADGO-CURRENCY-REMEDIATION1 — Phase A final evidence sweep. STRICTLY READ-ONLY. */
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  if (process.env.MONGODB_URI) return;
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
  const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  await c.connect();
  const db = c.db();
  const SHOP = new ObjectId('69f31ada3e6e44b7887130dd');

  // 1. Shop identity + currency + every field that could indicate AUD ops
  const shop = await db.collection('shops').findOne({ _id: SHOP });
  console.log('=== SHOP (full, minus secrets) ===');
  const { email, phone, ...safeShop } = shop;
  console.log(JSON.stringify(safeShop, (k, v) => (k === '_id' ? String(v) : v), 1).slice(0, 1200));

  // 2. All six orders WITH items + payments (financial truth)
  const orders = await db.collection('orders').find({ shopId: SHOP }).sort({ createdAt: 1 }).toArray();
  console.log(`=== ALL ${orders.length} ORDERS (items + payments) ===`);
  for (const o of orders) {
    console.log(JSON.stringify({
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      status: o.status,
      paymentStatus: o.paymentStatus,
      currency: o.currency ?? '(none)',
      subtotal: o.subtotal, tax: o.tax, total: o.total,
      loyaltyDiscount: o.loyaltyDiscount ?? 0,
      items: (o.items || []).map((i) => ({ name: i.name, qty: i.quantity, unitPrice: i.unitPrice, lineTotal: i.lineTotal })),
      payments: (o.payments || []).map((p) => ({ method: p.method, amount: p.amount, status: p.status, tendered: p.amountTendered, change: p.change, ref: p.mpesaReceiptNumber || p.reference || undefined })),
      refunds: (o.refunds || []).length,
      notes: (o.notes || '').slice(0, 100) || undefined,
    }));
  }

  // 3. All payment transactions
  const txs = await db.collection('paymenttransactions').find({ shopId: SHOP }).sort({ createdAt: 1 }).toArray();
  console.log(`=== ALL ${txs.length} PAYMENT TRANSACTIONS ===`);
  for (const t of txs) {
    console.log(JSON.stringify({
      orderNumber: t.orderNumber, method: t.paymentMethod, amount: t.amount,
      tendered: t.amountTendered, change: t.change, status: t.status,
      currency: t.currency ?? '(none)', createdAt: t.createdAt,
      reference: t.referenceNumber || t.mpesaReceiptNumber || undefined,
    }));
  }

  // 4. Products: price range + any currency fields
  const products = await db.collection('products').find({ shopId: SHOP }, { projection: { name: 1, price: 1, cost: 1, currency: 1, sku: 1 } }).toArray();
  const prices = products.map((p) => p.price || 0);
  console.log(`=== PRODUCTS (${products.length}) ===`);
  console.log('price range:', Math.min(...prices), '-', Math.max(...prices), '| with currency field:', products.filter((p) => p.currency).length);
  console.log('InkWave items:', JSON.stringify(products.filter((p) => /inkwave/i.test(p.name))));

  // 5. Tax settings
  const settings = await db.collection('shopsettings').findOne({ shopId: String(SHOP) }, { projection: { tax: 1, taxExemptProducts: 1, categoryTaxRates: 1, updatedAt: 1 } });
  console.log('=== SHOP SETTINGS ===', JSON.stringify(settings));

  // 6. Receipts / invoices / refunds / mpesa transactions / stripe payments
  for (const coll of ['receipts', 'invoices', 'mpesa_transactions', 'stripepayments', 'returns']) {
    const n = await db.collection(coll).countDocuments({ shopId: SHOP });
    console.log(`${coll}: ${n}`);
    if (n > 0 && n <= 10) {
      const docs = await db.collection(coll).find({ shopId: SHOP }).limit(10).toArray();
      for (const d of docs) console.log('  ', JSON.stringify(d).slice(0, 250));
    }
  }

  // 7. AUD-evidence hunt: any record mentioning AUD anywhere for this shop
  const audHints = [];
  for (const coll of ['orders', 'paymenttransactions', 'products', 'receipts', 'shopauditlogs', 'activities']) {
    const hits = await db.collection(coll).countDocuments({ shopId: SHOP, $or: [{ currency: 'AUD' }, { 'payments.currency': 'AUD' }] });
    if (hits) audHints.push(`${coll}: ${hits}`);
  }
  console.log('AUD-denominated records for this shop:', audHints.join(', ') || 'NONE');

  // 8. Modification check: updatedAt timestamps vs the release windows
  //    (releases deployed ~07:29 and ~08:25 UTC today)
  const modifiedAfterRelease = await db.collection('orders').countDocuments({ shopId: SHOP, updatedAt: { $gt: new Date('2026-10-23T07:00:00Z') }, createdAt: { $lt: new Date('2026-10-23T07:00:00Z') } });
  console.log('historical orders MODIFIED after today 07:00 UTC (expect 0):', modifiedAfterRelease);
  const txModified = await db.collection('paymenttransactions').countDocuments({ shopId: SHOP, updatedAt: { $gt: new Date('2026-10-23T07:00:00Z') }, createdAt: { $lt: new Date('2026-10-23T07:00:00Z') } });
  console.log('historical transactions MODIFIED after today 07:00 UTC (expect 0):', txModified);

  // 9. Shop currency-change audit (should still be none)
  const audits = await db.collection('shopauditlogs').find({ shopId: SHOP }).sort({ createdAt: -1 }).limit(10).toArray();
  console.log(`=== SHOP AUDIT LOG (${audits.length}) ===`);
  for (const a of audits) console.log('  ', JSON.stringify({ action: a.action, oldValue: a.oldValue, newValue: a.newValue, reason: (a.reason || '').slice(0, 80), at: a.createdAt }));

  await c.close();
})().catch((e) => { console.error('INSPECTION_ERROR:', e.message); process.exit(1); });
