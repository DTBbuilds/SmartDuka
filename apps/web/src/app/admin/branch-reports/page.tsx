'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Branch {
  _id: string;
  name: string;
  code: string;
}

interface ReportData {
  sales: {
    totalRevenue: number;
    totalOrders: number;
    completedOrders: number;
    totalItems: number;
  };
  inventory: {
    totalProducts: number;
    activeProducts: number;
    lowStockProducts: number;
    totalStockValue: number;
  };
  purchases: {
    totalPurchases: number;
    pendingPurchases: number;
    receivedPurchases: number;
    totalSpent: number;
  };
}

export default function BranchReportsPage() {
  const { token } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchReportData();
    }
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const res = await fetch(`${apiUrl}/branches`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setBranches(Array.isArray(data) ? data : []);
        if (data.length > 0) {
          setSelectedBranch(data[0]._id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      setError('Failed to fetch branches');
    }
  };

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const [salesRes, inventoryRes, purchasesRes] = await Promise.all([
        fetch(`${apiUrl}/sales/branch/${selectedBranch}/daily-sales/${today}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/inventory/branch/${selectedBranch}/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/purchases/branch/${selectedBranch}/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const sales = (await salesRes.json()).catch(() => ({}));
      const inventory = (await inventoryRes.json()).catch(() => ({}));
      const purchases = (await purchasesRes.json()).catch(() => ({}));

      setReportData({
        sales: sales || {},
        inventory: inventory || {},
        purchases: purchases || {},
      });
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      setError('Failed to fetch report data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (!reportData) return;

    const csv = [
      ['Branch Reports'],
      ['Date', new Date().toLocaleDateString()],
      [],
      ['SALES'],
      ['Total Revenue', reportData.sales.totalRevenue || 0],
      ['Total Orders', reportData.sales.totalOrders || 0],
      ['Completed Orders', reportData.sales.completedOrders || 0],
      ['Total Items', reportData.sales.totalItems || 0],
      [],
      ['INVENTORY'],
      ['Total Products', reportData.inventory.totalProducts || 0],
      ['Active Products', reportData.inventory.activeProducts || 0],
      ['Low Stock Products', reportData.inventory.lowStockProducts || 0],
      ['Total Stock Value', reportData.inventory.totalStockValue || 0],
      [],
      ['PURCHASES'],
      ['Total Purchases', reportData.purchases.totalPurchases || 0],
      ['Pending Purchases', reportData.purchases.pendingPurchases || 0],
      ['Received Purchases', reportData.purchases.receivedPurchases || 0],
      ['Total Spent', reportData.purchases.totalSpent || 0],
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `branch-report-${new Date().toISOString()}.csv`;
    a.click();
  };

  const selectedBranchName = branches.find((b) => b._id === selectedBranch)?.name || 'Select Branch';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Branch Reports</h1>
          <p className="text-muted-foreground mt-2">View comprehensive branch performance reports</p>
        </div>
        <Button onClick={handleExport} disabled={!reportData} className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Branch Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Branch</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="Select a branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch._id} value={branch._id}>
                  {branch.name} ({branch.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Reports */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading report data...</div>
        </div>
      ) : reportData ? (
        <>
          {/* Sales Report */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Sales Report
              </CardTitle>
              <CardDescription>Today's sales performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Revenue</div>
                  <div className="text-2xl font-bold mt-2">
                    {new Intl.NumberFormat('en-KE', {
                      style: 'currency',
                      currency: 'KES',
                      maximumFractionDigits: 0,
                    }).format(reportData.sales.totalRevenue || 0)}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Orders</div>
                  <div className="text-2xl font-bold mt-2">{reportData.sales.totalOrders || 0}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Completed Orders</div>
                  <div className="text-2xl font-bold mt-2">{reportData.sales.completedOrders || 0}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Items</div>
                  <div className="text-2xl font-bold mt-2">{reportData.sales.totalItems || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Report */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Report</CardTitle>
              <CardDescription>Current inventory status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Products</div>
                  <div className="text-2xl font-bold mt-2">{reportData.inventory.totalProducts || 0}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Active Products</div>
                  <div className="text-2xl font-bold mt-2">{reportData.inventory.activeProducts || 0}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Low Stock Products</div>
                  <div className="text-2xl font-bold text-orange-600 mt-2">
                    {reportData.inventory.lowStockProducts || 0}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Stock Value</div>
                  <div className="text-2xl font-bold mt-2">
                    {new Intl.NumberFormat('en-KE', {
                      style: 'currency',
                      currency: 'KES',
                      maximumFractionDigits: 0,
                    }).format(reportData.inventory.totalStockValue || 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchases Report */}
          <Card>
            <CardHeader>
              <CardTitle>Purchases Report</CardTitle>
              <CardDescription>Purchase order status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Purchases</div>
                  <div className="text-2xl font-bold mt-2">{reportData.purchases.totalPurchases || 0}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Pending Purchases</div>
                  <div className="text-2xl font-bold text-blue-600 mt-2">
                    {reportData.purchases.pendingPurchases || 0}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Received Purchases</div>
                  <div className="text-2xl font-bold text-green-600 mt-2">
                    {reportData.purchases.receivedPurchases || 0}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Spent</div>
                  <div className="text-2xl font-bold mt-2">
                    {new Intl.NumberFormat('en-KE', {
                      style: 'currency',
                      currency: 'KES',
                      maximumFractionDigits: 0,
                    }).format(reportData.purchases.totalSpent || 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
