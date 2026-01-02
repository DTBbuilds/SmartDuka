'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@smartduka/ui';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { config } from '@/lib/config';
import { activityTracker } from '@/lib/activity-tracker';
import { statusManager } from '@/lib/status-manager';
import { storeToken, storeShop, storeCsrfToken, getToken } from '@/lib/secure-session';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Completing sign in...');

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    // Legacy support for token in URL (will be removed)
    const legacyToken = searchParams.get('token');

    if (error) {
      setStatus('error');
      setMessage(decodeURIComponent(error));
      setTimeout(() => {
        router.push('/login');
      }, 3000);
      return;
    }

    // New flow: cookies are already set by server, just verify and redirect
    if (success === 'true') {
      // Cookies were set by server during OAuth callback
      // We need to verify the session by making an authenticated request
      verifySessionAndRedirect();
      return;
    }

    // Legacy flow: token in URL (for backward compatibility)
    if (legacyToken) {
      try {
        const decoded = JSON.parse(atob(legacyToken.split('.')[1]));
        
        // Store token securely
        storeToken(legacyToken);
        
        // Initialize activity tracking and status manager
        activityTracker.setToken(legacyToken, decoded.role);
        if (decoded.shopId) {
          statusManager.initialize(legacyToken, decoded.sub, decoded.shopId);
        }

        if (decoded.shopId) {
          fetchShopAndRedirect(legacyToken, decoded.shopId);
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
      return;
    }

    // No success flag or token - error
    setStatus('error');
    setMessage('No authentication received');
    setTimeout(() => {
      router.push('/login');
    }, 3000);
  }, [searchParams, router]);

  const verifySessionAndRedirect = async () => {
    try {
      // Make authenticated request to verify session (cookies sent automatically)
      const res = await fetch(`${config.apiUrl}/auth/me`, {
        credentials: 'include',
      });

      if (res.ok) {
        const userData = await res.json();
        
        // Store the access token returned by /auth/me for client-side use
        if (userData.accessToken) {
          storeToken(userData.accessToken);
          
          // Store CSRF token if provided
          if (userData.csrfToken) {
            storeCsrfToken(userData.csrfToken);
          }
          
          // Initialize activity tracking and status manager
          activityTracker.setToken(userData.accessToken, userData.role);
          if (userData.shopId) {
            statusManager.initialize(userData.accessToken, userData.sub, userData.shopId);
          }
        }

        // Fetch shop info if user has shopId
        if (userData.shopId && userData.accessToken) {
          await fetchShopAndRedirect(userData.accessToken, userData.shopId);
        } else {
          setStatus('success');
          setMessage('Login successful! Redirecting...');
          setTimeout(() => {
            window.location.href = userData.role === 'super_admin' ? '/super-admin' : '/';
          }, 1000);
        }
      } else {
        throw new Error('Session verification failed');
      }
    } catch (err) {
      console.error('Session verification error:', err);
      setStatus('error');
      setMessage('Authentication failed. Please try again.');
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
