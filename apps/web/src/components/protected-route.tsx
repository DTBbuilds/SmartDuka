"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LoadingScreen } from "./loading-screen";
import { SubscriptionBlockedOverlay, SubscriptionReadOnlyBanner } from "./subscription-blocked-overlay";
import { SubscriptionWarningBanner } from "./subscription-warning-banner";
import { useSubscriptionEnforcement } from "@/hooks/use-subscription-enforcement";

// Routes that should bypass subscription checks
const SUBSCRIPTION_EXEMPT_ROUTES = [
  '/admin/subscription',
  '/select-plan',
  '/pricing',
  '/login',
  '/register',
  '/onboarding',
  '/auth',
];

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [loadingMessage, setLoadingMessage] = useState("Checking authentication...");
  
  // Subscription enforcement
  const { 
    isBlocked, 
    isReadOnly, 
    loading: subscriptionLoading,
    refetch: refetchSubscription,
  } = useSubscriptionEnforcement();
  
  // Check if current route is exempt from subscription checks
  const isExemptRoute = SUBSCRIPTION_EXEMPT_ROUTES.some(route => 
    pathname?.startsWith(route)
  );

  useEffect(() => {
    if (!loading && !user && pathname !== "/login" && pathname !== "/onboarding") {
      router.push("/login");
    }
  }, [user, loading, router, pathname]);

  // Update loading message based on time
  useEffect(() => {
    if (!loading) return;

    const messages = [
      { delay: 0, message: "Checking authentication..." },
      { delay: 3000, message: "Verifying your session..." },
      { delay: 6000, message: "Loading your workspace..." },
      { delay: 10000, message: "This is taking longer than usual..." },
      { delay: 15000, message: "Still working on it, please wait..." },
    ];

    const timeouts = messages.map(({ delay, message }) =>
      setTimeout(() => setLoadingMessage(message), delay)
    );

    return () => timeouts.forEach(clearTimeout);
  }, [loading]);

  if (loading || subscriptionLoading) {
    return (
      <LoadingScreen 
        title="SmartDuka" 
        description={loadingMessage}
      />
    );
  }

  if (!user && pathname !== "/login" && pathname !== "/onboarding") {
    return null;
  }

  // Show subscription blocked overlay if blocked and not on exempt route
  if (isBlocked && !isExemptRoute && user) {
    return (
      <SubscriptionBlockedOverlay 
        onPaymentSuccess={() => {
          refetchSubscription();
          router.refresh();
        }}
      />
    );
  }

  return (
    <>
      {/* Show warning banner for expiring subscriptions */}
      {!isExemptRoute && user && <SubscriptionWarningBanner />}
      
      {/* Show read-only banner during grace period */}
      {isReadOnly && !isExemptRoute && user && <SubscriptionReadOnlyBanner />}
      
      {children}
    </>
  );
}
