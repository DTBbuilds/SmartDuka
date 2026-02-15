'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { 
  trackNavigation, 
  getSmartBackRoute, 
  canUseRouterBack,
  getParentRoute,
  clearNavigationHistory 
} from '@/lib/navigation';

/**
 * Smart Navigation Hook
 * 
 * Provides intelligent navigation with proper back button behavior
 * that returns users to their previous activity instead of unexpected pages.
 */
export function useSmartNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  // Track navigation on path changes
  useEffect(() => {
    if (pathname) {
      trackNavigation(pathname);
    }
  }, [pathname]);

  /**
   * Navigate back intelligently
   * Uses browser history when appropriate, falls back to parent route
   */
  const goBack = useCallback((fallbackRoute?: string) => {
    if (canUseRouterBack()) {
      // Use browser back if we have meaningful history
      router.back();
    } else {
      // Use smart fallback
      const targetRoute = fallbackRoute || getSmartBackRoute(pathname || '/');
      router.push(targetRoute);
    }
  }, [router, pathname]);

  /**
   * Navigate back with explicit fallback
   * Always uses the fallback if browser history seems unreliable
   */
  const goBackOrFallback = useCallback((fallbackRoute: string) => {
    if (canUseRouterBack()) {
      router.back();
    } else {
      router.push(fallbackRoute);
    }
  }, [router]);

  /**
   * Navigate to parent route (ignores history)
   */
  const goToParent = useCallback(() => {
    const parentRoute = getParentRoute(pathname || '/');
    router.push(parentRoute);
  }, [router, pathname]);

  /**
   * Navigate and replace current history entry
   * Useful when you don't want the current page in back history
   */
  const navigateReplace = useCallback((path: string) => {
    router.replace(path);
  }, [router]);

  /**
   * Navigate with standard push
   */
  const navigate = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  /**
   * Clear navigation history (e.g., on logout)
   */
  const resetHistory = useCallback(() => {
    clearNavigationHistory();
  }, []);

  return {
    goBack,
    goBackOrFallback,
    goToParent,
    navigate,
    navigateReplace,
    resetHistory,
    currentPath: pathname,
  };
}

export default useSmartNavigation;
