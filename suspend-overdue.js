/**
 * Script to suspend all shops with overdue subscriptions
 * Run with: node suspend-overdue.js
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://dontech1914_db_user:greatful%40dtb@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka';
const GRACE_PERIOD_DAYS = 7;

async function suspendOverdueShops() {
  console.log('🔄 Connecting to database...');
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    const subscriptions = db.collection('subscriptions');
    const shops = db.collection('shops');
    
    const now = new Date();
    let suspended = 0;
    let alreadySuspended = 0;
    let withinGrace = 0;
    let trialExpired = 0;
    
    console.log('📋 Finding overdue subscriptions...\n');
    
    // Find all subscriptions that are past due or active but expired
    const overdueSubscriptions = await subscriptions.find({
      $or: [
        { status: 'past_due' },
        { 
          status: 'active',
          currentPeriodEnd: { $lt: now }
        },
        {
          status: 'trial',
          currentPeriodEnd: { $lt: now }
        }
      ]
    }).toArray();
    
    console.log(`Found ${overdueSubscriptions.length} potentially overdue subscriptions\n`);
    
    for (const sub of overdueSubscriptions) {
      const shop = await shops.findOne({ _id: sub.shopId });
      const shopName = shop?.name || sub.shopId.toString();
      
      // Calculate days overdue
      const periodEnd = new Date(sub.currentPeriodEnd);
      const daysOverdue = Math.ceil((now.getTime() - periodEnd.getTime()) / (24 * 60 * 60 * 1000));
      
      if (sub.status === 'suspended') {
        console.log(`⏭️  ${shopName}: Already suspended`);
        alreadySuspended++;
        continue;
      }
      
      // Handle trial plans - they expire, not suspend
      if (sub.planCode === 'trial' || sub.status === 'trial') {
        console.log(`📅 ${shopName}: Trial plan expired - marking as expired`);
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
        trialExpired++;
        continue;
      }
      
      // Check grace period
      let gracePeriodEnd = sub.gracePeriodEndDate ? new Date(sub.gracePeriodEndDate) : null;
      if (!gracePeriodEnd) {
        gracePeriodEnd = new Date(periodEnd.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
      }
      
      const isGraceExpired = now > gracePeriodEnd;
      
      if (!isGraceExpired) {
        const daysLeft = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        console.log(`⏳ ${shopName}: ${daysOverdue} days overdue, ${daysLeft} days of grace period left`);
        withinGrace++;
        continue;
      }
      
      // Suspend the subscription and shop
      console.log(`🚫 ${shopName}: ${daysOverdue} days overdue - SUSPENDING`);
      
      await subscriptions.updateOne(
        { _id: sub._id },
        { 
          $set: { 
            status: 'suspended',
            suspendedAt: now,
            suspendedReason: `Auto-suspended: ${daysOverdue} days overdue, grace period expired`
          } 
        }
      );
      
      if (shop) {
        await shops.updateOne(
          { _id: shop._id },
          { 
            $set: { 
              status: 'suspended',
              subscriptionStatus: 'suspended'
            } 
          }
        );
      }
      
      suspended++;
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY:');
    console.log(`   🚫 Suspended: ${suspended}`);
    console.log(`   📅 Trials expired: ${trialExpired}`);
    console.log(`   ⏳ Within grace period: ${withinGrace}`);
    console.log(`   ⏭️  Already suspended: ${alreadySuspended}`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ Done!');
  }
}

suspendOverdueShops();
