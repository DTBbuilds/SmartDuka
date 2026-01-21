const { MongoClient } = require('mongodb');

async function check() {
  const client = new MongoClient('mongodb+srv://dontech1914_db_user:greatful%40dtb@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka');
  await client.connect();
  const db = client.db();
  
  const subs = await db.collection('subscriptions').find({}).toArray();
  const shops = await db.collection('shops').find({}).toArray();
  
  const now = new Date();
  console.log('Current time:', now.toISOString());
  console.log('\n=== ALL SUBSCRIPTIONS ===\n');
  
  for (const s of subs) {
    const shop = shops.find(sh => sh._id.toString() === s.shopId.toString());
    const shopName = shop ? shop.name : 'Unknown';
    const periodEnd = new Date(s.currentPeriodEnd);
    const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    
    console.log(`Shop: ${shopName}`);
    console.log(`  Plan: ${s.planCode} | Status: ${s.status} | Billing: ${s.billingCycle}`);
    console.log(`  Period End: ${periodEnd.toISOString()} | Days: ${daysRemaining}`);
    console.log(`  Shop Status: ${shop ? shop.status : 'N/A'} | Sub Status: ${shop ? shop.subscriptionStatus : 'N/A'}`);
    console.log('');
  }
  
  await client.close();
}

check();
