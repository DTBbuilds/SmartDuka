/**
 * Payment Audit and Reconciliation Script
 * 
 * This script:
 * 1. Finds all subscription invoices with payments (paid, pending_verification)
 * 2. Checks if corresponding PaymentAttempt records exist
 * 3. Creates missing PaymentAttempt records for historical Send Money payments
 * 4. Reports mismatches and fixes them
 * 
 * Run with: npx ts-node -r tsconfig-paths/register src/scripts/audit-payments.ts
 */

import { NestFactory } from '@nestjs/core';
import { Model, Types } from 'mongoose';
import { AppModule } from '../app.module';

interface AuditResult {
  totalInvoices: number;
  paidInvoices: number;
  pendingVerificationInvoices: number;
  manualPaymentInvoices: number;
  stkPaymentInvoices: number;
  paymentAttemptsTotal: number;
  missingPaymentAttempts: number;
  created: number;
  errors: string[];
}

async function auditPayments() {
  console.log('='.repeat(60));
  console.log('SMARTDUKA PAYMENT AUDIT & RECONCILIATION SCRIPT');
  console.log('='.repeat(60));
  console.log('Started at:', new Date().toISOString());
  console.log('');

  const app = await NestFactory.createApplicationContext(AppModule);
  
  // Get models
  const invoiceModel = app.get('SubscriptionInvoiceModel') as Model<any>;
  const paymentAttemptModel = app.get('PaymentAttemptModel') as Model<any>;
  const shopModel = app.get('ShopModel') as Model<any>;
  const userModel = app.get('UserModel') as Model<any>;
  const subscriptionModel = app.get('SubscriptionModel') as Model<any>;

  const result: AuditResult = {
    totalInvoices: 0,
    paidInvoices: 0,
    pendingVerificationInvoices: 0,
    manualPaymentInvoices: 0,
    stkPaymentInvoices: 0,
    paymentAttemptsTotal: 0,
    missingPaymentAttempts: 0,
    created: 0,
    errors: [],
  };

  try {
    // =====================================================
    // STEP 1: Get all subscription invoices
    // =====================================================
    console.log('STEP 1: Analyzing subscription invoices...');
    
    const allInvoices = await invoiceModel.find({}).lean();
    result.totalInvoices = allInvoices.length;
    console.log(`  Total invoices found: ${allInvoices.length}`);

    // Categorize invoices
    const paidInvoices = allInvoices.filter(inv => inv.status === 'paid');
    const pendingVerificationInvoices = allInvoices.filter(inv => inv.status === 'pending_verification');
    const manualPaymentInvoices = allInvoices.filter(inv => 
      inv.manualPayment?.receiptNumber || inv.paymentMethod === 'mpesa_manual'
    );
    const stkPaymentInvoices = allInvoices.filter(inv => 
      inv.stkPayment?.receiptNumber || inv.paymentAttempt?.checkoutRequestId
    );

    result.paidInvoices = paidInvoices.length;
    result.pendingVerificationInvoices = pendingVerificationInvoices.length;
    result.manualPaymentInvoices = manualPaymentInvoices.length;
    result.stkPaymentInvoices = stkPaymentInvoices.length;

    console.log(`  - Paid invoices: ${paidInvoices.length}`);
    console.log(`  - Pending verification: ${pendingVerificationInvoices.length}`);
    console.log(`  - Manual/Send Money payments: ${manualPaymentInvoices.length}`);
    console.log(`  - STK Push payments: ${stkPaymentInvoices.length}`);
    console.log('');

    // =====================================================
    // STEP 2: Get all payment attempts
    // =====================================================
    console.log('STEP 2: Analyzing payment attempts...');
    
    const allAttempts = await paymentAttemptModel.find({}).lean();
    result.paymentAttemptsTotal = allAttempts.length;
    console.log(`  Total payment attempts: ${allAttempts.length}`);

    // Create a map of invoiceId -> PaymentAttempt
    const attemptsByInvoice = new Map<string, any>();
    for (const attempt of allAttempts) {
      if (attempt.invoiceId) {
        attemptsByInvoice.set(attempt.invoiceId, attempt);
      }
    }
    console.log(`  Attempts with invoiceId: ${attemptsByInvoice.size}`);
    console.log('');

    // =====================================================
    // STEP 3: Find invoices missing PaymentAttempt records
    // =====================================================
    console.log('STEP 3: Finding invoices missing PaymentAttempt records...');
    
    // Focus on paid and pending_verification invoices with manual payments
    const invoicesNeedingAttempts = allInvoices.filter((inv: any) => {
      const hasManualPayment = inv.manualPayment?.receiptNumber || inv.paymentMethod === 'mpesa_manual';
      const isPaidOrPending = inv.status === 'paid' || inv.status === 'pending_verification';
      const hasMpesaReceipt = inv.mpesaReceiptNumber;
      const hasAttempt = attemptsByInvoice.has(String(inv._id));
      
      return (hasManualPayment || hasMpesaReceipt) && isPaidOrPending && !hasAttempt;
    });

    result.missingPaymentAttempts = invoicesNeedingAttempts.length;
    console.log(`  Invoices missing PaymentAttempt: ${invoicesNeedingAttempts.length}`);
    console.log('');

    if (invoicesNeedingAttempts.length > 0) {
      console.log('  Missing PaymentAttempt records for:');
      for (const inv of invoicesNeedingAttempts) {
        console.log(`    - Invoice: ${inv.invoiceNumber}`);
        console.log(`      Shop ID: ${inv.shopId}`);
        console.log(`      Status: ${inv.status}`);
        console.log(`      Amount: KES ${inv.totalAmount}`);
        console.log(`      Receipt: ${inv.mpesaReceiptNumber || inv.manualPayment?.receiptNumber || 'N/A'}`);
        console.log(`      Created: ${inv.createdAt}`);
        console.log('');
      }
    }

    // =====================================================
    // STEP 4: Show pending verification invoices details
    // =====================================================
    if (pendingVerificationInvoices.length > 0) {
      console.log('STEP 4: Pending Verification Invoices (awaiting super admin action):');
      for (const inv of pendingVerificationInvoices) {
        const shop = await shopModel.findById(inv.shopId).lean() as any;
        const user = await userModel.findOne({ shopId: inv.shopId, role: 'admin' }).lean() as any;
        
        console.log(`  Invoice: ${inv.invoiceNumber}`);
        console.log(`    Shop: ${shop?.name || 'Unknown'}`);
        console.log(`    Email: ${(user as any)?.email || 'Unknown'}`);
        console.log(`    Amount: KES ${inv.totalAmount}`);
        console.log(`    Receipt: ${inv.mpesaReceiptNumber || inv.manualPayment?.receiptNumber || 'N/A'}`);
        console.log(`    Submitted: ${inv.manualPayment?.submittedAt || inv.createdAt}`);
        console.log('');
      }
    }

    // =====================================================
    // STEP 5: Create missing PaymentAttempt records
    // =====================================================
    console.log('STEP 5: Creating missing PaymentAttempt records...');
    
    for (const inv of invoicesNeedingAttempts) {
      try {
        const shop = await shopModel.findById(inv.shopId).lean() as any;
        const user = await userModel.findOne({ shopId: inv.shopId, role: 'admin' }).lean() as any;
        const subscription = await subscriptionModel.findById(inv.subscriptionId).lean() as any;

        // Determine status based on invoice status
        let attemptStatus = 'pending_approval';
        if (inv.status === 'paid') {
          attemptStatus = 'success';
        }

        // Determine type based on invoice type
        let attemptType = 'subscription';
        if (inv.type === 'upgrade') {
          attemptType = 'upgrade';
        }

        const paymentAttempt = {
          shopId: inv.shopId,
          shopName: shop?.name,
          userEmail: (user as any)?.email,
          method: 'mpesa_manual',
          type: attemptType,
          status: attemptStatus,
          amount: inv.totalAmount,
          currency: 'KES',
          planCode: (subscription as any)?.planCode,
          billingCycle: (subscription as any)?.billingCycle,
          invoiceId: String(inv._id),
          invoiceNumber: inv.invoiceNumber,
          mpesaReceiptNumber: inv.mpesaReceiptNumber || inv.manualPayment?.receiptNumber,
          initiatedAt: inv.manualPayment?.submittedAt || inv.createdAt,
          completedAt: inv.status === 'paid' ? (inv.paidAt || inv.manualPayment?.verifiedAt) : undefined,
          approvedAt: inv.status === 'paid' ? inv.manualPayment?.verifiedAt : undefined,
          approvedBy: inv.status === 'paid' ? inv.manualPayment?.verifiedBy : undefined,
          metadata: {
            source: 'audit_script',
            originalInvoiceStatus: inv.status,
            createdByAudit: true,
            auditDate: new Date(),
          },
        };

        await paymentAttemptModel.create(paymentAttempt);
        result.created++;
        console.log(`  ✓ Created PaymentAttempt for invoice ${inv.invoiceNumber}`);
      } catch (error: any) {
        const errMsg = `Failed to create PaymentAttempt for ${inv.invoiceNumber}: ${error.message}`;
        result.errors.push(errMsg);
        console.log(`  ✗ ${errMsg}`);
      }
    }
    console.log('');

    // =====================================================
    // SUMMARY
    // =====================================================
    console.log('='.repeat(60));
    console.log('AUDIT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Invoices:              ${result.totalInvoices}`);
    console.log(`  - Paid:                    ${result.paidInvoices}`);
    console.log(`  - Pending Verification:    ${result.pendingVerificationInvoices}`);
    console.log(`  - Manual Payments:         ${result.manualPaymentInvoices}`);
    console.log(`  - STK Push Payments:       ${result.stkPaymentInvoices}`);
    console.log('');
    console.log(`Payment Attempts (before):   ${result.paymentAttemptsTotal}`);
    console.log(`Missing PaymentAttempts:     ${result.missingPaymentAttempts}`);
    console.log(`Created:                     ${result.created}`);
    console.log(`Errors:                      ${result.errors.length}`);
    console.log('');
    
    if (result.errors.length > 0) {
      console.log('Errors:');
      for (const err of result.errors) {
        console.log(`  - ${err}`);
      }
    }

    console.log('');
    console.log('Completed at:', new Date().toISOString());
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('FATAL ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await app.close();
  }
}

// Run the script
auditPayments().catch(console.error);
