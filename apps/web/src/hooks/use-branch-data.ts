'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useBranch } from '@/lib/branch-context';
import { config } from '@/lib/config';

interface UseBranchDataOptions<T> {
  endpoint: string;
  defaultValue?: T;
  transform?: (data: any) => T;
  enabled?: boolean;
}

interface UseBranchDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  branchId: string | undefined;
}

/**
 * Hook to fetch data with automatic branch filtering
 * Automatically refetches when branch changes
 */
export function useBranchData<T>({
  endpoint,
  defaultValue,
  transform,
  enabled = true,
}: UseBranchDataOptions<T>): UseBranchDataResult<T> {
  const { token } = useAuth();
  const { currentBranch } = useBranch();
  const [data, setData] = useState<T | null>(defaultValue ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const branchId = currentBranch?._id;

  const fetchData = useCallback(async () => {
    if (!token || !enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build URL with branch filter
      const separator = endpoint.includes('?') ? '&' : '?';
      const url = branchId
        ? `${config.apiUrl}${endpoint}${separator}branchId=${branchId}`
        : `${config.apiUrl}${endpoint}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const responseData = await res.json();
        const transformedData = transform ? transform(responseData) : responseData;
        setData(transformedData);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.message || `Failed to fetch data: ${res.status}`);
        setData(defaultValue ?? null);
      }
    } catch (err: any) {
      console.error(`Failed to fetch ${endpoint}:`, err);
      setError(err.message || 'Failed to fetch data');
      setData(defaultValue ?? null);
    } finally {
      setLoading(false);
    }
  }, [token, endpoint, branchId, enabled, transform, defaultValue]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for branch change events for immediate refetch
  useEffect(() => {
    const handleBranchChange = () => {
      fetchData();
    };

    window.addEventListener('branch-change', handleBranchChange);
    return () => window.removeEventListener('branch-change', handleBranchChange);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    branchId,
  };
}

/**
 * Build API URL with branch filter
 */
export function buildBranchUrl(baseEndpoint: string, branchId?: string): string {
  if (!branchId) return `${config.apiUrl}${baseEndpoint}`;
  
  const separator = baseEndpoint.includes('?') ? '&' : '?';
  return `${config.apiUrl}${baseEndpoint}${separator}branchId=${branchId}`;
}

/**
 * Hook to get fetch options with branch filter
 */
export function useBranchFetch() {
  const { token } = useAuth();
  const { currentBranch } = useBranch();

  const fetchWithBranch = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const branchId = currentBranch?._id;
      const separator = endpoint.includes('?') ? '&' : '?';
      const url = branchId
        ? `${config.apiUrl}${endpoint}${separator}branchId=${branchId}`
        : `${config.apiUrl}${endpoint}`;

      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });
    },
    [token, currentBranch]
  );

  const postWithBranch = useCallback(
    async (endpoint: string, body: any, options: RequestInit = {}) => {
      const branchId = currentBranch?._id;
      const payload = branchId ? { ...body, branchId } : body;

      return fetch(`${config.apiUrl}${endpoint}`, {
        method: 'POST',
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    },
    [token, currentBranch]
  );

  return {
    fetchWithBranch,
    postWithBranch,
    currentBranchId: currentBranch?._id,
  };
}
