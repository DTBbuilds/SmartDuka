'use client';

import { Button } from '@smartduka/ui';
import { ShoppingCart, AlertCircle } from 'lucide-react';

export interface POSProduct {
  _id: string;
  name: string;
  price: number;
  stock?: number;
  categoryId?: string;
  barcode?: string;
}

interface POSProductsListViewProps {
  products: POSProduct[];
  onAddToCart: (product: POSProduct) => void;
  isLoading?: boolean;
  error?: string;
  formatCurrency: (amount: number) => string;
  maxHeight?: string;
}

export function POSProductsListView({
  products,
  onAddToCart,
  isLoading = false,
  error,
  formatCurrency,
  maxHeight = 'max-h-[calc(100vh-400px)]',
}: POSProductsListViewProps) {
  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Loading products…
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-sm text-red-600 flex items-center justify-center gap-2">
        <AlertCircle className="h-4 w-4" />
        {error}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No products found
      </div>
    );
  }

  return (
    <div className={`${maxHeight} overflow-y-auto border rounded-lg bg-slate-50 dark:bg-slate-950/50 flex flex-col`}>
      <div className="space-y-0 flex-1">
        {products.map((product, index) => {
          const isOutOfStock = product.stock === 0 || product.stock === undefined;
          const isLowStock = product.stock && product.stock > 0 && product.stock <= 5;

          return (
            <div
              key={product._id}
              className={`border-b last:border-b-0 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors ${
                isOutOfStock ? 'opacity-60' : ''
              }`}
            >
              {/* Product Header - Compact */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-xs truncate">{product.name}</h4>
                </div>
              </div>

              {/* Product Details Grid - Compact */}
              <div className="grid grid-cols-4 gap-1.5 items-center">
                {/* Price */}
                <div className="bg-white dark:bg-slate-900 rounded px-1.5 py-1">
                  <p className="font-bold text-xs text-primary">{formatCurrency(product.price)}</p>
                </div>

                {/* Stock */}
                <div className={`rounded px-1.5 py-1 text-center ${
                  isOutOfStock
                    ? 'bg-red-50 dark:bg-red-950/30'
                    : isLowStock
                    ? 'bg-yellow-50 dark:bg-yellow-950/30'
                    : 'bg-green-50 dark:bg-green-950/30'
                }`}>
                  <p className={`font-semibold text-xs ${
                    isOutOfStock
                      ? 'text-red-600 dark:text-red-400'
                      : isLowStock
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {product.stock ?? 0}
                  </p>
                </div>

                {/* Barcode (if available) */}
                {product.barcode && (
                  <div className="text-xs text-muted-foreground truncate px-1">
                    {product.barcode}
                  </div>
                )}

                {/* Add to Cart Button - Compact */}
                <Button
                  onClick={() => onAddToCart(product)}
                  disabled={isOutOfStock}
                  size="sm"
                  className="h-7 px-2 flex items-center justify-center gap-1"
                  title={isOutOfStock ? 'Out of stock' : 'Add to cart'}
                >
                  <ShoppingCart className="h-3 w-3" />
                  <span className="text-xs font-medium hidden sm:inline">Add</span>
                </Button>
              </div>

              {/* Stock Status Alert - Compact */}
              {isOutOfStock && (
                <div className="flex items-center gap-1 mt-1 px-1 py-0.5 rounded bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300">
                  <AlertCircle className="h-2.5 w-2.5 flex-shrink-0" />
                  <span className="text-xs">Out of stock</span>
                </div>
              )}

              {isLowStock && !isOutOfStock && (
                <div className="flex items-center gap-1 mt-1 px-1 py-0.5 rounded bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300">
                  <AlertCircle className="h-2.5 w-2.5 flex-shrink-0" />
                  <span className="text-xs">Low: {product.stock}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
