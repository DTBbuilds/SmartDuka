/**
 * One-time script to process all expired subscriptions
 * 
 * This script will:
 * 1. Find all subscriptions that should be expired/suspended
 * 2. Update their status appropriately
 * 3. Send notification emails to shop admins
 * 
 * Run with: npx ts-node -r tsconfig-paths/register src/subscriptions/scripts/process-expired-subscriptions.ts
 * Or via NestJS CLI: npx nestjs-cli run src/subscriptions/scripts/process-expired-subscriptions.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Model, Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Subscription, SubscriptionDocument, SubscriptionStatus } from '../schemas/subscription.schema';
import { SubscriptionPlan, SubscriptionPlanDocument } from '../schemas/subscription-plan.schema';
import { Shop, ShopDocument } from '../../shops/schemas/shop.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { EmailService } from '../../notifications/email.service';
import { EMAIL_TEMPLATES } from '../../notifications/email-templates';

const GRACE_PERIOD_DAYS = 7;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://smartduka.co.ke';

interface ProcessResult {
  shopId: string;
  shopName: string;
  previousStatus: string;
  newStatus: string;
  action: string;
  emailSent: boolean;
  error?: string;
}

async function processExpiredSubscriptions() {
  console.log('🚀 Starting expired subscriptions processing...\n');

  // Bootstrap NestJS application
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Get models and services
  const subscriptionModel = app.get<Model<SubscriptionDocument>>(getModelToken(Subscription.name));
  const planModel = app.get<Model<SubscriptionPlanDocument>>(getModelToken(SubscriptionPlan.name));
  const shopModel = app.get<Model<ShopDocument>>(getModelToken(Shop.name));
  const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
  const emailService = app.get(EmailService);

  const results: ProcessResult[] = [];
  const now = new Date();

  try {
    // ============================================
    // 1. Find subscriptions that should be EXPIRED
    // (currentPeriodEnd passed, autoRenew = false, status is ACTIVE/TRIAL)
    // ============================================
    console.log('📋 Finding subscriptions to expire...');
    
    const toExpire = await subscriptionModel.find({
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
      currentPeriodEnd: { $lt: now },
      autoRenew: false,
    });

    console.log(`   Found ${toExpire.length} subscriptions to expire\n`);

    for (const subscription of toExpire) {
      const result = await processSubscription(
        subscription,
        SubscriptionStatus.EXPIRED,
        'expired',
        shopModel,
        userModel,
        planModel,
        emailService,
      );
      results.push(result);
    }

    // ============================================
    // 2. Find subscriptions that should be PAST_DUE
    // (currentPeriodEnd passed, autoRenew = true, status is ACTIVE/TRIAL)
    // ============================================
    console.log('📋 Finding subscriptions to set as PAST_DUE...');
    
    const toPastDue = await subscriptionModel.find({
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
      currentPeriodEnd: { $lt: now },
      autoRenew: true,
    });

    console.log(`   Found ${toPastDue.length} subscriptions to set as past due\n`);

    for (const subscription of toPastDue) {
      // Set grace period end date
      const gracePeriodEndDate = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
      subscription.gracePeriodEndDate = gracePeriodEndDate;
      
      const result = await processSubscription(
        subscription,
        SubscriptionStatus.PAST_DUE,
        'past_due',
        shopModel,
        userModel,
        planModel,
        emailService,
      );
      results.push(result);
    }

    // ============================================
    // 3. Find subscriptions that should be SUSPENDED
    // (PAST_DUE and grace period has ended)
    // ============================================
    console.log('📋 Finding subscriptions to suspend...');
    
    const toSuspend = await subscriptionModel.find({
      status: SubscriptionStatus.PAST_DUE,
      gracePeriodEndDate: { $lt: now },
    });

    console.log(`   Found ${toSuspend.length} subscriptions to suspend\n`);

    for (const subscription of toSuspend) {
      const result = await processSubscription(
        subscription,
        SubscriptionStatus.SUSPENDED,
        'suspended',
        shopModel,
        userModel,
        planModel,
        emailService,
      );
      results.push(result);
    }

    // ============================================
    // 4. Send reminders for existing PAST_DUE subscriptions
    // ============================================
    console.log('📋 Sending reminders for existing PAST_DUE subscriptions...');
    
    const pastDueSubscriptions = await subscriptionModel.find({
      status: SubscriptionStatus.PAST_DUE,
      gracePeriodEndDate: { $gt: now },
    });

    console.log(`   Found ${pastDueSubscriptions.length} past due subscriptions to remind\n`);

    for (const subscription of pastDueSubscriptions) {
      const result = await sendReminderEmail(
        subscription,
        shopModel,
        userModel,
        planModel,
        emailService,
      );
      results.push(result);
    }

    // ============================================
    // 5. Send reminders for SUSPENDED subscriptions
    // ============================================
    console.log('📋 Sending reminders for SUSPENDED subscriptions...');
    
    const suspendedSubscriptions = await subscriptionModel.find({
      status: SubscriptionStatus.SUSPENDED,
    });

    console.log(`   Found ${suspendedSubscriptions.length} suspended subscriptions to remind\n`);

    for (const subscription of suspendedSubscriptions) {
      const result = await sendSuspensionReminder(
        subscription,
        shopModel,
        userModel,
        planModel,
        emailService,
      );
      results.push(result);
    }

    // ============================================
    // 6. Send reminders for EXPIRED subscriptions
    // ============================================
    console.log('📋 Sending reminders for EXPIRED subscriptions...');
    
    const expiredSubscriptions = await subscriptionModel.find({
      status: SubscriptionStatus.EXPIRED,
    });

    console.log(`   Found ${expiredSubscriptions.length} expired subscriptions to remind\n`);

    for (const subscription of expiredSubscriptions) {
      const result = await sendExpirationReminder(
        subscription,
        shopModel,
        userModel,
        planModel,
        emailService,
      );
      results.push(result);
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
    console.log('\n📝 Status Changes:');
    statusChanged.forEach(r => {
      console.log(`   - ${r.shopName}: ${r.previousStatus} → ${r.newStatus}`);
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

async function processSubscription(
  subscription: SubscriptionDocument,
  newStatus: SubscriptionStatus,
  action: string,
  shopModel: Model<ShopDocument>,
  userModel: Model<UserDocument>,
  planModel: Model<SubscriptionPlanDocument>,
  emailService: EmailService,
): Promise<ProcessResult> {
  const shop = await shopModel.findById(subscription.shopId);
  const admin = await userModel.findOne({ shopId: subscription.shopId, role: 'admin' });
  const plan = await planModel.findById(subscription.planId);

  const result: ProcessResult = {
    shopId: subscription.shopId.toString(),
    shopName: shop?.name || 'Unknown',
    previousStatus: subscription.status,
    newStatus,
    action,
    emailSent: false,
  };

  try {
    // Update subscription status
    const previousStatus = subscription.status;
    subscription.status = newStatus;
    await subscription.save();

    console.log(`   ✓ ${shop?.name || subscription.shopId}: ${previousStatus} → ${newStatus}`);

    // Send appropriate email
    if (admin?.email) {
      let emailSent = false;

      if (newStatus === SubscriptionStatus.EXPIRED) {
        emailSent = await sendExpirationEmail(shop, admin, plan, subscription, emailService);
      } else if (newStatus === SubscriptionStatus.PAST_DUE) {
        emailSent = await sendPastDueEmail(shop, admin, plan, subscription, emailService);
      } else if (newStatus === SubscriptionStatus.SUSPENDED) {
        emailSent = await sendSuspensionEmail(shop, admin, plan, subscription, emailService);
      }

      result.emailSent = emailSent;
    }
  } catch (error: any) {
    result.error = error.message;
    console.log(`   ✗ ${shop?.name || subscription.shopId}: ${error.message}`);
  }

  return result;
}

async function sendExpirationEmail(
  shop: ShopDocument | null,
  admin: UserDocument,
  plan: SubscriptionPlanDocument | null,
  subscription: SubscriptionDocument,
  emailService: EmailService,
): Promise<boolean> {
  const template = EMAIL_TEMPLATES.subscription_expired;
  if (!template || !shop) return false;

  const vars = {
    shopName: shop.name,
    userName: admin.name || admin.email,
    planName: plan?.name || subscription.planCode,
    renewUrl: `${FRONTEND_URL}/admin/subscription`,
    gracePeriodDays: '30',
  };

  try {
    const result = await emailService.sendEmail({
      to: admin.email,
      subject: template.subject.replace('{{shopName}}', shop.name),
      html: template.getHtml(vars),
    });
    return result.success;
  } catch {
    return false;
  }
}

async function sendPastDueEmail(
  shop: ShopDocument | null,
  admin: UserDocument,
  plan: SubscriptionPlanDocument | null,
  subscription: SubscriptionDocument,
  emailService: EmailService,
): Promise<boolean> {
  const template = EMAIL_TEMPLATES.subscription_past_due_day1;
  if (!template || !shop) return false;

  const now = new Date();
  const daysUntilSuspension = subscription.gracePeriodEndDate
    ? Math.ceil((subscription.gracePeriodEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    : GRACE_PERIOD_DAYS;

  const vars = {
    shopName: shop.name,
    userName: admin.name || admin.email,
    planName: plan?.name || subscription.planCode,
    amount: subscription.currentPrice.toLocaleString(),
    daysUntilSuspension: daysUntilSuspension.toString(),
    payUrl: `${FRONTEND_URL}/admin/subscription`,
  };

  try {
    const result = await emailService.sendEmail({
      to: admin.email,
      subject: template.subject.replace('{{shopName}}', shop.name),
      html: template.getHtml(vars),
    });
    return result.success;
  } catch {
    return false;
  }
}

async function sendSuspensionEmail(
  shop: ShopDocument | null,
  admin: UserDocument,
  plan: SubscriptionPlanDocument | null,
  subscription: SubscriptionDocument,
  emailService: EmailService,
): Promise<boolean> {
  const template = EMAIL_TEMPLATES.subscription_suspended_notice;
  if (!template || !shop) return false;

  const vars = {
    shopName: shop.name,
    userName: admin.name || admin.email,
    planName: plan?.name || subscription.planCode,
    amount: subscription.currentPrice.toLocaleString(),
    payUrl: `${FRONTEND_URL}/admin/subscription`,
    dataRetentionDays: '30',
  };

  try {
    const result = await emailService.sendEmail({
      to: admin.email,
      subject: template.subject.replace('{{shopName}}', shop.name),
      html: template.getHtml(vars),
    });
    return result.success;
  } catch {
    return false;
  }
}

async function sendReminderEmail(
  subscription: SubscriptionDocument,
  shopModel: Model<ShopDocument>,
  userModel: Model<UserDocument>,
  planModel: Model<SubscriptionPlanDocument>,
  emailService: EmailService,
): Promise<ProcessResult> {
  const shop = await shopModel.findById(subscription.shopId);
  const admin = await userModel.findOne({ shopId: subscription.shopId, role: 'admin' });
  const plan = await planModel.findById(subscription.planId);

  const result: ProcessResult = {
    shopId: subscription.shopId.toString(),
    shopName: shop?.name || 'Unknown',
    previousStatus: subscription.status,
    newStatus: subscription.status,
    action: 'reminder_past_due',
    emailSent: false,
  };

  if (!admin?.email || !shop) return result;

  const emailSent = await sendPastDueEmail(shop, admin, plan, subscription, emailService);
  result.emailSent = emailSent;
  
  if (emailSent) {
    console.log(`   📧 Reminder sent to ${shop.name} (${admin.email})`);
  }

  return result;
}

async function sendSuspensionReminder(
  subscription: SubscriptionDocument,
  shopModel: Model<ShopDocument>,
  userModel: Model<UserDocument>,
  planModel: Model<SubscriptionPlanDocument>,
  emailService: EmailService,
): Promise<ProcessResult> {
  const shop = await shopModel.findById(subscription.shopId);
  const admin = await userModel.findOne({ shopId: subscription.shopId, role: 'admin' });
  const plan = await planModel.findById(subscription.planId);

  const result: ProcessResult = {
    shopId: subscription.shopId.toString(),
    shopName: shop?.name || 'Unknown',
    previousStatus: subscription.status,
    newStatus: subscription.status,
    action: 'reminder_suspended',
    emailSent: false,
  };

  if (!admin?.email || !shop) return result;

  const emailSent = await sendSuspensionEmail(shop, admin, plan, subscription, emailService);
  result.emailSent = emailSent;
  
  if (emailSent) {
    console.log(`   📧 Suspension reminder sent to ${shop.name} (${admin.email})`);
  }

  return result;
}

async function sendExpirationReminder(
  subscription: SubscriptionDocument,
  shopModel: Model<ShopDocument>,
  userModel: Model<UserDocument>,
  planModel: Model<SubscriptionPlanDocument>,
  emailService: EmailService,
): Promise<ProcessResult> {
  const shop = await shopModel.findById(subscription.shopId);
  const admin = await userModel.findOne({ shopId: subscription.shopId, role: 'admin' });
  const plan = await planModel.findById(subscription.planId);

  const result: ProcessResult = {
    shopId: subscription.shopId.toString(),
    shopName: shop?.name || 'Unknown',
    previousStatus: subscription.status,
    newStatus: subscription.status,
    action: 'reminder_expired',
    emailSent: false,
  };

  if (!admin?.email || !shop) return result;

  const emailSent = await sendExpirationEmail(shop, admin, plan, subscription, emailService);
  result.emailSent = emailSent;
  
  if (emailSent) {
    console.log(`   📧 Expiration reminder sent to ${shop.name} (${admin.email})`);
  }

  return result;
}

// Run the script
processExpiredSubscriptions().catch(console.error);
