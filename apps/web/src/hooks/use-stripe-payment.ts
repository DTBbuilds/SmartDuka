'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { useAuth } from '@/lib/auth-context';
import { config } from '../lib/config';

/**
 * Stripe Payment Status
 */
export type StripePaymentStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled';

/**
 * Payment Intent Response
 */
export interface PaymentIntentResponse {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
}

/**
 * Stripe Payment Hook
 * 
 * Mobile-first Stripe payment integration for SmartDuka.
 * Supports POS payments, subscription payments, and saved payment methods.
 */
export function useStripePayment(options?: {
  onSuccess?: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
}) {
  const { token } = useAuth();
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [status, setStatus] = useState<StripePaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const elementsRef = useRef<StripeElements | null>(null);

  /**
   * Initialize Stripe
   */
  useEffect(() => {
    const initStripe = async () => {
      try {
        setStatus('loading');

        // Get Stripe config from backend
        const response = await fetch(`${config.apiUrl}/stripe/config`);
        
        // Check if response is ok and has content
        if (!response.ok) {
          console.warn('Stripe config endpoint returned error:', response.status);
          setIsConfigured(false);
          setStatus('idle');
          return;
        }

        const text = await response.text();
        if (!text) {
          console.warn('Stripe config endpoint returned empty response');
          setIsConfigured(false);
          setStatus('idle');
          return;
        }

        const data = JSON.parse(text);

        if (!data.isConfigured || !data.publishableKey) {
          setIsConfigured(false);
          setStatus('idle');
          return;
        }

        const stripeInstance = await loadStripe(data.publishableKey);
        setStripe(stripeInstance);
        setIsConfigured(true);
        setStatus('idle');
      } catch (err: any) {
        console.error('Failed to initialize Stripe:', err);
        setIsConfigured(false);
        setStatus('idle');
      }
    };

    initStripe();
  }, []);

  /**
   * Create payment intent for POS sale
   */
  const createPOSPayment = useCallback(
    async (params: {
      orderId: string;
      orderNumber: string;
      amount: number;
      currency?: string;
      customerEmail?: string;
      customerName?: string;
      description?: string;
    }): Promise<PaymentIntentResponse | null> => {
      if (!token) {
        setError('Authentication required');
        return null;
      }

      setStatus('loading');
      setError(null);

      try {
        const response = await fetch(`${config.apiUrl}/stripe/pos/create-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(params),
        });

        const text = await response.text();
        if (!text) {
          throw new Error('Empty response from server');
        }
        
        const data = JSON.parse(text);

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to create payment');
        }

        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
        setStatus('ready');

        return {
          paymentIntentId: data.paymentIntentId,
          clientSecret: data.clientSecret,
          amount: data.amount,
          currency: data.currency,
        };
      } catch (err: any) {
        setError(err.message);
        setStatus('failed');
        options?.onError?.(err.message);
        return null;
      }
    },
    [token, options],
  );

  /**
   * Create payment intent for subscription
   */
  const createSubscriptionPayment = useCallback(
    async (params: {
      invoiceId: string;
      invoiceNumber: string;
      amount: number;
      currency?: string;
      description?: string;
    }): Promise<PaymentIntentResponse | null> => {
      if (!token) {
        setError('Authentication required');
        return null;
      }

      setStatus('loading');
      setError(null);

      try {
        const response = await fetch(`${config.apiUrl}/stripe/subscription/create-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(params),
        });

        const text = await response.text();
        if (!text) {
          throw new Error('Empty response from server');
        }
        
        const data = JSON.parse(text);

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to create payment');
        }

        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
        setStatus('ready');

        return {
          paymentIntentId: data.paymentIntentId,
          clientSecret: data.clientSecret,
          amount: data.amount,
          currency: data.currency,
        };
      } catch (err: any) {
        setError(err.message);
        setStatus('failed');
        options?.onError?.(err.message);
        return null;
      }
    },
    [token, options],
  );

  /**
   * Confirm payment with Stripe Elements
   */
  const confirmPayment = useCallback(
    async (elements: StripeElements): Promise<boolean> => {
      if (!stripe || !clientSecret) {
        setError('Payment not initialized');
        return false;
      }

      setStatus('processing');
      setError(null);

      try {
        const { error: submitError } = await elements.submit();
        if (submitError) {
          throw new Error(submitError.message);
        }

        const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
          elements,
          clientSecret,
          confirmParams: {
            return_url: `${window.location.origin}/payment/success`,
          },
          redirect: 'if_required',
        });

        if (confirmError) {
          throw new Error(confirmError.message);
        }

        if (paymentIntent?.status === 'succeeded') {
          setStatus('succeeded');
          options?.onSuccess?.(paymentIntent.id);
          return true;
        } else if (paymentIntent?.status === 'processing') {
          setStatus('processing');
          return true;
        } else {
          throw new Error('Payment was not completed');
        }
      } catch (err: any) {
        setError(err.message);
        setStatus('failed');
        options?.onError?.(err.message);
        return false;
      }
    },
    [stripe, clientSecret, options],
  );

  /**
   * Check payment status
   */
  const checkPaymentStatus = useCallback(
    async (intentId: string): Promise<string | null> => {
      if (!token) return null;

      try {
        const response = await fetch(`${config.apiUrl}/stripe/payment/${intentId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (data.success) {
          return data.payment.status;
        }

        return null;
      } catch (err) {
        console.error('Failed to check payment status:', err);
        return null;
      }
    },
    [token],
  );

  /**
   * Reset payment state
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setClientSecret(null);
    setPaymentIntentId(null);
    elementsRef.current = null;
  }, []);

  return {
    // State
    stripe,
    status,
    error,
    clientSecret,
    paymentIntentId,
    isConfigured,

    // Actions
    createPOSPayment,
    createSubscriptionPayment,
    confirmPayment,
    checkPaymentStatus,
    reset,

    // Computed
    isLoading: status === 'loading',
    isReady: status === 'ready',
    isProcessing: status === 'processing',
    isSucceeded: status === 'succeeded',
    isFailed: status === 'failed',
  };
}

/**
 * Hook for managing saved payment methods
 */
export function useStripePaymentMethods() {
  const { token } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch saved payment methods
   */
  const fetchPaymentMethods = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${config.apiUrl}/stripe/customer/payment-methods`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setPaymentMethods(data.paymentMethods);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  /**
   * Create setup intent for adding new payment method
   */
  const createSetupIntent = useCallback(async (): Promise<string | null> => {
    if (!token) return null;

    try {
      const response = await fetch(`${config.apiUrl}/stripe/customer/setup-intent`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        return data.clientSecret;
      }

      return null;
    } catch (err) {
      console.error('Failed to create setup intent:', err);
      return null;
    }
  }, [token]);

  /**
   * Remove a payment method
   */
  const removePaymentMethod = useCallback(
    async (paymentMethodId: string): Promise<boolean> => {
      if (!token) return false;

      try {
        const response = await fetch(`${config.apiUrl}/stripe/customer/detach-payment-method`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ paymentMethodId }),
        });

        const data = await response.json();

        if (data.success) {
          setPaymentMethods((prev) => prev.filter((pm) => pm.id !== paymentMethodId));
          return true;
        }

        return false;
      } catch (err) {
        console.error('Failed to remove payment method:', err);
        return false;
      }
    },
    [token],
  );

  // Fetch payment methods on mount
  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  return {
    paymentMethods,
    loading,
    error,
    fetchPaymentMethods,
    createSetupIntent,
    removePaymentMethod,
  };
}
