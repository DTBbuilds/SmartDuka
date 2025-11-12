'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/use-toast';
import { ToastContainer } from '@/components/toast-container';
import { AuthGuard } from '@/components/auth-guard';
import { CashierStatusBadge } from '@/components/cashier-status-badge';
import { Users, Activity, TrendingUp, RefreshCw, Eye } from 'lucide-react';

interface Cashier {
  _id: string;
  name: string;
  email: string;
  status: 'active' | 'disabled';
  createdAt: string;
}

interface CashierMetrics {
  cashierId: string;
  cashierName: string;
  status: 'online' | 'idle' | 'offline';
  lastActivity: string;
  todaySales: number;
  transactionCount: number;
  averageTransaction: number;
}

interface ActivityLog {
  _id: string;
  userName: string;
  action: string;
  details: any;
  timestamp: string;
}

function AdminMonitoringContent() {
  const router = useRouter();
  const { user, shop, token } = useAuth();
  const { toasts, toast, dismiss } = useToast();

  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [metrics, setMetrics] = useState<CashierMetrics[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadMonitoringData();
    
    // Auto-refresh every 30 seconds if enabled
    const interval = autoRefresh ? setInterval(loadMonitoringData, 30000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [token, autoRefresh]);

  const loadMonitoringData = async () => {
    if (!token || !user) return;

    try {
      setLoading(true);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const headers = { Authorization: `Bearer ${token}` };

      // Get cashiers
      const cashiersRes = await fetch(`${base}/users/shop/${shop?.id}/cashiers`, {
        headers,
      });

      if (cashiersRes.ok) {
        const cashiersData = await cashiersRes.json();
        setCashiers(cashiersData);

        // Get metrics for each cashier
        const metricsData: CashierMetrics[] = [];
        for (const cashier of cashiersData) {
          try {
            const transRes = await fetch(
              `${base}/activity/cashier/${cashier._id}/transactions?limit=100`,
              { headers }
            );

            if (transRes.ok) {
              const transactions = await transRes.json();
              let totalSales = 0;
              transactions.forEach((t: any) => {
                if (t.details?.amount) totalSales += t.details.amount;
              });

              const lastActivity = transactions.length > 0 ? transactions[0].timestamp : null;
              const now = new Date();
              const lastActivityDate = lastActivity ? new Date(lastActivity) : null;
              const diffMinutes = lastActivityDate
                ? Math.floor((now.getTime() - lastActivityDate.getTime()) / 60000)
                : 999;

              let status: 'online' | 'idle' | 'offline' = 'offline';
              if (diffMinutes < 5) status = 'online';
              else if (diffMinutes < 15) status = 'idle';

              metricsData.push({
                cashierId: cashier._id,
                cashierName: cashier.name,
                status,
                lastActivity: lastActivity || new Date().toISOString(),
                todaySales: totalSales,
                transactionCount: transactions.length,
                averageTransaction: transactions.length > 0 ? totalSales / transactions.length : 0,
              });
            }
          } catch (err) {
            console.error(`Failed to load metrics for cashier ${cashier._id}:`, err);
          }
        }
        setMetrics(metricsData);
      }

      // Get activity log
      const activityRes = await fetch(`${base}/activity/shop?limit=20`, {
        headers,
      });

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivityLog(activityData);
      }
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

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-KE');
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
                {shop.name} • Admin Monitoring
              </p>
            )}
            <h1 className="text-3xl font-bold">Cashier Monitoring</h1>
            <p className="text-muted-foreground">Real-time activity and performance tracking</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-green-50 border-green-300' : ''}
            >
              {autoRefresh ? '✓ Auto-refresh' : 'Auto-refresh off'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadMonitoringData}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Cashier Status Cards */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Cashiers
          </h2>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading cashiers...</div>
          ) : metrics.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No cashiers assigned to this shop
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metrics.map((metric) => (
                <Card key={metric.cashierId} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{metric.cashierName}</CardTitle>
                        <CardDescription className="text-xs">
                          {cashiers.find((c) => c._id === metric.cashierId)?.email}
                        </CardDescription>
                      </div>
                      <CashierStatusBadge
                        status={metric.status}
                        lastActivity={new Date(metric.lastActivity)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">Today's Sales</p>
                        <p className="font-bold text-sm">{formatCurrency(metric.todaySales)}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">Transactions</p>
                        <p className="font-bold text-sm">{metric.transactionCount}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">Avg Sale</p>
                        <p className="font-bold text-sm">{formatCurrency(metric.averageTransaction)}</p>
                      </div>
                    </div>

                    {/* View Details Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => router.push(`/admin/cashiers/${metric.cashierId}`)}
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest actions from all cashiers</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading activity...</div>
            ) : activityLog.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No activity yet</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {activityLog.map((log) => (
                  <div
                    key={log._id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{log.userName}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {log.action.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="text-right">
                      {log.details?.amount && (
                        <p className="font-bold">{formatCurrency(log.details.amount)}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatTime(log.timestamp)}
                      </p>
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

export default function AdminMonitoringPage() {
  return (
    <AuthGuard requiredRole="admin">
      <AdminMonitoringContent />
    </AuthGuard>
  );
}
