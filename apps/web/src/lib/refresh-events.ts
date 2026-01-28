/**
 * Refresh Events System
 * 
 * A simple event-based system for triggering data refreshes across components.
 * Useful when:
 * - Super admin verifies a shop → shop owner's UI should update
 * - Payment is completed → subscription status should update
 * - Plan is changed → usage limits should update
 */

type RefreshEventType = 
  | 'shop:verified'
  | 'shop:suspended'
  | 'shop:updated'
  | 'subscription:created'
  | 'subscription:updated'
  | 'subscription:cancelled'
  | 'subscription:reactivated'
  | 'payment:completed'
  | 'payment:failed'
  | 'invoice:created'
  | 'invoice:paid'
  | 'user:created'
  | 'user:updated'
  | 'user:deleted'
  | 'notification:show';

type RefreshCallback = (data?: any) => void;

class RefreshEventManager {
  private listeners: Map<RefreshEventType, Set<RefreshCallback>> = new Map();
  private globalListeners: Set<RefreshCallback> = new Set();

  /**
   * Subscribe to a specific event type
   */
  on(event: RefreshEventType, callback: RefreshCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Subscribe to all events
   */
  onAny(callback: RefreshCallback): () => void {
    this.globalListeners.add(callback);
    return () => {
      this.globalListeners.delete(callback);
    };
  }

  /**
   * Emit an event to trigger refreshes
   */
  emit(event: RefreshEventType, data?: any): void {
    // Notify specific listeners
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in refresh event listener for ${event}:`, error);
      }
    });

    // Notify global listeners
    this.globalListeners.forEach(callback => {
      try {
        callback({ event, data });
      } catch (error) {
        console.error(`Error in global refresh event listener:`, error);
      }
    });
  }

  /**
   * Clear all listeners (useful for cleanup)
   */
  clear(): void {
    this.listeners.clear();
    this.globalListeners.clear();
  }
}

// Singleton instance
export const refreshEvents = new RefreshEventManager();

/**
 * React hook for subscribing to refresh events
 */
import { useEffect, useCallback } from 'react';

export function useRefreshEvent(
  event: RefreshEventType | RefreshEventType[],
  callback: RefreshCallback,
  deps: any[] = []
): void {
  const memoizedCallback = useCallback(callback, deps);

  useEffect(() => {
    const events = Array.isArray(event) ? event : [event];
    const unsubscribes = events.map(e => refreshEvents.on(e, memoizedCallback));

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [event, memoizedCallback]);
}

/**
 * Hook to trigger refresh events
 */
export function useRefreshTrigger() {
  return {
    triggerShopVerified: (shopId: string) => 
      refreshEvents.emit('shop:verified', { shopId }),
    triggerShopUpdated: (shopId: string) => 
      refreshEvents.emit('shop:updated', { shopId }),
    triggerSubscriptionUpdated: (shopId: string) => 
      refreshEvents.emit('subscription:updated', { shopId }),
    triggerPaymentCompleted: (invoiceId: string, shopId: string) => 
      refreshEvents.emit('payment:completed', { invoiceId, shopId }),
    triggerInvoicePaid: (invoiceId: string) => 
      refreshEvents.emit('invoice:paid', { invoiceId }),
  };
}
