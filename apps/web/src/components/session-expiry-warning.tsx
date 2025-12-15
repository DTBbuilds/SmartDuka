'use client';

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
      // Call API to refresh token
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          // Update token in localStorage and cookie
          window.localStorage.setItem('smartduka:token', data.token);
          document.cookie = `smartduka_token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
          
          // Reinitialize session monitor with new token
          sessionMonitor.initialize(data.token);
          setDismissed(true);
          
          // Reload page to update auth context
          window.location.reload();
        }
      } else {
        // If refresh fails, redirect to login
        logout();
        router.push('/login?expired=true');
      }
    } catch (error) {
      console.error('Failed to extend session:', error);
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
