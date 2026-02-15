'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { config } from '@/lib/config';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface UsePaginatedDataOptions<T> {
  endpoint: string;
  initialPage?: number;
  initialLimit?: number;
  filters?: Record<string, string | number | boolean | undefined>;
  enabled?: boolean;
  onSuccess?: (data: PaginatedResponse<T>) => void;
  onError?: (error: Error) => void;
}

export interface UsePaginatedDataReturn<T> {
  data: T[];
  meta: PaginationMeta | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  page: number;
  limit: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  refresh: () => void;
  setFilters: (filters: Record<string, string | number | boolean | undefined>) => void;
}

export function usePaginatedData<T>({
  endpoint,
  initialPage = 1,
  initialLimit = 20,
  filters: initialFilters = {},
  enabled = true,
  onSuccess,
  onError,
}: UsePaginatedDataOptions<T>): UsePaginatedDataReturn<T> {
  const { token } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [filters, setFilters] = useState(initialFilters);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !token) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      // Build query string
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          params.set(key, String(value));
        }
      });

      const url = `${config.apiUrl}${endpoint}?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: abortControllerRef.current.signal,
      });

      // Safely parse JSON - handle empty responses
      const text = await response.text();
      const result = text ? JSON.parse(text) : {};

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Handle both paginated and non-paginated responses
      if (result.data && result.meta) {
        setData(result.data);
        setMeta(result.meta);
        onSuccess?.(result);
      } else if (Array.isArray(result)) {
        // Legacy non-paginated response
        setData(result);
        setMeta({
          total: result.length,
          page: 1,
          limit: result.length,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        });
      } else {
        setData([]);
        setMeta(null);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Ignore abort errors
      }
      const error = err instanceof Error ? err : new Error('Unknown error');
      setIsError(true);
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, page, limit, filters, token, enabled, onSuccess, onError]);

  useEffect(() => {
    fetchData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  const nextPage = useCallback(() => {
    if (meta?.hasNextPage) {
      setPage((p) => p + 1);
    }
  }, [meta?.hasNextPage]);

  const prevPage = useCallback(() => {
    if (meta?.hasPrevPage) {
      setPage((p) => p - 1);
    }
  }, [meta?.hasPrevPage]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const updateFilters = useCallback((newFilters: Record<string, string | number | boolean | undefined>) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  }, []);

  return {
    data,
    meta,
    isLoading,
    isError,
    error,
    page,
    limit,
    setPage,
    setLimit: (newLimit: number) => {
      setLimit(newLimit);
      setPage(1); // Reset to first page when limit changes
    },
    nextPage,
    prevPage,
    refresh,
    setFilters: updateFilters,
  };
}

/**
 * Hook for infinite scroll / load more pagination
 */
export function useInfiniteData<T>({
  endpoint,
  initialLimit = 20,
  filters: initialFilters = {},
  enabled = true,
}: Omit<UsePaginatedDataOptions<T>, 'initialPage'>) {
  const { token } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filters, setFilters] = useState(initialFilters);

  const fetchPage = useCallback(async (pageNum: number, append: boolean = false) => {
    if (!enabled || !token) return;

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const params = new URLSearchParams();
      params.set('page', String(pageNum));
      params.set('limit', String(initialLimit));
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          params.set(key, String(value));
        }
      });

      const url = `${config.apiUrl}${endpoint}?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Safely parse JSON - handle empty responses
      const text = await response.text();
      const result = text ? JSON.parse(text) : {};

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      if (result.data && result.meta) {
        if (append) {
          setData((prev) => [...prev, ...result.data]);
        } else {
          setData(result.data);
        }
        setHasMore(result.meta.hasNextPage);
        setPage(pageNum);
      } else if (Array.isArray(result)) {
        if (append) {
          setData((prev) => [...prev, ...result]);
        } else {
          setData(result);
        }
        setHasMore(result.length === initialLimit);
        setPage(pageNum);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [endpoint, initialLimit, filters, token, enabled]);

  useEffect(() => {
    fetchPage(1, false);
  }, [filters, enabled]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchPage(page + 1, true);
    }
  }, [fetchPage, page, isLoadingMore, hasMore]);

  const refresh = useCallback(() => {
    setPage(1);
    fetchPage(1, false);
  }, [fetchPage]);

  const updateFilters = useCallback((newFilters: Record<string, string | number | boolean | undefined>) => {
    setFilters(newFilters);
    setPage(1);
    setData([]);
  }, []);

  return {
    data,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    refresh,
    setFilters: updateFilters,
  };
}
