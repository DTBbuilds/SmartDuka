/**
 * Seed Super Admin Script
 * 
 * Run from apps/api directory:
 * npx ts-node src/scripts/seed-super-admin.ts
 */

import * as mongoose from 'mongoose';
import * as bcryptjs from 'bcryptjs';

// MongoDB URI - update this or set MONGODB_URI env var
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://dontech1914_db_user:greatful%40dtb@smartduka.0vkcqh5.mongodb.net/smartduka?appName=smartduka';

// Super Admin credentials
const SUPER_ADMIN_EMAIL = 'smartduka@admin.auth';
const SUPER_ADMIN_PASSWORD = 'admin123';

// Super Admin Schema (inline for script)
const SuperAdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['super_admin'], default: 'super_admin' },
  status: { type: String, enum: ['active', 'disabled'], default: 'active' },
}, { timestamps: true });

async function seedSuperAdmin() {
  console.log('🌱 Seeding Super Admin...\n');
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get or create model
    const SuperAdmin = mongoose.models.SuperAdmin || mongoose.model('SuperAdmin', SuperAdminSchema);

    // Check if super admin already exists
    const existing = await SuperAdmin.findOne({ email: SUPER_ADMIN_EMAIL });
    
    if (existing) {
      console.log('ℹ️  Super Admin already exists:', SUPER_ADMIN_EMAIL);
      console.log('   Updating password...');
      
      // Update password
      const salt = await bcryptjs.genSalt(12);
      const passwordHash = await bcryptjs.hash(SUPER_ADMIN_PASSWORD, salt);
      
      await SuperAdmin.updateOne(
        { email: SUPER_ADMIN_EMAIL },
        { $set: { passwordHash, status: 'active' } }
      );
      
      console.log('✅ Password updated successfully!\n');
    } else {
      console.log('📝 Creating new Super Admin...');
      
      // Hash password
      const salt = await bcryptjs.genSalt(12);
      const passwordHash = await bcryptjs.hash(SUPER_ADMIN_PASSWORD, salt);

      // Create super admin
      await SuperAdmin.create({
        email: SUPER_ADMIN_EMAIL,
        passwordHash,
        role: 'super_admin',
        status: 'active',
      });

      console.log('✅ Super Admin created successfully!\n');
    }

    console.log('═══════════════════════════════════════════');
    console.log('  SUPER ADMIN CREDENTIALS');
    console.log('═══════════════════════════════════════════');
    console.log(`  Email:    ${SUPER_ADMIN_EMAIL}`);
    console.log(`  Password: ${SUPER_ADMIN_PASSWORD}`);
    console.log('═══════════════════════════════════════════');
    console.log('\n⚠️  Please change the password after first login!\n');

  } catch (error) {
    console.error('❌ Error seeding super admin:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

seedSuperAdmin();
