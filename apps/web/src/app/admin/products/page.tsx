'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@smartduka/ui';
import { Plus, Trash2, Edit2, Download, Upload, Eye, Search, ChevronDown, ChevronUp, Package, Loader2, ChevronLeft, ChevronRight, History, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useBranch } from '@/lib/branch-context';
import { useToast } from '@/lib/use-toast';
import { config } from '@/lib/config';
import { ToastContainer } from '@/components/toast-container';
import { CSVImportModal } from '@/components/csv-import-modal';
import { downloadCSV } from '@/lib/csv-parser';
import { AuthGuard } from '@/components/auth-guard';
import { QuickAddProductForm } from '@/components/quick-add-product-form';
import { QuickAddProductMobile } from '@/components/quick-add-product-mobile';
import { ProductsListMobile } from '@/components/products-list-mobile';
import { StockHistoryModal } from '@/components/stock-history-modal';
import { smartCache } from '@/lib/smart-cache-manager';
import { useCachedProducts, useCachedCategories } from '@/hooks/use-smart-cache';

// Cache configuration
const PRODUCTS_CACHE_KEY = 'smartduka:cache:products';
const CATEGORIES_CACHE_KEY = 'smartduka:cache:categories';
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  branchId?: string;
}

function getCache<T>(key: string, branchId?: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = sessionStorage.getItem(key);
    if (!cached) return null;
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    const isExpired = Date.now() - entry.timestamp > CACHE_TTL;
    const branchMismatch = branchId && entry.branchId !== branchId;
    
    if (isExpired || branchMismatch) {
      sessionStorage.removeItem(key);
      return null;
    }
    
    return entry.data;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T, branchId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), branchId };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore storage errors
  }
}

function clearProductsCache(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(PRODUCTS_CACHE_KEY);
}

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

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

