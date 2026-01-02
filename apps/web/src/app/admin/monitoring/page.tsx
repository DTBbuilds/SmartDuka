'use client';

import { config } from '@/lib/config';
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
    if (shop?.id && token) {
      loadMonitoringData();
    }
    
    // Auto-refresh every 30 seconds if enabled
    const interval = autoRefresh && shop?.id ? setInterval(loadMonitoringData, 30000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [token, autoRefresh, shop?.id]);

  const loadMonitoringData = async () => {
    if (!token || !user || !shop?.id) return;

    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      // Get cashiers
      const cashiersRes = await fetch(`${config.apiUrl}/users/shop/${shop.id}/cashiers`, {
        headers,
      });

      // Get all cashier sales stats from the new endpoint
      const salesStatsRes = await fetch(`${config.apiUrl}/sales/all-cashier-stats`, {
        headers,
      });

      const salesStats = salesStatsRes.ok ? await salesStatsRes.json() : [];

      if (cashiersRes.ok) {
        const cashiersData = await cashiersRes.json();
        setCashiers(cashiersData);

        // Merge cashier data with sales stats
        const metricsData: CashierMetrics[] = cashiersData.map((cashier: any) => {
          // Find matching sales stats by cashier ID
          const stats = salesStats.find((s: any) => s.userId === cashier._id) || {
            todaySales: 0,
            todayTransactions: 0,
            totalSales: 0,
            totalTransactions: 0,
          };

          // Determine online status based on recent activity
          // For now, mark as offline - could be enhanced with real-time status tracking
          let status: 'online' | 'idle' | 'offline' = 'offline';
          
          return {
            cashierId: cashier._id,
            cashierName: cashier.name,
            status,
            lastActivity: new Date().toISOString(),
            todaySales: stats.todaySales || 0,
            transactionCount: stats.todayTransactions || 0,
            averageTransaction: stats.todayTransactions > 0 
              ? Math.round(stats.todaySales / stats.todayTransactions) 
              : 0,
          };
        });
        setMetrics(metricsData);
      }

      // Get activity log
      const activityRes = await fetch(`${config.apiUrl}/activity/shop?limit=20`, {
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
