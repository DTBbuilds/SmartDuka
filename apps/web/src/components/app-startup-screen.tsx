'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { appInitializer, InitState } from '@/lib/app-initializer';
import { ShoppingCart, WifiOff, RefreshCw } from 'lucide-react';

interface AppStartupScreenProps {
  onReady?: () => void;
}

export function AppStartupScreen({ onReady }: AppStartupScreenProps) {
  const [state, setState] = useState<InitState>(appInitializer.getState());
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const unsubscribe = appInitializer.subscribe(setState);

    appInitializer.initialize().then((success) => {
      if (success && onReady) {
        // Smooth fade-out before signaling ready
        setFadeOut(true);
        setTimeout(onReady, 600);
      }
    });

    return unsubscribe;
  }, [onReady]);

  const handleRetry = useCallback(async () => {
    const success = await appInitializer.retry();
    if (success && onReady) {
      setFadeOut(true);
      setTimeout(onReady, 600);
    }
  }, [onReady]);

  const isError = state.phase === 'error';
  const isReady = state.phase === 'ready';
  const progress = Math.round(state.progress);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-white dark:bg-slate-950 transition-opacity duration-500',
        fadeOut && 'opacity-0 pointer-events-none',
      )}
    >
      {/* Subtle radial gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-50/60 via-transparent to-transparent dark:from-orange-950/20 dark:via-transparent dark:to-transparent" />

      <div className="relative flex flex-col items-center px-6 w-full max-w-sm">
        {/* Logo mark */}
        <div className="relative mb-10">
          {/* Glow ring behind logo */}
          <div
            className={cn(
              'absolute -inset-4 rounded-full transition-opacity duration-1000',
              !isError && !isReady && 'opacity-100',
              (isError || isReady) && 'opacity-0',
            )}
            style={{
              background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)',
            }}
          />

          {/* Logo container */}
          <div className="relative h-20 w-20">
            {/* Spinning arc — only while loading */}
            {!isReady && !isError && (
              <svg className="absolute inset-0 h-20 w-20 animate-spin" style={{ animationDuration: '1.8s' }} viewBox="0 0 80 80">
                <circle
                  cx="40" cy="40" r="37"
                  fill="none"
                  stroke="url(#arc-gradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="120 200"
                />
                <defs>
                  <linearGradient id="arc-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f97316" stopOpacity="0" />
                    <stop offset="50%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
              </svg>
            )}

            {/* Success ring */}
            {isReady && (
              <svg className="absolute inset-0 h-20 w-20" viewBox="0 0 80 80">
                <circle
                  cx="40" cy="40" r="37"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="animate-in zoom-in duration-300"
                />
              </svg>
            )}

            {/* Inner circle with logo */}
            <div className={cn(
              'h-20 w-20 rounded-full flex items-center justify-center transition-all duration-500',
              'bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg',
              isReady && 'from-green-500 to-emerald-600',
              isError && 'from-red-500 to-rose-600',
            )}>
              <ShoppingCart className="h-9 w-9 text-white" />
            </div>
          </div>
        </div>

        {/* Brand name */}
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 tracking-tight">
          SmartDuka
        </h1>
        <p className="text-[13px] text-slate-400 dark:text-slate-500 mb-8">
          Point of Sale & Inventory
        </p>

        {/* Progress bar — thin, elegant */}
        {!isError && (
          <div className="w-full max-w-[200px] mb-5">
            <div className="h-[3px] rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all ease-out',
                  isReady
                    ? 'bg-green-500 duration-300'
                    : 'bg-gradient-to-r from-orange-500 to-amber-400 duration-700',
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Phase text */}
        {!isError && !isReady && (
          <p className="text-sm text-slate-400 dark:text-slate-500 animate-pulse">
            {state.phase === 'connecting' && 'Connecting...'}
            {state.phase === 'authenticating' && 'Preparing workspace...'}
            {state.phase === 'idle' && 'Starting...'}
          </p>
        )}

        {isReady && (
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            Welcome back
          </p>
        )}

        {/* Error state */}
        {isError && (
          <div className="w-full space-y-4 mt-2">
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl">
              <WifiOff className="h-5 w-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  {state.error || 'Unable to connect'}
                </p>
                <p className="text-xs text-red-500/80 dark:text-red-400/60 mt-0.5">
                  Check your connection and try again
                </p>
              </div>
            </div>
            <button
              onClick={handleRetry}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
