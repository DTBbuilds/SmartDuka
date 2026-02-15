"use client";

import { useEffect, useState } from "react";
import { config } from "@/lib/config";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@smartduka/ui";
import { useAuth } from "@/lib/auth-context";
import { useBranch } from "@/lib/branch-context";
import { useToast } from "@/lib/use-toast";
import { ToastContainer } from "@/components/toast-container";
import { AlertCircle, TrendingDown, Package, Calendar } from "lucide-react";

interface InventoryStats {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  expiringProducts: number;
  totalStockValue: number;
}

interface ExpiringProduct {
  _id: string;
  name: string;
  expiryDate: string;
  stock: number;
  price: number;
}

export default function InventoryPage() {
  const { token, user } = useAuth();
  const { currentBranch } = useBranch();
  const { toasts, toast, dismiss } = useToast();
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [expiringProducts, setExpiringProducts] = useState<ExpiringProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ExpiringProduct | null>(null);

  useEffect(() => {
    if (user?.role !== "admin") {
      return;
    }
    loadInventoryData();
  }, [token, user, currentBranch]);

  const loadInventoryData = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const branchParam = currentBranch ? `branchId=${currentBranch._id}` : '';

      // Load stats
      const statsRes = await fetch(`${config.apiUrl}/inventory/stats${branchParam ? `?${branchParam}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Load expiring products
      const expiringRes = await fetch(`${config.apiUrl}/inventory/expiring-products?days=30${branchParam ? `&${branchParam}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (expiringRes.ok) {
        const expiringData = await expiringRes.json();
        setExpiringProducts(expiringData);
      }
    } catch (err: any) {
      toast({
        type: "error",
        title: "Failed to load inventory data",
        message: err?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            You need admin privileges to manage inventory
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="bg-background py-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="container">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">
            Monitor stock levels, expiry dates, and inventory health
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Loading inventory data...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Package className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-sm text-muted-foreground">Total Products</p>
                    <p className="text-2xl font-bold">{stats?.totalProducts || 0}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Badge className="mx-auto mb-2 bg-green-100 text-green-800">
                      Active
                    </Badge>
                    <p className="text-sm text-muted-foreground">Active Products</p>
                    <p className="text-2xl font-bold">{stats?.activeProducts || 0}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className={stats?.lowStockProducts ? "border-yellow-200 bg-yellow-50" : ""}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <TrendingDown className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                    <p className="text-sm text-muted-foreground">Low Stock</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {stats?.lowStockProducts || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className={stats?.expiringProducts ? "border-red-200 bg-red-50" : ""}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Calendar className="h-8 w-8 mx-auto mb-2 text-red-600" />
                    <p className="text-sm text-muted-foreground">Expiring Soon</p>
                    <p className="text-2xl font-bold text-red-600">
                      {stats?.expiringProducts || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Stock Value</p>
                    <p className="text-2xl font-bold">
                      Ksh {(stats?.totalStockValue || 0).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Expiring Products Alert */}
            {expiringProducts.length > 0 && (
              <Card className="mb-6 border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-900">
                    <AlertCircle className="h-5 w-5" />
                    Products Expiring Soon
                  </CardTitle>
                  <CardDescription className="text-red-800">
                    {expiringProducts.length} product{expiringProducts.length !== 1 ? "s" : ""} expiring within 30 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Expiry Date</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expiringProducts.map((product) => {
                          const expiryDate = new Date(product.expiryDate);
                          const daysUntilExpiry = Math.ceil(
                            (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                          );

                          return (
                            <TableRow key={product._id}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>
                                {expiryDate.toLocaleDateString()}
                                <span className="ml-2 text-xs text-red-600">
                                  ({daysUntilExpiry} days)
                                </span>
                              </TableCell>
                              <TableCell>{product.stock} units</TableCell>
                              <TableCell>Ksh {product.price.toLocaleString()}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedProduct(product)}
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Health</CardTitle>
                <CardDescription>
                  Overall inventory status and recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-sm font-medium text-blue-900">Stock Value</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                      Ksh {(stats?.totalStockValue || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-800 mt-2">
                      Total value of inventory at cost price
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-sm font-medium text-green-900">Inventory Ratio</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {stats?.totalProducts ? Math.round((stats.activeProducts / stats.totalProducts) * 100) : 0}%
                    </p>
                    <p className="text-xs text-green-800 mt-2">
                      Active products vs total
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                  <p className="text-sm font-medium text-yellow-900">Recommendations</p>
                  <ul className="text-sm text-yellow-800 mt-2 space-y-1">
                    {stats?.lowStockProducts ? (
                      <li>• {stats.lowStockProducts} products have low stock - consider reordering</li>
                    ) : (
                      <li>• ✓ All products have adequate stock levels</li>
                    )}
                    {stats?.expiringProducts ? (
                      <li>• {stats.expiringProducts} products expiring soon - prioritize sales</li>
                    ) : (
                      <li>• ✓ No products expiring soon</li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Product Details Dialog */}
        {selectedProduct && (
          <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedProduct.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Expiry Date</p>
                    <p className="font-semibold">
                      {new Date(selectedProduct.expiryDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stock</p>
                    <p className="font-semibold">{selectedProduct.stock} units</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="font-semibold">Ksh {selectedProduct.price.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="font-semibold">
                      Ksh {(selectedProduct.price * selectedProduct.stock).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </main>
  );
}
