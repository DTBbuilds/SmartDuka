const mongoose = require('mongoose');

async function migrateVerifiedToActive() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/smartduka');
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const shopsCollection = db.collection('shops');

    // Get verified shops
    const verifiedShops = await shopsCollection.find({ status: 'verified' }).toArray();
    console.log(`📊 Found ${verifiedShops.length} verified shops\n`);

    if (verifiedShops.length === 0) {
      console.log('ℹ️  No verified shops to migrate\n');
      await mongoose.disconnect();
      return;
    }

    // Show shops before migration
    console.log('📋 SHOPS BEFORE MIGRATION:');
    console.log('─'.repeat(60));
    verifiedShops.forEach((shop, index) => {
      console.log(`${index + 1}. ${shop.name} - Status: ${shop.status}`);
    });
    console.log('─'.repeat(60));

    // Update verified shops to active
    const result = await shopsCollection.updateMany(
      { status: 'verified' },
      { 
        $set: { 
          status: 'active',
          updatedAt: new Date()
        } 
      }
    );

    console.log(`\n✅ MIGRATION COMPLETE:`);
    console.log(`   Matched: ${result.matchedCount}`);
    console.log(`   Modified: ${result.modifiedCount}\n`);

    // Get updated shops
    const updatedShops = await shopsCollection.find({ status: 'active' }).toArray();
    console.log('📋 SHOPS AFTER MIGRATION:');
    console.log('─'.repeat(60));
    updatedShops.forEach((shop, index) => {
      console.log(`${index + 1}. ${shop.name} - Status: ${shop.status}`);
    });
    console.log('─'.repeat(60));

    // Get status counts
    const statusCounts = await shopsCollection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    console.log('\n📈 FINAL STATUS COUNTS:');
    console.log('─'.repeat(40));
    statusCounts.forEach(item => {
      console.log(`  ${item._id.padEnd(15)}: ${item.count}`);
    });
    console.log('─'.repeat(40));

    console.log('\n✅ Migration successful\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

migrateVerifiedToActive();
