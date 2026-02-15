const mongoose = require('mongoose');

async function checkShopsStatus() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/smartduka');
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Get shops collection
    const shopsCollection = db.collection('shops');
    
    // Get total count
    const totalCount = await shopsCollection.countDocuments();
    console.log(`📊 TOTAL SHOPS: ${totalCount}\n`);

    // Get count by status
    const statusCounts = await shopsCollection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    console.log('📈 SHOPS BY STATUS:');
    console.log('─'.repeat(40));
    statusCounts.forEach(item => {
      console.log(`  ${item._id.padEnd(15)}: ${item.count}`);
    });
    console.log('─'.repeat(40));

    // Get flagged shops count
    const flaggedCount = await shopsCollection.countDocuments({ isFlagged: true });
    console.log(`\n🚩 FLAGGED SHOPS: ${flaggedCount}`);

    // Get all shops with details
    console.log('\n📋 ALL SHOPS DETAILS:');
    console.log('─'.repeat(80));
    const shops = await shopsCollection.find({}).toArray();
    
    shops.forEach((shop, index) => {
      console.log(`\n${index + 1}. ${shop.name}`);
      console.log(`   Email: ${shop.email}`);
      console.log(`   Phone: ${shop.phone}`);
      console.log(`   Status: ${shop.status}`);
      console.log(`   Flagged: ${shop.isFlagged ? 'Yes' : 'No'}`);
      console.log(`   Created: ${shop.createdAt}`);
      console.log(`   Updated: ${shop.updatedAt}`);
    });

    console.log('\n' + '─'.repeat(80));
    console.log('\n✅ Database check complete\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkShopsStatus();
