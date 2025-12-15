'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@smartduka/ui';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  ArrowLeft,
  ShoppingCart,
  Users,
  Clock,
  Target,
  Percent,
} from 'lucide-react';
import { Button } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { useBranch } from '@/lib/branch-context';
import { config } from '@/lib/config';

type SalesData = {
  todayRevenue: number;
  todayOrders: number;
  yesterdayRevenue: number;
  yesterdayOrders: number;
  weekRevenue: number;
  weekOrders: number;
  monthRevenue: number;
  monthOrders: number;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topSellingProducts: Array<{ name: string; quantity: number; revenue: number }>;
  hourlyBreakdown: Array<{ hour: number; revenue: number; orders: number }>;
  dailyTrend: Array<{ date: string; revenue: number; orders: number }>;
  paymentMethods: Array<{ method: string; count: number; total: number }>;
};

export default function SalesAnalyticsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { currentBranch } = useBranch();
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (token) {
      loadSalesData();
    }
  }, [token, dateRange, currentBranch]);

  const loadSalesData = async () => {
    try {
      setLoading(true);
      const branchParam = currentBranch ? `&branchId=${currentBranch._id}` : '';
      const res = await fetch(`${config.apiUrl}/sales/analytics?range=${dateRange}${branchParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setSalesData(data);
      } else {
        console.error('Failed to load sales analytics:', res.status);
        setSalesData(null);
      }
    } catch (err) {
      console.error('Failed to load sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 100;
    return ((current - previous) / previous) * 100;
  };

  const todayGrowth = salesData ? calculateGrowth(salesData.todayRevenue, salesData.yesterdayRevenue) : 0;

  if (loading) {
    return (
      <div className="container py-8 px-4 sm:px-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-2/3 sm:w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!salesData) {
    return (
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Sales Analytics</h1>
            <p className="text-muted-foreground">Detailed sales performance and trends</p>
          </div>
        </div>
        <Card className="p-12 text-center">
          <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No Sales Data Yet</h2>
          <p className="text-muted-foreground mb-4">
            Start making sales to see your analytics here.
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
            <h1 className="text-3xl font-bold">Sales Analytics</h1>
            <p className="text-muted-foreground">Detailed sales performance and trends</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(['today', 'week', 'month', 'year'] as const).map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(range)}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {salesData && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Revenue</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                      Ksh {salesData.todayRevenue.toLocaleString()}
                    </p>
                    <div className={`flex items-center gap-1 text-xs mt-1 ${todayGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {todayGrowth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(todayGrowth).toFixed(1)}% vs yesterday
                    </div>
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
                    <p className="text-sm text-muted-foreground">Today's Orders</p>
                    <p className="text-2xl font-bold">{salesData.todayOrders}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Avg: Ksh {salesData.averageOrderValue.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <ShoppingCart className="h-6 w-6 text-blue-600" />
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
                      Ksh {salesData.monthRevenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {salesData.monthOrders} orders
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-500/10">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">All Time</p>
                    <p className="text-2xl font-bold">
                      Ksh {(salesData.totalRevenue / 1000000).toFixed(2)}M
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {salesData.totalOrders.toLocaleString()} orders
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-orange-500/10">
                    <Target className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Daily Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend (Last 30 Days)</CardTitle>
                <CardDescription>Daily revenue performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end gap-1">
                  {salesData.dailyTrend.slice(-14).map((day, i) => {
                    const maxRevenue = Math.max(...salesData.dailyTrend.map(d => d.revenue));
                    const height = (day.revenue / maxRevenue) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t hover:from-primary/80 transition-colors cursor-pointer"
                          style={{ height: `${height}%` }}
                          title={`${day.date}: Ksh ${day.revenue.toLocaleString()}`}
                        />
                        <span className="text-[10px] text-muted-foreground rotate-45 origin-left">
                          {new Date(day.date).getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Hourly Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Peak Hours Today</CardTitle>
                <CardDescription>Sales by hour of day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end gap-1">
                  {salesData.hourlyBreakdown.map((hour, i) => {
                    const maxRevenue = Math.max(...salesData.hourlyBreakdown.map(h => h.revenue));
                    const height = (hour.revenue / maxRevenue) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t hover:from-blue-400 transition-colors cursor-pointer"
                          style={{ height: `${height}%` }}
                          title={`${hour.hour}:00 - Ksh ${hour.revenue.toLocaleString()} (${hour.orders} orders)`}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {hour.hour}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Products */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>Best performers this period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {salesData.topSellingProducts.map((product, i) => {
                    const maxRevenue = Math.max(...salesData.topSellingProducts.map(p => p.revenue));
                    const width = (product.revenue / maxRevenue) * 100;
                    return (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{product.name}</span>
                          <span className="text-muted-foreground">
                            {product.quantity} sold • Ksh {product.revenue.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                            style={{ width: `${width}%` }}
                          />
                        </div>
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
                <CardDescription>Transaction breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {salesData.paymentMethods.map((method, i) => {
                    const total = salesData.paymentMethods.reduce((sum, m) => sum + m.total, 0);
                    const percentage = (method.total / total) * 100;
                    const colors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500'];
                    return (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${colors[i]}`} />
                            <span className="font-medium">{method.method}</span>
                          </div>
                          <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{method.count} transactions</span>
                          <span>Ksh {method.total.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
