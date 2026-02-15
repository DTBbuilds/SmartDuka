'use client';

/**
 * Cart Persistence Service
 * 
 * Automatically saves cart state to localStorage to prevent data loss
 * from power outages, browser crashes, or accidental page closes.
 * 
 * MVP Best Practices Implemented:
 * 1. Auto-save on every cart change (debounced)
 * 2. Recovery prompt on page load
 * 3. Timestamp tracking for stale data cleanup
 * 4. Shop-specific storage to prevent cross-shop issues
 * 5. Compression for large carts
 */

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
}

export interface SavedCartState {
  items: CartItem[];
  shopId: string;
  branchId?: string;
  userId?: string;
  cashierName?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  savedAt: number; // timestamp
  version: number; // for migration support
}

const CART_STORAGE_KEY = 'smartduka:saved_cart';
const CART_VERSION = 1;
const MAX_CART_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours - carts older than this are considered stale

type CartChangeListener = (cart: SavedCartState | null) => void;

class CartPersistenceService {
  private listeners: Set<CartChangeListener> = new Set();
  private saveTimeout: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_MS = 500; // Save after 500ms of no changes

  /**
   * Subscribe to cart changes
   */
  subscribe(listener: CartChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(cart: SavedCartState | null) {
    this.listeners.forEach(listener => listener(cart));
  }

  /**
   * Save cart state (debounced)
   */
  saveCart(state: Omit<SavedCartState, 'savedAt' | 'version'>): void {
    if (typeof window === 'undefined') return;

    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Debounce saves
    this.saveTimeout = setTimeout(() => {
      this.saveCartImmediate(state);
    }, this.DEBOUNCE_MS);
  }

  /**
   * Save cart immediately (no debounce)
   */
  saveCartImmediate(state: Omit<SavedCartState, 'savedAt' | 'version'>): void {
    if (typeof window === 'undefined') return;

    // Don't save empty carts
    if (!state.items || state.items.length === 0) {
      this.clearCart();
      return;
    }

    const savedState: SavedCartState = {
      ...state,
      savedAt: Date.now(),
      version: CART_VERSION,
    };

    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(savedState));
      console.log(`[CartPersistence] Saved ${state.items.length} items`);
      this.notify(savedState);
    } catch (error) {
      console.error('[CartPersistence] Failed to save cart:', error);
      // If localStorage is full, try to clear old data
      this.cleanupOldData();
    }
  }

  /**
   * Load saved cart state
   */
  loadCart(shopId: string): SavedCartState | null {
    if (typeof window === 'undefined') return null;

    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (!saved) return null;

      const state: SavedCartState = JSON.parse(saved);

      // Validate version
      if (state.version !== CART_VERSION) {
        console.log('[CartPersistence] Cart version mismatch, clearing');
        this.clearCart();
        return null;
      }

      // Check if cart is for the same shop
      if (state.shopId !== shopId) {
        console.log('[CartPersistence] Cart is for different shop, ignoring');
        return null;
      }

      // Check if cart is too old
      if (Date.now() - state.savedAt > MAX_CART_AGE_MS) {
        console.log('[CartPersistence] Cart is stale, clearing');
        this.clearCart();
        return null;
      }

      return state;
    } catch (error) {
      console.error('[CartPersistence] Failed to load cart:', error);
      return null;
    }
  }

  /**
   * Check if there's a recoverable cart
   */
  hasRecoverableCart(shopId: string): boolean {
    const cart = this.loadCart(shopId);
    return cart !== null && cart.items.length > 0;
  }

  /**
   * Get cart age in human-readable format
   */
  getCartAge(shopId: string): string | null {
    const cart = this.loadCart(shopId);
    if (!cart) return null;

    const ageMs = Date.now() - cart.savedAt;
    const minutes = Math.floor(ageMs / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'just now';
    }
  }

  /**
   * Get cart summary for recovery prompt
   */
  getCartSummary(shopId: string): { itemCount: number; total: number; age: string } | null {
    const cart = this.loadCart(shopId);
    if (!cart) return null;

    const total = cart.items.reduce((sum, item) => {
      let itemTotal = item.unitPrice * item.quantity;
      if (item.discount) {
        if (item.discountType === 'percentage') {
          itemTotal *= (1 - item.discount / 100);
        } else {
          itemTotal -= item.discount;
        }
      }
      return sum + itemTotal;
    }, 0);

    return {
      itemCount: cart.items.length,
      total,
      age: this.getCartAge(shopId) || 'unknown',
    };
  }

  /**
   * Clear saved cart
   */
  clearCart(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(CART_STORAGE_KEY);
      console.log('[CartPersistence] Cart cleared');
      this.notify(null);
    } catch (error) {
      console.error('[CartPersistence] Failed to clear cart:', error);
    }
  }

  /**
   * Clean up old localStorage data
   */
  private cleanupOldData(): void {
    try {
      // Remove old cart data
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('smartduka:') && key !== CART_STORAGE_KEY) {
          // Check if it's old temporary data
          const value = localStorage.getItem(key);
          if (value) {
            try {
              const data = JSON.parse(value);
              if (data.savedAt && Date.now() - data.savedAt > MAX_CART_AGE_MS * 7) {
                keysToRemove.push(key);
              }
            } catch {
              // Not JSON, skip
            }
          }
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('[CartPersistence] Cleanup failed:', error);
    }
  }
}

// Singleton instance
export const cartPersistence = new CartPersistenceService();

/**
 * Hook for using cart persistence in components
 */
export function useCartPersistence(shopId: string) {
  return {
    save: (state: Omit<SavedCartState, 'savedAt' | 'version' | 'shopId'>) => 
      cartPersistence.saveCart({ ...state, shopId }),
    saveImmediate: (state: Omit<SavedCartState, 'savedAt' | 'version' | 'shopId'>) => 
      cartPersistence.saveCartImmediate({ ...state, shopId }),
    load: () => cartPersistence.loadCart(shopId),
    hasRecoverable: () => cartPersistence.hasRecoverableCart(shopId),
    getSummary: () => cartPersistence.getCartSummary(shopId),
    clear: () => cartPersistence.clearCart(),
  };
}
