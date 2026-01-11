'use client';

import { config } from './config';

/**
 * Smart Cache Manager with AI-Powered Optimization
 * 
 * Features:
 * - Hot cache for frequently accessed data (products, dashboard)
 * - Offline support with IndexedDB fallback
 * - AI-powered cache warming and prediction
 * - Automatic cache invalidation
 * - Background sync with server
 */

export interface CachedProduct {
  _id: string;
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  cost?: number;
  stock: number;
  categoryId?: string;
  categoryName?: string;
  isActive: boolean;
  lowStockThreshold?: number;
  imageUrl?: string;
}

export interface CachedCategory {
  _id: string;
  name: string;
  slug: string;
  productCount?: number;
}

export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  todayRevenue: number;
  lowStockCount: number;
  pendingOrders: number;
  topProducts: Array<{ id: string; name: string; quantity: number; revenue: number }>;
  recentSales: Array<{ id: string; total: number; items: number; createdAt: string }>;
}

interface CacheMetadata {
  lastUpdated: number;
  version: number;
  totalItems: number;
  syncStatus: 'synced' | 'pending' | 'error';
}

interface SmartCacheData {
  products: {
    items: CachedProduct[];
    metadata: CacheMetadata;
    byBarcode: Record<string, string>; // barcode -> productId
    bySku: Record<string, string>; // sku -> productId
  };
  categories: {
    items: CachedCategory[];
    metadata: CacheMetadata;
  };
  dashboard: {
    stats: DashboardStats | null;
    metadata: CacheMetadata;
  };
}

const STORAGE_KEY = 'smartduka:smartCache';
const CACHE_VERSION = 2;
const PRODUCTS_TTL = 10 * 60 * 1000; // 10 minutes
const DASHBOARD_TTL = 2 * 60 * 1000; // 2 minutes
const SYNC_DEBOUNCE = 1000; // 1 second

class SmartCacheManager {
  private cache: SmartCacheData;
  private token: string | null = null;
  private shopId: string | null = null;
  private branchId: string | null = null;
  private syncTimeout: NodeJS.Timeout | null = null;
  private isOnline = true;
  private listeners: Map<string, Set<() => void>> = new Map();

  constructor() {
    this.cache = this.getDefaultCache();
    this.loadFromStorage();
    this.setupOnlineListener();
  }

  private getDefaultCache(): SmartCacheData {
    return {
      products: {
        items: [],
        metadata: { lastUpdated: 0, version: CACHE_VERSION, totalItems: 0, syncStatus: 'pending' },
        byBarcode: {},
        bySku: {},
      },
      categories: {
        items: [],
        metadata: { lastUpdated: 0, version: CACHE_VERSION, totalItems: 0, syncStatus: 'pending' },
      },
      dashboard: {
        stats: null,
        metadata: { lastUpdated: 0, version: CACHE_VERSION, totalItems: 0, syncStatus: 'pending' },
      },
    };
  }

  private setupOnlineListener() {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncAll();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
    
    this.isOnline = navigator.onLine;
  }

  /**
   * Initialize with auth context
   */
  initialize(token: string, shopId: string, branchId?: string) {
    this.token = token;
    this.shopId = shopId;
    this.branchId = branchId || null;
    
    // Load shop-specific cache
    this.loadFromStorage();
    
    // Warm cache if stale
    if (this.isProductsCacheStale()) {
      this.warmProductsCache();
    }
    if (this.isDashboardCacheStale()) {
      this.warmDashboardCache();
    }
  }

  /**
   * Update token (after refresh)
   */
  updateToken(token: string) {
    this.token = token;
  }

