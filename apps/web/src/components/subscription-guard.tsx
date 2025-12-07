'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/use-subscription';
import { Loader2, AlertTriangle, Crown, Lock } from 'lucide-react';
import Link from 'next/link';

interface SubscriptionGuardProps {
  children: ReactNode;
  /**
   * Minimum plan required to access this feature
   * Plans in order: starter < basic < silver < gold
   */
  requiredPlan?: 'starter' | 'basic' | 'silver' | 'gold';
  /**
   * Resource type to check limits for
   */
  checkLimit?: 'shops' | 'employees' | 'products';
  /**
   * If true, shows a blocked message instead of redirecting
   */
  showBlockedMessage?: boolean;
  /**
   * Custom message to show when blocked
   */
  blockedMessage?: string;
  /**
   * If true, allows access even if subscription is expired/suspended (for viewing data)
   */
  allowReadOnly?: boolean;
}

const planOrder = ['starter', 'basic', 'silver', 'gold'];

/**
 * SubscriptionGuard Component
 * 
 * Protects routes/features based on subscription status and plan limits.
 * Use this to:
 * - Require a minimum plan for premium features
 * - Check resource limits before allowing actions
 * - Block access for suspended/expired subscriptions
 */
export function SubscriptionGuard({
  children,
  requiredPlan,
  checkLimit,
  showBlockedMessage = false,
  blockedMessage,
  allowReadOnly = false,
}: SubscriptionGuardProps) {
  const router = useRouter();
  const { subscription, loading, error } = useSubscription();

  // Check if current plan meets minimum requirement
  const meetsMinimumPlan = () => {
    if (!requiredPlan || !subscription) return true;
    const currentPlanIndex = planOrder.indexOf(subscription.planCode);
    const requiredPlanIndex = planOrder.indexOf(requiredPlan);
    return currentPlanIndex >= requiredPlanIndex;
  };

  // Check if subscription is active
  const isSubscriptionActive = () => {
    if (!subscription) return false;
    return ['trial', 'active'].includes(subscription.status);
  };

  // Check resource limits
  const isWithinLimits = () => {
    if (!checkLimit || !subscription) return true;
    const usage = subscription.usage[checkLimit];
    return usage.current < usage.limit;
  };

  useEffect(() => {
    if (loading) return;

    // No subscription - redirect to plan selection
    if (!subscription && !showBlockedMessage) {
      router.push('/select-plan');
      return;
    }

    // Subscription not active and not allowing read-only
    if (subscription && !isSubscriptionActive() && !allowReadOnly && !showBlockedMessage) {
      router.push('/admin/subscription');
      return;
    }
  }, [loading, subscription, router, showBlockedMessage, allowReadOnly]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // No subscription
  if (!subscription) {
    if (showBlockedMessage) {
      return (
        <SubscriptionBlockedMessage
          icon={<Crown className="h-12 w-12 text-amber-500" />}
          title="Subscription Required"
          message={blockedMessage || "You need an active subscription to access this feature."}
          actionLabel="Choose a Plan"
          actionHref="/select-plan"
        />
      );
    }
    return null; // Will redirect
  }

  // Subscription not active
  if (!isSubscriptionActive() && !allowReadOnly) {
    if (showBlockedMessage) {
      return (
        <SubscriptionBlockedMessage
          icon={<AlertTriangle className="h-12 w-12 text-yellow-500" />}
          title="Subscription Inactive"
          message={
            subscription.status === 'past_due'
              ? "Your subscription payment is overdue. Please pay to continue using this feature."
              : subscription.status === 'suspended'
              ? "Your subscription has been suspended. Please contact support."
              : "Your subscription has expired. Please renew to continue."
          }
          actionLabel="Manage Subscription"
          actionHref="/admin/subscription"
        />
      );
    }
    return null; // Will redirect
  }

  // Plan doesn't meet minimum requirement
  if (!meetsMinimumPlan()) {
    return (
      <SubscriptionBlockedMessage
        icon={<Lock className="h-12 w-12 text-gray-400" />}
        title="Upgrade Required"
        message={blockedMessage || `This feature requires the ${requiredPlan?.charAt(0).toUpperCase()}${requiredPlan?.slice(1)} plan or higher.`}
        actionLabel="Upgrade Plan"
        actionHref="/admin/subscription"
        currentPlan={subscription.planName}
        requiredPlan={requiredPlan}
      />
    );
  }

  // Resource limit reached
  if (!isWithinLimits()) {
    const usage = subscription.usage[checkLimit!];
    return (
      <SubscriptionBlockedMessage
        icon={<AlertTriangle className="h-12 w-12 text-orange-500" />}
        title="Limit Reached"
        message={`You've reached your ${checkLimit} limit (${usage.current}/${usage.limit}). Upgrade your plan to add more.`}
        actionLabel="Upgrade Plan"
        actionHref="/admin/subscription"
        currentPlan={subscription.planName}
      />
    );
  }

  return <>{children}</>;
}

// Blocked message component
function SubscriptionBlockedMessage({
  icon,
  title,
  message,
  actionLabel,
  actionHref,
  currentPlan,
  requiredPlan,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  actionLabel: string;
  actionHref: string;
  currentPlan?: string;
  requiredPlan?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
      <div className="mb-4">{icon}</div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600 max-w-md mb-6">{message}</p>
      
      {currentPlan && (
        <p className="text-sm text-gray-500 mb-4">
          Current plan: <span className="font-medium">{currentPlan}</span>
          {requiredPlan && (
            <> • Required: <span className="font-medium">{requiredPlan.charAt(0).toUpperCase()}{requiredPlan.slice(1)}</span></>
          )}
        </p>
      )}
      
      <Link
        href={actionHref}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

/**
 * Hook to check subscription limits before performing actions
 */
export function useSubscriptionLimitCheck() {
  const { subscription } = useSubscription();

  const canAdd = (resource: 'shops' | 'employees' | 'products'): boolean => {
    if (!subscription) return false;
    const usage = subscription.usage[resource];
    return usage.current < usage.limit;
  };

  const getUsage = (resource: 'shops' | 'employees' | 'products') => {
    if (!subscription) return { current: 0, limit: 0, remaining: 0 };
    const usage = subscription.usage[resource];
    return {
      current: usage.current,
      limit: usage.limit,
      remaining: usage.limit - usage.current,
    };
  };

  const isFeatureAvailable = (requiredPlan: 'starter' | 'basic' | 'silver' | 'gold'): boolean => {
    if (!subscription) return false;
    const currentPlanIndex = planOrder.indexOf(subscription.planCode);
    const requiredPlanIndex = planOrder.indexOf(requiredPlan);
    return currentPlanIndex >= requiredPlanIndex;
  };

  return {
    canAdd,
    getUsage,
    isFeatureAvailable,
    subscription,
  };
}
