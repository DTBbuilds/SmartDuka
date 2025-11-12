'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LoadingScreen } from './loading-screen';

interface SuperAdminGuardProps {
  children: React.ReactNode;
}

export function SuperAdminGuard({ children }: SuperAdminGuardProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    setIsChecking(false);

    if (!user) {
      router.push('/login');
      return;
    }

    // Check if user is super admin
    if (user.role !== 'super_admin') {
      // Redirect based on role
      const redirectPath = user.role === 'admin' ? '/admin' : '/pos';
      router.push(redirectPath);
      return;
    }
  }, [user, loading, router]);

  if (loading || isChecking) {
    return <LoadingScreen />;
  }

  if (!user || user.role !== 'super_admin') {
    return null;
  }

  return <>{children}</>;
}
