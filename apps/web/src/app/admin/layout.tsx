'use client';

import { ReactNode } from 'react';
import { AuthGuard } from '@/components/auth-guard';

// Note: Sidebar and demo mode banners are handled by the global AdminLayout in providers.tsx
// This layout only handles auth guard for admin routes
// FREE_MODE: SubscriptionBlocker and SubscriptionAlertBanner removed — SmartDuka is free for all users

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requiredRole="admin" fallbackRoute="/login">
      {children}
    </AuthGuard>
  );
}
