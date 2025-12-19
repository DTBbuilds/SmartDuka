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
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
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
    <div className="container py-4 md:py-8 px-4 md:px-6">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-3xl font-bold">Sales Analytics</h1>
            <p className="text-sm text-muted-foreground hidden md:block">Detailed sales performance and trends</p>
          </div>
        </div>
        {/* Date range selector - horizontal scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
          {(['today', 'week', 'month', 'year'] as const).map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(range)}
              className="flex-shrink-0"
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {salesData && (
        <>
          {/* Key Metrics - Compact on mobile */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 mb-6 md:mb-8">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
              <CardContent className="p-3 md:pt-6 md:p-6">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm text-muted-foreground">Today's Revenue</p>
                    <p className="text-lg md:text-2xl font-bold text-green-700 dark:text-green-400 truncate">
                      Ksh {salesData.todayRevenue.toLocaleString()}
                    </p>
                    <div className={`flex items-center gap-1 text-xs mt-1 ${todayGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {todayGrowth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      <span className="truncate">{Math.abs(todayGrowth).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="p-2 md:p-3 rounded-full bg-green-500/20 flex-shrink-0">
                    <DollarSign className="h-4 w-4 md:h-6 md:w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 md:pt-6 md:p-6">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm text-muted-foreground">Orders</p>
                    <p className="text-lg md:text-2xl font-bold">{salesData.todayOrders}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      Avg: Ksh {salesData.averageOrderValue.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2 md:p-3 rounded-full bg-blue-500/10 flex-shrink-0">
                    <ShoppingCart className="h-4 w-4 md:h-6 md:w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 md:pt-6 md:p-6">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm text-muted-foreground">This Month</p>
                    <p className="text-lg md:text-2xl font-bold truncate">
                      Ksh {(salesData.monthRevenue / 1000).toFixed(0)}K
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {salesData.monthOrders} orders
                    </p>
                  </div>
                  <div className="p-2 md:p-3 rounded-full bg-purple-500/10 flex-shrink-0">
                    <Calendar className="h-4 w-4 md:h-6 md:w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 md:pt-6 md:p-6">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm text-muted-foreground">All Time</p>
                    <p className="text-lg md:text-2xl font-bold truncate">
                      Ksh {(salesData.totalRevenue / 1000000).toFixed(1)}M
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {salesData.totalOrders.toLocaleString()} orders
                    </p>
                  </div>
                  <div className="p-2 md:p-3 rounded-full bg-orange-500/10 flex-shrink-0">
                    <Target className="h-4 w-4 md:h-6 md:w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
            {/* Daily Trend Chart */}
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base md:text-lg">Revenue Trend</CardTitle>
                <CardDescription className="text-xs md:text-sm">Last 14 days</CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
                {salesData.dailyTrend.length === 0 || salesData.dailyTrend.every(d => d.revenue === 0) ? (
                  <div className="h-40 md:h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No revenue data for this period</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-40 md:h-64 flex items-end gap-0.5 md:gap-1">
                    {salesData.dailyTrend.slice(-14).map((day, i) => {
                      const maxRevenue = Math.max(...salesData.dailyTrend.map(d => d.revenue), 1);
                      const height = Math.max((day.revenue / maxRevenue) * 100, day.revenue > 0 ? 5 : 0);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className={`w-full rounded-t hover:opacity-80 transition-colors cursor-pointer ${
                              day.revenue > 0 
                                ? 'bg-gradient-to-t from-primary to-primary/60' 
                                : 'bg-muted/50'
                            }`}
                            style={{ height: `${height || 2}%`, minHeight: '2px' }}
                            title={`${day.date}: Ksh ${day.revenue.toLocaleString()} (${day.orders} orders)`}
                          />
                          <span className="text-[10px] text-muted-foreground rotate-45 origin-left">
                            {new Date(day.date).getDate()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hourly Breakdown */}
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base md:text-lg">Peak Hours</CardTitle>
                <CardDescription className="text-xs md:text-sm">Sales by hour</CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
                {salesData.hourlyBreakdown.length === 0 || salesData.hourlyBreakdown.every(h => h.revenue === 0) ? (
                  <div className="h-40 md:h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No sales data for today yet</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-40 md:h-64 flex items-end gap-0.5 md:gap-1">
                    {salesData.hourlyBreakdown.map((hour, i) => {
                      const maxRevenue = Math.max(...salesData.hourlyBreakdown.map(h => h.revenue), 1);
                      const height = Math.max((hour.revenue / maxRevenue) * 100, hour.revenue > 0 ? 5 : 0);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className={`w-full rounded-t hover:opacity-80 transition-colors cursor-pointer ${
                              hour.revenue > 0 
                                ? 'bg-gradient-to-t from-blue-500 to-blue-400' 
                                : 'bg-muted/50'
                            }`}
                            style={{ height: `${height || 2}%`, minHeight: '2px' }}
                            title={`${hour.hour}:00 - Ksh ${hour.revenue.toLocaleString()} (${hour.orders} orders)`}
                          />
                          <span className="text-[10px] text-muted-foreground">
                            {hour.hour}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Top Products */}
            <Card className="lg:col-span-2">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base md:text-lg">Top Products</CardTitle>
                <CardDescription className="text-xs md:text-sm">Best performers</CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
                <div className="space-y-3 md:space-y-4">
                  {salesData.topSellingProducts.slice(0, 5).map((product, i) => {
                    const maxRevenue = Math.max(...salesData.topSellingProducts.map(p => p.revenue));
                    const width = (product.revenue / maxRevenue) * 100;
                    return (
                      <div key={i} className="space-y-1.5 md:space-y-2">
                        <div className="flex items-center justify-between text-xs md:text-sm gap-2">
                          <span className="font-medium truncate flex-1">{product.name}</span>
                          <span className="text-muted-foreground whitespace-nowrap text-xs">
                            {product.quantity} • Ksh {(product.revenue / 1000).toFixed(0)}K
                          </span>
                        </div>
                        <div className="h-1.5 md:h-2 bg-muted rounded-full overflow-hidden">
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
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-base md:text-lg">Payments</CardTitle>
                <CardDescription className="text-xs md:text-sm">By method</CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
                <div className="space-y-3 md:space-y-4">
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
