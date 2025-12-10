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
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@smartduka/ui';
import { Plus, Trash2, Edit2, Download, Upload, Users, Activity, ChevronDown, ChevronUp, Package, Zap, BarChart3, Copy, Archive, Eye, Search, Filter, MapPin, TrendingUp, ShoppingCart, CreditCard, AlertTriangle, ArrowUpRight, Boxes, Smartphone, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useBranch } from '@/lib/branch-context';
import { useToast } from '@/lib/use-toast';
import { config } from '@/lib/config';
import { ToastContainer } from '@/components/toast-container';
import { CSVImportModal } from '@/components/csv-import-modal';
import { CategoryManagement } from '@/components/category-management';
import { CategoryImportExport } from '@/components/category-import-export';
import { generateProductsCSV, downloadCSV } from '@/lib/csv-parser';
import { AuthGuard } from '@/components/auth-guard';
import { AdminNavigation } from '@/components/admin-navigation';
import { AdminHeader } from '@/components/admin-header';
import { QuickAddProductForm } from '@/components/quick-add-product-form';
import { BranchesShortcuts } from '@/components/branches-shortcuts';

type Product = {
  _id: string;
  name: string;
  sku?: string;
  price: number;
  cost?: number;
  stock?: number;
  status: 'active' | 'inactive';
  lowStockThreshold?: number;
};

type Category = {
  _id: string;
  name: string;
  slug: string;
};

