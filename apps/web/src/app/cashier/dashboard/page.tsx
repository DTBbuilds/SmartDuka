'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { config } from '@/lib/config';
import { useToast } from '@/lib/use-toast';
import { ToastContainer } from '@/components/toast-container';
import { AuthGuard } from '@/components/auth-guard';
import { shiftActivityTracker, type ShiftActivityState } from '@/lib/shift-activity-tracker';
import { DollarSign, ShoppingCart, TrendingUp, Clock, LogOut, Play, Square, Coffee, Activity, Pause } from 'lucide-react';

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
  activeTimeMs?: number;
  inactiveTimeMs?: number;
  breakTimeMs?: number;
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
  const [activityState, setActivityState] = useState<ShiftActivityState | null>(null);
  const [isOnBreak, setIsOnBreak] = useState(false);

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

  // Initialize activity tracker when shift is loaded
  useEffect(() => {
    if (shift && shift.status === 'open' && token) {
      shiftActivityTracker.initialize(shift._id, token);
      
      // Subscribe to activity state updates
      const unsubscribe = shiftActivityTracker.subscribe((state) => {
        setActivityState(state);
        setIsOnBreak(state.isOnBreak);
      });

      return () => {
        unsubscribe();
        shiftActivityTracker.cleanup();
      };
    }
  }, [shift?._id, shift?.status, token]);

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
      const res = await fetch(`${config.apiUrl}/shifts/current`, {
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
            const salesRes = await fetch(`${config.apiUrl}/shifts/${data._id}/sales`, {
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
      // Use the dedicated cashier stats endpoint
      const res = await fetch(`${config.apiUrl}/sales/cashier-stats`, {
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
    shiftActivityTracker.cleanup();
    logout();
    router.push('/login');
  };

  const handleStartBreak = async () => {
    const success = await shiftActivityTracker.startBreak('Break');
    if (success) {
      toast({ type: 'info', title: 'Break Started', message: 'Your break has started. Activity tracking is paused.' });
    }
  };

  const handleEndBreak = async () => {
    const success = await shiftActivityTracker.endBreak();
    if (success) {
      toast({ type: 'success', title: 'Break Ended', message: 'Welcome back! Activity tracking resumed.' });
    }
  };

  const formatCurrency = (value: number) =>
    `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`;
  };

  const getActivePercentage = () => {
    if (!activityState) return 100;
    const total = activityState.activeTimeMs + activityState.inactiveTimeMs;
    if (total === 0) return 100;
    return Math.round((activityState.activeTimeMs / total) * 100);
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
          <Card className={`mb-8 border-l-4 ${isOnBreak ? 'border-l-amber-500' : 'border-l-blue-500'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {isOnBreak ? (
                    <Coffee className="h-4 w-4 text-amber-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-blue-600" />
                  )}
                  {isOnBreak ? 'On Break' : 'Active Shift'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {activityState && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                      activityState.isActive 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      <Activity className="h-3 w-3" />
                      {activityState.isActive ? 'Active' : 'Idle'}
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    isOnBreak 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {isOnBreak ? 'Break' : shift.status === 'open' ? 'Running' : 'Closed'}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Start Time</p>
                  <p className="font-semibold">{formatTime(shift.startTime)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Duration</p>
                  <p className="font-semibold">{shiftDuration}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active Time</p>
                  <p className="font-semibold text-green-600">
                    {activityState ? formatDuration(activityState.activeTimeMs) : shiftDuration}
                  </p>
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
                <div>
                  <p className="text-xs text-muted-foreground">Activity Rate</p>
                  <p className={`font-semibold ${getActivePercentage() >= 70 ? 'text-green-600' : getActivePercentage() >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {getActivePercentage()}%
                  </p>
                </div>
                {activityState && activityState.inactiveTimeMs > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Idle Time</p>
                    <p className="font-semibold text-yellow-600">{formatDuration(activityState.inactiveTimeMs)}</p>
                  </div>
                )}
              </div>
              
              {/* Activity Progress Bar */}
              {activityState && (activityState.activeTimeMs > 0 || activityState.inactiveTimeMs > 0) && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Activity Breakdown</span>
                    <span>{getActivePercentage()}% active</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-green-500 h-full transition-all duration-300" 
                      style={{ width: `${getActivePercentage()}%` }}
                    />
                    <div 
                      className="bg-yellow-500 h-full transition-all duration-300" 
                      style={{ width: `${100 - getActivePercentage()}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-green-600">Active: {formatDuration(activityState.activeTimeMs)}</span>
                    <span className="text-yellow-600">Idle: {formatDuration(activityState.inactiveTimeMs)}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push('/pos')}
                  className="flex-1"
                  disabled={isOnBreak}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  POS
                </Button>
                
                {/* Break Toggle Button */}
                {isOnBreak ? (
                  <Button
                    size="sm"
                    onClick={handleEndBreak}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    End Break
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleStartBreak}
                    className="flex-1"
                  >
                    <Coffee className="h-4 w-4 mr-1" />
                    Take Break
                  </Button>
                )}
                
                <Button
                  size="sm"
                  onClick={() => router.push('/cashier/shift-end')}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                  disabled={isOnBreak}
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
