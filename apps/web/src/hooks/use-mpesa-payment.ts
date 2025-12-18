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
 * M-Pesa Payment Phase - more granular than status for UI
 */
export type MpesaPhase =
  | 'idle'
  | 'sending_request'      // Sending STK push to Safaricom
  | 'waiting_prompt'        // Waiting for STK prompt to appear on phone (1-10s)
  | 'waiting_pin'           // User should be entering PIN (up to 60s)
  | 'processing'            // M-Pesa is processing the payment
  | 'verifying'             // Verifying callback/polling for result
  | 'completed'             // Payment successful
  | 'failed'                // Payment failed
  | 'expired'               // Transaction timed out
  | 'cancelled';            // User cancelled

/**
 * M-Pesa Error Categories for user-friendly messages
 */
export type MpesaErrorCategory =
  | 'user_cancelled'        // User pressed cancel or didn't respond
  | 'wrong_pin'             // User entered wrong PIN
  | 'insufficient_funds'    // Not enough balance
  | 'limit_exceeded'        // Daily/transaction limit exceeded
  | 'phone_unreachable'     // Phone offline or SIM issue
  | 'timeout'               // No response in time
  | 'system_error'          // M-Pesa system error
  | 'network_error'         // Network connectivity issue
  | 'unknown';              // Unknown error

/**
 * M-Pesa Error Info with user-friendly message and suggested action
 */
export interface MpesaErrorInfo {
  category: MpesaErrorCategory;
  code?: number;
  message: string;
  userMessage: string;
  suggestedAction: string;
  canRetry: boolean;
}

/**
 * M-Pesa Transaction Response
 */
export interface MpesaTransaction {
  transactionId: string;
  orderId: string;
  orderNumber: string;
  status: string;
  phase?: MpesaPhase;
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
  stkPushSentAt?: string;
  callbackReceivedAt?: string;
  errorCategory?: MpesaErrorCategory;
  errorInfo?: MpesaErrorInfo;
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
  phase: MpesaPhase;
  transaction: MpesaTransaction | null;
  error: string | null;
  errorInfo: MpesaErrorInfo | null;
  timeRemaining: number;
  progress: number; // 0-100 for progress bar
  phaseMessage: string; // User-friendly message for current phase

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
  queryStatus: () => Promise<void>; // Manual status query

  // Computed
  isLoading: boolean;
  isPending: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  canRetry: boolean;
  canCancel: boolean;
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
  const [phase, setPhase] = useState<MpesaPhase>('idle');
  const [transaction, setTransaction] = useState<MpesaTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<MpesaErrorInfo | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [stkSentTime, setStkSentTime] = useState<number | null>(null);

  // Refs for cleanup
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const phaseRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * M-Pesa Timing Constants (based on Safaricom behavior)
   */
  const MPESA_TIMING = {
    STK_PROMPT_TIMEOUT: 10,    // 10 seconds for STK to appear on phone
    USER_PIN_TIMEOUT: 60,      // 60 seconds for user to enter PIN
    PROCESSING_TIME: 10,       // 10 seconds for M-Pesa processing
    TOTAL_TIMEOUT: 120,        // 2 minutes total transaction timeout
  };

  /**
   * Get error info from M-Pesa result code
   */
  const getErrorInfoFromCode = useCallback((resultCode: number, resultDesc?: string): MpesaErrorInfo => {
    const errorMap: Record<number, Partial<MpesaErrorInfo>> = {
      1: {
        category: 'insufficient_funds',
        userMessage: 'Insufficient M-Pesa balance',
        suggestedAction: 'Please top up your M-Pesa account and try again',
        canRetry: true,
      },
      1001: {
        category: 'system_error',
        userMessage: 'Another transaction is in progress',
        suggestedAction: 'Please wait 2-3 minutes and try again',
        canRetry: true,
      },
      1019: {
        category: 'timeout',
        userMessage: 'Transaction expired',
        suggestedAction: 'Please try again and respond to the prompt quickly',
        canRetry: true,
      },
      1025: {
        category: 'network_error',
        userMessage: 'Unable to send payment request',
        suggestedAction: 'Check your network connection and try again',
        canRetry: true,
      },
      1032: {
        category: 'user_cancelled',
        userMessage: 'Payment was cancelled',
        suggestedAction: 'You can try again when ready',
        canRetry: true,
      },
      1037: {
        category: 'phone_unreachable',
        userMessage: 'Phone could not be reached',
        suggestedAction: 'Ensure your phone is on and has network. Try updating your SIM by dialing *234*1*6#',
        canRetry: true,
      },
      2001: {
        category: 'wrong_pin',
        userMessage: 'Invalid M-Pesa PIN entered',
        suggestedAction: 'Please try again and enter the correct PIN',
        canRetry: true,
      },
      9999: {
        category: 'system_error',
        userMessage: 'M-Pesa system error',
        suggestedAction: 'Please try again in a few moments',
        canRetry: true,
      },
    };

    const info = errorMap[resultCode] || {
      category: 'unknown' as MpesaErrorCategory,
      userMessage: resultDesc || 'Payment failed',
      suggestedAction: 'Please try again',
      canRetry: true,
    };

    return {
      category: info.category || 'unknown',
      code: resultCode,
      message: resultDesc || 'Unknown error',
      userMessage: info.userMessage || 'Payment failed',
      suggestedAction: info.suggestedAction || 'Please try again',
      canRetry: info.canRetry ?? true,
    };
  }, []);

