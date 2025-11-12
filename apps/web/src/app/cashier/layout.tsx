'use client';

import { ReactNode } from 'react';
import { AuthGuard } from '@/components/auth-guard';

export default function CashierLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requiredRole="cashier" fallbackRoute="/login">
      {children}
    </AuthGuard>
  );
}
