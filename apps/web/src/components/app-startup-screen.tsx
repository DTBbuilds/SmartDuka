'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { appInitializer, InitState, InitPhase } from '@/lib/app-initializer';
import { 
  Wifi, 
  WifiOff, 
  Server, 
  Shield, 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Zap,
  Clock,
  Globe,
} from 'lucide-react';

interface AppStartupScreenProps {
  onReady?: () => void;
}

const phaseMessages: Record<InitPhase, { title: string; icon: React.ReactNode }> = {
  idle: { title: 'Starting...', icon: <Zap className="h-5 w-5" /> },
  checking_connection: { title: 'Checking connection', icon: <Globe className="h-5 w-5" /> },
  waking_server: { title: 'Waking up server', icon: <Server className="h-5 w-5" /> },
  server_ready: { title: 'Server connected', icon: <CheckCircle className="h-5 w-5" /> },
  checking_auth: { title: 'Verifying session', icon: <Shield className="h-5 w-5" /> },
  loading_data: { title: 'Loading data', icon: <Database className="h-5 w-5" /> },
  ready: { title: 'Ready!', icon: <CheckCircle className="h-5 w-5" /> },
  error: { title: 'Connection failed', icon: <AlertTriangle className="h-5 w-5" /> },
};

const loadingTips = [
  { icon: '☕', text: 'Our servers may need a moment to warm up after being idle.' },
  { icon: '🔒', text: 'Your data is encrypted and securely stored.' },
  { icon: '📱', text: 'SmartDuka works offline once loaded!' },
  { icon: '⚡', text: 'Subsequent loads will be much faster.' },
  { icon: '🌍', text: 'Connecting to our cloud servers...' },
  { icon: '💾', text: 'Your data syncs automatically across devices.' },
];

