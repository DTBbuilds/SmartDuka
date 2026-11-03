/* MPESA-P0-CONVERGENCE1 (Phase 4) — production M-Pesa convergence audit.
 * STRICTLY READ-ONLY: find/aggregate/count reads only — no writes, no
 * financial-record changes, no secrets printed (phones masked, credentials
 * never touched). Run from the repo root with the production MONGODB_URI in
 * apps/api/.env (or the environment):
 *
 *   node scripts/audit-mpesa-convergence-readonly.js
 *
 * Reports the exact populations an operator needs to decide manual review
 * and GO/NO-GO for M-Pesa payment initiation:
 *   1. transaction counts by status (per shop)
 *   2. pending transactions (age, callback/query state)
 *   3. expired-but-never-reconciled transactions (at risk: paid but expired)
 *   4. COMPLETED transactions without a payment record (money→record gap)
 *   5. COMPLETED transactions whose order is not paid/completed (money→order gap)
 *   6. duplicate payment records per CheckoutRequestID (double-credit check)
 *   7. payment records pointing at unknown/cross-tenant orders
 *   8. manual-review queue: flagged error categories
 *   9. reconciliation configuration evidence (booleans only)
 */
const path = require('path');
const fs = require('fs');

function loadEnv() {
  const envPath = path.join(__dirname, '..', 'apps', 'api', '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  }
}
loadEnv();

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI not set — refusing to run.');
  process.exit(1);
}

const maskPhone = (p) =>
  typeof p === 'string' && p.length >= 9
    ? `${p.slice(0, 6)}***${p.slice(-3)}`
    : '***';

