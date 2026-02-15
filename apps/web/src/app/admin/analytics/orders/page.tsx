'use client';

import { useEffect, useState, useMemo } from 'react';
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
  ShoppingCart,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Package,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Button } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { useBranch } from '@/lib/branch-context';
import { config } from '@/lib/config';

type Order = {
  _id: string;
  orderNumber: string;
  total: number;
  status: 'completed' | 'pending' | 'cancelled' | 'refunded';
  paymentMethod: string;
  itemCount: number;
  customerName?: string;
  createdAt: string;
  cashierName: string;
};

type OrderStats = {
  todayOrders: number;
  todayRevenue: number;
  weekOrders: number;
  weekRevenue: number;
  monthOrders: number;
  monthRevenue: number;
  averageOrderValue: number;
  completionRate: number;
  averageItemsPerOrder: number;
  peakHour: number;
  statusBreakdown: { status: string; count: number }[];
  recentOrders: Order[];
  ordersByDay: { date: string; count: number; revenue: number }[];
};

export default function OrdersAnalyticsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { currentBranch } = useBranch();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (token) {
      loadOrderStats();
    }
  }, [token, currentBranch]);

  const loadOrderStats = async () => {
    try {
      setLoading(true);
      const branchParam = currentBranch ? `?branchId=${currentBranch._id}` : '';
      const res = await fetch(`${config.apiUrl}/sales/orders/analytics${branchParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      
      if (res.ok) {
        setStats(data);
      } else {
        console.error('Failed to load orders analytics:', res.status);
        setStats(null);
      }
    } catch (err) {
      console.error('Failed to load order stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      case 'refunded': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'refunded': return <AlertTriangle className="h-4 w-4 text-purple-600" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <h1 className="text-3xl font-bold">Orders Analytics</h1>
            <p className="text-muted-foreground">Track and analyze order performance</p>
          </div>
        </div>
        <Card className="p-12 text-center">
          <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No Orders Yet</h2>
          <p className="text-muted-foreground mb-4">
            Start processing orders to see your analytics here.
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
            <h1 className="text-3xl font-bold">Orders Analytics</h1>
            <p className="text-muted-foreground">Track and analyze order performance</p>
          </div>
        </div>
        <Button onClick={() => router.push('/orders')}>
          View All Orders
        </Button>
      </div>

      {stats && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{stats.todayOrders}</p>
                  <p className="text-sm text-muted-foreground">Today's Orders</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{stats.completionRate}%</p>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">Ksh {stats.averageOrderValue.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Avg Order Value</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{stats.averageItemsPerOrder}</p>
                  <p className="text-sm text-muted-foreground">Avg Items/Order</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{stats.peakHour}:00</p>
                  <p className="text-sm text-muted-foreground">Peak Hour</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Orders by Day */}
            <Card className="lg:col-span-2">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold">Orders This Week</CardTitle>
                <CardDescription className="text-xs">Daily order volume and revenue</CardDescription>
              </CardHeader>
              <CardContent className="p-2 md:p-4 pt-0">
                {stats.ordersByDay.length === 0 ? (
                  <div className="h-56 flex items-center justify-center text-muted-foreground">
                    <p className="text-sm">No order data this week</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={stats.ordersByDay.map(d => ({ ...d, label: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }) }))} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={35} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                        formatter={((value: any, name: any) => {
                          const v = value ?? 0;
                          if (name === 'count') return [v, 'Orders'];
                          return [`Ksh ${v.toLocaleString()}`, 'Revenue'];
                        }) as any}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Status Breakdown - Pie Chart */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold">Order Status</CardTitle>
                <CardDescription className="text-xs">This month's breakdown</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {(() => {
                  const STATUS_COLORS: Record<string, string> = { completed: '#22c55e', pending: '#eab308', cancelled: '#ef4444', refunded: '#a855f7', voided: '#6b7280' };
                  const total = stats.statusBreakdown.reduce((s, i) => s + i.count, 0);
                  const pieData = stats.statusBreakdown.filter(i => i.count > 0);
                  return (
                    <>
                      <div className="flex justify-center mb-3">
                        <ResponsiveContainer width={140} height={140}>
                          <PieChart>
                            <Pie data={pieData} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={40} outerRadius={65} strokeWidth={2} stroke="hsl(var(--background))">
                              {pieData.map((entry, idx) => (
                                <Cell key={idx} fill={STATUS_COLORS[entry.status] || '#6b7280'} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {stats.statusBreakdown.map((item, i) => {
                          const pct = total > 0 ? ((item.count / total) * 100).toFixed(0) : '0';
                          return (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[item.status] || '#6b7280' }} />
                                <span className="capitalize text-xs font-medium">{item.status}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-semibold">{item.count}</span>
                                <span className="text-xs text-muted-foreground ml-1.5">({pct}%)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Recent Orders</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Latest transactions</CardDescription>
                </div>
                <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {['all', 'completed', 'pending', 'cancelled'].map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                      className="text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8 whitespace-nowrap flex-shrink-0"
                    >
                      {status === 'cancelled' ? 'Canc' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="space-y-2 sm:space-y-3">
                {stats.recentOrders
                  .filter(order => statusFilter === 'all' || order.status === statusFilter)
                  .map((order) => (
                    <div
                      key={order._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer gap-2 sm:gap-4"
                      onClick={() => router.push(`/orders/${order._id}`)}
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                          <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base truncate">{order.orderNumber}</p>
                          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {order.itemCount} items
                            </span>
                            {order.customerName && (
                              <span className="truncate max-w-[100px] sm:max-w-none">• {order.customerName}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-11 sm:pl-0">
                        <div className="text-left sm:text-right">
                          <p className="font-semibold text-sm sm:text-base">Ksh {order.total.toLocaleString()}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">{order.paymentMethod}</p>
                        </div>
                        <Badge 
                          variant={order.status === 'completed' ? 'default' : order.status === 'pending' ? 'secondary' : 'destructive'}
                          className="text-[10px] sm:text-xs px-1.5 sm:px-2 flex-shrink-0"
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
