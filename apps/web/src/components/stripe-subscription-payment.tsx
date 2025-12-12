'use client';

import { useState } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@smartduka/ui';
import {
  CreditCard,
  Loader2,
  CheckCircle,
  XCircle,
  Shield,
  Sparkles,
  Calendar,
} from 'lucide-react';

/**
 * Stripe Subscription Payment Component
 * 
 * Mobile-first subscription payment form for SmartDuka plans.
 * Supports trial periods, plan upgrades, and recurring billing.
 */

interface SubscriptionPaymentFormProps {
  clientSecret: string;
  planName: string;
  planPrice: number;
  currency: string;
  interval: 'month' | 'year';
  trialDays?: number;
  onSuccess: (subscriptionId: string) => void;
  onCancel: () => void;
  onError?: (error: string) => void;
  publishableKey: string;
}

// Inner form component
function SubscriptionForm({
  planName,
  planPrice,
  currency,
  interval,
  trialDays,
  onSuccess,
  onCancel,
  onError,
}: Omit<SubscriptionPaymentFormProps, 'clientSecret' | 'publishableKey'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const formatCurrency = (value: number, curr: string) => {
    const formatter = new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: curr.toUpperCase(),
      minimumFractionDigits: 0,
    });
    return formatter.format(value / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/subscription/success`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
        setIsComplete(true);
        onSuccess(paymentIntent.id);
      } else {
        throw new Error('Payment was not completed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message);
      onError?.(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-green-700 dark:text-green-400">
          Subscription Activated!
        </h3>
        <p className="text-sm text-muted-foreground text-center">
          Welcome to {planName}! Your subscription is now active.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Plan Summary */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{planName}</h3>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(planPrice, currency)}/{interval === 'year' ? 'year' : 'month'}
            </p>
          </div>
        </div>

        {trialDays && trialDays > 0 && (
          <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 px-3 py-2 rounded-lg">
            <Calendar className="h-4 w-4" />
            <span>
              Start with a {trialDays}-day free trial. Cancel anytime.
            </span>
          </div>
        )}
      </div>

      {/* Payment Element */}
      <div className="min-h-[200px]">
        <PaymentElement
          options={{
            layout: 'tabs',
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

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-4 w-4" />
        <span>Secured by Stripe. Cancel anytime.</span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : trialDays && trialDays > 0 ? (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Start Free Trial
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Subscribe Now
            </>
          )}
        </Button>
      </div>

      {/* Terms */}
      <p className="text-xs text-center text-muted-foreground">
        By subscribing, you agree to our Terms of Service and Privacy Policy.
        {trialDays && trialDays > 0
          ? ` You won't be charged until after your ${trialDays}-day trial.`
          : ` You will be charged ${formatCurrency(planPrice, currency)} ${interval === 'year' ? 'annually' : 'monthly'}.`}
      </p>
    </form>
  );
}

// Main component with Elements provider
export function StripeSubscriptionPayment({
  clientSecret,
  planName,
  planPrice,
  currency,
  interval,
  trialDays,
  onSuccess,
  onCancel,
  onError,
  publishableKey,
}: SubscriptionPaymentFormProps) {
  const [stripePromise] = useState(() => loadStripe(publishableKey));

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#10b981',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '8px',
    },
  };

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance,
      }}
    >
      <SubscriptionForm
        planName={planName}
        planPrice={planPrice}
        currency={currency}
        interval={interval}
        trialDays={trialDays}
        onSuccess={onSuccess}
        onCancel={onCancel}
        onError={onError}
      />
    </Elements>
  );
}
