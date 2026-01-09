"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { config } from "@/lib/config";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Badge,
} from "@smartduka/ui";
import {
  Boxes,
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  RefreshCw,
  FolderTree,
  MoreVertical,
  X,
  ChevronRight,
  Loader2,
  Eye,
} from "lucide-react";
import { DataTable, Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeleton";

interface Category {
  _id: string;
  name: string;
  description?: string;
  parentId?: string;
  parentName?: string;
  productCount?: number;
  createdAt: string;
  updatedAt?: string;
}

interface CategoryMeta {
  totalCategories: number;
  rootCategories: number;
  totalProducts: number;
  categorizedProducts: number;
  uncategorizedProducts: number;
}

interface CategoryFormData {
  name: string;
  description: string;
  parentId: string;
}

interface Product {
  _id: string;
  name: string;
  sku?: string;
  price: number;
  stock?: number;
  status: string;
}

export default function CategoriesPage() {
  const { token, user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryMeta, setCategoryMeta] = useState<CategoryMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    description: "",
    parentId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Check if user is admin
  if (user?.role !== "admin") {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Boxes className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">
            You need admin privileges to manage categories.
          </p>
        </div>
      </div>
    );
  }

  const fetchCategories = useCallback(async () => {
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${config.apiUrl}/inventory/categories`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch categories: ${res.status}`);
      }

      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      
      // Handle both old format (array) and new format (object with categories and meta)
      if (Array.isArray(data)) {
        setCategories(data);
        setCategoryMeta(null);
      } else if (data.categories) {
        setCategories(data.categories);
        setCategoryMeta(data.meta || null);
      } else {
        setCategories([]);
        setCategoryMeta(null);
      }
    } catch (err: any) {
      console.error("Error fetching categories:", err);
      setError(err.message || "Failed to load categories");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setFormData({ name: "", description: "", parentId: "" });
    setShowModal(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      parentId: category.parentId || "",
    });
    setShowModal(true);
  };

  const handleViewProducts = async (category: Category) => {
    setSelectedCategory(category);
    setLoadingProducts(true);
    setCategoryProducts([]);
    
    try {
      const res = await fetch(`${config.apiUrl}/inventory/products?categoryId=${category._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch products: ${res.status}`);
      }

      const prodText = await res.text();
      const data = prodText ? JSON.parse(prodText) : [];
      setCategoryProducts(Array.isArray(data) ? data : data.products || []);
    } catch (err: any) {
      console.error("Error fetching category products:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`${config.apiUrl}/inventory/categories/${category._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const delText = await res.text();
      const delData = delText ? JSON.parse(delText) : {};
      
      if (!res.ok) {
        throw new Error(delData.message || "Failed to delete category");
      }

      fetchCategories();
    } catch (err: any) {
      alert(err.message || "Failed to delete category");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert("Category name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingCategory
        ? `${config.apiUrl}/inventory/categories/${editingCategory._id}`
        : `${config.apiUrl}/inventory/categories`;
      
      const res = await fetch(url, {
        method: editingCategory ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          parentId: formData.parentId || undefined,
        }),
      });

      const saveText = await res.text();
      const saveData = saveText ? JSON.parse(saveText) : {};
      
      if (!res.ok) {
        throw new Error(saveData.message || "Failed to save category");
      }

      setShowModal(false);
      fetchCategories();
    } catch (err: any) {
      alert(err.message || "Failed to save category");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter categories based on search
  const filteredCategories = categories.filter((category) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      category.name.toLowerCase().includes(query) ||
      category.description?.toLowerCase().includes(query)
    );
  });

  const columns: Column<Category>[] = [
    {
      key: "name",
      header: "Category Name",
      render: (category) => (
        <div 
          className="flex items-center gap-3 cursor-pointer hover:bg-accent/50 -m-2 p-2 rounded-lg transition-colors"
          onClick={() => handleViewProducts(category)}
        >
          <div className="p-2 bg-primary/10 rounded-lg">
            <Boxes className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium flex items-center gap-1">
              {category.name}
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </div>
            {category.description && (
              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                {category.description}
              </div>
            )}
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      key: "parentName",
      header: "Parent Category",
      render: (category) => (
        category.parentName ? (
          <Badge variant="outline" className="font-normal">
            <FolderTree className="h-3 w-3 mr-1" />
            {category.parentName}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">Root category</span>
        )
      ),
    },
    {
      key: "productCount",
      header: "Products",
      render: (category) => (
        <button
          onClick={() => handleViewProducts(category)}
          className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-accent transition-colors"
        >
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{category.productCount ?? 0}</span>
          <Eye className="h-3 w-3 text-muted-foreground ml-1" />
        </button>
      ),
      sortable: true,
    },
    {
      key: "createdAt",
      header: "Created",
      render: (category) => (
        <span className="text-sm text-muted-foreground">
          {new Date(category.createdAt).toLocaleDateString()}
        </span>
      ),
      sortable: true,
    },
    {
      key: "actions",
      header: "",
      render: (category) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditCategory(category)}
            title="Edit category"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteCategory(category)}
            className="text-destructive hover:text-destructive"
            title="Delete category"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="p-6">
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-muted-foreground">
            Organize your products into categories
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchCategories}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleCreateCategory}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Boxes className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Categories</p>
                <p className="text-2xl font-bold">{categoryMeta?.totalCategories ?? categories.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <FolderTree className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Root Categories</p>
                <p className="text-2xl font-bold">
                  {categoryMeta?.rootCategories ?? categories.filter(c => !c.parentId).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">
                  {categoryMeta?.totalProducts ?? categories.reduce((sum, c) => sum + (c.productCount || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uncategorized</p>
                <p className="text-2xl font-bold">
                  {categoryMeta?.uncategorizedProducts ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories Table */}
      {error ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-destructive">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={fetchCategories} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filteredCategories.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={searchQuery ? "No categories found" : "No categories yet"}
          description={
            searchQuery
              ? "Try adjusting your search"
              : "Create your first category to organize products"
          }
          actionLabel={!searchQuery ? "Add Category" : undefined}
          onAction={!searchQuery ? handleCreateCategory : undefined}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable
              data={filteredCategories}
              columns={columns}
              searchable={false}
              emptyMessage="No categories found"
            />
          </CardContent>
        </Card>
      )}

      {/* Modal for Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowModal(false)}
          />
          <Card className="relative z-10 w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>
                {editingCategory ? "Edit Category" : "Create Category"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    Category Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Electronics, Beverages"
                    className="mt-1"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Optional description"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Parent Category</label>
                  <select
                    value={formData.parentId}
                    onChange={(e) =>
                      setFormData({ ...formData, parentId: e.target.value })
                    }
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">None (Root Category)</option>
                    {categories
                      .filter((c) => c._id !== editingCategory?._id)
                      .map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting
                      ? "Saving..."
                      : editingCategory
                      ? "Update"
                      : "Create"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Products Panel for Selected Category */}
      {selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedCategory(null)}
          />
          <Card className="relative z-10 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <CardHeader className="flex-shrink-0 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Boxes className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{selectedCategory.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {categoryProducts.length} product{categoryProducts.length !== 1 ? 's' : ''} in this category
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedCategory(null)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              {loadingProducts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading products...</span>
                </div>
              ) : categoryProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No products in this category</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setSelectedCategory(null);
                      window.location.href = '/admin/products';
                    }}
                  >
                    Add Products
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {categoryProducts.map((product) => (
                    <div
                      key={product._id}
                      className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/inventory/${product._id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-muted rounded-lg flex-shrink-0">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            SKU: {product.sku || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="font-semibold">Ksh {product.price.toLocaleString()}</p>
                          <Badge 
                            variant={
                              (product.stock ?? 0) > 10 ? 'default' : 
                              (product.stock ?? 0) > 0 ? 'secondary' : 'destructive'
                            }
                            className="text-xs"
                          >
                            Stock: {product.stock ?? 0}
                          </Badge>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
