'use client';

import { config } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SalesData {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  totalItems: number;
  topProducts: Array<{ productId: string; name: string; quantity: number; revenue: number }>;
}

export default function SalesAnalyticsPage() {
  const { token } = useAuth();
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSalesData();
  }, [dateRange]);

  const fetchSalesData = async () => {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`${config.apiUrl}/sales/daily-sales/${today}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      
      if (res.ok) {
        setSalesData(data);
      } else {
        setError('Failed to fetch sales data');
      }
    } catch (error) {
      console.error('Failed to fetch sales data:', error);
      setError('Failed to fetch sales data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (!salesData) return;

    const csv = [
      ['Sales Analytics Report'],
      ['Date Range', `${dateRange.start} to ${dateRange.end}`],
      [],
      ['SUMMARY'],
      ['Total Revenue', salesData.totalRevenue],
      ['Total Orders', salesData.totalOrders],
      ['Completed Orders', salesData.completedOrders],
      ['Total Items', salesData.totalItems],
      [],
      ['TOP PRODUCTS'],
      ['Product Name', 'Quantity', 'Revenue'],
      ...salesData.topProducts.map((p) => [p.name, p.quantity, p.revenue]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-analytics-${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Analytics</h1>
          <p className="text-muted-foreground mt-2">View sales performance and trends</p>
        </div>
        <Button onClick={handleExport} disabled={!salesData} className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading sales data...</div>
        </div>
      ) : salesData ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('en-KE', {
                    style: 'currency',
                    currency: 'KES',
                    maximumFractionDigits: 0,
                  }).format(salesData.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">Total sales revenue</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{salesData.totalOrders}</div>
                <p className="text-xs text-muted-foreground">Orders processed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{salesData.completedOrders}</div>
                <p className="text-xs text-muted-foreground">Successfully completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{salesData.totalItems}</div>
                <p className="text-xs text-muted-foreground">Items sold</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Products */}
          {salesData.topProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>Best performing products by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {salesData.topProducts.map((product, index) => (
                    <div key={product.productId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-muted-foreground">#{index + 1}</span>
                          <h4 className="font-medium">{product.name}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">Quantity: {product.quantity}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {new Intl.NumberFormat('en-KE', {
                            style: 'currency',
                            currency: 'KES',
                          }).format(product.revenue)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
