/* READ-ONLY inspection: locate the InkWave product and profile its shop's
 * currency consistency across orders/payments/products/receipts/settings.
 */
const { MongoClient } = require('mongodb');
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

  // 1. Find InkWave products
  const products = await db.collection('products').find({
    $or: [
      { name: /inkwave/i },
      { sku: /inkwave/i },
      { barcode: /inkwave/i },
    ],
  }, { projection: { name: 1, shopId: 1, price: 1, currency: 1, sku: 1, barcode: 1, cost: 1, updatedAt: 1 } }).limit(10).toArray();
  console.log('=== INKWAVE PRODUCTS ===');
  for (const p of products) console.log(JSON.stringify(p));

  const shopIds = [...new Set(products.map((p) => String(p.shopId)))];
  console.log('shops owning them:', shopIds.join(','));

  for (const sid of shopIds) {
    const shopObjectId = require('mongodb').ObjectId.isValid(sid) ? new (require('mongodb').ObjectId)(sid) : sid;
    const shop = await db.collection('shops').findOne({ _id: shopObjectId }, { projection: { name: 1, shopId: 1, currency: 1, country: 1, createdAt: 1, updatedAt: 1 } });
    console.log('=== SHOP', sid, '===');
    console.log(JSON.stringify(shop));

    const counts = {};
    for (const coll of ['orders', 'paymenttransactions', 'receipts', 'purchases', 'shifts']) {
      counts[coll] = await db.collection(coll).countDocuments({ shopId: shopObjectId });
    }
    console.log('record counts:', JSON.stringify(counts));

    // Currency consistency inside orders
    const orderCurrencyAgg = await db.collection('orders').aggregate([
      { $match: { shopId: shopObjectId } },
      { $group: { _id: '$currency', n: { $sum: 1 }, total: { $sum: '$total' } } },
    ]).toArray();
    console.log('orders by currency field:', JSON.stringify(orderCurrencyAgg));

    // Recent orders sample (no customer PII)
    const recent = await db.collection('orders').find(
      { shopId: shopObjectId },
      { projection: { orderNumber: 1, total: 1, subtotal: 1, tax: 1, currency: 1, paymentStatus: 1, status: 1, createdAt: 1 } },
    ).sort({ createdAt: -1 }).limit(5).toArray();
    console.log('recent orders:');
    for (const o of recent) console.log(' ', JSON.stringify(o));

    // Payment transactions currency
    const txAgg = await db.collection('paymenttransactions').aggregate([
      { $match: { shopId: shopObjectId } },
      { $group: { _id: '$currency', n: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]).toArray();
    console.log('paymenttransactions by currency:', JSON.stringify(txAgg));

    // Shop settings tax snapshot
    const settings = await db.collection('shopsettings').findOne(
      { shopId: String(shopObjectId) },
      { projection: { tax: 1, currency: 1, updatedAt: 1 } },
    );
    console.log('shop settings:', JSON.stringify(settings));

    // Products currency field distribution
    const prodAgg = await db.collection('products').aggregate([
      { $match: { shopId: shopObjectId } },
      { $group: { _id: '$currency', n: { $sum: 1 } } },
    ]).toArray();
    console.log('products by currency field:', JSON.stringify(prodAgg));
  }

  await client.close();
})().catch((e) => { console.error('INSPECTION_ERROR:', e.message); process.exit(1); });
