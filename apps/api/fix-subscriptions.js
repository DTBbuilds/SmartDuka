/**
 * Subscription Fix Script
 * 
 * Run this script from the apps/api directory to fix subscription issues.
 * Usage: node fix-subscriptions.js [--fix]
 * 
 * Options:
 *   --fix        Actually apply the fixes (default is dry-run)
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load .env file manually (no dotenv dependency)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--fix');

console.log(`\n${'='.repeat(60)}`);
console.log(`SUBSCRIPTION FIX SCRIPT - ${dryRun ? 'DRY RUN' : 'APPLYING FIXES'}`);
console.log(`${'='.repeat(60)}\n`);

if (dryRun) {
  console.log('Running in DRY RUN mode. No changes will be made.');
  console.log('Add --fix flag to actually apply fixes.\n');
}

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in environment variables');
  console.error('Make sure .env exists with MONGODB_URI or DATABASE_URL');
  process.exit(1);
}

// Define schemas inline for standalone script
const SubscriptionSchema = new mongoose.Schema({
  shopId: mongoose.Types.ObjectId,
  planId: mongoose.Types.ObjectId,
  planCode: String,
  billingCycle: String,
  status: String,
  startDate: Date,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  nextBillingDate: Date,
  lastPaymentDate: Date,
  numberOfDays: Number,
  autoRenew: Boolean,
  trialEndDate: Date,
  gracePeriodEndDate: Date,
}, { timestamps: true });

const ShopSchema = new mongoose.Schema({
  name: String,
});

async function main() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const Subscription = mongoose.model('Subscription', SubscriptionSchema);
    const Shop = mongoose.model('Shop', ShopSchema);

    const results = {
      dailySubscriptionIssues: [],
      expiredTrials: [],
      expiredActiveSubscriptions: [],
      fixed: 0,
    };

    const now = new Date();

    // ============================================
    // 1. Fix Daily Subscriptions with wrong end dates
    // ============================================
    console.log('Auditing DAILY subscriptions...');
    
    const dailySubscriptions = await Subscription.find({ billingCycle: 'daily' });
    console.log(`Found ${dailySubscriptions.length} daily subscriptions`);

    for (const sub of dailySubscriptions) {
      const lastPayment = sub.lastPaymentDate || sub.currentPeriodStart;
      const currentEnd = sub.currentPeriodEnd;
      const numberOfDays = sub.numberOfDays || 1;

      // Calculate expected end date
      const expectedEnd = new Date(lastPayment);
      expectedEnd.setDate(expectedEnd.getDate() + numberOfDays);

      // Calculate actual days between last payment and period end
      const actualDays = Math.ceil(
        (currentEnd.getTime() - lastPayment.getTime()) / (24 * 60 * 60 * 1000)
      );

      // If actual duration is more than expected (with 1 day tolerance), flag as issue
      if (actualDays > numberOfDays + 1) {
        const shop = await Shop.findById(sub.shopId);
        const issue = {
          shopId: sub.shopId.toString(),
          shopName: shop?.name || 'Unknown',
          planCode: sub.planCode,
          numberOfDays,
          actualDays,
          lastPaymentDate: lastPayment.toISOString(),
          currentPeriodEnd: currentEnd.toISOString(),
          expectedPeriodEnd: expectedEnd.toISOString(),
          status: sub.status,
        };
        results.dailySubscriptionIssues.push(issue);

        console.log(`\n  ISSUE: Shop "${issue.shopName}" (${issue.shopId})`);
        console.log(`    Plan: ${issue.planCode}, Days purchased: ${numberOfDays}`);
        console.log(`    Last payment: ${issue.lastPaymentDate}`);
        console.log(`    Current end: ${issue.currentPeriodEnd} (${actualDays} days)`);
        console.log(`    Should end: ${issue.expectedPeriodEnd} (${numberOfDays} days)`);

        if (!dryRun) {
          const newStatus = now > expectedEnd ? 'expired' : sub.status;
          
          await Subscription.updateOne(
            { _id: sub._id },
            {
              $set: {
                currentPeriodEnd: expectedEnd,
                nextBillingDate: expectedEnd,
                status: newStatus,
                numberOfDays: numberOfDays,
              },
            },
          );
          results.fixed++;
          console.log(`    FIXED: End date corrected, status: ${newStatus}`);
        }
      }
    }

    // ============================================
    // 2. Fix Expired Trials still marked as TRIAL
    // ============================================
    console.log('\nAuditing expired TRIAL subscriptions...');
    
    const expiredTrials = await Subscription.find({
      status: 'trial',
      $or: [
        { trialEndDate: { $lte: now } },
        { currentPeriodEnd: { $lte: now } },
      ],
    });
    console.log(`Found ${expiredTrials.length} expired trials`);

    for (const sub of expiredTrials) {
      const shop = await Shop.findById(sub.shopId);
      const issue = {
        shopId: sub.shopId.toString(),
        shopName: shop?.name || 'Unknown',
        trialEndDate: sub.trialEndDate?.toISOString(),
        currentPeriodEnd: sub.currentPeriodEnd?.toISOString(),
      };
      results.expiredTrials.push(issue);

      console.log(`\n  ISSUE: Shop "${issue.shopName}" (${issue.shopId})`);
      console.log(`    Trial ended: ${issue.trialEndDate || issue.currentPeriodEnd}`);

      if (!dryRun) {
        await Subscription.updateOne(
          { _id: sub._id },
          { $set: { status: 'expired' } },
        );
        results.fixed++;
        console.log(`    FIXED: Status changed to expired`);
      }
    }

    // ============================================
    // 3. Fix Active subscriptions with expired period
    // ============================================
    console.log('\nAuditing ACTIVE subscriptions with expired period...');
    
    const expiredActive = await Subscription.find({
      status: 'active',
      currentPeriodEnd: { $lte: now },
    });
    console.log(`Found ${expiredActive.length} expired active subscriptions`);

    for (const sub of expiredActive) {
      const shop = await Shop.findById(sub.shopId);
      const daysSinceExpiry = Math.ceil(
        (now.getTime() - sub.currentPeriodEnd.getTime()) / (24 * 60 * 60 * 1000)
      );

      const issue = {
        shopId: sub.shopId.toString(),
        shopName: shop?.name || 'Unknown',
        planCode: sub.planCode,
        billingCycle: sub.billingCycle,
        currentPeriodEnd: sub.currentPeriodEnd?.toISOString(),
        daysSinceExpiry,
        autoRenew: sub.autoRenew,
      };
      results.expiredActiveSubscriptions.push(issue);

      console.log(`\n  ISSUE: Shop "${issue.shopName}" (${issue.shopId})`);
      console.log(`    Plan: ${issue.planCode} (${issue.billingCycle})`);
      console.log(`    Expired: ${issue.currentPeriodEnd} (${daysSinceExpiry} days ago)`);

      if (!dryRun) {
        let newStatus;
        if (daysSinceExpiry > 7) {
          newStatus = sub.autoRenew ? 'suspended' : 'expired';
        } else {
          newStatus = 'past_due';
        }

        const gracePeriodEnd = new Date(sub.currentPeriodEnd);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

        await Subscription.updateOne(
          { _id: sub._id },
          {
            $set: {
              status: newStatus,
              gracePeriodEndDate: daysSinceExpiry <= 7 ? gracePeriodEnd : null,
            },
          },
        );
        results.fixed++;
        console.log(`    FIXED: Status changed to ${newStatus}`);
      }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('SUMMARY');
    console.log(`${'='.repeat(60)}`);
    const totalIssues = results.dailySubscriptionIssues.length + 
                        results.expiredTrials.length + 
                        results.expiredActiveSubscriptions.length;
    console.log(`Daily subscription issues: ${results.dailySubscriptionIssues.length}`);
    console.log(`Expired trials: ${results.expiredTrials.length}`);
    console.log(`Expired active subscriptions: ${results.expiredActiveSubscriptions.length}`);
    console.log(`Total issues found: ${totalIssues}`);
    
    if (dryRun) {
      console.log(`\nDRY RUN - No changes were made.`);
      console.log(`Run with --fix flag to apply fixes:\n`);
      console.log(`  node fix-subscriptions.js --fix\n`);
    } else {
      console.log(`\nFixed: ${results.fixed} issues`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

main();