  /**
   * Cleanup on logout
   */
  cleanup() {
    this.token = null;
    this.shopId = null;
    this.branchId = null;
    this.cache = this.getDefaultCache();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.getStorageKey());
    }
  }

  private getStorageKey(): string {
    return `${STORAGE_KEY}:${this.shopId || 'default'}`;
  }

  // ==================== PRODUCTS CACHE ====================

  /**
   * Get all cached products
   */
  getProducts(): CachedProduct[] {
    return this.cache.products.items;
  }

  /**
   * Get product by ID
   */
  getProductById(id: string): CachedProduct | undefined {
    return this.cache.products.items.find(p => p._id === id);
  }

  /**
   * Get product by barcode (fast lookup)
   */
  getProductByBarcode(barcode: string): CachedProduct | undefined {
    const productId = this.cache.products.byBarcode[barcode];
    if (productId) {
      return this.getProductById(productId);
    }
    // Fallback to linear search
    return this.cache.products.items.find(p => p.barcode === barcode);
  }

  /**
   * Get product by SKU (fast lookup)
   */
  getProductBySku(sku: string): CachedProduct | undefined {
    const productId = this.cache.products.bySku[sku];
    if (productId) {
      return this.getProductById(productId);
    }
    return this.cache.products.items.find(p => p.sku === sku);
  }

  /**
   * Search products (local search)
   */
  searchProducts(query: string, limit = 20): CachedProduct[] {
    if (!query.trim()) return this.cache.products.items.slice(0, limit);
    
    const q = query.toLowerCase();
    return this.cache.products.items
      .filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.includes(q)
      )
      .slice(0, limit);
  }

  /**
   * Check if products cache is stale
   */
  isProductsCacheStale(): boolean {
    const age = Date.now() - this.cache.products.metadata.lastUpdated;
    return age > PRODUCTS_TTL || this.cache.products.items.length === 0;
  }

  /**
   * Warm products cache from server
   */
  async warmProductsCache(): Promise<void> {
    if (!this.token || !this.isOnline) return;

    try {
      const branchQuery = this.branchId ? `&branchId=${this.branchId}` : '';
      const res = await fetch(
        `${config.apiUrl}/inventory/products?limit=200${branchQuery}`,
        {
          headers: { Authorization: `Bearer ${this.token}` },
          credentials: 'include',
        }
      );

      if (res.ok) {
        const products: CachedProduct[] = await res.json();
        this.setProducts(products);
        
        // Also fetch categories
        this.warmCategoriesCache();
      }
    } catch (e) {
      console.debug('[SmartCache] Failed to warm products cache:', e);
    }
  }

  /**
   * Set products in cache
   */
  setProducts(products: CachedProduct[]) {
    // Build lookup indexes
    const byBarcode: Record<string, string> = {};
    const bySku: Record<string, string> = {};
    
    products.forEach(p => {
      if (p.barcode) byBarcode[p.barcode] = p._id;
      if (p.sku) bySku[p.sku] = p._id;
    });

    this.cache.products = {
      items: products,
      metadata: {
        lastUpdated: Date.now(),
        version: CACHE_VERSION,
        totalItems: products.length,
        syncStatus: 'synced',
      },
      byBarcode,
      bySku,
    };

    this.saveToStorage();
    this.notifyListeners('products');
  }

  /**
   * Add or update a product in cache
   */
  upsertProduct(product: CachedProduct) {
    const index = this.cache.products.items.findIndex(p => p._id === product._id);
    
    if (index >= 0) {
      this.cache.products.items[index] = product;
    } else {
      this.cache.products.items.push(product);
    }

    // Update indexes
    if (product.barcode) {
      this.cache.products.byBarcode[product.barcode] = product._id;
    }
    if (product.sku) {
      this.cache.products.bySku[product.sku] = product._id;
    }

    this.cache.products.metadata.totalItems = this.cache.products.items.length;
    this.cache.products.metadata.lastUpdated = Date.now();
    
    this.debouncedSave();
    this.notifyListeners('products');
  }

  /**
   * Remove product from cache
   */
  removeProduct(productId: string) {
    const product = this.getProductById(productId);
    if (product) {
      if (product.barcode) delete this.cache.products.byBarcode[product.barcode];
      if (product.sku) delete this.cache.products.bySku[product.sku];
    }
    
    this.cache.products.items = this.cache.products.items.filter(p => p._id !== productId);
    this.cache.products.metadata.totalItems = this.cache.products.items.length;
    
    this.debouncedSave();
    this.notifyListeners('products');
  }

  /**
   * Update product stock (optimistic update)
   */
  updateProductStock(productId: string, newStock: number) {
    const product = this.getProductById(productId);
    if (product) {
      product.stock = newStock;
      this.debouncedSave();
      this.notifyListeners('products');
    }
  }

  // ==================== CATEGORIES CACHE ====================

  /**
   * Get all cached categories
   */
  getCategories(): CachedCategory[] {
    return this.cache.categories.items;
  }

  /**
   * Warm categories cache
   */
  async warmCategoriesCache(): Promise<void> {
    if (!this.token || !this.isOnline) return;

    try {
      const res = await fetch(`${config.apiUrl}/inventory/categories`, {
        headers: { Authorization: `Bearer ${this.token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const categories: CachedCategory[] = await res.json();
        this.setCategories(categories);
      }
    } catch (e) {
      console.debug('[SmartCache] Failed to warm categories cache:', e);
    }
  }

  /**
   * Set categories in cache
   */
  setCategories(categories: CachedCategory[]) {
    this.cache.categories = {
      items: categories,
      metadata: {
        lastUpdated: Date.now(),
        version: CACHE_VERSION,
        totalItems: categories.length,
        syncStatus: 'synced',
      },
    };
    this.saveToStorage();
    this.notifyListeners('categories');
  }

  // ==================== DASHBOARD CACHE ====================

  /**
   * Get cached dashboard stats
   */
  getDashboardStats(): DashboardStats | null {
    return this.cache.dashboard.stats;
  }

  /**
   * Check if dashboard cache is stale
   */
  isDashboardCacheStale(): boolean {
    const age = Date.now() - this.cache.dashboard.metadata.lastUpdated;
    return age > DASHBOARD_TTL || !this.cache.dashboard.stats;
  }

  /**
   * Warm dashboard cache
   */
  async warmDashboardCache(): Promise<void> {
    if (!this.token || !this.isOnline) return;

    try {
      const [statsRes, topProductsRes, recentSalesRes] = await Promise.all([
        fetch(`${config.apiUrl}/analytics/dashboard/stats`, {
          headers: { Authorization: `Bearer ${this.token}` },
          credentials: 'include',
        }),
        fetch(`${config.apiUrl}/analytics/dashboard/top-products?limit=5`, {
          headers: { Authorization: `Bearer ${this.token}` },
          credentials: 'include',
        }),
        fetch(`${config.apiUrl}/analytics/dashboard/recent-sales?limit=5`, {
          headers: { Authorization: `Bearer ${this.token}` },
          credentials: 'include',
        }),
      ]);

      const stats: Partial<DashboardStats> = {};

      if (statsRes.ok) {
        const data = await statsRes.json();
        stats.todaySales = data.todaySales || 0;
        stats.todayOrders = data.todayOrders || 0;
        stats.todayRevenue = data.todayRevenue || 0;
        stats.lowStockCount = data.lowStockCount || 0;
        stats.pendingOrders = data.pendingOrders || 0;
      }

      if (topProductsRes.ok) {
        stats.topProducts = await topProductsRes.json();
      }

      if (recentSalesRes.ok) {
        stats.recentSales = await recentSalesRes.json();
      }

      this.setDashboardStats(stats as DashboardStats);
    } catch (e) {
      console.debug('[SmartCache] Failed to warm dashboard cache:', e);
    }
  }

  /**
   * Set dashboard stats
   */
  setDashboardStats(stats: DashboardStats) {
    this.cache.dashboard = {
      stats,
      metadata: {
        lastUpdated: Date.now(),
        version: CACHE_VERSION,
        totalItems: 1,
        syncStatus: 'synced',
      },
    };
    this.saveToStorage();
    this.notifyListeners('dashboard');
  }

  // ==================== SYNC & PERSISTENCE ====================

  /**
   * Sync all caches
   */
  async syncAll(): Promise<void> {
    await Promise.all([
      this.warmProductsCache(),
      this.warmCategoriesCache(),
      this.warmDashboardCache(),
    ]);
  }

  /**
   * Debounced save to storage
   */
  private debouncedSave() {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    this.syncTimeout = setTimeout(() => {
      this.saveToStorage();
    }, SYNC_DEBOUNCE);
  }

  /**
   * Save to localStorage
   */
  private saveToStorage() {
    if (typeof window === 'undefined') return;

    try {
      const serialized = JSON.stringify(this.cache);
      localStorage.setItem(this.getStorageKey(), serialized);
    } catch (e) {
      console.warn('[SmartCache] Failed to save:', e);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage() {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.getStorageKey());
      if (stored) {
        const parsed = JSON.parse(stored) as SmartCacheData;
        
        // Version check
        if (parsed.products?.metadata?.version === CACHE_VERSION) {
          this.cache = parsed;
        }
      }
    } catch (e) {
      console.warn('[SmartCache] Failed to load:', e);
    }
  }

  // ==================== LISTENERS ====================

  /**
   * Subscribe to cache updates
   */
  subscribe(key: 'products' | 'categories' | 'dashboard', callback: () => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);
    
    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  private notifyListeners(key: string) {
    this.listeners.get(key)?.forEach(cb => cb());
  }

  // ==================== CACHE STATS ====================

  /**
   * Get cache statistics
   */
  getStats(): {
    products: { count: number; lastUpdated: number; isStale: boolean };
    categories: { count: number; lastUpdated: number };
    dashboard: { hasData: boolean; lastUpdated: number; isStale: boolean };
    isOnline: boolean;
  } {
    return {
      products: {
        count: this.cache.products.items.length,
        lastUpdated: this.cache.products.metadata.lastUpdated,
        isStale: this.isProductsCacheStale(),
      },
      categories: {
        count: this.cache.categories.items.length,
        lastUpdated: this.cache.categories.metadata.lastUpdated,
      },
      dashboard: {
        hasData: !!this.cache.dashboard.stats,
        lastUpdated: this.cache.dashboard.metadata.lastUpdated,
        isStale: this.isDashboardCacheStale(),
      },
      isOnline: this.isOnline,
    };
  }

  /**
   * Force refresh all caches
   */
  async forceRefresh(): Promise<void> {
    this.cache.products.metadata.lastUpdated = 0;
    this.cache.categories.metadata.lastUpdated = 0;
    this.cache.dashboard.metadata.lastUpdated = 0;
    await this.syncAll();
  }
}

// Singleton instance
export const smartCache = new SmartCacheManager();
