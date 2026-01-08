'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  AlertTriangle, 
  Clock, 
  X,
  Bell,
  CreditCard,
} from 'lucide-react';
import { useSubscriptionEnforcement, SubscriptionWarning } from '@/hooks/use-subscription-enforcement';

/**
 * Subscription Warning Banner
 * Shows countdown warnings before subscription expires
 * Displays at the top of the page for various warning severities
 */
export function SubscriptionWarningBanner() {
  const { warnings, hasWarnings, loading } = useSubscriptionEnforcement();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load dismissed warnings from session storage
    const stored = sessionStorage.getItem('dismissed-subscription-warnings');
    if (stored) {
      try {
        setDismissed(new Set(JSON.parse(stored)));
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  if (!mounted || loading || !hasWarnings) {
    return null;
  }

  // Filter out dismissed warnings (but never dismiss critical ones)
  const activeWarnings = warnings.filter(w => 
    w.severity === 'critical' || !dismissed.has(getWarningKey(w))
  );

  if (activeWarnings.length === 0) {
    return null;
  }

  // Show the most severe warning
  const warning = getMostSevereWarning(activeWarnings);
  if (!warning) return null;

  const config = getWarningConfig(warning);

  const handleDismiss = () => {
    if (warning.severity === 'critical') return; // Can't dismiss critical warnings
    
    const key = getWarningKey(warning);
    const newDismissed = new Set(dismissed);
    newDismissed.add(key);
    setDismissed(newDismissed);
    sessionStorage.setItem('dismissed-subscription-warnings', JSON.stringify([...newDismissed]));
  };

  return (
    <div className={`${config.bgColor} border-b-2 ${config.borderColor} relative`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className={`p-1.5 rounded-full ${config.iconBg}`}>
              {config.icon}
            </div>
            <div className="flex-1">
              <span className={`font-bold ${config.titleColor}`}>
                {warning.title}
                {warning.daysRemaining !== undefined && warning.daysRemaining > 0 && (
                  <span className="ml-2 font-normal">
                    ({warning.daysRemaining} {warning.daysRemaining === 1 ? 'day' : 'days'} remaining)
                  </span>
                )}
                {warning.daysUntilSuspension !== undefined && warning.daysUntilSuspension > 0 && (
                  <span className="ml-2 font-normal">
                    ({warning.daysUntilSuspension} {warning.daysUntilSuspension === 1 ? 'day' : 'days'} until suspension)
                  </span>
                )}
              </span>
              <span className={`block sm:inline sm:ml-2 ${config.textColor}`}>
                {warning.message}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {warning.actionUrl && warning.actionLabel && (
              <Link
                href={warning.actionUrl}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${config.buttonClass}`}
              >
                {warning.actionLabel}
              </Link>
            )}
            
            {warning.severity !== 'critical' && (
              <button
                onClick={handleDismiss}
                className={`p-1 rounded-full hover:bg-black/10 transition-colors ${config.dismissColor}`}
                aria-label="Dismiss"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Countdown indicator for critical warnings */}
      {warning.severity === 'critical' && warning.daysUntilSuspension !== undefined && (
        <CountdownIndicator days={warning.daysUntilSuspension} />
      )}
    </div>
  );
}

function CountdownIndicator({ days }: { days: number }) {
  const maxDays = 7; // Grace period
  const percentage = Math.max(0, Math.min(100, (days / maxDays) * 100));
  
  return (
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-200">
      <div 
        className="h-full bg-red-600 transition-all duration-500"
        style={{ width: `${100 - percentage}%` }}
      />
    </div>
  );
}

function getWarningKey(warning: SubscriptionWarning): string {
  return `${warning.type}-${warning.daysRemaining || warning.daysUntilSuspension || 0}`;
}

function getMostSevereWarning(warnings: SubscriptionWarning[]): SubscriptionWarning | null {
  const severityOrder = ['critical', 'error', 'warning', 'info'];
  
  for (const severity of severityOrder) {
    const warning = warnings.find(w => w.severity === severity);
    if (warning) return warning;
  }
  
  return warnings[0] || null;
}

function getWarningConfig(warning: SubscriptionWarning) {
  switch (warning.severity) {
    case 'critical':
      return {
        bgColor: 'bg-red-100',
        borderColor: 'border-red-400',
        iconBg: 'bg-red-200',
        icon: <AlertTriangle className="h-5 w-5 text-red-700" />,
        titleColor: 'text-red-900',
        textColor: 'text-red-700',
        buttonClass: 'bg-red-600 text-white hover:bg-red-700',
        dismissColor: 'text-red-600',
      };
    case 'error':
      return {
        bgColor: 'bg-orange-100',
        borderColor: 'border-orange-400',
        iconBg: 'bg-orange-200',
        icon: <AlertTriangle className="h-5 w-5 text-orange-700" />,
        titleColor: 'text-orange-900',
        textColor: 'text-orange-700',
        buttonClass: 'bg-orange-600 text-white hover:bg-orange-700',
        dismissColor: 'text-orange-600',
      };
    case 'warning':
      return {
        bgColor: 'bg-amber-100',
        borderColor: 'border-amber-400',
        iconBg: 'bg-amber-200',
        icon: <Clock className="h-5 w-5 text-amber-700" />,
        titleColor: 'text-amber-900',
        textColor: 'text-amber-700',
        buttonClass: 'bg-amber-600 text-white hover:bg-amber-700',
        dismissColor: 'text-amber-600',
      };
    case 'info':
    default:
      return {
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300',
        iconBg: 'bg-blue-100',
        icon: <Bell className="h-5 w-5 text-blue-600" />,
        titleColor: 'text-blue-900',
        textColor: 'text-blue-700',
        buttonClass: 'bg-blue-600 text-white hover:bg-blue-700',
        dismissColor: 'text-blue-600',
      };
  }
}

/**
 * Compact subscription warning for sidebar/header
 */
export function SubscriptionWarningBadge({ className = '' }: { className?: string }) {
  const { warnings, hasActionRequired } = useSubscriptionEnforcement();

  if (!hasActionRequired) {
    return null;
  }

  const criticalWarning = warnings.find(w => w.severity === 'critical' || w.severity === 'error');
  if (!criticalWarning) return null;

  return (
    <Link
      href={criticalWarning.actionUrl || '/admin/subscription'}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 transition-colors ${className}`}
    >
      <AlertTriangle className="h-3 w-3" />
      {criticalWarning.daysUntilSuspension !== undefined && criticalWarning.daysUntilSuspension > 0
        ? `${criticalWarning.daysUntilSuspension}d left`
        : 'Action Required'
      }
    </Link>
  );
}
