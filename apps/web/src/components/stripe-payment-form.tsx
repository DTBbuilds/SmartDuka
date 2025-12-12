'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@smartduka/ui';
import { CreditCard, Loader2, CheckCircle, XCircle, ArrowLeft, Shield } from 'lucide-react';

/**
 * Stripe Payment Form Component
 * 
 * Mobile-first payment form using Stripe Elements.
 * Supports card payments and other Stripe payment methods.
 */

interface StripePaymentFormProps {
  clientSecret: string;
  amount: number;
  currency: string;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
  onError?: (error: string) => void;
  publishableKey: string;
}

// Inner form component that uses Stripe hooks
function PaymentForm({
  amount,
  currency,
  onSuccess,
  onCancel,
  onError,
}: {
  amount: number;
  currency: string;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
  onError?: (error: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isElementReady, setIsElementReady] = useState(false);
  const isMountedRef = useRef(true);

  // Track component mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const formatCurrency = (value: number, curr: string) => {
    const formatter = new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: curr.toUpperCase(),
      minimumFractionDigits: 0,
    });
    // Convert from smallest unit (cents) to main unit
    return formatter.format(value / 100);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !isElementReady) {
      setError('Payment form is not ready. Please wait a moment and try again.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Submit the form first
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      // Check if still mounted before confirming payment
      if (!isMountedRef.current) {
        return;
      }

      // Confirm the payment
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
        },
        redirect: 'if_required',
      });

      // Check if still mounted after async operation
      if (!isMountedRef.current) {
        return;
      }

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent?.status === 'succeeded') {
        setIsComplete(true);
        onSuccess(paymentIntent.id);
      } else if (paymentIntent?.status === 'processing') {
        // Payment is processing, will be confirmed via webhook
        setIsComplete(true);
        onSuccess(paymentIntent.id);
      } else {
        throw new Error('Payment was not completed. Please try again.');
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message);
        onError?.(err.message);
      }
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, [stripe, elements, isElementReady, onSuccess, onError]);

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-green-700 dark:text-green-400">
          Payment Successful!
        </h3>
        <p className="text-sm text-muted-foreground text-center">
          Your payment of {formatCurrency(amount, currency)} has been processed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-5">
      {/* Payment Element */}
      <div className="flex-1 min-h-[280px]">
        {!isElementReady && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading payment form...</span>
          </div>
        )}
        <PaymentElement
          onReady={() => setIsElementReady(true)}
          onLoadError={(error) => {
            console.error('PaymentElement load error:', error);
            setError('Failed to load payment form. Please refresh and try again.');
          }}
          options={{
            layout: {
              type: 'accordion',
              defaultCollapsed: false,
              radios: false,
              spacedAccordionItems: true,
            },
            paymentMethodOrder: ['card', 'link', 'apple_pay', 'google_pay'],
            wallets: {
              applePay: 'auto',
              googlePay: 'auto',
            },
          }}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
          <XCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || !isElementReady || isProcessing}
          className="flex-1 bg-primary hover:bg-primary/90"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Pay {formatCurrency(amount, currency)}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// Main component with Elements provider
export function StripePaymentForm({
  clientSecret,
  amount,
  currency,
  onSuccess,
  onCancel,
  onError,
  publishableKey,
}: StripePaymentFormProps) {
  // Use useMemo to properly handle publishableKey changes
  const stripePromise = useMemo(() => {
    if (!publishableKey) {
      console.warn('Stripe publishable key is empty');
      return null;
    }
    return loadStripe(publishableKey);
  }, [publishableKey]);

  const [stripeReady, setStripeReady] = useState(false);

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#2563eb', // Blue - better contrast than green
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorTextSecondary: '#4b5563',
      colorDanger: '#dc2626',
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '8px',
      colorIconCardCvc: '#6366f1',
      colorIconCardError: '#dc2626',
    },
    rules: {
      '.Label': {
        color: '#374151',
        fontWeight: '500',
      },
      '.Tab': {
        borderColor: '#e5e7eb',
        boxShadow: 'none',
      },
      '.Tab:hover': {
        borderColor: '#2563eb',
      },
      '.Tab--selected': {
        borderColor: '#2563eb',
        backgroundColor: '#eff6ff',
      },
      '.Input': {
        borderColor: '#d1d5db',
      },
      '.Input:focus': {
        borderColor: '#2563eb',
        boxShadow: '0 0 0 1px #2563eb',
      },
    },
  };

  // Show loading if stripe is not ready
  if (!stripePromise) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <XCircle className="h-12 w-12 text-red-500" />
        <p className="text-sm text-red-600 font-medium">
          Stripe is not configured
        </p>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance,
      }}
    >
      <PaymentForm
        amount={amount}
        currency={currency}
        onSuccess={onSuccess}
        onCancel={onCancel}
        onError={onError}
      />
    </Elements>
  );
}

