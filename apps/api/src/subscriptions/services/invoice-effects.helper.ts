import { Types } from 'mongoose';

/**
 * P0-11C3 — DURABLE PER-INVOICE APPLICATION CONTRACT
 *
 * The once-guard for billing effects lives on the INVOICE itself:
 *   pending → applying → applied   (failed = terminal, operator surface)
 *
 * This replaces the single subscription `lastSettledInvoiceId` marker as
 * deduplication authority — a monotonic marker could never prove that an
 * OLDER-but-legitimately-paid invoice had already received its own
 * entitlement. Under this contract every paid invoice is claimed and
 * applied independently, exactly once, regardless of creation order,
 * payment-arrival order, replay, or crash.
 *
 * Two orthogonal write classes:
 *  - ENTITLEMENT effects (period extension, activation, setup, upgrade):
 *    applied under the claim, via a CAS-retry on currentPeriodEnd so
 *    concurrent different-invoice applications cannot lose an extension.
 *  - TRACKING/display fields (lastPayment*): newest-payment-wins CAS on
 *    metadata.lastPaymentInvoicePaidAt — an older event can never
 *    overwrite a newer payment's display fields.
 */

export const EFFECT_CLAIM_LEASE_MS = 10 * 60 * 1000;
export const EFFECT_CAS_MAX_RETRIES = 5;

/**
 * Atomic per-invoice claim. Transitions pending → applying; also reclaims
 * a stale 'applying' lease left by a crashed application.
 */
export async function claimBillingEffects(
  invoiceModel: any,
  invoiceId: string,
): Promise<any | null> {
  const now = Date.now();
  return invoiceModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(invoiceId),
      status: 'paid',
      $or: [
        { 'billingEffects.status': 'pending' },
        {
          'billingEffects.status': 'applying',
          'billingEffects.claimedAt': {
            $lt: new Date(now - EFFECT_CLAIM_LEASE_MS),
          },
        },
      ],
    },
    {
      $set: {
        'billingEffects.status': 'applying',
        'billingEffects.claimedAt': new Date(now),
      },
    },
    { new: true },
  );
}

/** Effects durable → applied marker. Written ONLY after completion. */
export async function markBillingEffectsApplied(
  invoiceModel: any,
  invoiceId: string,
): Promise<void> {
  await invoiceModel.updateOne(
    { _id: new Types.ObjectId(invoiceId) },
    {
      $set: {
        'billingEffects.status': 'applied',
        'billingEffects.appliedAt': new Date(),
      },
      $inc: { 'billingEffects.attempts': 1 },
    },
  );
}

/** Application failed → release back to pending with error evidence. */
export async function failBillingEffects(
  invoiceModel: any,
  invoiceId: string,
  error: any,
): Promise<void> {
  await invoiceModel
    .updateOne(
      { _id: new Types.ObjectId(invoiceId) },
      {
        $set: {
          'billingEffects.status': 'pending',
          'billingEffects.lastError': error?.message || 'failed',
        },
        $inc: { 'billingEffects.attempts': 1 },
      },
    )
    .catch(() => undefined);
}

/**
 * Renewal entitlement — extends the subscription period by ONE invoice
 * term, applied atomically under optimistic-concurrency CAS on
 * currentPeriodEnd. Concurrent different-invoice applications retry until
 * both extensions land; a lost CAS means another invoice applied first —
 * re-read and extend from the NEW end.
 *
 * The base is max(now, currentPeriodEnd): an expired/past-due subscription
 * restarts from now; an active one prepays onto its existing end.
 * Immutable invoice terms (periodStart/periodEnd) define the duration when
 * present; otherwise the subscription billingCycle governs.
 */
