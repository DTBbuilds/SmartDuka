'use client';

import { config } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { sessionMonitor, SessionState } from '@/lib/session-monitor';
import { AlertTriangle, Clock, RefreshCw, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Session Expiry Warning Component
 * 
 * Shows a warning banner when the session is about to expire,
 * giving users the option to extend their session or logout.
 */
export function SessionExpiryWarning() {
  const router = useRouter();
  const { token, logout, isAuthenticated } = useAuth();
  const [sessionState, setSessionState] = useState<SessionState>({
    isValid: true,
    expiresAt: null,
    timeUntilExpiry: null,
    isExpiringSoon: false,
    isExpired: false,
    isRefreshing: false,
    lastActivity: null,
    refreshAttempts: 0,
  });
  const [dismissed, setDismissed] = useState(false);
  const [extending, setExtending] = useState(false);

  // Initialize session monitor when token changes
  useEffect(() => {
    if (token) {
      sessionMonitor.initialize(token);
    }
    
    const unsubscribe = sessionMonitor.subscribe(setSessionState);
    return () => {
      unsubscribe();
      sessionMonitor.stopMonitoring();
    };
  }, [token]);

  // Handle session expiry
  useEffect(() => {
    if (sessionState.isExpired && isAuthenticated) {
      // Session expired - redirect to login
      logout();
      router.push('/login?expired=true');
    }
  }, [sessionState.isExpired, isAuthenticated, logout, router]);

  // Reset dismissed state when session state changes significantly
  useEffect(() => {
    if (!sessionState.isExpiringSoon) {
      setDismissed(false);
    }
  }, [sessionState.isExpiringSoon]);

  const handleExtendSession = async () => {
    setExtending(true);
    try {
      // Use the secure-session refresh function which properly handles everything
      const { refreshToken } = await import('@/lib/secure-session');
      console.log('[SessionExpiry] Attempting to extend session...');
      const result = await refreshToken();
      
      if (result?.accessToken) {
        console.log('[SessionExpiry] Session extended successfully');
        // Reinitialize session monitor with new token
        sessionMonitor.initialize(result.accessToken);
        setDismissed(true);
        
        // Trigger a page-level event so auth context can pick up the new token
        // This avoids a full page reload while ensuring state consistency
        window.dispatchEvent(new CustomEvent('token-refreshed', { 
          detail: { accessToken: result.accessToken, csrfToken: result.csrfToken } 
        }));
      } else {
        // Refresh returned null - could be network error or auth failure
        // Check if we still have a valid token before logging out
        const currentToken = localStorage.getItem('smartduka:token');
        if (!currentToken) {
          // Session was cleared by refresh function (401 error)
          console.warn('[SessionExpiry] Session expired, redirecting to login');
          logout();
          router.push('/login?expired=true');
        } else {
          // Network/server error - don't logout, let user retry
          console.warn('[SessionExpiry] Refresh failed but session still valid, user can retry');
          setDismissed(true);
        }
      }
    } catch (error: any) {
      console.error('[SessionExpiry] Failed to extend session:', error);
      // Don't logout on errors - let user retry or manually logout
      // Just dismiss the warning temporarily
      setDismissed(true);
    } finally {
      setExtending(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Don't show if not authenticated, not expiring soon, or dismissed
  if (!isAuthenticated || !sessionState.isExpiringSoon || dismissed || sessionState.isExpired) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
              Session Expiring Soon
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Your session will expire in{' '}
              <span className="font-medium">{sessionMonitor.formatTimeUntilExpiry()}</span>.
              Would you like to extend it?
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleExtendSession}
                disabled={extending}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  'bg-yellow-600 text-white hover:bg-yellow-700',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {extending ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                Extend Session
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-700 transition-colors"
              >
                <LogOut className="h-3 w-3" />
                Logout
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="px-2 py-1.5 text-xs text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Session status indicator for navbar
 */
export function SessionStatusIndicator({ className }: { className?: string }) {
  const { isAuthenticated } = useAuth();
  const [sessionState, setSessionState] = useState<SessionState>({
    isValid: true,
    expiresAt: null,
    timeUntilExpiry: null,
    isExpiringSoon: false,
    isExpired: false,
    isRefreshing: false,
    lastActivity: null,
    refreshAttempts: 0,
  });

  useEffect(() => {
    const unsubscribe = sessionMonitor.subscribe(setSessionState);
    return unsubscribe;
  }, []);

  if (!isAuthenticated || !sessionState.isExpiringSoon) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400', className)}>
      <Clock className="h-3 w-3" />
      <span>Session: {sessionMonitor.formatTimeUntilExpiry()}</span>
    </div>
  );
}
