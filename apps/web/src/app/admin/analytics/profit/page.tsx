'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useBranch } from '@/lib/branch-context';
import { config } from '@/lib/config';
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@smartduka/ui';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  ArrowUpRight,
  Percent,
  Target,
  Wallet,
} from 'lucide-react';
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
} from 'recharts';

interface ProfitData {
  totalRevenue: number;
  totalCostOfGoodsSold: number;
  grossProfit: number;
  grossMargin: number;
  totalOrders: number;
  totalItemsSold: number;
  averageOrderProfit: number;
  averageItemProfit: number;
  topProfitableProducts: Array<{
    name: string;
    revenue: number;
    cost: number;
    profit: number;
    quantity: number;
    margin: number;
  }>;
  lowMarginProducts: Array<{
    name: string;
    revenue: number;
    cost: number;
    profit: number;
    quantity: number;
    margin: number;
  }>;
  dailyTrend: Array<{
    date: string;
    revenue: number;
    cost: number;
    profit: number;
    orders: number;
    margin: number;
  }>;
  period: string;
  startDate: string;
  endDate: string;
}

interface PurchaseStats {
  totalPurchases: number;
  pendingPurchases: number;
  receivedPurchases: number;
  totalSpent: number;
}

export default function ProfitAnalyticsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const { currentBranch } = useBranch();
  const [loading, setLoading] = useState(true);
  const [profitData, setProfitData] = useState<ProfitData | null>(null);
  const [purchaseStats, setPurchaseStats] = useState<PurchaseStats | null>(null);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'trends'>('overview');

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token, dateRange, currentBranch]);

  const loadData = async () => {
    try {
      setLoading(true);
      const branchParam = currentBranch ? `&branchId=${currentBranch._id}` : '';
      
      // Fetch profit analytics
      const profitRes = await fetch(`${config.apiUrl}/sales/profit/analytics?range=${dateRange}${branchParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (profitRes.ok) {
        const text = await profitRes.text();
        if (text) setProfitData(JSON.parse(text));
      }

      // Fetch purchase stats
      const purchaseRes = await fetch(`${config.apiUrl}/purchases`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (purchaseRes.ok) {
        const text = await purchaseRes.text();
        if (text) {
          const purchases = JSON.parse(text);
          const now = new Date();
          const rangeStart = dateRange === 'today' ? new Date(now.setHours(0,0,0,0)) :
                           dateRange === 'week' ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) :
                           dateRange === 'year' ? new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) :
                           new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          
          const filteredPurchases = purchases.filter((p: any) => 
            new Date(p.createdAt) >= rangeStart
          );
          
          setPurchaseStats({
            totalPurchases: filteredPurchases.length,
            pendingPurchases: filteredPurchases.filter((p: any) => p.status === 'pending').length,
            receivedPurchases: filteredPurchases.filter((p: any) => p.status === 'received').length,
            totalSpent: filteredPurchases.reduce((sum: number, p: any) => sum + (p.totalCost || 0), 0),
          });
        }
      }
    } catch (err) {
      console.error('Failed to load profit data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString('en-KE')}`;
  };

  if (loading) {
    return (
      <div className="container py-8 px-4 sm:px-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-muted rounded-xl"></div>
            ))}
          </div>
          <div className="h-64 bg-muted rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!profitData) {
    return (
      <div className="container py-8">
        <Card className="p-12 text-center">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No Profit Data Yet</h2>
          <p className="text-muted-foreground mb-4">
            Start making sales to see your profit analytics here.
          </p>
          <Button onClick={() => router.push('/pos')}>Go to POS</Button>
        </Card>
      </div>
    );
  }

  const netProfit = profitData.grossProfit - (purchaseStats?.totalSpent || 0);
  const isPositiveProfit = profitData.grossProfit > 0;

  return (
    <div className="container py-4 md:py-8 px-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl md:text-3xl font-bold">Profit Analytics</h1>
            <p className="text-sm text-muted-foreground hidden md:block">
              Track your business profitability and margins
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Date Range Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
          {(['today', 'week', 'month', 'year'] as const).map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(range)}
              className="flex-shrink-0"
            >
              {range === 'today' ? 'Today' : 
               range === 'week' ? 'This Week' : 
               range === 'month' ? 'This Month' : 'This Year'}
            </Button>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
          {(['overview', 'products', 'trends'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab 
                  ? 'bg-background shadow text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 mb-6">
            {/* Total Revenue */}
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-lg md:text-2xl font-bold text-blue-700 dark:text-blue-400">
                      {formatCurrency(profitData.totalRevenue)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {profitData.totalOrders} orders
                    </p>
                  </div>
                  <div className="p-2 rounded-full bg-blue-500/20">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost of Goods */}
            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Cost of Goods</p>
                    <p className="text-lg md:text-2xl font-bold text-orange-700 dark:text-orange-400">
                      {formatCurrency(profitData.totalCostOfGoodsSold)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {profitData.totalItemsSold} items sold
                    </p>
                  </div>
                  <div className="p-2 rounded-full bg-orange-500/20">
                    <Package className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gross Profit */}
            <Card className={`bg-gradient-to-br ${isPositiveProfit ? 'from-green-500/10 to-green-600/5 border-green-500/20' : 'from-red-500/10 to-red-600/5 border-red-500/20'}`}>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Gross Profit</p>
                    <p className={`text-lg md:text-2xl font-bold ${isPositiveProfit ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                      {formatCurrency(profitData.grossProfit)}
                    </p>
                    <div className={`flex items-center gap-1 text-xs mt-1 ${isPositiveProfit ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositiveProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      <span>{profitData.grossMargin}% margin</span>
                    </div>
                  </div>
                  <div className={`p-2 rounded-full ${isPositiveProfit ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    {isPositiveProfit ? <TrendingUp className="h-5 w-5 text-green-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profit Margin */}
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Profit Margin</p>
                    <p className="text-lg md:text-2xl font-bold text-purple-700 dark:text-purple-400">
                      {profitData.grossMargin}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Avg {formatCurrency(profitData.averageOrderProfit)}/order
                    </p>
                  </div>
                  <div className="p-2 rounded-full bg-purple-500/20">
                    <Percent className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Purchase Stats */}
          {purchaseStats && (
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Stock Purchases
                </CardTitle>
                <CardDescription>Money spent on restocking inventory</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <p className="text-xl font-bold">{formatCurrency(purchaseStats.totalSpent)}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Purchase Orders</p>
                    <p className="text-xl font-bold">{purchaseStats.totalPurchases}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Received</p>
                    <p className="text-xl font-bold text-green-600">{purchaseStats.receivedPurchases}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-xl font-bold text-orange-600">{purchaseStats.pendingPurchases}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Profit vs Cost Comparison */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Revenue vs Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Revenue Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Revenue</span>
                    <span className="text-blue-600">{formatCurrency(profitData.totalRevenue)}</span>
                  </div>
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
                
                {/* Cost Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Cost of Goods Sold</span>
                    <span className="text-orange-600">{formatCurrency(profitData.totalCostOfGoodsSold)}</span>
                  </div>
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-500 rounded-full" 
                      style={{ width: `${profitData.totalRevenue > 0 ? (profitData.totalCostOfGoodsSold / profitData.totalRevenue) * 100 : 0}%` }} 
                    />
                  </div>
                </div>
                
                {/* Profit Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Gross Profit</span>
                    <span className={isPositiveProfit ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(profitData.grossProfit)}
                    </span>
                  </div>
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${isPositiveProfit ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${profitData.totalRevenue > 0 ? Math.abs(profitData.grossProfit / profitData.totalRevenue) * 100 : 0}%` }} 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Profitable Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-green-600" />
                Top Profitable Products
              </CardTitle>
              <CardDescription>Products generating the most profit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profitData.topProfitableProducts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No product data available</p>
                ) : (
                  profitData.topProfitableProducts.map((product, i) => {
                    const maxProfit = Math.max(...profitData.topProfitableProducts.map(p => p.profit));
                    const width = maxProfit > 0 ? (product.profit / maxProfit) * 100 : 0;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium truncate flex-1">{product.name}</span>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-green-600 font-semibold">{formatCurrency(product.profit)}</span>
                            <span className="text-muted-foreground">({product.margin}%)</span>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{product.quantity} sold</span>
                          <span>Revenue: {formatCurrency(product.revenue)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Low Margin Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Low Margin Products
              </CardTitle>
              <CardDescription>Products with margins below 20% - consider repricing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profitData.lowMarginProducts.length === 0 ? (
                  <div className="text-center py-4">
                    <Target className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p className="text-green-600 font-medium">All products have healthy margins!</p>
                  </div>
                ) : (
                  profitData.lowMarginProducts.map((product, i) => (
                    <div key={i} className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{product.name}</span>
                        <span className={`text-sm font-bold ${product.margin < 10 ? 'text-red-600' : 'text-amber-600'}`}>
                          {product.margin}% margin
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Cost: {formatCurrency(product.cost / product.quantity)}/unit</span>
                        <span>Profit: {formatCurrency(product.profit)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          {/* Daily Profit Trend - Area Chart */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold">Daily Profit Trend</CardTitle>
              <CardDescription className="text-xs">Revenue and profit over time</CardDescription>
            </CardHeader>
            <CardContent className="p-2 md:p-4 pt-0">
              {profitData.dailyTrend.every(d => d.revenue === 0) ? (
                <div className="h-56 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No trend data for this period</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={profitData.dailyTrend.slice(-14).map(d => ({ ...d, label: `${new Date(d.date).getDate()}/${new Date(d.date).getMonth() + 1}` }))} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={45} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                      formatter={((value: any, name: any) => [formatCurrency(value ?? 0), name === 'revenue' ? 'Revenue' : 'Profit']) as any}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" dot={false} />
                    <Area type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2.5} fill="url(#profitGrad)" dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#22c55e', strokeWidth: 2, stroke: '#fff' }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              <div className="flex items-center justify-center gap-6 mt-2 text-xs">
                <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-blue-500 rounded" /><span>Revenue</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-green-500 rounded" /><span>Profit</span></div>
              </div>
            </CardContent>
          </Card>

          {/* Margin Trend - Bar Chart */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold">Margin Trend</CardTitle>
              <CardDescription className="text-xs">Daily profit margin percentage</CardDescription>
            </CardHeader>
            <CardContent className="p-2 md:p-4 pt-0">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={profitData.dailyTrend.slice(-14).map(d => ({ ...d, label: `${new Date(d.date).getDate()}/${new Date(d.date).getMonth() + 1}` }))} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    formatter={((value: any) => [`${(value ?? 0).toFixed(1)}%`, 'Margin']) as any}
                  />
                  <Bar dataKey="margin" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {profitData.dailyTrend.slice(-14).map((d, idx) => (
                      <Cell key={idx} fill={d.margin >= 30 ? '#22c55e' : d.margin >= 20 ? '#eab308' : d.margin >= 10 ? '#f97316' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded" /><span>≥30%</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-500 rounded" /><span>20-30%</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-orange-500 rounded" /><span>10-20%</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded" /><span>&lt;10%</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
