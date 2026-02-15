/**
 * Comprehensive fix script for all subscription issues
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://dontech1914_db_user:greatful%40dtb@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka';

async function fixAllSubscriptions() {
  console.log('🔄 Connecting to database...');
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    const subscriptions = db.collection('subscriptions');
    const shops = db.collection('shops');
    
    const now = new Date();
    const stats = {
      pastDueSuspended: 0,
      trialFixed: 0,
      expiredTrials: 0,
      shopStatusFixed: 0,
    };
    
    console.log('\n=== FIXING ALL SUBSCRIPTION ISSUES ===\n');
    
    // 1. Suspend ALL past_due shops immediately (no grace period)
    console.log('📌 Step 1: Suspending past_due subscriptions...\n');
    const pastDueSubs = await subscriptions.find({ status: 'past_due' }).toArray();
    
    for (const sub of pastDueSubs) {
      const shop = await shops.findOne({ _id: sub.shopId });
      const shopName = shop?.name || sub.shopId.toString();
      
      console.log(`🚫 ${shopName}: past_due -> SUSPENDED`);
      
      await subscriptions.updateOne(
        { _id: sub._id },
        { 
          $set: { 
            status: 'suspended',
            suspendedAt: now,
            suspendedReason: 'Auto-suspended: payment overdue'
          } 
        }
      );
      
      if (shop) {
        await shops.updateOne(
          { _id: shop._id },
          { $set: { status: 'suspended', subscriptionStatus: 'suspended' } }
        );
      }
      stats.pastDueSuspended++;
    }
    
    // 2. Fix trial plans showing pending_payment
    console.log('\n📌 Step 2: Fixing trial plans with wrong status...\n');
    const trialSubs = await subscriptions.find({ 
      planCode: 'trial',
      status: { $in: ['pending_payment', 'active'] }
    }).toArray();
    
    for (const sub of trialSubs) {
      const shop = await shops.findOne({ _id: sub.shopId });
      const shopName = shop?.name || sub.shopId.toString();
      const periodEnd = new Date(sub.currentPeriodEnd);
      const isExpired = now > periodEnd;
      
      if (isExpired) {
        console.log(`📅 ${shopName}: Trial expired -> expired`);
        await subscriptions.updateOne(
          { _id: sub._id },
          { $set: { status: 'expired' } }
        );
        if (shop) {
          await shops.updateOne(
            { _id: shop._id },
            { $set: { subscriptionStatus: 'expired' } }
          );
        }
        stats.expiredTrials++;
      } else if (sub.status === 'pending_payment') {
        console.log(`✅ ${shopName}: Trial pending_payment -> trial`);
        await subscriptions.updateOne(
          { _id: sub._id },
          { $set: { status: 'trial' } }
        );
        if (shop) {
          await shops.updateOne(
            { _id: shop._id },
            { $set: { subscriptionStatus: 'trial' } }
          );
        }
        stats.trialFixed++;
      }
    }
    
    // 3. Fix shop status mismatches (subscription suspended but shop active)
    console.log('\n📌 Step 3: Fixing shop status mismatches...\n');
    const suspendedSubs = await subscriptions.find({ status: 'suspended' }).toArray();
    
    for (const sub of suspendedSubs) {
      const shop = await shops.findOne({ _id: sub.shopId });
      if (shop && shop.status === 'active') {
        console.log(`🔧 ${shop.name}: Shop active but subscription suspended -> suspending shop`);
        await shops.updateOne(
          { _id: shop._id },
          { $set: { status: 'suspended', subscriptionStatus: 'suspended' } }
        );
        stats.shopStatusFixed++;
      }
    }
    
    // 4. Fix expired active subscriptions
    console.log('\n📌 Step 4: Fixing expired active subscriptions...\n');
    const expiredActiveSubs = await subscriptions.find({
      status: 'active',
      currentPeriodEnd: { $lt: now }
    }).toArray();
    
    for (const sub of expiredActiveSubs) {
      const shop = await shops.findOne({ _id: sub.shopId });
      const shopName = shop?.name || sub.shopId.toString();
      
      // Daily plans get suspended immediately, monthly gets past_due first
      if (sub.billingCycle === 'daily') {
        console.log(`🚫 ${shopName}: Daily plan expired -> SUSPENDED`);
        await subscriptions.updateOne(
          { _id: sub._id },
          { $set: { status: 'suspended', suspendedAt: now, suspendedReason: 'Daily plan expired' } }
        );
        if (shop) {
          await shops.updateOne(
            { _id: shop._id },
            { $set: { status: 'suspended', subscriptionStatus: 'suspended' } }
          );
        }
        stats.pastDueSuspended++;
      } else {
        console.log(`⏳ ${shopName}: Monthly plan expired -> past_due -> SUSPENDED`);
        await subscriptions.updateOne(
          { _id: sub._id },
          { $set: { status: 'suspended', suspendedAt: now, suspendedReason: 'Subscription expired' } }
        );
        if (shop) {
          await shops.updateOne(
            { _id: shop._id },
            { $set: { status: 'suspended', subscriptionStatus: 'suspended' } }
          );
        }
        stats.pastDueSuspended++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY:');
    console.log(`   🚫 Past due/expired suspended: ${stats.pastDueSuspended}`);
    console.log(`   ✅ Trial status fixed: ${stats.trialFixed}`);
    console.log(`   📅 Expired trials: ${stats.expiredTrials}`);
    console.log(`   🔧 Shop status mismatches fixed: ${stats.shopStatusFixed}`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Done!');
  }
}

fixAllSubscriptions();
