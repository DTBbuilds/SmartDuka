'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@smartduka/ui';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { config } from '@/lib/config';
import { activityTracker } from '@/lib/activity-tracker';
import { statusManager } from '@/lib/status-manager';
import { storeToken, storeCsrfToken } from '@/lib/secure-session';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Completing sign in...');
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    // Prevent processing multiple times
    if (hasProcessed) return;

    const success = searchParams.get('success');
    const error = searchParams.get('error');
    // Token in URL - used for cross-origin OAuth
    const urlToken = searchParams.get('token');
    const urlCsrf = searchParams.get('csrf');

    // Wait for searchParams to be populated - on initial render they may be empty
    // Only proceed if we have at least one expected parameter OR if URL has no query string
    const urlHasParams = typeof window !== 'undefined' && window.location.search.length > 1;
    const paramsReady = success !== null || error !== null || urlToken !== null || !urlHasParams;
    
    if (!paramsReady) {
      // SearchParams not ready yet, wait for next render
      return;
    }

    if (error) {
      setHasProcessed(true);
      setStatus('error');
      setMessage(decodeURIComponent(error));
      setTimeout(() => {
        router.push('/login');
      }, 3000);
      return;
    }

    // OAuth success flow - token is passed via URL for cross-origin support
    if (success === 'true') {
      if (urlToken) {
        setHasProcessed(true);
        handleTokenFromUrl(urlToken, urlCsrf);
        return;
      }
      // No token in URL - wait a moment in case params are still loading
      // Use a small delay before showing error
      const timeout = setTimeout(() => {
        if (!hasProcessed) {
          setHasProcessed(true);
          setStatus('error');
          setMessage('Authentication token not received');
          setTimeout(() => {
            router.push('/login');
          }, 3000);
        }
      }, 500);
      return () => clearTimeout(timeout);
    }

    // Direct token in URL (legacy or direct API usage)
    if (urlToken) {
      setHasProcessed(true);
      handleTokenFromUrl(urlToken, urlCsrf);
      return;
    }

    // No success flag or token - but only show error if URL actually has no params
    // This prevents false errors during initial hydration
    if (!urlHasParams) {
      setHasProcessed(true);
      setStatus('error');
      setMessage('No authentication received');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    }
  }, [searchParams, router, hasProcessed]);

  const handleTokenFromUrl = async (token: string, csrfToken: string | null) => {
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      
      // Store token securely
      storeToken(token);
      
      // Store CSRF token if provided
      if (csrfToken) {
        storeCsrfToken(csrfToken);
      }
      
      // Clear token from URL for security (replace current history entry)
      window.history.replaceState({}, '', '/auth/callback?success=true');
      
      // Initialize activity tracking and status manager
      activityTracker.setToken(token, decoded.role);
      if (decoded.shopId) {
        statusManager.initialize(token, decoded.sub, decoded.shopId);
      }

      if (decoded.shopId) {
        await fetchShopAndRedirect(token, decoded.shopId);
      } else {
        setStatus('success');
        setMessage('Login successful! Redirecting...');
        setTimeout(() => {
          window.location.href = decoded.role === 'super_admin' ? '/super-admin' : '/';
        }, 1000);
      }
    } catch (err) {
      console.error('Token processing error:', err);
      setStatus('error');
      setMessage('Invalid authentication token');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    }
  };

  const fetchShopAndRedirect = async (token: string, shopId: string) => {
    try {
      const res = await fetch(`${config.apiUrl}/shops/${shopId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      const text = await res.text();
      const shop = text ? JSON.parse(text) : {};
      
      if (res.ok) {
        window.localStorage.setItem('smartduka:shop', JSON.stringify(shop));
      }

      setStatus('success');
      setMessage('Login successful! Redirecting...');
      setTimeout(() => {
        // Use window.location for full page reload to ensure AuthContext picks up the new token
        window.location.href = '/';
      }, 1000);
    } catch (err) {
      console.error('Failed to fetch shop:', err);
      // Still redirect even if shop fetch fails
      setStatus('success');
      setMessage('Login successful! Redirecting...');
      setTimeout(() => {
        // Use window.location for full page reload to ensure AuthContext picks up the new token
        window.location.href = '/';
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 flex flex-col items-center gap-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="text-slate-600">{message}</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-green-700">{message}</p>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-500" />
              <p className="text-red-700">{message}</p>
              <p className="text-sm text-slate-500">Redirecting to login...</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Loading fallback for Suspense
function AuthCallbackLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <p className="text-slate-600">Loading...</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Main export wrapped in Suspense
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackLoading />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
