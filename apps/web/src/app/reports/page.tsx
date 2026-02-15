'use client';

import { config } from '@/lib/config';
import { useEffect, useState } from 'react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@smartduka/ui';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/use-toast';
import { ToastContainer } from '@/components/toast-container';
import { AuthGuard } from '@/components/auth-guard';
import { TrendingUp, DollarSign, ShoppingCart, Package } from 'lucide-react';

type DailySales = {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  totalItems: number;
  topProducts: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
};

const formatCurrency = (value: number) =>
  `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

function ReportsContent() {
  const { user, shop, token } = useAuth();
  const { toasts, toast, dismiss } = useToast();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [sales, setSales] = useState<DailySales | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSalesData();
  }, [token, date]);

  const loadSalesData = async () => {
    if (!token || !date) return;
    try {
      setLoading(true);
      const res = await fetch(`${config.apiUrl}/sales/daily-sales/${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setSales(data);
    } catch (err: any) {
      toast({ type: 'error', title: 'Load failed', message: err?.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-background py-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="container">
        <div className="mb-6 flex items-center justify-between">
          <div>
            {shop && (
              <p className="text-xs font-medium text-primary mb-2">
                {shop.name} • Sales Analytics
              </p>
            )}
            <h1 className="text-3xl font-bold">Sales Reports</h1>
            <p className="text-muted-foreground">Daily sales analytics and insights for your shop</p>
          </div>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40"
          />
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        ) : sales ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{formatCurrency(sales.totalRevenue)}</div>
                    <DollarSign className="h-8 w-8 text-green-600 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{sales.totalOrders}</div>
                    <ShoppingCart className="h-8 w-8 text-blue-600 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Items Sold
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">{sales.totalItems}</div>
                    <Package className="h-8 w-8 text-purple-600 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg Order
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold">
                      {formatCurrency(
                        sales.totalOrders > 0 ? sales.totalRevenue / sales.totalOrders : 0
                      )}
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-600 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>Best-selling items by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                {sales.topProducts.length === 0 ? (
                  <p className="text-muted-foreground">No sales data for this date.</p>
                ) : (
                  <div className="space-y-3">
                    {sales.topProducts.map((product, idx) => (
                      <div key={product.productId} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">#{idx + 1}</Badge>
                            <span className="font-medium">{product.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {product.quantity} units sold
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(product.revenue)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(product.revenue / product.quantity)} each
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">No data available.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

export default function ReportsPage() {
  return (
    <AuthGuard requiredRole="admin">
      <ReportsContent />
    </AuthGuard>
  );
}
