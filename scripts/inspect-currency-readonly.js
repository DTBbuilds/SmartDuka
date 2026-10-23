/* QUALITY-CORE1 POS-CURRENCY-CHECKOUT-P0 — READ-ONLY production inspection.
 * Every operation below is a find/count. No write, update, delete, or index op.
 */
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Minimal .env loader (dotenv is not a dependency of this inspection script).
function loadEnv() {
  if (process.env.MONGODB_URI) return;
  const envPath = path.join(__dirname, '..', 'apps', 'api', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
  // SRV resolution is unavailable in this sandbox — prefer a direct
  // (non-SRV) URI written by the operator when present.
  const directPath = path.join(process.env.TEMP || '/tmp', 'direct-uri.txt');
  if (fs.existsSync(directPath)) {
    process.env.MONGODB_URI = fs.readFileSync(directPath, 'utf8').trim();
  }
}
loadEnv();

(async () => {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  const db = client.db();

  const shops = await db.collection('shops').find({}, {
    projection: { name: 1, shopId: 1, currency: 1, country: 1, status: 1, createdAt: 1, updatedAt: 1 },
  }).toArray();
  console.log('=== SHOPS (read-only projection) ===');
  for (const s of shops) {
    console.log(JSON.stringify({
      name: s.name, shopId: s.shopId, currency: s.currency,
      country: s.country, status: s.status,
      createdAt: s.createdAt, updatedAt: s.updatedAt,
    }));
  }

  // Currency distribution across shops
  const byCurrency = {};
  for (const s of shops) byCurrency[s.currency || '(none)'] = (byCurrency[s.currency || '(none)'] || 0) + 1;
  console.log('currency distribution:', JSON.stringify(byCurrency));

  // Find shops whose currency is not KES
  const nonKes = shops.filter((s) => s.currency && s.currency !== 'KES');
  console.log('non-KES shops:', nonKes.map((s) => `${s.name} (${s.shopId}): ${s.currency}`).join('; ') || 'none');

  await client.close();
})().catch((e) => { console.error('INSPECTION_ERROR:', e.message); process.exit(1); });
