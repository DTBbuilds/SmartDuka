"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = __importStar(require("mongoose"));
const bcrypt = __importStar(require("bcryptjs"));
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartduka';
const SUPER_ADMIN_EMAIL = 'smartduka@admin.auth';
const SUPER_ADMIN_PASSWORD = 'duka-smart';
async function setupSuperAdmin() {
    try {
        console.log('🔐 Setting up Super Admin User...\n');
        console.log(`📡 Connecting to MongoDB: ${MONGODB_URI}`);
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        const db = mongoose.connection;
        const superAdminCollection = db.collection('super_admins');
        const existingAdmin = await superAdminCollection.findOne({
            email: SUPER_ADMIN_EMAIL,
        });
        if (existingAdmin) {
            console.log('⚠️  Super admin already exists!');
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Status: ${existingAdmin.status}`);
            console.log(`   Created: ${existingAdmin.createdAt}\n`);
            console.log('Would you like to update the password? (Manual action required)\n');
            await mongoose.disconnect();
            return;
        }
        console.log('🔒 Hashing password...');
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, saltRounds);
        console.log('✅ Password hashed\n');
        const superAdmin = {
            email: SUPER_ADMIN_EMAIL,
            passwordHash,
            role: 'super_admin',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        console.log('💾 Creating super admin user...');
        const result = await superAdminCollection.insertOne(superAdmin);
        console.log('✅ Super admin created successfully!\n');
        console.log('═══════════════════════════════════════════════════════');
        console.log('🎉 SUPER ADMIN SETUP COMPLETE');
        console.log('═══════════════════════════════════════════════════════\n');
        console.log('📧 Email:    smartduka@admin.auth');
        console.log('🔑 Password: duka-smart\n');
        console.log('🌐 Login URL: http://localhost:3000/login');
        console.log('📍 Access:   Click lock icon (bottom right corner)\n');
        console.log('═══════════════════════════════════════════════════════\n');
        console.log('📋 Document Info:');
        console.log(`   ID: ${result.insertedId}`);
        console.log(`   Email: ${superAdmin.email}`);
        console.log(`   Role: ${superAdmin.role}`);
        console.log(`   Status: ${superAdmin.status}`);
        console.log(`   Created: ${superAdmin.createdAt.toISOString()}\n`);
        console.log('✨ Setup complete! You can now login as super admin.\n');
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB\n');
    }
    catch (error) {
        console.error('❌ Error setting up super admin:', error);
        process.exit(1);
    }
}
setupSuperAdmin();
//# sourceMappingURL=setup-super-admin.js.map