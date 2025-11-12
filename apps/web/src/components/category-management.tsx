"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Textarea } from "@smartduka/ui";
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { useToast } from "@/lib/use-toast";

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  image?: string;
  order: number;
  status: 'active' | 'inactive';
  productCount: number;
  children?: Category[];
}

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  order: number;
  status: 'active' | 'inactive';
}

interface CategoryManagementProps {
  token: string;
}

export function CategoryManagement({ token }: CategoryManagementProps) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    slug: '',
    description: '',
    parentId: '',
    order: 0,
    status: 'active',
  });

  const loadCategories = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/inventory/categories/hierarchy`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({ type: 'error', title: 'Load failed', message: err?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [token]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name),
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ type: 'error', title: 'Validation', message: 'Category name is required' });
      return;
    }

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId
        ? `${base}/inventory/categories/${editingId}`
        : `${base}/inventory/categories`;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || `Failed (${res.status})`);
      }

      toast({
        type: 'success',
        title: editingId ? 'Category updated' : 'Category created',
      });

      setIsDialogOpen(false);
      setEditingId(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        parentId: '',
        order: 0,
        status: 'active',
      });
      loadCategories();
    } catch (err: any) {
      toast({ type: 'error', title: 'Save failed', message: err?.message });
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category._id);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      parentId: category.parentId || '',
      order: category.order,
      status: category.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/inventory/categories/${categoryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || `Failed (${res.status})`);
      }

      toast({ type: 'success', title: 'Category deleted' });
      loadCategories();
    } catch (err: any) {
      toast({ type: 'error', title: 'Delete failed', message: err?.message });
    }
  };

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedIds(newExpanded);
  };

  const renderCategoryTree = (cats: Category[], level = 0) => {
    return (
      <>
        {cats.map((category) => (
          <div key={category._id}>
            <div
              className="flex items-center justify-between rounded-md border p-3 hover:bg-slate-50 dark:hover:bg-slate-900"
              style={{ marginLeft: `${level * 20}px` }}
            >
              <div className="flex items-center gap-2 flex-1">
                {category.children && category.children.length > 0 && (
                  <button
                    onClick={() => toggleExpanded(category._id)}
                    className="p-0 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                  >
                    {expandedIds.has(category._id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                )}
                {(!category.children || category.children.length === 0) && (
                  <div className="w-4" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{category.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {category.productCount} product{category.productCount !== 1 ? 's' : ''} • {category.slug}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(category)}
                  title="Edit category"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(category._id)}
                  title="Delete category"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
            {expandedIds.has(category._id) && category.children && category.children.length > 0 && (
              <div>
                {renderCategoryTree(category.children, level + 1)}
              </div>
            )}
          </div>
        ))}
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Categories ({categories.length})</h3>
        <Button
          onClick={() => {
            setEditingId(null);
            setFormData({
              name: '',
              slug: '',
              description: '',
              parentId: '',
              order: 0,
              status: 'active',
            });
            setIsDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading categories...</p>
      ) : categories.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center">
          <p className="text-muted-foreground">No categories yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-2 rounded-md border p-4">
          {renderCategoryTree(categories)}
        </div>
      )}

      {/* Category Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Category Name *</label>
              <Input
                placeholder="e.g., Electronics"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Slug</label>
              <Input
                placeholder="e.g., electronics"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Auto-generated from name if left blank</p>
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Category description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Parent Category</label>
              <select
                value={formData.parentId}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-950"
              >
                <option value="">None (Top-level)</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Display Order</label>
                <Input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-950"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleSave} className="flex-1">
                {editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