export function AppStartupScreen({ onReady }: AppStartupScreenProps) {
  const [state, setState] = useState<InitState>(appInitializer.getState());
  const [currentTip, setCurrentTip] = useState(0);
  const [showTips, setShowTips] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Subscribe to initializer state
  useEffect(() => {
    const unsubscribe = appInitializer.subscribe(setState);
    
    // Start initialization
    appInitializer.initialize().then((success) => {
      if (success && onReady) {
        // Small delay for smooth transition
        setTimeout(onReady, 500);
      }
    });

    return unsubscribe;
  }, [onReady]);

  // Track elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Show tips after 5 seconds
  useEffect(() => {
    if (elapsedSeconds >= 5 && state.phase !== 'ready' && state.phase !== 'error') {
      setShowTips(true);
    }
  }, [elapsedSeconds, state.phase]);

  // Rotate tips
  useEffect(() => {
    if (!showTips) return;
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % loadingTips.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [showTips]);

  const handleRetry = async () => {
    setElapsedSeconds(0);
    setShowTips(false);
    await appInitializer.retry();
  };

  const isError = state.phase === 'error';
  const isReady = state.phase === 'ready';
  const isColdStart = state.isServerCold;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-orange-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative w-full max-w-md sm:max-w-lg px-6 py-8 my-auto">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-6">
            {/* Outer ring with gradient */}
            <div className="relative h-24 w-24 mx-auto">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 p-1 shadow-lg shadow-orange-500/25">
                <div className="h-full w-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                  {/* Logo */}
                  <span className="text-4xl font-bold bg-gradient-to-br from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    S
                  </span>
                </div>
              </div>
              {/* Animated spinner ring - positioned over the outer ring */}
              {!isReady && !isError && (
                <div className="absolute inset-0 h-24 w-24 rounded-full border-4 border-transparent border-t-orange-500 animate-spin" />
              )}
            </div>
            
            {/* Status indicator dot */}
            <div className={cn(
              'absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-white dark:border-slate-900 transition-colors duration-300',
              isReady && 'bg-green-500',
              isError && 'bg-red-500',
              !isReady && !isError && 'bg-orange-500 animate-pulse',
            )} />
          </div>

          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            SmartDuka
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Point of Sale & Inventory Management
          </p>
        </div>

        {/* Progress Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700 overflow-hidden">
          {/* Progress Bar */}
          <div className="h-1.5 bg-slate-100 dark:bg-slate-700">
            <div 
              className={cn(
                'h-full transition-all duration-500 ease-out',
                isError ? 'bg-red-500' : 'bg-gradient-to-r from-orange-500 to-amber-500',
              )}
              style={{ width: `${state.progress}%` }}
            />
          </div>

          <div className="p-6">
            {/* Current Phase */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center transition-colors',
                  isReady && 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                  isError && 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
                  !isReady && !isError && 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
                )}>
                  {phaseMessages[state.phase].icon}
                </div>
                <div>
                  <p className={cn(
                    'font-semibold',
                    isReady && 'text-green-600 dark:text-green-400',
                    isError && 'text-red-600 dark:text-red-400',
                    !isReady && !isError && 'text-slate-900 dark:text-white',
                  )}>
                    {state.message}
                  </p>
                  {state.subMessage && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {state.subMessage}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className={cn(
                  'text-2xl font-bold',
                  isError ? 'text-red-500' : 'text-orange-600 dark:text-orange-400',
                )}>
                  {state.progress}%
                </span>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="space-y-3 mb-6">
              <ProgressStep 
                label="Connect to server" 
                status={getStepStatus(state.phase, ['checking_connection', 'waking_server'], ['server_ready', 'checking_auth', 'loading_data', 'ready'])}
                icon={<Server className="h-4 w-4" />}
              />
              <ProgressStep 
                label="Verify session" 
                status={getStepStatus(state.phase, ['checking_auth'], ['loading_data', 'ready'])}
                icon={<Shield className="h-4 w-4" />}
              />
              <ProgressStep 
                label="Load workspace" 
                status={getStepStatus(state.phase, ['loading_data'], ['ready'])}
                icon={<Database className="h-4 w-4" />}
              />
            </div>

            {/* Cold Start Notice */}
            {isColdStart && !isReady && !isError && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Server is waking up
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      Free-tier servers sleep after inactivity. This only happens on first load.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error State */}
            {isError && (
              <div className="space-y-4">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <WifiOff className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-red-800 dark:text-red-200">
                        {state.message}
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {state.subMessage || 'Please check your internet connection and try again.'}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleRetry}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-medium hover:from-orange-700 hover:to-amber-700 transition-all shadow-lg shadow-orange-500/25"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Loading Tips */}
        {showTips && !isError && !isReady && (
          <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{loadingTips[currentTip].icon}</span>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {loadingTips[currentTip].text}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Elapsed Time (for long waits) */}
        {elapsedSeconds >= 15 && !isReady && !isError && (
          <div className="mt-4 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Loading for {elapsedSeconds} seconds...
              {elapsedSeconds >= 30 && (
                <span className="block mt-1 text-amber-500">
                  This is taking longer than usual
                </span>
              )}
            </p>
          </div>
        )}

        {/* Bouncing dots */}
        {!isReady && !isError && (
          <div className="flex justify-center gap-1.5 mt-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-full bg-orange-500 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressStep({ 
  label, 
  status, 
  icon 
}: { 
  label: string; 
  status: 'pending' | 'active' | 'complete' | 'error';
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        'h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all duration-300',
        status === 'complete' && 'bg-green-500 border-green-500 text-white',
        status === 'active' && 'border-orange-500 text-orange-500 animate-pulse',
        status === 'pending' && 'border-slate-200 dark:border-slate-600 text-slate-300 dark:text-slate-600',
        status === 'error' && 'bg-red-500 border-red-500 text-white',
      )}>
        {status === 'complete' ? (
          <CheckCircle className="h-4 w-4" />
        ) : status === 'active' ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : status === 'error' ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          icon
        )}
      </div>
      <span className={cn(
        'text-sm font-medium transition-colors',
        status === 'complete' && 'text-green-600 dark:text-green-400',
        status === 'active' && 'text-slate-900 dark:text-white',
        status === 'pending' && 'text-slate-400 dark:text-slate-500',
        status === 'error' && 'text-red-600 dark:text-red-400',
      )}>
        {label}
      </span>
    </div>
  );
}

function getStepStatus(
  currentPhase: InitPhase, 
  activePhases: InitPhase[], 
  completePhases: InitPhase[]
): 'pending' | 'active' | 'complete' | 'error' {
  if (currentPhase === 'error') return 'error';
  if (completePhases.includes(currentPhase)) return 'complete';
  if (activePhases.includes(currentPhase)) return 'active';
  return 'pending';
}
