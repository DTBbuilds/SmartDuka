'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useRefreshEvent, refreshEvents } from '@/lib/refresh-events';

// Types
export type BillingCycle = 'monthly' | 'annual';

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
 * Hook to fetch subscription plans (public)
 */
export function useSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<SubscriptionPlan[]>('/subscriptions/plans');
      setPlans(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return { plans, loading, error, refetch: fetchPlans };
}

/**
 * Check if user has a valid token (matches auth-context.tsx key)
 */
function hasAuthToken(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(localStorage.getItem('smartduka:token') || sessionStorage.getItem('smartduka:token'));
}

/**
 * Hook to manage current subscription
 */
export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    // Skip if no auth token - prevents unnecessary 401 errors
    if (!hasAuthToken()) {
      setLoading(false);
      setSubscription(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await api.get<Subscription>('/subscriptions/current');
      setSubscription(data);
    } catch (err: any) {
      // 404 means no subscription yet
      if (err.statusCode === 404) {
        setSubscription(null);
      } else if (err.statusCode === 401) {
        // Unauthorized - token expired or invalid
        setSubscription(null);
      } else {
        setError(err.message || 'Failed to fetch subscription');
      }
    } finally {
      setLoading(false);
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

  const changePlan = useCallback(async (newPlanCode: string, billingCycle?: BillingCycle) => {
    try {
      const data = await api.put<Subscription>('/subscriptions/change-plan', {
        newPlanCode,
        billingCycle,
        immediate: true,
      });
      setSubscription(data);
      return data;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to change plan');
    }
  }, []);

  const cancelSubscription = useCallback(async (reason?: string, immediate = false) => {
    try {
      await api.delete('/subscriptions/cancel', { reason, immediate });
      await fetchSubscription();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to cancel subscription');
    }
  }, [fetchSubscription]);

  const reactivateSubscription = useCallback(async () => {
    try {
      const data = await api.post<Subscription>('/subscriptions/reactivate');
      setSubscription(data);
      return data;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to reactivate subscription');
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Listen for refresh events that should trigger subscription refetch
  useRefreshEvent(
    ['subscription:updated', 'subscription:created', 'subscription:reactivated', 'payment:completed'],
    () => {
      fetchSubscription();
    },
    [fetchSubscription]
  );

  return {
    subscription,
    loading,
    error,
    refetch: fetchSubscription,
    createSubscription,
    changePlan,
    cancelSubscription,
    reactivateSubscription,
  };
}

/**
 * Hook to manage billing history
 */
export function useBillingHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (limit = 20, skip = 0) => {
    // Skip if no auth token - prevents unnecessary 401 errors
    if (!hasAuthToken()) {
      setLoading(false);
      setInvoices([]);
      setPendingInvoices([]);
      return;
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
    } catch (err: any) {
      if (err.statusCode === 401) {
        // Unauthorized - token expired or invalid
        setInvoices([]);
        setPendingInvoices([]);
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
    fetchHistory();
  }, [fetchHistory]);

  // Listen for refresh events that should trigger billing refetch
  useRefreshEvent(
    ['payment:completed', 'invoice:created', 'invoice:paid', 'subscription:updated'],
    () => {
      fetchHistory();
    },
    [fetchHistory]
  );

  return {
    invoices,
    pendingInvoices,
    loading,
    error,
    refetch: fetchHistory,
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
