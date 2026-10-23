/* READ-ONLY: currency-change audit trail for Load & Go + shop-settings history */
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
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  await client.connect();
  const db = client.db();
  const SHOP = new ObjectId('69f31ada3e6e44b7887130dd');

  // List collections to find audit-ish ones
  const colls = await db.listCollections().toArray();
  console.log('collections:', colls.map((c) => c.name).join(', '));

  // Search audit collection(s) for shop-update events mentioning currency
  for (const name of ['audits', 'auditlogs', 'audit_logs', 'activities', 'activitylogs']) {
    if (!colls.some((c) => c.name === name)) continue;
    const coll = db.collection(name);
    const total = await coll.countDocuments({});
    console.log(`--- ${name} (${total} docs) ---`);
    const events = await coll.find({
      $or: [
        { 'details.shopId': String(SHOP) },
        { shopId: String(SHOP) },
        { shopId: SHOP },
      ],
    }, { projection: { action: 1, type: 1, createdAt: 1, details: 1, user: 1 } }).sort({ createdAt: -1 }).limit(30).toArray();
    for (const e of events) {
      const s = JSON.stringify(e);
      if (/currency/i.test(s)) console.log('CURRENCY-EVENT:', s.slice(0, 500));
    }
    // any event at all for this shop
    const anyEvents = await coll.countDocuments({ $or: [{ 'details.shopId': String(SHOP) }, { shopId: String(SHOP) }, { shopId: SHOP }] });
    console.log('events for shop:', anyEvents);
  }

  // The six orders in full financial detail (no PII needed)
  const orders = await db.collection('orders').find(
    { shopId: SHOP },
    { projection: { orderNumber: 1, subtotal: 1, tax: 1, total: 1, payments: 1, paymentStatus: 1, status: 1, createdAt: 1, loyaltyDiscount: 1, notes: 1 } },
  ).sort({ createdAt: -1 }).toArray();
  console.log('=== ALL ORDERS (financial detail) ===');
  for (const o of orders) {
    console.log(JSON.stringify({
      orderNumber: o.orderNumber, createdAt: o.createdAt, status: o.status,
      paymentStatus: o.paymentStatus, subtotal: o.subtotal, tax: o.tax, total: o.total,
      loyaltyDiscount: o.loyaltyDiscount,
      payments: (o.payments || []).map((p) => ({ method: p.method, amount: p.amount, status: p.status, ref: p.mpesaReceiptNumber || p.reference })),
      notes: (o.notes || '').slice(0, 120),
    }));
  }

  // Payment transactions detail
  const txs = await db.collection('paymenttransactions').find(
    { shopId: SHOP },
    { projection: { orderNumber: 1, paymentMethod: 1, amount: 1, amountTendered: 1, change: 1, status: 1, createdAt: 1 } },
  ).sort({ createdAt: -1 }).toArray();
  console.log('=== ALL PAYMENT TRANSACTIONS ===');
  for (const t of txs) console.log(JSON.stringify(t));

  await client.close();
})().catch((e) => { console.error('INSPECTION_ERROR:', e.message); process.exit(1); });