(async () => {
  const mongoose = require(path.join(
    __dirname,
    '..',
    'apps',
    'api',
    'node_modules',
    'mongoose',
  ));
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 20000,
  });
  const db = mongoose.connection.db;
  const tx = db.collection('mpesa_transactions');
  const pay = db.collection('paymenttransactions');
  const orders = db.collection('orders');
  const ObjectId = mongoose.Types.ObjectId;

  console.log('=== MPESA-P0 CONVERGENCE1 — READ-ONLY PRODUCTION AUDIT ===');
  console.log('Connected. All queries below are read-only.\n');

  // 9. Configuration evidence (booleans only — no secrets)
  console.log('--- 9. Configuration evidence ---');
  console.log(
    JSON.stringify(
      {
        MPESA_ENV: process.env.MPESA_ENV || '(unset)',
        MPESA_RECONCILIATION_ENABLED:
          (process.env.MPESA_RECONCILIATION_ENABLED || 'true') === 'true',
        MPESA_PAYMENTS_PAUSED:
          // MPESA-P0-POSTDEPLOY1: fail-closed interpretation matching the
          // deployed kill switch (payments/mpesa-pause.ts + all four
          // initiation paths) — initiation is PAUSED unless the environment
          // explicitly opts in with 'false'/'active'/'enabled'. The previous
          // interpretation (unset → not paused) contradicted the running
          // application and would misreport the containment state.
          process.env.MPESA_PAYMENTS_PAUSED !== 'false' &&
          process.env.MPESA_PAYMENTS_PAUSED !== 'active' &&
          process.env.MPESA_PAYMENTS_PAUSED !== 'enabled',
        MPESA_CALLBACK_URL_configured: !!process.env.MPESA_CALLBACK_URL,
        MPESA_ENCRYPTION_KEY_configured: !!process.env.MPESA_ENCRYPTION_KEY,
      },
      null,
      1,
    ),
  );

  // 1. Counts by status
  const byStatus = await tx
    .aggregate([
      { $group: { _id: '$status', n: { $sum: 1 }, amount: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();
  console.log('\n--- 1. M-Pesa transactions by status ---');
  console.log(JSON.stringify(byStatus, null, 1));

  // 2. Pending transactions
  const pending = await tx
    .find({ status: 'pending' })
    .sort({ createdAt: 1 })
    .limit(50)
    .toArray();
  console.log(`\n--- 2. PENDING transactions (${pending.length} shown) ---`);
  for (const t of pending) {
    console.log(
      JSON.stringify({
        _id: t._id,
        shop: t.shopId,
        order: t.orderNumber,
        amount: t.amount,
        phone: maskPhone(t.phoneNumber),
        createdAt: t.createdAt,
        expiresAt: t.expiresAt,
        hasCheckoutId: !!t.checkoutRequestId,
        hasStkPushSentAt: !!t.stkPushSentAt,
        callbackReceived: !!t.callbackReceived,
        queryCount: t.queryCount || 0,
        errorCategory: t.errorCategory,
      }),
    );
  }
  const pendingNoCheckout = await tx.countDocuments({
    status: 'pending',
    $or: [
      { checkoutRequestId: { $exists: false } },
      { checkoutRequestId: '' },
    ],
  });
  const pendingNoPushTime = await tx.countDocuments({
    status: 'pending',
    stkPushSentAt: { $exists: false },
  });
  console.log(
    `pending without checkoutRequestId (unreconcilable): ${pendingNoCheckout}`,
  );
  console.log(
    `pending without stkPushSentAt (invisible to the reconciliation loop): ${pendingNoPushTime}`,
  );

  // 3. Expired-but-never-reconciled (at risk: paid but expired)
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const expiredAtRisk = await tx
    .find({
      status: 'expired',
      callbackReceived: { $ne: true },
      recoveredViaQuery: { $ne: true },
      expiresAt: { $gt: dayAgo },
    })
    .limit(50)
    .toArray();
  console.log(
    `\n--- 3. EXPIRED within 24h, never callback'd, never query-reconciled (${expiredAtRisk.length}) — at risk of "paid but expired" ---`,
  );
  for (const t of expiredAtRisk) {
    console.log(
      JSON.stringify({
        _id: t._id,
        shop: t.shopId,
        order: t.orderNumber,
        amount: t.amount,
        phone: maskPhone(t.phoneNumber),
        expiresAt: t.expiresAt,
        queryCount: t.queryCount || 0,
      }),
    );
  }

  // 4. COMPLETED transactions without a payment record (money→record gap)
  const completed = await tx
    .find({ status: 'completed' })
    .sort({ completedAt: -1 })
    .limit(500)
    .toArray();
  const gapsNoRecord = [];
  for (const t of completed) {
    const crx = t.checkoutRequestId;
    if (!crx) continue;
    const n = await pay.countDocuments({ mpesaTransactionId: crx });
    if (n === 0) {
      gapsNoRecord.push({
        _id: t._id,
        shop: t.shopId,
        order: t.orderNumber,
        amount: t.amount,
        receipt: t.mpesaReceiptNumber,
        completedAt: t.completedAt,
      });
    }
  }
  console.log(
    `\n--- 4. COMPLETED transactions WITHOUT a payment record (${gapsNoRecord.length}) — money→record gap ---`,
  );
  gapsNoRecord.forEach((g) => console.log(JSON.stringify(g)));

  // 5. COMPLETED transactions whose order is not paid/completed
  const gapsOrder = [];
  for (const t of completed.slice(0, 200)) {
    if (!t.orderId) continue;
    const o = await orders.findOne({ _id: new ObjectId(t.orderId) });
    if (!o) {
      gapsOrder.push({
        txn: t._id,
        shop: t.shopId,
        orderNumber: t.orderNumber,
        problem: 'order not found',
      });
      continue;
    }
    if (o.paymentStatus !== 'paid' || o.status !== 'completed') {
      gapsOrder.push({
        txn: t._id,
        shop: t.shopId,
        orderNumber: t.orderNumber,
        orderStatus: o.status,
        orderPaymentStatus: o.paymentStatus,
        amount: t.amount,
        receipt: t.mpesaReceiptNumber,
      });
    }
  }
  console.log(
    `\n--- 5. COMPLETED transactions whose order is not paid/completed (${gapsOrder.length}) — money→order gap ---`,
  );
  gapsOrder.forEach((g) => console.log(JSON.stringify(g)));

  // 6. Duplicate payment records per CheckoutRequestID (double-credit check)
  const dups = await pay
    .aggregate([
      { $match: { mpesaTransactionId: { $exists: true, $ne: null } } },
      { $group: { _id: '$mpesaTransactionId', n: { $sum: 1 }, sum: { $sum: '$amount' } } },
      { $match: { n: { $gt: 1 } } },
    ])
    .toArray();
  console.log(
    `\n--- 6. DUPLICATE payment records per CheckoutRequestID (${dups.length}) — double-credit check ---`,
  );
  dups.forEach((d) => console.log(JSON.stringify(d)));

  // 7. Payment records pointing at unknown/cross-tenant orders
  const orphanRecords = [];
  const recentRecords = await pay
    .find({ paymentMethod: 'mpesa' })
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
  for (const r of recentRecords) {
    const o = await orders.findOne({ _id: r.orderId });
    if (!o) {
      orphanRecords.push({
        record: r._id,
        shop: r.shopId,
        orderNumber: r.orderNumber,
        problem: 'order not found',
      });
    } else if (String(o.shopId) !== String(r.shopId)) {
      orphanRecords.push({
        record: r._id,
        recordShop: r.shopId,
        orderShop: o.shopId,
        problem: 'CROSS-TENANT order reference',
      });
    }
  }
  console.log(
    `\n--- 7. M-Pesa payment records with unknown/cross-tenant orders (${orphanRecords.length}) ---`,
  );
  orphanRecords.forEach((g) => console.log(JSON.stringify(g)));

  // 8. Manual-review queue: flagged error categories
  const flagged = await tx
    .aggregate([
      {
        $match: {
          errorCategory: {
            $in: [
              'amount_mismatch',
              'callback_unverified',
              'callback_verification_failed',
              'failure_claim_unverified',
            ],
          },
        },
      },
      { $group: { _id: '$errorCategory', n: { $sum: 1 } } },
    ])
    .toArray();
  console.log('\n--- 8. Manual-review queue (flagged error categories) ---');
  console.log(JSON.stringify(flagged, null, 1));

  console.log('\n=== END OF READ-ONLY AUDIT — no data was modified ===');
  await mongoose.disconnect();
})().catch((e) => {
  console.error('Audit failed:', e?.message || e);
  process.exit(1);
});