export async function applyRenewalExtension(
  subscriptionModel: any,
  subscriptionId: any,
  invoice: any,
): Promise<boolean> {
  const invoiceKey = invoice._id.toString();
  for (let i = 0; i < EFFECT_CAS_MAX_RETRIES; i++) {
    const sub = await subscriptionModel.findById(subscriptionId);
    if (!sub) return false;

    // Per-invoice entitlement dedup: this invoice's extension was already
    // durably granted (e.g. post-write crash retry) — idempotent success.
    const appliedIds = sub.metadata?.appliedEntitlementInvoiceIds || [];
    if (appliedIds.some((id: any) => id?.toString() === invoiceKey)) {
      return true;
    }

    const now = new Date();
    const currentEnd = sub.currentPeriodEnd
      ? new Date(sub.currentPeriodEnd)
      : null;
    const base =
      currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now;

    let periodEnd: Date;
    if (invoice.periodStart && invoice.periodEnd) {
      // Immutable invoice terms — carry the invoice's own service duration.
      const durationMs =
        new Date(invoice.periodEnd).getTime() -
        new Date(invoice.periodStart).getTime();
      periodEnd = new Date(base.getTime() + Math.max(durationMs, 0));
    } else {
      periodEnd = new Date(base);
      if (sub.billingCycle === 'annual') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else if (sub.billingCycle === 'daily') {
        periodEnd.setDate(periodEnd.getDate() + (sub.numberOfDays || 1));
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }
    }

    const wasActive =
      sub.status === 'active' &&
      currentEnd &&
      currentEnd.getTime() > now.getTime();
    const updateData: Record<string, any> = {
      status: 'active',
      currentPeriodEnd: periodEnd,
      nextBillingDate: periodEnd,
      failedPaymentAttempts: 0,
      gracePeriodEndDate: null,
    };
    if (!wasActive) {
      updateData.currentPeriodStart = now;
    }

    // Atomic write: CAS on currentPeriodEnd (a concurrent extension by
    // another invoice invalidates the read — retry from the new state)
    // AND $addToSet the durable per-invoice entitlement identity in the
    // SAME update, so a crash after this commit can never re-extend.
    const res = await subscriptionModel.updateOne(
      {
        _id: sub._id,
        currentPeriodEnd: sub.currentPeriodEnd ?? null,
        'metadata.appliedEntitlementInvoiceIds': { $ne: invoice._id },
      },
      {
        $set: updateData,
        $addToSet: {
          'metadata.appliedEntitlementInvoiceIds': invoice._id,
        },
      },
    );
    if (res?.modifiedCount) return true;
    // CAS miss — the next loop iteration re-reads: if the marker is now
    // present this invoice is already applied; otherwise retry.
  }
  return false;
}

/**
 * Newest-payment-wins tracking CAS — display fields only (the
 * lastPayment family and metadata markers). Guarded by invoice.paidAt so
 * an older settlement event can never overwrite a newer payment's
 * tracking.
 */
export async function applyNewestPaymentTracking(
  subscriptionModel: any,
  subscriptionId: any,
  invoice: any,
  fields: {
    paymentMethod?: string;
    paymentReference?: string;
  },
): Promise<void> {
  const paidAt = invoice.paidAt ? new Date(invoice.paidAt) : new Date();
  await subscriptionModel.updateOne(
    {
      _id: subscriptionId,
      // Newest (paidAt, invoiceId) wins — deterministic tie-break so two
      // settlements landing in the same millisecond still converge.
      $or: [
        { 'metadata.lastPaymentInvoicePaidAt': { $exists: false } },
        { 'metadata.lastPaymentInvoicePaidAt': { $lt: paidAt } },
        {
          $and: [
            { 'metadata.lastPaymentInvoicePaidAt': paidAt },
            {
              'metadata.lastSettledInvoiceId': { $lt: invoice._id },
            },
          ],
        },
      ],
    },
    {
      $set: {
        lastPaymentDate: paidAt,
        lastPaymentAmount: invoice.totalAmount,
        lastPaymentMethod: fields.paymentMethod,
        lastPaymentReference: fields.paymentReference,
        'metadata.lastPaymentInvoicePaidAt': paidAt,
        // Informational newest-paid marker — retained for operator reads;
        // no longer a dedup authority (the invoice claim is).
        'metadata.lastSettledInvoiceId': invoice._id,
      },
    },
  );
}
