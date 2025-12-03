'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { config } from '@/lib/config';

/**
 * M-Pesa Transaction Status
 */
export type MpesaStatus =
  | 'idle'
  | 'initiating'
  | 'pending'
  | 'polling'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'cancelled';

/**
 * M-Pesa Transaction Response
 */
export interface MpesaTransaction {
  transactionId: string;
  orderId: string;
  orderNumber: string;
  status: string;
  amount: number;
  phoneNumber: string;
  mpesaReceiptNumber?: string;
  mpesaResultCode?: number;
  mpesaResultDesc?: string;
  expiresAt: string;
  timeRemaining: number;
  canRetry: boolean;
  createdAt: string;
  completedAt?: string;
}

/**
 * M-Pesa Payment Initiation Response
 */
export interface MpesaInitiateResponse {
  success: boolean;
  transactionId: string;
  checkoutRequestId?: string;
  status: string;
  expiresAt: string;
  message: string;
  isIdempotent?: boolean;
}

/**
 * M-Pesa Payment Hook Options
 */
export interface UseMpesaPaymentOptions {
  onSuccess?: (transaction: MpesaTransaction) => void;
  onError?: (error: string) => void;
  onExpired?: () => void;
  pollingInterval?: number; // milliseconds
}

/**
 * M-Pesa Payment Hook Return Type
 */
export interface UseMpesaPaymentReturn {
  // State
  status: MpesaStatus;
  transaction: MpesaTransaction | null;
  error: string | null;
  timeRemaining: number;

  // Actions
  initiatePayment: (
    orderId: string,
    phoneNumber: string,
    amount: number,
    customerName?: string,
  ) => Promise<void>;
  retryPayment: (newPhoneNumber?: string) => Promise<void>;
  cancelPayment: () => Promise<void>;
  reset: () => void;

  // Computed
  isLoading: boolean;
  isPending: boolean;
  isCompleted: boolean;
  isFailed: boolean;
}

/**
 * Hook for managing M-Pesa STK Push payments
 *
 * Features:
 * - Initiates STK push payment
 * - Polls for payment status
 * - Handles timeout/expiry
 * - Supports retry and cancellation
 * - Real-time countdown timer
 */
