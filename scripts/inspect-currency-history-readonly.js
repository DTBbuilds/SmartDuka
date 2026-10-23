/* READ-ONLY: full currency-history hunt for Load & Go across all audit collections */
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
  const SHOP_STR = '69f31ada3e6e44b7887130dd';
  const SHOP_CODE = 'SHP-00002-VCLTV';

  for (const name of ['shopauditlogs', 'config_audit_logs', 'systemauditlogs', 'auditlogs', 'activities']) {
    const coll = db.collection(name);
    const total = await coll.countDocuments({});
    if (total === 0) { console.log(`--- ${name}: EMPTY`); continue; }
    console.log(`--- ${name} (${total} docs) ---`);
    // any doc mentioning this shop AND currency
    const curEvents = await coll.find({
      $and: [
        { $or: [{ shopId: SHOP }, { shopId: SHOP_STR }, { 'details.shopId': SHOP_STR }, { 'details.shopId': SHOP }, { shopId: SHOP_CODE }, { 'details.shopId': SHOP_CODE }] },
        { $or: [{ 'details.currency': { $exists: true } }, { currency: { $exists: true } }, { 'changes.currency': { $exists: true } }, { 'newValues.currency': { $exists: true } }] },
      ],
    }).limit(20).toArray();
    for (const e of curEvents) console.log('  CURRENCY:', JSON.stringify(e).slice(0, 400));

    // shop-update events for this shop (any)
    const updEvents = await coll.find({
      $or: [{ shopId: SHOP }, { shopId: SHOP_STR }, { 'details.shopId': SHOP_STR }],
      $or2: undefined,
    }).sort({ createdAt: -1 }).limit(8).toArray().catch(() => []);
    // fallthrough: sample the newest few docs mentioning the shop
    const sample = await coll.find({
      $or: [{ shopId: SHOP }, { shopId: SHOP_STR }, { 'details.shopId': SHOP_STR }, { 'details.shopId': SHOP }],
    }).sort({ createdAt: -1 }).limit(6).toArray();
    for (const s of sample) console.log('  sample:', JSON.stringify(s).slice(0, 300));
  }

  // The shop document itself: any embedded history/audit fields?
  const shop = await db.collection('shops').findOne({ _id: SHOP });
  const keys = Object.keys(shop);
  console.log('shop doc keys:', keys.join(', '));
  for (const k of keys) {
    if (/audit|histor|log/i.test(k)) console.log('  embedded', k, ':', JSON.stringify(shop[k]).slice(0, 500));
  }

  await client.close();
})().catch((e) => { console.error('INSPECTION_ERROR:', e.message); process.exit(1); });
