'use client';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smartduka/ui';
import { Heart, X } from 'lucide-react';
import { FavoriteProduct } from '@/hooks/use-favorite-products';

interface FavoriteProductsProps {
  products: FavoriteProduct[];
  onProductClick: (product: FavoriteProduct) => void;
  onRemove?: (productId: string) => void;
  onClear?: () => void;
}

export function FavoriteProducts({
  products,
  onProductClick,
  onRemove,
  onClear,
}: FavoriteProductsProps) {
  if (products.length === 0) {
    return null;
  }

  const formatCurrency = (value: number) =>
    `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-600 dark:text-red-400 fill-current" />
            <div>
              <CardTitle className="text-base">Favorites</CardTitle>
              <CardDescription className="text-xs">
                {products.length} product{products.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
          </div>
          {onClear && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClear}
              className="text-xs"
              aria-label="Clear all favorites"
            >
              Clear
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {products.map((product) => (
            <div
              key={product._id}
              className="relative group"
            >
              <button
                onClick={() => onProductClick(product)}
                className="w-full flex flex-col p-2 border rounded-lg bg-white hover:border-red-400 hover:shadow-md transition-all active:scale-95 touch-manipulation dark:bg-gray-900 dark:border-gray-700 dark:hover:border-red-500"
                aria-label={`Add ${product.name} to cart - ${formatCurrency(product.price)}`}
              >
                {/* Heart icon */}
                <div className="flex justify-center mb-1">
                  <Heart className="h-4 w-4 text-red-600 dark:text-red-400 fill-current" />
                </div>

                {/* Product name */}
                <p className="text-xs font-semibold line-clamp-2 text-left">
                  {product.name}
                </p>

                {/* Price */}
                <p className="text-sm font-bold text-red-600 dark:text-red-400 mt-1">
                  {formatCurrency(product.price)}
                </p>
              </button>

              {/* Remove button - visible on hover */}
              {onRemove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(product._id);
                  }}
                  className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Remove ${product.name} from favorites`}
                >
                  <div className="bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600">
                    <X className="h-3 w-3" />
                  </div>
                </button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