  /**
   * Calculate current phase based on timing
   */
  const calculatePhase = useCallback((): MpesaPhase => {
    if (status === 'idle') return 'idle';
    if (status === 'initiating') return 'sending_request';
    if (status === 'completed') return 'completed';
    if (status === 'failed') return 'failed';
    if (status === 'expired') return 'expired';
    if (status === 'cancelled') return 'cancelled';

    if (status === 'pending' && stkSentTime) {
      const elapsed = (Date.now() - stkSentTime) / 1000;
      
      if (elapsed < MPESA_TIMING.STK_PROMPT_TIMEOUT) {
        return 'waiting_prompt';
      } else if (elapsed < MPESA_TIMING.STK_PROMPT_TIMEOUT + MPESA_TIMING.USER_PIN_TIMEOUT) {
        return 'waiting_pin';
      } else {
        return 'processing';
      }
    }

    return 'processing';
  }, [status, stkSentTime, MPESA_TIMING]);

  /**
   * Get user-friendly message for current phase
   */
  const getPhaseMessage = useCallback((currentPhase: MpesaPhase): string => {
    const messages: Record<MpesaPhase, string> = {
      idle: 'Ready to pay',
      sending_request: 'Sending payment request...',
      waiting_prompt: 'Check your phone for the M-Pesa prompt',
      waiting_pin: 'Enter your M-Pesa PIN to complete payment',
      processing: 'Processing your payment...',
      verifying: 'Verifying payment...',
      completed: 'Payment successful!',
      failed: error || 'Payment failed',
      expired: 'Payment request expired',
      cancelled: 'Payment cancelled',
    };
    return messages[currentPhase];
  }, [error]);

