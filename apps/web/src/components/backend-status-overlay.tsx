'use client';

import { useEffect, useState } from 'react';
import { Loader2, WifiOff, AlertTriangle, RefreshCw, Server, CheckCircle, Clock, Database, Shield } from 'lucide-react';
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
      // Show overlay only for critical states (unreachable, error, offline)
      // Don't block UI for 'waking' or 'slow' - use banner instead
      const shouldBlock = newState.status === 'unreachable' || 
                          newState.status === 'error' || 
                          newState.status === 'offline';
      setVisible(shouldBlock && !dismissed);
      
      // Reset dismissed when status changes to ready
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

  // For waking state, show full-screen informative overlay with progress and tips
  // This is more helpful for users during long backend wake-up periods
  if (state.status === 'waking') {
    return <WakingOverlay state={state} onRetry={handleRetry} zIndex={zIndex} />;
  }

  // For slow state, show non-blocking banner at top
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
    <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      {/* Header with icon */}
      <div className={`p-6 ${getHeaderBgClass(state.status)}`}>
        <div className="flex items-center justify-center">
          <StatusIcon status={state.status} size="lg" />
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-foreground">
            {state.message || getDefaultTitle(state.status)}
          </h3>
          {state.detail && (
            <p className="mt-2 text-sm text-muted-foreground">
              {state.detail}
            </p>
          )}
        </div>

        {/* Progress bar for waking state */}
        {state.status === 'waking' && state.progress !== undefined && (
          <div className="space-y-2">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                style={{ width: `${state.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Connecting...</span>
              {state.estimatedWaitTime !== undefined && state.estimatedWaitTime > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  ~{state.estimatedWaitTime}s remaining
                </span>
              )}
            </div>
          </div>
        )}

        {/* Retry info */}
        {state.retryCount > 0 && state.status === 'waking' && (
          <p className="text-xs text-center text-muted-foreground">
            Attempt {state.retryCount} of 10
          </p>
        )}

        {/* Tips for waiting */}
        {state.status === 'waking' && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Why is this happening?</strong> The server goes to sleep after periods of inactivity to save resources. It will be ready in a moment.
            </p>
          </div>
        )}

        {/* Action buttons */}
        {(state.status === 'unreachable' || state.status === 'error' || state.status === 'offline') && (
          <div className="flex flex-col gap-2">
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
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
            
            {state.status === 'offline' && (
              <p className="text-xs text-center text-muted-foreground">
                Check your Wi-Fi or mobile data connection
              </p>
            )}
          </div>
        )}

        {/* Slow connection notice */}
        {state.status === 'slow' && (
          <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Connection is slower than usual</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBanner({ state, onRetry }: { state: BackendState; onRetry: () => void }) {
  return (
    <div className={`fixed top-0 left-0 right-0 z-40 px-3 sm:px-4 py-2 sm:py-3 ${getBannerBgClass(state.status)} animate-in slide-in-from-top duration-300 shadow-lg`}>
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <StatusIcon status={state.status} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-xs sm:text-sm truncate">{state.message || getDefaultTitle(state.status)}</p>
            {state.detail && (
              <p className="text-[10px] sm:text-xs opacity-80 truncate">{state.detail}</p>
            )}
          </div>
        </div>

        {/* Progress for waking */}
        {state.status === 'waking' && state.progress !== undefined && (
          <div className="hidden sm:block flex-shrink-0 w-24 sm:w-32">
            <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-500 ease-out rounded-full"
                style={{ width: `${state.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Retry button */}
        {(state.status === 'unreachable' || state.status === 'error' || state.status === 'offline') && (
          <button
            onClick={onRetry}
            className="flex-shrink-0 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs sm:text-sm font-medium transition-colors"
          >
            <RefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="hidden xs:inline">Retry</span>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Full-screen informative overlay for backend wake-up
 * Shows detailed progress, tips, and elapsed time
 */
function WakingOverlay({ state, onRetry, zIndex = 50 }: { state: BackendState; onRetry: () => void; zIndex?: number }) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showTips, setShowTips] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);

  const tips = [
    "Our servers may take a moment to wake up if they've been idle.",
    "First load of the day might be slower - we're preparing everything for you.",
    "Your data is being securely loaded from our servers.",
    "Thank you for your patience - we're almost there!",
    "Tip: You can work offline once the app loads.",
  ];

  // Track elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Show tips after 5 seconds
  useEffect(() => {
    if (elapsedTime >= 5) {
      setShowTips(true);
    }
  }, [elapsedTime]);

  // Rotate tips every 5 seconds
  useEffect(() => {
    if (!showTips) return;
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [showTips, tips.length]);

  const getStepStatus = (progress: number | undefined, thresholds: { complete: number; loading: number }): 'complete' | 'loading' | 'pending' => {
    if (!progress) return 'loading';
    if (progress > thresholds.complete) return 'complete';
    if (progress > thresholds.loading) return 'loading';
    return 'pending';
  };

  const steps: Array<{ id: string; label: string; icon: React.ReactNode; status: 'complete' | 'loading' | 'pending' }> = [
    { 
      id: 'server', 
      label: 'Waking up server', 
      icon: <Server className="h-4 w-4" />, 
      status: state.progress && state.progress > 20 ? 'complete' : 'loading',
    },
    { 
      id: 'connection', 
      label: 'Establishing connection', 
      icon: <Database className="h-4 w-4" />, 
      status: getStepStatus(state.progress, { complete: 60, loading: 20 }),
    },
    { 
      id: 'ready', 
      label: 'Preparing your workspace', 
      icon: <Shield className="h-4 w-4" />, 
      status: state.progress && state.progress > 90 ? 'loading' : 'pending',
    },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5"
      style={{ zIndex }}
    >
      <div className="w-full max-w-md px-6">
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            {/* Animated logo ring */}
            <div className="h-20 w-20 rounded-full border-4 border-primary/20 mx-auto" />
            <div className="absolute inset-0 h-20 w-20 rounded-full border-4 border-transparent border-t-primary animate-spin mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">S</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">SmartDuka</h1>
          <p className="text-sm text-muted-foreground mt-1">Point of Sale & Inventory Management</p>
        </div>

        {/* Connection Status Card */}
        <div className="bg-card border rounded-xl p-6 shadow-lg mb-6">
          {/* Status Header */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <RefreshCw className="h-5 w-5 text-primary animate-spin" />
            <span className="font-medium text-primary">
              {state.message || 'Connecting to server...'}
            </span>
          </div>

          {/* Progress Steps */}
          <div className="space-y-3 mb-6">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center gap-3">
                {/* Step indicator */}
                <div className={cn(
                  'flex items-center justify-center h-8 w-8 rounded-full border-2 transition-all',
                  step.status === 'complete' && 'bg-green-500 border-green-500 text-white',
                  step.status === 'loading' && 'border-primary text-primary animate-pulse',
                  step.status === 'pending' && 'border-muted-foreground/30 text-muted-foreground/50',
                )}>
                  {step.status === 'complete' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : step.status === 'loading' ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    step.icon
                  )}
                </div>

                {/* Step label */}
                <div className="flex-1">
                  <p className={cn(
                    'text-sm font-medium',
                    step.status === 'complete' && 'text-green-600 dark:text-green-400',
                    step.status === 'loading' && 'text-foreground',
                    step.status === 'pending' && 'text-muted-foreground/50',
                  )}>
                    {step.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {state.progress !== undefined && (
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${state.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{state.progress}% complete</span>
                {state.estimatedWaitTime !== undefined && state.estimatedWaitTime > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    ~{state.estimatedWaitTime}s remaining
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Retry info */}
          {state.retryCount > 0 && (
            <p className="text-xs text-center text-muted-foreground mt-3">
              Attempt {state.retryCount} of 10
            </p>
          )}

          {/* Why is this happening */}
          <div className="bg-muted/50 rounded-lg p-3 mt-4">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Why is this happening?</strong> The server goes to sleep after periods of inactivity to save resources. It will be ready in a moment.
            </p>
          </div>
        </div>

        {/* Tips for long waits */}
        {showTips && (
          <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
              <p className="text-sm text-muted-foreground italic">
                💡 {tips[currentTip]}
              </p>
            </div>
          </div>
        )}

        {/* Elapsed time indicator for very long waits */}
        {elapsedTime >= 10 && (
          <div className="text-center mt-4">
            <p className="text-xs text-muted-foreground">
              Loading for {elapsedTime} seconds...
              {elapsedTime >= 30 && (
                <span className="block mt-1">
                  This is taking longer than usual. Please check your internet connection.
                </span>
              )}
            </p>
          </div>
        )}

        {/* Progress dots */}
        <div className="flex justify-center gap-1 mt-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status, size = 'md' }: { status: BackendStatus; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-16 w-16',
  };

  const containerClasses = {
    sm: '',
    md: 'p-2 rounded-full',
    lg: 'p-4 rounded-full',
  };

  const iconClass = sizeClasses[size];

  switch (status) {
    case 'waking':
      return (
        <div className={`${containerClasses[size]} bg-primary/10`}>
          <Server className={`${iconClass} text-primary animate-pulse`} />
        </div>
      );
    case 'slow':
      return (
        <div className={`${containerClasses[size]} bg-amber-500/10`}>
          <Clock className={`${iconClass} text-amber-500`} />
        </div>
      );
    case 'unreachable':
    case 'error':
      return (
        <div className={`${containerClasses[size]} bg-destructive/10`}>
          <AlertTriangle className={`${iconClass} text-destructive`} />
        </div>
      );
    case 'offline':
      return (
        <div className={`${containerClasses[size]} bg-slate-500/10`}>
          <WifiOff className={`${iconClass} text-slate-500`} />
        </div>
      );
    case 'ready':
      return (
        <div className={`${containerClasses[size]} bg-green-500/10`}>
          <CheckCircle className={`${iconClass} text-green-500`} />
        </div>
      );
    default:
      return (
        <div className={`${containerClasses[size]} bg-muted`}>
          <Loader2 className={`${iconClass} text-muted-foreground animate-spin`} />
        </div>
      );
  }
}

function getHeaderBgClass(status: BackendStatus): string {
  switch (status) {
    case 'waking':
      return 'bg-gradient-to-br from-primary/20 to-primary/5';
    case 'slow':
      return 'bg-gradient-to-br from-amber-500/20 to-amber-500/5';
    case 'unreachable':
    case 'error':
      return 'bg-gradient-to-br from-destructive/20 to-destructive/5';
    case 'offline':
      return 'bg-gradient-to-br from-slate-500/20 to-slate-500/5';
    default:
      return 'bg-muted/50';
  }
}

function getBannerBgClass(status: BackendStatus): string {
  switch (status) {
    case 'waking':
      return 'bg-primary text-primary-foreground';
    case 'slow':
      return 'bg-amber-500 text-white';
    case 'unreachable':
    case 'error':
      return 'bg-destructive text-destructive-foreground';
    case 'offline':
      return 'bg-slate-600 text-white';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getDefaultTitle(status: BackendStatus): string {
  switch (status) {
    case 'waking':
      return 'Connecting to server...';
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
