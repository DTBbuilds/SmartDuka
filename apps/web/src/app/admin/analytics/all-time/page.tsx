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
  DollarSign,
  ArrowLeft,
  ShoppingCart,
  Users,
  Package,
  CreditCard,
  BarChart3,
  Activity,
  Award,
  Loader2,
} from 'lucide-react';
import { CartLoader } from '@/components/ui/cart-loader';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RPieChart,
  Pie,
  Cell,
} from 'recharts';
import { Button } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { useBranch } from '@/lib/branch-context';
import { config } from '@/lib/config';

type AllTimeData = {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  averageOrderValue: number;
  topSellingProducts: Array<{ name: string; quantity: number; revenue: number }>;
  monthlyTrend: Array<{ month: string; revenue: number; orders: number }>;
  paymentMethods: Array<{ method: string; count: number; total: number }>;
  categoryBreakdown: Array<{ category: string; revenue: number; count: number }>;
  yearlyComparison: Array<{ year: number; revenue: number; orders: number }>;
  bestMonth: { month: string; revenue: number };
  bestDay: { date: string; revenue: number };
  growthRate: number;
};

export default function AllTimeAnalyticsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { currentBranch } = useBranch();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AllTimeData | null>(null);

  useEffect(() => {
    if (token) {
      loadAllTimeData();
    }
  }, [token, currentBranch]);

  const loadAllTimeData = async () => {
    try {
      setLoading(true);
      const branchParam = currentBranch ? `&branchId=${currentBranch._id}` : '';
      const res = await fetch(`${config.apiUrl}/sales/analytics?range=all${branchParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const text = await res.text();
        const salesData = text ? JSON.parse(text) : null;
        
        if (salesData) {
          // Transform the data for all-time view
          setData({
            totalRevenue: salesData.totalRevenue || 0,
            totalOrders: salesData.totalOrders || 0,
            totalProducts: salesData.totalProducts || 0,
            totalCustomers: salesData.totalCustomers || 0,
            averageOrderValue: salesData.averageOrderValue || 0,
            topSellingProducts: salesData.topSellingProducts || [],
            monthlyTrend: salesData.monthlyTrend || salesData.dailyTrend || [],
            paymentMethods: salesData.paymentMethods || [],
            categoryBreakdown: salesData.categoryBreakdown || [],
            yearlyComparison: salesData.yearlyComparison || [],
            bestMonth: salesData.bestMonth || { month: 'N/A', revenue: 0 },
            bestDay: salesData.bestDay || { date: 'N/A', revenue: 0 },
            growthRate: salesData.growthRate || 0,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load all-time data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `Ksh ${value.toLocaleString('en-KE')}`;
  };

  if (loading) {
    return <CartLoader fullScreen title="Loading Analytics" />;
  }

  if (!data) {
    return (
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">All-Time Analytics</h1>
            <p className="text-muted-foreground">Complete business performance overview</p>
          </div>
        </div>
        <Card className="p-12 text-center">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No Data Available</h2>
          <p className="text-muted-foreground mb-4">
            Start making sales to see your all-time analytics here.
          </p>
          <Button onClick={() => router.push('/pos')}>Go to POS</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-4 md:py-8 px-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-3xl font-bold">All-Time Analytics</h1>
            <p className="text-sm text-muted-foreground">Complete business performance since inception</p>
          </div>
        </div>
      </div>

      {/* Hero Stats - Large Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-green-500/10 via-green-600/5 to-emerald-500/10 border-green-500/20">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm md:text-base text-muted-foreground font-medium">Total Revenue</p>
                <p className="text-3xl md:text-5xl font-bold text-green-700 dark:text-green-400 mt-2">
                  {formatCurrency(data.totalRevenue)}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Lifetime earnings from all sales
                </p>
              </div>
              <div className="p-4 rounded-full bg-green-500/20">
                <DollarSign className="h-8 w-8 md:h-10 md:w-10 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 via-blue-600/5 to-indigo-500/10 border-blue-500/20">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm md:text-base text-muted-foreground font-medium">Total Orders</p>
                <p className="text-3xl md:text-5xl font-bold text-blue-700 dark:text-blue-400 mt-2">
                  {data.totalOrders.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Avg: {formatCurrency(data.averageOrderValue)} per order
                </p>
              </div>
              <div className="p-4 rounded-full bg-blue-500/20">
                <ShoppingCart className="h-8 w-8 md:h-10 md:w-10 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Products Sold</p>
                <p className="text-lg md:text-2xl font-bold">{data.totalProducts.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Customers</p>
                <p className="text-lg md:text-2xl font-bold">{data.totalCustomers.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Award className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Best Month</p>
                <p className="text-sm md:text-lg font-bold truncate">{data.bestMonth.month}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(data.bestMonth.revenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-500/10">
                <TrendingUp className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Growth Rate</p>
                <p className={`text-lg md:text-2xl font-bold ${data.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.growthRate >= 0 ? '+' : ''}{data.growthRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        {/* Monthly Trend - Area Chart */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Revenue Trend
            </CardTitle>
            <CardDescription className="text-xs">Monthly performance over time</CardDescription>
          </CardHeader>
          <CardContent className="p-2 md:p-4 pt-0">
            {data.monthlyTrend.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground">
                <p className="text-sm">No trend data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data.monthlyTrend.slice(-12).map(d => ({ ...d, label: d.month?.slice(0, 3) || '' }))} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="allTimeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={45} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    formatter={((value: any) => [formatCurrency(value ?? 0), 'Revenue']) as any}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#allTimeGrad)" dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods - Pie Chart */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Methods
            </CardTitle>
            <CardDescription className="text-xs">All-time payment distribution</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {data.paymentMethods.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                <p className="text-sm">No payment data available</p>
              </div>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <ResponsiveContainer width={140} height={140}>
                    <RPieChart>
                      <Pie data={data.paymentMethods} dataKey="total" nameKey="method" cx="50%" cy="50%" innerRadius={40} outerRadius={65} strokeWidth={2} stroke="hsl(var(--background))">
                        {data.paymentMethods.map((_, idx) => (
                          <Cell key={idx} fill={['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444'][idx % 5]} />
                        ))}
                      </Pie>
                    </RPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2.5">
                  {data.paymentMethods.map((method, i) => {
                    const total = data.paymentMethods.reduce((sum, m) => sum + m.total, 0);
                    const pct = total > 0 ? (method.total / total) * 100 : 0;
                    const colors = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444'];
                    return (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors[i % 5] }} />
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

      {/* Top Products */}
      <Card className="mb-6">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Award className="h-5 w-5" />
            All-Time Best Sellers
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">Products that have generated the most revenue</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          {data.topSellingProducts.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              <p className="text-sm">No product data available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.topSellingProducts.slice(0, 6).map((product, i) => {
                const maxRevenue = Math.max(...data.topSellingProducts.map(p => p.revenue));
                const width = maxRevenue > 0 ? (product.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={i} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? 'bg-yellow-100 text-yellow-700' :
                          i === 1 ? 'bg-gray-100 text-gray-700' :
                          i === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {i + 1}
                        </span>
                        <span className="font-medium text-sm truncate flex-1">{product.name}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{product.quantity.toLocaleString()} sold</span>
                        <span className="font-semibold text-foreground">{formatCurrency(product.revenue)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => router.push('/admin/analytics/sales')}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Daily Sales
        </Button>
        <Button variant="outline" onClick={() => router.push('/admin/analytics/orders')}>
          <ShoppingCart className="h-4 w-4 mr-2" />
          Orders
        </Button>
        <Button variant="outline" onClick={() => router.push('/admin/analytics/inventory')}>
          <Package className="h-4 w-4 mr-2" />
          Inventory
        </Button>
        <Button variant="outline" onClick={() => router.push('/reports')}>
          <BarChart3 className="h-4 w-4 mr-2" />
          Full Reports
        </Button>
      </div>
    </div>
  );
}
