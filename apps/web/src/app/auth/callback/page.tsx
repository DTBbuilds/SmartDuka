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

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    // Token in URL - used as fallback for cross-origin OAuth when cookies are blocked
    const urlToken = searchParams.get('token');
    const urlCsrf = searchParams.get('csrf');

    if (error) {
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
        handleTokenFromUrl(urlToken, urlCsrf);
        return;
      }
      // No token in URL - this shouldn't happen with Option 2
      setStatus('error');
      setMessage('Authentication token not received');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
      return;
    }

    // Direct token in URL (legacy or direct API usage)
    if (urlToken) {
      handleTokenFromUrl(urlToken, urlCsrf);
      return;
    }

    // No success flag or token - error
    setStatus('error');
    setMessage('No authentication received');
    setTimeout(() => {
      router.push('/login');
    }, 3000);
  }, [searchParams, router]);

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
