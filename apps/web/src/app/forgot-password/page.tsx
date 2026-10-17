'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smartduka/ui';
import { config } from '@/lib/config';
import { ThemeToggleOutline } from '@/components/theme-toggle';

/**
 * P1-13 — Forgot Password.
 * POST /auth/forgot-password — the backend is enumeration-resistant
 * (always returns the same generic message); this page mirrors that:
 * the success state never reveals whether the account exists.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [deliveryFailed, setDeliveryFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${config.apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        // P1-13A: distinguish an ACCEPTED request (the backend dispatched
        // the email) from a provider failure — the backend returns
        // `delivered: false` when the email could not be sent. Either
        // way the response stays enumeration-safe (same message).
        setSubmitted(true);
        setDeliveryFailed(data?.delivered === false);
      } else if (res.status === 429) {
        setError('Too many reset requests. Please wait a minute and try again.');
      } else {
        // Unexpected API error: a temporary service failure — say so
        // without disclosing account existence.
        setError('The reset service is temporarily unavailable. Please try again shortly.');
      }
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex justify-end p-4">
        <ThemeToggleOutline />
      </div>
      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-primary to-orange-500 rounded-xl">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold">SmartDuka</h1>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl text-center">Forgot your password?</CardTitle>
              <CardDescription className="text-center">
                Enter your account email and we'll send you a reset link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="space-y-4 text-center" role="status">
                  <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    {deliveryFailed
                      ? 'Your request was received, but the email could not be sent right now. Please try again in a few minutes.'
                      : 'If an account exists with this email, a password reset link has been sent. Check your inbox — the link expires after a short time.'}
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/login">Back to login</Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <p role="alert" className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" aria-hidden="true" />
                      {error}
                    </p>
                  )}
                  <div>
                    <label htmlFor="email" className="text-sm font-medium">Email</label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@business.com"
                      className="mt-1.5 w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Sending reset link…
                      </>
                    ) : (
                      'Send reset link'
                    )}
                  </Button>
                  <Button asChild variant="ghost" className="w-full">
                    <Link href="/login">
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      Back to login
                    </Link>
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
