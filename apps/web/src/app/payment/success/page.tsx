'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { config } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, Button } from '@smartduka/ui';
import { CheckCircle, XCircle, Clock, Loader2, ArrowRight } from 'lucide-react';

/**
 * FIX1-B2 — REDIRECTED-PAYMENT RECOVERY (`/payment/success`).
 *
 * Stripe redirects here after SCA/3DS authentication with
 * `?payment_intent=…&redirect_status=…`. URL parameters are NEVER treated
 * as settlement proof: the ACTUAL status is retrieved through the
 * authenticated, tenant-scoped backend (which syncs provider truth), and
 * the UI reflects succeeded / processing / failed / canceled / unresolved
 * accordingly. No success message or receipt is shown before the server
 * confirms the settlement.
 */
export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const paymentIntentId = searchParams.get('payment_intent');
  const [status, setStatus] = useState<'loading' | 'succeeded' | 'processing' | 'failed' | 'canceled' | 'unresolved'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (!paymentIntentId || !token) {
        if (!cancelled) {
          setStatus('unresolved');
          setMessage('No payment reference was provided. Check the order in your dashboard.');
        }
        return;
      }
      // Poll the authenticated backend (provider truth) — up to ~30 s.
      for (let attempt = 0; attempt < 10; attempt++) {
        if (cancelled) return;
        try {
          const res = await fetch(`${config.apiUrl}/stripe/payment/${paymentIntentId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json().catch(() => ({}));
          const s = data?.payment?.status;
          if (s === 'succeeded' || s === 'refunded' || s === 'partially_refunded') {
            if (!cancelled) setStatus('succeeded');
            return;
          }
          if (s === 'canceled') {
            if (!cancelled) setStatus('canceled');
            return;
          }
          if (s === 'failed') {
            if (!cancelled) setStatus('failed');
            return;
          }
          if (s === 'processing') {
            if (!cancelled) setStatus('processing');
            // Keep polling — processing may still settle.
          }
        } catch {
          // Network hiccup — keep polling.
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (!cancelled) {
        setStatus('unresolved');
        setMessage(
          'The payment is still being confirmed by the payment provider. The order will update automatically once confirmation arrives — check the Orders page shortly.',
        );
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [paymentIntentId, token]);

  const content = {
    loading: { icon: <Loader2 className="h-10 w-10 animate-spin text-primary" />, title: 'Confirming your payment…', body: 'Retrieving the payment status from the payment provider.' },
    succeeded: { icon: <CheckCircle className="h-10 w-10 text-green-600" />, title: 'Payment confirmed', body: 'The payment was verified with the payment provider and your order has been settled.' },
    processing: { icon: <Clock className="h-10 w-10 text-amber-500" />, title: 'Payment is processing', body: 'The provider is still processing the payment. The order updates automatically when it settles.' },
    failed: { icon: <XCircle className="h-10 w-10 text-red-600" />, title: 'Payment failed', body: 'The payment was not completed. The order remains payable — you can retry with a different payment method.' },
    canceled: { icon: <XCircle className="h-10 w-10 text-gray-500" />, title: 'Payment canceled', body: 'The payment was canceled. The order remains payable.' },
    unresolved: { icon: <Clock className="h-10 w-10 text-amber-500" />, title: 'Payment status unknown', body: message || 'The payment could not be confirmed yet. The order updates automatically when the provider confirms.' },
  }[status];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center text-center gap-4 py-10">
          {content.icon}
          <div>
            <h1 className="text-lg font-semibold">{content.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{content.body}</p>
          </div>
          <Button asChild variant="outline">
            <a href="/orders">
              Go to Orders <ArrowRight className="h-4 w-4 ml-1" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
