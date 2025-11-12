'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/use-toast';
import { ToastContainer } from '@/components/toast-container';
import { AuthGuard } from '@/components/auth-guard';
import { CashierStatusBadge } from '@/components/cashier-status-badge';
import { ArrowLeft, DollarSign, ShoppingCart, TrendingUp, Clock } from 'lucide-react';

interface Transaction {
  _id: string;
  action: string;
  details: {
    amount?: number;
    items?: number;
    paymentMethod?: string;
  };
  timestamp: string;
}

interface CashierDetail {
  name: string;
  email: string;
  status: 'active' | 'disabled';
  createdAt: string;
  todaySales: number;
  transactionCount: number;
  averageTransaction: number;
  recentTransactions: Transaction[];
  onlineStatus: 'online' | 'idle' | 'offline';
  lastActivity: string;
}

function CashierDetailContent() {
  const router = useRouter();
  const params = useParams();
  const cashierId = params.id as string;
  const { token, shop } = useAuth();
  const { toasts, toast, dismiss } = useToast();

  const [cashier, setCashier] = useState<CashierDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCashierDetail();
  }, [token, cashierId]);

  const loadCashierDetail = async () => {
    if (!token || !cashierId) return;

    try {
      setLoading(true);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const headers = { Authorization: `Bearer ${token}` };

      // Get transactions
      const transRes = await fetch(`${base}/activity/cashier/${cashierId}/transactions?limit=50`, {
        headers,
      });

      if (!transRes.ok) throw new Error('Failed to load cashier details');

      const transactions = await transRes.json();

      // Calculate stats
      let totalSales = 0;
      transactions.forEach((t: Transaction) => {
        if (t.details?.amount) totalSales += t.details.amount;
      });

      const lastActivity = transactions.length > 0 ? transactions[0].timestamp : new Date().toISOString();
      const now = new Date();
      const lastActivityDate = new Date(lastActivity);
      const diffMinutes = Math.floor((now.getTime() - lastActivityDate.getTime()) / 60000);

      let onlineStatus: 'online' | 'idle' | 'offline' = 'offline';
      if (diffMinutes < 5) onlineStatus = 'online';
      else if (diffMinutes < 15) onlineStatus = 'idle';

      setCashier({
        name: 'Cashier', // Will be updated from API
        email: 'cashier@shop.com', // Will be updated from API
        status: 'active',
        createdAt: new Date().toISOString(),
        todaySales: totalSales,
        transactionCount: transactions.length,
        averageTransaction: transactions.length > 0 ? totalSales / transactions.length : 0,
        recentTransactions: transactions,
        onlineStatus,
        lastActivity,
      });
    } catch (err: any) {
      toast({ type: 'error', title: 'Load failed', message: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <main className="bg-background py-6 min-h-screen">
        <div className="container">
          <div className="text-center py-12 text-muted-foreground">Loading cashier details...</div>
        </div>
      </main>
    );
  }

  if (!cashier) {
    return (
      <main className="bg-background py-6 min-h-screen">
        <div className="container">
          <div className="text-center py-12 text-muted-foreground">Cashier not found</div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background py-6 min-h-screen">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="container">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{cashier.name}</h1>
              <p className="text-muted-foreground">{cashier.email}</p>
            </div>
            <CashierStatusBadge
              status={cashier.onlineStatus}
              lastActivity={new Date(cashier.lastActivity)}
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Total Sales Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(cashier.todaySales)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {cashier.transactionCount} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-blue-600" />
                Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cashier.transactionCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                sales completed today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                Average Sale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(cashier.averageTransaction)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                per transaction
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>Last 50 transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {cashier.recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions yet
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {cashier.recentTransactions.map((transaction) => (
                  <div
                    key={transaction._id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {transaction.details?.items || 0} items
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {transaction.details?.paymentMethod || 'Unknown'} • {formatTime(transaction.timestamp)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {formatCurrency(transaction.details?.amount || 0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function CashierDetailPage() {
  return (
    <AuthGuard requiredRole="admin">
      <CashierDetailContent />
    </AuthGuard>
  );
}
