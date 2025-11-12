'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingUp, Package, Users, ShoppingCart, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DashboardData {
  branch: {
    name: string;
    code: string;
    address?: string;
    phone?: string;
  };
  sales: {
    totalRevenue: number;
    totalOrders: number;
    completedOrders: number;
  };
  inventory: {
    totalProducts: number;
    activeProducts: number;
    lowStockProducts: number;
    totalStockValue: number;
  };
  purchases: {
    pendingPurchases: number;
    receivedPurchases: number;
  };
  staff: Array<{ _id: string; name: string; role: string }>;
}

export default function BranchManagerDashboard() {
  const { token, user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      // Get branchId from localStorage or user context
      const branchId = localStorage.getItem('smartduka:branchId') || user?.sub;
      if (!branchId) {
        setError('No branch assigned');
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      const [branchRes, salesRes, inventoryRes, purchasesRes, staffRes] = await Promise.all([
        fetch(`${apiUrl}/branches/${branchId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/sales/branch/${branchId}/daily-sales/${today}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/inventory/branch/${branchId}/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/purchases/branch/${branchId}/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/staff-assignment/branch/${branchId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const branch = await branchRes.json();
      const sales = await salesRes.json();
      const inventory = await inventoryRes.json();
      const purchases = await purchasesRes.json();
      const staff = await staffRes.json();

      setDashboardData({
        branch,
        sales: sales || {},
        inventory: inventory || {},
        purchases: purchases || {},
        staff: Array.isArray(staff) ? staff : [],
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Branch Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          {dashboardData?.branch.name} • {dashboardData?.branch.code}
        </p>
      </div>

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
          <div className="text-muted-foreground">Loading dashboard...</div>
        </div>
      ) : dashboardData ? (
        <>
          {/* Today's Sales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Today's Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="text-sm text-muted-foreground">Total Revenue</div>
                  <div className="text-2xl font-bold mt-2">
                    {new Intl.NumberFormat('en-KE', {
                      style: 'currency',
                      currency: 'KES',
                      maximumFractionDigits: 0,
                    }).format(dashboardData.sales.totalRevenue || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Orders</div>
                  <div className="text-2xl font-bold mt-2">{dashboardData.sales.totalOrders || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                  <div className="text-2xl font-bold mt-2">{dashboardData.sales.completedOrders || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventory Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Products</div>
                  <div className="text-2xl font-bold mt-2">{dashboardData.inventory.totalProducts || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Active</div>
                  <div className="text-2xl font-bold mt-2">{dashboardData.inventory.activeProducts || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Low Stock</div>
                  <div className="text-2xl font-bold text-orange-600 mt-2">
                    {dashboardData.inventory.lowStockProducts || 0}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Stock Value</div>
                  <div className="text-2xl font-bold mt-2">
                    {new Intl.NumberFormat('en-KE', {
                      style: 'currency',
                      currency: 'KES',
                      maximumFractionDigits: 0,
                    }).format(dashboardData.inventory.totalStockValue || 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchase Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Purchase Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Pending</div>
                  <div className="text-2xl font-bold text-blue-600 mt-2">
                    {dashboardData.purchases.pendingPurchases || 0}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Received</div>
                  <div className="text-2xl font-bold text-green-600 mt-2">
                    {dashboardData.purchases.receivedPurchases || 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Staff On Duty */}
          {dashboardData.staff.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Staff Members
                </CardTitle>
                <CardDescription>{dashboardData.staff.length} staff assigned</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboardData.staff.map((member) => (
                    <div key={member._id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Low Stock Alert */}
          {(dashboardData.inventory.lowStockProducts || 0) > 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                {dashboardData.inventory.lowStockProducts} products have low stock levels. Please reorder soon.
              </AlertDescription>
            </Alert>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button>View Inventory</Button>
            <Button variant="outline">View Sales</Button>
            <Button variant="outline">View Orders</Button>
            <Button variant="outline">View Staff</Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
