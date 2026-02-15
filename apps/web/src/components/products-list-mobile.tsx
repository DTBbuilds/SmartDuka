'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, Input } from '@smartduka/ui';
import { 
  Search, Filter, ChevronLeft, ChevronRight, Package, 
  AlertTriangle, RefreshCw, Plus, Loader2, X, SlidersHorizontal
} from 'lucide-react';
import { CachedProduct, CachedCategory } from '@/lib/smart-cache-manager';

interface ProductsListMobileProps {
  products: CachedProduct[];
  categories: CachedCategory[];
  isLoading?: boolean;
  onProductClick?: (product: CachedProduct) => void;
  onAddProduct?: () => void;
  onRefresh?: () => void;
  pageSize?: number;
}

type SortOption = 'name' | 'price-asc' | 'price-desc' | 'stock-low' | 'recent';

export function ProductsListMobile({
  products,
  categories,
  isLoading = false,
  onProductClick,
  onAddProduct,
  onRefresh,
  pageSize = 20,
}: ProductsListMobileProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.includes(q)
      );
    }

    // Category filter
    if (selectedCategory) {
      result = result.filter(p => p.categoryId === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'stock-low':
        result.sort((a, b) => a.stock - b.stock);
        break;
    }

    return result;
  }, [products, searchQuery, selectedCategory, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy]);

  const lowStockCount = useMemo(() => 
    products.filter(p => p.stock <= (p.lowStockThreshold || 5)).length,
    [products]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('');
    setSortBy('name');
    setShowFilters(false);
  }, []);

  const hasActiveFilters = searchQuery || selectedCategory || sortBy !== 'name';

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 space-y-3">
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="h-11 w-11 relative"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
            )}
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="space-y-3 pt-2 border-t dark:border-gray-700">
            {/* Category Filter */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    !selectedCategory
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  All
                </button>
                {categories.slice(0, 5).map(cat => (
                  <button
                    key={cat._id}
                    onClick={() => setSelectedCategory(cat._id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      selectedCategory === cat._id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Sort by</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'name', label: 'Name' },
                  { id: 'price-asc', label: 'Price ↑' },
                  { id: 'price-desc', label: 'Price ↓' },
                  { id: 'stock-low', label: 'Low Stock' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSortBy(opt.id as SortOption)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      sortBy === opt.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500">
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Stats Bar */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {filteredProducts.length} products
            {hasActiveFilters && ` (filtered from ${products.length})`}
          </span>
          {lowStockCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              {lowStockCount} low stock
            </span>
          )}
        </div>
      </div>

      {/* Products List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
            <p className="text-gray-500">Loading products...</p>
          </div>
        ) : paginatedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
            <Package className="h-12 w-12 text-gray-300 mb-3" />
            <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-1">
              {hasActiveFilters ? 'No products match your filters' : 'No products yet'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {hasActiveFilters 
                ? 'Try adjusting your search or filters'
                : 'Add your first product to get started'}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            ) : onAddProduct && (
              <Button onClick={onAddProduct}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y dark:divide-gray-800">
            {paginatedProducts.map(product => (
              <button
                key={product._id}
                onClick={() => onProductClick?.(product)}
                className="w-full p-4 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
              >
                {/* Product Image/Icon */}
                <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Package className="h-6 w-6 text-gray-400" />
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {product.sku && <span>{product.sku}</span>}
                    {product.barcode && <span className="font-mono text-xs">{product.barcode}</span>}
                  </div>
                </div>

                {/* Price & Stock */}
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Ksh {product.price.toLocaleString()}
                  </p>
                  <p className={`text-sm ${
                    product.stock <= (product.lowStockThreshold || 5)
                      ? 'text-red-500 font-medium'
                      : 'text-gray-500'
                  }`}>
                    {product.stock} in stock
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-3">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Floating Add Button */}
      {onAddProduct && (
        <button
          onClick={onAddProduct}
          className="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-95 z-40"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* Refresh Button */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="fixed bottom-20 left-4 w-12 h-12 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full shadow-lg flex items-center justify-center border dark:border-gray-700 transition-transform active:scale-95 z-40"
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
}
