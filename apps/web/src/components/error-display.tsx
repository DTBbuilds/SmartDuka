'use client';

import { useState } from 'react';
import { getUserFriendlyError, UserFriendlyError } from '@/lib/error-messages';
import { AlertTriangle, XCircle, Info, AlertCircle, RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorDisplayProps {
  error: unknown;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
  variant?: 'inline' | 'card' | 'banner' | 'toast';
}

/**
 * User-Friendly Error Display Component
 * 
 * Displays errors in a human-readable format with:
 * - Clear title and message
 * - Helpful suggestions
 * - Retry button when applicable
 * - Technical details (collapsible, for debugging)
 */
export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  className,
  variant = 'card',
}: ErrorDisplayProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const friendlyError = getUserFriendlyError(error);

  // Get raw error message for details
  const rawMessage = error instanceof Error 
    ? error.message 
    : typeof error === 'string' 
      ? error 
      : JSON.stringify(error);

  const getIcon = (severity: UserFriendlyError['severity']) => {
    switch (severity) {
      case 'info':
        return <Info className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'error':
        return <AlertCircle className="h-5 w-5" />;
      case 'critical':
        return <XCircle className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getColors = (severity: UserFriendlyError['severity']) => {
    switch (severity) {
      case 'info':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          icon: 'text-blue-600 dark:text-blue-400',
          title: 'text-blue-800 dark:text-blue-200',
          text: 'text-blue-700 dark:text-blue-300',
          button: 'bg-blue-600 hover:bg-blue-700 text-white',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          icon: 'text-yellow-600 dark:text-yellow-400',
          title: 'text-yellow-800 dark:text-yellow-200',
          text: 'text-yellow-700 dark:text-yellow-300',
          button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
        };
      case 'error':
      case 'critical':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          icon: 'text-red-600 dark:text-red-400',
          title: 'text-red-800 dark:text-red-200',
          text: 'text-red-700 dark:text-red-300',
          button: 'bg-red-600 hover:bg-red-700 text-white',
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          border: 'border-gray-200 dark:border-gray-800',
          icon: 'text-gray-600 dark:text-gray-400',
          title: 'text-gray-800 dark:text-gray-200',
          text: 'text-gray-700 dark:text-gray-300',
          button: 'bg-gray-600 hover:bg-gray-700 text-white',
        };
    }
  };

  const colors = getColors(friendlyError.severity);

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2 text-sm', colors.text, className)}>
        <span className={colors.icon}>{getIcon(friendlyError.severity)}</span>
        <span>{friendlyError.message}</span>
        {friendlyError.canRetry && onRetry && (
          <button onClick={onRetry} className="underline hover:no-underline">
            Try again
          </button>
        )}
      </div>
    );
  }

  if (variant === 'toast') {
    return (
      <div className={cn(
        'rounded-lg border p-4 shadow-lg max-w-sm',
        colors.bg,
        colors.border,
        className
      )}>
        <div className="flex items-start gap-3">
          <span className={cn('flex-shrink-0 mt-0.5', colors.icon)}>
            {getIcon(friendlyError.severity)}
          </span>
          <div className="flex-1 min-w-0">
            <p className={cn('font-medium text-sm', colors.title)}>
              {friendlyError.title}
            </p>
            <p className={cn('text-sm mt-1', colors.text)}>
              {friendlyError.message}
            </p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={cn('flex-shrink-0', colors.text, 'hover:opacity-70')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={cn(
        'border-b px-4 py-3',
        colors.bg,
        colors.border,
        className
      )}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className={colors.icon}>{getIcon(friendlyError.severity)}</span>
            <div>
              <span className={cn('font-medium', colors.title)}>{friendlyError.title}: </span>
              <span className={colors.text}>{friendlyError.message}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {friendlyError.canRetry && onRetry && (
              <button
                onClick={onRetry}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  colors.button
                )}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            )}
            {onDismiss && (
              <button onClick={onDismiss} className={cn(colors.text, 'hover:opacity-70 p-1')}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Card variant (default)
  return (
    <div className={cn(
      'rounded-lg border p-6',
      colors.bg,
      colors.border,
      className
    )}>
      <div className="flex items-start gap-4">
        <div className={cn('flex-shrink-0 p-2 rounded-full', colors.bg)}>
          <span className={colors.icon}>{getIcon(friendlyError.severity)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn('font-semibold text-lg', colors.title)}>
            {friendlyError.title}
          </h3>
          <p className={cn('mt-2', colors.text)}>
            {friendlyError.message}
          </p>
          {friendlyError.suggestion && (
            <p className={cn('mt-2 text-sm', colors.text, 'opacity-80')}>
              💡 {friendlyError.suggestion}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-4">
            {friendlyError.canRetry && onRetry && (
              <button
                onClick={onRetry}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  colors.button
                )}
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  'bg-white dark:bg-gray-800 border',
                  colors.border,
                  colors.text,
                  'hover:opacity-80'
                )}
              >
                Dismiss
              </button>
            )}
          </div>

          {/* Technical details (collapsible) */}
          {showDetails && rawMessage !== friendlyError.message && (
            <div className="mt-4 pt-4 border-t border-current/10">
              <button
                onClick={() => setDetailsOpen(!detailsOpen)}
                className={cn(
                  'flex items-center gap-1 text-xs',
                  colors.text,
                  'opacity-60 hover:opacity-100'
                )}
              >
                {detailsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Technical Details
              </button>
              {detailsOpen && (
                <pre className={cn(
                  'mt-2 p-3 rounded text-xs font-mono overflow-x-auto',
                  'bg-black/5 dark:bg-white/5'
                )}>
                  {rawMessage}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state with error styling
 */
export function ErrorEmptyState({
  title = 'Something went wrong',
  message = 'We couldn\'t load the data you requested.',
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
        <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      )}
    </div>
  );
}
