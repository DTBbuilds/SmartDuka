'use client';

import { Button } from '@smartduka/ui';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface PaginationControlsProps {
  meta: PaginationMeta | null;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  showPageSize?: boolean;
  pageSizeOptions?: number[];
  className?: string;
}

export function PaginationControls({
  meta,
  onPageChange,
  onLimitChange,
  showPageSize = false,
  pageSizeOptions = [10, 20, 50, 100],
  className = '',
}: PaginationControlsProps) {
  if (!meta || meta.totalPages <= 1) {
    return null;
  }

  const { page, totalPages, total, limit, hasNextPage, hasPrevPage } = meta;

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const showPages = 5; // Number of page buttons to show
    
    if (totalPages <= showPages + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      // Calculate range around current page
      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);
      
      // Adjust if at edges
      if (page <= 3) {
        end = Math.min(showPages, totalPages - 1);
      } else if (page >= totalPages - 2) {
        start = Math.max(2, totalPages - showPages + 1);
      }
      
      // Add ellipsis if needed before range
      if (start > 2) {
        pages.push('ellipsis');
      }
      
      // Add range
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      // Add ellipsis if needed after range
      if (end < totalPages - 1) {
        pages.push('ellipsis');
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Results info */}
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium">{startItem}</span> to{' '}
        <span className="font-medium">{endItem}</span> of{' '}
        <span className="font-medium">{total}</span> results
      </p>

      <div className="flex items-center gap-2">
        {/* Page size selector */}
        {showPageSize && onLimitChange && (
          <div className="flex items-center gap-2 mr-4">
            <span className="text-sm text-muted-foreground">Per page:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          {/* First page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 hidden sm:flex"
            onClick={() => onPageChange(1)}
            disabled={!hasPrevPage}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Previous page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrevPage}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page numbers - hidden on mobile */}
          <div className="hidden sm:flex items-center gap-1">
            {getPageNumbers().map((pageNum, index) =>
              pageNum === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                  ...
                </span>
              ) : (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            )}
          </div>

          {/* Mobile page indicator */}
          <span className="sm:hidden text-sm px-2">
            {page} / {totalPages}
          </span>

          {/* Next page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNextPage}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 hidden sm:flex"
            onClick={() => onPageChange(totalPages)}
            disabled={!hasNextPage}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact pagination for mobile or tight spaces
 */
export function CompactPagination({
  meta,
  onPageChange,
  className = '',
}: Omit<PaginationControlsProps, 'showPageSize' | 'pageSizeOptions' | 'onLimitChange'>) {
  if (!meta || meta.totalPages <= 1) {
    return null;
  }

  const { page, totalPages, hasNextPage, hasPrevPage } = meta;

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={!hasPrevPage}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm min-w-[60px] text-center">
        {page} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNextPage}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
