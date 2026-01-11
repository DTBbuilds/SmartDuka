'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@smartduka/ui';
import { Plus, FolderPlus, Scan, AlertCircle, CheckCircle2, Info, Camera } from 'lucide-react';
import { CategorySelectWithCreate } from './category-select-with-create';
import { BarcodeScannerZXing } from './barcode-scanner-zxing';

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const margin = formData.price > 0 && formData.cost > 0
    ? ((formData.price - formData.cost) / formData.price * 100).toFixed(1)
    : 0;

  // Handle barcode scanned from scanner modal
  const handleBarcodeScanned = (barcode: string) => {
    setFormData(prev => ({ ...prev, barcode }));
    setIsScannerOpen(false);
  };

  // User-friendly validation with field-specific errors
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Please enter a product name so customers can identify it';
    }
    
    if (formData.price <= 0) {
      errors.price = 'Please set a selling price greater than zero';
    }
    
    if (formData.stock < 0) {
      errors.stock = 'Stock quantity cannot be negative';
    }
    
    if (!formData.categoryId && categories.length > 0) {
      errors.categoryId = 'Please select a category to help organize your products';
    }
    
    setFieldErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      // Set general error with friendly message
      const errorCount = Object.keys(errors).length;
      setError(`Please fix ${errorCount} ${errorCount === 1 ? 'issue' : 'issues'} below to add your product`);
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Validate with user-friendly messages
    if (!validateForm()) {
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
      setFieldErrors({});
    } catch (err: any) {
      // Parse backend errors into user-friendly messages
      const message = err?.message || 'Failed to add product';
      if (message.includes('duplicate') || message.includes('already exists')) {
        setError('A product with this name or barcode already exists. Please use a different name or barcode.');
      } else if (message.includes('category')) {
        setFieldErrors({ categoryId: 'The selected category is no longer available. Please choose another.' });
        setError('There was an issue with the category. Please select a different one.');
      } else {
        setError(`Unable to add product: ${message}. Please try again.`);
      }
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
          {/* Error message - User friendly */}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">Check the highlighted fields below</p>
                </div>
              </div>
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
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                }}
                disabled={isSubmitting || isLoading}
                aria-label="Product name"
                className={fieldErrors.name ? 'border-red-500 focus:ring-red-500' : ''}
              />
              {fieldErrors.name && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {fieldErrors.name}
                </p>
              )}
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

            {/* Barcode with Scan Button */}
            <div className="space-y-2">
              <Label htmlFor="product-barcode" className="text-sm font-medium">
                Barcode (Scannable)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="product-barcode"
                  placeholder="Scan or type barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  disabled={isSubmitting || isLoading}
                  aria-label="Product Barcode"
                  className={`flex-1 ${formData.barcode ? 'border-green-500' : ''}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsScannerOpen(true)}
                  disabled={isSubmitting || isLoading}
                  title="Open barcode scanner"
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" />
                  <span className="hidden sm:inline">Scan</span>
                </Button>
              </div>
              {formData.barcode && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Barcode captured: {formData.barcode}
                </p>
              )}
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
                onChange={(e) => {
                  setFormData({ ...formData, price: parseFloat(e.target.value) || 0 });
                  if (fieldErrors.price) setFieldErrors(prev => ({ ...prev, price: '' }));
                }}
                disabled={isSubmitting || isLoading}
                step="0.01"
                min="0"
                aria-label="Selling price"
                className={fieldErrors.price ? 'border-red-500 focus:ring-red-500' : ''}
              />
              {fieldErrors.price && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {fieldErrors.price}
                </p>
              )}
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
                onChange={(e) => {
                  setFormData({ ...formData, stock: parseInt(e.target.value) || 0 });
                  if (fieldErrors.stock) setFieldErrors(prev => ({ ...prev, stock: '' }));
                }}
                disabled={isSubmitting || isLoading}
                min="0"
                aria-label="Stock quantity"
                className={fieldErrors.stock ? 'border-red-500 focus:ring-red-500' : ''}
              />
              {fieldErrors.stock && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {fieldErrors.stock}
                </p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="product-category" className={`text-sm font-medium ${fieldErrors.categoryId ? 'text-red-600' : ''}`}>
                Category {categories.length > 0 && '*'}
              </Label>
              <div className={fieldErrors.categoryId ? 'ring-1 ring-red-500 rounded-md' : ''}>
                <CategorySelectWithCreate
                  categories={categories}
                  value={formData.categoryId}
                  onChange={(categoryId) => {
                    setFormData({ ...formData, categoryId });
                    if (fieldErrors.categoryId) setFieldErrors(prev => ({ ...prev, categoryId: '' }));
                  }}
                  onCategoryCreated={onCategoryCreated}
                  token={token}
                  disabled={isSubmitting || isLoading}
                  placeholder={categories.length === 0 ? 'Create your first category' : 'Select or create category'}
                />
              </div>
              {fieldErrors.categoryId ? (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {fieldErrors.categoryId}
                </p>
              ) : categories.length === 0 ? (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <FolderPlus className="h-3 w-3" />
                  Tip: Create a category to organize your products
                </p>
              ) : null}
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

        {/* Barcode Scanner Modal */}
        <BarcodeScannerZXing
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScan={handleBarcodeScanned}
        />
      </CardContent>
    </Card>
  );
}
