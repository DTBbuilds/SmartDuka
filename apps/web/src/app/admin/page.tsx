'use client';

import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@smartduka/ui';
import { 
  Users, 
  Activity, 
  Package, 
  BarChart3, 
  TrendingUp, 
  ShoppingCart, 
  CreditCard, 
  AlertTriangle, 
  ArrowUpRight, 
  Boxes, 
  Smartphone, 
  Settings, 
  MapPin, 
  Grid3x3,
  Home,
  ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useBranch } from '@/lib/branch-context';
import { useToast } from '@/lib/use-toast';
import { config } from '@/lib/config';
import { ToastContainer } from '@/components/toast-container';
import { AuthGuard } from '@/components/auth-guard';

type Product = {
  _id: string;
  name: string;
  stock?: number;
};

function AdminDashboardContent() {
  const router = useRouter();
  const { user, shop, token } = useAuth();
  const { currentBranch } = useBranch();
  const { toasts, toast, dismiss } = useToast();

  const [loading, setLoading] = useState(false);
  const [productsCount, setProductsCount] = useState(0);
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [salesStats, setSalesStats] = useState<{
    todayRevenue: number;
    todayOrders: number;
    totalRevenue: number;
    totalOrders: number;
  } | null>(null);
  const [mpesaStatus, setMpesaStatus] = useState<{
    isConfigured: boolean;
    isVerified: boolean;
    isEnabled: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [token, currentBranch]);

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const base = config.apiUrl;
      const headers = { Authorization: `Bearer ${token}` };
      
      const branchParam = currentBranch ? `branchId=${currentBranch._id}` : '';

      const [productsRes, categoriesRes, lowStockRes, salesStatsRes, mpesaStatusRes] = await Promise.all([
        fetch(`${base}/inventory/products?limit=200`, { headers }),
        fetch(`${base}/inventory/categories`, { headers }),
        fetch(`${base}/inventory/stock/low-stock${branchParam ? `?${branchParam}` : ''}`, { headers }),
        fetch(`${base}/sales/stats${branchParam ? `?${branchParam}` : ''}`, { headers }),
        fetch(`${base}/payments/mpesa/config/status`, { headers }),
      ]);

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProductsCount(Array.isArray(data) ? data.length : 0);
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategoriesCount(Array.isArray(data) ? data.length : 0);
      }

      if (lowStockRes.ok) {
        const data = await lowStockRes.json();
        setLowStockProducts(Array.isArray(data) ? data : []);
      }

      if (salesStatsRes.ok) {
        const data = await salesStatsRes.json();
        setSalesStats(data);
      }

      if (mpesaStatusRes.ok) {
        const data = await mpesaStatusRes.json();
        setMpesaStatus(data);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      toast({ type: 'error', title: 'Load failed', message: err?.message });
    } finally {
      setLoading(false);
    }
  };

  // Quick links for navigation
  const quickLinks = [
    { name: 'Products', href: '/admin/products', icon: Package, description: 'Manage inventory' },
    { name: 'Categories', href: '/admin/categories', icon: Boxes, description: 'Organize products' },
    { name: 'Cashiers', href: '/admin/cashiers', icon: Users, description: 'Manage staff' },
    { name: 'Monitoring', href: '/admin/monitoring', icon: Activity, description: 'Track activity' },
    { name: 'Branches', href: '/admin/branches', icon: MapPin, description: 'Multi-location' },
    { name: 'Analytics', href: '/admin/analytics/sales', icon: BarChart3, description: 'View reports' },
  ];

  return (
    <main className="bg-background py-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="container">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Home className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {user?.email?.split('@')[0] || 'Admin'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/pos')} className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Open POS
            </Button>
            <Button onClick={() => router.push('/admin/products')} className="gap-2">
              <Package className="h-4 w-4" />
              Manage Products
            </Button>
          </div>
        </div>

        {/* M-Pesa Configuration Alert */}
        {mpesaStatus && !mpesaStatus.isConfigured && (
          <Card className="mb-6 border-orange-500/40 bg-orange-500/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/20">
                    <Smartphone className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-orange-700 dark:text-orange-400 text-lg">
                      M-Pesa Setup Required
                    </CardTitle>
                    <CardDescription className="text-orange-600/80">
                      Configure your Paybill/Till number to accept mobile payments
                    </CardDescription>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-orange-500/40 text-orange-700 hover:bg-orange-500/10"
                  onClick={() => router.push('/settings?tab=mpesa')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Now
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <Card className="mb-6 border-yellow-500/40 bg-yellow-500/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/20">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <CardTitle className="text-yellow-700 dark:text-yellow-400 text-lg">
                      Low Stock Alert
                    </CardTitle>
                    <CardDescription className="text-yellow-600/80">
                      {lowStockProducts.length} product(s) below threshold
                    </CardDescription>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-yellow-500/40 text-yellow-700 hover:bg-yellow-500/10"
                  onClick={() => router.push('/admin/products')}
                >
                  View Products
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <Badge key={product._id} variant="secondary" className="text-yellow-700 bg-yellow-500/20">
                    {product.name}: {product.stock ?? 0} left
                  </Badge>
                ))}
                {lowStockProducts.length > 5 && (
                  <Badge variant="secondary" className="text-yellow-700 bg-yellow-500/20">
                    +{lowStockProducts.length - 5} more
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Today's Sales */}
          <Card 
            className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 cursor-pointer hover:shadow-lg hover:border-green-500/40 transition-all group"
            onClick={() => router.push('/admin/analytics/sales')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-green-700 dark:text-green-400">
                      Ksh {(salesStats?.todayRevenue || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Today's Sales</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </CardContent>
          </Card>

          {/* Today's Orders */}
          <Card 
            className="cursor-pointer hover:shadow-lg hover:border-blue-500/40 transition-all group"
            onClick={() => router.push('/admin/analytics/orders')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{salesStats?.todayOrders || 0}</p>
                    <p className="text-xs text-muted-foreground">Today's Orders</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </CardContent>
          </Card>

          {/* Products Count */}
          <Card 
            className="cursor-pointer hover:shadow-lg hover:border-purple-500/40 transition-all group"
            onClick={() => router.push('/admin/products')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Package className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{productsCount}</p>
                    <p className="text-xs text-muted-foreground">Products</p>
                    {lowStockProducts.length > 0 && (
                      <p className="text-xs text-yellow-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {lowStockProducts.length} low stock
                      </p>
                    )}
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card 
            className="cursor-pointer hover:shadow-lg hover:border-orange-500/40 transition-all group"
            onClick={() => router.push('/admin/analytics/payments')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <CreditCard className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">
                      Ksh {(salesStats?.totalRevenue || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Card 
                  key={link.href}
                  className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group"
                  onClick={() => router.push(link.href)}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <div className="p-3 rounded-lg bg-primary/10 w-fit mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-medium text-sm">{link.name}</p>
                    <p className="text-xs text-muted-foreground">{link.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Quick Report Links */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Reports & Analytics</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/analytics/sales')} className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Sales Report
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/analytics/orders')} className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Order History
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/analytics/inventory')} className="gap-2">
              <Package className="h-4 w-4" />
              Stock Report
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/analytics/payments')} className="gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Report
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/reports')} className="gap-2">
              <TrendingUp className="h-4 w-4" />
              All Reports
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inventory Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Inventory Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Products</span>
                  <span className="font-semibold">{productsCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Categories</span>
                  <span className="font-semibold">{categoriesCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Low Stock Items</span>
                  <Badge variant={lowStockProducts.length > 0 ? 'destructive' : 'secondary'}>
                    {lowStockProducts.length}
                  </Badge>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => router.push('/admin/products')}
                >
                  Manage Products
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sales Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Sales Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Today's Revenue</span>
                  <span className="font-semibold text-green-600">
                    Ksh {(salesStats?.todayRevenue || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Today's Orders</span>
                  <span className="font-semibold">{salesStats?.todayOrders || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Revenue</span>
                  <span className="font-semibold">
                    Ksh {(salesStats?.totalRevenue || 0).toLocaleString()}
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => router.push('/admin/analytics/sales')}
                >
                  View Analytics
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard requiredRole="admin">
      <AdminDashboardContent />
    </AuthGuard>
  );
}
