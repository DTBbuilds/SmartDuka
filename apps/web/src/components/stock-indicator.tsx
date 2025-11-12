'use client';

import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface StockIndicatorProps {
  stock: number;
  productName: string;
  showLabel?: boolean;
}

export function StockIndicator({ stock, productName, showLabel = true }: StockIndicatorProps) {
  if (stock > 10) {
    return (
      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
        <CheckCircle className="h-4 w-4" />
        {showLabel && <span className="text-xs font-medium">In Stock ({stock})</span>}
      </div>
    );
  }

  if (stock > 0) {
    return (
      <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
        <AlertTriangle className="h-4 w-4" />
        {showLabel && <span className="text-xs font-medium">Low Stock ({stock})</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
      <AlertCircle className="h-4 w-4" />
      {showLabel && <span className="text-xs font-medium">Out of Stock</span>}
    </div>
  );
}
