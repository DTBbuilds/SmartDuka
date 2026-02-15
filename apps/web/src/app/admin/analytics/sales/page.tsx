'use client';

import { useEffect, useState, useMemo } from 'react';
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
  Clock,
  ChevronRight,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from 'lucide-react';
import { Button } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { useBranch } from '@/lib/branch-context';
import { config } from '@/lib/config';
import { BackButton } from '@/components/back-button';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

type SalesData = {
  period: string;
  periodRevenue: number;
  periodOrders: number;
  prevRevenue: number;
  prevOrders: number;
  revenueGrowth: number;
  ordersGrowth: number;
  averageOrderValue: number;
  totalRevenue: number;
  totalOrders: number;
  topSellingProducts: Array<{ name: string; quantity: number; revenue: number }>;
  hourlyBreakdown: Array<{ hour: number; revenue: number; orders: number }>;
  dailyTrend: Array<{ date: string; revenue: number; orders: number }>;
  paymentMethods: Array<{ method: string; count: number; total: number }>;
};

const PERIOD_LABELS: Record<string, { title: string; subtitle: string; trendLabel: string; comparedTo: string }> = {
  today: { title: 'Today', subtitle: "Today's sales performance", trendLabel: 'Hourly breakdown', comparedTo: 'vs yesterday' },
  week: { title: 'This Week', subtitle: 'Last 7 days performance', trendLabel: 'Daily for 7 days', comparedTo: 'vs prev week' },
  month: { title: 'This Month', subtitle: 'Last 30 days performance', trendLabel: 'Daily for 30 days', comparedTo: 'vs prev month' },
  year: { title: 'This Year', subtitle: 'Last 12 months performance', trendLabel: 'Monthly for 12 months', comparedTo: 'vs prev year' },
};

