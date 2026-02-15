'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { config } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';

export interface Customer {
  _id: string;
  id: string;
  shopId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  totalPurchases: number;
  totalSpent: number;
  lastPurchaseDate?: string;
  lastVisit?: string;
  segment: 'vip' | 'regular' | 'inactive';
  preferences?: {
    favoriteProducts?: string[];
    preferredPaymentMethod?: string;
    notes?: string;
  };
  contactPreferences?: {
    sms: boolean;
    email: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyAccount {
  _id: string;
  shopId: string;
  customerId: string;
  programId: string;
  totalPoints: number;
  availablePoints: number;
  redeemedPoints: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  lastEarnedAt?: string;
  lastRedeemedAt?: string;
  referralCode?: string;
  referralCount: number;
}

export interface CustomerWithLoyalty extends Customer {
  loyalty?: LoyaltyAccount;
}

export interface PointsPreview {
  pointsToEarn: number;
  currentPoints: number;
  newBalance: number;
  currentTier: string;
  nextTier: string | null;
  pointsToNextTier: number;
  tierProgress: number;
}

interface CreateCustomerDto {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  enrollInLoyalty?: boolean;
}

interface UseCustomersReturn {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  searchCustomers: (query: string) => Promise<Customer[]>;
  getCustomer: (id: string) => Promise<CustomerWithLoyalty | null>;
  createCustomer: (data: CreateCustomerDto) => Promise<Customer | null>;
  quickRegister: (name: string, phone: string) => Promise<Customer | null>;
  getCustomerLoyalty: (customerId: string) => Promise<LoyaltyAccount | null>;
  getPointsPreview: (customerId: string, amount: number) => Promise<PointsPreview | null>;
  getRecentCustomers: () => Promise<Customer[]>;
  refetch: () => void;
}

// Simple in-memory cache
const customerCache = new Map<string, { data: Customer[]; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export function useCustomers(): UseCustomersReturn {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchCustomers = useCallback(async (forceRefresh = false) => {
    if (!token) return;

    const cacheKey = 'customers:list';
    const cached = customerCache.get(cacheKey);
    
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setCustomers(cached.data);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${config.apiUrl}/customers?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch customers');
      }

      const data = await res.json();
      const customerList = data.data || data || [];
      
      setCustomers(customerList);
      customerCache.set(cacheKey, { data: customerList, timestamp: Date.now() });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!fetchedRef.current && token) {
      fetchedRef.current = true;
      fetchCustomers();
    }
  }, [fetchCustomers, token]);

  const searchCustomers = useCallback(async (query: string): Promise<Customer[]> => {
    if (!token || !query.trim()) return [];

    try {
      const res = await fetch(
        `${config.apiUrl}/customers/search?q=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) return [];

      const data = await res.json();
      return data.data || data || [];
    } catch {
      return [];
    }
  }, [token]);

  const getCustomer = useCallback(async (id: string): Promise<CustomerWithLoyalty | null> => {
    if (!token || !id) return null;

    try {
      const res = await fetch(`${config.apiUrl}/customers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return null;

      const customer = await res.json();

      // Fetch loyalty account
      try {
        const loyaltyRes = await fetch(
          `${config.apiUrl}/loyalty/account/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (loyaltyRes.ok) {
          const loyaltyText = await loyaltyRes.text();
          const loyalty = loyaltyText ? JSON.parse(loyaltyText) : null;
          if (loyalty) {
            return { ...customer, loyalty };
          }
        }
      } catch {
        // Loyalty fetch failed, return customer without loyalty
      }

      return customer;
    } catch {
      return null;
    }
  }, [token]);

  const createCustomer = useCallback(async (data: CreateCustomerDto): Promise<Customer | null> => {
    if (!token) return null;

    try {
      const res = await fetch(`${config.apiUrl}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create customer');
      }

      const customer = await res.json();
      
      // Invalidate cache
      customerCache.clear();
      fetchCustomers(true);

      // Auto-enroll in loyalty program if requested
      if (data.enrollInLoyalty && customer._id) {
        try {
          await fetch(`${config.apiUrl}/loyalty/auto-enroll/${customer._id}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } catch {
          // Enrollment failed, but customer was created
        }
      }

      return customer;
    } catch {
      return null;
    }
  }, [token, fetchCustomers]);

  const quickRegister = useCallback(async (name: string, phone: string): Promise<Customer | null> => {
    return createCustomer({ name, phone, enrollInLoyalty: true });
  }, [createCustomer]);

  const getCustomerLoyalty = useCallback(async (customerId: string): Promise<LoyaltyAccount | null> => {
    if (!token || !customerId) return null;

    try {
      const res = await fetch(
        `${config.apiUrl}/loyalty/account/${customerId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) return null;

      const text = await res.text();
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }, [token]);

  const getPointsPreview = useCallback(async (customerId: string, amount: number): Promise<PointsPreview | null> => {
    if (!token || !customerId || amount <= 0) return null;

    try {
      const res = await fetch(
        `${config.apiUrl}/loyalty/points-preview?customerId=${customerId}&amount=${amount}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) return null;

      const text = await res.text();
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }, [token]);

  const getRecentCustomers = useCallback(async (): Promise<Customer[]> => {
    if (!token) return [];

    try {
      const res = await fetch(
        `${config.apiUrl}/customers?limit=5`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) return [];

      const data = await res.json();
      const customerList = data.data || data || [];
      return customerList.slice(0, 5);
    } catch {
      return [];
    }
  }, [token]);

  return {
    customers,
    loading,
    error,
    searchCustomers,
    getCustomer,
    createCustomer,
    quickRegister,
    getCustomerLoyalty,
    getPointsPreview,
    getRecentCustomers,
    refetch: () => fetchCustomers(true),
  };
}

/**
 * Hook to search customers with debouncing
 */
export function useCustomerSearch(debounceMs = 300) {
  const { searchCustomers } = useCustomers();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!searchQuery.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchCustomers(searchQuery);
      setResults(results);
      setSearching(false);
    }, debounceMs);
  }, [searchCustomers, debounceMs]);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setSearching(false);
  }, []);

  return {
    query,
    results,
    searching,
    search,
    clear,
  };
}
