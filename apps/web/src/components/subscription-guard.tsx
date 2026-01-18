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

  // Check if subscription is active (also checks if period has expired)
  const isSubscriptionActive = () => {
    if (!subscription) return false;
    
    // Check if status is active or trial
    const statusActive = ['trial', 'active'].includes(subscription.status);
    if (!statusActive) return false;
    
    // CRITICAL: Also check if the period has actually expired
    // The backend scheduled job might not have run yet to update the status
    if (subscription.currentPeriodEnd) {
      const periodEnd = new Date(subscription.currentPeriodEnd);
      const now = new Date();
      if (now > periodEnd) {
        return false; // Period has expired even if status says active
      }
    }
    
    return true;
  };

  // Check if subscription period has expired (even if status hasn't updated)
  const isSubscriptionExpiredByDate = () => {
    if (!subscription || !subscription.currentPeriodEnd) return false;
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const now = new Date();
    return now > periodEnd;
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
      // Redirect to payments tab in settings for subscription payment
      // This provides a direct path to renew/pay for the subscription
      router.push('/settings?tab=payments');
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

  // Subscription not active (either by status or by expired period)
  if (!isSubscriptionActive() && !allowReadOnly) {
    if (showBlockedMessage) {
      // Determine the right message based on why subscription is inactive
      let title = "Subscription Inactive";
      let message = "Your subscription has expired. Please renew to continue.";
      
      if (isSubscriptionExpiredByDate() && ['trial', 'active'].includes(subscription.status)) {
        // Period expired but status not updated yet
        title = "Subscription Expired";
        message = "Your subscription period has ended. Please make a payment to continue using SmartDuka.";
      } else if (subscription.status === 'past_due') {
        title = "Payment Overdue";
        message = "Your subscription payment is overdue. Please pay to continue using this feature.";
      } else if (subscription.status === 'suspended') {
        title = "Subscription Suspended";
        message = "Your subscription has been suspended due to non-payment. Please pay your outstanding balance.";
      } else if (subscription.status === 'pending_payment') {
        title = "Payment Required";
        message = "Your subscription is pending payment. Please complete payment to activate your account.";
      }

      return (
        <SubscriptionBlockedMessage
          icon={<AlertTriangle className="h-12 w-12 text-yellow-500" />}
          title={title}
          message={message}
          actionLabel="Make Payment"
          actionHref="/settings?tab=payments"
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
