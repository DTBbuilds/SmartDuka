'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@smartduka/ui';
import { Plus, FolderPlus } from 'lucide-react';
import { CategorySelectWithCreate } from './category-select-with-create';

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface QuickAddProductFormProps {
  categories: Category[];
  onSubmit: (product: {
    name: string;
    sku: string;
    barcode: string;
    price: number;
    cost: number;
    stock: number;
    categoryId: string;
  }) => Promise<void>;
  onCategoryCreated?: (category: Category) => void;
  token: string;
  isLoading?: boolean;
}

export function QuickAddProductForm({ categories, onSubmit, onCategoryCreated, token, isLoading = false }: QuickAddProductFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    price: 0,
    cost: 0,
    stock: 0,
    categoryId: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const margin = formData.price > 0 && formData.cost > 0
    ? ((formData.price - formData.cost) / formData.price * 100).toFixed(1)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Product name is required');
      return;
    }
    if (formData.price <= 0) {
      setError('Price must be greater than 0');
      return;
    }
    if (formData.stock < 0) {
      setError('Stock cannot be negative');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
      
      // Reset form
      setFormData({
        name: '',
        sku: '',
        barcode: '',
        price: 0,
        cost: 0,
        stock: 0,
        categoryId: '',
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to add product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Quick Add Product
        </CardTitle>
        <CardDescription>
          Add a new product in less than 30 seconds
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error message */}
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Grid layout - responsive */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="product-name" className="text-sm font-medium">
                Product Name *
              </Label>
              <Input
                id="product-name"
                placeholder="e.g., Coca Cola 500ml"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isSubmitting || isLoading}
                aria-label="Product name"
                required
              />
            </div>

            {/* SKU */}
            <div className="space-y-2">
              <Label htmlFor="product-sku" className="text-sm font-medium">
                SKU (Internal Code)
              </Label>
              <Input
                id="product-sku"
                placeholder="e.g., SKU-001"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                disabled={isSubmitting || isLoading}
                aria-label="Product SKU"
              />
            </div>

            {/* Barcode */}
            <div className="space-y-2">
              <Label htmlFor="product-barcode" className="text-sm font-medium">
                Barcode (Scannable)
              </Label>
              <Input
                id="product-barcode"
                placeholder="e.g., 5901234123457"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                disabled={isSubmitting || isLoading}
                aria-label="Product Barcode"
              />
            </div>

            {/* Selling Price */}
            <div className="space-y-2">
              <Label htmlFor="product-price" className="text-sm font-medium">
                Selling Price (Ksh) *
              </Label>
              <Input
                id="product-price"
                type="number"
                placeholder="0.00"
                value={formData.price || ''}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                disabled={isSubmitting || isLoading}
                step="0.01"
                min="0"
                aria-label="Selling price"
                required
              />
            </div>

            {/* Cost Price */}
            <div className="space-y-2">
              <Label htmlFor="product-cost" className="text-sm font-medium">
                Cost Price (Ksh)
              </Label>
              <Input
                id="product-cost"
                type="number"
                placeholder="0.00"
                value={formData.cost || ''}
                onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                disabled={isSubmitting || isLoading}
                step="0.01"
                min="0"
                aria-label="Cost price"
              />
            </div>

            {/* Stock Quantity */}
            <div className="space-y-2">
              <Label htmlFor="product-stock" className="text-sm font-medium">
                Stock Quantity *
              </Label>
              <Input
                id="product-stock"
                type="number"
                placeholder="0"
                value={formData.stock || ''}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                disabled={isSubmitting || isLoading}
                min="0"
                aria-label="Stock quantity"
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="product-category" className="text-sm font-medium">
                Category
              </Label>
              <CategorySelectWithCreate
                categories={categories}
                value={formData.categoryId}
                onChange={(categoryId) => setFormData({ ...formData, categoryId })}
                onCategoryCreated={onCategoryCreated}
                token={token}
                disabled={isSubmitting || isLoading}
                placeholder={categories.length === 0 ? 'Create your first category' : 'Select or create category'}
              />
              {categories.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <FolderPlus className="h-3 w-3" />
                  Tip: Create a category to organize your products
                </p>
              )}
            </div>
          </div>

          {/* Margin display */}
          {formData.price > 0 && formData.cost > 0 && (
            <div className="rounded-md bg-green-50 p-3 dark:bg-green-950">
              <p className="text-sm text-green-700 dark:text-green-200">
                <span className="font-semibold">Profit Margin:</span> {margin}%
                {' '}
                <span className="text-xs">
                  (Ksh {(formData.price - formData.cost).toFixed(2)})
                </span>
              </p>
            </div>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            disabled={isSubmitting || isLoading || !formData.name || formData.price <= 0}
            className="w-full h-11 font-semibold"
            aria-label="Add product"
          >
            {isSubmitting || isLoading ? 'Adding...' : 'Add Product'}
          </Button>

          {/* Helper text */}
          <p className="text-xs text-gray-600 dark:text-gray-400">
            * Required fields. Typical entry time: 20-30 seconds
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
