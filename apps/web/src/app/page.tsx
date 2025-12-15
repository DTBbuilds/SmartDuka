'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LoadingScreen } from '@/components/loading-screen';

export default function Home() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    // Don't redirect if already redirected
    if (redirected) return;

    // Wait for auth to load
    if (loading) return;

    // Mark as redirected to prevent multiple redirects
    setRedirected(true);

    // Redirect immediately based on auth state
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Redirect based on role
    if (user?.role === 'admin') {
      router.push('/admin');
    } else if (user?.role === 'cashier') {
      router.push('/cashier/dashboard');
    } else if (user?.role === 'super_admin') {
      router.push('/super-admin');
    } else {
      // Fallback to login if role is unknown
      router.push('/login');
    }
  }, [user, loading, isAuthenticated, router, redirected]);

  // Show simple loading screen during redirect
  return <LoadingScreen title="SmartDuka" description="Redirecting..." />;
}
