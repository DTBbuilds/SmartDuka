const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartduka';

async function cleanupKraPin() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const shopsCollection = db.collection('shops');

    // Step 1: Drop old kraPin index if it exists
    console.log('\n📋 Checking existing indexes...');
    const indexes = await shopsCollection.listIndexes().toArray();
    const indexNames = indexes.map(idx => idx.name);
    console.log('Current indexes:', indexNames);

    if (indexNames.includes('kraPin_1')) {
      console.log('🗑️  Dropping old kraPin_1 index...');
      await shopsCollection.dropIndex('kraPin_1');
      console.log('✅ Dropped kraPin_1 index');
    }

    if (indexNames.includes('unique_kraPin_when_present')) {
      console.log('🗑️  Dropping old unique_kraPin_when_present index...');
      await shopsCollection.dropIndex('unique_kraPin_when_present');
      console.log('✅ Dropped unique_kraPin_when_present index');
    }

    // Step 2: Delete all shops with null/empty kraPin (they're test/incomplete registrations)
    console.log('\n🗑️  Removing incomplete shops with null/empty kraPin...');
    const deleteResult = await shopsCollection.deleteMany(
      { kraPin: { $in: ['', null] } }
    );
    console.log(`✅ Deleted ${deleteResult.deletedCount} incomplete shops with null/empty kraPin`);

    // Step 3: Create new partial unique index
    console.log('\n📝 Creating new partial unique index...');
    await shopsCollection.createIndex(
      { kraPin: 1 },
      {
        unique: true,
        sparse: true,
        name: 'unique_kraPin_when_present',
      }
    );
    console.log('✅ Created new partial unique index: unique_kraPin_when_present');

    // Step 4: Verify
    console.log('\n✨ Verifying indexes...');
    const newIndexesList = await shopsCollection.listIndexes().toArray();
    const newIndexNames = newIndexesList.map(idx => idx.name);
    console.log('Updated indexes:', newIndexNames);

    console.log('\n✅ KRA PIN cleanup complete!');
    console.log('You can now register shops with empty or duplicate KRA PINs without errors.');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupKraPin();
