'use client';

import { config } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  AlertCircle, 
  Package, 
  Building2, 
  Search, 
  X, 
  Loader2,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  ShoppingCart,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface PurchaseOrder {
  _id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName?: string;
  branchId?: string;
  items: Array<{ productId: string; productName?: string; quantity: number; unitCost: number }>;
  totalCost: number;
  status: 'pending' | 'received' | 'cancelled';
  createdAt: string;
}

interface Supplier {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  preferredSupplierId?: string;
  reorderPoint?: number;
  reorderQuantity?: number;
}

export default function PurchaseOrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create order modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<Array<{ productId: string; quantity: number; unitCost: number }>>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
    fetchProducts();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${config.apiUrl}/purchases`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      
      if (res.ok) {
        setOrders(Array.isArray(data) ? data : []);
      } else {
        setError('Failed to fetch purchase orders');
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setError('Failed to fetch purchase orders');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${config.apiUrl}/suppliers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSuppliers(Array.isArray(data) ? data.filter((s: Supplier) => s.status === 'active') : []);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${config.apiUrl}/inventory/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setProducts(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const handleAddProduct = (product: Product) => {
    if (selectedProducts.find(p => p.productId === product._id)) return;
    
    // Auto-select supplier if product has preferred supplier
    if (product.preferredSupplierId && !selectedSupplier) {
      setSelectedSupplier(product.preferredSupplierId);
    }
    
    setSelectedProducts([
      ...selectedProducts,
      {
        productId: product._id,
        quantity: product.reorderQuantity || 10,
        unitCost: product.cost || 0,
      },
    ]);
    setProductSearch('');
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    setSelectedProducts(
      selectedProducts.map(p =>
        p.productId === productId ? { ...p, quantity: Math.max(1, quantity) } : p
      )
    );
  };

  const handleCreateOrder = async () => {
    if (!selectedSupplier || selectedProducts.length === 0) return;
    
    setIsCreating(true);
    try {
      const res = await fetch(`${config.apiUrl}/purchases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          supplierId: selectedSupplier,
          items: selectedProducts,
        }),
      });

      if (res.ok) {
        await fetchOrders();
        setShowCreateModal(false);
        setSelectedSupplier('');
        setSelectedProducts([]);
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to create purchase order');
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      setError('Failed to create purchase order');
    } finally {
      setIsCreating(false);
    }
  };

  const calculateTotal = () => {
    return selectedProducts.reduce((sum, p) => sum + p.quantity * p.unitCost, 0);
  };

  const filteredProducts = products.filter(
    p =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Products that need reorder (low stock)
  const lowStockProducts = products.filter(
    p => p.stock <= (p.reorderPoint || 0) && p.preferredSupplierId
  );

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      received: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6 px-2 md:px-0">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">Manage purchase orders and track deliveries</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/suppliers">
            <Button variant="outline" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Suppliers</span>
            </Button>
          </Link>
          <Button className="gap-2" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            New Order
          </Button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-800 dark:text-amber-400">
                  {lowStockProducts.length} products need reordering
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                  These products are below their reorder point and have a preferred supplier set.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {lowStockProducts.slice(0, 5).map(p => (
                    <Badge key={p._id} variant="outline" className="bg-white dark:bg-amber-900/30">
                      {p.name} ({p.stock} left)
                    </Badge>
                  ))}
                  {lowStockProducts.length > 5 && (
                    <Badge variant="outline">+{lowStockProducts.length - 5} more</Badge>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setShowCreateModal(true);
                  // Pre-select low stock products
                  const productsToAdd = lowStockProducts.slice(0, 10).map(p => ({
                    productId: p._id,
                    quantity: p.reorderQuantity || 10,
                    unitCost: p.cost || 0,
                  }));
                  setSelectedProducts(productsToAdd);
                  if (lowStockProducts[0]?.preferredSupplierId) {
                    setSelectedSupplier(lowStockProducts[0].preferredSupplierId);
                  }
                }}
              >
                Create Order
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="text-xs text-muted-foreground">Pending</span>
          </div>
          <p className="text-xl font-bold mt-1">
            {orders.filter(o => o.status === 'pending').length}
          </p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-xs text-muted-foreground">Received</span>
          </div>
          <p className="text-xl font-bold mt-1">
            {orders.filter(o => o.status === 'received').length}
          </p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-muted-foreground">Suppliers</span>
          </div>
          <p className="text-xl font-bold mt-1">{suppliers.length}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-purple-600" />
            <span className="text-xs text-muted-foreground">Low Stock</span>
          </div>
          <p className="text-xl font-bold mt-1">{lowStockProducts.length}</p>
        </Card>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Truck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No purchase orders</h3>
            <p className="text-muted-foreground text-sm mb-4">Create your first purchase order to track inventory</p>
            <Button className="gap-2" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" />
              Create Purchase Order
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const supplier = suppliers.find(s => s._id === order.supplierId);
            return (
              <Card key={order._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{order.purchaseNumber}</h3>
                        <Badge className={getStatusBadgeColor(order.status)}>
                          {order.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {order.status === 'received' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {order.status === 'cancelled' && <XCircle className="h-3 w-3 mr-1" />}
                          {order.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span>{supplier?.name || order.supplierName || 'Unknown Supplier'}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <span><strong>{order.items.length}</strong> items</span>
                        <span className="font-semibold text-green-600">
                          Ksh {order.totalCost.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                      {order.status === 'pending' && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          Receive
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create Purchase Order</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Supplier Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Supplier *</label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select a supplier</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Add Products</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products by name or SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {productSearch && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {filteredProducts.slice(0, 10).map((product) => (
                      <div
                        key={product._id}
                        className="p-2 hover:bg-muted cursor-pointer flex items-center justify-between"
                        onClick={() => handleAddProduct(product)}
                      >
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            SKU: {product.sku} • Stock: {product.stock} • Cost: Ksh {product.cost}
                          </p>
                        </div>
                        {product.preferredSupplierId && (
                          <Badge variant="outline" className="text-xs">
                            Has supplier
                          </Badge>
                        )}
                      </div>
                    ))}
                    {filteredProducts.length === 0 && (
                      <p className="p-2 text-sm text-muted-foreground">No products found</p>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Products */}
              {selectedProducts.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Order Items ({selectedProducts.length})</label>
                  <div className="border rounded-md divide-y">
                    {selectedProducts.map((item) => {
                      const product = products.find(p => p._id === item.productId);
                      return (
                        <div key={item.productId} className="p-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{product?.name}</p>
                            <p className="text-xs text-muted-foreground">@ Ksh {item.unitCost}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(item.productId, parseInt(e.target.value) || 1)}
                              className="w-20 h-8 text-center"
                            />
                            <span className="text-sm font-medium w-24 text-right">
                              Ksh {(item.quantity * item.unitCost).toLocaleString()}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500"
                              onClick={() => handleRemoveProduct(item.productId)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                    <span className="font-medium">Total</span>
                    <span className="text-lg font-bold text-green-600">
                      Ksh {calculateTotal().toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!selectedSupplier || selectedProducts.length === 0 || isCreating}
                onClick={handleCreateOrder}
              >
                {isCreating ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</>
                ) : (
                  <><ShoppingCart className="h-4 w-4 mr-2" /> Create Order</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
