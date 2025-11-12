'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge } from '@smartduka/ui';
import {
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  DollarSign,
  AlertCircle,
  Download,
  Share2,
  BarChart3,
  Calendar,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/use-toast';

type Branch = {
  _id: string;
  name: string;
  location: string;
  status: 'active' | 'inactive' | 'suspended';
};

type BranchPerformance = {
  branchId: string;
  branchName: string;
  location: string;
  period: string;
  sales: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    trend: number; // percentage change
  };
  inventory: {
    totalItems: number;
    lowStockItems: number;
    outOfStockItems: number;
    turnoverRate: number;
  };
  staff: {
    totalStaff: number;
    activeStaff: number;
    salesPerStaff: number;
  };
  performance: {
    score: number; // 0-100
    rating: 'excellent' | 'good' | 'fair' | 'poor';
    topProduct: string;
    topProductSales: number;
  };
};

export function BranchPerformanceReport() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [performance, setPerformance] = useState<BranchPerformance | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    loadBranches();
  }, [token]);

  useEffect(() => {
    if (selectedBranch) {
      loadPerformance();
    }
  }, [selectedBranch, dateRange]);

  const loadBranches = async () => {
    if (!token) return;
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/branches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const branchList = Array.isArray(data) ? data : data.data || [];
        setBranches(branchList);
        if (branchList.length > 0) {
          setSelectedBranch(branchList[0]._id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load branches:', err);
      toast({ type: 'error', title: 'Error', message: 'Failed to load branches' });
    }
  };

  const loadPerformance = async () => {
    if (!token || !selectedBranch) return;
    try {
      setLoading(true);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(
        `${base}/reports/branch/${selectedBranch}/performance?period=${dateRange}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setPerformance(data);
      } else {
        toast({ type: 'error', title: 'Error', message: 'Failed to load performance data' });
      }
    } catch (err: any) {
      console.error('Failed to load performance:', err);
      toast({ type: 'error', title: 'Error', message: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'excellent':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'good':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'fair':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'poor':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const getRatingEmoji = (rating: string) => {
    switch (rating) {
      case 'excellent':
        return '⭐⭐⭐⭐⭐';
      case 'good':
        return '⭐⭐⭐⭐';
      case 'fair':
        return '⭐⭐⭐';
      case 'poor':
        return '⭐⭐';
      default:
        return '⭐';
    }
  };

  const handleExportReport = async () => {
    if (!performance) return;
    try {
      const csv = generateReportCSV(performance);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `branch-report-${performance.branchName}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ type: 'success', title: 'Success', message: 'Report exported successfully' });
    } catch (err: any) {
      toast({ type: 'error', title: 'Error', message: 'Failed to export report' });
    }
  };

  const generateReportCSV = (perf: BranchPerformance) => {
    const headers = ['Metric', 'Value', 'Status'];
    const rows = [
      ['Branch', perf.branchName, ''],
      ['Period', perf.period, ''],
      ['', '', ''],
      ['SALES METRICS', '', ''],
      ['Total Revenue', `Ksh ${perf.sales.totalRevenue.toLocaleString()}`, ''],
      ['Total Orders', perf.sales.totalOrders.toString(), ''],
      ['Average Order Value', `Ksh ${perf.sales.averageOrderValue.toLocaleString()}`, ''],
      ['Sales Trend', `${perf.sales.trend > 0 ? '+' : ''}${perf.sales.trend}%`, perf.sales.trend > 0 ? 'Up' : 'Down'],
      ['', '', ''],
      ['INVENTORY METRICS', '', ''],
      ['Total Items', perf.inventory.totalItems.toString(), ''],
      ['Low Stock Items', perf.inventory.lowStockItems.toString(), perf.inventory.lowStockItems > 0 ? 'Alert' : 'OK'],
      ['Out of Stock', perf.inventory.outOfStockItems.toString(), perf.inventory.outOfStockItems > 0 ? 'Alert' : 'OK'],
      ['Turnover Rate', `${perf.inventory.turnoverRate}%`, ''],
      ['', '', ''],
      ['STAFF METRICS', '', ''],
      ['Total Staff', perf.staff.totalStaff.toString(), ''],
      ['Active Staff', perf.staff.activeStaff.toString(), ''],
      ['Sales per Staff', `Ksh ${perf.staff.salesPerStaff.toLocaleString()}`, ''],
      ['', '', ''],
      ['PERFORMANCE', '', ''],
      ['Performance Score', `${perf.performance.score}/100`, perf.performance.rating],
      ['Top Product', perf.performance.topProduct, ''],
      ['Top Product Sales', `Ksh ${perf.performance.topProductSales.toLocaleString()}`, ''],
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Branch Performance Report
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Analyze individual branch performance and metrics</p>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Branch Selector */}
            <div>
              <label className="text-sm font-medium mb-2 block">Select Branch</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                <option value="">Choose a branch...</option>
                {branches.map((branch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name} • {branch.location}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="text-sm font-medium mb-2 block">Time Period</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as 'today' | 'week' | 'month')}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2">
              <Button
                onClick={handleExportReport}
                disabled={!performance || loading}
                variant="outline"
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Performance Report */}
      {performance && !loading && (
        <>
          {/* Performance Score Card */}
          <Card className="border-blue-500/40 bg-blue-500/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{performance.branchName}</CardTitle>
                  <CardDescription>{performance.location}</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {performance.performance.score}
                  </div>
                  <p className="text-xs text-muted-foreground">Performance Score</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Badge className={getRatingColor(performance.performance.rating)}>
                    {getRatingEmoji(performance.performance.rating)} {performance.performance.rating.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{performance.period}</p>
              </div>
            </CardContent>
          </Card>

          {/* Sales Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">Ksh {performance.sales.totalRevenue.toLocaleString()}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {performance.sales.trend > 0 ? (
                        <>
                          <ArrowUpRight className="h-4 w-4 text-green-600" />
                          <span className="text-xs text-green-600">+{performance.sales.trend}%</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownRight className="h-4 w-4 text-red-600" />
                          <span className="text-xs text-red-600">{performance.sales.trend}%</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Orders */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{performance.sales.totalOrders}</p>
                    <p className="text-xs text-muted-foreground mt-2">Transactions</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Average Order Value */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Order Value</p>
                    <p className="text-2xl font-bold">Ksh {performance.sales.averageOrderValue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-2">Per transaction</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500/10">
                    <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inventory Status */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Inventory Status</p>
                    <p className="text-2xl font-bold">{performance.inventory.totalItems}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {performance.inventory.lowStockItems > 0 && (
                        <>
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-xs text-yellow-600">{performance.inventory.lowStockItems} low</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-500/10">
                    <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Inventory Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Inventory Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Items</span>
                  <span className="font-semibold">{performance.inventory.totalItems}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Low Stock Items</span>
                  <Badge variant={performance.inventory.lowStockItems > 0 ? 'destructive' : 'secondary'}>
                    {performance.inventory.lowStockItems}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Out of Stock</span>
                  <Badge variant={performance.inventory.outOfStockItems > 0 ? 'destructive' : 'secondary'}>
                    {performance.inventory.outOfStockItems}
                  </Badge>
                </div>
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="text-sm text-muted-foreground">Turnover Rate</span>
                  <span className="font-semibold text-green-600">{performance.inventory.turnoverRate}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Staff Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Staff Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Staff</span>
                  <span className="font-semibold">{performance.staff.totalStaff}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Staff</span>
                  <Badge variant="secondary">{performance.staff.activeStaff}</Badge>
                </div>
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="text-sm text-muted-foreground">Sales per Staff</span>
                  <span className="font-semibold">Ksh {performance.staff.salesPerStaff.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Product */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Performing Product</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{performance.performance.topProduct}</p>
                  <p className="text-sm text-muted-foreground">Highest revenue generator</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">Ksh {performance.performance.topProductSales.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Sales</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!selectedBranch && !loading && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">Select a branch to view performance report</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
