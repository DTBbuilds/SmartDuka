"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@smartduka/ui";
import {
  ArrowLeft,
  Package,
  Edit2,
  Trash2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Tag,
  DollarSign,
  Boxes,
  AlertTriangle,
} from "lucide-react";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { useToast } from "@/lib/use-toast";
import { ToastContainer } from "@/components/toast-container";

interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  price: number;
  cost: number;
  quantityOnHand: number;
  stock?: number;
  reorderLevel: number;
  taxRate: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  expiryDate?: string;
}

interface StockMovement {
  _id: string;
  type: "in" | "out" | "adjustment";
  quantity: number;
  reason?: string;
  createdAt: string;
}

export default function ProductDetailsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { toasts, toast, dismiss } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (productId && token) {
      fetchProduct();
      fetchStockMovements();
    }
  }, [productId, token]);

  const fetchProduct = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/inventory/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      
      if (res.ok) {
        setProduct(data);
      } else {
        toast({ type: "error", title: "Failed to load product" });
      }
    } catch (error) {
      console.error("Failed to fetch product:", error);
      toast({ type: "error", title: "Failed to load product" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStockMovements = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/inventory/stock/movements/${productId}?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const movText = await res.text();
      const movData = movText ? JSON.parse(movText) : [];
      
      if (res.ok) {
        setStockMovements(Array.isArray(movData) ? movData : []);
      }
    } catch (error) {
      console.error("Failed to fetch stock movements:", error);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/inventory/products/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast({ type: "success", title: "Product deleted successfully" });
        router.push("/admin");
      } else {
        throw new Error("Failed to delete product");
      }
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast({ type: "error", title: "Failed to delete product" });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const getStockStatus = () => {
    if (!product) return { label: "Unknown", variant: "secondary" as const };
    const stock = product.quantityOnHand ?? product.stock ?? 0;
    if (stock === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (stock <= product.reorderLevel) return { label: "Low Stock", variant: "secondary" as const };
    return { label: "In Stock", variant: "default" as const };
  };

  const calculateProfit = () => {
    if (!product) return 0;
    return product.price - (product.cost || 0);
  };

  const calculateMargin = () => {
    if (!product || !product.price) return 0;
    return ((calculateProfit() / product.price) * 100).toFixed(1);
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <TableSkeleton />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Product not found</h2>
          <p className="text-muted-foreground mt-2">
            The product you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => router.push("/admin")} className="mt-4">
            Back to Inventory
          </Button>
        </div>
      </div>
    );
  }

  const stockStatus = getStockStatus();
  const currentStock = product.quantityOnHand ?? product.stock ?? 0;

  return (
    <main className="bg-background py-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="container">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{product.name}</h1>
                <Badge variant={product.status === "active" ? "default" : "secondary"}>
                  {product.status}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">SKU: {product.sku || "N/A"}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/inventory/${productId}/edit`)}
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Product
              </Button>
              <Button
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Selling Price</p>
                  <p className="text-2xl font-bold">Ksh {product.price.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Profit Margin</p>
                  <p className="text-2xl font-bold">{calculateMargin()}%</p>
                  <p className="text-xs text-muted-foreground">
                    Ksh {calculateProfit().toLocaleString()} per unit
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={stockStatus.variant === "destructive" ? "border-red-200 bg-red-50" : stockStatus.variant === "secondary" ? "border-yellow-200 bg-yellow-50" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stockStatus.variant === "destructive" ? "bg-red-500/10" : stockStatus.variant === "secondary" ? "bg-yellow-500/10" : "bg-green-500/10"}`}>
                  <Boxes className={`h-5 w-5 ${stockStatus.variant === "destructive" ? "text-red-600" : stockStatus.variant === "secondary" ? "text-yellow-600" : "text-green-600"}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stock Level</p>
                  <p className="text-2xl font-bold">{currentStock} units</p>
                  <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stock Value</p>
                  <p className="text-2xl font-bold">
                    Ksh {((product.cost || product.price) * currentStock).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
              <CardDescription>Complete product information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Product Name</p>
                  <p className="font-semibold">{product.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">SKU</p>
                  <p className="font-semibold">{product.sku || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Barcode</p>
                  <p className="font-semibold">{product.barcode || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Category</p>
                  <p className="font-semibold">{product.categoryName || "Uncategorized"}</p>
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="mt-1">{product.description}</p>
                </div>
              )}

              {/* Pricing */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Pricing Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Cost Price</p>
                    <p className="font-semibold">Ksh {(product.cost || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Selling Price</p>
                    <p className="font-semibold">Ksh {product.price.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tax Rate</p>
                    <p className="font-semibold">{product.taxRate || 0}%</p>
                  </div>
                </div>
              </div>

              {/* Stock Info */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Boxes className="h-4 w-4" />
                  Stock Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Stock</p>
                    <p className="font-semibold">{currentStock} units</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reorder Level</p>
                    <p className="font-semibold">{product.reorderLevel || 0} units</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                  </div>
                </div>
              </div>

              {/* Low Stock Warning */}
              {currentStock <= product.reorderLevel && currentStock > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-900">Low Stock Warning</p>
                    <p className="text-sm text-yellow-800">
                      Stock level is below the reorder threshold. Consider restocking soon.
                    </p>
                  </div>
                </div>
              )}

              {/* Out of Stock Warning */}
              {currentStock === 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">Out of Stock</p>
                    <p className="text-sm text-red-800">
                      This product is currently out of stock and cannot be sold.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Stock Movements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Stock movements and changes</CardDescription>
            </CardHeader>
            <CardContent>
              {stockMovements.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent stock movements
                </p>
              ) : (
                <div className="space-y-3">
                  {stockMovements.map((movement) => (
                    <div
                      key={movement._id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-1.5 rounded-full ${
                            movement.type === "in"
                              ? "bg-green-100"
                              : movement.type === "out"
                              ? "bg-red-100"
                              : "bg-blue-100"
                          }`}
                        >
                          {movement.type === "in" ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : movement.type === "out" ? (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          ) : (
                            <BarChart3 className="h-3 w-3 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium capitalize">{movement.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(movement.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={movement.type === "in" ? "default" : "secondary"}
                      >
                        {movement.type === "in" ? "+" : movement.type === "out" ? "-" : ""}
                        {movement.quantity}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Timestamps */}
              <div className="mt-6 pt-4 border-t space-y-2">
                {product.createdAt && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Created: {new Date(product.createdAt).toLocaleDateString()}
                  </div>
                )}
                {product.updatedAt && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Updated: {new Date(product.updatedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Product</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Are you sure you want to delete <strong>{product.name}</strong>? This action cannot be undone.
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
