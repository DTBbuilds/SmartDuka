/**
 * Migration Script: Move existing mpesaConfig from Shop schema to PaymentConfig schema
 * 
 * This script:
 * 1. Finds all shops with mpesaConfig
 * 2. Creates PaymentConfig documents for each
 * 3. Preserves all encrypted credentials
 * 4. Marks old configs as migrated
 * 
 * Run with: npx ts-node -r tsconfig-paths/register src/payments/migrations/migrate-mpesa-config.ts
 */

import { NestFactory } from '@nestjs/core';
import { Model, Types } from 'mongoose';
import { AppModule } from '../../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Shop, ShopDocument } from '../../shops/schemas/shop.schema';
import {
  PaymentConfig,
  PaymentConfigDocument,
  PaymentProvider,
  ConfigEnvironment,
  ConfigStatus,
} from '../schemas/payment-config.schema';
import {
  ConfigAuditLog,
  ConfigAuditLogDocument,
  AuditAction,
} from '../schemas/config-audit-log.schema';

interface MigrationResult {
  shopId: string;
  shopName: string;
  success: boolean;
  configId?: string;
  error?: string;
}

async function migrate() {
  console.log('='.repeat(60));
  console.log('M-Pesa Config Migration Script');
  console.log('='.repeat(60));
  console.log('');

  // Bootstrap NestJS application
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const shopModel = app.get<Model<ShopDocument>>(getModelToken(Shop.name));
  const paymentConfigModel = app.get<Model<PaymentConfigDocument>>(getModelToken(PaymentConfig.name));
  const auditLogModel = app.get<Model<ConfigAuditLogDocument>>(getModelToken(ConfigAuditLog.name));

  const results: MigrationResult[] = [];
  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  try {
    // Find all shops with mpesaConfig
    const shopsWithConfig = await shopModel.find({
      'mpesaConfig.shortCode': { $exists: true, $nin: [null, ''] },
    }).exec();

    console.log(`Found ${shopsWithConfig.length} shops with M-Pesa configuration`);
    console.log('');

    for (const shop of shopsWithConfig) {
      const shopId = shop._id.toString();
      const mpesaConfig = shop.mpesaConfig;

      console.log(`Processing shop: ${shop.name} (${shopId})`);

      try {
        // Check if already migrated
        const existingConfig = await paymentConfigModel.findOne({
          shopId: shop._id,
          shortCode: mpesaConfig?.shortCode,
        }).exec();

        if (existingConfig) {
          console.log(`  ⏭️  Already migrated, skipping`);
          skippedCount++;
          results.push({
            shopId,
            shopName: shop.name,
            success: true,
            configId: existingConfig._id.toString(),
            error: 'Already migrated',
          });
          continue;
        }

        // Determine provider type
        const provider = mpesaConfig?.type === 'till'
          ? PaymentProvider.MPESA_TILL
          : PaymentProvider.MPESA_PAYBILL;

        // Determine environment from global setting
        const environment = process.env.MPESA_ENVIRONMENT === 'production'
          ? ConfigEnvironment.PRODUCTION
          : ConfigEnvironment.SANDBOX;

        // Determine status based on verification
        let status = ConfigStatus.DRAFT;
        if (mpesaConfig?.verificationStatus === 'verified') {
          status = ConfigStatus.VERIFIED;
        } else if (mpesaConfig?.verificationStatus === 'failed') {
          status = ConfigStatus.FAILED;
        } else if (mpesaConfig?.consumerKey) {
          status = ConfigStatus.PENDING;
        }

        // Create new PaymentConfig
        const newConfig = new paymentConfigModel({
          shopId: shop._id,
          provider,
          environment,
          name: `${shop.name} - ${mpesaConfig?.type === 'till' ? 'Till' : 'Paybill'}`,
          shortCode: mpesaConfig?.shortCode || '',
          accountPrefix: mpesaConfig?.accountPrefix,
          credentials: {
            // Copy encrypted credentials as-is
            consumerKey: mpesaConfig?.consumerKey,
            consumerKeyIv: mpesaConfig?.consumerKeyIv,
            consumerKeyTag: mpesaConfig?.consumerKeyTag,
            consumerSecret: mpesaConfig?.consumerSecret,
            consumerSecretIv: mpesaConfig?.consumerSecretIv,
            consumerSecretTag: mpesaConfig?.consumerSecretTag,
            passkey: mpesaConfig?.passkey,
            passkeyIv: mpesaConfig?.passkeyIv,
            passkeyTag: mpesaConfig?.passkeyTag,
          },
          callbackUrl: mpesaConfig?.callbackUrl,
          status,
          priority: 0,
          isActive: mpesaConfig?.enabled === true && status === ConfigStatus.VERIFIED,
          isDefault: true,
          verifiedAt: mpesaConfig?.verifiedAt,
          lastTestedAt: mpesaConfig?.lastTestedAt,
          lastTestResult: mpesaConfig?.lastTestResult,
          version: 1,
          metadata: {
            migratedFrom: 'shop.mpesaConfig',
            migratedAt: new Date().toISOString(),
            originalEnabled: mpesaConfig?.enabled,
            originalVerificationStatus: mpesaConfig?.verificationStatus,
          },
          createdBy: shop.verificationBy || new Types.ObjectId('000000000000000000000000'),
        });

        await newConfig.save();

        // Create audit log for migration
        const auditLog = new auditLogModel({
          configId: newConfig._id,
          shopId: shop._id,
          action: AuditAction.CREATE,
          description: `Migrated from shop.mpesaConfig to PaymentConfig schema`,
          newState: {
            provider,
            environment,
            shortCode: mpesaConfig?.shortCode,
            status,
            isActive: newConfig.isActive,
          },
          performedBy: new Types.ObjectId('000000000000000000000000'), // System
          reason: 'Automated migration from legacy schema',
        });

        await auditLog.save();

        // Mark shop's mpesaConfig as migrated (add flag)
        await shopModel.updateOne(
          { _id: shop._id },
          {
            $set: {
              'mpesaConfig.migratedToPaymentConfig': true,
              'mpesaConfig.migratedAt': new Date(),
              'mpesaConfig.paymentConfigId': newConfig._id,
            },
          }
        ).exec();

        console.log(`  ✅ Migrated successfully (configId: ${newConfig._id})`);
        migratedCount++;
        results.push({
          shopId,
          shopName: shop.name,
          success: true,
          configId: newConfig._id.toString(),
        });

      } catch (error: any) {
        console.log(`  ❌ Error: ${error.message}`);
        errorCount++;
        results.push({
          shopId,
          shopName: shop.name,
          success: false,
          error: error.message,
        });
      }
    }

    // Summary
    console.log('');
    console.log('='.repeat(60));
    console.log('Migration Summary');
    console.log('='.repeat(60));
    console.log(`Total shops processed: ${shopsWithConfig.length}`);
    console.log(`Successfully migrated: ${migratedCount}`);
    console.log(`Already migrated (skipped): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('');

    if (errorCount > 0) {
      console.log('Failed migrations:');
      results
        .filter(r => !r.success && r.error !== 'Already migrated')
        .forEach(r => {
          console.log(`  - ${r.shopName} (${r.shopId}): ${r.error}`);
        });
    }

  } catch (error: any) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }

  console.log('');
  console.log('Migration complete!');
  process.exit(0);
}

// Run migration
migrate().catch(console.error);
