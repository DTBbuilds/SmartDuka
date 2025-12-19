'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/use-toast';
import { ToastContainer } from '@/components/toast-container';
import { AuthGuard } from '@/components/auth-guard';
import { DollarSign, ShoppingCart, TrendingUp, Clock, LogOut, Play, Square } from 'lucide-react';

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

interface Shift {
  _id: string;
  startTime: string;
  endTime?: string;
  openingBalance: number;
  status: 'open' | 'closed' | 'reconciled';
  totalSales?: number;
  transactionCount?: number;
  expectedCash?: number;
}

interface CashierStats {
  totalSales: number;
  transactionCount: number;
  averageTransaction: number;
  recentTransactions: Transaction[];
}

function CashierDashboardContent() {
  const router = useRouter();
  const { user, shop, token, logout } = useAuth();
  const { toasts, toast, dismiss } = useToast();

  const [stats, setStats] = useState<CashierStats>({
    totalSales: 0,
    transactionCount: 0,
    averageTransaction: 0,
    recentTransactions: [],
  });
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [shiftDuration, setShiftDuration] = useState('0m');

  useEffect(() => {
    loadCashierStats();
    loadCurrentShift();
    
    // Update shift duration and sales every minute
    const interval = setInterval(() => {
      updateShiftDuration();
      if (shift && shift.status === 'open') {
        loadCurrentShift(); // Refresh sales data
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [token, shift?.status]);

  const updateShiftDuration = () => {
    const shiftData = localStorage.getItem('smartduka:shift');
    if (shiftData) {
      const s = JSON.parse(shiftData);
      const start = new Date(s.startTime).getTime();
      const now = Date.now();
      const diff = now - start;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setShiftDuration(hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`);
    }
  };

  const loadCurrentShift = async () => {
    if (!token || !user) return;

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/shifts/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        // Safely parse JSON in case of empty body/204
        let data: any = null;
        try {
          const text = await res.text();
          data = text ? JSON.parse(text) : null;
        } catch (_) {
          data = null;
        }
        setShift(data);
        if (data) {
          localStorage.setItem('smartduka:shift', JSON.stringify(data));
          updateShiftDuration();
          
          // Load sales data for this shift
          try {
            const salesRes = await fetch(`${base}/shifts/${data._id}/sales`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            
            const salesText = await salesRes.text();
            const salesData = salesText ? JSON.parse(salesText) : {};
            
            if (salesRes.ok) {
              setShift(prev => prev ? {
                ...prev,
                totalSales: salesData.totalSales,
                transactionCount: salesData.transactionCount,
                expectedCash: salesData.expectedCash,
              } : null);
            }
          } catch (salesError) {
            console.error('Failed to load sales data:', salesError);
          }
        }
      } else if (res.status === 404) {
        // No active shift - this is normal
        setShift(null);
      }
    } catch (err: any) {
      console.error('Failed to load shift:', err);
      setShift(null);
    }
  };

  const loadCashierStats = async () => {
    if (!token || !user) return;

    try {
      setLoading(true);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      // Use the dedicated cashier stats endpoint
      const res = await fetch(`${base}/sales/cashier-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          toast({ type: 'error', title: 'Session expired', message: 'Please login again' });
          return;
        }
        // Set empty stats on error
        setStats({
          totalSales: 0,
          transactionCount: 0,
          averageTransaction: 0,
          recentTransactions: [],
        });
        return;
      }

      const statsText = await res.text();
      const data = statsText ? JSON.parse(statsText) : {};

      // Format recent orders for display
      const formattedTransactions: Transaction[] = (data.recentOrders || []).map((order: any) => ({
        _id: order.id,
        action: 'sale',
        details: {
          amount: order.total,
          items: order.items || 0,
          paymentMethod: order.paymentStatus || 'paid',
        },
        timestamp: order.createdAt,
      }));

      setStats({
        totalSales: data.todaySales || 0,
        transactionCount: data.todayTransactions || 0,
        averageTransaction: data.averageTransaction || 0,
        recentTransactions: formattedTransactions,
      });
    } catch (err: any) {
      console.error('Error loading stats:', err);
      toast({ type: 'error', title: 'Load failed', message: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const formatCurrency = (value: number) =>
    `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <main className="bg-background py-6 min-h-screen">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="container">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            {shop && (
              <p className="text-xs font-medium text-primary mb-2">
                {shop.name} • Cashier View
              </p>
            )}
            <h1 className="text-3xl font-bold">Welcome, {user?.name || 'Cashier'}</h1>
            <p className="text-muted-foreground">Your sales dashboard for today</p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Shift Status Card */}
        {shift ? (
          <Card className="mb-8 border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Active Shift
                </CardTitle>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  {shift.status === 'open' ? 'Running' : 'Closed'}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Start Time</p>
                  <p className="font-semibold">{formatTime(shift.startTime)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-semibold">{shiftDuration}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Opening Balance</p>
                  <p className="font-semibold">{formatCurrency(shift.openingBalance)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Sales</p>
                  <p className="font-semibold text-green-600">{formatCurrency(shift.totalSales || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Transactions</p>
                  <p className="font-semibold">{shift.transactionCount || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expected Cash</p>
                  <p className="font-semibold">{formatCurrency(shift.expectedCash || shift.openingBalance)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push('/pos')}
                  className="flex-1"
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  POS
                </Button>
                <Button
                  size="sm"
                  onClick={() => router.push('/cashier/shift-end')}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  <Square className="h-4 w-4 mr-1" />
                  End Shift
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8 border-l-4 border-l-yellow-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                No Active Shift
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Start a shift to begin tracking your sales.
              </p>
              <Button
                onClick={() => router.push('/cashier/shift-start')}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Shift
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Total Sales */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Total Sales Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalSales)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.transactionCount} transactions
              </p>
            </CardContent>
          </Card>

          {/* Transaction Count */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-blue-600" />
                Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.transactionCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                sales completed today
              </p>
            </CardContent>
          </Card>

          {/* Average Transaction */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                Average Sale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.averageTransaction)}</div>
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
            <CardDescription>Your last 10 sales today</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
            ) : stats.recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions yet. Start selling!
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentTransactions.map((transaction) => (
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

        {/* Action Buttons */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            size="lg"
            onClick={() => router.push('/pos')}
            className="gap-2"
          >
            <ShoppingCart className="h-5 w-5" />
            Go to POS
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={loadCashierStats}
            className="gap-2"
          >
            <Clock className="h-5 w-5" />
            Refresh Stats
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function CashierDashboardPage() {
  return (
    <AuthGuard>
      <CashierDashboardContent />
    </AuthGuard>
  );
}