  /**
   * Calculate progress percentage (0-100)
   */
  const calculateProgress = useCallback((): number => {
    if (status === 'idle') return 0;
    if (status === 'initiating') return 10;
    if (status === 'completed') return 100;
    if (status === 'failed' || status === 'expired' || status === 'cancelled') return 0;

    if (status === 'pending' && stkSentTime) {
      const elapsed = (Date.now() - stkSentTime) / 1000;
      const totalTime = MPESA_TIMING.TOTAL_TIMEOUT;
      
      // Progress: 10% (init) + 80% (waiting) + 10% (final)
      const waitingProgress = Math.min(80, (elapsed / totalTime) * 80);
      return Math.round(10 + waitingProgress);
    }

    return 50;
  }, [status, stkSentTime, MPESA_TIMING]);

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
          // Try to get error message from response
          const text = await response.text();
          let errorMessage = 'Failed to fetch status';
          try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.message || errorMessage;
          } catch {
            // Response wasn't JSON
          }
          throw new Error(errorMessage);
        }

        // Safely parse JSON response
        const text = await response.text();
        if (!text || text.trim() === '') {
          console.warn('Empty response from status endpoint');
          return; // Skip this poll, try again next interval
        }

        let data: MpesaTransaction;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error('Failed to parse status response:', text.substring(0, 200));
          return; // Skip this poll, try again next interval
        }
        setTransaction(data);
        setTimeRemaining(data.timeRemaining);

        // Handle status changes
        if (data.status === 'completed') {
          cleanup();
          setStatus('completed');
          setPhase('completed');
          onSuccess?.(data);
        } else if (data.status === 'failed') {
          cleanup();
          setStatus('failed');
          setPhase('failed');
          const errorMessage = data.mpesaResultDesc || 'Payment failed';
          setError(errorMessage);
          
          // Set detailed error info if result code available
          if (data.mpesaResultCode !== undefined) {
            setErrorInfo(getErrorInfoFromCode(data.mpesaResultCode, data.mpesaResultDesc));
          } else {
            setErrorInfo({
              category: 'unknown',
              message: errorMessage,
              userMessage: errorMessage,
              suggestedAction: 'Please try again',
              canRetry: true,
            });
          }
          onError?.(errorMessage);
        } else if (data.status === 'expired') {
          cleanup();
          setStatus('expired');
          setPhase('expired');
          setErrorInfo({
            category: 'timeout',
            message: 'Transaction timed out',
            userMessage: 'Payment request expired',
            suggestedAction: 'Please try again and respond to the M-Pesa prompt quickly',
            canRetry: true,
          });
          onExpired?.();
        }
      } catch (err: any) {
        // Ignore abort errors
        if (err.name === 'AbortError') return;

        console.error('Error polling M-Pesa status:', err);
      }
    },
    [token, cleanup, onSuccess, onError, onExpired, getErrorInfoFromCode],
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
      setPhase('sending_request');
      setError(null);
      setErrorInfo(null);

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

        // Safely parse JSON response
        const text = await response.text();
        if (!text || text.trim() === '') {
          throw new Error('Empty response from server');
        }

        let data: MpesaInitiateResponse;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error('Failed to parse initiate response:', text.substring(0, 200));
          throw new Error('Invalid response from server');
        }

        if (!response.ok) {
          throw new Error((data as any).message || 'Failed to initiate payment');
        }

        // Record when STK was sent for phase calculation
        const now = Date.now();
        setStkSentTime(now);

        // Update state
        setStatus('pending');
        setPhase('waiting_prompt');
        setTransaction({
          transactionId: data.transactionId,
          orderId,
          orderNumber: '',
          status: data.status,
          amount,
          phoneNumber,
          expiresAt: data.expiresAt,
          timeRemaining: 120, // 2 minutes default (based on M-Pesa timing)
          canRetry: false,
          createdAt: new Date().toISOString(),
          stkPushSentAt: new Date(now).toISOString(),
        });

        // Start countdown and polling
        startCountdown(data.expiresAt);
        startPolling(data.transactionId);
      } catch (err: any) {
        setStatus('failed');
        setPhase('failed');
        const errorMessage = err.message || 'Failed to initiate payment';
        setError(errorMessage);
        setErrorInfo({
          category: 'network_error',
          message: errorMessage,
          userMessage: 'Unable to send payment request',
          suggestedAction: 'Check your internet connection and try again',
          canRetry: true,
        });
        onError?.(errorMessage);
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

        // Safely parse JSON response
        const text = await response.text();
        if (!text || text.trim() === '') {
          throw new Error('Empty response from server');
        }

        let data: MpesaInitiateResponse;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error('Failed to parse retry response:', text.substring(0, 200));
          throw new Error('Invalid response from server');
        }

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
    setPhase('idle');
    setTransaction(null);
    setError(null);
    setErrorInfo(null);
    setTimeRemaining(0);
    setStkSentTime(null);
  }, [cleanup]);

  /**
   * Manual status query
   */
  const queryStatus = useCallback(async () => {
    if (!token || !transaction) return;
    await pollStatus(transaction.transactionId);
  }, [token, transaction, pollStatus]);

  // Update phase periodically when pending
  useEffect(() => {
    if (status === 'pending') {
      const updatePhase = () => {
        const newPhase = calculatePhase();
        setPhase(newPhase);
      };
      
      updatePhase();
      phaseRef.current = setInterval(updatePhase, 1000);
      
      return () => {
        if (phaseRef.current) {
          clearInterval(phaseRef.current);
          phaseRef.current = null;
        }
      };
    } else {
      setPhase(calculatePhase());
    }
  }, [status, calculatePhase]);

  // Computed values
  const isLoading = status === 'initiating' || status === 'polling';
  const isPending = status === 'pending';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed' || status === 'expired';
  const canRetry = isFailed && (errorInfo?.canRetry ?? true);
  const canCancel = isPending || status === 'initiating';
  const progress = calculateProgress();
  const phaseMessage = getPhaseMessage(phase);

  return {
    // State
    status,
    phase,
    transaction,
    error,
    errorInfo,
    timeRemaining,
    progress,
    phaseMessage,

    // Actions
    initiatePayment,
    retryPayment,
    cancelPayment,
    reset,
    queryStatus,

    // Computed
    isLoading,
    isPending,
    isCompleted,
    isFailed,
    canRetry,
    canCancel,
  };
}
