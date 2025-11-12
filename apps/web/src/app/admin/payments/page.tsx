'use client';

import { PaymentManagement } from '@/components/payment-management';
import { AuthGuard } from '@/components/auth-guard';
import { ToastContainer } from '@/components/toast-container';
import { useToast } from '@/lib/use-toast';

export default function PaymentsPage() {
  const { toasts, dismiss } = useToast();

  return (
    <AuthGuard requiredRole="admin">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="container py-6">
        <PaymentManagement />
      </div>
    </AuthGuard>
  );
}
