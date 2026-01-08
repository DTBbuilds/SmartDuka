'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useRefreshEvent } from '@/lib/refresh-events';

export type SubscriptionAccessLevel = 'full' | 'read_only' | 'blocked' | 'none';

export type SubscriptionWarningType = 'expiring_soon' | 'past_due' | 'suspended' | 'expired';
export type SubscriptionWarningSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface SubscriptionAccessResult {
  accessLevel: SubscriptionAccessLevel;
  status: string | null;
  message: string;
  daysRemaining: number;
  daysUntilSuspension?: number;
  gracePeriodEndDate?: string;
  canMakePayment: boolean;
  subscription?: {
    id: string;
    planCode: string;
    planName: string;
    currentPeriodEnd: string;
    currentPrice: number;
  };
}

export interface SubscriptionWarning {
  type: SubscriptionWarningType;
  severity: SubscriptionWarningSeverity;
  title: string;
  message: string;
  daysRemaining?: number;
  daysUntilSuspension?: number;
  actionRequired: boolean;
  actionLabel?: string;
  actionUrl?: string;
}

export interface OperationPermissions {
  canRead: boolean;
  canWrite: boolean;
  canUsePOS: boolean;
  canViewReports: boolean;
  message?: string;
}

/**
 * Check if user has a valid token
 */
function hasAuthToken(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(localStorage.getItem('smartduka:token') || sessionStorage.getItem('smartduka:token'));
}

/**
 * Hook to check subscription access level and enforce restrictions
 * This is the main hook for subscription enforcement on the frontend
 */
export function useSubscriptionEnforcement() {
  const [access, setAccess] = useState<SubscriptionAccessResult | null>(null);
  const [warnings, setWarnings] = useState<SubscriptionWarning[]>([]);
  const [permissions, setPermissions] = useState<OperationPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccess = useCallback(async () => {
    if (!hasAuthToken()) {
      setLoading(false);
      setAccess(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [accessResult, warningsResult, permissionsResult] = await Promise.all([
        api.get<SubscriptionAccessResult>('/subscriptions/enforcement/access'),
        api.get<{ warnings: SubscriptionWarning[] }>('/subscriptions/enforcement/warnings'),
        api.get<OperationPermissions>('/subscriptions/enforcement/can-operate'),
      ]);

      setAccess(accessResult);
      setWarnings(warningsResult.warnings || []);
      setPermissions(permissionsResult);
    } catch (err: any) {
      // 401 means not authenticated - don't show error
      if (err.statusCode === 401) {
        setAccess(null);
        setWarnings([]);
        setPermissions(null);
      } else {
        setError(err.message || 'Failed to check subscription status');
        // On error, assume full access to not block users due to system errors
        setAccess({
          accessLevel: 'full',
          status: null,
          message: 'Unable to verify subscription',
          daysRemaining: 0,
          canMakePayment: false,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  // Listen for subscription-related events
  useRefreshEvent(
    ['subscription:updated', 'subscription:created', 'subscription:reactivated', 'payment:completed'],
    () => {
      fetchAccess();
    },
    [fetchAccess]
  );

  // Computed properties
  const isBlocked = access?.accessLevel === 'blocked' || access?.accessLevel === 'none';
  const isReadOnly = access?.accessLevel === 'read_only';
  const hasFullAccess = access?.accessLevel === 'full';
  const requiresPayment = access?.canMakePayment && isBlocked;
  
  // Get the most critical warning
  const criticalWarning = warnings.find(w => w.severity === 'critical');
  const hasWarnings = warnings.length > 0;
  const hasActionRequired = warnings.some(w => w.actionRequired);

  return {
    // Access state
    access,
    warnings,
    permissions,
    loading,
    error,
    
    // Computed properties
    isBlocked,
    isReadOnly,
    hasFullAccess,
    requiresPayment,
    criticalWarning,
    hasWarnings,
    hasActionRequired,
    
    // Actions
    refetch: fetchAccess,
  };
}

/**
 * Hook to check if a specific operation is allowed
 * Use this before performing write operations
 */
export function useCanPerformOperation() {
  const { permissions, isBlocked, isReadOnly } = useSubscriptionEnforcement();

  const canPerform = useCallback((operation: 'read' | 'write' | 'pos' | 'reports'): boolean => {
    if (isBlocked) return false;
    
    if (!permissions) return true; // Assume allowed if not loaded yet
    
    switch (operation) {
      case 'read':
        return permissions.canRead;
      case 'write':
        return permissions.canWrite;
      case 'pos':
        return permissions.canUsePOS;
      case 'reports':
        return permissions.canViewReports;
      default:
        return false;
    }
  }, [permissions, isBlocked]);

  return { canPerform, isReadOnly, message: permissions?.message };
}
