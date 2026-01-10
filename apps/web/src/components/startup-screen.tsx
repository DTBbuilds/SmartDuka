'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { connectionMonitor, ConnectionState, ConnectionStatus } from '@/lib/connection-monitor';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, Clock, RefreshCw, Server, Database, Shield, Globe, Zap, BarChart3 } from 'lucide-react';

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
    { id: 'connection', label: 'Connect to server', icon: <Globe className="h-4 w-4" />, status: 'loading' },
    { id: 'auth', label: 'Verify session', icon: <Shield className="h-4 w-4" />, status: 'pending' },
    { id: 'data', label: 'Load workspace', icon: <Database className="h-4 w-4" />, status: 'pending' },
  ]);

  const [elapsedTime, setElapsedTime] = useState(0);
  const [showTips, setShowTips] = useState(false);

  const tips = [
    "Establishing secure connection to SmartDuka servers...",
    "Connecting to optimal server location for best performance.",
    "Your data is being securely synchronized across our global network.",
    "Thank you for your patience - almost ready!",
    "Tip: Once loaded, you can continue working even offline.",
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
        return <RefreshCw className="h-5 w-5 text-orange-500 animate-spin" />;
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
        return 'text-orange-600 dark:text-orange-400';
      case 'offline':
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  // Calculate progress percentage
  const completedSteps = steps.filter(s => s.status === 'complete').length;
  const progressPercent = Math.round((completedSteps / steps.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-background to-orange-500/5 overflow-hidden">
      {/* Decorative background elements - visible on desktop */}
      <div className="hidden lg:block absolute top-20 left-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="hidden lg:block absolute bottom-20 right-20 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="hidden lg:block absolute top-1/2 left-1/4 w-48 h-48 bg-green-500/5 rounded-full blur-2xl" />
      
      <div className="w-full max-w-6xl px-6 relative z-10">
        {/* Desktop: Horizontal layout, Mobile: Vertical layout */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-20">
          
          {/* Left Side - Branding (larger on desktop) */}
          <div className="text-center lg:text-left lg:flex-1 mb-8 lg:mb-0">
            {/* Logo */}
            <div className="relative inline-block mb-6 lg:mb-8">
              {/* Animated logo ring - larger on desktop */}
              <div className="h-20 w-20 lg:h-32 lg:w-32 rounded-full border-4 border-primary/20 mx-auto lg:mx-0" />
              <div className="absolute inset-0 h-20 w-20 lg:h-32 lg:w-32 rounded-full border-4 border-transparent border-t-primary animate-spin mx-auto lg:mx-0" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl lg:text-5xl font-bold text-primary">S</span>
              </div>
            </div>
            
            {/* Brand name and tagline */}
            <h1 className="text-2xl lg:text-4xl font-bold text-foreground mb-2">SmartDuka</h1>
            <p className="text-sm lg:text-base text-muted-foreground">Point of Sale & Inventory Management</p>
            
            {/* Feature highlights - desktop only */}
            <div className="hidden lg:flex flex-col gap-3 mt-8">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm">Lightning-fast transactions</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-green-500" />
                </div>
                <span className="text-sm">Real-time inventory tracking</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Globe className="h-4 w-4 text-blue-500" />
                </div>
                <span className="text-sm">Secure cloud synchronization</span>
              </div>
            </div>
          </div>

          {/* Right Side - Connection Status Card */}
          <div className="lg:flex-1 lg:max-w-md">
            <div className="bg-card border rounded-xl p-6 shadow-lg">
              {/* Status Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {getStatusIcon(connectionState.status)}
                  <span className={cn('font-medium', getStatusColor(connectionState.status))}>
                    {getStatusMessage(connectionState.status)}
                  </span>
                </div>
                {/* Progress percentage */}
                <span className="text-sm font-medium text-muted-foreground">
                  {progressPercent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-muted rounded-full mb-6 overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
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
              <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Globe className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      {tips[currentTip]}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Elapsed time indicator for very long waits */}
            {elapsedTime >= 10 && (
              <div className="text-center mt-4">
                <p className="text-xs text-muted-foreground">
                  Connecting for {elapsedTime} seconds...
                  {elapsedTime >= 30 && (
                    <span className="block mt-1">
                      Reaching global server network. Please ensure stable internet connection.
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Progress dots */}
            {connectionState.status === 'connecting' || connectionState.status === 'slow' ? (
              <div className="flex justify-center gap-1.5 mt-6">
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
        return 'bg-orange-500 animate-pulse';
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
