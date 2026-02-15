'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { dashboardCache, posCache, userDataCache, cacheKeys } from '@/lib/data-cache';
import { useAuth } from '@/lib/auth-context';
import { config } from '@/lib/config';

interface UseCachedDataOptions<T> {
  cacheKey: string;
  fetcher: () => Promise<T>;
  ttl?: number; // Time to live in milliseconds
  cacheType?: 'dashboard' | 'pos' | 'user';
  enabled?: boolean;
  refetchOnMount?: boolean;
  refetchInterval?: number; // Auto-refetch interval in milliseconds
}

interface UseCachedDataResult<T> {
  data: T | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<void>;
  invalidate: () => void;
  lastUpdated: Date | null;
  isFromCache: boolean;
}

/**
 * Hook for fetching and caching data with automatic cache management
 */
export function useCachedData<T>({
  cacheKey,
  fetcher,
  ttl,
  cacheType = 'dashboard',
  enabled = true,
  refetchOnMount = false,
  refetchInterval,
}: UseCachedDataOptions<T>): UseCachedDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const mountedRef = useRef(true);

  const cache = cacheType === 'dashboard' 
    ? dashboardCache 
    : cacheType === 'pos' 
      ? posCache 
      : userDataCache;

  const fetchData = useCallback(async (force = false) => {
    if (!enabled) return;

    // Check cache first (unless forcing refresh)
    if (!force) {
      const cached = cache.get<T>(cacheKey);
      if (cached !== null) {
        setData(cached);
        setIsLoading(false);
        setIsFromCache(true);
        const age = cache.getAge(cacheKey);
        if (age !== null) {
          setLastUpdated(new Date(Date.now() - age));
        }
        return;
      }
    }

    // Fetch fresh data
    try {
      setIsRefreshing(force && data !== null);
      if (data === null) setIsLoading(true);
      setError(null);

      const freshData = await fetcher();

      if (mountedRef.current) {
        setData(freshData);
        cache.set(cacheKey, freshData, ttl);
        setLastUpdated(new Date());
        setIsFromCache(false);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message || 'Failed to fetch data');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [cacheKey, fetcher, ttl, enabled, cache, data]);

  const invalidate = useCallback(() => {
    cache.invalidate(cacheKey);
    setData(null);
    setLastUpdated(null);
  }, [cacheKey, cache]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    fetchData(refetchOnMount);
    return () => {
      mountedRef.current = false;
    };
  }, [cacheKey, enabled]);

  // Auto-refetch interval
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const interval = setInterval(() => {
      fetchData(true);
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [refetchInterval, enabled, fetchData]);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    refetch: fetchData,
    invalidate,
    lastUpdated,
    isFromCache,
  };
}

/**
 * Hook for dashboard stats with caching
 */
export function useDashboardStats(shopId: string | undefined) {
  const { token } = useAuth();

  return useCachedData({
    cacheKey: cacheKeys.dashboardStats(shopId || ''),
    cacheType: 'dashboard',
    ttl: 2 * 60 * 1000, // 2 minutes
    enabled: !!shopId && !!token,
    fetcher: async () => {
      const res = await fetch(`${config.apiUrl}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch dashboard stats');
      return res.json();
    },
  });
}

/**
 * Hook for dashboard sales data with caching
 */
export function useDashboardSales(shopId: string | undefined, period: string = 'today') {
  const { token } = useAuth();

  return useCachedData({
    cacheKey: cacheKeys.dashboardSales(shopId || '', period),
    cacheType: 'dashboard',
    ttl: 2 * 60 * 1000, // 2 minutes
    enabled: !!shopId && !!token,
    fetcher: async () => {
      const res = await fetch(`${config.apiUrl}/dashboard/sales?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch sales data');
      return res.json();
    },
  });
}

/**
 * Hook for POS products with caching
 */
export function usePosProducts(shopId: string | undefined, branchId?: string) {
  const { token } = useAuth();

  return useCachedData({
    cacheKey: cacheKeys.posProducts(shopId || '', branchId),
    cacheType: 'pos',
    ttl: 5 * 60 * 1000, // 5 minutes
    enabled: !!shopId && !!token,
    fetcher: async () => {
      const params = new URLSearchParams();
      if (branchId) params.append('branchId', branchId);
      
      const res = await fetch(`${config.apiUrl}/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
  });
}

/**
 * Hook for POS categories with caching
 */
export function usePosCategories(shopId: string | undefined) {
  const { token } = useAuth();

  return useCachedData({
    cacheKey: cacheKeys.posCategories(shopId || ''),
    cacheType: 'pos',
    ttl: 10 * 60 * 1000, // 10 minutes (categories change less often)
    enabled: !!shopId && !!token,
    fetcher: async () => {
      const res = await fetch(`${config.apiUrl}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch categories');
      return res.json();
    },
  });
}

/**
 * Hook for recent sales with caching
 */
export function useRecentSales(shopId: string | undefined, limit: number = 10) {
  const { token } = useAuth();

  return useCachedData({
    cacheKey: cacheKeys.dashboardRecentSales(shopId || ''),
    cacheType: 'dashboard',
    ttl: 1 * 60 * 1000, // 1 minute (sales update frequently)
    enabled: !!shopId && !!token,
    fetcher: async () => {
      const res = await fetch(`${config.apiUrl}/sales?limit=${limit}&sort=-createdAt`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch recent sales');
      return res.json();
    },
  });
}

/**
 * Hook for top products with caching
 */
export function useTopProducts(shopId: string | undefined, limit: number = 5) {
  const { token } = useAuth();

  return useCachedData({
    cacheKey: cacheKeys.dashboardTopProducts(shopId || ''),
    cacheType: 'dashboard',
    ttl: 5 * 60 * 1000, // 5 minutes
    enabled: !!shopId && !!token,
    fetcher: async () => {
      const res = await fetch(`${config.apiUrl}/dashboard/top-products?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch top products');
      return res.json();
    },
  });
}