/**
 * Stripe Payment Modal
 * 
 * Modal wrapper for the payment form.
 * Mobile-friendly with full-screen on small devices.
 */
interface StripePaymentModalProps {
  isOpen: boolean;
  clientSecret: string | null;
  amount: number;
  currency: string;
  publishableKey: string;
  title?: string;
  description?: string;
  onSuccess: (paymentIntentId: string) => void;
  onClose: () => void;
  onError?: (error: string) => void;
}

export function StripePaymentModal({
  isOpen,
  clientSecret,
  amount,
  currency,
  publishableKey,
  title = 'Complete Payment',
  description,
  onSuccess,
  onClose,
  onError,
}: StripePaymentModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  const formatCurrency = (value: number, curr: string) => {
    const formatter = new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: curr.toUpperCase(),
      minimumFractionDigits: 0,
    });
    return formatter.format(value / 100);
  };

  useEffect(() => {
    if (clientSecret) {
      setIsLoading(false);
    }
  }, [clientSecret]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row min-h-[500px]">
          {/* Left Panel - Order Summary */}
          <div className="w-full md:w-2/5 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 md:p-8 flex flex-col">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
                  {description && (
                    <DialogDescription className="text-sm mt-1">
                      {description}
                    </DialogDescription>
                  )}
                </div>
              </div>
            </DialogHeader>

            {/* Amount Display */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl p-6 shadow-sm border">
                <p className="text-sm text-muted-foreground mb-2">Amount to pay</p>
                <p className="text-4xl font-bold text-primary mb-4">
                  {formatCurrency(amount, currency)}
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Instant payment confirmation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span>256-bit SSL encryption</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-purple-500" />
                    <span>All major cards accepted</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Badge */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Secured by Stripe</span>
            </div>
          </div>

          {/* Right Panel - Payment Form */}
          <div className="w-full md:w-3/5 p-6 md:p-8 bg-background">
            <div className="h-full flex flex-col">
              <h3 className="text-lg font-semibold mb-6 hidden md:block">Payment Details</h3>
              
              {isLoading || !clientSecret ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Preparing secure payment...
                  </p>
                </div>
              ) : !publishableKey ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                  <XCircle className="h-12 w-12 text-red-500" />
                  <p className="text-sm text-red-600 font-medium">
                    Stripe is not configured
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    Please contact support or use M-Pesa payment instead.
                  </p>
                  <Button variant="outline" onClick={onClose}>
                    Close
                  </Button>
                </div>
              ) : (
                <StripePaymentForm
                  clientSecret={clientSecret}
                  amount={amount}
                  currency={currency}
                  publishableKey={publishableKey}
                  onSuccess={onSuccess}
                  onCancel={onClose}
                  onError={onError}
                />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Stripe Payment Button
 * 
 * Simple button that triggers Stripe payment flow.
 */
interface StripePaymentButtonProps {
  amount: number;
  currency: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  onCreatePayment: () => Promise<{ clientSecret: string; publishableKey: string } | null>;
  onSuccess: (paymentIntentId: string) => void;
  onError?: (error: string) => void;
}

export function StripePaymentButton({
  amount,
  currency,
  label,
  disabled,
  className,
  onCreatePayment,
  onSuccess,
  onError,
}: StripePaymentButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const formatCurrency = (value: number, curr: string) => {
    const formatter = new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: curr.toUpperCase(),
      minimumFractionDigits: 0,
    });
    return formatter.format(value / 100);
  };

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const result = await onCreatePayment();
      if (result) {
        setClientSecret(result.clientSecret);
        setPublishableKey(result.publishableKey);
        setIsModalOpen(true);
      }
    } catch (err: any) {
      onError?.(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = (paymentIntentId: string) => {
    setIsModalOpen(false);
    setClientSecret(null);
    onSuccess(paymentIntentId);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setClientSecret(null);
  };

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={className}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4 mr-2" />
            {label || `Pay ${formatCurrency(amount, currency)}`}
          </>
        )}
      </Button>

      <StripePaymentModal
        isOpen={isModalOpen}
        clientSecret={clientSecret}
        amount={amount}
        currency={currency}
        publishableKey={publishableKey}
        onSuccess={handleSuccess}
        onClose={handleClose}
        onError={onError}
      />
    </>
  );
}
