import * as mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';

/**
 * Setup Super Admin User Script
 * 
 * This script creates a super admin user in the database with the following credentials:
 * Email: smartduka@admin.auth
 * Password: duka-smart
 * 
 * Run with: npx ts-node scripts/setup-super-admin.ts
 */

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartduka';
const SUPER_ADMIN_EMAIL = 'smartduka@admin.auth';
const SUPER_ADMIN_PASSWORD = 'duka-smart';

interface SuperAdmin {
  email: string;
  passwordHash: string;
  role: 'super_admin';
  status: 'active';
  createdAt: Date;
  updatedAt: Date;
}

async function setupSuperAdmin() {
  try {
    console.log('🔐 Setting up Super Admin User...\n');

    // Connect to MongoDB
    console.log(`📡 Connecting to MongoDB: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection;

    // Create or get the super_admin collection
    const superAdminCollection = db.collection('super_admins');

    // Check if super admin already exists
    const existingAdmin = await superAdminCollection.findOne({
      email: SUPER_ADMIN_EMAIL,
    });

    if (existingAdmin) {
      console.log('⚠️  Super admin already exists!');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Status: ${existingAdmin.status}`);
      console.log(`   Created: ${existingAdmin.createdAt}\n`);

      // Ask if user wants to update
      console.log('Would you like to update the password? (Manual action required)\n');
      await mongoose.disconnect();
      return;
    }

    // Hash the password
    console.log('🔒 Hashing password...');
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, saltRounds);
    console.log('✅ Password hashed\n');

    // Create super admin document
    const superAdmin: SuperAdmin = {
      email: SUPER_ADMIN_EMAIL,
      passwordHash,
      role: 'super_admin',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert into database
    console.log('💾 Creating super admin user...');
    const result = await superAdminCollection.insertOne(superAdmin as any);
    console.log('✅ Super admin created successfully!\n');

    // Display credentials
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 SUPER ADMIN SETUP COMPLETE');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📧 Email:    smartduka@admin.auth');
    console.log('🔑 Password: duka-smart\n');
    console.log('🌐 Login URL: http://localhost:3000/login');
    console.log('📍 Access:   Click lock icon (bottom right corner)\n');
    console.log('═══════════════════════════════════════════════════════\n');

    // Display document info
    console.log('📋 Document Info:');
    console.log(`   ID: ${result.insertedId}`);
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Role: ${superAdmin.role}`);
    console.log(`   Status: ${superAdmin.status}`);
    console.log(`   Created: ${superAdmin.createdAt.toISOString()}\n`);

    console.log('✨ Setup complete! You can now login as super admin.\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');
  } catch (error) {
    console.error('❌ Error setting up super admin:', error);
    process.exit(1);
  }
}

// Run the setup
setupSuperAdmin();
