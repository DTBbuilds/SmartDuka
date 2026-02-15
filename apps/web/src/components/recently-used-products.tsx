'use client';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smartduka/ui';
import { Clock, X } from 'lucide-react';
import { RecentlyUsedProduct } from '@/hooks/use-recently-used-products';

interface RecentlyUsedProductsProps {
  products: RecentlyUsedProduct[];
  onProductClick: (product: RecentlyUsedProduct) => void;
  onRemove?: (productId: string) => void;
  onClear?: () => void;
}

export function RecentlyUsedProducts({
  products,
  onProductClick,
  onRemove,
  onClear,
}: RecentlyUsedProductsProps) {
  if (products.length === 0) {
    return null;
  }

  const formatCurrency = (value: number) =>
    `Ksh ${value.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  return (
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <CardTitle className="text-base">Recently Used</CardTitle>
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
              aria-label="Clear recently used products"
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
                className="w-full flex flex-col p-2 border rounded-lg bg-white hover:border-blue-400 hover:shadow-md transition-all active:scale-95 touch-manipulation dark:bg-gray-900 dark:border-gray-700 dark:hover:border-blue-500"
                aria-label={`Add ${product.name} to cart - ${formatCurrency(product.price)}`}
              >
                {/* Product name */}
                <p className="text-xs font-semibold line-clamp-2 text-left">
                  {product.name}
                </p>

                {/* Price */}
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {formatCurrency(product.price)}
                </p>

                {/* Usage count */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Used {product.usageCount}x
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
                  aria-label={`Remove ${product.name} from recently used`}
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
