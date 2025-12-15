'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LoadingScreen } from './loading-screen';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'cashier' | 'super_admin';
  fallbackRoute?: string;
}

/**
 * AuthGuard Component
 * 
 * Protects routes by checking authentication and authorization
 * - Redirects unauthenticated users to /login
 * - Redirects unauthorized users to fallback route
 * - Shows loading screen during auth check
 */
export function AuthGuard({ 
  children, 
  requiredRole,
  fallbackRoute = '/login'
}: AuthGuardProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Wait for auth context to load
    if (loading) return;

    setIsChecking(false);

    // Check if user is authenticated
    if (!user) {
      router.push('/login');
      return;
    }

    // Check if user has required role
    if (requiredRole && user.role !== requiredRole) {
      // Redirect based on user role
      const redirectPath = user.role === 'admin' ? '/admin' : '/pos';
      router.push(redirectPath);
      return;
    }
  }, [user, loading, requiredRole, router]);

  // Show loading screen while checking auth
  if (loading || isChecking) {
    return <LoadingScreen />;
  }

  // Don't render if not authenticated or unauthorized
  if (!user) {
    return null;
  }

  if (requiredRole && user.role !== requiredRole) {
    return null;
  }

  // Render protected content
  return <>{children}</>;
}
