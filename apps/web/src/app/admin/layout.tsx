'use client';

import { ReactNode } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { SubscriptionAlertBanner } from '@/components/subscription-status-card';

// Note: Sidebar and demo mode banners are handled by the global AdminLayout in providers.tsx
// This layout only handles auth guard for admin routes

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requiredRole="admin" fallbackRoute="/login">
      <SubscriptionAlertBanner />
      {children}
    </AuthGuard>
  );
}
