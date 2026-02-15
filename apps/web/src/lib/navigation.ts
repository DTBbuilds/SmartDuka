'use client';

/**
 * Smart Navigation Utility
 * 
 * Provides intelligent back navigation that:
 * 1. Uses browser history when available and appropriate
 * 2. Falls back to a sensible parent route when history is unavailable
 * 3. Tracks navigation history for better UX
 */

// Navigation history stack (in-memory for current session)
let navigationHistory: string[] = [];
const MAX_HISTORY_LENGTH = 50;

/**
 * Get the parent route for a given path
 * Maps child routes to their logical parent
 */
export function getParentRoute(currentPath: string): string {
  // Remove trailing slash
  const path = currentPath.replace(/\/$/, '');
  
  // Specific route mappings (child -> parent)
  const routeMappings: Record<string, string> = {
    // Inventory routes
    '/inventory/new': '/admin/products',
    
    // Purchase routes
    '/purchases/new': '/purchases',
    
    // Analytics sub-pages -> Analytics main
    '/admin/analytics/sales': '/admin/analytics',
    '/admin/analytics/orders': '/admin/analytics',
    '/admin/analytics/payments': '/admin/analytics',
    '/admin/analytics/inventory': '/admin/analytics',
    '/admin/analytics/profit': '/admin/analytics',
    '/admin/analytics/all-time': '/admin/analytics/sales',
    
    // Settings sub-pages
    '/settings/profile': '/settings',
    '/settings/shop': '/settings',
    '/settings/payments': '/settings',
    '/settings/notifications': '/settings',
    
    // Cashier routes
    '/cashier/shift-start': '/cashier/dashboard',
    '/cashier/shift-end': '/cashier/dashboard',
    
    // Super admin routes
    '/super-admin/shops': '/super-admin',
    '/super-admin/support': '/super-admin',
    '/super-admin/emails': '/super-admin',
    '/super-admin/communications': '/super-admin',
    '/super-admin/subscriptions': '/super-admin',
    '/super-admin/payments': '/super-admin',
    '/super-admin/settings': '/super-admin',
  };
  
  // Check for exact match first
  if (routeMappings[path]) {
    return routeMappings[path];
  }
  
  // Dynamic route patterns
  const dynamicPatterns: Array<{ pattern: RegExp; parent: string | ((match: RegExpMatchArray) => string) }> = [
    // /inventory/[id] -> /admin/products
    { pattern: /^\/inventory\/[^/]+$/, parent: '/admin/products' },
    // /inventory/[id]/edit -> /inventory/[id]
    { pattern: /^\/inventory\/([^/]+)\/edit$/, parent: (m) => `/inventory/${m[1]}` },
    // /purchases/[id] -> /purchases
    { pattern: /^\/purchases\/[^/]+$/, parent: '/purchases' },
    // /purchases/[id]/receive -> /purchases/[id]
    { pattern: /^\/purchases\/([^/]+)\/receive$/, parent: (m) => `/purchases/${m[1]}` },
    // /customers/[id] -> /admin (or customers list if exists)
    { pattern: /^\/customers\/[^/]+$/, parent: '/admin' },
    // /admin/cashiers/[id] -> /admin/cashiers
    { pattern: /^\/admin\/cashiers\/[^/]+$/, parent: '/admin/cashiers' },
    // /admin/branches/[id] -> /admin/branches
    { pattern: /^\/admin\/branches\/[^/]+$/, parent: '/admin/branches' },
    // /admin/branches/[id]/settings -> /admin/branches/[id]
    { pattern: /^\/admin\/branches\/([^/]+)\/settings$/, parent: (m) => `/admin/branches/${m[1]}` },
    // /super-admin/shops/[id] -> /super-admin/shops
    { pattern: /^\/super-admin\/shops\/[^/]+$/, parent: '/super-admin/shops' },
  ];
  
  for (const { pattern, parent } of dynamicPatterns) {
    const match = path.match(pattern);
    if (match) {
      return typeof parent === 'function' ? parent(match) : parent;
    }
  }
  
  // Default: go up one level in the path hierarchy
  const segments = path.split('/').filter(Boolean);
  if (segments.length > 1) {
    segments.pop();
    return '/' + segments.join('/');
  }
  
  // Ultimate fallback based on path prefix
  if (path.startsWith('/admin')) return '/admin';
  if (path.startsWith('/super-admin')) return '/super-admin';
  if (path.startsWith('/cashier')) return '/cashier/dashboard';
  if (path.startsWith('/pos')) return '/pos';
  
  return '/';
}

/**
 * Track a navigation event
 */
export function trackNavigation(path: string): void {
  // Don't track duplicate consecutive navigations
  if (navigationHistory[navigationHistory.length - 1] === path) {
    return;
  }
  
  navigationHistory.push(path);
  
  // Trim history if too long
  if (navigationHistory.length > MAX_HISTORY_LENGTH) {
    navigationHistory = navigationHistory.slice(-MAX_HISTORY_LENGTH);
  }
}

/**
 * Get the previous page from our tracked history
 */
export function getPreviousPage(): string | null {
  if (navigationHistory.length < 2) {
    return null;
  }
  // Return the second-to-last item (last is current page)
  return navigationHistory[navigationHistory.length - 2];
}

/**
 * Check if we have meaningful navigation history
 */
export function hasNavigationHistory(): boolean {
  return navigationHistory.length >= 2;
}

/**
 * Clear navigation history (e.g., on logout)
 */
export function clearNavigationHistory(): void {
  navigationHistory = [];
}

/**
 * Get the current navigation history (for debugging)
 */
export function getNavigationHistory(): string[] {
  return [...navigationHistory];
}

/**
 * Smart back navigation
 * Returns the best route to navigate back to
 */
export function getSmartBackRoute(currentPath: string): string {
  // First, try to use our tracked history
  const previousPage = getPreviousPage();
  if (previousPage && previousPage !== currentPath) {
    return previousPage;
  }
  
  // Fall back to parent route
  return getParentRoute(currentPath);
}

/**
 * Check if browser history is available and meaningful
 * Note: This is a heuristic - we can't directly access browser history
 */
export function canUseRouterBack(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check if we have history entries
  // Note: history.length includes the current page
  return window.history.length > 1 && hasNavigationHistory();
}
