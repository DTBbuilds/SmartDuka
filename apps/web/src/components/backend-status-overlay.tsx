'use client';

import { useEffect, useState } from 'react';
import { Loader2, WifiOff, AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { apiResilience, type BackendState, type BackendStatus } from '@/lib/api-resilience';
import { cn } from '@/lib/utils';

interface BackendStatusOverlayProps {
  /** Show as full-screen overlay (default) or inline banner */
  mode?: 'overlay' | 'banner';
  /** Custom z-index for overlay */
  zIndex?: number;
  /** Called when retry is clicked */
  onRetry?: () => void;
}

export function BackendStatusOverlay({ 
  mode = 'overlay', 
  zIndex = 50,
  onRetry,
}: BackendStatusOverlayProps) {
  const [state, setState] = useState<BackendState>(apiResilience.getState());
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsubscribe = apiResilience.subscribe((newState) => {
      setState(newState);
      const shouldBlock = newState.status === 'unreachable' || 
                          newState.status === 'error' || 
                          newState.status === 'offline';
      setVisible(shouldBlock && !dismissed);
      
      if (newState.status === 'ready') {
        setDismissed(false);
      }
    });

    return unsubscribe;
  }, [dismissed]);

  const handleRetry = async () => {
    onRetry?.();
    await apiResilience.wakeBackend();
  };

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
  };

  // For waking/connecting state, show a non-blocking banner
  if (state.status === 'waking') {
    return <StatusBanner state={state} onRetry={handleRetry} />;
  }

  // For slow state, show non-blocking banner
  if (state.status === 'slow') {
    return <StatusBanner state={state} onRetry={handleRetry} />;
  }

  if (!visible) return null;

  if (mode === 'banner') {
    return <StatusBanner state={state} onRetry={handleRetry} />;
  }

  return (
    <div 
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex }}
    >
      <StatusCard state={state} onRetry={handleRetry} onDismiss={handleDismiss} />
    </div>
  );
}

function StatusCard({ state, onRetry, onDismiss }: { state: BackendState; onRetry: () => void; onDismiss?: () => void }) {
  return (
    <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      {/* Header */}
      <div className={cn(
        'p-6 flex items-center justify-center',
        state.status === 'offline' && 'bg-slate-500/10',
        (state.status === 'unreachable' || state.status === 'error') && 'bg-destructive/10',
      )}>
        <StatusIcon status={state.status} size="lg" />
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">
            {getDefaultTitle(state.status)}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {state.status === 'offline' 
              ? 'Check your Wi-Fi or mobile data connection'
              : 'We\'re having trouble reaching the server. Please try again.'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onRetry}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Continue anyway
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBanner({ state, onRetry }: { state: BackendState; onRetry: () => void }) {
  return (
    <div className={cn(
      'fixed top-0 left-0 right-0 z-40 px-3 sm:px-4 py-2 sm:py-3 animate-in slide-in-from-top duration-300 shadow-lg',
      state.status === 'waking' && 'bg-primary text-primary-foreground',
      state.status === 'slow' && 'bg-amber-500 text-white',
      (state.status === 'unreachable' || state.status === 'error') && 'bg-destructive text-destructive-foreground',
      state.status === 'offline' && 'bg-slate-600 text-white',
    )}>
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <StatusIcon status={state.status} size="sm" />
          <p className="font-medium text-xs sm:text-sm truncate">
            {state.status === 'waking' ? 'Reconnecting...' : getDefaultTitle(state.status)}
          </p>
        </div>

        {(state.status === 'unreachable' || state.status === 'error' || state.status === 'offline') && (
          <button
            onClick={onRetry}
            className="flex-shrink-0 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs sm:text-sm font-medium transition-colors"
          >
            <RefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status, size = 'md' }: { status: BackendStatus; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-14 w-14',
  };

  const iconClass = sizeClasses[size];

  switch (status) {
    case 'waking':
      return <Loader2 className={`${iconClass} animate-spin`} />;
    case 'slow':
      return <AlertTriangle className={iconClass} />;
    case 'unreachable':
    case 'error':
      return <AlertTriangle className={`${iconClass} text-destructive`} />;
    case 'offline':
      return <WifiOff className={`${iconClass} text-slate-500`} />;
    case 'ready':
      return <CheckCircle className={`${iconClass} text-green-500`} />;
    default:
      return <Loader2 className={`${iconClass} text-muted-foreground animate-spin`} />;
  }
}

function getDefaultTitle(status: BackendStatus): string {
  switch (status) {
    case 'waking':
      return 'Reconnecting...';
    case 'slow':
      return 'Connection is slow';
    case 'unreachable':
      return 'Server unavailable';
    case 'error':
      return 'Something went wrong';
    case 'offline':
      return 'No internet connection';
    default:
      return 'Loading...';
  }
}

/**
 * Hook to use backend status in components
 */
export function useBackendStatus() {
  const [state, setState] = useState<BackendState>(apiResilience.getState());

  useEffect(() => {
    return apiResilience.subscribe(setState);
  }, []);

  return {
    ...state,
    isReady: state.status === 'ready' || state.status === 'slow',
    isWaking: state.status === 'waking',
    isOffline: state.status === 'offline',
    isError: state.status === 'error' || state.status === 'unreachable',
    retry: () => apiResilience.wakeBackend(),
  };
}