function ProductsContent() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { currentBranch } = useBranch();
  const { toasts, toast, dismiss } = useToast();

  // Initialize from cache for instant UI
  const [products, setProducts] = useState<Product[]>(() => {
    const cached = getCache<Product[]>(PRODUCTS_CACHE_KEY, currentBranch?._id);
    return cached || [];
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    const cached = getCache<Category[]>(CATEGORIES_CACHE_KEY);
    return cached || [];
  });
  const [loading, setLoading] = useState(false);
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);
  const [isQuickAddExpanded, setIsQuickAddExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [stockHistoryProduct, setStockHistoryProduct] = useState<Product | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const itemsPerPage = 20;
  const fetchedRef = useRef(false);
  
  // Debounce search for performance
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Load data with caching
  const loadData = useCallback(async (forceRefresh = false) => {
    if (!token) return;
    
    const branchId = currentBranch?._id;
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cachedProducts = getCache<Product[]>(PRODUCTS_CACHE_KEY, branchId);
      const cachedCategories = getCache<Category[]>(CATEGORIES_CACHE_KEY);
      
      if (cachedProducts && cachedCategories) {
        setProducts(cachedProducts);
        setCategories(cachedCategories);
        setTotalProducts(cachedProducts.length);
        return;
      }
    }
    
    try {
      setLoading(products.length === 0); // Only show loading if no cached data
      setIsRefreshing(products.length > 0); // Show refresh indicator if we have data
      
      const base = config.apiUrl;
      const headers = { Authorization: `Bearer ${token}` };
      
      const branchParam = branchId ? `branchId=${branchId}` : '';
      const branchQuery = branchParam ? `&${branchParam}` : '';

      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`${base}/inventory/products?limit=200${branchQuery}`, { headers }),
        fetch(`${base}/inventory/categories`, { headers }),
      ]);

      if (productsRes.ok) {
        const data = await productsRes.json();
        const productsArray = Array.isArray(data) ? data : [];
        setProducts(productsArray);
        setTotalProducts(productsArray.length);
        setCache(PRODUCTS_CACHE_KEY, productsArray, branchId);
      } else {
        setProducts([]);
        setTotalProducts(0);
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        const categoriesArray = Array.isArray(data) ? data : (data.categories || []);
        setCategories(categoriesArray);
        setCache(CATEGORIES_CACHE_KEY, categoriesArray);
      } else {
        setCategories([]);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      toast({ type: 'error', title: 'Load failed', message: err?.message });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [token, currentBranch?._id, products.length, toast]);

  // Initial load
  useEffect(() => {
    if (!fetchedRef.current && token) {
      fetchedRef.current = true;
      loadData();
    }
  }, [token, loadData]);

  // Reload when branch changes
  useEffect(() => {
    if (fetchedRef.current && token) {
      loadData(true); // Force refresh on branch change
    }
  }, [currentBranch?._id]);

  const handleDeleteProduct = async (id: string) => {
    if (!token) return;
    if (!confirm('Are you sure you want to delete this product?')) return;
    setActionLoading(id);
    try {
      const base = config.apiUrl;
      const res = await fetch(`${base}/inventory/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      toast({ type: 'success', title: 'Product deleted' });
      clearProductsCache();
      loadData(true);
    } catch (err: any) {
      toast({ type: 'error', title: 'Delete failed', message: err?.message });
    } finally {
      setActionLoading(null);
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
      const text = await res.text();
      const result = text ? JSON.parse(text) : {};
      
      let message = `Imported ${result.imported} products`;
      if (result.updated > 0) message += `, updated ${result.updated}`;
      if (result.skipped > 0) message += `, skipped ${result.skipped} duplicates`;
      if (result.categoriesCreated?.length > 0) {
        message += `. Created ${result.categoriesCreated.length} categories`;
      }
      if (result.errors?.length > 0) message += `. ${result.errors.length} errors`;
      
      toast({ type: 'success', title: 'Import complete', message });
      clearProductsCache();
      loadData(true);
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

  // Memoized filtered products using debounced search for performance
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const searchLower = debouncedSearch.toLowerCase();
      const matchesSearch = 
        product.name.toLowerCase().includes(searchLower) ||
        (product.sku && product.sku.toLowerCase().includes(searchLower));
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [products, debouncedSearch, statusFilter]);

  // Paginated products for current page
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter]);

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
      clearProductsCache();
      loadData(true);
    } catch (err: any) {
      toast({ type: 'error', title: 'Delete failed', message: err?.message });
    }
  };

  return (
    <main className="bg-background py-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="container">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Products</h1>
              <p className="text-sm text-muted-foreground">
                Manage your product inventory
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCSVImportOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button variant="outline" onClick={handleCSVExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setIsQuickAddExpanded(!isQuickAddExpanded)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Quick Add Product Form */}
        {isQuickAddExpanded && (
          <Card className="mb-6 border-primary/40 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Add New Product</CardTitle>
                  <CardDescription>Add a new product to your inventory</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsQuickAddExpanded(false)}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <QuickAddProductForm
                categories={categories}
                token={token || ''}
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
                    clearProductsCache();
                    loadData(true);
                    setIsQuickAddExpanded(false);
                  } catch (err: any) {
                    throw new Error(err?.message || 'Failed to create product');
                  }
                }}
                onCategoryCreated={(newCategory) => {
                  setCategories((prev) => [...prev, newCategory]);
                  toast({ type: 'success', title: 'Category created', message: `${newCategory.name} added` });
                }}
                isLoading={loading}
              />
            </CardContent>
          </Card>
        )}

        {/* Products List Card */}
        <Card>
          <CardHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Products List
                    {isRefreshing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </CardTitle>
                  <CardDescription>
                    {filteredProducts.length} of {products.length} product(s)
                    {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
                  </CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { clearProductsCache(); loadData(true); }}
                  disabled={isRefreshing}
                  title="Refresh products"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
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
                    <Button size="sm" variant="outline" onClick={() => setSelectedProducts(new Set())}>
                      Clear
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
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
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {products.length === 0 ? 'No products yet. Click "Add Product" to get started!' : 'No products match your search.'}
                </p>
              </div>
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

                {/* Product Rows - Using paginated products for performance */}
                {paginatedProducts.map((product) => (
                  <div
                    key={product._id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-3 p-3 border rounded-lg hover:bg-accent transition-colors items-center"
                  >
                    <div className="col-span-1 flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product._id)}
                        onChange={() => handleSelectProduct(product._id)}
                        className="rounded"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-4">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {product.sku || 'N/A'}</p>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <p className="font-semibold">Ksh {product.price.toLocaleString()}</p>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <Badge variant={product.stock && product.stock > 10 ? 'default' : product.stock && product.stock > 0 ? 'secondary' : 'destructive'}>
                        Stock: {product.stock ?? 0}
                      </Badge>
                    </div>
                    <div className="col-span-1">
                      <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                        {product.status}
                      </Badge>
                    </div>
                    <div className="col-span-1 md:col-span-2 flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        title="Stock history" 
                        onClick={() => setStockHistoryProduct(product)}
                        className="h-9 w-9 p-0 hover:bg-purple-100 hover:text-purple-600 dark:hover:bg-purple-900/30 transition-all active:scale-95"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        title="View details" 
                        onClick={() => {
                          setActionLoading(product._id + '-view');
                          router.push(`/inventory/${product._id}`);
                        }}
                        disabled={actionLoading?.startsWith(product._id)}
                        className="h-9 w-9 p-0 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 transition-all active:scale-95"
                      >
                        {actionLoading === product._id + '-view' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        title="Edit product" 
                        onClick={() => {
                          setActionLoading(product._id + '-edit');
                          router.push(`/inventory/${product._id}/edit`);
                        }}
                        disabled={actionLoading?.startsWith(product._id)}
                        className="h-9 w-9 p-0 hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-900/30 transition-all active:scale-95"
                      >
                        {actionLoading === product._id + '-edit' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Edit2 className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        title="Delete product" 
                        onClick={() => handleDeleteProduct(product._id)}
                        disabled={actionLoading?.startsWith(product._id)}
                        className="h-9 w-9 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-all active:scale-95"
                      >
                        {actionLoading === product._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-600" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t mt-4">
                    <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                      <span className="hidden sm:inline">Showing </span>{((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <ChevronLeft className="h-4 w-4 -ml-2" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      {/* Page numbers */}
                      <div className="flex items-center gap-1 mx-2">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="h-8 w-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                        <ChevronRight className="h-4 w-4 -ml-2" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CSV Import Modal */}
        <CSVImportModal
          isOpen={isCSVImportOpen}
          onClose={() => setIsCSVImportOpen(false)}
          onImport={handleCSVImport}
          token={token || ''}
          categories={categories}
        />

        {/* Stock History Modal */}
        {stockHistoryProduct && (
          <StockHistoryModal
            isOpen={!!stockHistoryProduct}
            onClose={() => setStockHistoryProduct(null)}
            productId={stockHistoryProduct._id}
            productName={stockHistoryProduct.name}
            currentStock={stockHistoryProduct.stock ?? 0}
            token={token || ''}
          />
        )}
      </div>
    </main>
  );
}

export default function ProductsPage() {
  return (
    <AuthGuard requiredRole="admin">
      <ProductsContent />
    </AuthGuard>
  );
}
