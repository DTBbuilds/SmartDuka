'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Crown, 
  AlertCircle, 
  Clock, 
  Check, 
  TrendingUp,
  Store,
  Users,
  Package,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';
import { useSubscription, type Subscription } from '@/hooks/use-subscription';

// Status configurations - high contrast colors
const statusConfig: Record<string, { 
  color: string; 
  bgColor: string; 
  borderColor: string;
  textOnBg: string;
  icon: React.ReactNode;
  label: string;
  urgent: boolean;
}> = {
  trial: { 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-100', 
    borderColor: 'border-blue-300',
    textOnBg: 'text-blue-900',
    icon: <Clock className="h-5 w-5" />,
    label: 'Trial',
    urgent: false,
  },
  active: { 
    color: 'text-emerald-700', 
    bgColor: 'bg-emerald-100', 
    borderColor: 'border-emerald-300',
    textOnBg: 'text-emerald-900',
    icon: <Check className="h-5 w-5" />,
    label: 'Active',
    urgent: false,
  },
  past_due: { 
    color: 'text-amber-700', 
    bgColor: 'bg-amber-100', 
    borderColor: 'border-amber-300',
    textOnBg: 'text-amber-900',
    icon: <AlertCircle className="h-5 w-5" />,
    label: 'Payment Due',
    urgent: true,
  },
  suspended: { 
    color: 'text-red-700', 
    bgColor: 'bg-red-100', 
    borderColor: 'border-red-300',
    textOnBg: 'text-red-900',
    icon: <AlertCircle className="h-5 w-5" />,
    label: 'Suspended',
    urgent: true,
  },
  cancelled: { 
    color: 'text-gray-700', 
    bgColor: 'bg-gray-200', 
    borderColor: 'border-gray-400',
    textOnBg: 'text-gray-900',
    icon: <X className="h-5 w-5" />,
    label: 'Cancelled',
    urgent: true,
  },
  expired: { 
    color: 'text-gray-700', 
    bgColor: 'bg-gray-200', 
    borderColor: 'border-gray-400',
    textOnBg: 'text-gray-900',
    icon: <Clock className="h-5 w-5" />,
    label: 'Expired',
    urgent: true,
  },
};

interface SubscriptionStatusCardProps {
  compact?: boolean;
  showUpgradeButton?: boolean;
  className?: string;
}

