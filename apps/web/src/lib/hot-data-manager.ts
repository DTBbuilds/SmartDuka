'use client';

import { config } from './config';

/**
 * Hot Data Manager
 * 
 * Manages frequently accessed user data that should be available immediately
 * after login or page refresh. This data is stored in localStorage and
 * synced with the server periodically.
 */

export interface HotData {
  // User preferences
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    currency: string;
    dateFormat: string;
    soundEnabled: boolean;
    receiptPrinterEnabled: boolean;
  };
  
  // Quick access data
  quickAccess: {
    recentProducts: Array<{ id: string; name: string; price: number; sku?: string }>;
    favoriteProducts: Array<{ id: string; name: string; price: number }>;
    frequentCustomers: Array<{ id: string; name: string; phone?: string }>;
    lastUsedPaymentMethod: string;
  };
  
  // Shop info (cached)
  shopInfo: {
    id: string;
    name: string;
    logo?: string;
    currency: string;
    taxRate: number;
    receiptFooter?: string;
  } | null;
  
  // Dashboard quick stats (last known values)
  lastKnownStats: {
    todaySales: number;
    todayOrders: number;
    lowStockCount: number;
    pendingOrders: number;
    lastUpdated: number;
  } | null;
  
  // Metadata
  lastSynced: number;
  version: number;
}

const DEFAULT_HOT_DATA: HotData = {
  preferences: {
    theme: 'system',
    language: 'en',
    currency: 'KES',
    dateFormat: 'DD/MM/YYYY',
    soundEnabled: true,
    receiptPrinterEnabled: false,
  },
  quickAccess: {
    recentProducts: [],
    favoriteProducts: [],
    frequentCustomers: [],
    lastUsedPaymentMethod: 'cash',
  },
  shopInfo: null,
  lastKnownStats: null,
  lastSynced: 0,
  version: 1,
};

const STORAGE_KEY = 'smartduka:hotData';
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

class HotDataManager {
  private data: HotData = { ...DEFAULT_HOT_DATA };
  private syncInterval: NodeJS.Timeout | null = null;
  private token: string | null = null;
  private initialized = false;

  /**
   * Initialize with user token
   */
  initialize(token: string) {
    this.token = token;
    this.loadFromStorage();
    this.startSync();
    this.initialized = true;
  }

