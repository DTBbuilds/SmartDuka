'use client';

import { ReactNode } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { SubscriptionBlocker } from '@/components/subscription-blocker';

export default function CashierLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requiredRole="cashier" fallbackRoute="/login">
      <SubscriptionBlocker>
        {children}
      </SubscriptionBlocker>
    </AuthGuard>
  );
}
