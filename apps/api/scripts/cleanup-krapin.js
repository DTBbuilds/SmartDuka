/**
 * KRA PIN Cleanup Script
 * 
 * This script fixes the kraPin field in the shops collection:
 * 1. Drops any existing kraPin indexes
 * 2. Unsets (removes) empty string kraPin values from shops
 * 3. Creates a proper sparse unique index that ignores null/undefined
 * 
 * Run with: npm run cleanup:krapin
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartduka';

async function cleanupKraPin() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const shopsCollection = db.collection('shops');

    // Step 1: Show current state
    console.log('\n📊 Current state:');
    const totalShops = await shopsCollection.countDocuments();
    const shopsWithEmptyKraPin = await shopsCollection.countDocuments({ kraPin: '' });
    const shopsWithNullKraPin = await shopsCollection.countDocuments({ kraPin: null });
    const shopsWithValidKraPin = await shopsCollection.countDocuments({ 
      kraPin: { $exists: true, $nin: [null, ''] } 
    });
    const shopsWithoutKraPin = await shopsCollection.countDocuments({ kraPin: { $exists: false } });
    
    console.log(`  Total shops: ${totalShops}`);
    console.log(`  Shops with empty string kraPin: ${shopsWithEmptyKraPin}`);
    console.log(`  Shops with null kraPin: ${shopsWithNullKraPin}`);
    console.log(`  Shops with valid kraPin: ${shopsWithValidKraPin}`);
    console.log(`  Shops without kraPin field: ${shopsWithoutKraPin}`);

    // Step 2: Drop old kraPin indexes if they exist
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

    // Step 3: UNSET (not delete!) empty/null kraPin values
    // This removes the field entirely so the sparse index ignores these documents
    console.log('\n🔧 Fixing shops with empty/null kraPin (unsetting the field)...');
    const updateResult = await shopsCollection.updateMany(
      { kraPin: { $in: ['', null] } },
      { $unset: { kraPin: '' } }
    );
    console.log(`✅ Fixed ${updateResult.modifiedCount} shops - removed empty/null kraPin fields`);

    // Step 4: Create new sparse unique index
    console.log('\n📝 Creating new sparse unique index...');
    await shopsCollection.createIndex(
      { kraPin: 1 },
      {
        unique: true,
        sparse: true,
        name: 'unique_kraPin_when_present',
      }
    );
    console.log('✅ Created sparse unique index: unique_kraPin_when_present');

    // Step 5: Verify
    console.log('\n✨ Verifying...');
    const newIndexesList = await shopsCollection.listIndexes().toArray();
    const newIndexNames = newIndexesList.map(idx => idx.name);
    console.log('Updated indexes:', newIndexNames);

    // Final state
    console.log('\n📊 Final state:');
    const finalShopsWithEmptyKraPin = await shopsCollection.countDocuments({ kraPin: '' });
    const finalShopsWithNullKraPin = await shopsCollection.countDocuments({ kraPin: null });
    const finalShopsWithValidKraPin = await shopsCollection.countDocuments({ 
      kraPin: { $exists: true, $nin: [null, ''] } 
    });
    const finalShopsWithoutKraPin = await shopsCollection.countDocuments({ kraPin: { $exists: false } });
    
    console.log(`  Shops with empty string kraPin: ${finalShopsWithEmptyKraPin}`);
    console.log(`  Shops with null kraPin: ${finalShopsWithNullKraPin}`);
    console.log(`  Shops with valid kraPin: ${finalShopsWithValidKraPin}`);
    console.log(`  Shops without kraPin field: ${finalShopsWithoutKraPin}`);

    console.log('\n✅ KRA PIN cleanup complete!');
    console.log('Shops without KRA PIN can now register without "already registered" errors.');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupKraPin();
