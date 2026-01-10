"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { config } from "@/lib/config";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from "@smartduka/ui";
import { Package, Building2, Truck, Plus } from "lucide-react";
import { BackButton } from "@/components/back-button";
import Link from "next/link";
import { TableSkeleton } from "@/components/shared/loading-skeleton";
import { CategorySelectWithCreate } from "@/components/category-select-with-create";

interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
  price: number;
  cost: number;
  stock: number;
  lowStockThreshold: number;
  tax: number;
  status: string;
}

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface Supplier {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
}

export default function EditProductPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    barcode: "",
    description: "",
    categoryId: "",
    preferredSupplierId: "",
    reorderPoint: 0,
    reorderQuantity: 0,
    leadTimeDays: 0,
    price: 0,
    cost: 0,
    stock: 0,
    lowStockThreshold: 10,
    tax: 16,
    status: "active",
  });

  useEffect(() => {
    fetchProduct();
    fetchCategories();
    fetchSuppliers();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const apiUrl = config.apiUrl;
      const res = await fetch(`${apiUrl}/inventory/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      
      if (res.ok) {
        setProduct(data);
        setFormData({
          name: data.name || "",
          sku: data.sku || "",
          barcode: data.barcode || "",
          description: data.description || "",
          categoryId: data.categoryId || "",
          preferredSupplierId: data.preferredSupplierId || "",
          reorderPoint: data.reorderPoint || 0,
          reorderQuantity: data.reorderQuantity || 0,
          leadTimeDays: data.leadTimeDays || 0,
          price: data.price || 0,
          cost: data.cost || 0,
          stock: data.stock || 0,
          lowStockThreshold: data.lowStockThreshold || 10,
          tax: data.tax || 16,
          status: data.status || "active",
        });
      }
    } catch (error) {
      console.error("Failed to fetch product:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const apiUrl = config.apiUrl;
      const res = await fetch(`${apiUrl}/inventory/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const catText = await res.text();
      const catData = catText ? JSON.parse(catText) : [];
      
      if (res.ok) {
        // Handle both array format and object format { categories: [...], meta: {...} }
        const categoriesArray = Array.isArray(catData) ? catData : (catData.categories || []);
        setCategories(categoriesArray);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const apiUrl = config.apiUrl;
      const res = await fetch(`${apiUrl}/suppliers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const supText = await res.text();
      const supData = supText ? JSON.parse(supText) : [];
      
      if (res.ok) {
        // Ensure supData is an array before filtering
        const suppliersArray = Array.isArray(supData) ? supData : [];
        setSuppliers(suppliersArray.filter((s: Supplier) => s.status === 'active'));
      }
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const apiUrl = config.apiUrl;
      
      // Clean up form data - remove empty IDs
      const payload = {
        ...formData,
        categoryId: formData.categoryId || undefined,
        preferredSupplierId: formData.preferredSupplierId || undefined,
      };
      
      const res = await fetch(`${apiUrl}/inventory/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push("/admin");
      } else {
        const errText = await res.text();
        const errorData = errText ? JSON.parse(errText) : {};
        const errorMessage = errorData.message || errorData.error || "Failed to update product";
        throw new Error(Array.isArray(errorMessage) ? errorMessage.join(", ") : errorMessage);
      }
    } catch (error: any) {
      console.error("Failed to update product:", error);
      alert(`Failed to update product: ${error.message || "Please try again."}`);
    } finally {
      setIsSaving(false);
    }
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
          <Button onClick={() => router.push("/admin")} className="mt-4">
            Back to Inventory
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <BackButton fallbackRoute={`/inventory/${productId}`} className="mb-4" />
        <h1 className="text-3xl font-bold">Edit Product</h1>
        <p className="text-muted-foreground">Update product information</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Product Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">
                  SKU <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <CategorySelectWithCreate
                  categories={categories}
                  value={formData.categoryId}
                  onChange={(categoryId) => setFormData({ ...formData, categoryId })}
                  onCategoryCreated={(newCategory) => {
                    setCategories((prev) => [...prev, newCategory]);
                  }}
                  token={token || ''}
                  placeholder="Select or create category"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Supplier & Reorder Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Supplier & Reorder Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="preferredSupplierId">Preferred Supplier</Label>
                <div className="flex gap-2">
                  <select
                    id="preferredSupplierId"
                    value={formData.preferredSupplierId}
                    onChange={(e) => setFormData({ ...formData, preferredSupplierId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">No supplier selected</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  <Link href="/admin/suppliers">
                    <Button type="button" variant="outline" size="icon" title="Manage Suppliers">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground">
                  Default supplier for purchase orders
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leadTimeDays">Lead Time (Days)</Label>
                <Input
                  id="leadTimeDays"
                  type="number"
                  min="0"
                  value={formData.leadTimeDays}
                  onChange={(e) =>
                    setFormData({ ...formData, leadTimeDays: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Expected delivery time from supplier
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reorderPoint">Reorder Point</Label>
                <Input
                  id="reorderPoint"
                  type="number"
                  min="0"
                  value={formData.reorderPoint}
                  onChange={(e) =>
                    setFormData({ ...formData, reorderPoint: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Minimum stock level to trigger reorder alert
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reorderQuantity">Reorder Quantity</Label>
                <Input
                  id="reorderQuantity"
                  type="number"
                  min="0"
                  value={formData.reorderQuantity}
                  onChange={(e) =>
                    setFormData({ ...formData, reorderQuantity: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Suggested quantity for purchase orders
                </p>
              </div>
            </div>

            {formData.preferredSupplierId && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
                  <Building2 className="h-4 w-4" />
                  <span>
                    Supplier: <strong>{suppliers.find(s => s._id === formData.preferredSupplierId)?.name}</strong>
                  </span>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                  This supplier will be pre-selected when creating purchase orders for this product.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing & Stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price">
                  Selling Price <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost">Cost Price</Label>
                <Input
                  id="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax">Tax Rate (%)</Label>
                <Input
                  id="tax"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.tax}
                  onChange={(e) =>
                    setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="stock">Stock Quantity</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stock: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Use stock adjustments to change quantity
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  min="0"
                  value={formData.lowStockThreshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lowStockThreshold: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
