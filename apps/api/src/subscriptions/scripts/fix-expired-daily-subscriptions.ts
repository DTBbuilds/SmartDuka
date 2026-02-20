/**
 * One-time script to fix expired daily subscriptions
 * 
 * This script will:
 * 1. Find all daily subscriptions where currentPeriodEnd has passed but status is still ACTIVE
 * 2. Update their status to EXPIRED
 * 3. Send notification emails to shop admins
 * 
 * Run with: npx ts-node -r tsconfig-paths/register src/subscriptions/scripts/fix-expired-daily-subscriptions.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Model, Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Subscription, SubscriptionDocument, SubscriptionStatus, BillingCycle } from '../schemas/subscription.schema';
import { SubscriptionPlan, SubscriptionPlanDocument } from '../schemas/subscription-plan.schema';
import { Shop, ShopDocument } from '../../shops/schemas/shop.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { EmailService } from '../../notifications/email.service';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://smartduka.co.ke';

interface ProcessResult {
  shopId: string;
  shopName: string;
  previousStatus: string;
  newStatus: string;
  periodEnd: Date;
  hoursOverdue: number;
  emailSent: boolean;
  error?: string;
}

async function fixExpiredDailySubscriptions() {
  console.log('🚀 Starting expired daily subscriptions fix...\n');

  // Bootstrap NestJS application
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Get models and services
  const subscriptionModel = app.get<Model<SubscriptionDocument>>(getModelToken(Subscription.name));
  const planModel = app.get<Model<SubscriptionPlanDocument>>(getModelToken(SubscriptionPlan.name));
  const shopModel = app.get<Model<ShopDocument>>(getModelToken(Shop.name));
  const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
  
  let emailService: EmailService | null = null;
  try {
    emailService = app.get(EmailService);
  } catch {
    console.log('⚠️ Email service not available, skipping email notifications');
  }

  const results: ProcessResult[] = [];
  const now = new Date();

  try {
    // ============================================
    // Find expired daily subscriptions
    // (billingCycle = 'daily', currentPeriodEnd passed, status is ACTIVE)
    // ============================================
    console.log('📋 Finding expired daily subscriptions...');
    
    const expiredDailySubs = await subscriptionModel.find({
      billingCycle: BillingCycle.DAILY,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: { $lt: now },
    });

    console.log(`   Found ${expiredDailySubs.length} expired daily subscriptions\n`);

    for (const subscription of expiredDailySubs) {
      const shop = await shopModel.findById(subscription.shopId);
      const admin = await userModel.findOne({ shopId: subscription.shopId, role: 'admin' });
      const plan = await planModel.findById(subscription.planId);

      const hoursOverdue = Math.floor(
        (now.getTime() - subscription.currentPeriodEnd.getTime()) / (60 * 60 * 1000)
      );

      const result: ProcessResult = {
        shopId: subscription.shopId.toString(),
        shopName: shop?.name || 'Unknown',
        previousStatus: subscription.status,
        newStatus: SubscriptionStatus.EXPIRED,
        periodEnd: subscription.currentPeriodEnd,
        hoursOverdue,
        emailSent: false,
      };

      try {
        // Update subscription status to EXPIRED
        subscription.status = SubscriptionStatus.EXPIRED;
        await subscription.save();

        console.log(`   ✓ ${shop?.name || subscription.shopId}: ACTIVE → EXPIRED (${hoursOverdue}h overdue)`);

        // Send expiration email
        if (admin?.email && emailService) {
          try {
            await emailService.sendEmail({
              to: admin.email,
              subject: `[Action Required] Your SmartDuka Daily Subscription Has Expired`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #e74c3c;">Your Daily Subscription Has Expired</h2>
                  <p>Hi ${admin.name || admin.email.split('@')[0]},</p>
                  <p>Your daily subscription for <strong>${shop?.name || 'your shop'}</strong> has expired.</p>
                  <p>Your subscription ended: <strong>${subscription.currentPeriodEnd.toLocaleString()}</strong></p>
                  <p>To continue using SmartDuka POS, please renew your subscription.</p>
                  <div style="margin: 30px 0;">
                    <a href="${FRONTEND_URL}/settings?tab=subscription" 
                       style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                      Renew Subscription
                    </a>
                  </div>
                  <p style="color: #666; font-size: 14px;">
                    Need help? Contact our support team at smartdukainfo@gmail.com
                  </p>
                </div>
              `,
              templateName: 'daily_subscription_expired',
              category: 'subscription',
            });
            result.emailSent = true;
            console.log(`   📧 Email sent to ${admin.email}`);
          } catch (emailErr) {
            console.log(`   ⚠️ Failed to send email to ${admin.email}`);
          }
        }
      } catch (error: any) {
        result.error = error.message;
        console.log(`   ✗ ${shop?.name || subscription.shopId}: ${error.message}`);
      }

      results.push(result);
    }

    // ============================================
    // Also check for daily subscriptions with incorrect period dates
    // (period is longer than expected for daily billing)
    // ============================================
    console.log('\n📋 Checking for daily subscriptions with incorrect period dates...');
    
    const allDailySubs = await subscriptionModel.find({
      billingCycle: BillingCycle.DAILY,
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
    });

    let incorrectPeriodCount = 0;
    for (const subscription of allDailySubs) {
      const periodStart = subscription.currentPeriodStart;
      const periodEnd = subscription.currentPeriodEnd;
      const periodDays = Math.ceil(
        (periodEnd.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000)
      );
      
      const expectedDays = subscription.numberOfDays || 1;
      
      // If period is significantly longer than expected (more than expected + 1 day tolerance)
      if (periodDays > expectedDays + 1) {
        incorrectPeriodCount++;
        const shop = await shopModel.findById(subscription.shopId);
        console.log(`   ⚠️ ${shop?.name || subscription.shopId}: Period is ${periodDays} days but should be ${expectedDays} day(s)`);
        console.log(`      Period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);
        
        // Fix the period end date
        const correctedPeriodEnd = new Date(periodStart);
        correctedPeriodEnd.setDate(correctedPeriodEnd.getDate() + expectedDays);
        
        // Only update if corrected date is in the past (subscription should be expired)
        if (correctedPeriodEnd < now) {
          subscription.currentPeriodEnd = correctedPeriodEnd;
          subscription.status = SubscriptionStatus.EXPIRED;
          await subscription.save();
          console.log(`      ✓ Fixed: Period end corrected to ${correctedPeriodEnd.toISOString()}, status set to EXPIRED`);
        } else {
          subscription.currentPeriodEnd = correctedPeriodEnd;
          await subscription.save();
          console.log(`      ✓ Fixed: Period end corrected to ${correctedPeriodEnd.toISOString()}`);
        }
      }
    }

    if (incorrectPeriodCount === 0) {
      console.log('   ✓ All daily subscription periods are correct');
    }

  } catch (error) {
    console.error('❌ Error processing subscriptions:', error);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 PROCESSING SUMMARY');
  console.log('='.repeat(60));
  
  const statusChanged = results.filter(r => r.previousStatus !== r.newStatus);
  const emailsSent = results.filter(r => r.emailSent);
  const errors = results.filter(r => r.error);

  console.log(`\n✅ Total processed: ${results.length}`);
  console.log(`📝 Status changes: ${statusChanged.length}`);
  console.log(`📧 Emails sent: ${emailsSent.length}`);
  console.log(`❌ Errors: ${errors.length}`);

  if (statusChanged.length > 0) {
    console.log('\n📝 Expired Subscriptions:');
    statusChanged.forEach(r => {
      console.log(`   - ${r.shopName}: ${r.previousStatus} → ${r.newStatus} (${r.hoursOverdue}h overdue)`);
    });
  }

  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(r => {
      console.log(`   - ${r.shopName}: ${r.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Processing complete!');
  console.log('='.repeat(60) + '\n');

  await app.close();
  process.exit(0);
}

// Run the script
fixExpiredDailySubscriptions().catch(console.error);
