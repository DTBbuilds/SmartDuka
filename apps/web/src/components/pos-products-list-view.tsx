'use client';

import { useState, useCallback } from 'react';
import { Button } from '@smartduka/ui';
import { ShoppingCart, AlertCircle, Plus, Check, Package } from 'lucide-react';

export interface POSProduct {
  _id: string;
  name: string;
  price: number;
  stock?: number;
  categoryId?: string;
  barcode?: string;
  image?: string;
}

interface POSProductsListViewProps {
  products: POSProduct[];
  onAddToCart: (product: POSProduct) => void;
  isLoading?: boolean;
  error?: string;
  formatCurrency: (amount: number) => string;
  maxHeight?: string;
  /** Map of productId -> quantity in cart, for real-time stock display */
  cartQuantities?: Record<string, number>;
}

export function POSProductsListView({
  products,
  onAddToCart,
  isLoading = false,
  error,
  formatCurrency,
  maxHeight = 'max-h-[calc(100vh-400px)]',
  cartQuantities = {},
}: POSProductsListViewProps) {
  // Track recently added items for visual feedback
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());

  const handleAddToCart = useCallback((product: POSProduct) => {
    onAddToCart(product);
    
    // Visual feedback - show checkmark briefly
    setRecentlyAdded(prev => new Set(prev).add(product._id));
    setTimeout(() => {
      setRecentlyAdded(prev => {
        const next = new Set(prev);
        next.delete(product._id);
        return next;
      });
    }, 600);
  }, [onAddToCart]);

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700" />
          <span>Loading products…</span>
        </div>
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
    <div className={`${maxHeight} overflow-y-auto overscroll-contain rounded-lg bg-slate-50 dark:bg-slate-950/50`}>
      {/* Mobile: Grid view for better tap targets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2 p-2 lg:p-0 lg:gap-0">
        {products.map((product) => {
          // Calculate available stock (original stock - items in cart)
          const inCart = cartQuantities[product._id] || 0;
          const originalStock = product.stock ?? 0;
          const availableStock = Math.max(0, originalStock - inCart);
          
          const isOutOfStock = availableStock === 0;
          const isLowStock = availableStock > 0 && availableStock <= 5;
          const wasJustAdded = recentlyAdded.has(product._id);

          return (
            <div key={product._id}>
              {/* Mobile Card View (< lg) */}
              <button
                onClick={() => !isOutOfStock && handleAddToCart(product)}
                disabled={isOutOfStock}
                className={`lg:hidden w-full text-left rounded-xl border-2 p-3 transition-all duration-200 active:scale-[0.97] ${
                  isOutOfStock 
                    ? 'opacity-50 bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-not-allowed' 
                    : wasJustAdded
                    ? 'bg-green-50 dark:bg-green-950/30 border-green-400 dark:border-green-600 shadow-md'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:shadow-md active:bg-primary/5'
                }`}
              >
                {/* Product Image + Name */}
                <div className="flex items-start gap-2 mb-2">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-muted"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <h4 className="font-semibold text-sm leading-tight line-clamp-2">
                    {product.name}
                  </h4>
                </div>
                
                {/* Price & Stock Row */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-base text-primary">
                    {formatCurrency(product.price)}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    {/* Stock Badge - Shows available stock with cart indicator */}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full transition-all ${
                      isOutOfStock
                        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                        : isLowStock
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                    }`}>
                      {isOutOfStock ? 'Out' : availableStock}
                      {inCart > 0 && !isOutOfStock && (
                        <span className="ml-1 opacity-60">(-{inCart})</span>
                      )}
                    </span>
                    
                    {/* Add Icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isOutOfStock 
                        ? 'bg-slate-200 dark:bg-slate-700' 
                        : wasJustAdded
                        ? 'bg-green-500 text-white'
                        : 'bg-primary text-primary-foreground'
                    }`}>
                      {wasJustAdded ? (
                        <Check className="h-4 w-4 animate-in zoom-in duration-200" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>
              </button>

              {/* Desktop List View (>= lg) */}
              <div
                className={`hidden lg:flex border-b last:border-b-0 px-3 py-2 items-center gap-3 transition-colors ${
                  isOutOfStock ? 'opacity-50' : 'hover:bg-slate-100 dark:hover:bg-slate-900/50'
                } ${wasJustAdded ? 'bg-green-50 dark:bg-green-950/30' : ''}`}
              >
                {/* Product Image */}
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-9 h-9 rounded-md object-cover flex-shrink-0 bg-muted"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{product.name}</h4>
                  {product.barcode && (
                    <p className="text-xs text-muted-foreground truncate">{product.barcode}</p>
                  )}
                </div>

                {/* Price */}
                <div className="font-bold text-sm text-primary whitespace-nowrap">
                  {formatCurrency(product.price)}
                </div>

                {/* Stock Badge - Shows available stock */}
                <div className={`text-xs font-medium px-2 py-1 rounded-full min-w-[4rem] text-center transition-all ${
                  isOutOfStock
                    ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                    : isLowStock
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                }`}>
                  {isOutOfStock ? 'Out' : availableStock}
                  {inCart > 0 && (
                    <span className="ml-1 text-[10px] opacity-70">({inCart})</span>
                  )}
                </div>

                {/* Add Button */}
                <Button
                  onClick={() => handleAddToCart(product)}
                  disabled={isOutOfStock}
                  size="sm"
                  variant={wasJustAdded ? 'default' : 'default'}
                  className={`h-8 px-3 gap-1.5 transition-all ${
                    wasJustAdded ? 'bg-green-500 hover:bg-green-600' : ''
                  }`}
                >
                  {wasJustAdded ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span className="text-xs">Added</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span className="text-xs">Add</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
