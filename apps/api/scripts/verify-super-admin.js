/**
 * Verify Super Admin User Script
 * 
 * This script checks if the super admin user exists in the database
 * and verifies the password hash.
 * 
 * Run with: node scripts/verify-super-admin.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartduka';
const SUPER_ADMIN_EMAIL = 'smartduka@admin.auth';
const SUPER_ADMIN_PASSWORD = 'duka-smart';

async function verifySuperAdmin() {
  try {
    console.log('🔍 Verifying Super Admin User...\n');

    // Connect to MongoDB
    console.log(`📡 Connecting to MongoDB: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection;

    // Get the super_admin collection
    const superAdminCollection = db.collection('super_admins');

    // Find super admin
    console.log(`🔎 Looking for super admin: ${SUPER_ADMIN_EMAIL}`);
    const superAdmin = await superAdminCollection.findOne({
      email: SUPER_ADMIN_EMAIL,
    });

    if (!superAdmin) {
      console.log('❌ Super admin not found!\n');
      console.log('ℹ️  Run: pnpm setup:super-admin\n');
      await mongoose.disconnect();
      return;
    }

    console.log('✅ Super admin found!\n');

    // Display document info
    console.log('📋 Document Info:');
    console.log(`   ID: ${superAdmin._id}`);
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Role: ${superAdmin.role}`);
    console.log(`   Status: ${superAdmin.status}`);
    console.log(`   Password Hash: ${superAdmin.passwordHash.substring(0, 20)}...`);
    console.log(`   Created: ${superAdmin.createdAt}\n`);

    // Verify password
    console.log('🔐 Verifying password...');
    const isValid = await bcrypt.compare(SUPER_ADMIN_PASSWORD, superAdmin.passwordHash);

    if (isValid) {
      console.log('✅ Password is correct!\n');
    } else {
      console.log('❌ Password is incorrect!\n');
      console.log('ℹ️  To reset password:');
      console.log('   1. Delete the super admin: db.super_admins.deleteOne({ email: "smartduka@admin.auth" })');
      console.log('   2. Run setup again: pnpm setup:super-admin\n');
    }

    // Display credentials
    console.log('═══════════════════════════════════════════════════════');
    console.log('📧 Email:    smartduka@admin.auth');
    console.log('🔑 Password: duka-smart');
    console.log('═══════════════════════════════════════════════════════\n');

    // Test login
    if (isValid && superAdmin.status === 'active') {
      console.log('✨ Super admin is ready to login!\n');
      console.log('🌐 Login URL: http://localhost:3000/login');
      console.log('📍 Access:   Click lock icon (bottom right corner)\n');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');
  } catch (error) {
    console.error('❌ Error verifying super admin:', error.message);
    process.exit(1);
  }
}

// Run the verification
verifySuperAdmin();
