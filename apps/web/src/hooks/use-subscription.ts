'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api-client';
import { useRefreshEvent, refreshEvents } from '@/lib/refresh-events';

// Cache configuration
const CACHE_KEYS = {
  SUBSCRIPTION: 'smartduka:cache:subscription',
  PLANS: 'smartduka:cache:plans',
  INVOICES: 'smartduka:cache:invoices',
  PENDING_INVOICES: 'smartduka:cache:pending_invoices',
};

const CACHE_TTL = {
  SUBSCRIPTION: 5 * 1000, // 5 seconds - very short cache for instant updates after payments
  PLANS: 30 * 60 * 1000, // 30 minutes (plans rarely change)
  INVOICES: 10 * 1000, // 10 seconds - short cache for payment status updates
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

function getCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    
    if (isExpired) {
      localStorage.removeItem(key);
      return null;
    }
    
    return entry.data;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T, ttl: number): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

function clearCache(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore errors
  }
}

function clearAllSubscriptionCache(): void {
  Object.values(CACHE_KEYS).forEach(clearCache);
}

// Types
export type BillingCycle = 'daily' | 'monthly' | 'annual';

export type SubscriptionStatus = 
  | 'pending_payment'
  | 'trial' 
  | 'active' 
  | 'past_due' 
  | 'suspended' 
  | 'cancelled' 
  | 'expired';

export interface SubscriptionPlan {
  code: string;
  name: string;
  description?: string;
  dailyPrice: number; // Daily subscription price (KES 99 for daily plan)
  monthlyPrice: number;
  annualPrice: number;
  setupPrice: number;
  maxShops: number;
  maxEmployees: number;
  maxProducts: number;
  features: string[];
  setupIncludes: {
    siteSurvey?: boolean;
    stocktake?: boolean;
    setup?: boolean;
    training?: boolean;
    support?: boolean;
    freeMonths?: number;
    optional?: boolean; // If true, setup fee is optional
  };
  badge?: string;
  colorTheme?: string;
  annualSavings: number;
  pricePerMonth: number;
}

export interface Subscription {
  id: string;
  shopId: string;
  planCode: string;
  planName: string;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  currentPrice: number;
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate?: string;
  daysRemaining: number;
  isTrialUsed: boolean;
  trialEndDate?: string;
  autoRenew: boolean;
  numberOfDays?: number; // For daily billing - how many days were purchased
  isTrialExpired?: boolean; // True if trial period has ended
  usage: {
    shops: { current: number; limit: number };
    employees: { current: number; limit: number };
    products: { current: number; limit: number };
  };
  features: string[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: string;
  status: string;
  description: string;
  amount: number;
  discount: number;
  tax: number;
  totalAmount: number;
  currency: string;
  periodStart?: string;
  periodEnd?: string;
  dueDate: string;
  paidAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
  mpesaReceiptNumber?: string;
  createdAt: string;
}

/**
 * Hook to fetch subscription plans (public) - with caching
 */
export function useSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() => {
    // Initialize from cache
    return getCache<SubscriptionPlan[]>(CACHE_KEYS.PLANS) || [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchPlans = useCallback(async (forceRefresh = false) => {
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = getCache<SubscriptionPlan[]>(CACHE_KEYS.PLANS);
      if (cached && cached.length > 0) {
        setPlans(cached);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      const data = await api.get<SubscriptionPlan[]>('/subscriptions/plans');
      setPlans(data);
      setCache(CACHE_KEYS.PLANS, data, CACHE_TTL.PLANS);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchPlans();
    }
  }, [fetchPlans]);

  return { plans, loading, error, refetch: () => fetchPlans(true) };
}

/**
 * Check if user has a valid token (matches auth-context.tsx key)
 */
function hasAuthToken(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(localStorage.getItem('smartduka:token') || sessionStorage.getItem('smartduka:token'));
}

/**
 * Check if current user is a super-admin (platform manager, no shop context)
 * SECURITY: Only use the JWT token as the source of truth - localStorage user data can be stale
 */
function isSuperAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // ONLY check the JWT token - this is the authoritative source
    // localStorage user data can be stale from previous sessions
    const token = localStorage.getItem('smartduka:token');
    if (!token) return false;
    
    const decoded = JSON.parse(atob(token.split('.')[1]));
    
    // Super-admin users have role='super_admin' AND no shopId
    // Regular shop admins have role='admin' AND a shopId
    return decoded?.role === 'super_admin' && !decoded?.shopId;
  } catch {
    return false;
  }
}

