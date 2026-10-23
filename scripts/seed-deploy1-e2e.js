/* DEPLOY1 E2E seed — throwaway local database only (deploy1_e2e). */
const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');

(async () => {
  const c = new MongoClient('mongodb://127.0.0.1:27017', { serverSelectionTimeoutMS: 5000 });
  await c.connect();
  const db = c.db('deploy1_e2e');

  // Clean slate
  for (const coll of ['shops', 'users', 'products', 'shopsettings', 'orders', 'paymenttransactions', 'stockadjustments']) {
    await db.collection(coll).deleteMany({});
  }

  const shopId = new ObjectId();
  const userId = new ObjectId();
  const productId = new ObjectId();

  await db.collection('shops').insertOne({
    _id: shopId,
    name: 'Deploy1 E2E Shop',
    shopId: 'SHP-E2E-0001',
    email: 'e2e@example.com',
    phone: '+254700000000',
    currency: 'KES',
    country: 'KE',
    status: 'active',
    createdAt: new Date(), updatedAt: new Date(),
  });
  await db.collection('users').insertOne({
    _id: userId,
    shopId,
    email: 'e2e@example.com',
    name: 'E2E Admin',
    role: 'admin',
    createdAt: new Date(), updatedAt: new Date(),
  });
  await db.collection('products').insertOne({
    _id: productId,
    shopId,
    name: 'InkWave Organic Correction Tape',
    sku: 'ICT-0090',
    barcode: '805736260017',
    price: 625,
    cost: 480,
    stock: 10,
    status: 'active',
    createdAt: new Date(), updatedAt: new Date(),
  });
  await db.collection('shopsettings').insertOne({
    shopId: String(shopId),
    tax: { enabled: true, rate: 0.16, name: 'VAT', description: 'VAT 16%', appliedByDefault: true },
    taxExemptProducts: [],
    categoryTaxRates: {},
    createdAt: new Date(), updatedAt: new Date(),
  });

  console.log(JSON.stringify({
    db: 'deploy1_e2e',
    shopId: String(shopId),
    userId: String(userId),
    productId: String(productId),
  }));
  await c.close();
})().catch(e => { console.error('SEED_ERROR', e.message); process.exit(1); });
