/**
 * Smart Product Filtering System
 * Provides intelligent filtering and sorting for products
 */

export interface Product {
  _id: string;
  name: string;
  sku?: string;
  price: number;
  stock?: number;
  cost?: number;
  categoryId?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  branchInventory?: {
    [branchId: string]: {
      stock: number;
      lastRestockDate?: string;
    };
  };
}

export type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'sku-asc' | 'sku-desc' | 'stock-asc' | 'stock-desc' | 'fifo' | 'lifo' | 'newest' | 'oldest';

export type FilterOption = 'all' | 'active' | 'inactive' | 'low-stock' | 'out-of-stock' | 'in-stock';

/**
 * Filter products based on filter type
 */
export function filterProducts(products: Product[], filterType: FilterOption): Product[] {
  switch (filterType) {
    case 'active':
      return products.filter((p) => p.status === 'active');

    case 'inactive':
      return products.filter((p) => p.status === 'inactive');

    case 'low-stock':
      return products.filter((p) => p.stock !== undefined && p.stock > 0 && p.stock <= 10);

    case 'out-of-stock':
      return products.filter((p) => !p.stock || p.stock === 0);

    case 'in-stock':
      return products.filter((p) => p.stock !== undefined && p.stock > 0);

    case 'all':
    default:
      return products;
  }
}

/**
 * Sort products based on sort option
 */
export function sortProducts(products: Product[], sortOption: SortOption): Product[] {
  const sorted = [...products];

  switch (sortOption) {
    case 'name-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));

    case 'name-desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name));

    case 'price-asc':
      return sorted.sort((a, b) => a.price - b.price);

    case 'price-desc':
      return sorted.sort((a, b) => b.price - a.price);

    case 'sku-asc':
      return sorted.sort((a, b) => (a.sku || '').localeCompare(b.sku || ''));

    case 'sku-desc':
      return sorted.sort((a, b) => (b.sku || '').localeCompare(a.sku || ''));

    case 'stock-asc':
      return sorted.sort((a, b) => (a.stock || 0) - (b.stock || 0));

    case 'stock-desc':
      return sorted.sort((a, b) => (b.stock || 0) - (a.stock || 0));

    case 'fifo':
      // First In First Out - oldest products first (by creation date)
      return sorted.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateA - dateB;
      });

    case 'lifo':
      // Last In First Out - newest products first (by creation date)
      return sorted.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

    case 'newest':
      return sorted.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

    case 'oldest':
      return sorted.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateA - dateB;
      });

    default:
      return sorted;
  }
}

/**
 * Search products by name, SKU, or barcode
 */
export function searchProducts(products: Product[], query: string): Product[] {
  if (!query.trim()) return products;

  const lowerQuery = query.toLowerCase();
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      (p.sku && p.sku.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Apply multiple filters and sorting
 */
export function applyFiltersAndSort(
  products: Product[],
  searchQuery: string,
  filterType: FilterOption,
  sortOption: SortOption
): Product[] {
  let result = products;

  // Apply search first
  result = searchProducts(result, searchQuery);

  // Apply filter
  result = filterProducts(result, filterType);

  // Apply sort
  result = sortProducts(result, sortOption);

  return result;
}

/**
 * Get filter options with descriptions
 */
export const FILTER_OPTIONS = [
  { value: 'all' as FilterOption, label: 'All Products', icon: '📦' },
  { value: 'active' as FilterOption, label: 'Active', icon: '✅' },
  { value: 'inactive' as FilterOption, label: 'Inactive', icon: '❌' },
  { value: 'in-stock' as FilterOption, label: 'In Stock', icon: '📦' },
  { value: 'low-stock' as FilterOption, label: 'Low Stock', icon: '⚠️' },
  { value: 'out-of-stock' as FilterOption, label: 'Out of Stock', icon: '🚫' },
];

/**
 * Get sort options with descriptions
 */
export const SORT_OPTIONS = [
  { value: 'name-asc' as SortOption, label: 'Name (A-Z)', icon: '🔤' },
  { value: 'name-desc' as SortOption, label: 'Name (Z-A)', icon: '🔤' },
  { value: 'price-asc' as SortOption, label: 'Price (Low to High)', icon: '💰' },
  { value: 'price-desc' as SortOption, label: 'Price (High to Low)', icon: '💰' },
  { value: 'sku-asc' as SortOption, label: 'SKU (A-Z)', icon: '🏷️' },
  { value: 'sku-desc' as SortOption, label: 'SKU (Z-A)', icon: '🏷️' },
  { value: 'stock-asc' as SortOption, label: 'Stock (Low to High)', icon: '📊' },
  { value: 'stock-desc' as SortOption, label: 'Stock (High to Low)', icon: '📊' },
  { value: 'fifo' as SortOption, label: 'FIFO (Oldest First)', icon: '⏳' },
  { value: 'lifo' as SortOption, label: 'LIFO (Newest First)', icon: '⏳' },
  { value: 'newest' as SortOption, label: 'Newest Added', icon: '🆕' },
  { value: 'oldest' as SortOption, label: 'Oldest Added', icon: '📅' },
];

/**
 * Get product statistics
 */
export function getProductStats(products: Product[]) {
  return {
    total: products.length,
    active: products.filter((p) => p.status === 'active').length,
    inactive: products.filter((p) => p.status === 'inactive').length,
    inStock: products.filter((p) => p.stock && p.stock > 0).length,
    outOfStock: products.filter((p) => !p.stock || p.stock === 0).length,
    lowStock: products.filter((p) => p.stock && p.stock > 0 && p.stock <= 10).length,
    totalValue: products.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0),
  };
}

/**
 * Export products to CSV with smart formatting
 */
export function exportProductsToCSV(products: Product[], filename: string = 'products.csv'): void {
  const headers = ['Name', 'SKU', 'Price', 'Cost', 'Stock', 'Status', 'Category'];
  const rows = products.map((p) => [
    p.name,
    p.sku || '',
    p.price,
    p.cost || '',
    p.stock || 0,
    p.status,
    p.categoryId || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const str = String(cell);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    ),
  ].join('\n');

  const element = document.createElement('a');
  const file = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();

  setTimeout(() => {
    if (element.parentNode === document.body) {
      document.body.removeChild(element);
    }
    URL.revokeObjectURL(element.href);
  }, 100);
}