export function SubscriptionStatusCard({ 
  compact = false, 
  showUpgradeButton = true,
  className = '',
}: SubscriptionStatusCardProps) {
  const { subscription, loading, error } = useSubscription();

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border p-4 ${className}`}>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className={`bg-white rounded-xl border p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Crown className="h-5 w-5 text-gray-500" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">No Active Subscription</p>
            <p className="text-sm text-gray-500">Choose a plan to get started</p>
          </div>
          <Link
            href="/pricing"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Plans
          </Link>
        </div>
      </div>
    );
  }

  const config = statusConfig[subscription.status] || statusConfig.active;

  if (compact) {
    return (
      <Link 
        href="/admin/subscription"
        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-gray-50 ${config.borderColor} ${className}`}
      >
        <div className={`p-1.5 rounded-md ${config.bgColor}`}>
          <Crown className={`h-4 w-4 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {subscription.planName}
          </p>
          <p className="text-xs text-gray-500">
            {subscription.daysRemaining} days left
          </p>
        </div>
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.bgColor} ${config.color}`}>
          {config.label}
        </span>
      </Link>
    );
  }

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className={`px-4 py-3 ${config.bgColor} border-b ${config.borderColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className={`h-5 w-5 ${config.textOnBg}`} />
            <span className={`font-bold ${config.textOnBg}`}>
              {subscription.planName} Plan
            </span>
          </div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${config.bgColor} ${config.textOnBg} border-2 ${config.borderColor}`}>
            {config.icon}
            {config.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Urgent Alert */}
        {config.urgent && (
          <div className={`mb-4 p-3 rounded-lg ${config.bgColor} border-2 ${config.borderColor}`}>
            <div className="flex items-start gap-2">
              <AlertCircle className={`h-5 w-5 ${config.textOnBg} mt-0.5`} />
              <div>
                <p className={`font-bold ${config.textOnBg}`}>
                  {subscription.status === 'past_due' && 'Payment Required'}
                  {subscription.status === 'suspended' && 'Account Suspended'}
                  {subscription.status === 'cancelled' && 'Subscription Cancelled'}
                  {subscription.status === 'expired' && 'Subscription Expired'}
                </p>
                <p className={`text-sm ${config.color} mt-0.5`}>
                  {subscription.status === 'past_due' && 'Please pay your outstanding invoice to continue using SmartDuka.'}
                  {subscription.status === 'suspended' && 'Your account has been suspended due to non-payment.'}
                  {subscription.status === 'cancelled' && 'Your subscription has been cancelled. Reactivate to continue.'}
                  {subscription.status === 'expired' && 'Your subscription has expired. Renew to continue.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Info */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Billing</p>
            <p className="font-medium">
              KES {subscription.currentPrice.toLocaleString()}/{subscription.billingCycle === 'annual' ? 'year' : 'month'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Renews</p>
            <p className="font-medium">
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Usage Bars */}
        <div className="space-y-3">
          <UsageBar 
            icon={<Store className="h-4 w-4" />}
            label="Shops"
            current={subscription.usage.shops.current}
            limit={subscription.usage.shops.limit}
            color="blue"
          />
          <UsageBar 
            icon={<Users className="h-4 w-4" />}
            label="Employees"
            current={subscription.usage.employees.current}
            limit={subscription.usage.employees.limit}
            color="green"
          />
          <UsageBar 
            icon={<Package className="h-4 w-4" />}
            label="Products"
            current={subscription.usage.products.current}
            limit={subscription.usage.products.limit}
            color="purple"
          />
        </div>

        {/* Actions */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between">
          <Link
            href="/admin/subscription"
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            Manage Subscription
            <ChevronRight className="h-4 w-4" />
          </Link>
          {showUpgradeButton && subscription.status !== 'suspended' && (
            <Link
              href="/admin/subscription"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <TrendingUp className="h-4 w-4" />
              Upgrade
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// Usage bar component
function UsageBar({ 
  icon, 
  label, 
  current, 
  limit, 
  color 
}: { 
  icon: React.ReactNode;
  label: string;
  current: number;
  limit: number;
  color: 'blue' | 'green' | 'purple';
}) {
  const percentage = Math.min((current / limit) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  const colorClasses = {
    blue: isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-blue-500',
    green: isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-green-500',
    purple: isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-purple-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <div className="flex items-center gap-1.5 text-gray-600">
          {icon}
          <span>{label}</span>
        </div>
        <span className={`font-medium ${isAtLimit ? 'text-red-600' : 'text-gray-900'}`}>
          {current.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Subscription Alert Banner - for showing urgent subscription alerts
export function SubscriptionAlertBanner() {
  const { subscription, loading } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (loading || dismissed || !subscription) return null;

  const config = statusConfig[subscription.status];
  if (!config?.urgent) return null;

  return (
    <div className={`${config.bgColor} border-b-2 ${config.borderColor}`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-full ${config.textOnBg}`}>
              {config.icon}
            </div>
            <div>
              <span className={`font-bold ${config.textOnBg}`}>
                {subscription.status === 'past_due' && 'Payment Required: '}
                {subscription.status === 'suspended' && 'Account Suspended: '}
                {subscription.status === 'cancelled' && 'Subscription Cancelled: '}
                {subscription.status === 'expired' && 'Subscription Expired: '}
              </span>
              <span className={`${config.color}`}>
                {subscription.status === 'past_due' && 'Your subscription payment is overdue.'}
                {subscription.status === 'suspended' && 'Please pay to restore access.'}
                {subscription.status === 'cancelled' && 'Reactivate to continue using SmartDuka.'}
                {subscription.status === 'expired' && 'Renew your subscription to continue.'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/subscription"
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                subscription.status === 'past_due' 
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {subscription.status === 'past_due' ? 'Pay Now' : 'Manage'}
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mini subscription badge for sidebar/header
export function SubscriptionBadge({ className = '' }: { className?: string }) {
  const { subscription, loading } = useSubscription();

  if (loading || !subscription) return null;

  const config = statusConfig[subscription.status] || statusConfig.active;

  return (
    <Link
      href="/admin/subscription"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors hover:opacity-80 ${config.bgColor} ${config.textOnBg} border ${config.borderColor} ${className}`}
    >
      <Crown className="h-3 w-3" />
      {subscription.planName}
      {subscription.status === 'trial' && (
        <span className="ml-1">({subscription.daysRemaining}d)</span>
      )}
    </Link>
  );
}