const formatCurrency = (value: number) => {
  if (value >= 1_000_000) return `Ksh ${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 10_000) return `Ksh ${(value / 1_000).toFixed(0)}K`;
  if (value >= 1_000) return `Ksh ${(value / 1_000).toFixed(1)}K`;
  return `Ksh ${value.toLocaleString('en-KE')}`;
};

const formatAxis = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return `${value}`;
};

const PAYMENT_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444'];

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

  const labels = PERIOD_LABELS[dateRange];

  // Format chart data
  const trendData = useMemo(() => {
    if (!salesData) return [];
    return salesData.dailyTrend.map((d) => {
      const dt = new Date(d.date);
      let label: string;
      if (dateRange === 'year') {
        label = dt.toLocaleDateString('en-KE', { month: 'short' });
      } else if (dateRange === 'today') {
        label = d.date;
      } else {
        label = `${dt.getDate()}/${dt.getMonth() + 1}`;
      }
      return { ...d, label };
    });
  }, [salesData, dateRange]);

  const peakHoursData = useMemo(() => {
    if (!salesData) return [];
    return salesData.hourlyBreakdown.map((h) => ({
      ...h,
      label: `${h.hour > 12 ? h.hour - 12 : h.hour}${h.hour >= 12 ? 'pm' : 'am'}`,
    }));
  }, [salesData]);

  const maxHourRevenue = useMemo(() => {
    if (!peakHoursData.length) return 0;
    return Math.max(...peakHoursData.map((h) => h.revenue));
  }, [peakHoursData]);

  if (loading) {
    return (
      <div className="container py-8 px-4 sm:px-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-2/3 sm:w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-muted rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-72 bg-muted rounded-xl"></div>
            <div className="h-72 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!salesData) {
    return (
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-8">
          <BackButton fallbackRoute="/admin/analytics" iconOnly />
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

  const paymentTotal = salesData.paymentMethods.reduce((s, m) => s + m.total, 0);

  return (
    <div className="container py-4 md:py-8 px-4 md:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackButton fallbackRoute="/admin/analytics" iconOnly />
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Sales Analytics</h1>
              <p className="text-xs md:text-sm text-muted-foreground">{labels.subtitle}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadSalesData} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Period selector */}
        <div className="flex gap-1.5 bg-muted/50 p-1 rounded-lg w-fit">
          {(['today', 'week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                dateRange === range
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {range === 'today' ? 'Today' : range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'Year'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Revenue */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-3 md:p-4">
            <p className="text-xs text-muted-foreground font-medium">Revenue</p>
            <p className="text-lg md:text-2xl font-bold mt-1">{formatCurrency(salesData.periodRevenue)}</p>
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${salesData.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {salesData.revenueGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(salesData.revenueGrowth).toFixed(1)}% {labels.comparedTo}
            </div>
          </CardContent>
        </Card>

        {/* Orders */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3 md:p-4">
            <p className="text-xs text-muted-foreground font-medium">Orders</p>
            <p className="text-lg md:text-2xl font-bold mt-1">{salesData.periodOrders}</p>
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${salesData.ordersGrowth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {salesData.ordersGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(salesData.ordersGrowth).toFixed(1)}% {labels.comparedTo}
            </div>
          </CardContent>
        </Card>

        {/* Avg Order Value */}
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-3 md:p-4">
            <p className="text-xs text-muted-foreground font-medium">Avg Order</p>
            <p className="text-lg md:text-2xl font-bold mt-1">{formatCurrency(salesData.averageOrderValue)}</p>
            <p className="text-xs text-muted-foreground mt-1">per order</p>
          </CardContent>
        </Card>

        {/* All-Time */}
        <Card
          className="border-l-4 border-l-orange-500 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push('/admin/analytics/all-time')}
        >
          <CardContent className="p-3 md:p-4">
            <p className="text-xs text-muted-foreground font-medium">All-Time</p>
            <p className="text-lg md:text-2xl font-bold mt-1">{formatCurrency(salesData.totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {salesData.totalOrders} orders <ChevronRight className="h-3 w-3" />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Revenue Trend - Area Chart */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold">Revenue Trend</CardTitle>
            <CardDescription className="text-xs">{labels.trendLabel}</CardDescription>
          </CardHeader>
          <CardContent className="p-2 md:p-4 pt-0">
            {trendData.length === 0 || trendData.every(d => d.revenue === 0) ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No revenue data for this period</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={formatAxis}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--background))',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                    formatter={((value: any) => [formatCurrency(value ?? 0), 'Revenue']) as any}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#revenueGradient)"
                    dot={trendData.length <= 14 ? { r: 3, fill: '#10b981', strokeWidth: 0 } : false}
                    activeDot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Peak Hours - Bar Chart */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold">Peak Hours</CardTitle>
            <CardDescription className="text-xs">
              {dateRange === 'today' ? "Today's sales by hour" : `Aggregated hourly sales (${labels.title.toLowerCase()})`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 md:p-4 pt-0">
            {peakHoursData.every(h => h.revenue === 0) ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No hourly data for this period</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={peakHoursData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={formatAxis}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--background))',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                    formatter={((value: any, name: any) => {
                      const v = value ?? 0;
                      if (name === 'revenue') return [formatCurrency(v), 'Revenue'];
                      return [v, 'Orders'];
                    }) as any}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={32}>
                    {peakHoursData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.revenue === maxHourRevenue ? '#3b82f6' : '#93c5fd'}
                        opacity={entry.revenue === 0 ? 0.15 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Top Products */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold">Top Products</CardTitle>
            <CardDescription className="text-xs">Best performers — {labels.title.toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {salesData.topSellingProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No product data for this period</p>
            ) : (
              <div className="space-y-3">
                {salesData.topSellingProducts.slice(0, 5).map((product, i) => {
                  const maxRevenue = Math.max(...salesData.topSellingProducts.map(p => p.revenue), 1);
                  const width = (product.revenue / maxRevenue) * 100;
                  const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500'];
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                          <span className="font-medium truncate">{product.name}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">{product.quantity} sold</span>
                          <span className="text-sm font-semibold">{formatCurrency(product.revenue)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden ml-7">
                        <div
                          className={`h-full ${colors[i % colors.length]} rounded-full transition-all duration-500`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold">Payment Methods</CardTitle>
            <CardDescription className="text-xs">{labels.title} breakdown</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {salesData.paymentMethods.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">No payment data</p>
              </div>
            ) : (
              <>
                {/* Mini pie chart */}
                <div className="flex justify-center mb-4">
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie
                        data={salesData.paymentMethods}
                        dataKey="total"
                        nameKey="method"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        strokeWidth={2}
                        stroke="hsl(var(--background))"
                      >
                        {salesData.paymentMethods.map((_, idx) => (
                          <Cell key={idx} fill={PAYMENT_COLORS[idx % PAYMENT_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="space-y-2.5">
                  {salesData.paymentMethods.map((method, i) => {
                    const pct = paymentTotal > 0 ? (method.total / paymentTotal) * 100 : 0;
                    return (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: PAYMENT_COLORS[i % PAYMENT_COLORS.length] }} />
                          <span className="font-medium text-xs">{method.method}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold">{formatCurrency(method.total)}</span>
                          <span className="text-xs text-muted-foreground ml-1.5">({pct.toFixed(0)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
