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
  Package,
  ArrowLeft,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  Archive,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Button } from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { useBranch } from '@/lib/branch-context';
import { config } from '@/lib/config';

type InventoryStats = {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalStockValue: number;
  totalStockUnits: number;
  categoriesCount: number;
  averageStockLevel: number;
  turnoverRate: number;
  lowStockItems: Array<{ name: string; stock: number; threshold: number; sku: string }>;
  topMovingProducts: Array<{ name: string; soldQty: number; currentStock: number }>;
  slowMovingProducts: Array<{ name: string; soldQty: number; currentStock: number; daysSinceLastSale: number }>;
  stockByCategory: Array<{ category: string; count: number; value: number }>;
  recentStockChanges: Array<{ product: string; change: number; type: 'in' | 'out' | 'adjustment'; date: string }>;
};

export default function InventoryAnalyticsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { currentBranch } = useBranch();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<InventoryStats | null>(null);

  useEffect(() => {
    if (token) {
      loadInventoryStats();
    }
  }, [token, currentBranch]);

  const loadInventoryStats = async () => {
    try {
      setLoading(true);
      const branchParam = currentBranch ? `?branchId=${currentBranch._id}` : '';
      const res = await fetch(`${config.apiUrl}/inventory/analytics${branchParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      
      if (res.ok) {
        setStats(data);
      } else {
        console.error('Failed to load inventory analytics:', res.status);
        setStats(null);
      }
    } catch (err) {
      console.error('Failed to load inventory stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container px-4 sm:px-6 py-6 sm:py-8 max-w-full overflow-x-hidden">
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
      <div className="container px-4 sm:px-6 py-6 sm:py-8 max-w-full overflow-x-hidden">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Inventory Analytics</h1>
            <p className="text-muted-foreground">Stock levels, movements, and insights</p>
          </div>
        </div>
        <Card className="p-12 text-center">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No Inventory Data</h2>
          <p className="text-muted-foreground mb-4">
            Add products to your inventory to see analytics here.
          </p>
          <Button onClick={() => router.push('/admin')}>Add Products</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container px-4 sm:px-6 py-6 sm:py-8 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Inventory Analytics</h1>
            <p className="text-muted-foreground">Stock levels, movements, and insights</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/admin')}>
            Manage Products
          </Button>
          <Button onClick={() => router.push('/stock/adjustments')}>
            Stock Adjustments
          </Button>
        </div>
      </div>

      {stats && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <Card>
              <CardContent className="p-3 sm:pt-6 sm:px-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Products</p>
                    <p className="text-xl sm:text-2xl font-bold">{stats.totalProducts}</p>
                    <p className="text-xs text-green-600">{stats.activeProducts} active</p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-full bg-blue-500/10 flex-shrink-0">
                    <Package className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={stats.lowStockProducts > 0 ? 'border-yellow-500/50' : ''}>
              <CardContent className="p-3 sm:pt-6 sm:px-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">Low Stock</p>
                    <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.lowStockProducts}</p>
                    <p className="text-xs text-red-600 truncate">{stats.outOfStockProducts} out of stock</p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-full bg-yellow-500/10 flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:pt-6 sm:px-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">Stock Value</p>
                    <p className="text-lg sm:text-2xl font-bold">Ksh {(stats.totalStockValue / 1000000).toFixed(2)}M</p>
                    <p className="text-xs text-muted-foreground truncate">{stats.totalStockUnits.toLocaleString()} units</p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-full bg-green-500/10 flex-shrink-0">
                    <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:pt-6 sm:px-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">Turnover Rate</p>
                    <p className="text-xl sm:text-2xl font-bold">{stats.turnoverRate}x</p>
                    <p className="text-xs text-muted-foreground">per month</p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-full bg-purple-500/10 flex-shrink-0">
                    <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts Section */}
          {stats.lowStockItems.length > 0 && (
            <Card className="mb-8 border-yellow-500/40 bg-yellow-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="h-5 w-5" />
                  Low Stock Alerts
                </CardTitle>
                <CardDescription>Products that need restocking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stats.lowStockItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-background rounded-lg border cursor-pointer hover:border-primary transition-colors"
                      onClick={() => router.push(`/inventory?search=${item.sku}`)}
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="destructive">{item.stock} left</Badge>
                        <p className="text-xs text-muted-foreground mt-1">Min: {item.threshold}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Stock by Category - Horizontal Bar Chart */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold">Stock by Category</CardTitle>
                <CardDescription className="text-xs">Distribution of inventory value</CardDescription>
              </CardHeader>
              <CardContent className="p-2 md:p-4 pt-0">
                {stats.stockByCategory.length === 0 ? (
                  <div className="h-56 flex items-center justify-center text-muted-foreground">
                    <p className="text-sm">No category data</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(stats.stockByCategory.length * 44, 160)}>
                    <BarChart data={stats.stockByCategory.map(c => ({ ...c, label: c.category.length > 14 ? c.category.slice(0, 12) + '...' : c.category }))} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={90} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                        formatter={((value: any) => [`Ksh ${(value ?? 0).toLocaleString()}`, 'Value']) as any}
                        labelFormatter={(label) => `${label}`}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
                        {stats.stockByCategory.map((_, idx) => (
                          <Cell key={idx} fill={['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#06b6d4'][idx % 6]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Recent Stock Changes */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Stock Changes</CardTitle>
                <CardDescription>Latest inventory movements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.recentStockChanges.map((change, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${change.type === 'in' ? 'bg-green-500/10' : change.type === 'out' ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
                          {change.type === 'in' ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : change.type === 'out' ? (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          ) : (
                            <RefreshCw className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{change.product}</p>
                          <p className="text-xs text-muted-foreground capitalize">{change.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${change.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {change.change > 0 ? '+' : ''}{change.change}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(change.date).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Movement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Moving Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Fast Moving Products
                </CardTitle>
                <CardDescription>Highest sales velocity this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.topMovingProducts.map((product, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 font-bold">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.soldQty} sold this month</p>
                        </div>
                      </div>
                      <Badge variant={product.currentStock < 20 ? 'destructive' : 'secondary'}>
                        {product.currentStock} in stock
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Slow Moving Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-orange-600" />
                  Slow Moving Products
                </CardTitle>
                <CardDescription>Consider promotions or clearance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.slowMovingProducts.map((product, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-500/10">
                          <Archive className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Only {product.soldQty} sold • {product.daysSinceLastSale} days since last sale
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">{product.currentStock} in stock</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