export function useMpesaPayment(
  options: UseMpesaPaymentOptions = {},
): UseMpesaPaymentReturn {
  const {
    onSuccess,
    onError,
    onExpired,
    pollingInterval = 3000, // Poll every 3 seconds
  } = options;

  const { token } = useAuth();

  // State
  const [status, setStatus] = useState<MpesaStatus>('idle');
  const [transaction, setTransaction] = useState<MpesaTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Refs for cleanup
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Clean up polling and countdown timers
   */
  const cleanup = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  /**
   * Start countdown timer
   */
  const startCountdown = useCallback((expiresAt: string) => {
    // Clear existing countdown
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
      );
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        cleanup();
        setStatus('expired');
        onExpired?.();
      }
    };

    // Initial update
    updateCountdown();

    // Update every second
    countdownRef.current = setInterval(updateCountdown, 1000);
  }, [cleanup, onExpired]);

  /**
   * Poll for transaction status
   */
  const pollStatus = useCallback(
    async (transactionId: string) => {
      if (!token) return;

      try {
        const response = await fetch(
          `${config.apiUrl}/payments/mpesa/status/${transactionId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: abortControllerRef.current?.signal,
          },
        );

        if (!response.ok) {
          throw new Error('Failed to fetch status');
        }

        const data: MpesaTransaction = await response.json();
        setTransaction(data);
        setTimeRemaining(data.timeRemaining);

        // Handle status changes
        if (data.status === 'completed') {
          cleanup();
          setStatus('completed');
          onSuccess?.(data);
        } else if (data.status === 'failed') {
          cleanup();
          setStatus('failed');
          setError(data.mpesaResultDesc || 'Payment failed');
          onError?.(data.mpesaResultDesc || 'Payment failed');
        } else if (data.status === 'expired') {
          cleanup();
          setStatus('expired');
          onExpired?.();
        }
      } catch (err: any) {
        // Ignore abort errors
        if (err.name === 'AbortError') return;

        console.error('Error polling M-Pesa status:', err);
      }
    },
    [token, cleanup, onSuccess, onError, onExpired],
  );

  /**
   * Start polling for status updates
   */
  const startPolling = useCallback(
    (transactionId: string) => {
      // Clear existing polling
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      // Initial poll
      pollStatus(transactionId);

      // Poll at interval
      pollingRef.current = setInterval(() => {
        pollStatus(transactionId);
      }, pollingInterval);
    },
    [pollStatus, pollingInterval],
  );

  /**
   * Initiate M-Pesa STK Push payment
   */
  const initiatePayment = useCallback(
    async (
      orderId: string,
      phoneNumber: string,
      amount: number,
      customerName?: string,
    ) => {
      if (!token) {
        setError('Authentication required');
        onError?.('Authentication required');
        return;
      }

      cleanup();
      setStatus('initiating');
      setError(null);

      try {
        const response = await fetch(`${config.apiUrl}/payments/mpesa/initiate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            orderId,
            phoneNumber,
            amount,
            customerName,
          }),
        });

        const data: MpesaInitiateResponse = await response.json();

        if (!response.ok) {
          throw new Error((data as any).message || 'Failed to initiate payment');
        }

        // Update state
        setStatus('pending');
        setTransaction({
          transactionId: data.transactionId,
          orderId,
          orderNumber: '',
          status: data.status,
          amount,
          phoneNumber,
          expiresAt: data.expiresAt,
          timeRemaining: 300, // 5 minutes default
          canRetry: false,
          createdAt: new Date().toISOString(),
        });

        // Start countdown and polling
        startCountdown(data.expiresAt);
        startPolling(data.transactionId);
      } catch (err: any) {
        setStatus('failed');
        setError(err.message || 'Failed to initiate payment');
        onError?.(err.message || 'Failed to initiate payment');
      }
    },
    [token, cleanup, startCountdown, startPolling, onError],
  );

  /**
   * Retry failed payment
   */
  const retryPayment = useCallback(
    async (newPhoneNumber?: string) => {
      if (!token || !transaction) {
        setError('No transaction to retry');
        return;
      }

      cleanup();
      setStatus('initiating');
      setError(null);

      try {
        const response = await fetch(
          `${config.apiUrl}/payments/mpesa/retry/${transaction.transactionId}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              newPhoneNumber,
            }),
          },
        );

        const data: MpesaInitiateResponse = await response.json();

        if (!response.ok) {
          throw new Error((data as any).message || 'Failed to retry payment');
        }

        // Update state
        setStatus('pending');
        setTransaction((prev) =>
          prev
            ? {
                ...prev,
                transactionId: data.transactionId,
                status: data.status,
                phoneNumber: newPhoneNumber || prev.phoneNumber,
                expiresAt: data.expiresAt,
                timeRemaining: 300,
                canRetry: false,
              }
            : null,
        );

        // Start countdown and polling
        startCountdown(data.expiresAt);
        startPolling(data.transactionId);
      } catch (err: any) {
        setStatus('failed');
        setError(err.message || 'Failed to retry payment');
        onError?.(err.message || 'Failed to retry payment');
      }
    },
    [token, transaction, cleanup, startCountdown, startPolling, onError],
  );

  /**
   * Cancel pending payment
   */
  const cancelPayment = useCallback(async () => {
    if (!token || !transaction) {
      return;
    }

    cleanup();

    try {
      await fetch(
        `${config.apiUrl}/payments/mpesa/cancel/${transaction.transactionId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setStatus('cancelled');
    } catch (err: any) {
      console.error('Error cancelling payment:', err);
      // Still mark as cancelled locally
      setStatus('cancelled');
    }
  }, [token, transaction, cleanup]);

  /**
   * Reset hook state
   */
  const reset = useCallback(() => {
    cleanup();
    setStatus('idle');
    setTransaction(null);
    setError(null);
    setTimeRemaining(0);
  }, [cleanup]);

  // Computed values
  const isLoading = status === 'initiating' || status === 'polling';
  const isPending = status === 'pending';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed' || status === 'expired';

  return {
    // State
    status,
    transaction,
    error,
    timeRemaining,

    // Actions
    initiatePayment,
    retryPayment,
    cancelPayment,
    reset,

    // Computed
    isLoading,
    isPending,
    isCompleted,
    isFailed,
  };
}
