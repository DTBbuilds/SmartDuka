/* EMAIL-REPORTS-AUDIT1 — production email/WhatsApp/report evidence. READ-ONLY. */
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

  // 1. Email log volume + status breakdown
  const totalEmails = await db.collection('emaillogs').countDocuments({});
  console.log('=== EMAIL LOGS ===');
  console.log('total logged:', totalEmails);
  const byStatus = await db.collection('emaillogs').aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]).toArray();
  console.log('by status:', JSON.stringify(byStatus));
  const byTemplate = await db.collection('emaillogs').aggregate([
    { $group: { _id: { template: '$templateName', category: '$category', status: '$status' }, n: { $sum: 1 }, last: { $max: '$createdAt' } } },
    { $sort: { '_id.template': 1 } },
  ]).toArray();
  console.log('by template/category/status:');
  for (const t of byTemplate) console.log('  ', JSON.stringify(t));

  // 2. Last successful send per template
  const lastSent = await db.collection('emaillogs').aggregate([
    { $match: { status: 'sent' } },
    { $group: { _id: '$templateName', lastSent: { $max: '$sentAt' }, n: { $sum: 1 } } },
    { $sort: { lastSent: -1 } },
  ]).toArray();
  console.log('last SUCCESSFUL send per template:');
  for (const t of lastSent) console.log('  ', JSON.stringify(t));

  // 3. Failure sample (no PII — just errors)
  const failures = await db.collection('emaillogs').aggregate([
    { $match: { status: 'failed' } },
    { $group: { _id: '$errorMessage', n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: 8 },
  ]).toArray();
  console.log('top failure reasons:');
  for (const f of failures) console.log('  ', f.n, '×', String(f._id).slice(0, 140));

  // 4. DB-managed templates (seeded)
  const templates = await db.collection('emailtemplates').find({}, { projection: { name: 1, active: 1, subject: 1, updatedAt: 1 } }).toArray();
  console.log('=== DB EMAIL TEMPLATES ===', templates.length);
  for (const t of templates) console.log('  ', t.name, '| active:', t.active, '| updated:', t.updatedAt);

  // 5. WhatsApp configs (report delivery capability)
  const waConfigs = await db.collection('whatsapp_configs').find({}, { projection: { shopId: 1, isEnabled: 1, adminPhone: 1, reportSettings: 1 } }).toArray();
  console.log('=== WHATSAPP CONFIGS ===', waConfigs.length);
  for (const w of waConfigs) console.log('  ', JSON.stringify({ shopId: w.shopId, isEnabled: w.isEnabled, hasPhone: !!w.adminPhone, reportSettings: w.reportSettings }));

  // 6. WhatsApp messages sent (reports)
  const waByType = await db.collection('whatsapp_messages').aggregate([
    { $group: { _id: { type: '$type', category: '$category', status: '$status' }, n: { $sum: 1 }, last: { $max: '$createdAt' } } },
    { $sort: { n: -1 } },
    { $limit: 15 },
  ]).toArray();
  console.log('=== WHATSAPP MESSAGES (by type/category/status) ===');
  for (const m of waByType) console.log('  ', JSON.stringify(m));

  // 7. AI insights generated
  const aiInsights = await db.collection('ai_insights').countDocuments({});
  const aiAudit = await db.collection('ai_audit_logs').countDocuments({});
  console.log('ai_insights:', aiInsights, '| ai_audit_logs:', aiAudit);

  // 8. Retention baseline (aggregate, no PII)
  const shops = await db.collection('shops').countDocuments({});
  const activeShops = await db.collection('shops').countDocuments({ status: 'active' });
  const shopsWithProducts = await db.collection('products').distinct('shopId');
  const shopsWithOrders = await db.collection('orders').distinct('shopId');
  const shopsWithSettings = await db.collection('shopsettings').distinct('shopId');
  console.log('=== RETENTION BASELINE ===');
  console.log('shops registered:', shops, '| active:', activeShops);
  console.log('shops with products:', shopsWithProducts.length, '| with orders:', shopsWithOrders.length, '| with settings:', shopsWithSettings.length);

  // first-sale timing per shop (aggregate)
  const firstSales = await db.collection('orders').aggregate([
    { $group: { _id: '$shopId', firstSale: { $min: '$createdAt' }, lastSale: { $max: '$createdAt' }, n: { $sum: 1 } } },
  ]).toArray();
  console.log('shops with sales:', firstSales.length);
  for (const f of firstSales) console.log('  ', JSON.stringify(f));

  // registration cohort dates
  const cohorts = await db.collection('shops').aggregate([
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, n: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]).toArray();
  console.log('registration cohorts:', JSON.stringify(cohorts));

  await c.close();
})().catch((e) => { console.error('INSPECTION_ERROR:', e.message); process.exit(1); });
