'use client';

import { useState, useEffect, useCallback } from 'react';
import { smartCache, CachedProduct, CachedCategory, DashboardStats } from '@/lib/smart-cache-manager';

/**
 * Hook to access products from smart cache
 */
export function useCachedProducts() {
  const [products, setProducts] = useState<CachedProduct[]>(() => smartCache.getProducts());
  const [isLoading, setIsLoading] = useState(smartCache.isProductsCacheStale());
  const [lastUpdated, setLastUpdated] = useState(smartCache.getStats().products.lastUpdated);

  useEffect(() => {
    // Subscribe to updates
    const unsubscribe = smartCache.subscribe('products', () => {
      setProducts(smartCache.getProducts());
      setLastUpdated(smartCache.getStats().products.lastUpdated);
      setIsLoading(false);
    });

    // Warm cache if stale
    if (smartCache.isProductsCacheStale()) {
      setIsLoading(true);
      smartCache.warmProductsCache();
    }

    return unsubscribe;
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await smartCache.warmProductsCache();
  }, []);

  const searchProducts = useCallback((query: string, limit?: number) => {
    return smartCache.searchProducts(query, limit);
  }, []);

  const getByBarcode = useCallback((barcode: string) => {
    return smartCache.getProductByBarcode(barcode);
  }, []);

  const getBySku = useCallback((sku: string) => {
    return smartCache.getProductBySku(sku);
  }, []);

  return {
    products,
    isLoading,
    lastUpdated,
    refresh,
    searchProducts,
    getByBarcode,
    getBySku,
    isStale: smartCache.isProductsCacheStale(),
  };
}

/**
 * Hook to access categories from smart cache
 */
export function useCachedCategories() {
  const [categories, setCategories] = useState<CachedCategory[]>(() => smartCache.getCategories());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = smartCache.subscribe('categories', () => {
      setCategories(smartCache.getCategories());
      setIsLoading(false);
    });

    if (categories.length === 0) {
      setIsLoading(true);
      smartCache.warmCategoriesCache();
    }

    return unsubscribe;
  }, [categories.length]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await smartCache.warmCategoriesCache();
  }, []);

  return {
    categories,
    isLoading,
    refresh,
  };
}

/**
 * Hook to access dashboard stats from smart cache
 */
export function useCachedDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(() => smartCache.getDashboardStats());
  const [isLoading, setIsLoading] = useState(smartCache.isDashboardCacheStale());
  const [lastUpdated, setLastUpdated] = useState(smartCache.getStats().dashboard.lastUpdated);

  useEffect(() => {
    const unsubscribe = smartCache.subscribe('dashboard', () => {
      setStats(smartCache.getDashboardStats());
      setLastUpdated(smartCache.getStats().dashboard.lastUpdated);
      setIsLoading(false);
    });

    if (smartCache.isDashboardCacheStale()) {
      setIsLoading(true);
      smartCache.warmDashboardCache();
    }

    return unsubscribe;
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await smartCache.warmDashboardCache();
  }, []);

  return {
    stats,
    isLoading,
    lastUpdated,
    refresh,
    isStale: smartCache.isDashboardCacheStale(),
  };
}

/**
 * Hook to get cache statistics
 */
export function useCacheStats() {
  const [stats, setStats] = useState(() => smartCache.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(smartCache.getStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const forceRefresh = useCallback(async () => {
    await smartCache.forceRefresh();
    setStats(smartCache.getStats());
  }, []);

  return {
    ...stats,
    forceRefresh,
  };
}

/**
 * Hook for POS-specific product operations
 */
export function usePOSProducts() {
  const { products, isLoading, searchProducts, getByBarcode, getBySku, refresh } = useCachedProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<CachedProduct[]>([]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredProducts(searchProducts(searchQuery, 50));
    } else {
      setFilteredProducts(products.slice(0, 50));
    }
  }, [searchQuery, products, searchProducts]);

  const findProduct = useCallback((input: string): CachedProduct | undefined => {
    // Try barcode first
    let product = getByBarcode(input);
    if (product) return product;

    // Try SKU
    product = getBySku(input);
    if (product) return product;

    // Try exact name match
    return products.find(p => p.name.toLowerCase() === input.toLowerCase());
  }, [products, getByBarcode, getBySku]);

  return {
    products: filteredProducts,
    allProducts: products,
    isLoading,
    searchQuery,
    setSearchQuery,
    findProduct,
    getByBarcode,
    getBySku,
    refresh,
  };
}