/**
 * Hook to manage current subscription - with caching
 */
export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(() => {
    // Initialize from cache
    return getCache<Subscription>(CACHE_KEYS.SUBSCRIPTION);
  });
  const [loading, setLoading] = useState(true);
  // Separate state for background refreshes - prevents flashing during polling
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);
  // Track if initial load is complete
  const initialLoadCompleteRef = useRef(false);

  const fetchSubscription = useCallback(async (forceRefresh = false) => {
    // Skip if no auth token - prevents unnecessary 401 errors
    if (!hasAuthToken()) {
      setLoading(false);
      setSubscription(null);
      initialLoadCompleteRef.current = true;
      return;
    }

    // Skip for super-admin users - they manage the platform, not individual shops
    if (isSuperAdmin()) {
      setLoading(false);
      setSubscription(null);
      setError(null);
      initialLoadCompleteRef.current = true;
      return;
    }

    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = getCache<Subscription>(CACHE_KEYS.SUBSCRIPTION);
      if (cached) {
        setSubscription(cached);
        setLoading(false);
        initialLoadCompleteRef.current = true;
        return;
      }
    }

    try {
      // CRITICAL FIX: Only set loading=true for initial load, not background refreshes
      // This prevents the flashing issue when polling for subscription updates
      if (!initialLoadCompleteRef.current) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);
      const data = await api.get<Subscription | null>('/subscriptions/current');
      
      // Set subscription data if it exists (null is valid response for super-admin)
      if (data !== null && data !== undefined) {
        // Validate that it's not an empty object
        if (typeof data === 'object' && Object.keys(data).length > 0) {
          setSubscription(data);
          setCache(CACHE_KEYS.SUBSCRIPTION, data, CACHE_TTL.SUBSCRIPTION);
        } else {
          setSubscription(null);
          clearCache(CACHE_KEYS.SUBSCRIPTION);
        }
      } else {
        setSubscription(null);
        clearCache(CACHE_KEYS.SUBSCRIPTION);
      }
    } catch (err: any) {
      // 404 means no subscription yet or no shop context (super-admin)
      if (err.statusCode === 404) {
        setSubscription(null);
        clearCache(CACHE_KEYS.SUBSCRIPTION);
        setError(null); // Clear error for expected cases
      } else if (err.statusCode === 401) {
        // Unauthorized - token expired or invalid
        setSubscription(null);
        setError(null);
      } else if (err.statusCode === 403) {
        // Forbidden - user doesn't have shop context (super-admin)
        setSubscription(null);
        setError(null);
      } else {
        setError(err.message || 'Failed to fetch subscription');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      initialLoadCompleteRef.current = true;
    }
  }, []);

  const createSubscription = useCallback(async (planCode: string, billingCycle: BillingCycle = 'monthly') => {
    try {
      const data = await api.post<Subscription>('/subscriptions', {
        planCode,
        billingCycle,
      });
      setSubscription(data);
      return data;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create subscription');
    }
  }, []);

  /**
   * Change subscription plan
   * 
   * For UPGRADES: Returns { requiresPayment: true, invoiceId, pendingUpgrade }
   * The plan is NOT changed until payment is confirmed.
   * 
   * For DOWNGRADES: Changes plan immediately and returns updated subscription.
   */
  const changePlan = useCallback(async (newPlanCode: string, billingCycle?: BillingCycle): Promise<
    Subscription & { requiresPayment?: boolean; invoiceId?: string; pendingUpgrade?: any }
  > => {
    try {
      const data = await api.put<Subscription & { 
        requiresPayment?: boolean; 
        invoiceId?: string; 
        pendingUpgrade?: any;
      }>('/subscriptions/change-plan', {
        newPlanCode,
        billingCycle,
        immediate: true,
      });
      
      // Only update subscription state if plan was actually changed (downgrade)
      // For upgrades, requiresPayment=true means plan hasn't changed yet
      if (!data.requiresPayment) {
        setSubscription(data);
      }
      
      return data;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to change plan');
    }
  }, []);

  /**
   * Get pending upgrade (if any)
   */
  const getPendingUpgrade = useCallback(async () => {
    try {
      return await api.get<any | null>('/subscriptions/pending-upgrade');
    } catch {
      return null;
    }
  }, []);

  /**
   * Cancel pending upgrade
   */
  const cancelPendingUpgrade = useCallback(async () => {
    try {
      await api.delete('/subscriptions/pending-upgrade');
    } catch (err: any) {
      throw new Error(err.message || 'Failed to cancel pending upgrade');
    }
  }, []);

  /**
   * Get cancellation preview - shows what will happen if user cancels
   */
  const getCancellationPreview = useCallback(async () => {
    try {
      return await api.get<{
        currentPlan: string;
        currentPeriodEnd: string;
        daysRemaining: number;
        dataArchiveDate: string;
        dataDeletionDate: string;
        warnings: string[];
      }>('/subscriptions/cancel/preview');
    } catch (err: any) {
      throw new Error(err.message || 'Failed to get cancellation preview');
    }
  }, []);

  /**
   * Cancel subscription with data retention info
   */
  const cancelSubscription = useCallback(async (reason?: string, immediate = false, deleteAccount = false) => {
    try {
      const result = await api.delete<{
        message: string;
        currentPeriodEnd: string;
        dataArchiveDate: string;
        dataDeletionDate: string;
      }>('/subscriptions/cancel', { reason, immediate, deleteAccount });
      await fetchSubscription();
      return result;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to cancel subscription');
    }
  }, [fetchSubscription]);

  /**
   * Request account and data deletion
   */
  const requestAccountDeletion = useCallback(async (confirmation: string) => {
    try {
      return await api.post<{
        success: boolean;
        message: string;
        scheduledDeletionDate?: string;
      }>('/subscriptions/delete-account', { confirmation });
    } catch (err: any) {
      throw new Error(err.message || 'Failed to request account deletion');
    }
  }, []);

  /**
   * Cancel account deletion request
   */
  const cancelAccountDeletion = useCallback(async () => {
    try {
      return await api.delete<{
        success: boolean;
        message: string;
      }>('/subscriptions/delete-account');
    } catch (err: any) {
      throw new Error(err.message || 'Failed to cancel account deletion');
    }
  }, []);

  const reactivateSubscription = useCallback(async () => {
    try {
      const data = await api.post<Subscription>('/subscriptions/reactivate');
      setSubscription(data);
      return data;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to reactivate subscription');
    }
  }, []);

  const toggleAutoRenew = useCallback(async (autoRenew: boolean) => {
    try {
      const result = await api.put<{ success: boolean; autoRenew: boolean; message: string }>(
        '/subscriptions/auto-renew',
        { autoRenew }
      );
      // Update local subscription state
      if (subscription) {
        setSubscription({ ...subscription, autoRenew: result.autoRenew });
        setCache(CACHE_KEYS.SUBSCRIPTION, { ...subscription, autoRenew: result.autoRenew }, CACHE_TTL.SUBSCRIPTION);
      }
      return result;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update auto-renew setting');
    }
  }, [subscription]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchSubscription();
    }
  }, [fetchSubscription]);

  // Force refresh when user returns to the tab (visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Clear cache and force refresh when user returns to tab
        clearCache(CACHE_KEYS.SUBSCRIPTION);
        fetchSubscription(true);
      }
    };

    // Also refresh on window focus (covers more cases)
    const handleFocus = () => {
      clearCache(CACHE_KEYS.SUBSCRIPTION);
      fetchSubscription(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchSubscription]);

  // Aggressive polling when subscription is in payment-pending states
  useEffect(() => {
    if (!subscription) return;

    const isPendingPayment = subscription.status === 'pending_payment' || 
                            subscription.status === 'past_due' ||
                            subscription.status === 'suspended';
    
    if (isPendingPayment) {
      // More aggressive polling (every 3 seconds) for payment-related status changes
      const interval = setInterval(() => {
        clearCache(CACHE_KEYS.SUBSCRIPTION);
        fetchSubscription(true);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [subscription?.status, fetchSubscription]);

  // Listen for refresh events that should trigger subscription refetch (force refresh)
  useRefreshEvent(
    ['subscription:updated', 'subscription:created', 'subscription:reactivated', 'payment:completed'],
    () => {
      clearCache(CACHE_KEYS.SUBSCRIPTION);
      fetchSubscription(true);
    },
    [fetchSubscription]
  );

  return {
    subscription,
    loading,
    isRefreshing,
    error,
    refetch: () => fetchSubscription(true),
    createSubscription,
    changePlan,
    cancelSubscription,
    reactivateSubscription,
    toggleAutoRenew,
    getPendingUpgrade,
    cancelPendingUpgrade,
    getCancellationPreview,
    requestAccountDeletion,
    cancelAccountDeletion,
  };
}

/**
 * Hook to manage billing history - with caching
 */
export function useBillingHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    return getCache<Invoice[]>(CACHE_KEYS.INVOICES) || [];
  });
  const [pendingInvoices, setPendingInvoices] = useState<Invoice[]>(() => {
    return getCache<Invoice[]>(CACHE_KEYS.PENDING_INVOICES) || [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchHistory = useCallback(async (limit = 20, skip = 0, forceRefresh = false) => {
    // Skip if no auth token - prevents unnecessary 401 errors
    if (!hasAuthToken()) {
      setLoading(false);
      setInvoices([]);
      setPendingInvoices([]);
      return;
    }

    // Skip for super-admin users - they manage the platform, not individual shops
    if (isSuperAdmin()) {
      setLoading(false);
      setInvoices([]);
      setPendingInvoices([]);
      setError(null);
      return;
    }

    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cachedInvoices = getCache<Invoice[]>(CACHE_KEYS.INVOICES);
      const cachedPending = getCache<Invoice[]>(CACHE_KEYS.PENDING_INVOICES);
      if (cachedInvoices && cachedPending) {
        setInvoices(cachedInvoices);
        setPendingInvoices(cachedPending);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      const [history, pending] = await Promise.all([
        api.get<Invoice[]>('/subscriptions/billing/history', { limit, skip }),
        api.get<Invoice[]>('/subscriptions/billing/pending'),
      ]);
      setInvoices(history);
      setPendingInvoices(pending);
      setCache(CACHE_KEYS.INVOICES, history, CACHE_TTL.INVOICES);
      setCache(CACHE_KEYS.PENDING_INVOICES, pending, CACHE_TTL.INVOICES);
    } catch (err: any) {
      if (err.statusCode === 401 || err.statusCode === 404 || err.statusCode === 403) {
        // Unauthorized, not found, or forbidden - expected for super-admin
        setInvoices([]);
        setPendingInvoices([]);
        setError(null);
      } else {
        setError(err.message || 'Failed to fetch billing history');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const initiatePayment = useCallback(async (invoiceId: string, phoneNumber: string) => {
    try {
      const result = await api.post<{
        success: boolean;
        message: string;
        checkoutRequestId?: string;
        error?: string;
      }>('/subscriptions/payments/mpesa/initiate', {
        invoiceId,
        phoneNumber,
      });
      return result;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to initiate payment');
    }
  }, []);

  const getManualPaymentInstructions = useCallback(async (invoiceId: string) => {
    try {
      const result = await api.get<{
        success: boolean;
        phoneNumber?: string;
        amount?: number;
        reference?: string;
        instructions?: string[];
        message?: string;
      }>(`/subscriptions/payments/manual-instructions/${invoiceId}`);
      return result;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to get payment instructions');
    }
  }, []);

  const confirmManualPayment = useCallback(async (
    invoiceId: string, 
    mpesaReceiptNumber: string, 
    paidAmount: number
  ) => {
    try {
      const result = await api.post<{
        success: boolean;
        message: string;
        mpesaReceiptNumber?: string;
      }>('/subscriptions/payments/manual/confirm', {
        invoiceId,
        mpesaReceiptNumber,
        paidAmount,
      });
      return result;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to confirm payment');
    }
  }, []);

  const checkStkStatus = useCallback(async (checkoutRequestId: string) => {
    try {
      const result = await api.get<{
        success: boolean;
        resultCode?: number;
        resultDesc?: string;
      }>(`/subscriptions/payments/stk-status/${checkoutRequestId}`);
      return result;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to check payment status');
    }
  }, []);

  const getPaymentSummary = useCallback(async (invoiceId: string) => {
    try {
      const result = await api.get<{
        success: boolean;
        amount?: number;
        formattedAmount?: string;
        recipient?: string;
        recipientName?: string;
        reference?: string;
        stkPushInstructions?: string[];
        sendMoneyInstructions?: string[];
        message?: string;
      }>(`/subscriptions/payments/summary/${invoiceId}`);
      return result;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to get payment summary');
    }
  }, []);

  const validateReceipt = useCallback(async (receiptNumber: string) => {
    try {
      const result = await api.post<{
        valid: boolean;
        message?: string;
      }>('/subscriptions/payments/validate-receipt', { receiptNumber });
      return result;
    } catch (err: any) {
      return { valid: false, message: err.message || 'Validation failed' };
    }
  }, []);

  const checkPaymentStatus = useCallback(async (invoiceId: string) => {
    try {
      const result = await api.get<{
        invoiceId: string;
        status: string;
        paidAt?: string;
        paymentReference?: string;
      }>(`/subscriptions/payments/status/${invoiceId}`);
      return result;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to check payment status');
    }
  }, []);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchHistory();
    }
  }, [fetchHistory]);

  // Aggressive polling when there are pending invoices
  useEffect(() => {
    if (pendingInvoices.length > 0) {
      // More aggressive polling (every 5 seconds) when there are pending invoices
      const interval = setInterval(() => {
        clearCache(CACHE_KEYS.INVOICES);
        clearCache(CACHE_KEYS.PENDING_INVOICES);
        fetchHistory(20, 0, true);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [pendingInvoices.length, fetchHistory]);

  // Listen for refresh events that should trigger billing refetch (force refresh)
  useRefreshEvent(
    ['payment:completed', 'invoice:created', 'invoice:paid', 'subscription:updated'],
    () => {
      clearCache(CACHE_KEYS.INVOICES);
      clearCache(CACHE_KEYS.PENDING_INVOICES);
      fetchHistory(20, 0, true);
    },
    [fetchHistory]
  );

  return {
    invoices,
    pendingInvoices,
    loading,
    error,
    refetch: () => fetchHistory(20, 0, true),
    initiatePayment,
    getManualPaymentInstructions,
    confirmManualPayment,
    checkStkStatus,
    getPaymentSummary,
    validateReceipt,
    checkPaymentStatus,
  };
}

/**
 * Hook to check resource limits
 */
export function useSubscriptionLimits() {
  const checkLimit = useCallback(async (resource: 'shops' | 'employees' | 'products', increment = 1) => {
    try {
      const result = await api.get<{
        allowed: boolean;
        current: number;
        limit: number;
        message?: string;
      }>(`/subscriptions/limits/${resource}`, { increment });
      return result;
    } catch (err: any) {
      return {
        allowed: false,
        current: 0,
        limit: 0,
        message: err.message || 'Failed to check limit',
      };
    }
  }, []);

  return { checkLimit };
}
