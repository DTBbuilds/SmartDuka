'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from '@smartduka/ui';
import {
  CreditCard,
  ArrowLeft,
  Smartphone,
  Banknote,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Percent,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { useBranch } from '@/lib/branch-context';
import { config } from '@/lib/config';

type PaymentStats = {
  todayTotal: number;
  todayTransactions: number;
  weekTotal: number;
  weekTransactions: number;
  monthTotal: number;
  monthTransactions: number;
  successRate: number;
  averageTransactionValue: number;
  methodBreakdown: Array<{
    method: string;
    count: number;
    total: number;
    percentage: number;
    icon: string;
  }>;
  recentTransactions: Array<{
    id: string;
    amount: number;
    method: string;
    status: 'completed' | 'pending' | 'failed';
    reference: string;
    timestamp: string;
    orderNumber: string;
  }>;
  dailyTrend: Array<{ date: string; total: number; count: number }>;
  failedTransactions: Array<{
    id: string;
    amount: number;
    method: string;
    reason: string;
    timestamp: string;
  }>;
};

export default function PaymentsAnalyticsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { currentBranch } = useBranch();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PaymentStats | null>(null);

  useEffect(() => {
    if (token) {
      loadPaymentStats();
    }
  }, [token, currentBranch]);

  const loadPaymentStats = async () => {
    try {
      setLoading(true);
      const branchParam = currentBranch ? `?branchId=${currentBranch._id}` : '';
      const res = await fetch(`${config.apiUrl}/payments/analytics${branchParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        console.error('Failed to load payments analytics:', res.status);
        setStats(null);
      }
    } catch (err) {
      console.error('Failed to load payment stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'm-pesa': return <Smartphone className="h-5 w-5 text-green-600" />;
      case 'cash': return <Banknote className="h-5 w-5 text-blue-600" />;
      case 'card': return <CreditCard className="h-5 w-5 text-purple-600" />;
      default: return <DollarSign className="h-5 w-5" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Payments Analytics</h1>
            <p className="text-muted-foreground">Transaction tracking and payment insights</p>
          </div>
        </div>
        <Card className="p-12 text-center">
          <CreditCard className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No Payment Data</h2>
          <p className="text-muted-foreground mb-4">
            Process payments to see your analytics here.
          </p>
          <Button onClick={() => router.push('/pos')}>Go to POS</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Payments Analytics</h1>
            <p className="text-muted-foreground">Transaction tracking and payment insights</p>
          </div>
        </div>
        <Button onClick={() => router.push('/payments')}>
          View All Transactions
        </Button>
      </div>

      {stats && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Payments</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                      Ksh {stats.todayTotal.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{stats.todayTransactions} transactions</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-500/20">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold">
                      Ksh {(stats.monthTotal / 1000000).toFixed(2)}M
                    </p>
                    <p className="text-xs text-muted-foreground">{stats.monthTransactions} transactions</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <p className="text-2xl font-bold text-green-600">{stats.successRate}%</p>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-500/10">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Transaction</p>
                    <p className="text-2xl font-bold">
                      Ksh {stats.averageTransactionValue.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Per order</p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-500/10">
                    <Percent className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Payment Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Payment Trend (Last 14 Days)</CardTitle>
                <CardDescription>Daily transaction volume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-end gap-1">
                  {stats.dailyTrend.map((day, i) => {
                    const maxTotal = Math.max(...stats.dailyTrend.map(d => d.total));
                    const height = (day.total / maxTotal) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t cursor-pointer hover:from-green-400 transition-colors"
                          style={{ height: `${height}%`, minHeight: '10px' }}
                          title={`${day.date}: Ksh ${day.total.toLocaleString()} (${day.count} txns)`}
                        />
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(day.date).getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>This month's breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.methodBreakdown.map((method, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getMethodIcon(method.method)}
                          <span className="font-medium">{method.method}</span>
                        </div>
                        <span className="text-sm font-semibold">{method.percentage}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            method.method === 'M-Pesa' ? 'bg-green-500' :
                            method.method === 'Cash' ? 'bg-blue-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${method.percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{method.count} transactions</span>
                        <span>Ksh {method.total.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Transactions */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest payment activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.recentTransactions.map((txn) => (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                      onClick={() => router.push(`/orders?search=${txn.orderNumber}`)}
                    >
                      <div className="flex items-center gap-3">
                        {getMethodIcon(txn.method)}
                        <div>
                          <p className="font-medium">{txn.orderNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            Ref: {txn.reference}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold">Ksh {txn.amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(txn.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(txn.status)}
                          <Badge variant={
                            txn.status === 'completed' ? 'default' :
                            txn.status === 'pending' ? 'secondary' : 'destructive'
                          }>
                            {txn.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Failed Transactions */}
            <Card className={stats.failedTransactions.length > 0 ? 'border-red-500/40' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Failed Transactions
                </CardTitle>
                <CardDescription>Requires attention</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.failedTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>No failed transactions!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.failedTransactions.map((txn) => (
                      <div key={txn.id} className="p-3 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getMethodIcon(txn.method)}
                            <span className="font-medium">Ksh {txn.amount.toLocaleString()}</span>
                          </div>
                          <Badge variant="destructive">Failed</Badge>
                        </div>
                        <p className="text-sm text-red-600 dark:text-red-400">{txn.reason}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(txn.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