  /**
   * Cleanup on logout
   */
  cleanup() {
    this.stopSync();
    this.data = { ...DEFAULT_HOT_DATA };
    this.token = null;
    this.initialized = false;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /**
   * Update token (e.g., after token refresh)
   */
  updateToken(token: string) {
    this.token = token;
    // Restart sync if it was stopped due to token expiry
    if (this.initialized && !this.syncInterval) {
      this.startSync();
    }
  }

  /**
   * Load data from localStorage
   */
  private loadFromStorage() {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as HotData;
        // Merge with defaults to handle new fields
        this.data = {
          ...DEFAULT_HOT_DATA,
          ...parsed,
          preferences: { ...DEFAULT_HOT_DATA.preferences, ...parsed.preferences },
          quickAccess: { ...DEFAULT_HOT_DATA.quickAccess, ...parsed.quickAccess },
        };
      }
    } catch (e) {
      console.warn('Failed to load hot data:', e);
    }
  }

  /**
   * Save data to localStorage
   */
  private saveToStorage() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save hot data:', e);
    }
  }

  /**
   * Start periodic sync with server
   */
  private startSync() {
    if (this.syncInterval) return;

    // Initial sync
    this.syncWithServer();

    // Periodic sync
    this.syncInterval = setInterval(() => {
      this.syncWithServer();
    }, SYNC_INTERVAL);
  }

  /**
   * Stop sync
   */
  private stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Sync with server
   */
  private async syncWithServer() {
    if (!this.token) return;

    try {
      // Fetch user preferences from server
      const res = await fetch(`${config.apiUrl}/users/preferences`, {
        headers: { Authorization: `Bearer ${this.token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const serverPrefs = await res.json();
        if (serverPrefs) {
          this.data.preferences = {
            ...this.data.preferences,
            ...serverPrefs,
          };
        }
        this.data.lastSynced = Date.now();
        this.saveToStorage();
      } else if (res.status === 401) {
        // Token is invalid/expired - stop syncing to avoid spamming server
        console.debug('Hot data sync: Token expired, stopping sync');
        this.stopSync();
        this.token = null;
      }
      // For other errors, silently fail and use cached data
    } catch (e) {
      // Silently fail - we'll use cached data
      console.debug('Hot data sync failed:', e);
    }
  }

  /**
   * Get all hot data
   */
  getData(): HotData {
    return this.data;
  }

  /**
   * Get preferences
   */
  getPreferences(): HotData['preferences'] {
    return this.data.preferences;
  }

  /**
   * Update preferences
   */
  async updatePreferences(updates: Partial<HotData['preferences']>) {
    this.data.preferences = { ...this.data.preferences, ...updates };
    this.saveToStorage();

    // Sync to server
    if (this.token) {
      try {
        const res = await fetch(`${config.apiUrl}/users/preferences`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
          credentials: 'include',
          body: JSON.stringify(updates),
        });
        
        if (res.status === 401) {
          // Token expired - stop syncing
          this.stopSync();
          this.token = null;
        }
      } catch (e) {
        console.debug('Failed to sync preferences:', e);
      }
    }
  }

  /**
   * Get quick access data
   */
  getQuickAccess(): HotData['quickAccess'] {
    return this.data.quickAccess;
  }

  /**
   * Add recent product
   */
  addRecentProduct(product: { id: string; name: string; price: number; sku?: string }) {
    const existing = this.data.quickAccess.recentProducts.filter(p => p.id !== product.id);
    this.data.quickAccess.recentProducts = [product, ...existing].slice(0, 10); // Keep last 10
    this.saveToStorage();
  }

  /**
   * Toggle favorite product
   */
  toggleFavoriteProduct(product: { id: string; name: string; price: number }) {
    const index = this.data.quickAccess.favoriteProducts.findIndex(p => p.id === product.id);
    if (index >= 0) {
      this.data.quickAccess.favoriteProducts.splice(index, 1);
    } else {
      this.data.quickAccess.favoriteProducts.push(product);
    }
    this.saveToStorage();
  }

  /**
   * Check if product is favorite
   */
  isFavoriteProduct(productId: string): boolean {
    return this.data.quickAccess.favoriteProducts.some(p => p.id === productId);
  }

  /**
   * Add frequent customer
   */
  addFrequentCustomer(customer: { id: string; name: string; phone?: string }) {
    const existing = this.data.quickAccess.frequentCustomers.filter(c => c.id !== customer.id);
    this.data.quickAccess.frequentCustomers = [customer, ...existing].slice(0, 10);
    this.saveToStorage();
  }

  /**
   * Set last used payment method
   */
  setLastPaymentMethod(method: string) {
    this.data.quickAccess.lastUsedPaymentMethod = method;
    this.saveToStorage();
  }

  /**
   * Update shop info
   */
  updateShopInfo(info: HotData['shopInfo']) {
    this.data.shopInfo = info;
    this.saveToStorage();
  }

  /**
   * Get shop info
   */
  getShopInfo(): HotData['shopInfo'] {
    return this.data.shopInfo;
  }

  /**
   * Update last known stats
   */
  updateLastKnownStats(stats: Omit<NonNullable<HotData['lastKnownStats']>, 'lastUpdated'>) {
    this.data.lastKnownStats = {
      ...stats,
      lastUpdated: Date.now(),
    };
    this.saveToStorage();
  }

  /**
   * Get last known stats
   */
  getLastKnownStats(): HotData['lastKnownStats'] {
    return this.data.lastKnownStats;
  }

  /**
   * Check if stats are stale (older than 5 minutes)
   */
  areStatsStale(): boolean {
    if (!this.data.lastKnownStats) return true;
    return Date.now() - this.data.lastKnownStats.lastUpdated > 5 * 60 * 1000;
  }
}

// Singleton instance
export const hotDataManager = new HotDataManager();
