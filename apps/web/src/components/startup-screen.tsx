'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { connectionMonitor, ConnectionState, ConnectionStatus } from '@/lib/connection-monitor';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, Clock, RefreshCw, Server, Database, Shield } from 'lucide-react';

interface StartupScreenProps {
  onReady?: () => void;
  minDisplayTime?: number; // Minimum time to show the screen (ms)
}

interface StartupStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: 'pending' | 'loading' | 'complete' | 'error';
  message?: string;
}

/**
 * Enhanced Startup Screen
 * 
 * Shows during app initialization with:
 * - Connection status monitoring
 * - Step-by-step progress indication
 * - Informative messages for long waits
 * - Retry functionality
 */
export function StartupScreen({ onReady, minDisplayTime = 1000 }: StartupScreenProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'connecting',
    latency: null,
    lastChecked: null,
    errorMessage: null,
    retryCount: 0,
  });

  const [steps, setSteps] = useState<StartupStep[]>([
    { id: 'connection', label: 'Connecting to server', icon: <Server className="h-4 w-4" />, status: 'loading' },
    { id: 'auth', label: 'Checking authentication', icon: <Shield className="h-4 w-4" />, status: 'pending' },
    { id: 'data', label: 'Loading your data', icon: <Database className="h-4 w-4" />, status: 'pending' },
  ]);

  const [elapsedTime, setElapsedTime] = useState(0);
  const [showTips, setShowTips] = useState(false);

  const tips = [
    "Our servers may take a moment to wake up if they've been idle.",
    "First load of the day might be slower - we're preparing everything for you.",
    "Your data is being securely loaded from our servers.",
    "Thank you for your patience - we're almost there!",
    "Tip: You can work offline once the app loads.",
  ];

  const [currentTip, setCurrentTip] = useState(0);

  // Subscribe to connection monitor
  useEffect(() => {
    const unsubscribe = connectionMonitor.subscribe(setConnectionState);
    connectionMonitor.startMonitoring();

    return () => {
      unsubscribe();
    };
  }, []);

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

  // Update steps based on connection state
  useEffect(() => {
    setSteps(prev => prev.map(step => {
      if (step.id === 'connection') {
        if (connectionState.status === 'connected' || connectionState.status === 'slow') {
          return { ...step, status: 'complete', message: connectionState.latency ? `${connectionState.latency}ms` : undefined };
        } else if (connectionState.status === 'error' || connectionState.status === 'offline') {
          return { ...step, status: 'error', message: connectionState.errorMessage || 'Connection failed' };
        }
        return { ...step, status: 'loading' };
      }
      return step;
    }));
  }, [connectionState]);

  const handleRetry = () => {
    setElapsedTime(0);
    setSteps(prev => prev.map(step => ({ ...step, status: step.id === 'connection' ? 'loading' : 'pending' })));
    connectionMonitor.checkConnection();
  };

  const getStatusIcon = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'slow':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'connecting':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'offline':
        return <WifiOff className="h-5 w-5 text-red-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Wifi className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusMessage = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return 'Connected to SmartDuka';
      case 'slow':
        return 'Connection is slow - please wait';
      case 'connecting':
        return 'Connecting to server...';
      case 'offline':
        return 'No internet connection';
      case 'error':
        return 'Unable to connect to server';
      default:
        return 'Checking connection...';
    }
  };

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 dark:text-green-400';
      case 'slow':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'connecting':
        return 'text-blue-600 dark:text-blue-400';
      case 'offline':
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
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
            {getStatusIcon(connectionState.status)}
            <span className={cn('font-medium', getStatusColor(connectionState.status))}>
              {getStatusMessage(connectionState.status)}
            </span>
          </div>

          {/* Progress Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-3">
                {/* Step indicator */}
                <div className={cn(
                  'flex items-center justify-center h-8 w-8 rounded-full border-2 transition-all',
                  step.status === 'complete' && 'bg-green-500 border-green-500 text-white',
                  step.status === 'loading' && 'border-primary text-primary animate-pulse',
                  step.status === 'error' && 'bg-red-500 border-red-500 text-white',
                  step.status === 'pending' && 'border-muted-foreground/30 text-muted-foreground/50',
                )}>
                  {step.status === 'complete' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : step.status === 'loading' ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : step.status === 'error' ? (
                    <AlertTriangle className="h-4 w-4" />
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
                    step.status === 'error' && 'text-red-600 dark:text-red-400',
                    step.status === 'pending' && 'text-muted-foreground/50',
                  )}>
                    {step.label}
                  </p>
                  {step.message && (
                    <p className="text-xs text-muted-foreground">{step.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Error state with retry */}
          {(connectionState.status === 'error' || connectionState.status === 'offline') && (
            <div className="mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground text-center mb-3">
                {connectionState.errorMessage || 'Unable to connect to the server'}
              </p>
              <button
                onClick={handleRetry}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Tips for long waits */}
        {showTips && connectionState.status !== 'error' && connectionState.status !== 'offline' && (
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
        {connectionState.status === 'connecting' || connectionState.status === 'slow' ? (
          <div className="flex justify-center gap-1 mt-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Compact connection status indicator for use in navbar/header
 */
export function ConnectionStatusIndicator({ className }: { className?: string }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'connecting',
    latency: null,
    lastChecked: null,
    errorMessage: null,
    retryCount: 0,
  });

  useEffect(() => {
    const unsubscribe = connectionMonitor.subscribe(setConnectionState);
    return unsubscribe;
  }, []);

  const getIndicatorColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'slow':
        return 'bg-yellow-500';
      case 'connecting':
        return 'bg-blue-500 animate-pulse';
      case 'offline':
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-muted-foreground';
    }
  };

  // Only show if not connected
  if (connectionState.status === 'connected') {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2 text-xs', className)}>
      <div className={cn('h-2 w-2 rounded-full', getIndicatorColor(connectionState.status))} />
      <span className="text-muted-foreground">
        {connectionState.status === 'slow' && 'Slow connection'}
        {connectionState.status === 'connecting' && 'Connecting...'}
        {connectionState.status === 'offline' && 'Offline'}
        {connectionState.status === 'error' && 'Connection error'}
      </span>
    </div>
  );
}
