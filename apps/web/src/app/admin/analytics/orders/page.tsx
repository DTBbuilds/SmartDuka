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
  ShoppingCart,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Package,
  User,
  Calendar,
  Filter,
} from 'lucide-react';
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
      
      if (res.ok) {
        const data = await res.json();
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
              <CardHeader>
                <CardTitle>Orders This Week</CardTitle>
                <CardDescription>Daily order volume and revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-end gap-2">
                  {stats.ordersByDay.map((day, i) => {
                    const maxCount = Math.max(...stats.ordersByDay.map(d => d.count));
                    const height = (day.count / maxCount) * 100;
                    const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <div className="text-xs font-medium">{day.count}</div>
                        <div
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t cursor-pointer hover:from-blue-400 transition-colors"
                          style={{ height: `${height}%`, minHeight: '20px' }}
                          title={`${day.date}: ${day.count} orders, Ksh ${day.revenue.toLocaleString()}`}
                        />
                        <span className="text-xs text-muted-foreground">{dayName}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Order Status</CardTitle>
                <CardDescription>This month's breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.statusBreakdown.map((item, i) => {
                    const total = stats.statusBreakdown.reduce((sum, s) => sum + s.count, 0);
                    const percentage = (item.count / total) * 100;
                    return (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(item.status)}
                            <span className="capitalize font-medium">{item.status}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{item.count}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getStatusColor(item.status)}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Latest transactions</CardDescription>
                </div>
                <div className="flex gap-2">
                  {['all', 'completed', 'pending', 'cancelled'].map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentOrders
                  .filter(order => statusFilter === 'all' || order.status === statusFilter)
                  .map((order) => (
                    <div
                      key={order._id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                      onClick={() => router.push(`/orders/${order._id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <ShoppingCart className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{order.orderNumber}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Package className="h-3 w-3" />
                            <span>{order.itemCount} items</span>
                            {order.customerName && (
                              <>
                                <span>•</span>
                                <User className="h-3 w-3" />
                                <span>{order.customerName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">Ksh {order.total.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{order.paymentMethod}</p>
                        </div>
                        <Badge variant={order.status === 'completed' ? 'default' : order.status === 'pending' ? 'secondary' : 'destructive'}>
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
