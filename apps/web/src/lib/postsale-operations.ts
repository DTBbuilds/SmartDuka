/**
 * P0-10A — durable post-sale operation identity.
 *
 * A refund/void retry after an ambiguous outcome (network error, timeout,
 * 5xx, browser reload) MUST reuse the same server operation id — minting a
 * new id would defeat server-side idempotency and could double-apply money
 * or stock effects.
 *
 * Identity = orderId + canonical intent fingerprint. The fingerprint covers
 * the business fields that define the operation; the same intent always maps
 * to the same key regardless of allocation ordering. Stored in
 * sessionStorage: survives reloads, dies with the tab session (a fresh
 * session is a genuinely new intent context).
 *
 * Clear the persisted id ONLY on definitive outcomes:
 *   - a canonical success response, or
 *   - a conflict (409) proving this intent can never be retried.
 * Never clear on ambiguous transport failure.
 */

const PREFIX = 'sd:postsale-op:';

export interface PostSaleIntent {
  orderId: string;
  action: 'void' | 'refund' | 'discount';
  amount?: number;
  reason: string;
  allocations?: { method: string; amount: number }[];
}

/** Canonical, order-independent fingerprint of the business intent. */
export function postsaleIntentFingerprint(intent: PostSaleIntent): string {
  const canonical = {
    orderId: intent.orderId,
    action: intent.action,
    amount: intent.amount ?? null,
    reason: intent.reason,
    allocations: (intent.allocations ?? [])
      .map((a) => ({ method: a.method, amount: a.amount }))
      .sort((a, b) => a.method.localeCompare(b.method)),
  };
  return JSON.stringify(canonical);
}

interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function storage(): KeyValueStore | undefined {
  try {
    return globalThis.sessionStorage;
  } catch {
    return undefined;
  }
}

/**
 * Returns the existing operation id for this exact intent, or mints and
 * persists a new one. Retries of the same intent — including after a page
 * reload — receive the same id.
 */
export function getOrCreateOperationId(
  intent: PostSaleIntent,
  mint: () => string = () => crypto.randomUUID(),
): string {
  const key = PREFIX + postsaleIntentFingerprint(intent);
  const store = storage();
  const existing = store?.getItem(key);
  if (existing) {
    return existing;
  }
  const id = mint();
  try {
    store?.setItem(key, id);
  } catch {
    // storage unavailable/full — proceed with the minted id for this call
  }
  return id;
}

/**
 * Forget the operation id for this intent. Call only after a definitive
 * outcome: canonical success or a conflict proving the intent cannot retry.
 */
export function clearOperationId(intent: PostSaleIntent): void {
  try {
    storage()?.removeItem(PREFIX + postsaleIntentFingerprint(intent));
  } catch {
    // ignore
  }
}