function AdminContent() {
  const router = useRouter();
  const { user, shop, token } = useAuth();
  const { currentBranch } = useBranch();
  const { toasts, toast, dismiss } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const [newProduct, setNewProduct] = useState({ name: '', sku: '', price: 0, stock: 0 });
  const [newCategory, setNewCategory] = useState({ name: '', slug: '' });
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
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);
  const [isCategoryImportExportOpen, setIsCategoryImportExportOpen] = useState(false);
  const [isQuickAddExpanded, setIsQuickAddExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [token, currentBranch]);

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const base = config.apiUrl;
      const headers = { Authorization: `Bearer ${token}` };
      
      // Build branch query parameter for branch-level data isolation
      const branchParam = currentBranch ? `branchId=${currentBranch._id}` : '';
      const branchQuery = branchParam ? `&${branchParam}` : '';

      const [productsRes, categoriesRes, lowStockRes, salesStatsRes, mpesaStatusRes] = await Promise.all([
        fetch(`${base}/inventory/products?limit=200${branchQuery}`, { headers }),
        fetch(`${base}/inventory/categories`, { headers }),
        fetch(`${base}/inventory/stock/low-stock${branchParam ? `?${branchParam}` : ''}`, { headers }),
        fetch(`${base}/sales/stats${branchParam ? `?${branchParam}` : ''}`, { headers }),
        fetch(`${base}/payments/mpesa/config/status`, { headers }),
      ]);

      // Handle products
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(Array.isArray(data) ? data : []);
      } else if (productsRes.status === 401) {
        console.error('Unauthorized - token may be invalid');
        toast({ type: 'error', title: 'Unauthorized', message: 'Please login again' });
      } else if (productsRes.status === 403) {
        console.error('Forbidden - insufficient permissions');
        toast({ type: 'error', title: 'Forbidden', message: 'You do not have permission to view products' });
      } else {
        console.error('Failed to load products:', productsRes.status);
        setProducts([]);
      }

      // Handle categories
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to load categories:', categoriesRes.status);
        setCategories([]);
      }

      // Handle low stock
      if (lowStockRes.ok) {
        const data = await lowStockRes.json();
        setLowStockProducts(Array.isArray(data) ? data : []);
      } else if (lowStockRes.status === 403) {
        // Low stock is admin-only, this is expected for non-admins
        setLowStockProducts([]);
      } else {
        console.error('Failed to load low stock:', lowStockRes.status);
        setLowStockProducts([]);
      }

      // Handle sales stats
      if (salesStatsRes.ok) {
        const data = await salesStatsRes.json();
        setSalesStats(data);
      } else {
        console.error('Failed to load sales stats:', salesStatsRes.status);
        setSalesStats(null);
      }

      // Handle M-Pesa status
      if (mpesaStatusRes.ok) {
        const data = await mpesaStatusRes.json();
        setMpesaStatus(data);
      } else {
        console.error('Failed to load M-Pesa status:', mpesaStatusRes.status);
        setMpesaStatus(null);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      toast({ type: 'error', title: 'Load failed', message: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || newProduct.price <= 0 || !token) return;
    try {
      const base = config.apiUrl;
      const res = await fetch(`${base}/inventory/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...newProduct, status: 'active' }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      toast({ type: 'success', title: 'Product created' });
      setNewProduct({ name: '', sku: '', price: 0, stock: 0 });
      loadData();
    } catch (err: any) {
      toast({ type: 'error', title: 'Create failed', message: err?.message });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!token) return;
    try {
      const base = config.apiUrl;
      const res = await fetch(`${base}/inventory/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      toast({ type: 'success', title: 'Product deleted' });
      loadData();
    } catch (err: any) {
      toast({ type: 'error', title: 'Delete failed', message: err?.message });
    }
  };

  const handleCSVImport = async (importedProducts: any[], options?: {
    autoCreateCategories?: boolean;
    autoSuggestCategories?: boolean;
    updateExisting?: boolean;
    skipDuplicates?: boolean;
  }) => {
    if (!token) return;
    try {
      const base = config.apiUrl;
      const res = await fetch(`${base}/inventory/products/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ products: importedProducts, options }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const result = await res.json();
      
      // Build detailed message
      let message = `Imported ${result.imported} products`;
      if (result.updated > 0) message += `, updated ${result.updated}`;
      if (result.skipped > 0) message += `, skipped ${result.skipped} duplicates`;
      if (result.categoriesCreated?.length > 0) {
        message += `. Created ${result.categoriesCreated.length} categories`;
      }
      if (result.errors?.length > 0) message += `. ${result.errors.length} errors`;
      
      toast({
        type: 'success',
        title: 'Import complete',
        message,
      });
      loadData();
      
      // Return result for the modal to display
      return result;
    } catch (err: any) {
      toast({ type: 'error', title: 'Import failed', message: err?.message });
      throw err;
    }
  };

  const handleCSVExport = async () => {
    try {
      const base = config.apiUrl;
      const res = await fetch(`${base}/inventory/products/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const csv = await res.text();
      downloadCSV(csv, `products-${new Date().toISOString().split('T')[0]}.csv`);
      toast({ type: 'success', title: 'Export complete' });
    } catch (err: any) {
      toast({ type: 'error', title: 'Export failed', message: err?.message });
    }
  };

  // Filter and search products
  const filteredProducts = products.filter((product) => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Bulk actions
  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p._id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) return;
    if (!confirm(`Delete ${selectedProducts.size} product(s)? This cannot be undone.`)) return;
    
    try {
      const base = config.apiUrl;
      for (const productId of selectedProducts) {
        await fetch(`${base}/inventory/products/${productId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      toast({ type: 'success', title: 'Products deleted', message: `${selectedProducts.size} product(s) deleted` });
      setSelectedProducts(new Set());
      loadData();
    } catch (err: any) {
      toast({ type: 'error', title: 'Delete failed', message: err?.message });
    }
  };

  return (
    <main className="bg-background py-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="container">
        {/* Admin Navigation */}
        <AdminNavigation activeTab="products" />

        {/* Header */}
        <AdminHeader
          title="Admin Dashboard"
          subtitle="Manage your inventory and operations"
          icon={<Package className="h-6 w-6 text-primary" />}
          showSearch={true}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          actions={
            <Button onClick={() => setIsQuickAddExpanded(!isQuickAddExpanded)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          }
        />

        {/* M-Pesa Configuration Alert */}
        {mpesaStatus && !mpesaStatus.isConfigured && (
          <Card className="mb-6 border-orange-500/40 bg-orange-500/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
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
            <CardContent className="pt-0">
              <p className="text-sm text-orange-700/80 dark:text-orange-300/80">
                Each shop must configure their own M-Pesa credentials. Payments cannot be processed until your Paybill/Till number is set up and verified.
              </p>
            </CardContent>
          </Card>
        )}

        {/* M-Pesa Verification Pending Alert */}
        {mpesaStatus && mpesaStatus.isConfigured && !mpesaStatus.isVerified && (
          <Card className="mb-6 border-blue-500/40 bg-blue-500/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Smartphone className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-blue-700 dark:text-blue-400 text-lg">
                      M-Pesa Verification Pending
                    </CardTitle>
                    <CardDescription className="text-blue-600/80">
                      Your credentials need to be verified before accepting payments
                    </CardDescription>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-blue-500/40 text-blue-700 hover:bg-blue-500/10"
                  onClick={() => router.push('/settings?tab=mpesa')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Verify Now
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <Card className="mb-6 border-yellow-500/40 bg-yellow-500/10">
            <CardHeader>
              <CardTitle className="text-yellow-700 dark:text-yellow-400">
                ⚠️ Low Stock Alert
              </CardTitle>
              <CardDescription>{lowStockProducts.length} product(s) below threshold</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockProducts.map((product) => (
                  <div key={product._id} className="flex justify-between text-sm">
                    <span>{product.name}</span>
                    <Badge variant="destructive">Stock: {product.stock ?? 0}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analytics Dashboard Cards - All Clickable */}
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Today's Sales - Links to Sales Analytics */}
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

          {/* Today's Orders - Links to Orders Analytics */}
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

          {/* Inventory Value - Links to Inventory Analytics */}
          <Card 
            className="cursor-pointer hover:shadow-lg hover:border-purple-500/40 transition-all group"
            onClick={() => router.push('/admin/analytics/inventory')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Boxes className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{products.length}</p>
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

          {/* Payments - Links to Payments Analytics */}
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

        {/* Quick Analytics Links */}
        <div className="mb-6 flex flex-wrap gap-2">
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

        {/* Quick Actions Section */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Quick Add Product Button */}
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setIsQuickAddExpanded(!isQuickAddExpanded)}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Quick Add</p>
                    <p className="text-xs text-muted-foreground">Add product</p>
                  </div>
                  {isQuickAddExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Products Count */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{products.length}</p>
                    <p className="text-xs text-muted-foreground">Products</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Categories Count */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{categories.length}</p>
                    <p className="text-xs text-muted-foreground">Categories</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Operations */}
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setIsCSVImportOpen(true)}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Bulk Ops</p>
                    <p className="text-xs text-muted-foreground">Import/Export</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Expandable Quick Add Product Section */}
        {isQuickAddExpanded && (
          <Card className="mb-8 border-blue-500/40 bg-blue-500/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Quick Add Product</CardTitle>
                  <CardDescription>Add a new product to your inventory</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsQuickAddExpanded(false)}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <QuickAddProductForm
                categories={categories}
                onSubmit={async (product: any) => {
                  if (!token) return;
                  try {
                    const base = config.apiUrl;
                    const res = await fetch(`${base}/inventory/products`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ ...product, status: 'active' }),
                    });
                    if (!res.ok) throw new Error(`Failed (${res.status})`);
                    toast({ type: 'success', title: 'Product created', message: `${product.name} added successfully` });
                    loadData();
                    setIsQuickAddExpanded(false);
                  } catch (err: any) {
                    throw new Error(err?.message || 'Failed to create product');
                  }
                }}
                isLoading={loading}
              />
            </CardContent>
          </Card>
        )}

        {/* Admin Navigation */}
        <AdminNavigation activeTab="products" />

        <Tabs defaultValue="products" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 hidden">
            {/* Hidden tabs for state management - actual navigation handled by AdminNavigation */}
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="cashiers">Cashiers</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="branches">Branches</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            {/* Bulk Operations Card */}
            <Card>
              <CardHeader>
                <CardTitle>Bulk Operations</CardTitle>
                <CardDescription>Import, update, or manage multiple products at once</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="justify-start gap-2"
                    onClick={() => setIsCSVImportOpen(true)}
                  >
                    <Upload className="h-4 w-4" />
                    Import Products (CSV)
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start gap-2"
                    onClick={handleCSVExport}
                  >
                    <Download className="h-4 w-4" />
                    Export Products (CSV)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Unified Products List Card - Following Industry Best Practices */}
            <Card>
              <CardHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Products List</CardTitle>
                      <CardDescription>{filteredProducts.length} of {products.length} product(s)</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsCSVImportOpen(true)}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Import
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCSVExport}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>

                  {/* Search and Filter Bar */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                      className="px-3 py-2 border rounded-md text-sm bg-background"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  {/* Bulk Actions Bar */}
                  {selectedProducts.size > 0 && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <span className="text-sm font-medium">{selectedProducts.size} product(s) selected</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedProducts(new Set())}
                        >
                          Clear
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleBulkDelete}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Selected
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground text-center py-8">Loading products...</p>
                ) : filteredProducts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {products.length === 0 ? 'No products yet. Add one using Quick Add!' : 'No products match your search.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {/* Table Header */}
                    <div className="hidden md:grid grid-cols-12 gap-3 px-3 py-2 bg-muted rounded-lg text-xs font-semibold text-muted-foreground">
                      <div className="col-span-1 flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                          onChange={handleSelectAll}
                          className="rounded"
                        />
                      </div>
                      <div className="col-span-4">Product</div>
                      <div className="col-span-2">Price</div>
                      <div className="col-span-2">Stock</div>
                      <div className="col-span-1">Status</div>
                      <div className="col-span-2">Actions</div>
                    </div>

                    {/* Product Rows */}
                    {filteredProducts.map((product) => (
                      <div
                        key={product._id}
                        className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-3 p-3 border rounded-lg hover:bg-accent transition-colors items-center"
                      >
                        {/* Checkbox */}
                        <div className="col-span-1 flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product._id)}
                            onChange={() => handleSelectProduct(product._id)}
                            className="rounded"
                          />
                        </div>

                        {/* Product Info */}
                        <div className="col-span-1 md:col-span-4">
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">SKU: {product.sku || 'N/A'}</p>
                        </div>

                        {/* Price */}
                        <div className="col-span-1 md:col-span-2">
                          <p className="font-semibold">Ksh {product.price.toLocaleString()}</p>
                        </div>

                        {/* Stock */}
                        <div className="col-span-1 md:col-span-2">
                          <Badge variant={product.stock && product.stock > 10 ? 'default' : product.stock && product.stock > 0 ? 'secondary' : 'destructive'}>
                            Stock: {product.stock ?? 0}
                          </Badge>
                        </div>

                        {/* Status */}
                        <div className="col-span-1">
                          <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                            {product.status}
                          </Badge>
                        </div>

                        {/* Actions */}
                        <div className="col-span-1 md:col-span-2 flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="View details"
                            onClick={() => router.push(`/inventory/${product._id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Edit product"
                            onClick={() => router.push(`/inventory/${product._id}/edit`)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Delete product"
                            onClick={() => handleDeleteProduct(product._id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Old form - kept for backward compatibility but hidden */}
            <div className="hidden">
              <Card>
                <CardHeader>
                  <CardTitle>Add Product (Legacy)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Product name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  />
                  <Input
                    placeholder="SKU (optional)"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Price (KES)"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                  />
                  <Input
                    type="number"
                    placeholder="Stock"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                  />
                  <Button onClick={handleAddProduct} className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> Add Product
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Duplicate product list removed - consolidated into unified list above */}
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Category Management</CardTitle>
                    <CardDescription>Create, edit, and organize product categories with hierarchy support</CardDescription>
                  </div>
                  <Button onClick={() => setIsCategoryImportExportOpen(true)} className="gap-2">
                    <Upload className="h-4 w-4" />
                    Import/Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {token ? <CategoryManagement token={token} /> : <p className="text-muted-foreground">Loading...</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branches" className="space-y-4">
            <BranchesShortcuts />
          </TabsContent>
        </Tabs>

        {/* CSV Import Modal */}
        <CSVImportModal
          isOpen={isCSVImportOpen}
          onClose={() => setIsCSVImportOpen(false)}
          onImport={handleCSVImport}
          token={token || ''}
          categories={categories}
        />

        {/* Category Import/Export Modal */}
        <CategoryImportExport
          token={token || ''}
          isOpen={isCategoryImportExportOpen}
          onClose={() => setIsCategoryImportExportOpen(false)}
          onImportComplete={loadData}
        />
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard requiredRole="admin">
      <AdminContent />
    </AuthGuard>
  );
}
